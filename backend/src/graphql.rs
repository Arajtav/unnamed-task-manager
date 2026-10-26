#![allow(clippy::too_many_arguments)]
#![allow(clippy::unused_async_trait_impl)]
#![allow(clippy::unused_async)]
#![allow(clippy::too_many_lines)]

use actix_web::web::ThinData;
use async_graphql::Context;
use async_graphql::EmptySubscription;
use async_graphql::Error;
use async_graphql::ErrorExtensions;
use async_graphql::Schema;

mod models;
mod mutation;
mod query;

pub use mutation::MutationRoot;
pub use query::QueryRoot;
use sea_orm::DatabaseConnection;

use crate::AuthUser;

pub type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

pub fn get_user<'a>(ctx: &'a Context<'_>) -> &'a crate::models::user::Model {
    &ctx.data_unchecked::<AuthUser>().0
}

pub fn get_db<'a>(ctx: &'a Context<'_>) -> &'a DatabaseConnection {
    &ctx.data_unchecked::<ThinData<DatabaseConnection>>().0
}

pub fn vec_map<T, U: From<T>>(a: Vec<T>) -> Vec<U> {
    a.into_iter().map(U::from).collect()
}

pub fn forbidden() -> Error {
    Error::new("Not authorized").extend_with(|_, c| c.set("CODE", "FORBIDDEN"))
}

#[allow(clippy::needless_pass_by_value)]
pub fn db_err(err: sea_orm::DbErr) -> async_graphql::Error {
    tracing::error!("{err}");
    Error::new("Database error").extend_with(|_, c| c.set("code", "DATABASE"))
}
