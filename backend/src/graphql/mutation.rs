use actix_web::web::ThinData;
use async_graphql::{Context, Error, Object, Result};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DatabaseConnection, DbErr, EntityTrait, ExprTrait, IntoActiveModel, ModelTrait,
    QueryFilter, SqlErr, TransactionTrait,
    sea_query::{Expr, OnConflict},
};
use uuid::Uuid;

use crate::{
    AuthUser, auth_perms,
    graphql::query::{Access, Board, Email, Task},
    models,
};

use super::query::User;

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_user(&self, ctx: &Context<'_>, emails: Vec<String>) -> Result<User> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;

        auth_perms!(ctx);

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

        auth_perms!(ctx, id, user_id);

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

        auth_perms!(ctx, id, user_id);

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

        auth_perms!(ctx, id, id);

        let Some(user) = models::user::Entity::find_by_id(id).one(db).await? else {
            return Ok(false);
        };

        user.delete(db).await?;

        Ok(true)
    }

    async fn create_board(&self, ctx: &Context<'_>, name: String) -> Result<Board> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        auth_perms!(ctx);

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

        let access = models::board_access::ActiveModel {
            board_id: sea_orm::Set(board.id),
            user_id: sea_orm::Set(user.0.id),
            is_moderator: sea_orm::Set(true),
        };

        access
            .insert(db)
            .await
            .map_err(|_| Error::new("Failed to grant board access"))?;

        Ok(Board::from(board))
    }

    async fn update_board(
        &self,
        ctx: &Context<'_>,
        id: i32,
        name: Option<String>,
    ) -> Result<Option<Board>> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        let access = models::board_access::Entity::find_by_id((id, user.0.id))
            .one(db)
            .await?;

        if !user.0.is_admin && !access.is_some_and(|access| access.is_moderator) {
            return Err(Error::new("FORBIDDEN"));
        }

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
        let user = ctx.data::<AuthUser>()?;

        let access = models::board_access::Entity::find_by_id((id, user.0.id))
            .one(db)
            .await?;

        if !user.0.is_admin && !access.is_some_and(|access| access.is_moderator) {
            return Err(Error::new("FORBIDDEN"));
        }

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

        let has_board_access = models::board_access::Entity::find_by_id((board_id, user.0.id))
            .one(db)
            .await?
            .is_some();

        if !user.0.is_admin && !has_board_access {
            return Err(Error::new("FORBIDDEN"));
        }

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
        let user = ctx.data::<AuthUser>()?;

        let Some(task) = models::task::Entity::find_by_id(id).one(db).await? else {
            return Err(Error::new("NOT_FOUND"));
        };

        let has_board_access = models::board_access::Entity::find_by_id((task.board_id, user.0.id))
            .one(db)
            .await?
            .is_some();

        if !user.0.is_admin && !has_board_access {
            return Err(Error::new("FORBIDDEN"));
        }

        task.delete(db).await?;

        Ok(true)
    }

    async fn add_access(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        user_id: Uuid,
        is_moderator: bool,
    ) -> Result<Access> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        let auth_is_admin = user.0.is_admin;
        let auth_is_moderator = models::board_access::Entity::find()
            .filter(models::board_access::Column::BoardId.eq(board_id))
            .filter(models::board_access::Column::UserId.eq(user.0.id))
            .filter(models::board_access::Column::IsModerator.eq(true))
            .one(db)
            .await?
            .is_some();

        if !auth_is_admin && !auth_is_moderator {
            return Err(Error::new("FORBIDDEN"));
        }

        let access = models::board_access::ActiveModel {
            board_id: Set(board_id),
            user_id: Set(user_id),
            is_moderator: Set(is_moderator),
        };

        let access = models::board_access::Entity::insert(access)
            .on_conflict(
                OnConflict::columns([
                    models::board_access::Column::BoardId,
                    models::board_access::Column::UserId,
                ])
                .value(
                    models::board_access::Column::IsModerator,
                    if auth_is_admin {
                        Expr::val(is_moderator)
                    } else {
                        Expr::col((
                            models::board_access::Entity,
                            models::board_access::Column::IsModerator,
                        ))
                        .or(Expr::val(is_moderator))
                    },
                )
                .to_owned(),
            )
            .exec_with_returning(db)
            .await?;

        Ok(Access::from(access))
    }

    async fn remove_access(&self, ctx: &Context<'_>, board_id: i32, user_id: Uuid) -> Result<bool> {
        let db = &ctx.data::<ThinData<DatabaseConnection>>()?.0;
        let user = ctx.data::<AuthUser>()?;

        let access = models::board_access::Entity::find_by_id((board_id, user.0.id))
            .one(db)
            .await?;

        let target = models::board_access::Entity::find_by_id((board_id, user_id))
            .one(db)
            .await?;

        let (Some(access), Some(target)) = (access, target) else {
            return Err(Error::new("NOT_FOUND"));
        };

        if !user.0.is_admin && (!access.is_moderator || target.is_moderator) {
            return Err(Error::new("FORBIDDEN"));
        }

        target.delete(db).await?;

        Ok(true)
    }
}
