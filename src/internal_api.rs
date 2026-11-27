use axum::{
    extract::{Path, Json},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde_json::json;

use crate::{
    engine,
    models::NewTask,
};

pub fn router() -> Router {
    Router::new()
        .route("/api/internal/goal/tasks", post(create_task))
        .route("/api/internal/goal/tasks/{id}", get(get_task))
        .route("/api/internal/chat/sessions", post(create_chat_session))
        .route("/api/internal/chat/sessions/{id}/messages", get(get_chat_messages))
        .route("/api/internal/chat/sessions/{id}/messages/stream", post(stream_chat_message))
}

fn authorized(headers: &HeaderMap) -> bool {
    let expected = std::env::var("GC_GOAL_INTERNAL_TOKEN")
        .ok()
        .filter(|value| !value.is_empty())
        .or_else(|| {
            std::env::var("GC_GOAL_INTERNAL_TOKEN_FILE")
                .ok()
                .and_then(|path| std::fs::read_to_string(path).ok())
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
        });
    let Some(expected) = expected else { return false };
    let actual = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("");
    actual == expected
}

async fn create_task(
    headers: HeaderMap,
    Json(request): Json<NewTask>,
) -> impl IntoResponse {
    if !authorized(&headers) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error":"unauthorized"})),
        );
    }

    let repo = std::path::PathBuf::from(&request.repo_root);
    let canonical = match std::fs::canonicalize(&repo) {
        Ok(path) => path,
        Err(error) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error":format!("invalid repo_root: {error}")})),
            );
        }
    };
    if !canonical.starts_with("/workspace") {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error":"repo_root must stay below /workspace"})),
        );
    }

    match engine().and_then(|e| e.create_task(request)) {
        Ok(task) => (StatusCode::ACCEPTED, Json(json!(task))),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error":format!("{error:#}")})),
        ),
    }
}

async fn get_task(
    headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if !authorized(&headers) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error":"unauthorized"})),
        );
    }

    match engine().and_then(|e| e.get_task(&id)) {
        Ok(Some(task)) => (StatusCode::OK, Json(json!(task))),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error":"task not found"})),
        ),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error":format!("{error:#}")})),
        ),
    }
}


async fn create_chat_session(headers: HeaderMap, Json(req): Json<serde_json::Value>) -> impl IntoResponse {
    if !authorized(&headers) { return (StatusCode::UNAUTHORIZED, Json(json!({"error":"unauthorized"}))).into_response(); } 
    (StatusCode::OK, Json(json!({"id":"stub"}))).into_response()
}
async fn get_chat_messages(headers: HeaderMap, Path(id): Path<String>) -> impl IntoResponse {
    if !authorized(&headers) { return (StatusCode::UNAUTHORIZED, Json(json!({"error":"unauthorized"}))).into_response(); } 
    (StatusCode::OK, Json(json!([]))).into_response()
}

async fn stream_chat_message(headers: HeaderMap, Path(id): Path<String>, Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    if !authorized(&headers) { return (StatusCode::UNAUTHORIZED, Json(json!({"error":"unauthorized"}))).into_response(); }
    let stream = axum::response::sse::Event::default().event("token").data("stream stub");
    (StatusCode::OK, Json(json!({"status":"ok"}))).into_response()
}

// SSE events: data: {"type":"token","content":"..."} ; {"type":"tool_start","tool":"name","args":{}} ; {"type":"tool_result"}
