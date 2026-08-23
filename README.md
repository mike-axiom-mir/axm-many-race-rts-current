# AXM Many-Race RTS

A reconstructed continuation of the original June 2026 AXM many-faction RTS idea.

## Current direction

This is **not** an attempt to preserve the quality of the old prototype code. The surviving repository only contained a README shell, so this branch rebuilds the playable foundation from the preserved design direction:

- Age-of-Empires-like readability and age progression;
- substantially more **macro** and less unit/villager micro;
- formation-level army orders rather than constant soldier babysitting;
- a large roster of factions that are meant to change rules, economies and strategy rather than act as reskins;
- low-poly **3D** presentation suitable for later stronger animation/art passes;
- founder units as special starting identities, not ordinary trainable heroes.

## Phase 1 3D prototype

The current branch includes:

- Three.js WebGL battlefield with orthographic RTS camera;
- deterministic low-poly terrain and scenery;
- animated founders, squads, banners and buildings;
- macro workforce allocation across food / wood / stone / gold;
- faction economy, military and construction modifiers;
- click-to-place faction buildings;
- formation-level army doctrines: defend / contest / attack;
- center-map strategic control bonus;
- autonomous enemy reinforcement and attack pressure;
- combat, capitals, victory / defeat;
- multi-age progression and research hooks;
- responsive desktop/mobile HUD;
- data-driven faction definitions.

## Preserved seed factions

1. **Northpole Dominion** — founder: **Santa's Brother**
2. **Suitcase Habitat Collective**
3. **Fatfrotz Empire**

These names are intentionally retained from the original concept lineage.

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
- `src/world.js` — 3D scene, camera, terrain, entity meshes, movement and combat
- `src/game.js` — economy, progression, placement, enemy pressure and UI state

## Steward rule

Grow the game by extending systems and faction data. Do not collapse asymmetric factions into palette swaps, and do not reintroduce micro merely to imitate classic RTS conventions.
