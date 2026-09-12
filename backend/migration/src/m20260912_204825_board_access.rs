use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20260912_204825_board_access"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(BoardAccess::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(BoardAccess::BoardId).integer().not_null())
                    .col(ColumnDef::new(BoardAccess::UserId).uuid().not_null())
                    .col(
                        ColumnDef::new(BoardAccess::IsModerator)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .primary_key(
                        Index::create()
                            .col(BoardAccess::BoardId)
                            .col(BoardAccess::UserId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-board-access-user")
                            .from(BoardAccess::Table, BoardAccess::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-board-access-board")
                            .from(BoardAccess::Table, BoardAccess::BoardId)
                            .to(Board::Table, Board::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::insert()
                    .into_table(BoardAccess::Table)
                    .columns([
                        BoardAccess::BoardId,
                        BoardAccess::UserId,
                        BoardAccess::IsModerator,
                    ])
                    .select_from(
                        Query::select()
                            .column((Board::Table, Board::Id))
                            .column((User::Table, User::Id))
                            .expr(Expr::val(true))
                            .from(Board::Table)
                            .cross_join(User::Table)
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(BoardAccess::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum BoardAccess {
    Table,
    BoardId,
    UserId,
    IsModerator,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Board {
    Table,
    Id,
}
