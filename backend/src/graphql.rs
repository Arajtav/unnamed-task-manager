use async_graphql::EmptySubscription;
use async_graphql::Schema;

mod mutation;
mod query;

pub use mutation::MutationRoot;
pub use query::QueryRoot;

pub type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;
