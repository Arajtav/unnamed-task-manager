use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use sea_orm::EntityTrait;
use uuid::Uuid;

use crate::{
    graphql::{db_err, get_db, models::user::User},
    models,
};

// Access restricted to viewers who can access the source board.
#[derive(SimpleObject)]
#[graphql(complex)]
pub struct BoardAccess {
    user_id: Uuid,
    is_moderator: bool,
}

impl From<models::board_access::Model> for BoardAccess {
    fn from(access: models::board_access::Model) -> Self {
        Self {
            user_id: access.user_id,
            is_moderator: access.is_moderator,
        }
    }
}

#[ComplexObject]
impl BoardAccess {
    async fn user(&self, ctx: &Context<'_>) -> Result<User> {
        let db = get_db(ctx);

        let user = models::user::Entity::find_by_id(self.user_id)
            .require_one(db)
            .await
            .map_err(db_err)?;

        Ok(User::from(user))
    }
}
