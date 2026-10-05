// For graphql args.
#![allow(clippy::too_many_arguments)]

use actix_web::web::ThinData;
use async_graphql::Context;
use async_graphql::EmptySubscription;
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
