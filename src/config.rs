use std::{env, fs, path::{Path, PathBuf}};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub data_dir: PathBuf,
    pub container_engine: String,
    pub default_agent: String,
    pub default_model: String,
    pub llm_base_url: Option<String>,
    pub llm_key_file: Option<PathBuf>,
    pub network_isolation: bool,
    pub allowed_domains: Vec<String>,
    pub worker_count: usize,
    pub sandbox_image: String,
    pub review_image: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            data_dir: dirs::data_dir().unwrap_or_else(|| PathBuf::from("/tmp")).join("gc"),
            container_engine: "docker".into(),
            default_agent: "codex".into(),
            default_model: "nvidia/nemotron-3.5-lightning-30b-a3b".into(),
            llm_base_url: env::var("GC_API_URL").ok().or_else(|| env::var("GC_API_URL_FILE").ok().and_then(|p| fs::read_to_string(p).ok()).map(|s| s.trim().to_string())),
            llm_key_file: env::var("GC_API_KEY_FILE").ok().map(PathBuf::from),
            network_isolation: true,
            allowed_domains: vec![
                "github.com".into(),
                "raw.githubusercontent.com".into(),
                "api.github.com".into(),
                "crates.io".into(),
                "static.crates.io".into(),
                "index.crates.io".into(),
                "registry.npmjs.org".into(),
                "npmjs.com".into(),
                "pypi.org".into(),
            ],
            worker_count: 2,
            sandbox_image: "gc-agent:local".into(),
            review_image: "gc-review:local".into(),
        }
    }
}

impl Config {
    pub fn load(project_root: &Path) -> Result<Self> {
        let mut cfg = Self::default();
        if let Ok(data_dir) = env::var("GC_DATA_DIR") {
            cfg.data_dir = PathBuf::from(data_dir);
        }
        let path = project_root.join(".gc").join("config.toml");
        if path.exists() {
            let text = fs::read_to_string(&path).context("read .gc/config.toml")?;
            let file_cfg: Config = toml::from_str(&text).context("parse .gc/config.toml")?;
            cfg = file_cfg;
        }
        Ok(cfg)
    }

    pub fn ensure_dirs(&self) -> Result<()> {
        fs::create_dir_all(&self.data_dir)?;
        fs::create_dir_all(self.data_dir.join("tasks"))?;
        fs::create_dir_all(self.data_dir.join("logs"))?;
        Ok(())
    }
}

