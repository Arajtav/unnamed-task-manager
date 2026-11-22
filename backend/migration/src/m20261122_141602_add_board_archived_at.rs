use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20261122_141602_add_board_archived_at"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Board::Table)
                    .add_column(
                        ColumnDef::new(Board::ArchivedAt).date_time().null().check(
                            Expr::col(Board::ArchivedAt)
                                .is_null()
                                .or(Expr::col(Board::ArchivedAt).gte(Expr::col(Board::CreatedAt))),
                        ),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Board::Table)
                    .drop_column(Board::ArchivedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Board {
    Table,
    CreatedAt,
    ArchivedAt,
}
