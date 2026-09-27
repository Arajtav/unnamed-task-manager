use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "task")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    pub title: String,

    pub description: String,

    pub created_at: DateTime<Utc>,
    pub author: String,

    pub board_id: i32,

    #[sea_orm(belongs_to, from = "board_id", to = "id")]
    pub board: BelongsTo<super::board::Entity>,

    pub status: Option<String>,
    pub assignee: Option<String>,
}

impl ActiveModelBehavior for ActiveModel {}
