use actix_session::Session;
use actix_web::{
    HttpResponse, Result, error,
    web::{Json, ThinData},
};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::Deserialize;
use tracing::error;

use crate::models;

#[derive(Deserialize)]
pub struct LoginRequest {
    email: String,
}

pub async fn login(
    session: Session,
    db: ThinData<DatabaseConnection>,
    body: Json<LoginRequest>,
) -> Result<HttpResponse> {
    let user = models::user::Entity::find()
        .inner_join(models::email::Entity)
        .filter(models::email::Column::Email.eq(&body.email))
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get user: {err}");
            error::ErrorInternalServerError("")
        })?
        .ok_or(error::ErrorUnauthorized("WRONG_ACCOUNT"))?;

    session.insert("user_id", user.id).unwrap();

    Ok(HttpResponse::NoContent().finish())
}

pub async fn logout(session: Session) -> HttpResponse {
    session.purge();

    HttpResponse::NoContent().finish()
}
