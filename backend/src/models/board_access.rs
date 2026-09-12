use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "board_access")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub board_id: i32,

    #[sea_orm(belongs_to, from = "board_id", to = "id")]
    pub board: BelongsTo<super::board::Entity>,

    #[sea_orm(primary_key, auto_increment = false)]
    pub user_id: Uuid,

    #[sea_orm(belongs_to, from = "user_id", to = "id")]
    pub user: BelongsTo<super::user::Entity>,

    pub is_moderator: bool,
}

impl ActiveModelBehavior for ActiveModel {}
