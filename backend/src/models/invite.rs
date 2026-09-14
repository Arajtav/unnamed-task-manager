use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "invite")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub code: String,

    pub user_id: Uuid,

    #[sea_orm(belongs_to, from = "user_id", to = "id")]
    pub inviter: BelongsTo<super::user::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
