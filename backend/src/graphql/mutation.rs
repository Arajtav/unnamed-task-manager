use actix_web::web::ThinData;
use async_graphql::{Context, Error, Object, Result};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DatabaseConnection, DbErr, EntityTrait, IntoActiveModel, ModelTrait, QueryFilter,
    SqlErr, TransactionTrait,
};
use uuid::Uuid;

use crate::{
    AuthUser,
    graphql::query::{Board, Email, Task},
    models,
};

use super::query::User;

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_user(&self, ctx: &Context<'_>, emails: Vec<String>) -> Result<User> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let tx = db.begin().await?;

        let user = models::user::ActiveModel {
            ..Default::default()
        };

        let user = user.insert(&tx).await?;

        for email in emails {
            let email_model = models::email::ActiveModel {
                user_id: sea_orm::Set(user.id),
                email: sea_orm::Set(email.clone()),
            };

            if let Err(err) = email_model.insert(&tx).await {
                tx.rollback().await?;

                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    return Err(Error::new(format!("Email already exists: {email}")));
                }

                if let DbErr::Custom(msg) = &err
                    && msg == "invalid RFC 5322 email address"
                {
                    return Err(Error::new("Invalid email address"));
                }

                return Err(Error::new("Failed to create email"));
            }
        }

        tx.commit().await?;

        Ok(User::from(user))
    }

    async fn add_user_email(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        email: String,
    ) -> Result<Email> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let email_model = models::email::ActiveModel {
            user_id: sea_orm::Set(user_id),
            email: sea_orm::Set(email.clone()),
        };

        match email_model.insert(db).await {
            Ok(email) => Ok(Email::from(email)),
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    return Err(Error::new(format!("Email already exists: {email}")));
                }

                if let DbErr::Custom(msg) = &err
                    && msg == "invalid RFC 5322 email address"
                {
                    return Err(Error::new("Invalid email address"));
                }

                Err(Error::new("Failed to create email"))
            }
        }
    }

    async fn delete_user_email(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        email: String,
    ) -> Result<bool> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let Some(email_model) = models::email::Entity::find()
            .filter(models::email::Column::UserId.eq(user_id))
            .filter(models::email::Column::Email.eq(&email))
            .one(db)
            .await?
        else {
            return Ok(false);
        };

        email_model.delete(db).await?;

        Ok(true)
    }

    async fn delete_user(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let Some(user) = models::user::Entity::find_by_id(id).one(db).await? else {
            return Ok(false);
        };

        user.delete(db).await?;

        Ok(true)
    }

    async fn create_board(&self, ctx: &Context<'_>, name: String) -> Result<Board> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let board = models::board::ActiveModel {
            name: sea_orm::Set(name.clone()),
            ..Default::default()
        };

        let board = match board.insert(db).await {
            Ok(board) => board,
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    return Err(Error::new("NAME"));
                }

                return Err(Error::new("Failed to create board"));
            }
        };

        Ok(Board::from(board))
    }

    async fn update_board(
        &self,
        ctx: &Context<'_>,
        id: i32,
        name: Option<String>,
    ) -> Result<Option<Board>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let Some(board) = models::board::Entity::find_by_id(id).one(db).await? else {
            return Ok(None);
        };

        let mut board = board.into_active_model();

        if let Some(name) = name {
            board.name = sea_orm::Set(name);
        }

        let board = board.update(db).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return Error::new("NAME");
            }

            Error::new("Failed to update board")
        })?;

        Ok(Some(Board::from(board)))
    }

    async fn delete_board(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let Some(board) = models::board::Entity::find_by_id(id).one(db).await? else {
            return Ok(false);
        };

        board.delete(db).await?;

        Ok(true)
    }

    async fn create_task(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        title: String,
        description: Option<String>,
        author: String,
    ) -> Result<Task> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        let owns_email = models::email::Entity::find_by_id(&author)
            .filter(models::email::Column::UserId.eq(user.0.id))
            .one(db)
            .await?
            .is_some();

        if !owns_email {
            return Err(Error::new("AUTHOR"));
        }

        let task = models::task::ActiveModel {
            board_id: sea_orm::Set(board_id),
            title: sea_orm::Set(title),
            description: description.map_or(NotSet, Set),
            author: sea_orm::Set(author),
            ..Default::default()
        };

        let task = task.insert(db).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return Error::new("TITLE");
            }

            if let Some(SqlErr::ForeignKeyConstraintViolation(_)) = err.sql_err() {
                return Error::new("NOT_FOUND");
            }

            Error::new("Failed to create task")
        })?;

        Ok(Task::from(task))
    }

    async fn update_task(
        &self,
        ctx: &Context<'_>,
        id: i32,
        title: Option<String>,
        description: Option<String>,
    ) -> Result<Option<Task>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let Some(task) = models::task::Entity::find_by_id(id).one(db).await? else {
            return Ok(None);
        };

        let mut task = task.into_active_model();

        if let Some(title) = title {
            task.title = sea_orm::Set(title);
        }

        if let Some(description) = description {
            task.description = sea_orm::Set(description);
        }

        let task = task.update(db).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return Error::new("TITLE");
            }

            Error::new("Failed to update task")
        })?;

        Ok(Some(Task::from(task)))
    }

    async fn delete_task(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        let Some(task) = models::task::Entity::find_by_id(id).one(db).await? else {
            return Ok(false);
        };

        task.delete(db).await?;

        Ok(true)
    }
}
