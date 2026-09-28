#![cfg(feature = "acp")]

use std::{collections::HashMap, path::PathBuf, sync::Arc};
use agent_client_protocol::on_receive_request;
use agent_client_protocol::schema::v1::*;
use agent_client_protocol::{Agent, Client, ConnectionTo, Responder, Stdio};
use tokio::sync::Mutex;

struct State {
    sessions: Mutex<HashMap<SessionId, PathBuf>>,
}

pub async fn serve(default_root: PathBuf) -> anyhow::Result<()> {
    let state = Arc::new(State { sessions: Mutex::new(HashMap::new()) });
    let builder = Agent.builder().name("gc")
        .on_receive_request(
            {
                let state = state.clone();
                move |req: InitializeRequest, responder, _cx| {
                    let state = state.clone();
                    async move { initialize(req, responder, &state).await }
                }
            },
            on_receive_request!(),
        )
        .on_receive_request(
            {
                let state = state.clone();
                let default_root = default_root.clone();
                move |req: NewSessionRequest, responder, _cx| {
                    let state = state.clone();
                    let default_root = default_root.clone();
                    async move { new_session(req, responder, default_root, &state).await }
                }
            },
            on_receive_request!(),
        )
        .on_receive_request(
            {
                let state = state.clone();
                move |req: PromptRequest, responder, cx| {
                    let state = state.clone();
                    async move { prompt(req, responder, cx, &state).await }
                }
            },
            on_receive_request!(),
        );

    builder.connect_to(Stdio::new()).await
        .map_err(|e| anyhow::anyhow!("gc ACP: {e}"))?;
    Ok(())
}

async fn initialize(
    req: InitializeRequest,
    responder: Responder<InitializeResponse>,
    _state: &State,
) -> Result<(), agent_client_protocol::Error> {
    responder.respond(
        InitializeResponse::new(req.protocol_version)
            .agent_capabilities(AgentCapabilities::new())
            .agent_info(Implementation::new("gc", env!("CARGO_PKG_VERSION")))
    )
}

async fn new_session(
    req: NewSessionRequest,
    responder: Responder<NewSessionResponse>,
    default_root: PathBuf,
    state: &State,
) -> Result<(), agent_client_protocol::Error> {
    let root = if req.cwd.as_os_str().is_empty() { default_root } else { req.cwd };
    let id = SessionId::new(uuid::Uuid::new_v4().to_string());
    state.sessions.lock().await.insert(id.clone(), root);
    responder.respond(NewSessionResponse::new(id))
}

async fn prompt(
    req: PromptRequest,
    responder: Responder<PromptResponse>,
    cx: ConnectionTo<Client>,
    state: &State,
) -> Result<(), agent_client_protocol::Error> {
    let session = req.session_id.clone();
    let text = req.prompt.iter().filter_map(|block| match block {
        ContentBlock::Text(t) => Some(t.text.clone()),
        _ => None,
    }).collect::<Vec<_>>().join("\n");
    let root = state.sessions.lock().await.get(&session).cloned()
        .unwrap_or_else(|| PathBuf::from("."));

    let engine = match crate::engine::Engine::new(root.clone()) {
        Ok(engine) => Arc::new(engine),
        Err(error) => {
            let _ = responder.respond(PromptResponse::new(StopReason::Refusal));
            let _ = cx.send_notification(SessionNotification::new(session.clone(), SessionUpdate::AgentMessageChunk(ContentChunk::new(ContentBlock::Text(TextContent::new(format!("[gc engine error] {error}")))))));
            return Ok(());
        }
    };
    let task = match engine.create_task(crate::models::NewTask {
        repo_root: root.display().to_string(), name: "acp-session".into(), task_type: "acp".into(), prompt: text, agent: "gc".into(), model: None, parent_ids: Vec::new(), network_isolation: true, allowed_domains: Vec::new(), interactive: false,
    }) { Ok(task) => task, Err(error) => { let _ = responder.respond(PromptResponse::new(StopReason::Refusal)); let _ = cx.send_notification(SessionNotification::new(session.clone(), SessionUpdate::AgentMessageChunk(ContentChunk::new(ContentBlock::Text(TextContent::new(format!("[gc task error] {error}"))))))); return Ok(()); } };
    let result = engine.run_one(task.clone()).await;
    match result {
        Ok(()) => {
            let chunk = ContentChunk::new(ContentBlock::Text(
                TextContent::new(format!("sandbox task {} finished on branch {}", task.id, task.branch_name))
            ));
            let _ = cx.send_notification(SessionNotification::new(
                session.clone(),
                SessionUpdate::AgentMessageChunk(chunk)
            ));
            let _ = responder.respond(PromptResponse::new(StopReason::EndTurn));
        }
        Err(error) => {
            let chunk = ContentChunk::new(ContentBlock::Text(
                TextContent::new(format!("[gc error] {error}"))
            ));
            let _ = cx.send_notification(SessionNotification::new(
                session.clone(),
                SessionUpdate::AgentMessageChunk(chunk)
            ));
            let _ = responder.respond(PromptResponse::new(StopReason::Refusal));
        }
    }
    Ok(())
}
