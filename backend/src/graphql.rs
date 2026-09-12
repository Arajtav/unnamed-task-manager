use async_graphql::EmptySubscription;
use async_graphql::Schema;

mod mutation;
mod query;

pub use mutation::MutationRoot;
pub use query::QueryRoot;

pub type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

// The user has to be an admin or at least one property has to match to pass.
#[macro_export]
macro_rules! auth_perms {
    ($ctx:expr $(, $property:ident, $variable:expr)*) => {{
        let auth_user = $ctx.data::<AuthUser>()?;

        if !auth_user.0.is_admin
            $(&& auth_user.0.$property != $variable)*
        {
            return Err(Error::new("FORBIDDEN"));
        }
    }};
}
