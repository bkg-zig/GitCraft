use std::{fs, path::{Path, PathBuf}, process::Stdio};
use anyhow::{Context, Result};
use git2::Repository;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

#[derive(Debug, Clone)]
pub struct PreparedWorkspace {
    pub path: PathBuf,
    pub source_commit: String,
    pub source_branch: Option<String>,
    pub branch_name: String,
}

pub fn repo_head(repo_root: &Path) -> Result<(String, Option<String>)> {
    let repo = Repository::discover(repo_root).context("discover git repository")?;
    let head = repo.head()?;
    let commit = head.peel_to_commit()?.id().to_string();
    let branch = head.shorthand().map(str::to_string);
    Ok((commit, branch))
}

pub async fn prepare_workspace(repo_root: &Path, data_dir: &Path, task_id: &str) -> Result<PreparedWorkspace> {
    let repo_root = fs::canonicalize(repo_root).context("canonicalize repository")?;
    let (source_commit, source_branch) = repo_head(&repo_root)?;
    let task_dir = data_dir.join("tasks").join(task_id);
    let workspace = task_dir.join("repo");
    fs::create_dir_all(&task_dir)?;
    if workspace.exists() { fs::remove_dir_all(&workspace)?; }

    let status = Command::new("git")
        .args(["clone", "--no-hardlinks", "--local"])
        .arg(&repo_root).arg(&workspace)
        .stdout(Stdio::null()).stderr(Stdio::piped()).output().await
        .context("clone repository workspace")?;
    if !status.status.success() {
        anyhow::bail!("git clone failed: {}", String::from_utf8_lossy(&status.stderr));
    }

    let branch_name = format!("gc/{task_id}");
    git_cmd(&workspace, &["switch", "-c", &branch_name]).await?;

    let diff = Command::new("git").arg("-C").arg(&repo_root).args(["diff", "--binary", "HEAD"]).output().await?;
    if !diff.stdout.is_empty() {
        let mut child = Command::new("git").arg("-C").arg(&workspace).args(["apply", "--binary", "-"])
            .stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::piped()).spawn()?;
        child.stdin.take().unwrap().write_all(&diff.stdout).await?;
        let out = child.wait_with_output().await?;
        if !out.status.success() {
            anyhow::bail!("git apply working tree diff failed: {}", String::from_utf8_lossy(&out.stderr));
        }
    }

    let untracked = Command::new("git").arg("-C").arg(&repo_root)
        .args(["ls-files", "--others", "--exclude-standard"]).output().await?;
    if untracked.status.success() {
        for raw in String::from_utf8_lossy(&untracked.stdout).lines() {
            let src = repo_root.join(raw);
            let dst = workspace.join(raw);
            if let Some(parent) = dst.parent() { fs::create_dir_all(parent)?; }
            if src.is_file() { fs::copy(&src, &dst)?; }
        }
    }

    Ok(PreparedWorkspace { path: workspace, source_commit, source_branch, branch_name })
}

pub async fn commit_and_return_branch(workspace: &Path, source_repo: &Path, branch: &str, task_name: &str) -> Result<String> {
    git_cmd(workspace, &["add", "-A"]).await?;
    let diff = Command::new("git").arg("-C").arg(workspace).args(["diff", "--cached", "--quiet"]).status().await?;
    if diff.success() {
        return fetch_branch(source_repo, workspace, branch).await;
    }
    git_cmd(workspace, &["commit", "-m", task_name]).await?;
    fetch_branch(source_repo, workspace, branch).await
}

async fn fetch_branch(source_repo: &Path, workspace: &Path, branch: &str) -> Result<String> {
    let refspec = format!("{branch}:refs/heads/{branch}");
    git_cmd(source_repo, &["fetch", workspace.to_string_lossy().as_ref(), &refspec]).await?;
    Ok(git_cmd_capture(source_repo, &["rev-parse", &format!("refs/heads/{branch}")]).await?.trim().to_string())
}

async fn git_cmd(repo: &Path, args: &[&str]) -> Result<()> {
    let out = Command::new("git").arg("-C").arg(repo).args(args).output().await?;
    if !out.status.success() { anyhow::bail!("git {} failed: {}", args.join(" "), String::from_utf8_lossy(&out.stderr)); }
    Ok(())
}

async fn git_cmd_capture(repo: &Path, args: &[&str]) -> Result<String> {
    let out = Command::new("git").arg("-C").arg(repo).args(args).output().await?;
    if !out.status.success() { anyhow::bail!("git {} failed: {}", args.join(" "), String::from_utf8_lossy(&out.stderr)); }
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

