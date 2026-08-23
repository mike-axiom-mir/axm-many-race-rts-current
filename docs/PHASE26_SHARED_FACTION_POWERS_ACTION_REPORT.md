# Phase 26 Action Report

## Implemented

- Added a shared faction-power system with exactly three powers per selectable faction: Attack, Defense and Economy.
- Added **24 power definitions across all 8 currently selectable factions**.
- Added one exact **120-second shared cooldown per side**; using any power locks all three.
- Added resettable match-time cooldown tracking rather than browser/page-time tracking.
- Added temporary Attack and Defense combat layers that stack after the existing faction passive runtime.
- Reused the existing faction-armor channel for defensive mitigation instead of creating a parallel damage system.
- Added healing/repair effects where the faction identity calls for sustain.
- Added 30-second temporary Economy multipliers instead of instant resource crates.
- Added left-HUD power controls so mobile layouts retain access.
- Added activation pulses and active/shared-cooldown UI state.
- Added persistent Enemy power/readiness information so the opponent's commitment can be punished.
- Added primary Enemy AI use of the same powers and shared cooldown.
- Added a conditional greed-read heuristic: an Enemy with at least three squads may choose Attack when the Player has an active Economy window.
- Added extra-seat Economy protection because those seats do not yet own independent resource ledgers.
- Added mirrored-primary-faction Economy protection to avoid buffing both sides through one shared faction definition.

## Source behavior reused

- `FactionRuntime` already resets temporary squad/founder combat stats each tick, making it a clean place to layer temporary powers without permanent stat drift.
- `__axmFactionArmor` is already read by formation combat and defensive-building projectile damage resolution.
- Skirmish economy already reads the selected faction's live `economy` multipliers each simulation tick, allowing a bounded temporary Economy window without creating a second resource system.
- Primary Enemy logic already owns a full resource/workforce economy; extra lobby Faction-AI seats currently use a lighter spawn/command path and therefore do not receive fake economy powers.

## Source-audit repairs

1. **Page-time cooldown leak** — the first draft used the absolute animation-frame time passed into `FactionRuntime.update()`. Waiting on the faction-selection screen could therefore advance the AI's decision clock. Phase 26 now owns a resettable match-local clock advanced only by match `dt`.
2. **Duplicate-seat economy cancellation** — `applyEconomyLayer()` originally restored a shared faction economy definition for every owner. Extra seats sharing a faction id could cancel a primary player's active Economy window. Economy mutation is now scoped to the primary Player/Enemy ledgers.
3. **Non-Economy expiry restoration** — an expiring Attack/Defense state originally passed through a generic economy restore path. The lifecycle patch now restores economy only when an actual Economy power expires.
4. **Mirrored faction economy** — primary Player and Enemy using the exact same faction currently reference one economy definition. Economy is explicitly disabled in that edge case until per-side cloned economy definitions exist. Attack/Defense remain available.
5. **Post-result AI activations** — greed-aware AI now stops choosing powers when either primary capital is already destroyed.
6. **Readable counterplay** — a short toast alone was insufficient for a 120-second strategic commitment, so a persistent Enemy power/shared-lock readout was added.

## Preservation

- Existing faction passives remain authoritative underneath the power layer.
- Existing combat roles/counters remain unchanged.
- Existing unit/building costs remain unchanged.
- Existing attack intervals remain unchanged.
- Existing terrain, cliff, surface movement, walls/gates and LOS rules remain unchanged.
- Existing Phase-24 unit/building visual depth remains unchanged.
- Existing Phase-25 combat/death/destruction visuals remain unchanged.
- No per-unit ability micro was introduced.

## Explicit non-goals

- No final balance claim.
- No skill-shot targeting.
- No independent extra-seat economy ledger in this phase.
- No separate cooldown per power.
- No new resource such as mana/energy.
- No local/browser runtime-success claim from this environment.

## Verification state

Implemented and source-audited on the Phase-26 branch.

Local/browser play remains unverified until Mike/local runs the merged build.

## Local verification targets

1. all three buttons start READY;
2. activating any power locks all three for 2:00;
3. Attack/Defense modifiers expire without base-stat drift;
4. Economy multipliers apply for 30 seconds then restore exactly;
5. Restart clears active powers, cooldowns, pulses and economy mutation;
6. Enemy AI uses Defense when pressured, Attack when committed and Economy when safe;
7. Player Economy can create a real Enemy Attack punish window when the Enemy has enough army;
8. Enemy Economy use is visible long enough for the Player to react strategically;
9. mirrored primary factions show Economy unavailable;
10. extra-seat duplicate factions do not cancel a primary Economy effect;
11. mobile HUD remains usable with the new three-button row;
12. performance remains acceptable with the new 0.15-second HUD refresh and power scans.
