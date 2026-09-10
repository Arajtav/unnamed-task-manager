use actix_web::{
    HttpResponse, Responder,
    web::{self, ThinData},
};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, DbErr, EntityTrait,
    IntoActiveModel, ModelTrait, QueryFilter, SqlErr,
};
use serde::{Deserialize, Serialize};
use tracing::error;
use uuid::Uuid;

use crate::models;

#[derive(Serialize, Deserialize)]
pub struct Email {
    email: String,
}

pub async fn create_email(
    db: ThinData<DatabaseConnection>,
    id: web::Path<Uuid>,
    body: web::Json<Email>,
) -> impl Responder {
    let body = body.into_inner();
    let email = models::email::ActiveModel {
        email: Set(body.email.clone()),
        user_id: Set(*id),
    };

    let email = match email.insert(&*db).await {
        Ok(email) => email,
        Err(err) => {
            // TODO: it's probably fine but i'd rather have do nothing and 200 when the email object already exists for the specified user.
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return HttpResponse::Conflict().body("EMAIL_IN_USE");
            }

            if let DbErr::Custom(msg) = &err
                && msg == "invalid RFC 5322 email address"
            {
                return HttpResponse::BadRequest().body("INVALID_EMAIL");
            }

            if let Some(SqlErr::ForeignKeyConstraintViolation(_)) = err.sql_err() {
                return HttpResponse::NotFound().finish();
            }

            error!("Failed to create email: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    HttpResponse::Created().json(Email { email: email.email })
}

pub async fn get_emails(db: ThinData<DatabaseConnection>, id: web::Path<Uuid>) -> impl Responder {
    let user = models::user::Entity::find_by_id(*id).one(&*db).await;

    let user = match user {
        Ok(Some(user)) => user,
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get user: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    let emails = user.find_related(models::email::Entity).all(&*db).await;

    match emails {
        Ok(emails) => HttpResponse::Ok().json(
            emails
                .into_iter()
                .map(|email| Email { email: email.email })
                .collect::<Vec<_>>(),
        ),
        Err(err) => {
            error!("Failed to get email: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn delete_email(
    db: ThinData<DatabaseConnection>,
    path: web::Path<(Uuid, String)>,
) -> impl Responder {
    let (id, email_address) = path.into_inner();

    let user = match models::user::Entity::find_by_id(id).one(&*db).await {
        Ok(Some(user)) => user,
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get user: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    let email = user
        .find_related(models::email::Entity)
        .filter(models::email::Column::Email.eq(email_address))
        .one(&*db)
        .await;

    let email = match email {
        Ok(Some(email)) => email.into_active_model(),
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get email: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    match email.delete(&*db).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(err) => {
            error!("Failed to get email: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}
