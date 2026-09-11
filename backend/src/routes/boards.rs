use actix_web::{
    HttpResponse, Result, error,
    http::StatusCode,
    web::{self, Json, ThinData},
};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait,
    IntoActiveModel, ModelTrait, QueryFilter, SqlErr,
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
    body: Json<CreateBoard>,
) -> Result<(Json<Board>, StatusCode)> {
    let body = body.into_inner();

    let board = models::board::ActiveModel {
        name: Set(body.name.clone()),
        ..Default::default()
    };

    let board = board.save(&*db).await.map_err(|err| {
        if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
            return error::ErrorConflict("NAME");
        }

        error!("Failed to create a board: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok((
        Json(Board {
            id: board.id.unwrap(),
            name: board.name.unwrap(),
            created_at: board.created_at.unwrap(),
        }),
        StatusCode::CREATED,
    ))
}

pub async fn get_board(
    db: ThinData<DatabaseConnection>,
    id: web::Path<i32>,
) -> Result<Option<Json<Board>>> {
    let board = models::board::Entity::find_by_id(*id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get board: {err}");
            error::ErrorInternalServerError("")
        })?;

    Ok(board.map(|board| {
        Json(Board {
            id: board.id,
            name: board.name,
            created_at: board.created_at,
        })
    }))
}

#[derive(Deserialize)]
pub struct BoardQuery {
    name: Option<String>,
}

pub async fn get_boards(
    db: ThinData<DatabaseConnection>,
    params: web::Query<BoardQuery>,
) -> Result<Json<Vec<Board>>> {
    let params = params.into_inner();

    let mut query = models::board::Entity::find();

    if let Some(search) = params.name {
        query = query.filter(models::board::Column::Name.contains(search));
    }

    let boards = query.all(&*db).await.map_err(|err| {
        error!("Failed to get boards: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok(Json(
        boards
            .into_iter()
            .map(|board| Board {
                id: board.id,
                name: board.name,
                created_at: board.created_at,
            })
            .collect(),
    ))
}

#[derive(Deserialize)]
pub struct UpdateBoard {
    name: Option<String>,
}

pub async fn update_board(
    db: ThinData<DatabaseConnection>,
    id: web::Path<i32>,
    body: Json<UpdateBoard>,
) -> Result<Option<Json<Board>>> {
    let body = body.into_inner();

    let board = models::board::Entity::find_by_id(*id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get board: {err}");
            error::ErrorInternalServerError("")
        })?;

    let Some(board) = board else { return Ok(None) };

    let mut board = board.into_active_model();

    if let Some(name) = body.name {
        board.name = Set(name);
    }

    let board = board.update(&*db).await.map_err(|err| {
        if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
            return error::ErrorConflict("NAME");
        }

        error!("Failed to update board: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok(Some(Json(Board {
        id: board.id,
        name: board.name,
        created_at: board.created_at,
    })))
}

pub async fn delete_board(
    db: ThinData<DatabaseConnection>,
    id: web::Path<i32>,
) -> Result<Option<HttpResponse>> {
    let board = models::board::Entity::find_by_id(*id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get board: {err}");
            error::ErrorInternalServerError("")
        })?;

    let Some(board) = board else {
        return Ok(None);
    };

    board.delete(&*db).await.map_err(|err| {
        error!("Failed to delete board: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok(Some(HttpResponse::NoContent().finish()))
}
