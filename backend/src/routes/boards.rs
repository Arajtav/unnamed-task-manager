use actix_web::{
    HttpResponse, Responder,
    web::{self, ThinData},
};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait,
    IntoActiveModel, QueryFilter, SqlErr,
};
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::models;

#[derive(Deserialize)]
pub struct CreateBoard {
    name: String,
}

#[derive(Serialize)]
pub struct Board {
    id: i32,
    name: String,
    created_at: DateTime<Utc>,
}

pub async fn create_board(
    db: ThinData<DatabaseConnection>,
    body: web::Json<CreateBoard>,
) -> impl Responder {
    let body = body.into_inner();

    let board = models::board::ActiveModel {
        name: Set(body.name.clone()),
        ..Default::default()
    };

    let board = match board.save(&*db).await {
        Ok(board) => board,

        Err(err) => {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return HttpResponse::Conflict().body("BOARD_NAME_TAKEN");
            }

            error!("Failed to create a board: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    HttpResponse::Created().json(Board {
        id: board.id.unwrap(),
        name: board.name.unwrap(),
        created_at: board.created_at.unwrap(),
    })
}

pub async fn get_board(db: ThinData<DatabaseConnection>, id: web::Path<i32>) -> impl Responder {
    let board = models::board::Entity::find_by_id(*id).one(&*db).await;

    match board {
        Ok(Some(board)) => HttpResponse::Ok().json(Board {
            id: board.id,
            name: board.name,
            created_at: board.created_at,
        }),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get board: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct BoardQuery {
    name: Option<String>,
}

pub async fn get_boards(
    db: ThinData<DatabaseConnection>,
    params: web::Query<BoardQuery>,
) -> impl Responder {
    let params = params.into_inner();

    let mut query = models::board::Entity::find();

    if let Some(search) = params.name {
        query = query.filter(models::board::Column::Name.contains(search));
    }

    let boards = query.all(&*db).await;

    match boards {
        Ok(boards) => HttpResponse::Ok().json(
            boards
                .into_iter()
                .map(|board| Board {
                    id: board.id,
                    name: board.name,
                    created_at: board.created_at,
                })
                .collect::<Vec<_>>(),
        ),
        Err(err) => {
            error!("Failed to get boards: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct UpdateBoard {
    name: Option<String>,
}

pub async fn update_board(
    db: ThinData<DatabaseConnection>,
    id: web::Path<i32>,
    body: web::Json<UpdateBoard>,
) -> impl Responder {
    let body = body.into_inner();

    let board = models::board::Entity::find_by_id(*id).one(&*db).await;

    let mut board = match board {
        Ok(Some(board)) => board.into_active_model(),
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get board: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    if let Some(name) = body.name {
        board.name = Set(name);
    }

    let board = match board.update(&*db).await {
        Ok(board) => board,
        Err(err) => {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return HttpResponse::Conflict().body("BOARD_NAME_TAKEN");
            }

            error!("Failed to update board: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    HttpResponse::Ok().json(Board {
        id: board.id,
        name: board.name,
        created_at: board.created_at,
    })
}

pub async fn delete_board(db: ThinData<DatabaseConnection>, id: web::Path<i32>) -> impl Responder {
    let board = models::board::Entity::find_by_id(*id).one(&*db).await;

    let board = match board {
        Ok(Some(board)) => board.into_active_model(),
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get board: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    match board.delete(&*db).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(err) => {
            error!("Failed to delete board: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}
