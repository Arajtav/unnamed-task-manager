use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};

use crate::{
    graphql::{
        db_err, get_db,
        models::{board_access::BoardAccess, board_task_status::BoardTaskStatus, task::Task},
        vec_map,
    },
    models,
};

// Private.
#[derive(SimpleObject)]
#[graphql(complex)]
pub struct Board {
    id: i32,
    name: String,
    created_at: DateTime<Utc>,
}

impl From<models::board::Model> for Board {
    fn from(board: models::board::Model) -> Self {
        Self {
            id: board.id,
            name: board.name,
            created_at: board.created_at,
        }
    }
}

#[ComplexObject]
impl Board {
    async fn tasks(&self, ctx: &Context<'_>) -> Result<Vec<Task>> {
        let db = get_db(ctx);

        let tasks = models::task::Entity::find()
            .filter(models::task::Column::BoardId.eq(self.id))
            .all(db)
            .await
            .map_err(db_err)?;

        Ok(vec_map(tasks))
    }

    async fn access(&self, ctx: &Context<'_>) -> Result<Vec<BoardAccess>> {
        let db = get_db(ctx);

        let access = models::board_access::Entity::find()
            .filter(models::board_access::Column::BoardId.eq(self.id))
            .all(db)
            .await
            .map_err(db_err)?;

        Ok(vec_map(access))
    }

    async fn task_status(&self, ctx: &Context<'_>) -> Result<Vec<BoardTaskStatus>> {
        let db = get_db(ctx);

        let task_status = models::board_task_status::Entity::find()
            .filter(models::board_task_status::Column::BoardId.eq(self.id))
            .order_by_asc(models::board_task_status::Column::Priority)
            .all(db)
            .await
            .map_err(db_err)?;

        Ok(vec_map(task_status))
    }
}
