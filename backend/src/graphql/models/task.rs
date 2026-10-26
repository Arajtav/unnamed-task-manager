use std::collections::HashMap;

use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QuerySelect, RelationTrait};
use uuid::Uuid;

use crate::{
    graphql::{
        db_err, get_db,
        models::{board::Board, email::Email, task_user_time::TaskUserTime},
        vec_map,
    },
    models,
};

// Private, must only be given to viewers with source board access.
#[derive(SimpleObject)]
#[graphql(complex)]
pub struct Task {
    id: i32,
    title: String,
    description: String,
    created_at: DateTime<Utc>,
    author: Email,
    status: String,
    archived_at: Option<DateTime<Utc>>,
    priority: i32,

    #[graphql(skip)]
    board_id: i32,
}

impl From<models::task::Model> for Task {
    fn from(task: models::task::Model) -> Self {
        Self {
            board_id: task.board_id,
            id: task.id,
            title: task.title,
            description: task.description,
            created_at: task.created_at,
            author: Email { email: task.author },
            status: task.status,
            archived_at: task.archived_at,
            priority: task.priority,
        }
    }
}

#[ComplexObject]
impl Task {
    async fn board(&self, ctx: &Context<'_>) -> Result<Board> {
        let db = get_db(ctx);

        let board = models::board::Entity::find_by_id(self.board_id)
            .require_one(db)
            .await
            .map_err(db_err)?;

        Ok(Board::from(board))
    }

    async fn time_logged(&self, ctx: &Context<'_>) -> Result<Vec<TaskUserTime>> {
        let db = get_db(ctx);

        let entries = models::time_tracking::Entity::find()
            .filter(models::time_tracking::Column::TaskId.eq(self.id))
            .all(db)
            .await
            .map_err(db_err)?;

        let mut user_times: HashMap<Option<Uuid>, i64> = HashMap::new();

        for entry in entries {
            *user_times.entry(entry.user_id).or_insert(0) += entry
                .finished_at
                .signed_duration_since(entry.started_at)
                .num_seconds();
        }

        let time_logged = user_times
            .into_iter()
            .map(|(user_id, time)| TaskUserTime { user_id, time })
            .collect();

        Ok(time_logged)
    }

    async fn blocking(&self, ctx: &Context<'_>) -> Result<Vec<Task>> {
        let db = get_db(ctx);

        let tasks = models::task::Entity::find()
            .join_rev(
                sea_orm::JoinType::InnerJoin,
                models::task_block::Relation::BlockedTask.def(),
            )
            .filter(models::task_block::Column::Blocking.eq(self.id))
            .all(db)
            .await
            .map_err(db_err)?;

        Ok(vec_map(tasks))
    }

    async fn blocked_by(&self, ctx: &Context<'_>) -> Result<Vec<Task>> {
        let db = get_db(ctx);

        let tasks = models::task::Entity::find()
            .join_rev(
                sea_orm::JoinType::InnerJoin,
                models::task_block::Relation::BlockingTask.def(),
            )
            .filter(models::task_block::Column::Blocked.eq(self.id))
            .all(db)
            .await
            .map_err(db_err)?;

        Ok(vec_map(tasks))
    }

    async fn is_blocked(&self, ctx: &Context<'_>) -> Result<bool> {
        let db = get_db(ctx);

        let count = models::task_block::Entity::find()
            .join(
                sea_orm::JoinType::InnerJoin,
                models::task_block::Relation::BlockingTask.def(),
            )
            .filter(models::task_block::Column::Blocked.eq(self.id))
            .filter(models::task::Column::ArchivedAt.is_null())
            .count(db)
            .await
            .map_err(db_err)?;

        Ok(count > 0)
    }

    async fn labels(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
        let db = get_db(ctx);

        let labels = models::task_label::Entity::find()
            .filter(models::task_label::Column::TaskId.eq(self.id))
            .all(db)
            .await
            .map_err(db_err)?;

        Ok(vec_map(labels))
    }

    async fn assignees(&self, ctx: &Context<'_>) -> Result<Vec<Email>> {
        let db = get_db(ctx);

        let assignees = models::task_assignee::Entity::find()
            .filter(models::task_assignee::Column::TaskId.eq(self.id))
            .all(db)
            .await
            .map_err(db_err)?;

        Ok(vec_map(assignees))
    }
}

impl From<models::task_label::Model> for String {
    fn from(label: models::task_label::Model) -> Self {
        label.name
    }
}
