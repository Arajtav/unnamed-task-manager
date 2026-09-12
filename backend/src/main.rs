use std::process::exit;

use actix_cors::Cors;
use actix_session::{SessionExt, SessionMiddleware, storage::CookieSessionStore};
use actix_web::{
    App, HttpMessage, HttpServer, Result,
    body::BoxBody,
    cookie::Key,
    dev::{ServiceRequest, ServiceResponse},
    middleware::{self, Logger, Next, NormalizePath},
    web::{ThinData, delete, get, patch, post, resource, scope},
};
use sea_orm::{Database, DatabaseConnection, EntityTrait};
use tracing::{debug, error};
use uuid::Uuid;

mod models;
mod routes;

pub type SessionUser = models::user::Model;

async fn require_auth(
    req: ServiceRequest,
    next: Next<BoxBody>,
) -> Result<ServiceResponse<BoxBody>> {
    let session = req.get_session();

    let Ok(Some(user_id)) = session.get::<Uuid>("user_id") else {
        return Err(actix_web::error::ErrorUnauthorized(""));
    };

    let db = req.app_data::<ThinData<DatabaseConnection>>().unwrap();

    let user: Option<SessionUser> = models::user::Entity::find_by_id(user_id)
        .one(&**db)
        .await
        .map_err(|err| {
            error!("Failed to get user in auth!!!: {err}");
            actix_web::error::ErrorInternalServerError("")
        })?;

    if let Some(user) = user {
        debug!("{user:?}");
        req.extensions_mut().insert(user);
    } else {
        session.purge();
        return Err(actix_web::error::ErrorUnauthorized(""));
    }

    next.call(req).await
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    if cfg!(debug_assertions) {
        tracing_subscriber::fmt()
            .with_max_level(tracing::Level::DEBUG)
            .init();
    } else {
        tracing_subscriber::fmt().init();
    }

    let db = Database::connect("sqlite://./db.sqlite?mode=rwc")
        .await
        .unwrap_or_else(|_| {
            error!("Failed to connect to the database");
            exit(1)
        });

    let db = ThinData(db);

    let session_key = Key::generate();

    HttpServer::new(move || {
        App::new()
            .app_data(db.clone())
            .wrap(Cors::permissive())
            .wrap(Logger::default())
            .wrap(NormalizePath::new(
                actix_web::middleware::TrailingSlash::Trim,
            ))
            .wrap(
                SessionMiddleware::builder(CookieSessionStore::default(), session_key.clone())
                    .build(),
            )
            .service(
                scope("/auth")
                    .route("/login", post().to(routes::auth::login))
                    .route("/logout", post().to(routes::auth::logout))
                    .service(
                        resource("/me")
                            .wrap(middleware::from_fn(require_auth))
                            .route(get().to(routes::auth::me)),
                    ),
            )
            .service(
                scope("")
                    .wrap(middleware::from_fn(require_auth))
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
                                    .route(
                                        "/{email}",
                                        delete().to(routes::user_emails::delete_email),
                                    ),
                            ),
                    ),
            )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
