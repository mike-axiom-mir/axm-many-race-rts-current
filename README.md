# AXM Many-Race RTS

A reconstructed continuation of the original June 2026 AXM many-faction RTS idea.

## Current direction

This is **not** an attempt to preserve the quality of the old prototype code. The surviving repository only contained a README shell, so the current game rebuilds the playable foundation from the preserved design direction:

- Age-of-Empires-like readability and age progression;
- substantially more **macro** and less unit/villager micro;
- formation-level army orders rather than constant soldier babysitting;
- a large roster of factions that are meant to change rules, economies and strategy rather than act as reskins;
- low-poly **3D** presentation suitable for stronger animation/art passes;
- founder units as special starting identities, not ordinary trainable heroes.

## Current playable foundation

The project now includes:

- Three.js WebGL battlefield with orthographic RTS camera;
- deterministic low-poly terrain and scenery;
- animated founders, squads, banners and buildings;
- macro workforce allocation across food / wood / stone / gold;
- faction economy, military and construction modifiers;
- live faction runtime mechanics instead of stat-sheet-only identity;
- click-to-place faction buildings;
- formation-level army doctrines: defend / secure territory / attack;
- combat, capitals, active defensive structures, projectiles and victory / defeat;
- multi-age progression and research hooks;
- interactive RTS minimap;
- responsive desktop/mobile HUD;
- data-driven faction definitions;
- authored map definitions and a reusable strategic-territory director;
- a native **flat + globe map builder**.

## Map Builder

Open `builder.html` or use **MAP BUILDER** from the game header.

The builder is a separate authoring workspace rather than a debug panel inside a match. It supports two world projections from one interface.

### Flat maps

Flat mode provides an RTS board with pan/zoom authoring. It can place and edit:

- player and enemy starts;
- strategic capture sites;
- resource zones;
- terrain stamps;
- map identity, seed, width/depth and terrain palette.

Flat maps export the new versioned AXM map JSON and can also be converted to the current skirmish-compatible legacy map shape.

### Globe maps

Globe mode provides a rotatable 3D planet. Clicking the surface creates real latitude/longitude authoring coordinates for:

- player and enemy starts;
- strategic sites;
- resource zones;
- terrain stamps.

Globe maps also carry globe radius, atmosphere and world palette metadata.

**Source-integrity boundary:** globe map authoring is implemented, but the current skirmish runtime still plays flat maps. Globe JSON is intentionally preserved as geographic data for the later globe-runtime adapter rather than being silently flattened into fake planar coordinates.

### Map data

The new `src/mapSchema.js` defines a versioned common contract using:

- `projection: "flat"` with `[x, y, z]` coordinates; or
- `projection: "globe"` with `{ lat, lon, elevation }` coordinates.

It includes normalization, validation, flat legacy conversion, and geographic ↔ Cartesian helpers so a future spherical RTS runtime can consume the same authored maps without redesigning the content format.

The builder includes undo, object inspection/editing, JSON import/export, clipboard export and schema validation.

## First authored skirmish map — Founder's Crossing

The first map is no longer just decorative terrain. **Founder's Crossing** contains three capturable strategic sites:

1. **Founder Stone** — central trade/prestige site that produces bonus gold;
2. **Timber Crown** — managed grove that produces bonus wood;
3. **Old Quarry** — old extraction site that produces bonus stone.

Squads and founders capture sites by physically holding their area. Sites can become neutral, contested, player-controlled or enemy-controlled. Ownership changes real macro income, the AI chooses territory objectives, and construction is blocked from being placed directly on strategic sites.

## Factions

### Preserved seed factions

1. **Northpole Dominion** — founder: **Santa's Brother**
2. **Suitcase Habitat Collective**
3. **Fatfrotz Empire**

These names are intentionally retained from the original concept lineage.

### New expansion faction

4. **Clockwork Orchard Assembly** — a precision-growth civilization with stronger wood/gold economics, smaller harder-hitting formations, and expensive durable structures.

Faction identity now also changes live formation behavior: founder inspiration, long-distance redeployment, massed formations and stationary precision are executable runtime mechanics rather than lore-only descriptions.

## Run locally

Because the project uses ES modules, run it through a tiny local web server rather than opening the HTML files directly.

```bash
python -m http.server 8080
```

Then open:

- game: `http://localhost:8080`
- map builder: `http://localhost:8080/builder.html`

Three.js is pinned through jsDelivr for this browser prototype. A later local-intake pass can vendor the dependency for fully offline play.

## Architecture

- `index.html` — game shell / HUD
- `builder.html` — map-authoring shell
- `styles.css` — responsive strategy UI
- `builder.css` — map-builder UI
- `src/factions.js` — faction rules and content data
- `src/factionRuntime.js` — executable faction identity mechanics
- `src/maps.js` — authored flat skirmish map data
- `src/mapSchema.js` — shared flat/globe map contract and coordinate helpers
- `src/mapBuilder.js` — flat/globe map authoring runtime
- `src/mapDirector.js` — capture zones, territory ownership and map bonuses
- `src/world.js` — 3D scene, camera, terrain, entity meshes, movement and combat
- `src/battlePatch.js` / `src/defenseSystem.js` — modular combat extensions
- `src/minimapPatch.js` — interactive minimap extension
- `src/healthBars.js` — battlefield damage-state feedback
- `src/game.js` — economy, progression, placement, AI pressure, map integration and UI state

## Steward rule

Grow the game by extending systems and faction/map data. Do not collapse asymmetric factions into palette swaps, and do not reintroduce micro merely to imitate classic RTS conventions.
