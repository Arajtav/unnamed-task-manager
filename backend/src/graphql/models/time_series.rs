use async_graphql::{Enum, SimpleObject};
use chrono::{DateTime, Utc};

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
pub enum TimeResolution {
    Day,
    Week,
    Month,
}

#[derive(SimpleObject)]
pub struct TimeSeries {
    pub resolution: TimeResolution,
    pub values: Vec<TimeEntry>,
}

#[derive(SimpleObject)]
pub struct TimeEntry {
    pub start: DateTime<Utc>,
    pub values: Vec<TimeEntryValue>,
}

#[derive(SimpleObject)]
pub struct TimeEntryValue {
    // Board is not returned here for 2 reasons, the first is that it is private and it would have
    // to be null removing the distinction on the frontend, and the second is that it would be a ton
    // of redundant data given that the frontend already fetches all boards user has access to.
    pub board_id: Option<i32>,
    pub value: i64,
}
