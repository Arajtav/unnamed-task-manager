use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "time_tracking")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = true)]
    pub id: i32,

    pub task_id: Option<i32>,

    #[sea_orm(belongs_to, from = "task_id", to = "id")]
    pub task: BelongsTo<Option<super::task::Entity>>,

    pub user_id: Option<Uuid>,

    #[sea_orm(belongs_to, from = "user_id", to = "id")]
    pub user: BelongsTo<Option<super::user::Entity>>,

    pub started_at: DateTime<Utc>,

    pub finished_at: DateTime<Utc>,

    pub description: String,
}

impl ActiveModelBehavior for ActiveModel {}
