use actix_web::web::ThinData;
use async_graphql::{Context, Error, Object, Result};
use chrono::{DateTime, Utc};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, QueryTrait};
use uuid::Uuid;

use crate::{AuthUser, models};

#[derive(Default)]
pub struct QueryRoot;

#[Object]
#[allow(clippy::unused_async)]
#[allow(clippy::unused_async_trait_impl)]
impl QueryRoot {
    async fn me(&self, ctx: &Context<'_>) -> Result<User> {
        let user = ctx.data::<AuthUser>()?;

        Ok(User::from(user.0.clone()))
    }

    async fn users(&self, ctx: &Context<'_>) -> Result<Vec<User>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let users = models::user::Entity::find().all(db).await?;

        Ok(users.into_iter().map(User::from).collect())
    }

    async fn user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<User>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let user = models::user::Entity::find_by_id(id).one(db).await?;

        Ok(user.map(User::from))
    }

    async fn board(&self, ctx: &Context<'_>, id: i32) -> Result<Option<Board>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        let has_board_access = models::board_access::Entity::find_by_id((id, user.0.id))
            .one(db)
            .await?
            .is_some();

        if !user.0.is_admin && !has_board_access {
            return Err(Error::new("FORBIDDEN"));
        }

        let board = models::board::Entity::find_by_id(id).one(db).await?;

        Ok(board.map(Board::from))
    }

    async fn boards(&self, ctx: &Context<'_>, name: Option<String>) -> Result<Vec<Board>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        let mut query = models::board::Entity::find();

        if !user.0.is_admin {
            query = query.filter(
                models::board::Column::Id.in_subquery(
                    models::board_access::Entity::find()
                        .select_only()
                        .column(models::board_access::Column::BoardId)
                        .filter(models::board_access::Column::UserId.eq(user.0.id))
                        .into_query(),
                ),
            );
        }

        if let Some(name) = name {
            query = query.filter(models::board::Column::Name.contains(name));
        }

        let boards = query.all(db).await?;

        Ok(boards.into_iter().map(Board::from).collect())
    }

    async fn task(&self, ctx: &Context<'_>, id: i32) -> Result<Option<Task>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        let Some(task) = models::task::Entity::find_by_id(id).one(db).await? else {
            return Ok(None);
        };

        let has_board_access = models::board_access::Entity::find_by_id((task.board_id, user.0.id))
            .one(db)
            .await?
            .is_some();

        if !user.0.is_admin && !has_board_access {
            return Err(Error::new("FORBIDDEN"));
        }

        Ok(Some(Task::from(task)))
    }

    async fn tasks(&self, ctx: &Context<'_>, title: Option<String>) -> Result<Vec<Task>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        let mut query = models::task::Entity::find().filter(
            models::task::Column::BoardId.in_subquery(
                models::board_access::Entity::find()
                    .select_only()
                    .column(models::board_access::Column::BoardId)
                    .filter(models::board_access::Column::UserId.eq(user.0.id))
                    .into_query(),
            ),
        );

        if let Some(title) = title {
            query = query.filter(models::task::Column::Title.contains(title));
        }

        let tasks = query.all(db).await?;

        Ok(tasks.into_iter().map(Task::from).collect())
    }
}

pub struct User {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub is_admin: bool,
}

impl From<models::user::Model> for User {
    fn from(user: models::user::Model) -> Self {
        Self {
            id: user.id,
            created_at: user.created_at,
            is_admin: user.is_admin,
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

    async fn emails(&self, ctx: &Context<'_>) -> Result<Vec<Email>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let emails = models::email::Entity::find()
            .filter(models::email::Column::UserId.eq(self.id))
            .all(db)
            .await?;

        Ok(emails.into_iter().map(Email::from).collect())
    }
}

#[derive(async_graphql::SimpleObject)]
pub struct Email {
    pub email: String,
}

impl From<models::email::Model> for Email {
    fn from(email: models::email::Model) -> Self {
        Self { email: email.email }
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
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let tasks = models::task::Entity::find()
            .filter(models::task::Column::BoardId.eq(self.id))
            .all(db)
            .await?;

        Ok(tasks.into_iter().map(Task::from).collect())
    }

    async fn access(&self, ctx: &Context<'_>) -> Result<Vec<Access>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let access = models::board_access::Entity::find()
            .filter(models::board_access::Column::BoardId.eq(self.id))
            .all(db)
            .await?;

        Ok(access.into_iter().map(Access::from).collect())
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
}

impl From<models::task::Model> for Task {
    fn from(task: models::task::Model) -> Self {
        Self {
            id: task.id,
            title: task.title,
            description: task.description,
            created_at: task.created_at,
            author: task.author,
        }
    }
}
