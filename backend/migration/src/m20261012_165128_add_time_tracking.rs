use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20261012_165128_add_time_tracking"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(TimeTracking::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TimeTracking::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(TimeTracking::Description)
                            .text()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(TimeTracking::StartedAt)
                            .date_time()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TimeTracking::FinishedAt)
                            .date_time()
                            .not_null(),
                    )
                    .col(ColumnDef::new(TimeTracking::UserId).uuid().null())
                    .col(ColumnDef::new(TimeTracking::TaskId).integer().null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-time-tracking-user")
                            .from(TimeTracking::Table, TimeTracking::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-time-tracking-task")
                            .from(TimeTracking::Table, TimeTracking::TaskId)
                            .to(Task::Table, Task::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-time-tracking-user-id")
                    .table(TimeTracking::Table)
                    .col(TimeTracking::UserId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-time-tracking-task-id")
                    .table(TimeTracking::Table)
                    .col(TimeTracking::TaskId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-time-tracking-started-at")
                    .table(TimeTracking::Table)
                    .col(TimeTracking::StartedAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-time-tracking-finished-at")
                    .table(TimeTracking::Table)
                    .col(TimeTracking::FinishedAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TimeTracking::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Task {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum TimeTracking {
    Table,
    Id,
    UserId,
    TaskId,
    StartedAt,
    FinishedAt,
    Description,
}
