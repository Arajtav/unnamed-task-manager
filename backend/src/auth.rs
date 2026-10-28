use std::{
    collections::HashMap,
    time::{Duration, Instant},
};

use actix_session::Session;
use actix_web::{
    HttpResponse, Result,
    web::{Data, Json, ThinData},
};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::Set,
    ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, RelationTrait,
    TransactionTrait,
    sea_query::{Expr, value::prelude::serde_json},
};
use serde::Deserialize;
use simple_webauthn::{
    Credential, Requirement, User,
    authentication::{
        AuthenticationRequest, AuthenticationResponse, AuthenticationState, SimpleCredential,
    },
    registration::{RegistrationRequest, RegistrationResponse, RegistrationState, Rp},
    start_authentication, verify_authentication, verify_registration,
};
use tokio::sync::Mutex;
use tracing::{Span, field, instrument};
use uuid::Uuid;

use crate::{
    AuthErrorType, ISSUED_AT_KEY, Origin, ServerErrorType, auth_error, auth_error_with,
    internal_server_error, models,
};

// All of this is arbitrary, it is just so the server doesn't crash if someone tries to DOS it.
// There is gonna be a proxy anyway to support https so it might handle throttling as well.
pub const STATE_TTL: Duration = Duration::from_secs(90);
pub const SWEEP_INTERVAL: Duration = Duration::from_secs(180);
const MAX_STATES: usize = 16384;

pub type AuthStates = Mutex<HashMap<Uuid, (Instant, AuthenticationState)>>;
pub type RegStates = Mutex<HashMap<Uuid, (Instant, RegistrationState)>>;

pub fn sweep<S>(map: &mut HashMap<Uuid, (Instant, S)>) {
    map.retain(|_, (created, _)| created.elapsed() < STATE_TTL);
}

fn insert_state<S>(map: &mut HashMap<Uuid, (Instant, S)>, key: Uuid, state: S) -> Result<()> {
    if map.len() >= MAX_STATES {
        sweep(map);
        if map.len() >= MAX_STATES {
            tracing::warn!("webauthn state map full, rejecting, someone is DOSing you");
            return Err(actix_web::error::ErrorServiceUnavailable("TOO_BUSY"));
        }
    }
    map.insert(key, (Instant::now(), state));
    Ok(())
}

#[instrument(skip_all)]
pub async fn login_start(
    session: Session,
    rp: Data<Rp>,
    origin: Data<Origin>,
    auth: Data<AuthStates>,
) -> Result<Json<AuthenticationRequest>> {
    let random = Uuid::new_v4();

    let (ar, state) = start_authentication(rp.id.clone(), origin.0.clone(), Requirement::Required);

    insert_state(&mut *auth.lock().await, random, state)?;

    session
        .insert("webauthn_auth_state", random)
        .map_err(|err| internal_server_error(err, ServerErrorType::Unreachable))?;

    Ok(Json(ar))
}

#[instrument(skip_all, fields(user_id = field::Empty))]
pub async fn login_finish(
    session: Session,
    response: Json<AuthenticationResponse>,
    db: ThinData<DatabaseConnection>,
    auth: Data<AuthStates>,
) -> Result<HttpResponse> {
    let serialized_state = session
        .remove("webauthn_auth_state")
        .ok_or_else(|| auth_error(AuthErrorType::NoState))?;

    let random: Uuid = serde_json::from_str(&serialized_state)
        .map_err(|err| internal_server_error(err, ServerErrorType::Corrupted))?;

    let cred_id = response.credential_id();

    let passkey = models::passkey::Entity::find_by_id(cred_id)
        .join(
            sea_orm::JoinType::InnerJoin,
            models::passkey::Relation::User.def(),
        )
        .filter(models::user::Column::IsDisabled.eq(false))
        .one(&*db)
        .await
        .map_err(|err| internal_server_error(err, ServerErrorType::Database))?
        .ok_or_else(|| auth_error(AuthErrorType::NoUser))?;

    Span::current().record("user_id", field::display(passkey.user_id));

    let cred = serde_json::from_value::<Credential>(passkey.passkey)
        .map(SimpleCredential::from)
        .map_err(|err| internal_server_error(err, ServerErrorType::Corrupted))?;

    let (created, state) = auth
        .lock()
        .await
        .remove(&random)
        .ok_or_else(|| auth_error(AuthErrorType::NoState))?;

    if created.elapsed() > STATE_TTL {
        return Err(auth_error(AuthErrorType::NoState));
    }

    verify_authentication(response.into_inner(), state, &[cred])
        .map_err(|err| auth_error_with(err, AuthErrorType::VerificationFailed))?;

    // TODO: update counter?

    session
        .insert(ISSUED_AT_KEY, crate::now_ts())
        .map_err(|err| internal_server_error(err, ServerErrorType::Unreachable))?;
    session
        .insert("user_id", passkey.user_id)
        .map_err(|err| internal_server_error(err, ServerErrorType::Unreachable))?;

    Ok(HttpResponse::NoContent().finish())
}

#[instrument(skip_all)]
pub async fn logout(session: Session) -> HttpResponse {
    session.purge();

    HttpResponse::NoContent().finish()
}

#[derive(Deserialize)]
pub struct RegisterStartRequest {
    invite: String,
    name: String,
}

#[instrument(skip_all, fields(user_id = field::Empty))]
pub async fn register_start(
    session: Session,
    body: Json<RegisterStartRequest>,
    rp: Data<Rp>,
    origin: Data<Origin>,
    db: ThinData<DatabaseConnection>,
    reg: Data<RegStates>,
) -> Result<Json<RegistrationRequest>> {
    let body = body.into_inner();
    let random = Uuid::new_v4();

    let user = models::user::Entity::find()
        .filter(models::user::Column::InviteCode.eq(&body.invite))
        .filter(models::user::Column::IsDisabled.eq(false))
        .one(&*db)
        .await
        .map_err(|err| internal_server_error(err, ServerErrorType::Database))?
        .ok_or_else(|| auth_error(AuthErrorType::NoInvite))?;

    Span::current().record("user_id", field::display(user.id));

    let (rr, state) = simple_webauthn::start_registration(
        (*rp.into_inner()).clone(),
        origin.0.clone(),
        User {
            id: user.id.into(),
            name: body.name.clone(),
            display_name: body.name,
        },
    );

    insert_state(&mut *reg.lock().await, random, state)?;

    session
        .insert("webauthn_reg_state", &(random, body.invite, user.id))
        .map_err(|err| internal_server_error(err, ServerErrorType::Unreachable))?;

    Ok(Json(rr))
}

#[instrument(skip_all, fields(user_id = field::Empty))]
pub async fn register_finish(
    session: Session,
    response: Json<RegistrationResponse>,
    db: ThinData<DatabaseConnection>,
    reg: Data<RegStates>,
) -> Result<HttpResponse> {
    let serialized_state = session
        .remove("webauthn_reg_state")
        .ok_or_else(|| auth_error(AuthErrorType::NoState))?;

    let (random, invite, user_id): (Uuid, String, Uuid) =
        serde_json::from_str(&serialized_state)
            .map_err(|err| internal_server_error(err, ServerErrorType::Corrupted))?;

    let (created, state) = reg
        .lock()
        .await
        .remove(&random)
        .ok_or_else(|| auth_error(AuthErrorType::NoState))?;

    if created.elapsed() > STATE_TTL {
        return Err(auth_error(AuthErrorType::NoState));
    }

    Span::current().record("user_id", field::display(user_id));

    let credential = verify_registration(response.into_inner(), state)
        .map_err(|err| auth_error_with(err, AuthErrorType::VerificationFailed))?;

    let passkey = models::passkey::ActiveModel {
        id: Set(credential.id().to_vec()),
        user_id: Set(user_id),
        passkey: Set(serde_json::to_value(credential)
            .map_err(|err| internal_server_error(err, ServerErrorType::Unreachable))?),
    };

    let tx = db
        .begin()
        .await
        .map_err(|err| internal_server_error(err, ServerErrorType::Database))?;

    passkey
        .insert(&tx)
        .await
        .map_err(|err| internal_server_error(err, ServerErrorType::Database))?;

    let result = models::user::Entity::update_many()
        .col_expr(models::user::Column::InviteCode, Expr::null())
        .filter(models::user::Column::InviteCode.eq(invite))
        .exec(&tx)
        .await
        .map_err(|err| internal_server_error(err, ServerErrorType::Database))?;

    if result.rows_affected == 0 {
        // The invite does not exist.
        return Err(auth_error(AuthErrorType::NoInvite));
    }

    tx.commit()
        .await
        .map_err(|err| internal_server_error(err, ServerErrorType::Database))?;

    session
        .insert(ISSUED_AT_KEY, crate::now_ts())
        .map_err(|err| internal_server_error(err, ServerErrorType::Unreachable))?;
    session
        .insert("user_id", user_id)
        .map_err(|err| internal_server_error(err, ServerErrorType::Unreachable))?;

    Ok(HttpResponse::NoContent().finish())
}
