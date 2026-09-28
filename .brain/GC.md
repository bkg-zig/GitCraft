# GC Brain / GitCraft

Stand: 2026-09-28

## Scope
Everything for this product stays inside /workspace/bkg-alpha/GitCraft.
Do not mutate /srv/bkg for this project.

## Product
gc.eysho.info is the GitCraft Dioxus application.
Native Rust targets: Dioxus Web UI, gc CLI, cyberpunk Ratatui TUI, bkg-craft planning/agent CLI, ACP server, isolated coding sandboxes, native AST code graph, native AST review engine, persistent code knowledge vault.

## Reference material
- vendor/tsk-tsk: sandbox/task orchestration reference. Recode ideas, never copy production implementation.
- vendor/zerostack: agent/ACP/memory/subagent/prompt-chain reference. Recode ideas, never copy production implementation.
- vendor/open-code-review: AST review/review workflow reference. Native replacement lives in src/review.rs.
- vendor/OpenViking: code/context/RAG filesystem reference. Native replacement lives in src/vault.rs.

## Source-of-truth rule
Feature harvesting MUST NOT use README, markdown, screenshots, or marketing text.
src/codegraph.rs ignores .md and vendor trees and parses source with Tree-sitter.
Capability rules live in algorithms/code/capabilities.json.
Review rules live in algorithms/review/rules.json.

## Native replacements
Code graph: src/codegraph.rs. It scans Rust, TypeScript/TSX, JavaScript/JSX, Python and Go; extracts functions, types, modules, imports, calls, attributes and declarations; fingerprints AST features; derives capabilities from deterministic rules; and produces architecture graph data.
Native review: src/review.rs. It evaluates AST nodes against algorithms/review/rules.json, reports path + line range + severity + rule id, persists the ruleset as an algorithm artifact, and does not require the external ocr binary.
Native code vault: src/vault.rs. It stores .gc/vault/vault.sqlite with WAL SQLite, code snapshots, AST feature records, FTS5 code-feature search, content-addressed hierarchical gc:// artifacts, algorithm registry, and craft-plan persistence.

## Agent lifecycle
Intent -> code harvest -> capability model -> proposal generation -> task graph -> isolated sandbox -> implementation -> native AST review -> branch handoff.
No feature is considered implemented merely because an LLM produced prose.

## Sandbox
src/sandbox.rs owns isolated repository workspace, isolated Docker network, proxy allowlist, privilege reduction, and branch return to the source repository.
Secrets must never be copied into source workspaces or printed.

## LLM
Endpoint and key come from project secrets: secrets/api_url and secrets/api_key.
Runtime reads Docker secrets under /run/secrets. Browser never receives the API key.

## Deployment
BKG Core owns Traefik/TLS and the external bkg_net. GitCraft owns only its application/container. No second Traefik instance.

## Verification
Never claim online until cargo check --all-targets, native code graph, native review, CLI help, TUI build, compose config, container health, live HTTPS /api/health, and live HTTPS homepage all pass.

## Environment note
The default /home/bkg/.cargo cache previously contained a broken cc 1.5.1 source state. Use a clean writable Cargo cache for verification.
## Deployment fix 2026-09-28
The runtime image and build image are both Debian Bookworm / glibc 2.36. A stale gc container had been running an older image whose gc-web required GLIBC_2.39. The current gc:local image was verified to require at most GLIBC_2.34. Compose was force-recreated onto the new image.
Dioxus 0.7.10 expects a public asset directory. Runtime now sets DIOXUS_PUBLIC_PATH=/app/public in both Dockerfile and docker-compose.yml.
Verified live: gc-gc-1 healthy; internal HTTP returns GitCraft SSR HTML; external https://gc.eysho.info/ returns HTTP 200 and GitCraft UI markers; recent container logs show no panic/glibc/error.
