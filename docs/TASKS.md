# TASKS — GitCraft

> Stand: CHECK_2026-09-28_172253.md

## M1 — Core Platform (SSR + Task Fabric + AST Engine) [DONE]
- [x] Dioxus Fullstack Web App (SSR + WASM Hydration)
- [x] Task Engine mit tokio Scheduler und Semaphore
- [x] SQLite WAL Task Store (CRUD + Logs + Dashboard)
- [x] Dioxus Server Functions (dashboard, create, cancel, retry, delete, clean, review, architecture, probe)
- [x] Axum Internal API (/api/internal/goal/tasks, Bearer Token auth)
- [x] Native AST CodeGraph (tree-sitter: Rust, TS, JS, Python, Go)
- [x] Capability Rules Engine (algorithms/code/capabilities.json)
- [x] Native AST Review Engine (algorithms/review/rules.json)
- [x] Code Vault (SQLite FTS5, Snapshots, Artifacts, gc:// URIs)
- [x] Craft Planner (LLM + Fallback)
- [x] LLM Client (OpenAI-kompatibel, reqwest, server-side only)
- [x] Native GC Action Agent (JSON action loop, 80 steps)
- [x] CLI (gc: add/run/list/review/scan/index/search/agent/craft/tui/acp/shell)
- [x] HTTP CONNECT Proxy (gc-proxy, nativer Rust, Port 3128, GC_PROXY_ALLOW)
- [x] TUI (Ratatui + crossterm)
- [x] ACP Server (agent-client-protocol v2, stdio)
- [x] Docker Container (gc:local, gc.eysho.info, Traefik TLS)
- [x] Git Workspace (Clone + Branch + Commit + Fetch-back)

## M2 — Sandbox-Images (gc-agent:local + gc-proxy:local) [BLOCKED by M1-Dockerfile-Pfad]
- [ ] `sandbox/proxy/Dockerfile` ENTRYPOINT auf `/usr/local/bin/gc-proxy` korrigieren
- [ ] `docker compose --profile sandbox-images build gc-agent gc-proxy` erfolgreich
- [ ] Sandbox Smoke-Test: Task queuen → Status Complete → Branch vorhanden

## M3 — End-to-End Agent Run (GC Agent durch gesamte Kette) [TODO — wartet auf M2]
- [ ] LLM-Secrets in Container konfiguriert und verifiziert
- [ ] `gc run --agent gc "echo hello"` → Task Complete + Branch
- [ ] Vollständige Kette Client → Server → Engine → Sandbox → Agent → Branch → Response

## M4 — CI / Automated Testing [TODO]
- [ ] `cargo test` mit mindestens Store, Engine, Review, Vault Unit-Tests
- [ ] `cargo clippy` clean
- [ ] Compose healthcheck als CI-Smoke

## Erkannte Lücken (kein Scope)
- Keine E2E-Tests (kein automatisierter Browsertest der Web-UI)
- `bkg-craft` Binary nicht vollständig analysiert
- Dioxus.toml referenziert `assets/bkg-gc.css`, Asset heißt `assets/gc.css`
