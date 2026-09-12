pub use sea_orm_migration::prelude::*;

mod m20260908_181849_create_board_and_task;
mod m20260910_170655_create_user_and_email;
mod m20260912_195059_add_user_is_admin;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260908_181849_create_board_and_task::Migration),
            Box::new(m20260910_170655_create_user_and_email::Migration),
            Box::new(m20260912_195059_add_user_is_admin::Migration),
        ]
    }
}
