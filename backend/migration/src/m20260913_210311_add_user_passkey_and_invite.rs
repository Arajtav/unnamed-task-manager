use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20260913_210311_add_user_passkey"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Passkey::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Passkey::Id).blob().not_null().primary_key())
                    .col(ColumnDef::new(Passkey::Passkey).json().not_null())
                    .col(ColumnDef::new(Passkey::UserId).uuid().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-passkey-user")
                            .from(Passkey::Table, Passkey::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Invite::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Invite::Code)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Invite::UserId)
                            .uuid()
                            .not_null()
                            .unique_key(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-passkey-user")
                            .from(Invite::Table, Invite::UserId)
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
            .drop_table(Table::drop().table(Passkey::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Invite::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
#[allow(clippy::enum_variant_names)]
enum Passkey {
    Table,
    Id,
    UserId,
    Passkey,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Invite {
    Table,
    Code,
    UserId,
}
