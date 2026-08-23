# Phase 9 — Atlas Library + Defend the Workshop

## Status

This phase adds two player-facing systems without replacing the Phase 1–8 game/runtime/editor architecture:

1. **Atlas Library** — an extensible player codex generated from game data.
2. **Defend the Workshop** — a dedicated co-op wave-survival mode.

No successful browser smoke run is claimed from the chat environment. Local/browser intake remains the runtime verification and visual-repair gate.

---

# Atlas Library

## Goal

Anything that becomes meaningful game content should have a discoverable player-facing home without requiring developers to manually maintain a second lore database.

## Built-in categories

Atlas currently supports:

- Factions
- Founders
- Faction NPCs
- Units
- Structures
- Resources
- Terrain & surface skins
- Decorations / world objects
- Scenario/rule zones
- Maps
- Battle Maps
- Content packs
- Upgrades & research
- Game modes

## Source-of-truth behavior

Built-in Atlas entries are generated from the same faction, map, Battle Map, world-catalog and content-pack definitions used by the game.

This reduces drift: changing a unit or faction definition changes what Atlas reads instead of requiring a separate hand-maintained encyclopedia file.

## Custom content registration

`src/atlasRegistry.js` exposes local registration functions.

Battle Map Editor now has a non-invasive Atlas bridge that can register:

- imported unit packs;
- imported maps;
- imported Battle Maps;
- embedded maps and unit packs inside imported Battle Maps.

Custom Atlas data is local-browser state and does not silently modify source repositories or authored packages.

## Workshop entries

Defend the Workshop registers:

- The Workshop;
- Workshop Guard Tower;
- every current between-wave upgrade.

The upgrade category is intended to grow into normal faction research/technology entries later.

---

# Defend the Workshop

## Mode identity

Defend the Workshop is not a normal Skirmish ruleset and not a Battle Map story campaign.

It is a dedicated co-op survival mode around one shared Workshop objective.

## Allied seats

Setup supports 1–4 allied seats using the existing controller vocabulary:

- Human
- Faction AI
- Connected AI
- Closed

All active seats are allied and share the survival objective/economy.

### Current human-input boundary

Multiple Human seats can exist in the run, but the current browser prototype uses a shared-screen **active-seat selector** for macro commands. Independent controllers/network/local-multiplayer input routing remain later adapters.

### Faction AI

Faction-AI allied seats can issue autonomous intercept orders and cautiously spend shared supply on replacement formations when the Workshop has a healthy reserve.

### Connected AI

`axm-defend-seat-command` is an event surface for Connected-AI player seats.

Current command intents:

- move
- hold
- intercept
- recruit

A provider/local-model observation + consent bridge remains a later integration layer.

## Shared Workshop economy

The mode uses one abstract **Workshop Supply** currency rather than four parallel Food/Wood/Stone/Gold economies.

Reasons:

- co-op survival should emphasize shared defensive choices;
- avoids four-player bookkeeping overhead;
- preserves normal macro economy for Skirmish while allowing survival to have its own identity.

Current economy:

- starting supply reserve;
- deliberately slow passive supply tick;
- large wave-clear salvage reward;
- passive gain permanently increases after each cleared wave;
- upgrades can improve passive supply and wave salvage.

## The Workshop

The Workshop is a central shared structure.

If it falls, the whole team loses.

Difficulty can modify Workshop maximum health.

Players can spend supply to repair it during the run.

## Defense perimeter

The Workshop starts with two free heavy Guard Towers.

Guard Towers are intentionally stronger than normal Skirmish defenses:

- higher base damage;
- longer range;
- faster fire interval;
- higher health;
- faster projectile speed.

Tower construction uses fixed perimeter sockets to keep the mode macro-focused rather than turning it into pixel-perfect tower placement.

Current base perimeter:

- 8 unlocked sockets;
- up to 12 through run upgrades.

Destroyed Workshop towers reopen their occupied socket through the lifecycle patch.

## Waves

Waves rotate through the current faction roster.

Wave scaling increases:

- formation count;
- health;
- damage;
- movement speed.

Every fifth wave is a heavier pressure wave with additional stronger formations and a larger clear reward.

Run lengths currently include:

- 10 waves;
- 15 waves;
- 20 waves;
- endless.

## Between-wave upgrades

Every cleared non-final wave offers three random upgrade choices and the player chooses exactly one.

Current upgrade pool includes:

- tower damage;
- tower range;
- tower fire rate;
- tower maximum health;
- Workshop maximum health;
- passive supply generation;
- wave salvage multiplier;
- allied formation damage;
- allied formation health;
- stronger repair actions;
- immediate emergency supply cache;
- extra perimeter sockets.

The upgrade system is data-driven in `src/defendConfig.js` so additional upgrade types can be added later without rebuilding the mode shell.

## Formation control

The active allied seat can issue macro commands:

- hold Workshop;
- intercept nearest hostile wave;
- push north/east/south/west;
- choose a custom ground destination.

Formation recruitment uses the active seat's selected faction units, so mixed-faction co-op runs are supported.

---

# Generic engine improvement

`DefenseSystem` now accepts optional per-building values for:

- defense range;
- fire interval;
- projectile speed;
- projectile lifetime.

Defaults preserve existing Skirmish behavior.

This lets special modes and future faction structures create mechanically distinct defenses without forking the defense engine.

---

# Preserved boundaries / next local checks

Local smoke testing should check:

1. Defend setup screen and seat controller/faction selectors.
2. Workshop and initial two Guard Towers render correctly.
3. Wave 1 spawns and formations route toward the Workshop.
4. Guard Towers acquire hostile targets and fire at the faster survival cadence.
5. Workshop takes damage and triggers defeat when destroyed.
6. Wave clear triggers supply reward + upgrade selection exactly once.
7. Upgrade effects stack correctly across several waves.
8. Destroyed tower socket can be rebuilt.
9. Faction-AI allies do not overspend the shared economy.
10. Connected-AI command event does not control Human/Faction-AI seats.
11. Atlas loads all categories and searching/filtering works.
12. Imported Battle Map content can register into Atlas.
13. Mobile layout remains usable after the Atlas/Defend menu additions.

## Not claimed complete

- independent simultaneous controls for four human defenders;
- network multiplayer;
- gamepad seat assignment;
- Connected-AI observation/provider bridge;
- final visual polish/animation balance;
- final wave balance;
- persisted survival meta-progression between runs.

Those are intentionally held for later runtime/local integration rather than faked in this phase.
