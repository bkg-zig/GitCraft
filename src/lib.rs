pub mod acp;
pub mod agent;
pub mod agents;
pub mod chat;
pub mod codegraph;
pub mod config;
pub mod craft;
pub mod engine;
pub mod git;
pub mod internal_api;
pub mod llm;
pub mod models;
pub mod review;
pub mod sandbox;
pub mod store;
pub mod tui;
pub mod vault;
pub mod web;

use std::sync::Arc;
use engine::Engine;

static ENGINE: std::sync::OnceLock<Arc<Engine>> = std::sync::OnceLock::new();

pub fn init_engine(repo_root: std::path::PathBuf) -> anyhow::Result<Arc<Engine>> {
    let engine = Arc::new(Engine::new(repo_root)?);
    let _ = ENGINE.set(engine.clone());
    Ok(engine)
}

pub fn engine() -> anyhow::Result<Arc<Engine>> {
    ENGINE.get().cloned().ok_or_else(|| anyhow::anyhow!("GitCraft engine is not initialized"))
}
