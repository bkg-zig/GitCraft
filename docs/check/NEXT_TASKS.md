# NEXT_TASKS — Stand: 2026-09-28_172253

Aktueller Milestone: M2 — Sandbox-Images (gc-agent:local + gc-proxy:local)
Status: BLOCKED (Dockerfile-Pfadfehler, siehe unten)

## Blocker

`sandbox/proxy/Dockerfile` enthält:
```
ENTRYPOINT ["/app/target/release/gc-proxy"]
```
Das gc:local-Image legt `gc-proxy` aber unter `/usr/local/bin/gc-proxy` ab (Dockerfile Zeile 25).
Der Pfad `/app/target/release/gc-proxy` existiert im finalen Image nicht.

Nächster möglicher Schritt: Zeile 3 in `sandbox/proxy/Dockerfile` auf `ENTRYPOINT ["/usr/local/bin/gc-proxy"]` korrigieren, dann Sandbox-Images bauen.

## Tasks (nach Auflösung des Blockers)

- [ ] Task 1: `sandbox/proxy/Dockerfile` ENTRYPOINT auf `/usr/local/bin/gc-proxy` korrigieren
- [ ] Task 2: `docker compose --profile sandbox-images build gc-agent gc-proxy` — beide Images erfolgreich bauen
- [ ] Task 3: Smoke-Test Sandbox — `gc run --agent gc "echo hello"` oder äquivalent über Web-UI queuen
- [ ] Task 4: Prüfen dass Task-Status `Complete` erreicht wird und ein Branch im Source-Repo entsteht
- [ ] Task 5: `docker logs` des Agent-Containers auf Exit-0 prüfen

## Nicht in diesem Milestone
- M3 (End-to-End Agent Run) — TODO, wartet auf M2
- M4 (CI / Automated Testing) — TODO, unabhängig parallel möglich

## Definition of Done für M2
- Build fehlerfrei: `docker compose --profile sandbox-images build` exit 0
- `docker images | grep gc-agent` und `docker images | grep gc-proxy` zeigen gebaute Images
- Tatsächlicher HTTP-Request durch die gesamte Kette:
  - Client → POST /api/gc/tasks → Task Queued
  - Scheduler startet Task → Sandbox-Container läuft
  - Agent-Container exit 0
  - Task-Status → Complete
  - Branch im Source-Repo vorhanden (`git branch | grep gc/`)
- Response-Inhalt verifiziert: `task.result_message` nicht leer, `task.status == "COMPLETE"`
