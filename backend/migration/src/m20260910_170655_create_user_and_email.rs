use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20260910_170655_create_user_and_email"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(User::Id).uuid().not_null().primary_key())
                    .col(
                        ColumnDef::new(User::CreatedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Email::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Email::Email)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Email::UserId).uuid().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-email-user")
                            .from(Email::Table, Email::UserId)
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
            .drop_table(Table::drop().table(Email::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
    CreatedAt,
}

#[derive(DeriveIden)]
#[allow(clippy::enum_variant_names)]
enum Email {
    Table,
    Email,
    UserId,
}
