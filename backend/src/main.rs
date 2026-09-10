use std::process::exit;

use actix_web::{
    App, HttpServer,
    middleware::{Logger, NormalizePath},
    web::{ThinData, delete, get, patch, post, scope},
};
use sea_orm::Database;
use tracing::error;

mod models;
mod routes;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt().init();

    let db = Database::connect("sqlite://./db.sqlite?mode=rwc")
        .await
        .unwrap_or_else(|_| {
            error!("Failed to connect to the database");
            exit(1)
        });

    let db = ThinData(db);

    HttpServer::new(move || {
        App::new()
            .app_data(db.clone())
            .wrap(Logger::default())
            .wrap(NormalizePath::new(
                actix_web::middleware::TrailingSlash::Trim,
            ))
            .service(
                scope("/boards")
                    .route("", post().to(routes::boards::create_board))
                    .route("{id}", get().to(routes::boards::get_board))
                    .route("", get().to(routes::boards::get_boards))
                    .route("{id}", patch().to(routes::boards::update_board))
                    .route("{id}", delete().to(routes::boards::delete_board)),
            )
            .service(
                scope("/tasks")
                    .route("", post().to(routes::tasks::create_task))
                    .route("", get().to(routes::tasks::get_tasks))
                    .route("/{id}", get().to(routes::tasks::get_task))
                    .route("/{id}", patch().to(routes::tasks::update_task))
                    .route("/{id}", delete().to(routes::tasks::delete_task)),
            )
            .service(
                scope("/users")
                    .route("", post().to(routes::users::create_user))
                    .route("", get().to(routes::users::get_users))
                    .route("/{id}", get().to(routes::users::get_user))
                    .route("/{id}", delete().to(routes::users::delete_user))
                    .service(
                        scope("/{id}/emails")
                            .route("", post().to(routes::user_emails::create_email))
                            .route("", get().to(routes::user_emails::get_emails))
                            .route("/{email}", delete().to(routes::user_emails::delete_email)),
                    ),
            )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
