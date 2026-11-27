use std::{fs, io::{self, Write}, path::{Path, PathBuf}};

use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::{agents, codegraph, init_engine, review, vault};

const MAX_HISTORY: usize = 40;
const CONTEXT_MESSAGES: usize = 12;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
    timestamp: String,
}

pub async fn run(repo: PathBuf, initial: Vec<String>) -> Result<()> {
    let repo = fs::canonicalize(&repo).context("chat repository")?;
    let history_path = repo.join(".gc").join("chat.json");
    if let Some(parent) = history_path.parent() { fs::create_dir_all(parent)?; }
    let mut history = load_history(&history_path)?;

    println!("GC // INTERACTIVE CODING AGENT");
    println!("repo: {}", repo.display());
    println!("type /help for commands, /quit to exit");

    if !initial.is_empty() {
        handle_prompt(&repo, &history_path, &mut history, &initial.join(" ")).await?;
    }

    let stdin = io::stdin();
    loop {
        print!("\nGC > ");
        io::stdout().flush()?;
        let mut line = String::new();
        if stdin.read_line(&mut line)? == 0 { break; }
        let line = line.trim();
        if line.is_empty() { continue; }

        match line {
            "/quit" | "/exit" => break,
            "/help" => print_help(),
            "/clear" => { history.clear(); save_history(&history_path, &history)?; println!("chat history cleared"); }
            "/history" => print_history(&history),
            "/tasks" => print_tasks(&repo)?,
            "/review" => print_review(&repo)?,
            "/index" => print_index(&repo)?,
            _ => handle_prompt(&repo, &history_path, &mut history, line).await?,
        }
    }
    Ok(())
}
async fn handle_prompt(
    repo: &Path,
    history_path: &Path,
    history: &mut Vec<Message>,
    prompt: &str,
) -> Result<()> {
    history.push(Message {
        role: "user".into(),
        content: prompt.into(),
        timestamp: Utc::now().to_rfc3339(),
    });

    let context = build_context(history);
    println!("AGENT // working...");
    let result = crate::agent::run(repo, &context).await?;
    println!("AGENT // {}", result.summary);
    println!("AGENT // steps={}", result.steps);

    history.push(Message {
        role: "assistant".into(),
        content: result.summary,
        timestamp: Utc::now().to_rfc3339(),
    });
    while history.len() > MAX_HISTORY { history.remove(0); }
    save_history(history_path, history)?;
    Ok(())
}

fn build_context(history: &[Message]) -> String {
    let start = history.len().saturating_sub(CONTEXT_MESSAGES);
    let mut out = String::from(
        "You are continuing an interactive GC coding session. Inspect the repository before changing it. Use your available coding actions to read, write, patch, and validate real files. Keep the user's current request as the highest priority.\n\nSESSION:\n"
    );
    for msg in &history[start..] {
        out.push_str(&format!("{}: {}\n", msg.role.to_uppercase(), msg.content));
    }
    out
}

fn load_history(path: &Path) -> Result<Vec<Message>> {
    if !path.exists() { return Ok(Vec::new()); }
    let raw = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

fn save_history(path: &Path, history: &[Message]) -> Result<()> {
    let raw = serde_json::to_string_pretty(history)?;
    fs::write(path, raw)?;
    Ok(())
}
fn print_help() {
    println!("/help      show commands");
    println!("/history   show recent chat messages");
    println!("/clear     clear this repository's chat history");
    println!("/tasks     show agent task state");
    println!("/review    run the native AST review engine");
    println!("/index     index source into the native context vault");
    println!("/quit      leave the interactive agent");
    println!("Anything else is sent to the coding agent. It can inspect, write, patch, and run validation commands.");
}

fn print_history(history: &[Message]) {
    for msg in history.iter().rev().take(12).rev() {
        println!("{}: {}", msg.role, msg.content);
    }
}

fn print_tasks(repo: &Path) -> Result<()> {
    let engine = init_engine(repo.to_path_buf())?;
    for task in engine.store.list()? {
        println!("{}  {:?}  {}  {}", task.id, task.status, task.agent, task.name);
    }
    Ok(())
}

fn print_review(repo: &Path) -> Result<()> {
    let report = review::run(repo, None)?;
    println!("REVIEW {} findings={} output={}", report.status, report.findings.len(), report.output);
    for finding in report.findings.iter().take(12) {
        println!("{}:{}-{} [{}] {}", finding.path, finding.start_line, finding.end_line, finding.severity, finding.message);
    }
    Ok(())
}

fn print_index(repo: &Path) -> Result<()> {
    let graph = codegraph::analyze(repo)?;
    let vault = vault::Vault::open(repo)?;
    let files = graph.features.iter().map(|f| (f.path.clone(), f.fingerprint.clone())).collect::<Vec<_>>();
    let snapshot = vault.store_code_snapshot(&graph.root, &files, &graph.features)?;
    println!("INDEX snapshot={} files={} features={} capabilities={}", snapshot, graph.files, graph.features.len(), graph.capabilities.len());
    Ok(())
}

// TODO: migrate to SQLite chat_sessions/chat_messages tables