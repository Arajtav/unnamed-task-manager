#![allow(clippy::too_many_arguments)]
#![allow(clippy::unused_async_trait_impl)]
#![allow(clippy::unused_async)]
#![allow(clippy::too_many_lines)]

use actix_web::web::ThinData;
use async_graphql::{Context, EmptySubscription, Error, ErrorExtensions, Schema};

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

fn coded(msg: &str, code: &str) -> Error {
    Error::new(msg).extend_with(|_, c| c.set("code", code))
}

fn coded_with<T: Into<async_graphql::Value>>(msg: &str, code: &str, extra: (&str, T)) -> Error {
    Error::new(msg).extend_with(|_, c| {
        c.set("code", code);
        c.set(extra.0, extra.1);
    })
}

pub fn forbidden() -> Error {
    tracing::warn!(kind = "FORBIDDEN", "forbidden");
    coded("Not authorized", "FORBIDDEN")
}

#[allow(clippy::needless_pass_by_value)]
pub fn db_err(err: sea_orm::DbErr) -> Error {
    tracing::error!(error = %err, kind = "DATABASE", "database error");
    coded("Database error", "DATABASE")
}
