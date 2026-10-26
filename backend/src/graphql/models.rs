pub mod board;
pub mod board_access;
pub mod board_task_status;
pub mod email;
pub mod task;
pub mod task_user_time;
pub mod time_series;
pub mod time_tracking_entry;
pub mod user;

// TODO: https://async-graphql.github.io/async-graphql/en/context.html#selection--lookahead I guess it can remove N+1s.
// or this https://async-graphql.github.io/async-graphql/en/dataloader.html

// Not a todo but streaming is possible with graphql, although I think it is incompatible with
// our current auth system and would require some kind of a database proxy?

// TODO: proper guards https://async-graphql.github.io/async-graphql/en/field_guard.html
// https://async-graphql.github.io/async-graphql/en/input_value_validators.html

// This will be used stuff later https://async-graphql.github.io/async-graphql/en/cursor_connections.html

// TODO: https://async-graphql.github.io/async-graphql/en/depth_and_complexity.html since queries can be recursive now
