use std::{env, process::exit};

use actix_cors::Cors;
use actix_session::{SessionExt, SessionMiddleware, storage::CookieSessionStore};
use actix_web::{
    App, HttpMessage, HttpResponse, HttpServer, Result,
    body::BoxBody,
    cookie::Key,
    dev::{ServiceRequest, ServiceResponse},
    middleware::{self, Logger, Next, NormalizePath},
    web::{Data, ThinData, post, scope},
};
use async_graphql::{EmptySubscription, Schema};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use base64::Engine;
use dotenv::dotenv;
use sea_orm::{Database, DatabaseConnection, EntityTrait};
use tracing::{debug, error, warn};
use uuid::Uuid;
use webauthn_rs::WebauthnBuilder;

use crate::graphql::AppSchema;

mod graphql;
mod models;
mod routes;

pub type SessionUser = models::user::Model;

#[derive(Clone)]
pub struct AuthUser(models::user::Model);

async fn require_auth(
    req: ServiceRequest,
    next: Next<BoxBody>,
) -> Result<ServiceResponse<BoxBody>> {
    let session = req.get_session();

    let Some(user_id) = session.get::<Uuid>("user_id").map_err(|err| {
        error!("Failed to get user_id from session: {err}");
        actix_web::error::ErrorInternalServerError("")
    })?
    else {
        return Err(actix_web::error::ErrorUnauthorized(""));
    };

    let db = req.app_data::<ThinData<DatabaseConnection>>().unwrap();

    let user = models::user::Entity::find_by_id(user_id)
        .one(&**db)
        .await
        .map_err(|err| {
            error!("Failed to get user in auth!!!: {err}");
            actix_web::error::ErrorInternalServerError("")
        })?;

    let Some(user) = user else {
        session.purge();
        return Err(actix_web::error::ErrorUnauthorized(""));
    };

    req.extensions_mut().insert(AuthUser(user));

    next.call(req).await
}

async fn graphql_panel() -> HttpResponse {
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(
            async_graphql::http::GraphiQLSource::build()
                .endpoint("/graphql")
                .finish(),
        )
}

async fn graphql(
    schema: actix_web::web::Data<AppSchema>,
    req: actix_web::HttpRequest,
    gql_req: GraphQLRequest,
) -> GraphQLResponse {
    let auth_user = req.extensions().get::<AuthUser>().cloned();

    let mut request = gql_req.into_inner();

    if let Some(user) = auth_user {
        request = request.data(user);
    }

    schema.execute(request).await.into()
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().expect("env missing");

    let debug = env::var("DEBUG").is_ok_and(|e| e == "true");

    if debug {
        tracing_subscriber::fmt()
            .with_max_level(tracing::Level::DEBUG)
            .init();
        debug!("running with DEBUG");
    } else {
        tracing_subscriber::fmt().init();
    }

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL missing");
    let session_key = env::var("SESSION_KEY").map_or_else(
        |_| {
            warn!("SESSION_KEY not provided, generating a temporary one");
            Key::generate()
        },
        |key| {
            Key::from(
                &base64::engine::general_purpose::STANDARD
                    .decode(key)
                    .expect("wrong SESSION_KEY"),
            )
        },
    );

    let rp_id = env::var("RP_ID").expect("RP_ID missing");
    let origin = env::var("ORIGIN").expect("ORIGIN");
    let origin = webauthn_rs::prelude::Url::parse(&origin).unwrap();

    let webauthn = Data::new(
        WebauthnBuilder::new(&rp_id, &origin)
            .unwrap()
            .build()
            .unwrap(),
    );

    let db = ThinData(Database::connect(database_url).await.unwrap_or_else(|err| {
        error!("Failed to connect to the database: {err}");
        exit(1)
    }));

    let schema = Schema::build(graphql::QueryRoot, graphql::MutationRoot, EmptySubscription)
        .data(db.clone())
        .finish();

    HttpServer::new(move || {
        App::new()
            .app_data(db.clone())
            .app_data(actix_web::web::Data::new(schema.clone()))
            .app_data(webauthn.clone())
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
                    .route("/login/start", post().to(routes::auth::login_start))
                    .route("/login/finish", post().to(routes::auth::login_finish))
                    .route("/logout", post().to(routes::auth::logout))
                    .route("/register/start", post().to(routes::auth::register_start))
                    .route("/register/finish", post().to(routes::auth::register_finish)),
            )
            .service(
                actix_web::web::resource("/graphql")
                    .wrap(middleware::from_fn(require_auth))
                    .route(actix_web::web::get().to(graphql_panel))
                    .route(actix_web::web::post().to(graphql)),
            )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
