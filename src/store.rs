use std::{path::Path, sync::{Arc, Mutex}};

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};

use crate::models::{DashboardSnapshot, RuntimeInfo, StatusCounts, Task, TaskLog, TaskStatus};

#[derive(Clone)]
pub struct TaskStore {
    conn: Arc<Mutex<Connection>>,
}

impl TaskStore {
    pub fn open(data_dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(data_dir)?;
        let path = data_dir.join("state.sqlite");
        let conn = Connection::open(path).context("open gc sqlite")?;
        let store = Self { conn: Arc::new(Mutex::new(conn)) };
        store.migrate()?;
        Ok(store)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             CREATE TABLE IF NOT EXISTS tasks (
               id TEXT PRIMARY KEY,
               repo_root TEXT NOT NULL,
               name TEXT NOT NULL,
               task_type TEXT NOT NULL,
               prompt TEXT NOT NULL,
               agent TEXT NOT NULL,
               model TEXT,
               status TEXT NOT NULL,
               created_at TEXT NOT NULL,
               started_at TEXT,
               completed_at TEXT,
               branch_name TEXT NOT NULL,
               source_commit TEXT NOT NULL,
               source_branch TEXT,
               parent_ids TEXT NOT NULL,
               workspace_path TEXT,
               sandbox_id TEXT,
               network_isolation INTEGER NOT NULL,
               allowed_domains TEXT NOT NULL,
               interactive INTEGER NOT NULL,
               retry_count INTEGER NOT NULL DEFAULT 0,
               error_message TEXT,
               result_message TEXT
             );
             CREATE TABLE IF NOT EXISTS task_logs (
               task_id TEXT NOT NULL,
               sequence INTEGER NOT NULL,
               stream TEXT NOT NULL,
               line TEXT NOT NULL,
               created_at TEXT NOT NULL,
               PRIMARY KEY(task_id, sequence)
             );
             CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at);
             CREATE INDEX IF NOT EXISTS idx_task_logs_task ON task_logs(task_id, sequence);"
        )?;
        Ok(())
    }

    pub fn insert(&self, task: &Task) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        conn.execute(
            "INSERT OR REPLACE INTO tasks
             (id,repo_root,name,task_type,prompt,agent,model,status,created_at,started_at,completed_at,
              branch_name,source_commit,source_branch,parent_ids,workspace_path,sandbox_id,
              network_isolation,allowed_domains,interactive,retry_count,error_message,result_message)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)",
            params![
                task.id, task.repo_root, task.name, task.task_type, task.prompt, task.agent, task.model,
                status_str(&task.status), task.created_at.to_rfc3339(),
                task.started_at.map(|v| v.to_rfc3339()), task.completed_at.map(|v| v.to_rfc3339()),
                task.branch_name, task.source_commit, task.source_branch,
                serde_json::to_string(&task.parent_ids)?, task.workspace_path, task.sandbox_id,
                task.network_isolation as i32, serde_json::to_string(&task.allowed_domains)?,
                task.interactive as i32, task.retry_count, task.error_message, task.result_message
            ],
        )?;
        Ok(())
    }

    pub fn get(&self, id: &str) -> Result<Option<Task>> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        conn.query_row("SELECT * FROM tasks WHERE id=?1", [id], row_to_task).optional().map_err(Into::into)
    }

    pub fn list(&self) -> Result<Vec<Task>> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        let mut stmt = conn.prepare("SELECT * FROM tasks ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], row_to_task)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn ready(&self) -> Result<Vec<Task>> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        let mut stmt = conn.prepare("SELECT * FROM tasks WHERE status IN ('QUEUED','BLOCKED') ORDER BY created_at ASC")?;
        let rows = stmt.query_map([], row_to_task)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn set_running(&self, id: &str) -> Result<()> {
        self.update_state(id, TaskStatus::Running, Some(Utc::now()), None, None)
    }

    pub fn complete(&self, id: &str, branch: &str, message: &str) -> Result<()> {
        self.update_state(id, TaskStatus::Complete, None, Some(branch.to_string()), Some(message.to_string()))
    }

    pub fn fail(&self, id: &str, message: &str) -> Result<()> {
        self.update_state(id, TaskStatus::Failed, None, None, Some(message.to_string()))
    }

    pub fn cancel(&self, id: &str) -> Result<()> {
        self.update_state(id, TaskStatus::Cancelled, None, None, Some("Cancelled by operator".into()))
    }

    pub fn block(&self, id: &str, message: &str) -> Result<()> {
        self.update_state(id, TaskStatus::Blocked, None, None, Some(message.to_string()))
    }

    fn update_state(&self, id: &str, status: TaskStatus, started: Option<DateTime<Utc>>, branch: Option<String>, msg: Option<String>) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        let completed = matches!(status, TaskStatus::Complete | TaskStatus::Failed | TaskStatus::Cancelled).then(|| Utc::now().to_rfc3339());
        conn.execute(
            "UPDATE tasks SET status=?2, started_at=COALESCE(?3,started_at), completed_at=COALESCE(?4,completed_at),
             branch_name=COALESCE(?5,branch_name),
             error_message=CASE WHEN ?2 IN ('FAILED','BLOCKED','CANCELLED') THEN ?6 ELSE error_message END,
             result_message=CASE WHEN ?2='COMPLETE' THEN ?6 ELSE result_message END
             WHERE id=?1",
            params![id, status_str(&status), started.map(|v| v.to_rfc3339()), completed, branch, msg],
        )?;
        Ok(())
    }

    pub fn set_runtime_paths(&self, id: &str, workspace: Option<&str>, sandbox: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        conn.execute("UPDATE tasks SET workspace_path=?2, sandbox_id=?3 WHERE id=?1", params![id, workspace, sandbox])?;
        Ok(())
    }

    pub fn increment_retry(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        conn.execute("UPDATE tasks SET retry_count=retry_count+1, status='QUEUED', error_message=NULL, completed_at=NULL WHERE id=?1", [id])?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        conn.execute("DELETE FROM task_logs WHERE task_id=?1", [id])?;
        conn.execute("DELETE FROM tasks WHERE id=?1", [id])?;
        Ok(())
    }

    pub fn clear_terminal(&self) -> Result<usize> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        let logs = conn.execute("DELETE FROM task_logs WHERE task_id IN (SELECT id FROM tasks WHERE status IN ('COMPLETE','FAILED','CANCELLED'))", [])?;
        let tasks = conn.execute("DELETE FROM tasks WHERE status IN ('COMPLETE','FAILED','CANCELLED')", [])?;
        Ok(tasks + logs)
    }

    pub fn append_log(&self, task_id: &str, stream: &str, line: &str) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        let next: i64 = conn.query_row("SELECT COALESCE(MAX(sequence),0)+1 FROM task_logs WHERE task_id=?1", [task_id], |r| r.get(0))?;
        conn.execute(
            "INSERT INTO task_logs(task_id,sequence,stream,line,created_at) VALUES(?1,?2,?3,?4,?5)",
            params![task_id, next, stream, line, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn logs(&self, id: &str, limit: usize) -> Result<Vec<TaskLog>> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("sqlite mutex poisoned"))?;
        let mut stmt = conn.prepare("SELECT task_id,sequence,stream,line,created_at FROM task_logs WHERE task_id=?1 ORDER BY sequence DESC LIMIT ?2")?;
        let rows = stmt.query_map(params![id, limit as i64], |r| {
            let created = r.get::<_, String>(4)?.parse().map_err(|e: chrono::ParseError| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(e)))?;
            Ok(TaskLog { task_id:r.get(0)?, sequence:r.get(1)?, stream:r.get(2)?, line:r.get(3)?, created_at:created })
        })?;
        let mut logs: Vec<_> = rows.collect::<rusqlite::Result<Vec<_>>>()?;
        logs.reverse();
        Ok(logs)
    }

    pub fn dashboard(&self) -> Result<DashboardSnapshot> {
        let tasks = self.list()?;
        let mut counts = StatusCounts::default();
        for task in &tasks {
            match task.status {
                TaskStatus::Queued => counts.queued += 1,
                TaskStatus::Running => counts.running += 1,
                TaskStatus::Complete => counts.complete += 1,
                TaskStatus::Failed => counts.failed += 1,
                TaskStatus::Cancelled => counts.cancelled += 1,
                TaskStatus::Blocked => counts.blocked += 1,
            }
        }
        Ok(DashboardSnapshot {
            tasks,
            counts,
            runtime: RuntimeInfo {
                version: env!("CARGO_PKG_VERSION").into(),
                shared_network: "bkg_net".into(),
                review_engine: "GC AST Review Engine".into(),
                llm_endpoint_configured: std::env::var("GC_API_URL").is_ok() || std::env::var("GC_API_URL_FILE").is_ok(),
                agent_support: vec!["gc".into(), "codex".into(), "claude".into()],
            },
        })
    }
}

fn status_str(s: &TaskStatus) -> &'static str {
    match s {
        TaskStatus::Queued => "QUEUED",
        TaskStatus::Running => "RUNNING",
        TaskStatus::Complete => "COMPLETE",
        TaskStatus::Failed => "FAILED",
        TaskStatus::Cancelled => "CANCELLED",
        TaskStatus::Blocked => "BLOCKED",
    }
}

fn parse_status(s: &str) -> TaskStatus {
    match s {
        "RUNNING" => TaskStatus::Running,
        "COMPLETE" => TaskStatus::Complete,
        "FAILED" => TaskStatus::Failed,
        "CANCELLED" => TaskStatus::Cancelled,
        "BLOCKED" => TaskStatus::Blocked,
        _ => TaskStatus::Queued,
    }
}

fn row_to_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
    let created: DateTime<Utc> = row.get::<_, String>(8)?.parse()
        .map_err(|e: chrono::ParseError| rusqlite::Error::FromSqlConversionFailure(8, rusqlite::types::Type::Text, Box::new(e)))?;
    let started = row.get::<_, Option<String>>(9)?.map(|v| v.parse()).transpose()
        .map_err(|e: chrono::ParseError| rusqlite::Error::FromSqlConversionFailure(9, rusqlite::types::Type::Text, Box::new(e)))?;
    let completed = row.get::<_, Option<String>>(10)?.map(|v| v.parse()).transpose()
        .map_err(|e: chrono::ParseError| rusqlite::Error::FromSqlConversionFailure(10, rusqlite::types::Type::Text, Box::new(e)))?;
    let parents: Vec<String> = serde_json::from_str(&row.get::<_, String>(14)?).unwrap_or_default();
    let domains: Vec<String> = serde_json::from_str(&row.get::<_, String>(18)?).unwrap_or_default();
    Ok(Task {
        id: row.get(0)?,
        repo_root: row.get(1)?,
        name: row.get(2)?,
        task_type: row.get(3)?,
        prompt: row.get(4)?,
        agent: row.get(5)?,
        model: row.get(6)?,
        status: parse_status(&row.get::<_, String>(7)?),
        created_at: created,
        started_at: started,
        completed_at: completed,
        branch_name: row.get(11)?,
        source_commit: row.get(12)?,
        source_branch: row.get(13)?,
        parent_ids: parents,
        workspace_path: row.get(15)?,
        sandbox_id: row.get(16)?,
        network_isolation: row.get::<_, i32>(17)? != 0,
        allowed_domains: domains,
        interactive: row.get::<_, i32>(19)? != 0,
        retry_count: row.get::<_, i64>(20)? as u32,
        error_message: row.get(21)?,
        result_message: row.get(22)?,
    })
}

