mod models;

#[tokio::main]
async fn main() {}

#[cfg(test)]
mod tests {
    use sea_orm::{ActiveModelTrait, ActiveValue::Set, Database, EntityTrait};

    use super::*;

    #[tokio::test]
    async fn test() {
        let db = Database::connect("sqlite://./db.test.sqlite?mode=rwc")
            .await
            .unwrap();

        // Cleanup
        models::task::Entity::delete_many().exec(&db).await.unwrap();
        models::board::Entity::delete_many()
            .exec(&db)
            .await
            .unwrap();

        let first_board = models::board::ActiveModel {
            name: Set(String::from("First Board")),
            ..Default::default()
        }
        .insert(&db)
        .await
        .expect("Failed to save the first board");

        let second_board = models::board::ActiveModel {
            name: Set(String::from("Second Board")),
            ..Default::default()
        }
        .insert(&db)
        .await
        .expect("Failed to save the second board");

        models::task::ActiveModel {
            title: Set(String::from("Some task")),
            author: Set(String::from("You")),
            board_id: Set(first_board.id),
            ..Default::default()
        }
        .insert(&db)
        .await
        .expect("Failed to save the first task");

        models::task::ActiveModel {
            title: Set(String::from("Some task")),
            author: Set(String::from("Me")),
            board_id: Set(second_board.id),
            ..Default::default()
        }
        .insert(&db)
        .await
        .expect("Failed to save the second task");

        models::task::ActiveModel {
            title: Set(String::from("Another Task")),
            author: Set(String::from("You")),
            board_id: Set(second_board.id),
            ..Default::default()
        }
        .insert(&db)
        .await
        .expect("Failed to save the third task");

        let boards_with_tasks = models::board::Entity::find()
            .find_with_related(models::task::Entity)
            .all(&db)
            .await
            .unwrap();

        for (board, tasks) in boards_with_tasks {
            println!("Board: {}", board.name);

            for task in tasks {
                println!("- : {} by {}", task.title, task.author);
            }

            println!();
        }
    }
}
