use async_graphql::{Context, Error, Object, Result};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, DbErr, EntityTrait, ExprTrait, IntoActiveModel, ModelTrait, QueryFilter, SqlErr,
    TransactionTrait,
    sea_query::{Expr, OnConflict},
};
use uuid::Uuid;

use crate::{
    graphql::{
        get_db, get_user,
        models::{Board, Task, User},
    },
    models,
};

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_user(
        &self,
        ctx: &Context<'_>,
        emails: Vec<String>,
        handle: Option<String>,
    ) -> Result<User> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            return Err(Error::new("FORBIDDEN"));
        }

        let tx = db.begin().await?;

        let user = models::user::ActiveModel {
            handle: handle.map_or(NotSet, |h| Set(Some(h))),
            ..Default::default()
        };

        let user = match user.insert(&tx).await {
            Ok(user) => user,
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    return Err(Error::new("Handle already taken"));
                }
                return Err(Error::new("Failed to create user"));
            }
        };

        let email_models = emails
            .into_iter()
            .map(|email| models::email::ActiveModel {
                user_id: Set(user.id),
                email: Set(email),
            })
            .collect::<Vec<_>>();

        if let Err(err) = models::email::Entity::insert_many(email_models)
            .exec(&tx)
            .await
        {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                let existing = models::email::Entity::find()
                    .filter(models::email::Column::UserId.eq(user.id))
                    .all(&tx)
                    .await?;

                let existing_emails = existing
                    .into_iter()
                    .map(|email| email.email)
                    .collect::<Vec<_>>();

                return Err(Error::new(format!(
                    "Emails already exist: {}",
                    existing_emails.join(", ")
                )));
            }

            if let DbErr::Custom(msg) = &err
                && msg == "invalid RFC 5322 email address"
            {
                return Err(Error::new("Invalid email address"));
            }

            return Err(Error::new("Failed to create emails"));
        }

        tx.commit().await?;

        Ok(User::from(user))
    }

    async fn set_user_handle(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        handle: Option<String>,
    ) -> Result<User> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(user.is_admin || user.id == user_id) {
            return Err(Error::new("FORBIDDEN"));
        }

        let user = models::user::Entity::find_by_id(user_id)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("User not found"))?;

        let mut user: models::user::ActiveModel = user.into();
        user.handle = Set(handle.map(|h| h.to_lowercase()));

        let user = match user.update(db).await {
            Ok(user) => user,
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    return Err(Error::new("Handle already taken"));
                }

                return Err(Error::new("Failed to update user"));
            }
        };

        Ok(User::from(user))
    }

    async fn add_user_email(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        email: String,
    ) -> Result<User> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(user.is_admin || user.id == user_id) {
            return Err(Error::new("FORBIDDEN"));
        }

        let user = models::user::Entity::find_by_id(user_id)
            .require_one(db)
            .await?;

        let email_model = models::email::ActiveModel {
            user_id: Set(user_id),
            email: Set(email.clone()),
        };

        match email_model.insert(db).await {
            Ok(_) => Ok(User::from(user)),
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
    ) -> Result<User> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(user.is_admin || user.id == user_id) {
            return Err(Error::new("FORBIDDEN"));
        }

        let user = models::user::Entity::find_by_id(user_id)
            .require_one(db)
            .await?;

        models::email::Entity::delete_many()
            .filter(models::email::Column::UserId.eq(user_id))
            .filter(models::email::Column::Email.eq(&email))
            .exec(db)
            .await?;

        Ok(User::from(user))
    }

    async fn delete_user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<User>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(user.is_admin || user.id == id) {
            return Err(Error::new("FORBIDDEN"));
        }

        models::user::Entity::delete_by_id(id).exec(db).await?;

        Ok(None)
    }

    async fn create_board(&self, ctx: &Context<'_>, name: String) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            return Err(Error::new("FORBIDDEN"));
        }

        let tx = db.begin().await?;

        let board = models::board::ActiveModel {
            name: Set(name),
            ..Default::default()
        };

        let board = match board.insert(&tx).await {
            Ok(board) => board,
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    return Err(Error::new("NAME"));
                }

                return Err(Error::new("Failed to create board"));
            }
        };

        let access = models::board_access::ActiveModel {
            board_id: Set(board.id),
            user_id: Set(user.id),
            is_moderator: Set(true),
        };

        access.insert(&tx).await?;

        tx.commit().await?;

        Ok(Board::from(board))
    }

    async fn update_board(
        &self,
        ctx: &Context<'_>,
        id: i32,
        name: Option<String>,
    ) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((id, user.id))
                .one(db)
                .await?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        let Some(board) = models::board::Entity::find_by_id(id).one(db).await? else {
            return Err(Error::new("BOARD NOT FOUND"));
        };

        let mut board = board.into_active_model();

        if let Some(name) = name {
            board.name = Set(name);
        }

        let board = board.update(db).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return Error::new("NAME");
            }

            Error::new("Failed to update board")
        })?;

        Ok(Board::from(board))
    }

    async fn delete_board(&self, ctx: &Context<'_>, id: i32) -> Result<Option<Board>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((id, user.id))
                .one(db)
                .await?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        models::board::Entity::delete_by_id(id).exec(db).await?;

        Ok(None)
    }

    async fn create_task(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        title: String,
        description: Option<String>,
        author: String,
        status: String,
        assignee: Option<String>,
    ) -> Result<Task> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((board_id, user.id))
                .one(db)
                .await?;

            if access.is_none() {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        let owns_email = models::email::Entity::find_by_id(&author)
            .filter(models::email::Column::UserId.eq(user.id))
            .one(db)
            .await?
            .is_some();

        if !owns_email {
            return Err(Error::new("AUTHOR"));
        }

        let task = models::task::ActiveModel {
            board_id: Set(board_id),
            title: Set(title),
            description: description.map_or(NotSet, Set),
            author: Set(author),
            status: Set(status),
            assignee: assignee.map_or(NotSet, |a| Set(Some(a))),
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
        status: Option<String>,
        assignee: Option<Option<String>>,
    ) -> Result<Task> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let Some(task) = models::task::Entity::find_by_id(id).one(db).await? else {
            return Err(Error::new("TASK NOT FOUND"));
        };

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((task.board_id, user.id))
                .one(db)
                .await?;

            if access.is_none() {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        let mut task = task.into_active_model();

        if let Some(title) = title {
            task.title = Set(title);
        }

        if let Some(description) = description {
            task.description = Set(description);
        }

        if let Some(status) = status {
            task.status = Set(status);
        }

        if let Some(assignee) = assignee {
            task.assignee = Set(assignee);
        }

        match task.update(db).await {
            Ok(task) => Ok(Task::from(task)),
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    Err(Error::new("TITLE"))
                } else {
                    Err(Error::new("Failed to update task"))
                }
            }
        }
    }

    async fn delete_task(&self, ctx: &Context<'_>, id: i32) -> Result<Option<Task>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let Some(task) = models::task::Entity::find_by_id(id).one(db).await? else {
            return Err(Error::new("TASK NOT FOUND"));
        };

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((task.board_id, user.id))
                .one(db)
                .await?;

            if access.is_none() {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        task.delete(db).await?;

        Ok(None)
    }

    async fn add_access(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        user_id: Uuid,
        is_moderator: bool,
    ) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((board_id, user.id))
                .one(db)
                .await?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        // Seems wrong to query it before insert but actually access query is gonna be it's own thing so it's fine.
        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("NOT_FOUND"))?;

        let access = models::board_access::ActiveModel {
            board_id: Set(board_id),
            user_id: Set(user_id),
            is_moderator: Set(is_moderator),
        };

        models::board_access::Entity::insert(access)
            .on_conflict(
                OnConflict::columns([
                    models::board_access::Column::BoardId,
                    models::board_access::Column::UserId,
                ])
                .value(
                    models::board_access::Column::IsModerator,
                    if user.is_admin {
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
            .exec(db)
            .await?;

        Ok(Board::from(board))
    }

    async fn remove_access(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        user_id: Uuid,
    ) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        // As in the method above.
        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("NOT_FOUND"))?;

        let target = models::board_access::Entity::find_by_id((board_id, user_id))
            .one(db)
            .await?;

        let Some(target) = target else {
            return Err(Error::new("NOT_FOUND"));
        };

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((board_id, user.id))
                .one(db)
                .await?;

            if !access.is_some_and(|access| access.is_moderator) || target.is_moderator {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        target.delete(db).await?;

        Ok(Board::from(board))
    }

    async fn add_invite(&self, ctx: &Context<'_>, user_id: Uuid) -> Result<String> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(user.is_admin || user.id == user_id) {
            return Err(Error::new("FORBIDDEN"));
        }

        let invite = models::invite::Entity::find()
            .filter(models::invite::Column::UserId.eq(user_id))
            .one(db)
            .await?;

        let invite = models::invite::ActiveModel {
            code: invite.map_or_default(|invite| Set(invite.code)),
            user_id: Set(user_id),
        };

        let invite = models::invite::Entity::insert(invite)
            .on_conflict(
                OnConflict::column(models::invite::Column::UserId)
                    .update_column(models::invite::Column::Code)
                    .to_owned(),
            )
            .exec_with_returning(db)
            .await?;

        Ok(String::from(invite))
    }

    async fn remove_invite(&self, ctx: &Context<'_>, user_id: Uuid) -> Result<Option<String>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(user.is_admin || user.id == user_id) {
            return Err(Error::new("FORBIDDEN"));
        }

        let target = models::invite::Entity::find()
            .filter(models::invite::Column::UserId.eq(user_id))
            .one(db)
            .await?;

        let Some(target) = target else {
            return Err(Error::new("NOT_FOUND"));
        };

        target.delete(db).await?;

        Ok(None)
    }

    async fn add_task_status(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        name: String,
        color: String,
        priority: f32,
    ) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((board_id, user.id))
                .one(db)
                .await?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("NOT_FOUND"))?;

        let task_status = models::board_task_status::ActiveModel {
            board_id: Set(board_id),
            name: Set(name),
            color: Set(color),
            priority: Set(priority),
        };

        models::board_task_status::Entity::insert(task_status)
            .exec(db)
            .await?;

        Ok(Board::from(board))
    }

    async fn update_task_status(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        name: String,
        new_name: Option<String>,
        color: Option<String>,
        priority: Option<f32>,
    ) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((board_id, user.id))
                .one(db)
                .await?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("NOT_FOUND"))?;

        let task_status = models::board_task_status::Entity::find()
            .filter(models::board_task_status::Column::BoardId.eq(board_id))
            .filter(models::board_task_status::Column::Name.eq(name))
            .one(db)
            .await?
            .ok_or(Error::new("NOT_FOUND"))?;

        let mut task_status = task_status.into_active_model();

        if let Some(new_name) = new_name {
            task_status.name = Set(new_name);
        }

        if let Some(color) = color {
            task_status.color = Set(color);
        }

        if let Some(priority) = priority {
            task_status.priority = Set(priority);
        }

        task_status.update(db).await?;

        Ok(Board::from(board))
    }

    async fn remove_task_status(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        name: String,
    ) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await?
            .ok_or_else(|| Error::new("NOT_FOUND"))?;

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((board_id, user.id))
                .one(db)
                .await?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        let target = models::board_task_status::Entity::find()
            .filter(models::board_task_status::Column::BoardId.eq(board_id))
            .filter(models::board_task_status::Column::Name.eq(name))
            .one(db)
            .await?;

        let Some(target) = target else {
            return Err(Error::new("NOT_FOUND"));
        };

        target.delete(db).await?;

        Ok(Board::from(board))
    }
}
