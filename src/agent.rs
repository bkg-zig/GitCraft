use std::{fs, path::{Path, PathBuf}, process::Stdio};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use crate::llm::LlmClient;

const MAX_STEPS: usize = 80;
const MAX_OUTPUT: usize = 12_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum AgentAction {
    List { path: Option<String> },
    Read { path: String },
    Write { path: String, content: String },
    Patch { path: String, old: String, new: String },
    Shell { command: String },
    Done { summary: String },
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AgentRun {
    pub summary: String,
    pub steps: usize,
}

pub async fn run(workspace: &Path, task: &str) -> Result<AgentRun> {
    let root = fs::canonicalize(workspace).context("agent workspace")?;
    let llm = LlmClient::from_env().context("GC LLM configuration missing")?;
    let system = r#"You are GC, an autonomous coding agent operating only inside /workspace.
You must inspect before changing. Work in small verifiable steps. Never access secrets or paths outside /workspace.
Return exactly one JSON action on every turn:
{"action":"list","path":"."}
{"action":"read","path":"src/main.rs"}
{"action":"write","path":"src/new.rs","content":"..."}
{"action":"patch","path":"src/main.rs","old":"exact text","new":"replacement"}
{"action":"shell","command":"cargo test"}
{"action":"done","summary":"..."}
Use shell for deterministic validation. Prefer patch over rewriting large files. Finish with done only after validation."#;

    let mut transcript = format!("USER TASK:\n{task}\n\nWORKSPACE: /workspace\n");
    for step in 1..=MAX_STEPS {
        let value = llm.complete_json(system, &transcript).await
            .with_context(|| format!("LLM step {step}"))?;
        let action: AgentAction = serde_json::from_value(value).context("invalid GC action JSON")?;
        match action {
            AgentAction::List { path } => {
                let target = safe_path(&root, path.as_deref().unwrap_or("."))?;
                let listing = list_tree(&target)?;
                transcript.push_str(&format!("\nTOOL RESULT list {}:\n{}\n", target.display(), listing));
            }
            AgentAction::Read { path } => {
                let target = safe_path(&root, &path)?;
                let content = fs::read_to_string(&target).context("read tool")?;
                transcript.push_str(&format!("\nTOOL RESULT read {}:\n{}\n", path, truncate(&content, MAX_OUTPUT)));
            }
            AgentAction::Write { path, content } => {
                let target = safe_path(&root, &path)?;
                if let Some(parent) = target.parent() { fs::create_dir_all(parent)?; }
                fs::write(&target, &content)?;
                transcript.push_str(&format!("\nTOOL RESULT write {}: ok ({} bytes)\n", path, content.len()));
            }
            AgentAction::Patch { path, old, new } => {
                let target = safe_path(&root, &path)?;
                let content = fs::read_to_string(&target).context("patch read")?;
                let hits = content.matches(&old).count();
                if hits != 1 {
                    anyhow::bail!("patch requires exactly one match in {path}, found {hits}");
                }
                fs::write(&target, content.replacen(&old, &new, 1))?;
                transcript.push_str(&format!("\nTOOL RESULT patch {}: ok\n", path));
            }
            AgentAction::Shell { command } => {
                if command.contains("..") || command.contains("/run/secrets") || command.contains("docker.sock") {
                    anyhow::bail!("sandbox policy rejected shell command");
                }
                let out = tokio::process::Command::new("/bin/bash")
                    .arg("-lc")
                    .arg(&command)
                    .current_dir(&root)
                    .env("HOME", "/home/agent")
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .output()
                    .await
                    .context("shell tool")?;
                let stdout = truncate(&String::from_utf8_lossy(&out.stdout), MAX_OUTPUT);
                let stderr = truncate(&String::from_utf8_lossy(&out.stderr), MAX_OUTPUT);
                transcript.push_str(&format!(
                    "\nTOOL RESULT shell exit={}:
STDOUT:
{}
STDERR:
{}\n",
                    out.status,
                    stdout,
                    stderr
                ));
            }
            AgentAction::Done { summary } => {
                return Ok(AgentRun { summary, steps: step });
            }
        }
    }
    anyhow::bail!("GC exceeded max agent steps ({MAX_STEPS})")
}

fn safe_path(root: &Path, value: &str) -> Result<PathBuf> {
    let relative = Path::new(value);
    if relative.is_absolute() {
        anyhow::bail!("absolute paths are not allowed inside GC");
    }
    for component in relative.components() {
        if matches!(component, std::path::Component::ParentDir) {
            anyhow::bail!("path traversal is not allowed");
        }
    }
    Ok(root.join(relative))
}

fn list_tree(root: &Path) -> Result<String> {
    if root.is_file() {
        return Ok(root.display().to_string());
    }
    let mut rows = Vec::new();
    for entry in walkdir::WalkDir::new(root).max_depth(2).into_iter().filter_map(Result::ok) {
        if entry.path() == root { continue; }
        let rel = entry.path().strip_prefix(root).unwrap_or(entry.path());
        rows.push(format!("{}", rel.display()));
    }
    rows.sort();
    Ok(rows.join("\n"))
}

fn truncate(value: &str, max: usize) -> String {
    if value.len() <= max { value.to_string() } else { format!("{}\n…[truncated]", &value[..max]) }
}
