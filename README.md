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
- click-to-place faction buildings;
- formation-level army doctrines: defend / secure territory / attack;
- combat, capitals, victory / defeat;
- multi-age progression and research hooks;
- responsive desktop/mobile HUD;
- data-driven faction definitions;
- authored map definitions and a reusable strategic-territory director.

## First authored map — Founder's Crossing

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

The roster is data-driven so future factions can be added without rebuilding the core engine.

## Run locally

Because the prototype uses ES modules, run it through a tiny local web server rather than opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

Three.js is pinned through jsDelivr for this browser prototype. A later local-intake pass can vendor the dependency for fully offline play.

## Architecture

- `index.html` — game shell / HUD
- `styles.css` — responsive strategy UI
- `src/factions.js` — faction rules and content data
- `src/maps.js` — authored map data
- `src/mapDirector.js` — capture zones, territory ownership and map bonuses
- `src/world.js` — 3D scene, camera, terrain, entity meshes, movement and combat
- `src/game.js` — economy, progression, placement, AI pressure, map integration and UI state

## Steward rule

Grow the game by extending systems and faction/map data. Do not collapse asymmetric factions into palette swaps, and do not reintroduce micro merely to imitate classic RTS conventions.
