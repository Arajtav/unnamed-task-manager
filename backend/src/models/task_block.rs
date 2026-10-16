use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "task_block")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub blocking: i32,

    #[sea_orm(
        belongs_to,
        from = "blocking",
        to = "id",
        relation_enum = "BlockingTask"
    )]
    pub blocking_task: BelongsTo<super::task::Entity>,

    #[sea_orm(primary_key, auto_increment = false)]
    pub blocked: i32,

    #[sea_orm(belongs_to, from = "blocked", to = "id", relation_enum = "BlockedTask")]
    pub blocked_task: BelongsTo<super::task::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
