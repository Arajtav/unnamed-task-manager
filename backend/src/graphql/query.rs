use async_graphql::{Context, Error, Object, Result};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect, QueryTrait};
use uuid::Uuid;

use crate::{
    graphql::{
        get_db, get_user,
        models::{Board, Task, User},
        vec_map,
    },
    models,
};

#[derive(Default)]
pub struct QueryRoot;

#[Object]
#[allow(clippy::unused_async)]
#[allow(clippy::unused_async_trait_impl)]
impl QueryRoot {
    async fn me(&self, ctx: &Context<'_>) -> User {
        let user = get_user(ctx);

        User::from(user.clone())
    }

    async fn users(&self, ctx: &Context<'_>) -> Result<Vec<User>> {
        let db = get_db(ctx);
        let users = models::user::Entity::find().all(db).await?;

        Ok(vec_map(users))
    }

    async fn user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<User>> {
        let db = get_db(ctx);
        let user = models::user::Entity::find_by_id(id).one(db).await?;

        Ok(user.map(User::from))
    }

    async fn board(&self, ctx: &Context<'_>, id: i32) -> Result<Option<Board>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            let has_board_access = models::board_access::Entity::find_by_id((id, user.id))
                .one(db)
                .await?
                .is_some();

            if !has_board_access {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        let board = models::board::Entity::find_by_id(id).one(db).await?;

        Ok(board.map(Board::from))
    }

    async fn boards(&self, ctx: &Context<'_>, name: Option<String>) -> Result<Vec<Board>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let mut query = models::board::Entity::find();

        if !user.is_admin {
            query = query.filter(
                models::board::Column::Id.in_subquery(
                    models::board_access::Entity::find()
                        .select_only()
                        .column(models::board_access::Column::BoardId)
                        .filter(models::board_access::Column::UserId.eq(user.id))
                        .into_query(),
                ),
            );
        }

        if let Some(name) = name {
            query = query.filter(models::board::Column::Name.contains(name));
        }

        let boards = query.all(db).await?;

        Ok(vec_map(boards))
    }

    async fn task(&self, ctx: &Context<'_>, id: i32) -> Result<Option<Task>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let Some(task) = models::task::Entity::find_by_id(id).one(db).await? else {
            return Ok(None);
        };

        if !user.is_admin {
            let has_board_access =
                models::board_access::Entity::find_by_id((task.board_id, user.id))
                    .one(db)
                    .await?
                    .is_some();

            if !has_board_access {
                return Err(Error::new("FORBIDDEN"));
            }
        }

        Ok(Some(Task::from(task)))
    }
}
