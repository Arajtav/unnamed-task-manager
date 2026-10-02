use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "board_task_status")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub board_id: i32,

    #[sea_orm(primary_key, auto_increment = false)]
    pub name: String,

    pub color: String,

    pub priority: f32,

    #[sea_orm(belongs_to, from = "board_id", to = "id")]
    pub board: BelongsTo<super::board::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
