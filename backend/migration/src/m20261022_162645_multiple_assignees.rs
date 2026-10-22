// Another dirty migration as it goes from one assignee to multiple and obviously it won't fit back in one field.
// Oldest assignees are preserved.

use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20261022_162645_multiple_assignees"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(TaskAssignee::Table)
                    .col(ColumnDef::new(TaskAssignee::TaskId).integer().not_null())
                    .col(ColumnDef::new(TaskAssignee::Email).string().not_null())
                    .col(
                        ColumnDef::new(TaskAssignee::AssignedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .primary_key(
                        Index::create()
                            .col(TaskAssignee::TaskId)
                            .col(TaskAssignee::Email),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(TaskAssignee::Table, TaskAssignee::TaskId)
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
                    .name("idx-task-assignee-email")
                    .table(TaskAssignee::Table)
                    .col(TaskAssignee::Email)
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::insert()
                    .into_table(TaskAssignee::Table)
                    .columns([
                        TaskAssignee::TaskId,
                        TaskAssignee::Email,
                        TaskAssignee::AssignedAt,
                    ])
                    .select_from(
                        Query::select()
                            .columns([Task::Id, Task::Assignee, Task::CreatedAt])
                            .from(Task::Table)
                            .and_where(Expr::col(Task::Assignee).is_not_null())
                            .and_where(Expr::col(Task::Assignee).ne(""))
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Task::Table)
                    .drop_column(Task::Assignee)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Task::Table)
                    .add_column(ColumnDef::new(Task::Assignee).text().null())
                    .to_owned(),
            )
            .await?;

        let first_assignee = Query::select()
            .column(TaskAssignee::Email)
            .from(TaskAssignee::Table)
            .and_where(
                Expr::col((TaskAssignee::Table, TaskAssignee::TaskId))
                    .equals((Task::Table, Task::Id)),
            )
            .order_by(TaskAssignee::AssignedAt, Order::Asc)
            .limit(1)
            .to_owned();

        manager
            .execute(
                Query::update()
                    .table(Task::Table)
                    .value(
                        Task::Assignee,
                        SimpleExpr::SubQuery(
                            None,
                            Box::new(SubQueryStatement::SelectStatement(first_assignee)),
                        ),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(TaskAssignee::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Task {
    Table,
    Id,
    CreatedAt,
    Assignee,
}

#[derive(DeriveIden)]
enum TaskAssignee {
    Table,
    TaskId,
    Email,
    AssignedAt,
}
