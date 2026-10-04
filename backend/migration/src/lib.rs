#![allow(clippy::too_many_lines)]

pub use sea_orm_migration::prelude::*;

mod m20260908_181849_create_board_and_task;
mod m20260910_170655_create_user_and_email;
mod m20260912_195059_add_user_is_admin;
mod m20260912_204825_board_access;
mod m20260913_210311_add_user_passkey_and_invite;
mod m20260919_202710_add_user_handle;
mod m20260927_174125_add_task_status_and_assignee;
mod m20261002_181528_add_board_task_status;
mod m20261004_100937_add_task_is_archived;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260908_181849_create_board_and_task::Migration),
            Box::new(m20260910_170655_create_user_and_email::Migration),
            Box::new(m20260912_195059_add_user_is_admin::Migration),
            Box::new(m20260912_204825_board_access::Migration),
            Box::new(m20260913_210311_add_user_passkey_and_invite::Migration),
            Box::new(m20260919_202710_add_user_handle::Migration),
            Box::new(m20260927_174125_add_task_status_and_assignee::Migration),
            Box::new(m20261002_181528_add_board_task_status::Migration),
            Box::new(m20261004_100937_add_task_is_archived::Migration),
        ]
    }
}
