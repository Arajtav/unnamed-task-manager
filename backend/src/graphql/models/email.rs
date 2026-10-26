use async_graphql::{self, ComplexObject, Context, Result, SimpleObject};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use crate::{
    graphql::{db_err, get_db, models::user::User},
    models,
};

// All emails are public.
#[derive(SimpleObject)]
#[graphql(complex)]
pub struct Email {
    pub email: String,
}

#[ComplexObject]
impl Email {
    async fn user(&self, ctx: &Context<'_>) -> Result<Option<User>> {
        let db = get_db(ctx);

        let user = models::user::Entity::find()
            .inner_join(models::email::Entity)
            .filter(models::email::Column::Email.eq(&self.email))
            .one(db)
            .await
            .map_err(db_err)?;

        Ok(user.map(User::from))
    }
}

impl From<models::email::Model> for String {
    fn from(value: models::email::Model) -> Self {
        value.email
    }
}

impl From<models::task_assignee::Model> for Email {
    fn from(value: models::task_assignee::Model) -> Self {
        Self { email: value.email }
    }
}
