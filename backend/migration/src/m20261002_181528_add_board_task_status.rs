// This is not a clean migration, not because of the rebuilding of `task` but because it removes
// NULL from status. This means going up and down will replace all null statuses with "unassigned".

use sea_orm_migration::{prelude::*, sea_query::extension::sqlite::SqliteExpr};

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &'static str {
        "m20261002_181528_add_board_task_status"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(BoardTaskStatus::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(BoardTaskStatus::BoardId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BoardTaskStatus::Priority)
                            .double()
                            .not_null(),
                    )
                    .col(ColumnDef::new(BoardTaskStatus::Name).string().not_null())
                    .col(
                        ColumnDef::new(BoardTaskStatus::Color)
                            .string()
                            .not_null()
                            .check(Expr::col(BoardTaskStatus::Color).glob(
                            "#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]",
                        )),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-board-task-status-board")
                            .from(BoardTaskStatus::Table, BoardTaskStatus::BoardId)
                            .to(Board::Table, Board::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("uq-board-task-status-board-name")
                            .col(BoardTaskStatus::BoardId)
                            .col(BoardTaskStatus::Name)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::update()
                    .table(Task::Table)
                    .value(Task::Status, Expr::val("unassigned"))
                    .and_where(Expr::col(Task::Status).is_null())
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::insert()
                    .into_table(BoardTaskStatus::Table)
                    .columns([
                        BoardTaskStatus::BoardId,
                        BoardTaskStatus::Name,
                        BoardTaskStatus::Color,
                        BoardTaskStatus::Priority,
                    ])
                    .select_from(
                        Query::select()
                            .column(Task::BoardId)
                            .column(Task::Status)
                            .expr_as(Expr::val("#000000"), BoardTaskStatus::Color)
                            .expr_as(Expr::val(0.0), BoardTaskStatus::Priority)
                            .from(Task::Table)
                            .and_where(Expr::col(Task::Status).is_not_null())
                            .distinct()
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(TaskNew::Table)
                    .col(
                        ColumnDef::new(TaskNew::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TaskNew::Title).string().not_null())
                    .col(
                        ColumnDef::new(TaskNew::Description)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(TaskNew::CreatedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(TaskNew::Author).string().not_null())
                    .col(ColumnDef::new(TaskNew::BoardId).integer().not_null())
                    .col(ColumnDef::new(TaskNew::Status).text().not_null())
                    .col(ColumnDef::new(TaskNew::Assignee).text())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-task-board")
                            .from(TaskNew::Table, TaskNew::BoardId)
                            .to(Board::Table, Board::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-task-board-status")
                            .from_tbl(TaskNew::Table)
                            .from_col(TaskNew::BoardId)
                            .from_col(TaskNew::Status)
                            .to_tbl(BoardTaskStatus::Table)
                            .to_col(BoardTaskStatus::BoardId)
                            .to_col(BoardTaskStatus::Name)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("uq-task-title-board-new")
                            .col(TaskNew::Title)
                            .col(TaskNew::BoardId)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::insert()
                    .into_table(TaskNew::Table)
                    .columns([
                        TaskNew::Id,
                        TaskNew::Title,
                        TaskNew::Description,
                        TaskNew::CreatedAt,
                        TaskNew::Author,
                        TaskNew::BoardId,
                        TaskNew::Status,
                        TaskNew::Assignee,
                    ])
                    .select_from(
                        Query::select()
                            .columns([
                                Task::Id,
                                Task::Title,
                                Task::Description,
                                Task::CreatedAt,
                                Task::Author,
                                Task::BoardId,
                                Task::Status,
                                Task::Assignee,
                            ])
                            .from(Task::Table)
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Task::Table).to_owned())
            .await?;

        manager
            .rename_table(
                Table::rename()
                    .table(TaskNew::Table, Task::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(TaskOld::Table)
                    .col(
                        ColumnDef::new(TaskOld::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TaskOld::Title).string().not_null())
                    .col(
                        ColumnDef::new(TaskOld::Description)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(TaskOld::CreatedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(TaskOld::Author).string().not_null())
                    .col(ColumnDef::new(TaskOld::BoardId).integer().not_null())
                    .col(ColumnDef::new(TaskOld::Status).text())
                    .col(ColumnDef::new(TaskOld::Assignee).text())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-task-board")
                            .from(TaskOld::Table, TaskOld::BoardId)
                            .to(Board::Table, Board::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("uq-task-title-board-old")
                            .col(TaskOld::Title)
                            .col(TaskOld::BoardId)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .execute(
                Query::insert()
                    .into_table(TaskOld::Table)
                    .columns([
                        TaskOld::Id,
                        TaskOld::Title,
                        TaskOld::Description,
                        TaskOld::CreatedAt,
                        TaskOld::Author,
                        TaskOld::BoardId,
                        TaskOld::Status,
                        TaskOld::Assignee,
                    ])
                    .select_from(
                        Query::select()
                            .columns([
                                Task::Id,
                                Task::Title,
                                Task::Description,
                                Task::CreatedAt,
                                Task::Author,
                                Task::BoardId,
                                Task::Status,
                                Task::Assignee,
                            ])
                            .from(Task::Table)
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Task::Table).to_owned())
            .await?;

        manager
            .rename_table(
                Table::rename()
                    .table(TaskOld::Table, Task::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(BoardTaskStatus::Table).to_owned())
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
enum Task {
    Table,
    Id,
    Title,
    Description,
    CreatedAt,
    Author,
    BoardId,
    Status,
    Assignee,
}

#[derive(DeriveIden)]
enum TaskNew {
    Table,
    Id,
    Title,
    Description,
    CreatedAt,
    Author,
    BoardId,
    Status,
    Assignee,
}

#[derive(DeriveIden)]
enum TaskOld {
    Table,
    Id,
    Title,
    Description,
    CreatedAt,
    Author,
    BoardId,
    Status,
    Assignee,
}

#[derive(DeriveIden)]
enum BoardTaskStatus {
    Table,
    BoardId,
    Name,
    Color,
    Priority,
}
