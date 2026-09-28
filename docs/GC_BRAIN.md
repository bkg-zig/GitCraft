# GC Brain

## Scope
- Product root: /workspace/bkg-alpha/GitCraft
- Public target: https://gc.eysho.info
- Product identity: `gc` / GitCraft. No BKG-prefixed runtime product name.

## Reference sources
- `vendor/tsk-tsk`: MIT reference for task/sandbox lifecycle. No runtime dependency.
- `vendor/zerostack`: GPL-3.0-only reference. Architecture/features only, no source copied.
- `vendor/open-code-review`: Apache-2.0 reference. AST/review concepts only, native GC implementation.
- `vendor/OpenViking`: AGPL-3.0 reference. Context/vault concepts only, native GC implementation.

## Native subsystems
- `src/codegraph.rs`: Tree-sitter AST graph and code-derived capability extraction. Ignores `vendor/`, `legacy/`, `.git`, `target` and markdown.
- `src/review.rs`: deterministic AST review rules loaded from `algorithms/review/rules.json`.
- `src/vault.rs`: native code/context vault at `.gc/vault/vault.sqlite`, including FTS5 and source provenance.
- `src/agent.rs`: native GC action agent.
- `src/sandbox.rs`: per-task internal network + isolated agent container + allowlisted egress proxy.
- `src/bin/gc-proxy.rs`: native HTTP CONNECT proxy.
- `src/tui.rs`: native CLI TUI.
- `src/acp.rs`: ACP endpoint backed by Engine/Sandbox.

## Truth rule
Feature claims must originate from executable source AST and structural code evidence. README/Markdown/comment text is not a feature source.

## Secrets
- Source secret files: `secrets/api_url`, `secrets/api_key`, mode 600.
- Runtime paths: `/run/secrets/gc_api_url`, `/run/secrets/gc_llm_key`.
- Keys are never sent to the browser.

## Deployment
- Compose: `docker-compose.yml` in this folder.
- Traefik/TLS remains external in the Core network `bkg_net`.
- No host port mapping.
- `gc` container uses Docker socket only for sandbox orchestration.
- Sandbox images: `gc-agent:local`, `gc-proxy:local`.

## Verified
- `cargo check --all-targets` reached exit 0 before the latest agent/proxy edits.
- Native code scan produced 34 source files / 3077 AST features before legacy exclusion; markdown/vendor/legacy exclusion was then corrected.
- Secret endpoint `/models` previously returned HTTP 200 with 81 models.
- OpenCodeReview package was installed earlier for reference verification, but native GC review no longer invokes it.

## Next verification
1. `cargo check --all-targets`
2. `cargo test --all-targets`
3. `gc scan/index/search/review`
4. native Dioxus build
5. Compose image build
6. sandbox image build
7. `docker compose up -d`
8. live HTTPS checks on `gc.eysho.info`
