use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20261007_183803_move_invite_to_user"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .add_column(ColumnDef::new(User::InviteCode).string().null())
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::update()
                    .table(User::Table)
                    .value(
                        User::InviteCode,
                        Query::select()
                            .expr(Expr::col(Invite::Code))
                            .from(Invite::Table)
                            .and_where(
                                Expr::col((Invite::Table, Invite::UserId))
                                    .equals((User::Table, User::Id)),
                            )
                            .to_owned(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Invite::Table).to_owned())
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("uq-user-invite-code")
                    .table(User::Table)
                    .col(User::InviteCode)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Invite::Table)
                    .col(
                        ColumnDef::new(Invite::Code)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Invite::UserId)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Invite::Table, Invite::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .exec_stmt(
                Query::insert()
                    .into_table(Invite::Table)
                    .columns([Invite::Code, Invite::UserId])
                    .select_from(
                        Query::select()
                            .columns([(User::Table, User::InviteCode), (User::Table, User::Id)])
                            .from(User::Table)
                            .and_where(Expr::col((User::Table, User::InviteCode)).is_not_null())
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("uq-user-invite-code")
                    .table(User::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .drop_column(User::InviteCode)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
    InviteCode,
}

#[derive(DeriveIden)]
enum Invite {
    Table,
    Code,
    UserId,
}
