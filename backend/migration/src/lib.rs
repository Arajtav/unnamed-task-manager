pub use sea_orm_migration::prelude::*;

mod m20260908_181849_create_board_and_task;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260908_181849_create_board_and_task::Migration),
        ]
    }
}
