use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "board")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    #[sea_orm(unique)]
    pub name: String,

    pub created_at: DateTime<Utc>,

    #[sea_orm(has_many)]
    pub tasks: HasMany<super::task::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
