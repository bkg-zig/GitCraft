use std::{path::PathBuf, sync::Arc};
use anyhow::Result;
use chrono::Utc;

use crate::{
    agents::Agent,
    config::Config,
    git::{commit_and_return_branch, prepare_workspace, repo_head},
    models::{DashboardSnapshot, NewTask, Task, TaskStatus},
    sandbox::SandboxRunner,
    store::TaskStore,
};

#[derive(Clone)]
pub struct Engine {
    pub repo_root: PathBuf,
    pub config: Config,
    pub store: TaskStore,
    pub sandbox: SandboxRunner,
}

impl Engine {
    pub fn new(repo_root: PathBuf) -> Result<Self> {
        let config = Config::load(&repo_root)?;
        config.ensure_dirs()?;
        let store = TaskStore::open(&config.data_dir)?;
        let sandbox = SandboxRunner::new(config.clone());
        Ok(Self { repo_root, config, store, sandbox })
    }

    pub fn create_task(&self, req: NewTask) -> Result<Task> {
        let repo = PathBuf::from(&req.repo_root);
        let (commit, branch) = repo_head(&repo)?;
        let uuid = uuid::Uuid::new_v4().simple().to_string();
        let id = format!("gc-{}-{}", Utc::now().format("%Y%m%d-%H%M%S"), &uuid[..8]);
        let task = Task {
            id: id.clone(),
            repo_root: req.repo_root,
            name: req.name,
            task_type: req.task_type,
            prompt: req.prompt,
            agent: req.agent,
            model: req.model,
            status: TaskStatus::Queued,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
            branch_name: format!("gc/{id}"),
            source_commit: commit,
            source_branch: branch,
            parent_ids: req.parent_ids,
            workspace_path: None,
            sandbox_id: None,
            network_isolation: req.network_isolation,
            allowed_domains: if req.allowed_domains.is_empty() { self.config.allowed_domains.clone() } else { req.allowed_domains },
            interactive: req.interactive,
            retry_count: 0,
            error_message: None,
            result_message: None,
        };
        self.store.insert(&task)?;
        Ok(task)
    }

    pub fn dashboard(&self) -> Result<DashboardSnapshot> { self.store.dashboard() }
    pub fn get_task(&self, id: &str) -> Result<Option<Task>> { self.store.get(id) }
    pub fn logs(&self, id: &str, limit: usize) -> Result<Vec<crate::models::TaskLog>> { self.store.logs(id, limit) }
    pub fn cancel(&self, id: &str) -> Result<()> { self.store.cancel(id) }
    pub fn retry(&self, id: &str) -> Result<()> { self.store.increment_retry(id) }
    pub fn delete(&self, id: &str) -> Result<()> { self.store.delete(id) }
    pub fn clean(&self) -> Result<usize> { self.store.clear_terminal() }

    pub async fn run_one(&self, task: Task) -> Result<()> {
        self.store.set_running(&task.id)?;
        let prepared = prepare_workspace(PathBuf::from(&task.repo_root).as_path(), &self.config.data_dir, &task.id).await?;
        self.store.set_runtime_paths(&task.id, Some(prepared.path.to_string_lossy().as_ref()), None)?;
        let agent = Agent::parse(&task.agent);
        match self.sandbox.run(&task, &prepared.path, &agent).await {
            Ok(message) => {
                let branch = commit_and_return_branch(&prepared.path, PathBuf::from(&task.repo_root).as_path(), &task.branch_name, &task.name).await?;
                self.store.complete(&task.id, &branch, &message)?;
            }
            Err(error) => self.store.fail(&task.id, &error.to_string())?,
        }
        Ok(())
    }

    pub async fn run_scheduler(self: Arc<Self>) {
        let semaphore = Arc::new(tokio::sync::Semaphore::new(self.config.worker_count));
        loop {
            if let Ok(tasks) = self.store.ready() {
                for task in tasks {
                    if task.status == TaskStatus::Blocked { continue; }
                    if !parents_ready(&task, &self.store) { continue; }
                    let permit = match semaphore.clone().try_acquire_owned() { Ok(p) => p, Err(_) => break };
                    let engine = self.clone();
                    tokio::spawn(async move {
                        let _permit = permit;
                        if let Err(err) = engine.clone().run_one(task.clone()).await {
                            let _ = engine.store.fail(&task.id, &err.to_string());
                        }
                    });
                }
            }
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
    }
}

fn parents_ready(task: &Task, store: &TaskStore) -> bool {
    task.parent_ids.iter().all(|id| store.get(id).ok().flatten().map(|p| p.status == TaskStatus::Complete).unwrap_or(false))
}

