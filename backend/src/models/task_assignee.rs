use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "task_assignee")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub task_id: i32,

    #[sea_orm(belongs_to, from = "task_id", to = "id")]
    pub task: BelongsTo<super::task::Entity>,

    #[sea_orm(primary_key, auto_increment = false)]
    pub email: String,
}

impl ActiveModelBehavior for ActiveModel {}
