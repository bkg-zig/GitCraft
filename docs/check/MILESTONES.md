# MILESTONES — Stand: 2026-09-28_172253

Letzter Check: CHECK_2026-09-28_172253.md

| Milestone | Name                                              | Status | Abhängigkeit | Nachweis                          |
|-----------|---------------------------------------------------|--------|--------------|-----------------------------------|
| M1        | Core Platform (SSR + Task Fabric + AST Engine)    | DONE   | —            | CHECK_2026-09-28_172253.md        |
| M2        | Sandbox-Images (gc-agent:local + gc-proxy:local)  | TODO   | M1           | —                                 |
| M3        | End-to-End Agent Run (GC Agent + Branch)          | TODO   | M2           | —                                 |
| M4        | CI / Automated Testing                            | TODO   | M1           | —                                 |

## Nächster ausführbarer Milestone
M2 — Sandbox-Images (gc-agent:local + gc-proxy:local)

## Blocker
M2: `sandbox/proxy/Dockerfile` referenziert `/app/target/release/gc-proxy` — im gc:local-Image liegt das Binary aber unter `/usr/local/bin/gc-proxy`. Muss vor dem Sandbox-Image-Build korrigiert werden.
