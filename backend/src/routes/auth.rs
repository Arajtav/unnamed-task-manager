use actix_session::Session;
use actix_web::{
    HttpResponse, Responder,
    web::{self, ThinData},
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
    body: web::Json<LoginRequest>,
) -> impl Responder {
    let user = models::user::Entity::find()
        .inner_join(models::email::Entity)
        .filter(models::email::Column::Email.eq(&body.email))
        .one(&*db)
        .await;

    let user = match user {
        Ok(Some(user)) => user,
        Ok(None) => return HttpResponse::Unauthorized().body("WRONG_ACCOUNT"),
        Err(err) => {
            error!("Failed to get user: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    session.insert("user_id", user.id).unwrap();

    HttpResponse::Ok().json(User {
        id: user.id,
        created_at: user.created_at,
    })
}

pub async fn logout(session: Session) -> actix_web::Result<HttpResponse> {
    session.purge();

    Ok(HttpResponse::NoContent().finish())
}

pub async fn me(user: web::ReqData<SessionUser>) -> impl Responder {
    HttpResponse::Ok().json(User {
        id: user.id,
        created_at: user.created_at,
    })
}
