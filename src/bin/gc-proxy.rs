use std::{collections::HashSet, env, sync::Arc};
use anyhow::{Context, Result};
use tokio::{io::{AsyncReadExt, AsyncWriteExt}, net::{TcpListener, TcpStream}};

const MAX_HEADER: usize = 64 * 1024;

#[tokio::main]
async fn main() -> Result<()> {
    let listen = env::var("GC_PROXY_LISTEN").unwrap_or_else(|_| "0.0.0.0:3128".into());
    let allowed = env::var("GC_PROXY_ALLOW").unwrap_or_default()
        .split(',')
        .map(|v| v.trim().to_ascii_lowercase())
        .filter(|v| !v.is_empty())
        .collect::<HashSet<_>>();

    if allowed.is_empty() {
        anyhow::bail!("GC_PROXY_ALLOW must contain at least one hostname");
    }

    let allowed = Arc::new(allowed);
    let listener = TcpListener::bind(&listen).await?;
    eprintln!("gc-proxy listening on {listen}");

    loop {
        let (stream, peer) = listener.accept().await?;
        let allowed = allowed.clone();
        tokio::spawn(async move {
            if let Err(error) = handle(stream, &allowed).await {
                eprintln!("gc-proxy {peer}: {error}");
            }
        });
    }
}

async fn handle(mut client: TcpStream, allowed: &HashSet<String>) -> Result<()> {
    let mut buffer = Vec::with_capacity(4096);
    loop {
        let mut byte = [0u8; 1024];
        let count = client.read(&mut byte).await?;
        if count == 0 {
            return Ok(());
        }
        buffer.extend_from_slice(&byte[..count]);
        if buffer.len() > MAX_HEADER {
            anyhow::bail!("proxy header too large");
        }
        if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
    }

    let header_end = buffer.windows(4).position(|window| window == b"\r\n\r\n")
        .context("missing request header terminator")? + 4;
    let header = &buffer[..header_end];
    let request = String::from_utf8_lossy(header);
    let mut lines = request.lines();
    let request_line = lines.next().context("empty proxy request")?;
    let mut fields = request_line.split_whitespace();
    let method = fields.next().unwrap_or_default();
    let target = fields.next().unwrap_or_default();

    if method.eq_ignore_ascii_case("CONNECT") {
        let (host, port) = parse_connect_target(target)?;
        check_allowed(allowed, &host)?;
        if port != 443 && port != 80 {
            anyhow::bail!("destination port {port} not allowed");
        }

        let upstream = TcpStream::connect((host.as_str(), port)).await
            .with_context(|| format!("connect upstream {host}:{port}"))?;
        client.write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n").await?;

        let (mut cr, mut cw) = client.into_split();
        let (mut ur, mut uw) = upstream.into_split();
        let a = tokio::io::copy(&mut cr, &mut uw);
        let b = tokio::io::copy(&mut ur, &mut cw);
        let _ = tokio::try_join!(a, b)?;
        return Ok(());
    }

    anyhow::bail!("only HTTP CONNECT proxying is supported")
}

fn parse_connect_target(target: &str) -> Result<(String, u16)> {
    let mut parts = target.rsplitn(2, ':');
    let port = parts.next().context("missing port")?.parse::<u16>().context("invalid port")?;
    let host = parts.next().context("missing host")?.trim().trim_matches(['[', ']']);
    if host.is_empty() { anyhow::bail!("missing host"); }
    Ok((host.to_ascii_lowercase(), port))
}

fn check_allowed(allowed: &HashSet<String>, host: &str) -> Result<()> {
    if allowed.contains(host) {
        return Ok(());
    }
    if let Some(stripped) = host.strip_prefix("www.") {
        if allowed.contains(stripped) {
            return Ok(());
        }
    }
    anyhow::bail!("destination {host} is not in GC_PROXY_ALLOW")
}

