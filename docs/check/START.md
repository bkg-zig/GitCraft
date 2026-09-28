# START — GitCraft

> Letzter Check: CHECK_2026-09-28_172253.md
> Stand: 2026-09-28

## Projekt
**Name:** GitCraft / gc  
**Zweck:** Native Rust Coding-Agent-Orchestrierung mit AST-Review, Code-Vault, isolierter Sandbox-Ausführung und Git-Delivery.  
**Domain:** gc.eysho.info

## Scope
- Alles innerhalb `/workspace/bkg-alpha/GitCraft/`
- Nicht anfassen: `/srv/bkg`, `/workspace/bkg-pc`, andere Projekte
- TLS/Traefik ist extern (Core-Netz `bkg_net`) — kein GitCraft-Scope

## Aktueller Milestone
M2 — Sandbox-Images (gc-agent:local + gc-proxy:local)

## Milestone-Status
BLOCKED

## Aktueller Blocker
`sandbox/proxy/Dockerfile` Zeile 3:
```
ENTRYPOINT ["/app/target/release/gc-proxy"]
```
Muss sein:
```
ENTRYPOINT ["/usr/local/bin/gc-proxy"]
```
Das Binary liegt im `gc:local`-Image unter `/usr/local/bin/gc-proxy` (Dockerfile Zeile 25), nicht unter dem alten Build-Pfad.

## Aktuelle Tasks
→ siehe NEXT_TASKS.md

## Out-of-Scope
- Traefik/TLS-Konfiguration (extern/Core)
- `legacy/react-prototype/` — archiviert, kein Produktionscode
- `vendor/` — nur Referenz, kein Produktionscode

## Definition of Done (M2)
- `docker compose --profile sandbox-images build` exit 0
- `gc-agent:local` und `gc-proxy:local` Images vorhanden
- Task über API erstellt → Status Complete → Branch im Source-Repo vorhanden
- Vollständige HTTP-Kette Client → Server → Sandbox → Branch → Response verifiziert

## Verweise
- Milestones:   docs/check/MILESTONES.md
- Next Tasks:   docs/check/NEXT_TASKS.md
- Tasks:        docs/TASKS.md
- Letzter Check: docs/check/CHECK_2026-09-28_172253.md
- Produktgedächtnis: .brain/GC.md
