# Phase 32 PR Notes

Persistent faction-history backend for the new result screens:

- completed matches write bounded normalized receipts;
- Skirmish links the player result to the selected faction;
- Defend links every active allied seat to its faction + controller type;
- shared Supply stays team-scoped;
- faction career totals are derived from receipts instead of stored as drifting counters;
- browser-local persistence is the current backend because the repo has no server persistence layer;
- `window.AXMMatchStats` exposes read/aggregate/export operations for later backend mirroring;
- result screens show a compact human Faction History summary after persistence;
- no telemetry/upload/account ID;
- no gameplay/balance changes;
- implemented/source-audited only; browser persistence not yet locally verified.
