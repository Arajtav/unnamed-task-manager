use async_graphql::{Context, InputObject, MaybeUndefined, Object, Result};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, ConnectionTrait, DbBackend, DbErr, EntityTrait, IntoActiveModel, ModelTrait,
    QueryFilter, SqlErr, Statement, TransactionTrait,
    sea_query::{Expr, OnConflict},
};
use tracing::instrument;
use uuid::Uuid;

use crate::{
    graphql::{
        coded, coded_with, db_err, forbidden, get_db, get_user,
        models::{board::Board, task::Task, time_tracking_entry::TimeTrackingEntry, user::User},
    },
    models::{self, user::new_invite},
};

fn normalize_label(raw: &str) -> Result<String> {
    let name = raw.trim();
    if name.is_empty() || name.chars().count() > 64 {
        return Err(coded("Invalid label", "INVALID_LABEL"));
    }
    Ok(name.to_lowercase())
}

fn normalize_handle(raw: &str) -> String {
    raw.to_lowercase()
}

fn normalize_assignees(raw: Vec<String>) -> Vec<String> {
    raw.into_iter()
        .map(|e| e.trim().to_owned())
        .filter(|e| !e.is_empty())
        .collect()
}

async fn insert_labels(tx: &impl ConnectionTrait, task_id: i32, labels: Vec<String>) -> Result<()> {
    if labels.is_empty() {
        return Ok(());
    }

    models::task_label::Entity::insert_many(labels.into_iter().map(|name| {
        models::task_label::ActiveModel {
            task_id: Set(task_id),
            name: Set(name),
        }
    }))
    .on_conflict_do_nothing_on([
        models::task_label::Column::TaskId,
        models::task_label::Column::Name,
    ])
    .exec(tx)
    .await
    .map_err(db_err)?;

    Ok(())
}

async fn insert_assignees(
    tx: &impl ConnectionTrait,
    task_id: i32,
    assignees: Vec<String>,
) -> Result<()> {
    if assignees.is_empty() {
        return Ok(());
    }

    models::task_assignee::Entity::insert_many(assignees.into_iter().map(|email| {
        models::task_assignee::ActiveModel {
            task_id: Set(task_id),
            email: Set(email),
        }
    }))
    .on_conflict_do_nothing_on([
        models::task_assignee::Column::TaskId,
        models::task_assignee::Column::Email,
    ])
    .exec(tx)
    .await
    .map_err(db_err)?;

    Ok(())
}

async fn insert_emails(
    tx: &impl ConnectionTrait,
    user_id: Uuid,
    emails: Vec<String>,
) -> Result<()> {
    if emails.is_empty() {
        return Ok(());
    }

    let active_models = emails
        .iter()
        .map(|email| models::email::ActiveModel {
            user_id: Set(user_id),
            email: Set(email.clone()),
        })
        .collect::<Vec<_>>();

    let Err(err) = models::email::Entity::insert_many(active_models)
        .exec(tx)
        .await
    else {
        return Ok(());
    };

    if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
        let taken = models::email::Entity::find()
            .filter(models::email::Column::Email.is_in(emails))
            .all(tx)
            .await
            .map_err(db_err)?
            .into_iter()
            .map(|email| email.email)
            .collect::<Vec<_>>();

        return Err(coded_with(
            "Emails already exist",
            "EMAILS_TAKEN",
            ("EMAILS", taken),
        ));
    }

    if let DbErr::Custom(msg) = &err
        && msg == "invalid RFC 5322 email address"
    {
        return Err(coded("Invalid email address", "INVALID_EMAIL"));
    }

    Err(db_err(err))
}

#[derive(InputObject)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub is_archived: Option<bool>,
    #[graphql(default)]
    pub add_labels: Vec<String>,
    #[graphql(default)]
    pub remove_labels: Vec<String>,
    #[graphql(default)]
    pub add_assignees: Vec<String>,
    #[graphql(default)]
    pub remove_assignees: Vec<String>,

    #[graphql(default)]
    pub priority: Option<i32>,
}

#[derive(InputObject)]
pub struct UpdateUserInput {
    pub handle: MaybeUndefined<String>,
    #[graphql(default)]
    pub delete_emails: Vec<String>,
    #[graphql(default)]
    pub add_emails: Vec<String>,
    pub is_disabled: Option<bool>,
}

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    #[instrument(name = "Mutation.create_user", skip_all)]
    async fn create_user(
        &self,
        ctx: &Context<'_>,
        #[graphql(default)] emails: Vec<String>,
        #[graphql(default)] handle: Option<String>,
    ) -> Result<User> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            return Err(forbidden());
        }

        let tx = db.begin().await.map_err(db_err)?;

        let user = models::user::ActiveModel {
            handle: handle.map_or(NotSet, |h| Set(Some(normalize_handle(&h)))),
            ..Default::default()
        };

        let user = match user.insert(&tx).await {
            Ok(user) => user,
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    return Err(coded("Handle already taken", "HANDLE_TAKEN"));
                }
                return Err(db_err(err));
            }
        };

        insert_emails(&tx, user.id, emails).await?;

        tx.commit().await.map_err(db_err)?;

        Ok(User::from(user))
    }

    #[instrument(name = "Mutation.update_user", skip_all, fields(target_user_id = %user_id))]
    async fn update_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        input: UpdateUserInput,
    ) -> Result<User> {
        let db = get_db(ctx);
        let viewer = get_user(ctx);

        if !(viewer.is_admin || viewer.id == user_id) {
            return Err(forbidden());
        }

        let tx = db.begin().await.map_err(db_err)?;

        let user = models::user::Entity::find_by_id(user_id)
            .one(&tx)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("User not found", "USER_NOT_FOUND"))?;

        let is_admin = user.is_admin;
        let mut user = user.into_active_model();

        user.handle = match &input.handle {
            MaybeUndefined::Value(handle) => Set(Some(normalize_handle(handle))),
            MaybeUndefined::Null => Set(None),
            MaybeUndefined::Undefined => NotSet,
        };

        if let Some(is_disabled) = input.is_disabled {
            if !viewer.is_admin || is_admin {
                return Err(forbidden());
            }

            user.is_disabled = Set(is_disabled);
        }

        let user = user.update(&tx).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                coded("Handle already taken", "HANDLE_TAKEN")
            } else {
                db_err(err)
            }
        })?;

        if !input.delete_emails.is_empty() {
            models::email::Entity::delete_many()
                .filter(models::email::Column::UserId.eq(user_id))
                .filter(models::email::Column::Email.is_in(input.delete_emails))
                .exec(&tx)
                .await
                .map_err(db_err)?;
        }

        insert_emails(&tx, user_id, input.add_emails).await?;

        tx.commit().await.map_err(db_err)?;

        Ok(User::from(user))
    }

    #[instrument(name = "Mutation.create_board", skip_all)]
    async fn create_board(&self, ctx: &Context<'_>, name: String) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            return Err(forbidden());
        }

        let tx = db.begin().await.map_err(db_err)?;

        let board = models::board::ActiveModel {
            name: Set(name),
            ..Default::default()
        };

        let board = match board.insert(&tx).await {
            Ok(board) => board,
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    return Err(coded("Name already taken", "NAME_TAKEN"));
                }

                return Err(db_err(err));
            }
        };

        let access = models::board_access::ActiveModel {
            board_id: Set(board.id),
            user_id: Set(user.id),
            is_moderator: Set(true),
        };

        access.insert(&tx).await.map_err(db_err)?;

        tx.commit().await.map_err(db_err)?;

        Ok(Board::from(board))
    }

    #[instrument(name = "Mutation.update_board", skip_all, fields(board_id = id))]
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
                .await
                .map_err(db_err)?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(forbidden());
            }
        }

        let board = models::board::Entity::find_by_id(id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("Board not found", "BOARD_NOT_FOUND"))?;

        let mut board = board.into_active_model();

        if let Some(name) = name {
            board.name = Set(name);
        }

        let board = board.update(db).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return coded("Name already taken", "NAME_TAKEN");
            }

            db_err(err)
        })?;

        Ok(Board::from(board))
    }

    #[instrument(name = "Mutation.create_task", skip_all, fields(board_id = board_id))]
    async fn create_task(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        title: String,
        #[graphql(default)] description: Option<String>,
        author: String,
        status: String,
        #[graphql(default)] assignees: Vec<String>,
        #[graphql(default)] labels: Vec<String>,
        #[graphql(default)] priority: i32,
    ) -> Result<Task> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !(-3..=3).contains(&priority) {
            return Err(coded("Invalid priority", "INVALID_PRIORITY"));
        }

        let labels = labels
            .iter()
            .map(|l| normalize_label(l))
            .collect::<Result<Vec<_>>>()?;

        let tx = db.begin().await.map_err(db_err)?;

        if !user.is_admin {
            models::board_access::Entity::find_by_id((board_id, user.id))
                .one(&tx)
                .await
                .map_err(db_err)?
                .ok_or_else(forbidden)?;
        }

        models::email::Entity::find_by_id(&author)
            .filter(models::email::Column::UserId.eq(user.id))
            .one(&tx)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("Wrong author", "WRONG_AUTHOR"))?;

        let task = models::task::ActiveModel {
            board_id: Set(board_id),
            title: Set(title),
            description: description.map_or(NotSet, Set),
            author: Set(author),
            status: Set(status),
            priority: Set(priority),
            ..Default::default()
        };

        let task = task.insert(&tx).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                return coded("Title already taken", "TITLE_TAKEN");
            }

            if let Some(SqlErr::ForeignKeyConstraintViolation(_)) = err.sql_err() {
                return coded("Board not found", "BOARD_NOT_FOUND");
            }

            db_err(err)
        })?;

        insert_labels(&tx, task.id, labels).await?;
        insert_assignees(&tx, task.id, normalize_assignees(assignees)).await?;

        tx.commit().await.map_err(db_err)?;

        Ok(Task::from(task))
    }

    #[instrument(name = "Mutation.update_task", skip_all, fields(task_id = id))]
    async fn update_task(
        &self,
        ctx: &Context<'_>,
        id: i32,
        input: UpdateTaskInput,
    ) -> Result<Task> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let add_labels = input
            .add_labels
            .iter()
            .map(|l| normalize_label(l))
            .collect::<Result<Vec<_>>>()?;

        let remove_labels = input
            .remove_labels
            .iter()
            .map(|l| normalize_label(l))
            .collect::<Result<Vec<_>>>()?;

        let tx = db.begin().await.map_err(db_err)?;

        let task = models::task::Entity::find_by_id(id)
            .one(&tx)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("Task not found", "TASK_NOT_FOUND"))?;

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((task.board_id, user.id))
                .one(&tx)
                .await
                .map_err(db_err)?
                .ok_or_else(forbidden)?;

            if task.archived_at.is_some()
                && input.is_archived != Some(false)
                && !access.is_moderator
            {
                return Err(coded("Task archived", "TASK_ARCHIVED"));
            }
        }

        let was_archived = task.archived_at.is_some();
        let mut task = task.into_active_model();

        if let Some(title) = input.title {
            task.title = Set(title);
        }

        if let Some(description) = input.description {
            task.description = Set(description);
        }

        if let Some(status) = input.status {
            task.status = Set(status);
        }

        if let Some(priority) = input.priority {
            if !(-3..=3).contains(&priority) {
                return Err(coded("Invalid priority", "INVALID_PRIORITY"));
            }

            task.priority = Set(priority);
        }

        if let Some(is_archived) = input.is_archived {
            if !is_archived {
                task.archived_at = Set(None);
            } else if !was_archived {
                task.archived_at = Set(Some(Utc::now()));
            }
        }

        let task = task.update(&tx).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                coded("Title already taken", "TITLE_TAKEN")
            } else {
                db_err(err)
            }
        })?;

        if !remove_labels.is_empty() {
            models::task_label::Entity::delete_many()
                .filter(models::task_label::Column::TaskId.eq(id))
                .filter(models::task_label::Column::Name.is_in(remove_labels))
                .exec(&tx)
                .await
                .map_err(db_err)?;
        }

        if !input.remove_assignees.is_empty() {
            models::task_assignee::Entity::delete_many()
                .filter(models::task_assignee::Column::TaskId.eq(id))
                .filter(models::task_assignee::Column::Email.is_in(input.remove_assignees))
                .exec(&tx)
                .await
                .map_err(db_err)?;
        }

        insert_labels(&tx, id, add_labels).await?;
        insert_assignees(&tx, id, normalize_assignees(input.add_assignees)).await?;

        tx.commit().await.map_err(db_err)?;

        Ok(Task::from(task))
    }

    #[instrument(name = "Mutation.add_access", skip_all, fields(board_id = board_id, target_user_id = %user_id, is_moderator = is_moderator))]
    async fn add_access(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        user_id: Uuid,
        #[graphql(default)] is_moderator: bool,
    ) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((board_id, user.id))
                .one(db)
                .await
                .map_err(db_err)?;

            if access.is_none_or(|access| !access.is_moderator) || is_moderator {
                return Err(forbidden());
            }
        }

        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("Board not found", "BOARD_NOT_FOUND"))?;

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
                .update_column(models::board_access::Column::IsModerator)
                .to_owned(),
            )
            .exec(db)
            .await
            .map_err(db_err)?;

        Ok(Board::from(board))
    }

    #[instrument(name = "Mutation.remove_access", skip_all, fields(board_id = board_id, target_user_id = %user_id))]
    async fn remove_access(
        &self,
        ctx: &Context<'_>,
        board_id: i32,
        user_id: Uuid,
    ) -> Result<Board> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("Board not found", "BOARD_NOT_FOUND"))?;

        let target = models::board_access::Entity::find_by_id((board_id, user_id))
            .one(db)
            .await
            .map_err(db_err)?;

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((board_id, user.id))
                .one(db)
                .await
                .map_err(db_err)?;

            if !access.is_some_and(|access| access.is_moderator)
                || target.as_ref().is_some_and(|t| t.is_moderator)
            {
                return Err(forbidden());
            }
        }

        let Some(target) = target else {
            return Ok(Board::from(board));
        };

        target.delete(db).await.map_err(db_err)?;

        Ok(Board::from(board))
    }

    #[instrument(name = "Mutation.add_invite", skip_all, fields(target_user_id = %user_id))]
    async fn add_invite(&self, ctx: &Context<'_>, user_id: Uuid) -> Result<User> {
        let db = get_db(ctx);
        let current = get_user(ctx);

        if !(current.is_admin || current.id == user_id) {
            return Err(forbidden());
        }

        let mut user = models::user::Entity::find_by_id(user_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("User not found", "USER_NOT_FOUND"))?
            .into_active_model();

        user.invite_code = Set(Some(new_invite()));

        let user = user.update(db).await.map_err(db_err)?;

        Ok(User::from(user))
    }

    #[instrument(name = "Mutation.remove_invite", skip_all, fields(target_user_id = %user_id))]
    async fn remove_invite(&self, ctx: &Context<'_>, user_id: Uuid) -> Result<User> {
        let db = get_db(ctx);
        let current = get_user(ctx);

        if !(current.is_admin || current.id == user_id) {
            return Err(forbidden());
        }

        let mut user = models::user::Entity::find_by_id(user_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("User not found", "USER_NOT_FOUND"))?
            .into_active_model();

        user.invite_code = Set(None);

        let user = user.update(db).await.map_err(db_err)?;

        Ok(User::from(user))
    }

    #[instrument(name = "Mutation.add_task_status", skip_all, fields(board_id = board_id))]
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
                .await
                .map_err(db_err)?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(forbidden());
            }
        }

        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("Board not found", "BOARD_NOT_FOUND"))?;

        let task_status = models::board_task_status::ActiveModel {
            board_id: Set(board_id),
            name: Set(name),
            color: Set(color),
            priority: Set(priority),
        };

        models::board_task_status::Entity::insert(task_status)
            .exec(db)
            .await
            .map_err(|err| {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    coded("Status name already taken", "STATUS_NAME_TAKEN")
                } else {
                    db_err(err)
                }
            })?;

        Ok(Board::from(board))
    }

    #[instrument(name = "Mutation.update_task_status", skip_all, fields(board_id = board_id))]
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
                .await
                .map_err(db_err)?;

            if access.is_none_or(|access| !access.is_moderator) {
                return Err(forbidden());
            }
        }

        let board = models::board::Entity::find_by_id(board_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("Board not found", "BOARD_NOT_FOUND"))?;

        // Primary key can change so update() doesn't work.
        let mut update = models::board_task_status::Entity::update_many()
            .filter(models::board_task_status::Column::BoardId.eq(board_id))
            .filter(models::board_task_status::Column::Name.eq(&name));

        if let Some(new_name) = new_name {
            update = update.col_expr(
                models::board_task_status::Column::Name,
                Expr::value(new_name),
            );
        }

        if let Some(color) = color {
            update = update.col_expr(models::board_task_status::Column::Color, Expr::value(color));
        }

        if let Some(priority) = priority {
            update = update.col_expr(
                models::board_task_status::Column::Priority,
                Expr::value(priority),
            );
        }

        let result = update.exec(db).await.map_err(|err| {
            if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                coded("Status name already taken", "STATUS_NAME_TAKEN")
            } else {
                db_err(err)
            }
        })?;

        if result.rows_affected == 0 {
            return Err(coded("Board status not found", "BOARD_STATUS_NOT_FOUND"));
        }

        Ok(Board::from(board))
    }

    #[instrument(name = "Mutation.create_time_tracking_entry", skip_all, fields(task_id = task_id))]
    async fn create_time_tracking_entry(
        &self,
        ctx: &Context<'_>,
        task_id: i32,
        started_at: DateTime<Utc>,
        finished_at: DateTime<Utc>,
        description: String,
    ) -> Result<TimeTrackingEntry> {
        if finished_at < started_at {
            return Err(coded("Finished before started", "FINISH_BEFORE_START"));
        }

        let db = get_db(ctx);
        let user = get_user(ctx);

        let task = models::task::Entity::find_by_id(task_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| coded("Task not found", "TASK_NOT_FOUND"))?;

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((task.board_id, user.id))
                .one(db)
                .await
                .map_err(db_err)?;

            if access.is_none() {
                return Err(forbidden());
            }
        }

        let entry = models::time_tracking::ActiveModel {
            started_at: Set(started_at),
            finished_at: Set(finished_at),
            description: Set(description),
            task_id: Set(Some(task_id)),
            user_id: Set(Some(user.id)),
            ..Default::default()
        };

        let entry = entry.insert(db).await.map_err(db_err)?;

        Ok(TimeTrackingEntry::from(entry))
    }

    #[instrument(name = "Mutation.update_time_tracking_entry", skip_all, fields(entry_id = id))]
    async fn update_time_tracking_entry(
        &self,
        ctx: &Context<'_>,
        id: i32,
        #[graphql(default)] started_at: Option<DateTime<Utc>>,
        #[graphql(default)] finished_at: Option<DateTime<Utc>>,
        #[graphql(default)] description: Option<String>,
    ) -> Result<TimeTrackingEntry> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let Some(entry) = models::time_tracking::Entity::find_by_id(id)
            .one(db)
            .await
            .map_err(db_err)?
        else {
            return Err(coded("Entry not found", "TIME_TRACKING_ENTRY_NOT_FOUND"));
        };

        if entry.user_id != Some(user.id) {
            return Err(forbidden());
        }

        let final_started_at = started_at.unwrap_or(entry.started_at);
        let final_finished_at = finished_at.unwrap_or(entry.finished_at);

        if final_finished_at < final_started_at {
            return Err(coded("Finished before started", "FINISH_BEFORE_START"));
        }

        let mut entry = entry.into_active_model();

        if let Some(started_at) = started_at {
            entry.started_at = Set(started_at);
        }

        if let Some(finished_at) = finished_at {
            entry.finished_at = Set(finished_at);
        }

        if let Some(description) = description {
            entry.description = Set(description);
        }

        let entry = entry.update(db).await.map_err(db_err)?;

        Ok(TimeTrackingEntry::from(entry))
    }

    #[instrument(name = "Mutation.remove_task_time_tracking_entry", skip_all, fields(task_id = task_id, entry_id = id))]
    async fn remove_task_time_tracking_entry(
        &self,
        ctx: &Context<'_>,
        task_id: i32,
        id: i32,
    ) -> Result<Option<Task>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let Some(task) = models::task::Entity::find_by_id(task_id)
            .one(db)
            .await
            .map_err(db_err)?
        else {
            return Ok(None);
        };

        if !user.is_admin {
            models::board_access::Entity::find_by_id((task.board_id, user.id))
                .one(db)
                .await
                .map_err(db_err)?
                .ok_or_else(forbidden)?;
        }

        let Some(entry) = models::time_tracking::Entity::find_by_id(id)
            .filter(models::time_tracking::Column::TaskId.eq(task_id))
            .one(db)
            .await
            .map_err(db_err)?
        else {
            return Ok(None);
        };

        if entry.user_id != Some(user.id) {
            return Err(forbidden());
        }

        let task = models::task::Entity::find_by_id(task_id)
            .one(db)
            .await
            .map_err(db_err)?;

        entry.into_active_model().delete(db).await.map_err(db_err)?;

        Ok(task.map(Task::from))
    }

    #[instrument(name = "Mutation.add_task_block", skip_all, fields(task_id = task_id, blocked_by = blocked_by))]
    async fn add_task_block(
        &self,
        ctx: &Context<'_>,
        task_id: i32,
        blocked_by: i32,
    ) -> Result<Task> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if task_id == blocked_by {
            return Err(coded("Self block", "SELF_BLOCK"));
        }

        let Some(task) = models::task::Entity::find_by_id(task_id)
            .one(db)
            .await
            .map_err(db_err)?
        else {
            return Err(coded("Task not found", "TASK_NOT_FOUND"));
        };

        let Some(blocking_task) = models::task::Entity::find_by_id(blocked_by)
            .one(db)
            .await
            .map_err(db_err)?
        else {
            return Err(coded("Blocking task not found", "BLOCKING_TASK_NOT_FOUND"));
        };

        // Task not found on the same board.
        if task.board_id != blocking_task.board_id {
            return Err(coded("Blocking task not found", "BLOCKING_TASK_NOT_FOUND"));
        }

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((task.board_id, user.id))
                .one(db)
                .await
                .map_err(db_err)?
                .ok_or_else(forbidden)?;

            if (blocking_task.archived_at.is_some() || task.archived_at.is_some())
                && !access.is_moderator
            {
                return Err(coded("Task archived", "TASK_ARCHIVED"));
            }
        }

        // TODO: Why do we even use sea orm it was a terrible decision.
        let stmt = Statement::from_sql_and_values(
            DbBackend::Sqlite,
            r"
                WITH RECURSIVE closure(blocked_id) AS (
                    SELECT blocked FROM task_block WHERE blocking = ?
                    UNION
                    SELECT tb.blocked FROM task_block tb
                    JOIN closure c ON tb.blocking = c.blocked_id
                )
                SELECT 1 FROM closure WHERE blocked_id = ?
            ",
            vec![task_id.into(), blocked_by.into()],
        );

        let cycle_results = db.query_all_raw(stmt).await.map_err(db_err)?;
        if !cycle_results.is_empty() {
            return Err(coded("Cyclic block", "CYCLIC_BLOCK"));
        }

        let new_block = models::task_block::ActiveModel {
            blocking: Set(blocked_by),
            blocked: Set(task_id),
        };

        match new_block.insert(db).await {
            Ok(_) => Ok(Task::from(task)),
            Err(err) => {
                if let Some(SqlErr::UniqueConstraintViolation(_)) = err.sql_err() {
                    Ok(Task::from(task))
                } else {
                    Err(db_err(err))
                }
            }
        }
    }

    #[instrument(name = "Mutation.remove_task_block", skip_all, fields(task_id = task_id, blocked_by = blocked_by))]
    async fn remove_task_block(
        &self,
        ctx: &Context<'_>,
        task_id: i32,
        blocked_by: i32,
    ) -> Result<Task> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let Some(task) = models::task::Entity::find_by_id(task_id)
            .one(db)
            .await
            .map_err(db_err)?
        else {
            return Err(coded("Task not found", "TASK_NOT_FOUND"));
        };

        if !user.is_admin {
            let access = models::board_access::Entity::find_by_id((task.board_id, user.id))
                .one(db)
                .await
                .map_err(db_err)?
                .ok_or_else(forbidden)?;

            if task.archived_at.is_some() && !access.is_moderator {
                return Err(coded("Task archived", "TASK_ARCHIVED"));
            }
        }

        if let Some(block) = models::task_block::Entity::find_by_id((blocked_by, task_id))
            .one(db)
            .await
            .map_err(db_err)?
        {
            block.delete(db).await.map_err(db_err)?;
        }

        Ok(Task::from(task))
    }
}

// TODO: user probably should not be able to edit time entries older than idk a month?
// TODO: user probably should not be able to edit time entries for tasks that they don't have access to anymore.
