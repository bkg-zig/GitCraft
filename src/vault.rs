use std::{path::{Path, PathBuf}, sync::{Arc, Mutex}};
use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use sha2::{Digest, Sha256};
use crate::{codegraph::CodeFeature, models::CraftPlan};

#[derive(Clone)]
pub struct Vault {
    root: PathBuf,
    conn: Arc<Mutex<Connection>>,
}

impl Vault {
    pub fn open(repo: &Path) -> Result<Self> {
        let root = repo.join(".gc").join("vault");
        std::fs::create_dir_all(&root)?;
        let conn = Connection::open(root.join("vault.sqlite")).context("open GC code vault")?;
        let vault = Self { root, conn: Arc::new(Mutex::new(conn)) };
        vault.migrate()?;
        vault.record_algorithm("gc-codegraph", "1.0.0", "Tree-sitter source AST feature extraction; Markdown/docs excluded")?;
        Ok(vault)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("vault mutex poisoned"))?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             CREATE TABLE IF NOT EXISTS algorithms (
               name TEXT PRIMARY KEY,
               version TEXT NOT NULL,
               description TEXT NOT NULL,
               created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
             );
             CREATE TABLE IF NOT EXISTS snapshots (
               id INTEGER PRIMARY KEY,
               content_hash TEXT NOT NULL,
               root TEXT NOT NULL,
               feature_count INTEGER NOT NULL,
               created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
             );
             CREATE TABLE IF NOT EXISTS features (
               id INTEGER PRIMARY KEY,
               snapshot_id INTEGER NOT NULL,
               path TEXT NOT NULL,
               language TEXT NOT NULL,
               kind TEXT NOT NULL,
               symbol TEXT NOT NULL,
               detail TEXT NOT NULL,
               start_line INTEGER NOT NULL,
               end_line INTEGER NOT NULL,
               fingerprint TEXT NOT NULL,
               UNIQUE(snapshot_id, fingerprint),
               FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
             );
             CREATE TABLE IF NOT EXISTS artifacts (
               uri TEXT PRIMARY KEY,
               kind TEXT NOT NULL,
               content_hash TEXT NOT NULL,
               content TEXT NOT NULL,
               parent_uri TEXT,
               created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
             );
             CREATE VIRTUAL TABLE IF NOT EXISTS feature_search USING fts5(
               fingerprint UNINDEXED,
               path,
               symbol,
               detail,
               content='features',
               content_rowid='id'
             );
             CREATE TRIGGER IF NOT EXISTS feature_ai AFTER INSERT ON features BEGIN
               INSERT INTO feature_search(rowid,fingerprint,path,symbol,detail)
               VALUES (new.id,new.fingerprint,new.path,new.symbol,new.detail);
             END;
             CREATE INDEX IF NOT EXISTS idx_features_snapshot ON features(snapshot_id);
             CREATE INDEX IF NOT EXISTS idx_artifacts_parent ON artifacts(parent_uri);"
        )?;
        Ok(())
    }

    pub fn record_algorithm(&self, name: &str, version: &str, description: &str) -> Result<()> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("vault mutex poisoned"))?;
        conn.execute(
            "INSERT INTO algorithms(name,version,description) VALUES(?1,?2,?3)
             ON CONFLICT(name) DO UPDATE SET version=excluded.version,description=excluded.description",
            params![name, version, description],
        )?;
        Ok(())
    }

    pub fn store_code_snapshot(&self, root: &str, files: &[(String, String)], features: &[CodeFeature]) -> Result<i64> {
        let mut hash = Sha256::new();
        hash.update(root.as_bytes());
        for (path, content_hash) in files {
            hash.update(path.as_bytes());
            hash.update(content_hash.as_bytes());
        }
        let snapshot_hash = hex(&hash.finalize());
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("vault mutex poisoned"))?;
        conn.execute("INSERT INTO snapshots(content_hash,root,feature_count) VALUES(?1,?2,?3)",
            params![snapshot_hash, root, features.len() as i64])?;
        let snapshot_id = conn.last_insert_rowid();
        for feature in features {
            conn.execute(
                "INSERT OR IGNORE INTO features(snapshot_id,path,language,kind,symbol,detail,start_line,end_line,fingerprint)
                 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                params![
                    snapshot_id, feature.path, feature.language, feature.kind, feature.symbol,
                    feature.detail, feature.start_line as i64, feature.end_line as i64, feature.fingerprint
                ],
            )?;
        }
        Ok(snapshot_id)
    }

    pub fn save_artifact(&self, uri: &str, kind: &str, content: &str, parent_uri: Option<&str>) -> Result<String> {
        let content_hash = hex(&Sha256::digest(content.as_bytes()));
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("vault mutex poisoned"))?;
        conn.execute(
            "INSERT OR REPLACE INTO artifacts(uri,kind,content_hash,content,parent_uri) VALUES(?1,?2,?3,?4,?5)",
            params![uri,kind,content_hash,content,parent_uri],
        )?;
        Ok(content_hash)
    }

    pub fn save_craft_plan(&self, plan: &CraftPlan) -> Result<String> {
        let content = serde_json::to_string_pretty(plan)?;
        self.save_artifact("craft://plans/latest", "craft-plan", &content, Some("craft://plans"))
    }

    pub fn search_features(&self, query: &str, limit: usize) -> Result<Vec<CodeFeature>> {
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("vault mutex poisoned"))?;
        let mut stmt = conn.prepare(
            "SELECT f.path,f.language,f.kind,f.symbol,f.detail,f.start_line,f.end_line,f.fingerprint
             FROM feature_search s
             JOIN features f ON f.id=s.rowid
             WHERE feature_search MATCH ?1
             ORDER BY rank LIMIT ?2"
        )?;
        let rows = stmt.query_map(params![query, limit as i64], |r| {
            Ok(CodeFeature {
                path:r.get(0)?, language:r.get(1)?, kind:r.get(2)?, symbol:r.get(3)?,
                detail:r.get(4)?, start_line:r.get::<_,i64>(5)? as usize,
                end_line:r.get::<_,i64>(6)? as usize, fingerprint:r.get(7)?
            })
        })?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn path(&self) -> &Path { &self.root }
}

fn hex(bytes: &[u8]) -> String {
    const H: &[u8] = b"0123456789abcdef";
    bytes.iter().flat_map(|b| [H[(b>>4) as usize] as char, H[(b&15) as usize] as char]).collect()
}
