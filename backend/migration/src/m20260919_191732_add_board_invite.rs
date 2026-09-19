use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20260919_191732_add_board_invite"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(BoardInvite::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(BoardInvite::BoardId).integer().not_null())
                    .col(ColumnDef::new(BoardInvite::UserId).uuid().not_null())
                    .primary_key(
                        Index::create()
                            .col(BoardInvite::BoardId)
                            .col(BoardInvite::UserId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-board-invite-board")
                            .from(BoardInvite::Table, BoardInvite::BoardId)
                            .to(Board::Table, Board::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-board-invite-user")
                            .from(BoardInvite::Table, BoardInvite::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(BoardInvite::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Board {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum BoardInvite {
    Table,
    BoardId,
    UserId,
}
