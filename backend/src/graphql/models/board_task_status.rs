use async_graphql::SimpleObject;

use crate::models;

// Access restricted to viewers who can access the source board.
#[derive(SimpleObject)]
pub struct BoardTaskStatus {
    name: String,
    color: String,
    priority: f32,
}

impl From<models::board_task_status::Model> for BoardTaskStatus {
    fn from(value: models::board_task_status::Model) -> Self {
        Self {
            name: value.name,
            color: value.color,
            priority: value.priority,
        }
    }
}
