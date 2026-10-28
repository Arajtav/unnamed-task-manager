use std::{collections::HashMap, env, process::exit};

use actix_cors::Cors;
use actix_session::{SessionExt, SessionMiddleware, storage::CookieSessionStore};
use actix_web::{
    App, HttpMessage, HttpResponse, HttpServer, Result,
    body::BoxBody,
    cookie::Key,
    dev::{ServiceRequest, ServiceResponse},
    middleware::{self, Next, NormalizePath},
    web::{Data, ThinData, post, scope},
};
use async_graphql::{EmptySubscription, Schema};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use base64::Engine;
use dotenv::dotenv;
use sea_orm::{
    ColumnTrait, ConnectOptions, Database, DatabaseConnection, EntityTrait, QueryFilter,
};
use strum::Display;
use tokio::sync::Mutex;
use tracing::{field, instrument};
use tracing_actix_web::TracingLogger;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

use crate::graphql::AppSchema;

mod auth;
mod graphql;
mod models;

fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info,async_graphql=warn,sqlx=warn")),
        )
        .with(
            tracing_tree::HierarchicalLayer::new(2)
                .with_targets(true)
                .with_bracketed_fields(true),
        )
        .init();
}

pub type SessionUser = models::user::Model;

#[derive(Clone)]
pub struct AuthUser(models::user::Model);

#[instrument(skip_all, fields(user_id = field::Empty))]
async fn require_auth(
    req: ServiceRequest,
    next: Next<BoxBody>,
) -> Result<ServiceResponse<BoxBody>> {
    let session = req.get_session();

    let Some(user_id) = session
        .get::<Uuid>("user_id")
        .map_err(|err| internal_server_error(err, ServerErrorType::Unreachable))?
    else {
        return Err(auth_error(AuthErrorType::NoSession));
    };

    let db = req.app_data::<ThinData<DatabaseConnection>>().unwrap();

    let user = models::user::Entity::find_by_id(user_id)
        .filter(models::user::Column::IsDisabled.eq(false))
        .one(&**db)
        .await
        .map_err(|err| internal_server_error(err, ServerErrorType::Database))?
        .ok_or_else(|| auth_error(AuthErrorType::NoUser))?;

    tracing::Span::current().record("user_id", field::display(user.id));

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

#[derive(Clone)]
pub struct Origin(String);

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().expect("env missing");

    init_tracing();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL missing");
    let session_key = env::var("SESSION_KEY").map_or_else(
        |_| {
            tracing::warn!("SESSION_KEY not provided, generating a temporary one");
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

    let origin = Origin(env::var("ORIGIN").expect("ORIGIN"));

    let rp = Data::new(simple_webauthn::registration::Rp {
        name: env::var("RP_ID").expect("RP_ID missing"),
        id: env::var("RP_ID").expect("RP_ID missing"),
    });

    let auth = Data::new(Mutex::new(HashMap::<
        Uuid,
        simple_webauthn::authentication::AuthenticationState,
    >::new()));

    let reg = Data::new(Mutex::new(HashMap::<
        Uuid,
        simple_webauthn::registration::RegistrationState,
    >::new()));

    let mut opt = ConnectOptions::new(database_url);
    opt.sqlx_logging(true)
        .sqlx_logging_level(log::LevelFilter::Debug);

    let db = ThinData(Database::connect(opt).await.unwrap_or_else(|err| {
        tracing::error!("Failed to connect to the database: {err}");
        exit(1)
    }));

    let schema = Schema::build(graphql::QueryRoot, graphql::MutationRoot, EmptySubscription)
        .data(db.clone())
        .extension(async_graphql::extensions::Tracing)
        .finish();

    HttpServer::new(move || {
        App::new()
            .app_data(db.clone())
            .app_data(actix_web::web::Data::new(schema.clone()))
            .app_data(rp.clone())
            .app_data(Data::new(origin.clone()))
            .app_data(auth.clone())
            .app_data(reg.clone())
            .wrap(
                Cors::default()
                    .allowed_origin(&origin.0)
                    .allow_any_method()
                    .allow_any_header()
                    .supports_credentials(),
            )
            .wrap(NormalizePath::new(
                actix_web::middleware::TrailingSlash::Trim,
            ))
            .wrap(
                SessionMiddleware::builder(CookieSessionStore::default(), session_key.clone())
                    .build(),
            )
            .wrap(TracingLogger::default())
            .service(
                scope("/auth")
                    .route("/login/start", post().to(auth::login_start))
                    .route("/login/finish", post().to(auth::login_finish))
                    .route("/logout", post().to(auth::logout))
                    .route("/register/start", post().to(auth::register_start))
                    .route("/register/finish", post().to(auth::register_finish)),
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

#[derive(Debug, Clone, Copy, Display)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum ServerErrorType {
    /// Shouldn't be ever reached unless everything is broken.
    /// Includes: failed serialization of some struct, failed const query etc.
    Unreachable,
    Database,
    Corrupted,
}

#[must_use]
pub fn internal_server_error<T: std::error::Error>(err: T, t: ServerErrorType) -> actix_web::Error {
    tracing::error!(error = %err, kind = %t, "internal server error");
    actix_web::error::ErrorInternalServerError(t.to_string())
}

#[derive(Debug, Clone, Copy, Display)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum AuthErrorType {
    NoState,
    NoUser,
    NoInvite,
    VerificationFailed,
    NoSession,
}

#[must_use]
pub fn auth_error_with<T: std::error::Error>(err: T, t: AuthErrorType) -> actix_web::Error {
    tracing::warn!(error = %err, kind = %t, "auth failure");
    actix_web::error::ErrorUnauthorized(t.to_string())
}

#[must_use]
pub fn auth_error(t: AuthErrorType) -> actix_web::Error {
    tracing::warn!(kind = %t, "auth failure");
    actix_web::error::ErrorUnauthorized(t.to_string())
}
