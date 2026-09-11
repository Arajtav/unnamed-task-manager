use actix_web::{
    HttpResponse, Result, error,
    http::StatusCode,
    web::{self, Json, ThinData},
};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, ModelTrait, QueryFilter, SqlErr,
};
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::{SessionUser, models};

#[derive(Deserialize)]
pub struct CreateTask {
    board_id: i32,
    title: String,
    description: Option<String>,
    author: String,
}

#[derive(Serialize)]
pub struct Task {
    id: i32,
    title: String,
    description: String,
    created_at: DateTime<Utc>,
    author: String,
}

pub async fn create_task(
    user: web::ReqData<SessionUser>,
    db: ThinData<DatabaseConnection>,
    body: Json<CreateTask>,
) -> Result<(Json<Task>, StatusCode)> {
    let body = body.into_inner();

    let owns_email = models::email::Entity::find_by_id(&body.author)
        .filter(models::email::Column::UserId.eq(user.id))
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get email in create_task: {err}");
            error::ErrorInternalServerError("")
        })?
        .is_some();

    if !owns_email {
        return Err(error::ErrorForbidden("AUTHOR"));
    }

    let task = models::task::ActiveModel {
        title: Set(body.title),
        description: body.description.map_or(NotSet, Set),
        author: Set(body.author),
        board_id: Set(body.board_id),
        ..Default::default()
    };

    let task = task.save(&*db).await.map_err(|err| {
        if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
            return error::ErrorConflict("TITLE");
        }

        if let Some(SqlErr::ForeignKeyConstraintViolation(_)) = err.sql_err() {
            return error::ErrorNotFound("");
        }

        error!("Failed to create a board: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok((
        Json(Task {
            id: task.id.unwrap(),
            title: task.title.unwrap(),
            description: task.description.unwrap(),
            created_at: task.created_at.unwrap(),
            author: task.author.unwrap(),
        }),
        StatusCode::CREATED,
    ))
}

pub async fn get_task(
    db: ThinData<DatabaseConnection>,
    id: web::Path<i32>,
) -> Result<Option<Json<Task>>> {
    let task = models::task::Entity::find_by_id(*id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get task: {err}");
            error::ErrorInternalServerError("")
        })?;

    Ok(task.map(|task| {
        Json(Task {
            id: task.id,
            title: task.title,
            description: task.description,
            created_at: task.created_at,
            author: task.author,
        })
    }))
}

#[derive(Deserialize)]
pub struct TaskQuery {
    title: Option<String>,
    board: Option<i32>,
}

pub async fn get_tasks(
    db: ThinData<DatabaseConnection>,
    params: web::Query<TaskQuery>,
) -> Result<Json<Vec<Task>>> {
    let params = params.into_inner();

    let mut query = models::task::Entity::find();

    if let Some(search) = params.title {
        query = query.filter(models::task::Column::Title.contains(search));
    }

    if let Some(board) = params.board {
        query = query.filter(models::task::Column::BoardId.eq(board));
    }

    let tasks = query.all(&*db).await.map_err(|err| {
        error!("Failed to get tasks: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok(Json(
        tasks
            .into_iter()
            .map(|task| Task {
                id: task.id,
                title: task.title,
                description: task.description,
                created_at: task.created_at,
                author: task.author,
            })
            .collect(),
    ))
}

#[derive(Deserialize)]
pub struct UpdateTask {
    title: Option<String>,
    description: Option<String>,
}

pub async fn update_task(
    db: ThinData<DatabaseConnection>,
    id: web::Path<i32>,
    body: Json<UpdateTask>,
) -> Result<Option<Json<Task>>> {
    let body = body.into_inner();

    let task = models::task::Entity::find_by_id(*id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get task: {err}");
            error::ErrorInternalServerError("")
        })?;

    let Some(task) = task else {
        return Ok(None);
    };

    let mut task = task.into_active_model();

    if let Some(title) = body.title {
        task.title = Set(title);
    }

    if let Some(description) = body.description {
        task.description = Set(description);
    }

    let task = task.update(&*db).await.map_err(|err| {
        if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
            return error::ErrorConflict("TITLE");
        }

        error!("Failed to update title: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok(Some(Json(Task {
        id: task.id,
        title: task.title,
        description: task.description,
        created_at: task.created_at,
        author: task.author,
    })))
}

pub async fn delete_task(
    db: ThinData<DatabaseConnection>,
    id: web::Path<i32>,
) -> Result<Option<HttpResponse>> {
    let task = models::task::Entity::find_by_id(*id)
        .one(&*db)
        .await
        .map_err(|err| {
            error!("Failed to get task: {err}");
            error::ErrorInternalServerError("")
        })?;

    let Some(task) = task else {
        return Ok(None);
    };

    task.delete(&*db).await.map_err(|err| {
        error!("Failed to delete task: {err}");
        error::ErrorInternalServerError("")
    })?;

    Ok(Some(HttpResponse::NoContent().finish()))
}
