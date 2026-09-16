use std::collections::HashMap;

use actix_session::Session;
use actix_web::{
    HttpResponse, Result, error,
    web::{Data, Json, ThinData},
};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, DatabaseConnection, EntityTrait, TransactionTrait,
    sea_query::value::prelude::serde_json,
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
use uuid::Uuid;

use crate::{Origin, models};

pub async fn login_start(
    session: Session,
    rp: Data<Rp>,
    origin: Data<Origin>,
    auth: Data<Mutex<HashMap<Uuid, AuthenticationState>>>,
) -> Result<Json<AuthenticationRequest>> {
    let random = Uuid::new_v4();

    let (ar, state) = start_authentication(rp.id.clone(), origin.0.clone(), Requirement::Required);

    session
        .insert("webauthn_auth_state", random)
        .map_err(|_| error::ErrorInternalServerError(""))?;

    auth.lock().await.insert(random, state);

    Ok(Json(ar))
}

pub async fn login_finish(
    session: Session,
    response: Json<AuthenticationResponse>,
    db: ThinData<DatabaseConnection>,
    auth: Data<Mutex<HashMap<Uuid, AuthenticationState>>>,
) -> Result<HttpResponse> {
    let serialized_state = session
        .remove("webauthn_auth_state")
        .ok_or_else(|| error::ErrorUnauthorized(""))?;

    let random: Uuid =
        serde_json::from_str(&serialized_state).map_err(|_| error::ErrorUnauthorized(""))?;

    let cred_id = response.credential_id();

    let passkey = models::passkey::Entity::find_by_id(cred_id)
        .one(&*db)
        .await
        .map_err(|_| error::ErrorInternalServerError(""))?
        .ok_or(error::ErrorUnauthorized(""))?;

    let cred = serde_json::from_value::<Credential>(passkey.passkey)
        .map(SimpleCredential::from)
        .map_err(|_| error::ErrorInternalServerError(""))?;

    let state = auth
        .lock()
        .await
        .remove(&random)
        .ok_or(error::ErrorUnauthorized(""))?;

    verify_authentication(response.into_inner(), state, &[cred])
        .map_err(|err| error::ErrorUnauthorized(format!("verify_authentication failed: {err}")))?;

    // TODO: update counter?

    session
        .insert("user_id", passkey.user_id)
        .map_err(|_| error::ErrorInternalServerError(""))?;

    Ok(HttpResponse::NoContent().finish())
}

pub async fn logout(session: Session) -> HttpResponse {
    session.purge();

    HttpResponse::NoContent().finish()
}

#[derive(Deserialize)]
pub struct RegisterStartRequest {
    invite: String,
    name: String,
}

pub async fn register_start(
    session: Session,
    body: Json<RegisterStartRequest>,
    rp: Data<Rp>,
    origin: Data<Origin>,
    db: ThinData<DatabaseConnection>,
    reg: Data<Mutex<HashMap<Uuid, RegistrationState>>>,
) -> Result<Json<RegistrationRequest>> {
    let body = body.into_inner();
    let random = Uuid::new_v4();

    let invite = models::invite::Entity::find_by_id(&body.invite)
        .one(&*db)
        .await
        .map_err(|_| error::ErrorInternalServerError(""))?;

    let Some(invite) = invite else {
        return Err(error::ErrorNotFound(""));
    };

    let (rr, state) = simple_webauthn::start_registration(
        (*rp.into_inner()).clone(),
        origin.0.clone(),
        User {
            id: invite.user_id.into(),
            name: body.name.clone(),
            display_name: body.name,
        },
    );

    session
        .insert("webauthn_reg_state", &(random, body.invite, invite.user_id))
        .map_err(|_| error::ErrorInternalServerError(""))?;

    reg.lock().await.insert(random, state);

    Ok(Json(rr))
}

pub async fn register_finish(
    session: Session,
    response: Json<RegistrationResponse>,
    db: ThinData<DatabaseConnection>,
    reg: Data<Mutex<HashMap<Uuid, RegistrationState>>>,
) -> Result<HttpResponse> {
    let serialized_state = session
        .remove("webauthn_reg_state")
        .ok_or_else(|| error::ErrorUnauthorized("webauthn_reg_state missing from session"))?;

    let (random, invite, user_id): (Uuid, String, Uuid) =
        serde_json::from_str(&serialized_state).map_err(|_| error::ErrorUnauthorized(""))?;

    let state = reg
        .lock()
        .await
        .remove(&random)
        .ok_or(error::ErrorUnauthorized(""))?;

    let credential = verify_registration(response.into_inner(), state)
        .map_err(|err| error::ErrorUnauthorized(format!("verify_registration failed: {err}")))?;

    let passkey = models::passkey::ActiveModel {
        id: Set(credential.id().to_vec()),
        user_id: Set(user_id),
        passkey: Set(
            serde_json::to_value(credential).map_err(|_| error::ErrorInternalServerError(""))?
        ),
    };

    let tx = db
        .begin()
        .await
        .map_err(|_| error::ErrorInternalServerError(""))?;

    passkey
        .insert(&tx)
        .await
        .map_err(|_| error::ErrorInternalServerError(""))?;

    let result = models::invite::Entity::delete_by_id(invite)
        .exec(&tx)
        .await
        .map_err(|_| error::ErrorInternalServerError(""))?;

    if result.rows_affected == 0 {
        // The invite does not exist.
        return Err(error::ErrorForbidden(""));
    }

    tx.commit()
        .await
        .map_err(|_| error::ErrorInternalServerError(""))?;

    Ok(HttpResponse::NoContent().finish())
}
