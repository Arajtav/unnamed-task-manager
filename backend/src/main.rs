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
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
