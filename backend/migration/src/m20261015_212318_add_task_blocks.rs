use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20261015_212318_add_task_blocks"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(TaskBlock::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(TaskBlock::Blocking).integer().not_null())
                    .col(ColumnDef::new(TaskBlock::Blocked).integer().not_null())
                    .primary_key(
                        Index::create()
                            .col(TaskBlock::Blocking)
                            .col(TaskBlock::Blocked),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-task-block-blocking")
                            .from(TaskBlock::Table, TaskBlock::Blocking)
                            .to(Task::Table, Task::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-task-block-blocked")
                            .from(TaskBlock::Table, TaskBlock::Blocked)
                            .to(Task::Table, Task::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TaskBlock::Table).to_owned())
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
enum TaskBlock {
    Table,
    Blocking,
    Blocked,
}
