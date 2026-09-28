use std::{fs, path::PathBuf, process::Command as StdCommand, time::Duration};

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use gc::{engine, init_engine};
use gc::models::{NewTask, TaskStatus};

#[derive(Parser, Debug)]
#[command(name="gc", version, about="GitCraft sandboxed coding-agent control plane")]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand, Debug)]
enum Command {
    Chat {
        #[arg(long, default_value=".")]
        repo: String,
        #[arg(trailing_var_arg=true)]
        message: Vec<String>,
    },
    Add {
        #[arg(long, default_value=".")]
        repo: String,
        #[arg(long, default_value="agent-task")]
        name: String,
        #[arg(long, default_value="agent")]
        task_type: String,
        #[arg(long, default_value="codex")]
        agent: String,
        #[arg(long)]
        parent: Vec<String>,
        prompt: String,
    },
    Run {
        #[arg(long, default_value=".")]
        repo: String,
        #[arg(long, default_value="agent-run")]
        name: String,
        #[arg(long, default_value="codex")]
        agent: String,
        prompt: String,
    },
    List,
    Wait { ids: Vec<String> },
    Cancel { ids: Vec<String> },
    Retry { ids: Vec<String> },
    Delete { ids: Vec<String> },
    Clean,
    Review {
        #[arg(long, default_value=".")]
        repo: String,
    },
    Scan {
        #[arg(long, default_value=".")]
        repo: String,
    },
    Index {
        #[arg(long, default_value=".")]
        repo: String,
    },
    Search {
        #[arg(long, default_value=".")]
        repo: String,
        query: String,
        #[arg(long, default_value_t=20)]
        limit: usize,
    },
    Agent {
        #[arg(long, default_value=".")]
        repo: String,
        #[arg(long, conflicts_with="prompt_file")]
        prompt: Option<String>,
        #[arg(long="prompt-file", default_value="/instructions/instructions.md", conflicts_with="prompt")]
        prompt_file: String,
    },
    Craft {
        #[arg(long, default_value=".")]
        repo: String,
        #[arg(long)]
        brief: Option<String>,
    },
    Tui {
        #[arg(long, default_value=".")]
        repo: String,
    },
    #[cfg(feature = "acp")]
    Acp,
    Probe,
    Shell {
        #[arg(long, default_value=".")]
        repo: String,
    },
    Server {
        #[command(subcommand)]
        action: ServerCommand,
    },
}

#[derive(Subcommand, Debug)]
enum ServerCommand {
    Start,
    Stop,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    let command = cli.command.unwrap_or(Command::Chat { repo: ".".into(), message: Vec::new() });

    match command {
        Command::Chat { repo, message } => {
            gc::chat::run(absolute(repo)?, message).await?;
        }
        Command::Add { repo, name, task_type, agent, parent, prompt } => {
            let repo = absolute(repo)?;
            let root = repo.clone();
            let e = init_engine(root)?;
            let task = e.create_task(NewTask {
                repo_root: repo.to_string_lossy().into_owned(),
                name,
                task_type,
                prompt,
                agent,
                model: None,
                parent_ids: parent,
                network_isolation: true,
                allowed_domains: Vec::new(),
                interactive: false,
            })?;
            println!("{} {}", task.id, task.branch_name);
        }
        Command::Run { repo, name, agent, prompt } => {
            let repo = absolute(repo)?;
            let e = init_engine(repo.clone())?;
            let task = e.create_task(NewTask {
                repo_root: repo.to_string_lossy().into_owned(),
                name,
                task_type: "agent".into(),
                prompt,
                agent,
                model: None,
                parent_ids: Vec::new(),
                network_isolation: true,
                allowed_domains: Vec::new(),
                interactive: false,
            })?;
            let arc = std::sync::Arc::new(e);
            arc.clone().run_one(task.clone()).await?;
            println!("{}", task.id);
        }
        Command::List => {
            let root = std::env::current_dir()?;
            let e = init_engine(root)?;
            for task in e.store.list()? {
                println!("{:<36} {:<10} {:<8} {} -> {}", task.id, status(&task.status), task.agent, task.name, task.branch_name);
            }
        }
        Command::Wait { ids } => {
            let e = init_engine(std::env::current_dir()?)?;
            let target = if ids.is_empty() { e.store.list()?.into_iter().map(|t| t.id).collect() } else { ids };
            loop {
                let mut done = true;
                for id in &target {
                    if let Some(t) = e.store.get(id)? {
                        if matches!(t.status, TaskStatus::Queued | TaskStatus::Running | TaskStatus::Blocked) { done = false; }
                    }
                }
                if done { break; }
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        }
        Command::Cancel { ids } => {
            let e = init_engine(std::env::current_dir()?)?;
            for id in ids { e.cancel(&id)?; }
        }
        Command::Retry { ids } => {
            let e = init_engine(std::env::current_dir()?)?;
            for id in ids { e.retry(&id)?; }
        }
        Command::Delete { ids } => {
            let e = init_engine(std::env::current_dir()?)?;
            for id in ids { e.delete(&id)?; }
        }
        Command::Clean => {
            let e = init_engine(std::env::current_dir()?)?;
            println!("{}", e.clean()?);
        }
        Command::Review { repo } => {
            let path = absolute(repo)?;
            let result = gc::review::run(&path, None)?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Command::Scan { repo } => {
            let path = absolute(repo)?;
            let graph = gc::codegraph::analyze(&path)?;
            println!("{}", serde_json::to_string_pretty(&graph)?);
        }
        Command::Index { repo } => {
            let path = absolute(repo)?;
            let graph = gc::codegraph::analyze(&path)?;
            let vault = gc::vault::Vault::open(&path)?;
            let files = graph.features.iter().map(|f| (f.path.clone(), f.fingerprint.clone())).collect::<Vec<_>>();
            let snapshot = vault.store_code_snapshot(&graph.root, &files, &graph.features)?;
            println!("snapshot={} files={} features={} capabilities={}", snapshot, graph.files, graph.features.len(), graph.capabilities.len());
        }
        Command::Search { repo, query, limit } => {
            let path = absolute(repo)?;
            let vault = gc::vault::Vault::open(&path)?;
            let results = vault.search_features(&query, limit)?;
            println!("{}", serde_json::to_string_pretty(&results)?);
        }
        Command::Agent { repo, prompt, prompt_file } => {
            let repo = absolute(repo)?;
            let prompt = match prompt {
                Some(value) => value,
                None => fs::read_to_string(&prompt_file).context("read agent prompt file")?,
            };
            let result = gc::agent::run(&repo, &prompt).await?;
            println!("{}", serde_json::to_string(&result)?);
        }
        Command::Craft { repo, brief } => {
            let repo = absolute(repo)?;
            let plan = gc::craft::build_plan(&repo, brief.as_deref()).await?;
            println!("{}", serde_json::to_string_pretty(&plan)?);
        }
        Command::Tui { repo } => {
            gc::tui::run(absolute(repo)?).await?;
        }
        #[cfg(feature = "acp")]
        Command::Acp => {
            gc::acp::serve(std::env::current_dir()?).await?;
        }
        Command::Probe => {
            let llm = gc::llm::LlmClient::from_env().context("GC_API_URL_FILE and GC_API_KEY_FILE required")?;
            let models = llm.probe().await?;
            println!("{} models", models.len());
            for model in models { println!("{model}"); }
        }
        Command::Shell { repo } => {
            let path = absolute(repo)?;
            let e = init_engine(path.clone())?;
            let id = format!("shell-{}", uuid::Uuid::new_v4().simple());
            e.sandbox.shell(&path, &id).await?;
        }
        Command::Server { action } => {
            let data = init_engine(std::env::current_dir()?)?.config.data_dir.clone();
            let pid_path = data.join("server.pid");
            match action {
                ServerCommand::Start => {
                    if pid_path.exists() { anyhow::bail!("gc server.pid already exists"); }
                    let exe = std::env::current_exe()?.with_file_name("gc-web");
                    let child = StdCommand::new(exe)
                        .env("IP", "127.0.0.1")
                        .env("PORT", "8789")
                        .spawn()
                        .context("start gc-web")?;
                    fs::write(&pid_path, child.id().to_string())?;
                    println!("started {}", child.id());
                }
                ServerCommand::Stop => {
                    let pid = fs::read_to_string(&pid_path).context("read server.pid")?;
                    let _ = StdCommand::new("kill").args(["-TERM", pid.trim()]).status()?;
                    let _ = fs::remove_file(pid_path);
                }
            }
        }
    }

    let _ = engine();
    Ok(())
}

fn absolute(value: String) -> Result<PathBuf> {
    let path = PathBuf::from(value);
    if path.is_absolute() { Ok(path) } else { Ok(std::env::current_dir()?.join(path)) }
}

fn status(status: &TaskStatus) -> &'static str {
    match status {
        TaskStatus::Queued => "QUEUED",
        TaskStatus::Running => "RUNNING",
        TaskStatus::Complete => "COMPLETE",
        TaskStatus::Failed => "FAILED",
        TaskStatus::Cancelled => "CANCELLED",
        TaskStatus::Blocked => "BLOCKED",
    }
}

