use std::cmp::{max, min};

use async_graphql::{Context, Error, ErrorExtensions, Object, Result};
use chrono::{DateTime, Datelike, Duration, Months, NaiveDate, TimeZone, Utc, Weekday};
use chrono_tz::Tz;
use sea_orm::{ColumnTrait, Condition, EntityTrait, QueryFilter, QuerySelect, QueryTrait};
use uuid::Uuid;

use crate::{
    graphql::{
        db_err, forbidden, get_db, get_user,
        models::{
            board::Board,
            task::Task,
            time_series::{TimeEntry, TimeResolution, TimeSeries},
            time_tracking_entry::TimeTrackingEntry,
            user::User,
        },
        vec_map,
    },
    models,
};

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn me(&self, ctx: &Context<'_>) -> User {
        let user = get_user(ctx);

        User::from(user.clone())
    }

    async fn users(&self, ctx: &Context<'_>) -> Result<Vec<User>> {
        let db = get_db(ctx);
        let users = models::user::Entity::find().all(db).await.map_err(db_err)?;

        Ok(vec_map(users))
    }

    async fn boards(
        &self,
        ctx: &Context<'_>,
        #[graphql(default)] name: Option<String>,
    ) -> Result<Vec<Board>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let mut query = models::board::Entity::find();

        if !user.is_admin {
            query = query.filter(
                models::board::Column::Id.in_subquery(
                    models::board_access::Entity::find()
                        .select_only()
                        .column(models::board_access::Column::BoardId)
                        .filter(models::board_access::Column::UserId.eq(user.id))
                        .into_query(),
                ),
            );
        }

        if let Some(name) = name {
            query = query.filter(models::board::Column::Name.contains(name));
        }

        let boards = query.all(db).await.map_err(db_err)?;

        Ok(vec_map(boards))
    }

    async fn board(&self, ctx: &Context<'_>, id: i32) -> Result<Option<Board>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        if !user.is_admin {
            models::board_access::Entity::find_by_id((id, user.id))
                .one(db)
                .await
                .map_err(db_err)?
                .ok_or(forbidden())?;
        }

        let board = models::board::Entity::find_by_id(id)
            .one(db)
            .await
            .map_err(db_err)?;

        Ok(board.map(Board::from))
    }

    async fn task(&self, ctx: &Context<'_>, id: i32) -> Result<Option<Task>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let Some(task) = models::task::Entity::find_by_id(id)
            .one(db)
            .await
            .map_err(db_err)?
        else {
            return Ok(None);
        };

        if !user.is_admin {
            models::board_access::Entity::find_by_id((task.board_id, user.id))
                .one(db)
                .await
                .map_err(db_err)?
                .ok_or(forbidden())?;
        }

        Ok(Some(Task::from(task)))
    }

    async fn time_entries(
        &self,
        ctx: &Context<'_>,
        #[graphql(default)] since: Option<DateTime<Utc>>,
        #[graphql(default)] to: Option<DateTime<Utc>>,
        #[graphql(default)] user_id: Option<Uuid>,
        #[graphql(default)] task_id: Option<i32>,
    ) -> Result<Vec<TimeTrackingEntry>> {
        let db = get_db(ctx);
        let user = get_user(ctx);

        let mut query = models::time_tracking::Entity::find();

        if let Some(since) = since {
            query = query.filter(models::time_tracking::Column::FinishedAt.gte(since));
        }

        if let Some(to) = to {
            query = query.filter(models::time_tracking::Column::StartedAt.lte(to));
        }

        if !user.is_admin {
            let moderated_boards = models::board_access::Entity::find()
                .select_only()
                .column(models::board_access::Column::BoardId)
                .filter(models::board_access::Column::UserId.eq(user.id))
                .filter(models::board_access::Column::IsModerator.eq(true))
                .into_query();

            let moderated_tasks = models::task::Entity::find()
                .select_only()
                .column(models::task::Column::Id)
                .filter(models::task::Column::BoardId.in_subquery(moderated_boards))
                .into_query();

            query = query.filter(
                Condition::any()
                    .add(models::time_tracking::Column::UserId.eq(user.id))
                    .add(models::time_tracking::Column::TaskId.in_subquery(moderated_tasks)),
            );
        }

        if let Some(target_user_id) = user_id {
            query = query.filter(models::time_tracking::Column::UserId.eq(target_user_id));
        }

        if let Some(task_id) = task_id {
            query = query.filter(models::time_tracking::Column::TaskId.eq(task_id));
        }

        let entries = query.all(db).await.map_err(db_err)?;

        Ok(vec_map(entries))
    }

    async fn time_summary(
        &self,
        ctx: &Context<'_>,
        resolution: TimeResolution,
        from_date: DateTime<Utc>,
        to_date: DateTime<Utc>,
        timezone: Option<String>,
    ) -> Result<TimeSeries> {
        // I hate whoever invented time.
        fn local_midnight(tz: Tz, date: NaiveDate) -> DateTime<Utc> {
            let mut naive = date.and_hms_opt(0, 0, 0).unwrap();
            loop {
                if let Some(dt) = tz.from_local_datetime(&naive).earliest() {
                    return dt.with_timezone(&Utc);
                }
                naive += Duration::minutes(15);
            }
        }

        let db = get_db(ctx);
        let user = get_user(ctx);

        let tz = match timezone {
            None => Tz::UTC,
            Some(name) => name.parse().map_err(|_| {
                Error::new("Unknown timezone").extend_with(|_, c| c.set("CODE", "UNKNOWN_TZ"))
            })?,
        };

        let local_from = from_date.with_timezone(&tz).date_naive();
        let first_day = match resolution {
            TimeResolution::Day => local_from,
            TimeResolution::Week => local_from.week(Weekday::Mon).first_day(),
            TimeResolution::Month => local_from.with_day(1).unwrap(),
        };

        let from_date = local_midnight(tz, first_day);

        let entries = models::time_tracking::Entity::find()
            .filter(models::time_tracking::Column::UserId.eq(user.id))
            .filter(models::time_tracking::Column::StartedAt.lt(to_date))
            .filter(models::time_tracking::Column::FinishedAt.gt(from_date))
            .all(db)
            .await
            .map_err(db_err)?;

        let mut current = first_day;
        let mut values = Vec::new();

        loop {
            let start = local_midnight(tz, current);

            if start >= to_date {
                break;
            }

            values.push(TimeEntry { start, value: 0 });
            current = match resolution {
                TimeResolution::Day => current + Duration::days(1),
                TimeResolution::Week => current + Duration::weeks(1),
                TimeResolution::Month => current.checked_add_months(Months::new(1)).unwrap(),
            };
        }

        for entry in entries {
            let mut buckets = values.iter_mut().peekable();
            while let Some(bucket) = buckets.next() {
                let bucket_end = buckets.peek().map_or(to_date, |next| next.start);

                let overlap_start = max(entry.started_at, bucket.start);
                let overlap_end = min(entry.finished_at, bucket_end);

                if overlap_start < overlap_end {
                    bucket.value += overlap_end
                        .signed_duration_since(overlap_start)
                        .num_seconds();
                }
            }
        }

        Ok(TimeSeries { resolution, values })
    }
}
