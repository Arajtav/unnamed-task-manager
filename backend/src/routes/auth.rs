use actix_session::Session;
use actix_web::{
    HttpResponse, Result, error,
    web::{Data, Json, ThinData},
};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
    TransactionTrait, sea_query::value::prelude::serde_json,
};
use serde::Deserialize;
use uuid::Uuid;
use webauthn_rs::{
    Webauthn,
    prelude::{
        CreationChallengeResponse, DiscoverableAuthentication, PasskeyRegistration,
        PublicKeyCredential, RegisterPublicKeyCredential, RequestChallengeResponse,
    },
};

use crate::models;

// TODO: disable danger-allow-state-serialisation because there is a vulnerability otherwise.

pub async fn login_start(
    session: Session,
    webauthn: Data<Webauthn>,
) -> Result<Json<RequestChallengeResponse>> {
    let (rcr, auth_state) = webauthn
        .start_discoverable_authentication()
        .map_err(|_| error::ErrorInternalServerError(""))?;

    session
        .insert("webauthn_auth_state", &auth_state)
        .map_err(|_| error::ErrorInternalServerError(""))?;

    Ok(Json(rcr))
}

pub async fn login_finish(
    session: Session,
    credential: Json<PublicKeyCredential>,
    webauthn: Data<Webauthn>,
    db: ThinData<DatabaseConnection>,
) -> Result<HttpResponse> {
    let serialized_state = session
        .remove("webauthn_auth_state")
        .ok_or_else(|| error::ErrorUnauthorized(""))?;

    let auth_state: DiscoverableAuthentication =
        serde_json::from_str(&serialized_state).map_err(|_| error::ErrorUnauthorized(""))?;

    let Ok((id, _)) = webauthn.identify_discoverable_authentication(&credential) else {
        return Err(error::ErrorBadRequest(""));
    };

    let raw_passkeys = models::passkey::Entity::find()
        .filter(models::passkey::Column::UserId.eq(id))
        .all(&*db)
        .await
        .map_err(|_| error::ErrorInternalServerError(""))?;

    let passkeys = raw_passkeys
        .iter()
        .cloned()
        .map(|passkey| serde_json::from_value(passkey.passkey))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| error::ErrorInternalServerError(""))?;

    webauthn
        .finish_discoverable_authentication(&credential, auth_state, &passkeys)
        .map_err(|_| error::ErrorUnauthorized(""))?;

    // TODO: update counter?

    session
        .insert("user_id", id)
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
    webauthn: Data<Webauthn>,
    db: ThinData<DatabaseConnection>,
) -> Result<Json<CreationChallengeResponse>> {
    let body = body.into_inner();

    let Ok(invite) = models::invite::Entity::find_by_id(body.invite)
        .one(&*db)
        .await
    else {
        return Err(error::ErrorInternalServerError(""));
    };

    let Some(invite) = invite else {
        return Err(error::ErrorNotFound(""));
    };

    let (ccr, reg_state) = webauthn
        .start_passkey_registration(invite.user_id, &body.name, &body.name, None)
        .map_err(|_| actix_web::error::ErrorBadRequest(""))?;

    session
        .insert(
            "webauthn_reg_state",
            &(invite.code, invite.user_id, reg_state),
        )
        .map_err(|_| error::ErrorInternalServerError(""))?;

    Ok(Json(ccr))
}

pub async fn register_finish(
    session: Session,
    credential: Json<RegisterPublicKeyCredential>,
    webauthn: Data<Webauthn>,
    db: ThinData<DatabaseConnection>,
) -> Result<HttpResponse> {
    let serialized_state = session
        .remove("webauthn_reg_state")
        .ok_or_else(|| error::ErrorUnauthorized(""))?;

    let (invite, user_id, reg_state): (String, Uuid, PasskeyRegistration) =
        serde_json::from_str(&serialized_state).map_err(|_| error::ErrorUnauthorized(""))?;

    let passkey = webauthn
        .finish_passkey_registration(&credential, &reg_state)
        .map_err(|_| error::ErrorUnauthorized(""))?;

    let passkey = models::passkey::ActiveModel {
        user_id: Set(user_id),
        passkey: Set(
            serde_json::to_value(passkey).map_err(|_| error::ErrorInternalServerError(""))?
        ),
        ..Default::default()
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
