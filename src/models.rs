use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    Queued,
    Running,
    Complete,
    Failed,
    Cancelled,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Task {
    pub id: String,
    pub repo_root: String,
    pub name: String,
    pub task_type: String,
    pub prompt: String,
    pub agent: String,
    pub model: Option<String>,
    pub status: TaskStatus,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub branch_name: String,
    pub source_commit: String,
    pub source_branch: Option<String>,
    pub parent_ids: Vec<String>,
    pub workspace_path: Option<String>,
    pub sandbox_id: Option<String>,
    pub network_isolation: bool,
    pub allowed_domains: Vec<String>,
    pub interactive: bool,
    pub retry_count: u32,
    pub error_message: Option<String>,
    pub result_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTask {
    pub repo_root: String,
    pub name: String,
    pub task_type: String,
    pub prompt: String,
    pub agent: String,
    pub model: Option<String>,
    pub parent_ids: Vec<String>,
    pub network_isolation: bool,
    pub allowed_domains: Vec<String>,
    pub interactive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskLog {
    pub task_id: String,
    pub sequence: i64,
    pub stream: String,
    pub line: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DashboardSnapshot {
    pub tasks: Vec<Task>,
    pub counts: StatusCounts,
    pub runtime: RuntimeInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StatusCounts {
    pub queued: usize,
    pub running: usize,
    pub complete: usize,
    pub failed: usize,
    pub cancelled: usize,
    pub blocked: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RuntimeInfo {
    pub version: String,
    pub shared_network: String,
    pub review_engine: String,
    pub llm_endpoint_configured: bool,
    pub agent_support: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewFinding {
    pub rule_id: String,
    pub severity: String,
    pub category: String,
    pub path: String,
    pub start_line: usize,
    pub end_line: usize,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewReport {
    pub task_id: Option<String>,
    pub repo: String,
    pub engine: String,
    pub status: String,
    pub score: Option<u32>,
    pub findings: Vec<ReviewFinding>,
    pub output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchitectureGraph {
    pub root: String,
    pub nodes: Vec<ArchitectureNode>,
    pub edges: Vec<ArchitectureEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchitectureNode {
    pub id: String,
    pub label: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchitectureEdge {
    pub from: String,
    pub to: String,
    pub relation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiProbe {
    pub endpoint: String,
    pub status: u16,
    pub latency_ms: u128,
    pub models: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CraftFeature {
    pub name: String,
    pub category: String,
    pub description: String,
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CraftProposal {
    pub title: String,
    pub problem: String,
    pub feasibility: u32,
    pub features: Vec<String>,
    pub implementation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CraftPlan {
    pub repo: String,
    pub features: Vec<CraftFeature>,
    pub suggestions: Vec<CraftProposal>,
    pub next_steps: Vec<String>,
}
