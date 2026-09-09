use actix_web::{
    HttpResponse, Responder,
    web::{self, ThinData},
};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter, SqlErr,
};
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::models;

#[derive(Deserialize)]
pub struct CreateTask {
    board_id: i32,
    title: String,
    description: Option<String>,
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
    db: ThinData<DatabaseConnection>,
    body: web::Json<CreateTask>,
) -> impl Responder {
    let body = body.into_inner();

    let task = models::task::ActiveModel {
        title: Set(body.title),
        description: body.description.map_or(NotSet, Set),
        author: Set(String::from("UNKNOWN")),
        board_id: Set(body.board_id),
        ..Default::default()
    };

    let task = match task.save(&*db).await {
        Ok(task) => task,
        Err(err) => {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return HttpResponse::Conflict().body("TASK_TITLE_TAKEN");
            }

            if let Some(SqlErr::ForeignKeyConstraintViolation(_)) = err.sql_err() {
                return HttpResponse::NotFound().finish();
            }

            error!("Failed to create a board: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    HttpResponse::Created().json(Task {
        id: task.id.unwrap(),
        title: task.title.unwrap(),
        description: task.description.unwrap(),
        created_at: task.created_at.unwrap(),
        author: task.author.unwrap(),
    })
}

pub async fn get_task(db: ThinData<DatabaseConnection>, id: web::Path<i32>) -> impl Responder {
    let task = models::task::Entity::find_by_id(*id).one(&*db).await;

    match task {
        Ok(Some(task)) => HttpResponse::Ok().json(Task {
            id: task.id,
            title: task.title,
            description: task.description,
            created_at: task.created_at,
            author: task.author,
        }),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get a task: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct TaskQuery {
    title: Option<String>,
    board: Option<i32>,
}

pub async fn get_tasks(
    db: ThinData<DatabaseConnection>,
    params: web::Query<TaskQuery>,
) -> impl Responder {
    let params = params.into_inner();

    let mut query = models::task::Entity::find();

    if let Some(search) = params.title {
        query = query.filter(models::task::Column::Title.contains(search));
    }

    if let Some(board) = params.board {
        query = query.filter(models::task::Column::BoardId.eq(board));
    }

    let tasks = query.all(&*db).await;

    match tasks {
        Ok(tasks) => HttpResponse::Ok().json(
            tasks
                .into_iter()
                .map(|task| Task {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    created_at: task.created_at,
                    author: task.author,
                })
                .collect::<Vec<_>>(),
        ),
        Err(err) => {
            error!("Failed to get tasks: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct UpdateTask {
    title: Option<String>,
    description: Option<String>,
}

pub async fn update_task(
    db: ThinData<DatabaseConnection>,
    id: web::Path<i32>,
    body: web::Json<UpdateTask>,
) -> impl Responder {
    let body = body.into_inner();

    let task = models::task::Entity::find_by_id(*id).one(&*db).await;

    let mut task = match task {
        Ok(Some(task)) => task.into_active_model(),
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get task: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    if let Some(title) = body.title {
        task.title = Set(title);
    }

    if let Some(description) = body.description {
        task.description = Set(description);
    }

    let task = match task.update(&*db).await {
        Ok(task) => task,
        Err(err) => {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return HttpResponse::Conflict().body("TASK_TITLE_TAKEN");
            }

            error!("Failed to update title: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    HttpResponse::Ok().json(Task {
        id: task.id,
        title: task.title,
        description: task.description,
        created_at: task.created_at,
        author: task.author,
    })
}

pub async fn delete_task(db: ThinData<DatabaseConnection>, id: web::Path<i32>) -> impl Responder {
    let task = models::task::Entity::find_by_id(*id).one(&*db).await;

    let task = match task {
        Ok(Some(task)) => task.into_active_model(),
        Ok(None) => return HttpResponse::NotFound().finish(),
        Err(err) => {
            error!("Failed to get task: {err}");
            return HttpResponse::InternalServerError().finish();
        }
    };

    match task.delete(&*db).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(err) => {
            error!("Failed to get task: {err}");
            HttpResponse::InternalServerError().finish()
        }
    }
}
