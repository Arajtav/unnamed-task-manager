use async_graphql::{Context, Error, Object, Result};
use chrono::{DateTime, Utc};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use uuid::Uuid;

use crate::{
    graphql::{get_db, get_user, vec_map},
    models,
};

pub struct User {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub is_admin: bool,
    pub handle: Option<String>,
}

impl From<models::user::Model> for User {
    fn from(user: models::user::Model) -> Self {
        Self {
            id: user.id,
            created_at: user.created_at,
            is_admin: user.is_admin,
            handle: user.handle,
        }
    }
}

#[Object]
impl User {
    async fn id(&self) -> Uuid {
        self.id
    }

    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    async fn is_admin(&self) -> bool {
        self.is_admin
    }

    async fn handle(&self) -> &Option<String> {
        &self.handle
    }

    async fn emails(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
        let db = get_db(ctx);

        let emails = models::email::Entity::find()
            .filter(models::email::Column::UserId.eq(self.id))
            .all(db)
            .await?;

        Ok(vec_map(emails))
    }

    async fn invite(&self, ctx: &Context<'_>) -> Result<Option<Invite>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(user.is_admin || user.id == self.id) {
            return Err(Error::new("FORBIDDEN"));
        }

        let invite = models::invite::Entity::find()
            .filter(models::invite::Column::UserId.eq(self.id))
            .one(db)
            .await?;

        Ok(invite.map(Invite::from))
    }
}

#[derive(async_graphql::SimpleObject)]
pub struct Invite {
    pub code: String,
}

impl From<models::invite::Model> for Invite {
    fn from(invite: models::invite::Model) -> Self {
        Self { code: invite.code }
    }
}

impl From<models::email::Model> for String {
    fn from(email: models::email::Model) -> Self {
        email.email
    }
}

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

#[Object]
impl Board {
    async fn id(&self) -> i32 {
        self.id
    }

    async fn name(&self) -> &str {
        &self.name
    }

    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    async fn tasks(&self, ctx: &Context<'_>) -> Result<Vec<Task>> {
        let db = get_db(ctx);

        let tasks = models::task::Entity::find()
            .filter(models::task::Column::BoardId.eq(self.id))
            .all(db)
            .await?;

        Ok(vec_map(tasks))
    }

    async fn access(&self, ctx: &Context<'_>) -> Result<Vec<Access>> {
        let db = get_db(ctx);

        let access = models::board_access::Entity::find()
            .filter(models::board_access::Column::BoardId.eq(self.id))
            .all(db)
            .await?;

        Ok(vec_map(access))
    }
}

#[derive(async_graphql::SimpleObject)]
pub struct Access {
    user_id: Uuid,
    is_moderator: bool,
}

impl From<models::board_access::Model> for Access {
    fn from(access: models::board_access::Model) -> Self {
        Self {
            user_id: access.user_id,
            is_moderator: access.is_moderator,
        }
    }
}

#[derive(async_graphql::SimpleObject)]
pub struct Task {
    id: i32,
    title: String,
    description: String,
    created_at: DateTime<Utc>,
    author: String,
    status: Option<String>,
    assignee: Option<String>,
}

impl From<models::task::Model> for Task {
    fn from(task: models::task::Model) -> Self {
        Self {
            id: task.id,
            title: task.title,
            description: task.description,
            created_at: task.created_at,
            author: task.author,
            status: task.status,
            assignee: task.assignee,
        }
    }
}
