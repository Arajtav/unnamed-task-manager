use actix_web::{
    HttpResponse, Responder,
    web::{self, ThinData},
};
use chrono::{DateTime, Utc};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel};
use serde::Serialize;
use tracing::error;
use uuid::Uuid;

use crate::models;

#[derive(Serialize)]
pub struct User {
    id: Uuid,
    created_at: DateTime<Utc>,
}

pub async fn create_user(db: ThinData<DatabaseConnection>) -> impl Responder {
    let user = models::user::ActiveModel {
        ..Default::default()
    };

    let user = match user.save(&*db).await {
        Ok(user) => user,
        Err(err) => {
            error!("Failed to create user: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    HttpResponse::Created().json(User {
        id: user.id.unwrap(),
        created_at: user.created_at.unwrap(),
    })
}

pub async fn get_users(db: ThinData<DatabaseConnection>) -> impl Responder {
    let users = models::user::Entity::find().all(&*db).await;

    match users {
        Ok(users) => HttpResponse::Ok().json(
            users
                .into_iter()
                .map(|user| User {
                    id: user.id,
                    created_at: user.created_at,
                })
                .collect::<Vec<_>>(),
        ),
        Err(err) => {
            error!("Failed to get user: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn get_user(db: ThinData<DatabaseConnection>, id: web::Path<Uuid>) -> impl Responder {
    let user = models::user::Entity::find_by_id(*id).one(&*db).await;

    match user {
        Ok(Some(user)) => HttpResponse::Ok().json(User {
            id: user.id,
            created_at: user.created_at,
        }),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get user: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn delete_user(db: ThinData<DatabaseConnection>, id: web::Path<Uuid>) -> impl Responder {
    let user = models::user::Entity::find_by_id(*id).one(&*db).await;

    let user = match user {
        Ok(Some(user)) => user.into_active_model(),
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get user: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    match user.delete(&*db).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(err) => {
            error!("Failed to get user: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}
