use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::EntityTrait;
use tracing::instrument;
use uuid::Uuid;

use crate::{
    graphql::{
        db_err, get_db,
        models::{task::Task, user::User},
    },
    models,
};

// Private.
#[derive(SimpleObject)]
#[graphql(complex)]
pub struct TimeTrackingEntry {
    id: i32,
    started_at: DateTime<Utc>,
    finished_at: DateTime<Utc>,
    description: String,

    #[graphql(skip)]
    task_id: Option<i32>,

    #[graphql(skip)]
    user_id: Option<Uuid>,
}

#[ComplexObject]
impl TimeTrackingEntry {
    #[instrument(name = "TimeTrackingEntry.task", level = "debug", skip_all, fields(entry_id = self.id, task_id = ?self.task_id))]
    async fn task(&self, ctx: &Context<'_>) -> Result<Option<Task>> {
        let db = get_db(ctx);

        let Some(task_id) = self.task_id else {
            return Ok(None);
        };

        let task = models::task::Entity::find_by_id(task_id)
            .require_one(db)
            .await
            .map_err(db_err)?;

        Ok(Some(Task::from(task)))
    }

    #[instrument(name = "TimeTrackingEntry.user", level = "debug", skip_all, fields(entry_id = self.id, target_user_id = ?self.user_id))]
    async fn user(&self, ctx: &Context<'_>) -> Result<Option<User>> {
        let db = get_db(ctx);

        let Some(user_id) = self.user_id else {
            return Ok(None);
        };

        let user = models::user::Entity::find_by_id(user_id)
            .require_one(db)
            .await
            .map_err(db_err)?;

        Ok(Some(User::from(user)))
    }
}

impl From<models::time_tracking::Model> for TimeTrackingEntry {
    fn from(tt: models::time_tracking::Model) -> Self {
        Self {
            id: tt.id,
            started_at: tt.started_at,
            finished_at: tt.finished_at,
            description: tt.description,
            task_id: tt.task_id,
            user_id: tt.user_id,
        }
    }
}
