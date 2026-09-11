use actix_web::{
    HttpResponse, Result, error,
    http::StatusCode,
    web::{self, Json, ThinData},
};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, DbErr, EntityTrait,
    ModelTrait, QueryFilter, SqlErr,
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
    body: Json<Email>,
) -> Result<Option<(Json<Email>, StatusCode)>> {
    let body = body.into_inner();

    let email = models::email::ActiveModel {
        email: Set(body.email.clone()),
        user_id: Set(*id),
    };

    match email.insert(&*db).await {
        Ok(email) => Ok(Some((
            Json(Email { email: email.email }),
            StatusCode::CREATED,
        ))),
        Err(err) => {
            // TODO: it's probably fine but i'd rather have do nothing and 200 when the email object already exists for the specified user.
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return Err(error::ErrorConflict(""));
            }

            if let DbErr::Custom(msg) = &err
                && msg == "invalid RFC 5322 email address"
            {
                return Err(error::ErrorBadRequest("EMAIL"));
            }

            if let Some(SqlErr::ForeignKeyConstraintViolation(_)) = err.sql_err() {
                return Ok(None);
            }

            error!("Failed to create email: {err}");
            Err(error::ErrorInternalServerError(""))
        }
    }
}

pub async fn get_emails(
    db: ThinData<DatabaseConnection>,
    id: web::Path<Uuid>,
) -> Result<Option<Json<Vec<Email>>>> {
    let user = models::user::Entity::find_by_id(*id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get user: {err}");
            error::ErrorInternalServerError("")
        })?;

    let Some(user) = user else {
        return Ok(None);
    };

    let emails = user
        .find_related(models::email::Entity)
        .all(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get email: {err}");
            error::ErrorInternalServerError("")
        })?;

    Ok(Some(Json(
        emails
            .into_iter()
            .map(|email| Email { email: email.email })
            .collect(),
    )))
}

pub async fn delete_email(
    db: ThinData<DatabaseConnection>,
    path: web::Path<(Uuid, String)>,
) -> Result<Option<HttpResponse>> {
    let (id, email_address) = path.into_inner();

    let user = models::user::Entity::find_by_id(id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get user: {err}");
            error::ErrorInternalServerError("")
        })?;

    let Some(user) = user else {
        return Ok(None);
    };

    let email = user
        .find_related(models::email::Entity)
        .filter(models::email::Column::Email.eq(email_address))
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get email: {err}");
            error::ErrorInternalServerError("")
        })?;

    let Some(email) = email else {
        return Ok(None);
    };

    email.delete(&*db).await.map_err(|err| {
        error!("Failed to delete email: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok(Some(HttpResponse::NoContent().finish()))
}
