use std::path::PathBuf;
use anyhow::Result;
use clap::{Parser, Subcommand};
use gc::{craft, engine, init_engine};

#[derive(Parser, Debug)]
#[command(name="bkg-craft", about="BKG-Craft autonomous repository architect and sandbox coding CLI")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    Harvest {
        #[arg(long, default_value=".")]
        repo: String,
    },
    Plan {
        #[arg(long, default_value=".")]
        repo: String,
        #[arg(long)]
        brief: Option<String>,
    },
    Run {
        #[arg(long, default_value=".")]
        repo: String,
        prompt: String,
    },
    Agent {
        #[arg(long, default_value=".")]
        repo: String,
        prompt: String,
    },
    Acp,
    Tui {
        #[arg(long, default_value=".")]
        repo: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Harvest { repo } => {
            let repo = absolute(repo)?;
            let features = craft::harvest(&repo)?;
            println!("{}", serde_json::to_string_pretty(&features)?);
        }
        Command::Plan { repo, brief } => {
            let repo = absolute(repo)?;
            let plan = craft::build_plan(&repo, brief.as_deref()).await?;
            println!("{}", serde_json::to_string_pretty(&plan)?);
        }
        Command::Run { repo, prompt } => {
            let repo = absolute(repo)?;
            let e = init_engine(repo.clone())?;
            let task = e.create_task(gc::models::NewTask {
                repo_root: repo.display().to_string(),
                name: "bkg-craft-run".into(),
                task_type: "craft".into(),
                prompt,
                agent: "codex".into(),
                model: None,
                parent_ids: Vec::new(),
                network_isolation: true,
                allowed_domains: Vec::new(),
                interactive: false,
            })?;
            e.run_one(task.clone()).await?;
            println!("{}", task.id);
        }
        Command::Agent { repo, prompt } => {
            let repo = absolute(repo)?;
            let result = gc::agent::run(&repo, &prompt).await?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Command::Acp => {
            gc::acp::serve(std::env::current_dir()?).await?;
        }
        Command::Tui { repo } => {
            gc::tui::run(absolute(repo)?).await?;
        }
    }
    let _ = engine();
    Ok(())
}

fn absolute(value: String) -> Result<PathBuf> {
    let p = PathBuf::from(value);
    if p.is_absolute() { Ok(p) } else { Ok(std::env::current_dir()?.join(p)) }
}
