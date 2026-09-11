use actix_session::Session;
use actix_web::{
    HttpResponse, Result, error,
    web::{self, Json, ThinData},
};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::Deserialize;
use tracing::error;

use crate::{SessionUser, models, routes::users::User};

#[derive(Deserialize)]
pub struct LoginRequest {
    email: String,
}

pub async fn login(
    session: Session,
    db: ThinData<DatabaseConnection>,
    body: Json<LoginRequest>,
) -> Result<Json<User>> {
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

    Ok(Json(User {
        id: user.id,
        created_at: user.created_at,
    }))
}

pub async fn logout(session: Session) -> HttpResponse {
    session.purge();

    HttpResponse::NoContent().finish()
}

pub async fn me(user: web::ReqData<SessionUser>) -> Json<User> {
    Json(User {
        id: user.id,
        created_at: user.created_at,
    })
}
