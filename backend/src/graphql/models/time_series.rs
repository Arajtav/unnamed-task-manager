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
    pub value: i64,
}
