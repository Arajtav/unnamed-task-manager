use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use sea_orm::EntityTrait;
use tracing::instrument;
use uuid::Uuid;

use crate::{
    graphql::{db_err, get_db, models::user::User},
    models,
};

// Private.
#[derive(SimpleObject)]
#[graphql(complex)]
pub struct TaskUserTime {
    #[graphql(skip)]
    pub user_id: Option<Uuid>,

    // In seconds, chrono::Duration is not supported.
    pub time: i64,
}

#[ComplexObject]
impl TaskUserTime {
    #[instrument(name = "TaskUserTime.user", level = "debug", skip_all, fields(target_user_id = ?self.user_id))]
    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<User>> {
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
