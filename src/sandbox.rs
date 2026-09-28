use std::{fs, path::{Path, PathBuf}, process::Stdio};
use anyhow::{Context, Result};
use tokio::process::Command;

use crate::{agents::Agent, config::Config, models::Task};

#[derive(Clone)]
pub struct SandboxRunner {
    config: Config,
}

impl SandboxRunner {
    pub fn new(config: Config) -> Self { Self { config } }

    pub async fn run(&self, task: &Task, workspace: &Path, agent: &Agent) -> Result<String> {
        let network = format!("gc-net-{}", sanitize(&task.id));
        let proxy = format!("gc-proxy-{}", sanitize(&task.id));
        let container = format!("gc-agent-{}", sanitize(&task.id));

        create_network(&network).await?;
        ensure_image(&self.config.sandbox_image, "sandbox/agent/Dockerfile").await?;
        ensure_image("gc-proxy:local", "sandbox/proxy/Dockerfile").await?;
        ensure_network("gc-egress", false).await?;
        let result = self.run_with_network(task, workspace, agent, &network, &proxy, &container).await;

        let _ = docker(&["rm", "-f", &proxy]).await;
        let _ = docker(&["rm", "-f", &container]).await;
        let _ = docker(&["network", "rm", &network]).await;
        result
    }

    async fn run_with_network(
        &self, task: &Task, workspace: &Path, agent: &Agent,
        network: &str, proxy: &str, container: &str
    ) -> Result<String> {
        let secret_path = std::env::var("GC_HOST_API_KEY_FILE").ok().map(PathBuf::from)
            .filter(|p| p.is_file())
            .or_else(|| self.config.llm_key_file.as_ref().filter(|p| p.is_file()).cloned());
        let url_secret_path = std::env::var("GC_API_URL_FILE").ok().map(PathBuf::from)
            .filter(|p| p.is_file());

        let llm_url = self.config.llm_base_url.clone().unwrap_or_default();
        let mut domains = self.config.allowed_domains.clone();
        if let Some(host) = host_from_url(&llm_url) {
            if !domains.iter().any(|d| d == &host) { domains.push(host); }
        }

        docker(&["run", "-d", "--name", proxy, "--network", network,
            "--cap-drop", "ALL", "--read-only",
            "-e", &format!("GC_PROXY_ALLOW={}", domains.join(",")),
            "gc-proxy:local"]).await?;
        ensure_egress_network().await?;
        docker(&["network", "connect", "gc-egress", proxy]).await?;

        let prompt_file = task_dir(workspace)?.join("instructions.md");
        fs::write(&prompt_file, &task.prompt)?;

        let mut args: Vec<String> = vec![
            "run".into(), "--rm".into(), "--name".into(), container.into(),
            "--network".into(), network.into(),
            "--workdir".into(), "/workspace".into(),
            "-e".into(), format!("HTTP_PROXY=http://{proxy}:3128"),
            "-e".into(), format!("HTTPS_PROXY=http://{proxy}:3128"),
            "-e".into(), format!("http_proxy=http://{proxy}:3128"),
            "-e".into(), format!("https_proxy=http://{proxy}:3128"),
            "-e".into(), "NO_PROXY=localhost,127.0.0.1".into(),
            "-e".into(), "no_proxy=localhost,127.0.0.1".into(),
            "-v".into(), format!("{}:/workspace", workspace.display()),
            "-v".into(), format!("{}:/instructions:ro", prompt_file.display()),
            "--cap-drop".into(), "ALL".into(),
            "--security-opt".into(), "no-new-privileges:true".into(),
        ];
        if let Some(key_path) = secret_path {
            args.push("-v".into());
            args.push(format!("{}:/run/secrets/gc_llm_key:ro", key_path.display()));
            args.push("-e".into());
            args.push("GC_API_KEY_FILE=/run/secrets/gc_llm_key".into());
        }
        if let Some(url_path) = url_secret_path {
            args.push("-v".into());
            args.push(format!("{}:/run/secrets/gc_api_url:ro", url_path.display()));
            args.push("-e".into());
            args.push("GC_API_URL_FILE=/run/secrets/gc_api_url".into());
        } else {
            args.push("-e".into());
            args.push(format!("GC_API_URL={llm_url}"));
        }
        args.push(self.config.sandbox_image.clone());
        args.push("/bin/sh".into());
        args.push("-lc".into());
        args.push(agent.command(Path::new("/instructions")));

        let output = Command::new("docker").args(args).stdout(Stdio::piped()).stderr(Stdio::piped())
            .output().await.context("run gc agent container")?;
        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        if !output.status.success() {
            anyhow::bail!("agent container exited with {}: {}", output.status, tail(&stderr, 3000));
        }
        Ok(tail(if stdout.is_empty() { &stderr } else { &stdout }, 5000))
    }

    pub async fn shell(&self, workspace: &Path, task_id: &str) -> Result<()> {
        let network = format!("gc-net-{}", sanitize(task_id));
        create_network(&network).await?;
        let status = Command::new("docker").args([
            "run", "--rm", "-it", "--network", &network, "--workdir", "/workspace",
            "-v", &format!("{}:/workspace", workspace.display()),
            "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
            &self.config.sandbox_image, "/bin/bash"
        ]).status().await?;
        let _ = docker(&["network", "rm", &network]).await;
        if !status.success() { anyhow::bail!("sandbox shell exited with {status}"); }
        Ok(())
    }
}

async fn ensure_image(image: &str, dockerfile: &str) -> Result<()> {
    let inspect = Command::new("docker").args(["image", "inspect", image]).output().await?;
    if inspect.status.success() { return Ok(()); }
    let context = std::env::var("GC_PROJECT_ROOT").unwrap_or_else(|_| "/workspace/bkg-alpha/GitCraft".into());
    let path = format!("{context}/{dockerfile}");
    let out = Command::new("docker").args(["build", "-t", image, "-f", &path, &context]).output().await?;
    if !out.status.success() {
        anyhow::bail!("docker build {image} failed: {}", String::from_utf8_lossy(&out.stderr));
    }
    Ok(())
}

async fn ensure_network(name: &str, internal: bool) -> Result<()> {
    let inspect = Command::new("docker").args(["network", "inspect", name]).output().await?;
    if inspect.status.success() { return Ok(()); }
    let mut args = vec!["network", "create", "--attachable", "--driver", "bridge"];
    if internal { args.push("--internal"); }
    args.push(name);
    let out = Command::new("docker").args(args).output().await?;
    if !out.status.success() {
        anyhow::bail!("docker network create failed: {}", String::from_utf8_lossy(&out.stderr));
    }
    Ok(())
}

async fn create_network(name: &str) -> Result<()> {
    let out = Command::new("docker").args([
        "network", "create", "--internal", "--attachable", "--driver", "bridge", name
    ]).output().await?;
    if !out.status.success() {
        anyhow::bail!("docker network create failed: {}", String::from_utf8_lossy(&out.stderr));
    }
    Ok(())
}

async fn ensure_egress_network() -> Result<()> {
    let check = Command::new("docker").args(["network", "inspect", "gc-egress"]).output().await?;
    if check.status.success() { return Ok(()); }
    let create = Command::new("docker").args(["network", "create", "--driver", "bridge", "gc-egress"]).output().await?;
    if !create.status.success() {
        anyhow::bail!("docker egress network create failed: {}", String::from_utf8_lossy(&create.stderr));
    }
    Ok(())
}

async fn docker(args: &[&str]) -> Result<()> {
    let out = Command::new("docker").args(args).output().await?;
    if !out.status.success() {
        anyhow::bail!("docker {} failed: {}", args.join(" "), String::from_utf8_lossy(&out.stderr));
    }
    Ok(())
}

fn task_dir(workspace: &Path) -> Result<PathBuf> {
    workspace.parent().map(Path::to_path_buf).context("missing task directory")
}

fn sanitize(input: &str) -> String {
    input.chars().map(|c| if c.is_ascii_alphanumeric() { c } else { '-' }).collect()
}

fn tail(value: &str, max: usize) -> String {
    if value.len() <= max { return value.to_string(); }
    value[value.len()-max..].to_string()
}

fn host_from_url(url: &str) -> Option<String> {
    let without = url.split("://").nth(1).unwrap_or(url);
    let host = without.split('/').next()?.split(':').next()?.trim();
    (!host.is_empty()).then(|| host.to_string())
}

