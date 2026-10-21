use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20261021_125355_replace_is_archived_with_archived_at"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Task::Table)
                    .add_column(
                        ColumnDef::new(Task::ArchivedAt).date_time().null().check(
                            Expr::col(Task::ArchivedAt)
                                .is_null()
                                .or(Expr::col(Task::ArchivedAt).gte(Expr::col(Task::CreatedAt))),
                        ),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::update()
                    .table(Task::Table)
                    .value(Task::ArchivedAt, Expr::current_timestamp())
                    .and_where(Expr::col(Task::IsArchived).eq(true))
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Task::Table)
                    .drop_column(Task::IsArchived)
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
                    .add_column(
                        ColumnDef::new(Task::IsArchived)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::update()
                    .table(Task::Table)
                    .value(Task::IsArchived, true)
                    .and_where(Expr::col(Task::ArchivedAt).is_not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Task::Table)
                    .drop_column(Task::ArchivedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Task {
    Table,
    CreatedAt,
    IsArchived,
    ArchivedAt,
}
