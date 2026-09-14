use sea_orm::{ActiveValue::Set, entity::prelude::*};

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

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {
    async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
    where
        C: ConnectionTrait,
    {
        if insert && self.code.is_not_set() {
            self.code = Set(new_invite());
        }

        Ok(self)
    }
}

fn new_invite() -> String {
    (0..3)
        .map(|_| random_string::generate(4, random_string::charsets::ALPHA_UPPER))
        .collect::<Vec<_>>()
        .join("-")
}
