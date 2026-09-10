use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "email")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub email: String,

    pub user_id: Uuid,

    #[sea_orm(belongs_to, from = "user_id", to = "id")]
    pub user: BelongsTo<super::user::Entity>,
}

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {
    async fn before_save<C>(self, _db: &C, _insert: bool) -> Result<Self, DbErr>
    where
        C: ConnectionTrait,
    {
        if self
            .email
            .is_set_and(|e| email_validator_rfc5322::validate_email(e).is_err())
        {
            return Err(DbErr::Custom("invalid RFC 5322 email address".to_owned()));
        }

        Ok(self)
    }
}
