use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use tracing::instrument;
use uuid::Uuid;

use crate::{
    graphql::{db_err, forbidden, get_db, get_user, vec_map},
    models,
};

// All users are public so anything can return `User` without special care.
#[derive(SimpleObject)]
#[graphql(complex)]
pub struct User {
    id: Uuid,
    created_at: DateTime<Utc>,
    is_admin: bool,
    handle: Option<String>,
    is_disabled: bool,

    #[graphql(skip)]
    invite: Option<String>,
}

impl From<models::user::Model> for User {
    fn from(user: models::user::Model) -> Self {
        Self {
            id: user.id,
            created_at: user.created_at,
            is_admin: user.is_admin,
            handle: user.handle,
            is_disabled: user.is_disabled,
            invite: user.invite_code,
        }
    }
}

impl User {
    fn ensure_self_or_admin(&self, ctx: &Context<'_>) -> Result<()> {
        let viewer = get_user(ctx);

        if viewer.is_admin || viewer.id == self.id {
            Ok(())
        } else {
            Err(forbidden())
        }
    }
}

#[ComplexObject]
impl User {
    #[instrument(name = "User.emails", level = "debug", skip_all, fields(target_user_id = %self.id))]
    async fn emails(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
        let db = get_db(ctx);

        let emails = models::email::Entity::find()
            .filter(models::email::Column::UserId.eq(self.id))
            .all(db)
            .await
            .map_err(db_err)?;

        Ok(vec_map(emails))
    }

    // Only for admins and self.
    #[instrument(name = "User.invite", level = "debug", skip_all, fields(target_user_id = %self.id))]
    async fn invite(&self, ctx: &Context<'_>) -> Result<Option<String>> {
        self.ensure_self_or_admin(ctx)?;
        Ok(self.invite.clone())
    }
}
