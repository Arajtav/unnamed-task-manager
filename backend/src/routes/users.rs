use actix_web::{
    HttpResponse, Result, error,
    http::StatusCode,
    web::{self, Json, ThinData},
};
use chrono::{DateTime, Utc};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, ModelTrait};
use serde::Serialize;
use tracing::error;
use uuid::Uuid;

use crate::models;

#[derive(Serialize)]
pub struct User {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
}

pub async fn create_user(db: ThinData<DatabaseConnection>) -> Result<(Json<User>, StatusCode)> {
    let user = models::user::ActiveModel {
        ..Default::default()
    };

    match user.save(&*db).await {
        Ok(user) => Ok((
            Json(User {
                id: user.id.unwrap(),
                created_at: user.created_at.unwrap(),
            }),
            StatusCode::CREATED,
        )),
        Err(err) => {
            error!("Failed to create user: {err}");
            Err(error::ErrorInternalServerError(""))
        }
    }
}

pub async fn get_users(db: ThinData<DatabaseConnection>) -> Result<Json<Vec<User>>> {
    let users = models::user::Entity::find()
        .all(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get user: {err}");
            error::ErrorInternalServerError("")
        })?;

    Ok(Json(
        users
            .into_iter()
            .map(|user| User {
                id: user.id,
                created_at: user.created_at,
            })
            .collect(),
    ))
}

pub async fn get_user(
    db: ThinData<DatabaseConnection>,
    id: web::Path<Uuid>,
) -> Result<Option<Json<User>>> {
    let user = models::user::Entity::find_by_id(*id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get user: {err}");
            error::ErrorInternalServerError("")
        })?;

    Ok(user.map(|user| {
        Json(User {
            id: user.id,
            created_at: user.created_at,
        })
    }))
}

pub async fn delete_user(
    db: ThinData<DatabaseConnection>,
    id: web::Path<Uuid>,
) -> Result<Option<HttpResponse>> {
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

    user.delete(&*db).await.map_err(|err| {
        error!("Failed to delete user: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok(Some(HttpResponse::NoContent().finish()))
}
