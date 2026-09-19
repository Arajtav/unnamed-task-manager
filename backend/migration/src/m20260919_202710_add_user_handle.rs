use sea_orm_migration::{prelude::*, sea_query::extension::sqlite::SqliteExpr};

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20260919_202710_add_user_handle"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .add_column(
                        ColumnDef::new(User::Handle).text().null().check(
                            Expr::col(User::Handle).is_null().or(Expr::col(User::Handle)
                                .glob("[a-z]*")
                                .and(Expr::col(User::Handle).glob("*[^a-z0-9-]*").not())
                                .and(
                                    Func::cust("length")
                                        .arg(Expr::col(User::Handle))
                                        .between(3, 19),
                                )),
                        ),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("uq-user-handle")
                    .table(User::Table)
                    .col(User::Handle)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("uq-user-handle")
                    .table(User::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .drop_column(User::Handle)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum User {
    Table,
    Handle,
}
