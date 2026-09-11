# RTS Foundation Consolidation — Phase 34

## Purpose

Phase 34 begins consolidation without deleting or silently rewriting the fast-grown RTS systems.

The repository already contains a large amount of working-intent functionality. The immediate risk is not lack of features; it is that many features currently compose by patching shared runtime prototypes and entry-order side effects. Phase 34 creates explicit core contracts underneath that architecture so later migration can be measured rather than guessed.

## Truth boundary

This phase does **not** claim:

- that every browser mode has been interactively playtested;
- that the simulation is deterministic already;
- that the canonical state object is authoritative already;
- that patch modules have already been removed;
- that full Flat / Globe / Defend / Domination runtime parity exists.

It creates the foundations needed to make those claims later with evidence.

## Added foundations

### 1. Browser verification gate

`verification.html` performs bounded page smoke checks over major runtime, authoring and content entry points.

A PASS means:

1. the entry page can be fetched;
2. it returns HTML;
3. an iframe reaches a load event;
4. a rendered document exists.

A PASS does **not** prove gameplay interaction, visual correctness, deterministic outcomes or balance.

The page can export a JSON receipt containing the exact scope and results.

### 2. Deterministic simulation-clock primitive

`src/core/simulationClock.js` adds a fixed-step clock with:

- explicit tick rate;
- bounded catch-up;
- integer simulation ticks;
- derived simulation time;
- render interpolation alpha.

It is deliberately not authoritative yet. The current runtime still contains `Math.random()` paths and patch-order behavior that must be migrated before deterministic replay can be claimed.

### 3. Canonical game-state primitive

`src/core/gameState.js` defines a versioned state container for:

- seed / mode / projection;
- simulation tick and time;
- seats and resources;
- entities with stable IDs;
- objectives and variables;
- command receipts;
- match state / winner.

It is initially an additive contract. Existing mode-local state remains authoritative until adapters are migrated and compared.

### 4. Runtime contracts

`src/core/runtimeContract.js` declares capabilities for Skirmish, Defend, Globe and Domination.

The Globe contract remains explicitly spherical. Consolidation must share rules without flattening spherical geometry into the flat runtime.

### 5. Source-derived game manifest

`src/core/gameManifest.js` derives faction, roster, age, upgrade and runtime counts from runtime source data instead of maintaining a parallel handwritten truth.

`src/core/foundationBootstrap.js` exposes this manifest and core constructors as `window.__AXM_RTS_FOUNDATION__` for inspection during browser playtests.

Skirmish now loads the bootstrap before the existing patch stack. No existing gameplay module was removed in this phase.

## Patch consolidation map

The current Skirmish entry point composes a large patch chain. Migrate by responsibility, not by deleting filenames in bulk.

### Vision / terrain

Candidates:

- `fogOfWarPatch.js`
- `battlefieldLineOfSight.js`
- `fortificationLineOfSight.js`
- `terrainMovementPatch.js`
- `terrainPassability.js`
- `mapReliefPatch.js`

Target boundary: `VisionSystem` + `TerrainSystem`.

### Combat / movement

Candidates:

- `combatDepthPatch.js`
- `combatDeathVisualPatch.js`
- `combatWaypointPatch.js`
- `combatWaypointInteropPatch.js`
- `battlefieldBaseApproachPatch.js`
- `baseDefenseCoordinationPatch.js`

Target boundary: `CombatSystem` + `CommandSystem`.

### Factions / powers / progression

Candidates:

- `factionPowerSystem.js`
- `factionPowerEconomyScopePatch.js`
- `factionPowerLifecyclePatch.js`
- `factionPowerAiPatch.js`
- `factionPowerHudPatch.js`
- `upgradeSystem.js`
- `gameplayProgression.js`

Target boundary: `FactionSystem` + `ProgressionSystem`.

### Multiplayer seats / authority

Candidates:

- `multiSeatPatch.js`
- `multiSeatMapPatch.js`
- `multiSeatVictoryPatch.js`
- `multiSeatHud.js`
- `seatCommandAuthorityPatch.js`
- `mapSeatStartPatch.js`

Target boundary: `SeatSystem` + `CommandAuthority`.

### Presentation

Candidates:

- `mapVisualRuntimePatch.js`
- `visualDepthPatch.js`
- `unitBuildingVisualPatch.js`
- `defenseRosterVisualPatch.js`
- `rosterAnimationPatch.js`
- `rainWeatherPatch.js`

Target boundary: renderer/view adapters. Presentation must not own simulation truth.

### Metrics / persistence

Candidates:

- `skirmishMatchMetricsPatch.js`
- `skirmishFactionStatsPersistencePatch.js`
- `factionStatsHistoryUiPatch.js`
- `matchStatsStore.js`
- `factionChronicle.js`

Target boundary: `MatchReceipt` + `StatsStore`, fed by canonical state/commands rather than scraping mutable UI state.

## Migration rule

For every migrated system:

1. keep the current implementation active;
2. run the new implementation in observe/shadow mode where possible;
3. compare outputs on the same state;
4. record mismatches;
5. switch authority only after the new path reproduces required behavior;
6. remove the old patch only after the authority switch is verified.

No bulk rewrite gate.

## Next implementation slices

1. Give all runtime entities stable IDs and expose a read-only canonical-state snapshot adapter.
2. Replace unseeded gameplay randomness with one seeded RNG service while leaving cosmetic randomness separate.
3. Move Skirmish simulation updates onto the fixed-step clock after RNG migration.
4. Record player/AI commands against simulation ticks.
5. Add deterministic replay of one bounded Skirmish fixture.
6. Expand the browser verification page from page-load checks to explicit runtime-ready signals.
7. Begin Vision/Terrain patch consolidation first because their contracts are already relatively clear.

## Steward invariant

Preserve macro-first RTS play, faction asymmetry, authored scenario data, existing fog/scouting behavior, wall/terrain line-of-sight behavior and spherical Globe geometry while the architecture underneath them is consolidated.
