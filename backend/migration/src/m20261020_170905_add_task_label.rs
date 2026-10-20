use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20261020_170905_add_task_label"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(TaskLabel::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(TaskLabel::TaskId).integer().not_null())
                    .col(
                        ColumnDef::new(TaskLabel::Name)
                            .string_len(64)
                            .not_null()
                            .check(
                                Func::cust("length")
                                    .arg(Expr::col(TaskLabel::Name))
                                    .between(1, 64),
                            )
                            .extra("COLLATE NOCASE"),
                    )
                    .primary_key(
                        Index::create()
                            .col(TaskLabel::TaskId)
                            .col(TaskLabel::Name),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-task-label-task")
                            .from(TaskLabel::Table, TaskLabel::TaskId)
                            .to(Task::Table, Task::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-label-name")
                    .table(TaskLabel::Table)
                    .col(TaskLabel::Name)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TaskLabel::Table).to_owned())
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
enum TaskLabel {
    Table,
    TaskId,
    Name,
}
