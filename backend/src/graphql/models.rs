use async_graphql::{ComplexObject, Context, Error, Result, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use uuid::Uuid;

use crate::{
    graphql::{get_db, get_user, vec_map},
    models,
};

#[derive(SimpleObject)]
#[graphql(complex)]
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

#[ComplexObject]
impl User {
    async fn emails(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
        let db = get_db(ctx);

        let emails = models::email::Entity::find()
            .filter(models::email::Column::UserId.eq(self.id))
            .all(db)
            .await?;

        Ok(vec_map(emails))
    }

    async fn invite(&self, ctx: &Context<'_>) -> Result<Option<String>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(user.is_admin || user.id == self.id) {
            return Err(Error::new("FORBIDDEN"));
        }

        let invite = models::invite::Entity::find()
            .filter(models::invite::Column::UserId.eq(self.id))
            .one(db)
            .await?;

        Ok(invite.map(From::from))
    }
}

impl From<models::invite::Model> for String {
    fn from(invite: models::invite::Model) -> Self {
        invite.code
    }
}

impl From<models::email::Model> for String {
    fn from(email: models::email::Model) -> Self {
        email.email
    }
}

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

    async fn task_status(&self, ctx: &Context<'_>) -> Result<Vec<TaskStatus>> {
        let db = get_db(ctx);

        let task_status = models::board_task_status::Entity::find()
            .filter(models::board_task_status::Column::BoardId.eq(self.id))
            .order_by_asc(models::board_task_status::Column::Priority)
            .all(db)
            .await?;

        Ok(vec_map(task_status))
    }
}

#[derive(SimpleObject)]
pub struct TaskStatus {
    name: String,
    color: String,
    priority: f32,
}

impl From<models::board_task_status::Model> for TaskStatus {
    fn from(value: models::board_task_status::Model) -> Self {
        Self {
            name: value.name,
            color: value.color,
            priority: value.priority,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(complex)]
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

#[ComplexObject]
impl Access {
    async fn user(&self, ctx: &Context<'_>) -> Result<User> {
        let db = get_db(ctx);

        let user = models::user::Entity::find_by_id(self.user_id)
            .require_one(db)
            .await?;

        Ok(User::from(user))
    }
}

#[derive(SimpleObject)]
#[graphql(complex)]
pub struct Task {
    id: i32,
    title: String,
    description: String,
    created_at: DateTime<Utc>,
    author: Email,
    status: String,
    assignee: Option<Email>,

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
            assignee: task.assignee.map(|email| Email { email }),
        }
    }
}

#[ComplexObject]
impl Task {
    async fn board(&self, ctx: &Context<'_>) -> Result<Board> {
        let db = get_db(ctx);

        let board = models::board::Entity::find_by_id(self.board_id)
            .require_one(db)
            .await?;

        Ok(Board::from(board))
    }
}

#[derive(SimpleObject)]
#[graphql(complex)]
pub struct Email {
    email: String,
}

#[ComplexObject]
impl Email {
    async fn user(&self, ctx: &Context<'_>) -> Result<Option<User>> {
        let db = get_db(ctx);

        let user = models::email::Entity::find_by_id(&self.email)
            .find_also_related(models::user::Entity)
            .one(db)
            .await?
            .and_then(|(_, user)| user);

        Ok(user.map(User::from))
    }
}

// TODO: https://async-graphql.github.io/async-graphql/en/context.html#selection--lookahead I guess it can remove N+1s.
// or this https://async-graphql.github.io/async-graphql/en/dataloader.html

// Not a todo but streaming is possible with graphql, although I think it is incompatible with
// our current auth system and would require some kind of a database proxy?

// TODO: proper guards https://async-graphql.github.io/async-graphql/en/field_guard.html
// https://async-graphql.github.io/async-graphql/en/input_value_validators.html

// This will be used stuff later https://async-graphql.github.io/async-graphql/en/cursor_connections.html

// TODO: https://async-graphql.github.io/async-graphql/en/depth_and_complexity.html since queries can be recursive now
