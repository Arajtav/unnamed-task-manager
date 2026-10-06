use chrono::{DateTime, Utc};
use sea_orm::{ActiveValue::Set, entity::prelude::*};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "user")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,

    pub created_at: DateTime<Utc>,

    pub handle: Option<String>,

    #[sea_orm(has_many)]
    pub emails: HasMany<super::email::Entity>,

    pub is_admin: bool,

    pub is_disabled: bool,
}

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {
    async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
    where
        C: ConnectionTrait,
    {
        if insert && self.id.is_not_set() {
            self.id = Set(Uuid::new_v4());
        }

        Ok(self)
    }
}
