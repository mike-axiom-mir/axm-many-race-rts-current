# AXM Many-Race RTS

A reconstructed continuation of the original June 2026 many-faction RTS idea.

## Direction

- Age-of-Empires-like readability and age progression;
- substantially more **macro** and less villager/unit babysitting;
- formation-level army orders;
- many genuinely asymmetric factions rather than palette swaps;
- low-poly 3D presentation;
- founder units as special starting identities;
- the same authored content language for skirmishes, custom maps and future campaigns.

The surviving historical repository contained only a README shell. Everything described below is the new reconstructed foundation, not a claim that old playable source survived.

## Current game foundation

The flat skirmish includes:

- Three.js 3D battlefield and orthographic RTS camera;
- macro workforce allocation across food / wood / stone / gold;
- buildings, formations, combat, capitals and age progression;
- authored strategic territory with real economic bonuses;
- AI territory pressure;
- active defensive structures and visible projectiles;
- interactive minimap;
- live faction-runtime mechanics;
- damage-state health bars;
- responsive desktop/mobile HUD.

### Current factions

1. **Northpole Dominion** — founder: **Santa's Brother**; nearby founder inspiration changes formation behavior.
2. **Suitcase Habitat Collective** — long-distance redeployment / Pack March identity.
3. **Fatfrotz Empire** — larger formations and massed-force bonuses.
4. **Clockwork Orchard Assembly** — smaller precision formations and stationary combat bonuses.

## World Builder — `builder.html`

The World Builder creates both flat and globe maps from one interface.

### Flat maps

- pan/zoom RTS board;
- player and enemy starts;
- strategic sites;
- resource zones;
- terrain stamps;
- map seed and dimensions;
- world palette;
- JSON import/export;
- conversion to the current flat legacy-skirmish shape.

### Globe maps

- rotatable 3D planet;
- real `{ lat, lon, elevation }` coordinates;
- player/enemy starts, sites, resources and terrain stamps;
- configurable planet radius, atmosphere and palette;
- exports the same versioned AXM map format used by Scenario Studio and Globe Conquest.

## Scenario Studio — `scenario.html`

Scenario Studio is the advanced authoring layer. It intentionally sits beside the simpler World Builder so basic map creation does not become a wall of controls.

It can import a flat or globe map and add:

### Decorations

A reusable decoration catalog currently includes trees, rocks, flowers, ruins, campfires, banners, market/infrastructure markers, crystals and obelisks.

Every placed object can carry:

- a stable ID and name;
- enabled/disabled state;
- layer;
- ownership;
- tags;
- asset/skin choice;
- tint / color;
- scale / rotation where relevant;
- collision metadata;
- its own scenario rules.

### Surface / tile skins

Surface paint is stored as authored map data rather than baked art. Current skin definitions include grassland, meadow, forest floor, dirt, sand, snow, ice, stone, ash, lava, shallow water, road, farm and alien surfaces.

Each painted region can store:

- skin;
- tint;
- radius;
- opacity;
- blend mode;
- tags and rules.

The catalog also supports gameplay metadata such as movement multipliers and hazards. The globe runtime already consumes this: roads can speed movement, difficult surfaces slow formations, and hazardous surfaces such as lava can cause attrition.

### Rule zones

Scenario Studio can author trigger, no-build, ambush, safe, weather and objective zones. These are generic data objects, so later campaign/runtime adapters can add new zone meanings without changing the map format.

### Campaign metadata

Maps can carry:

- campaign / chapter / mission IDs;
- mission title and briefing;
- victory / defeat text;
- starting age;
- next-map link;
- allowed-faction metadata;
- required / optional / hidden objectives;
- map variables.

This lets future campaigns use the same maps users create instead of requiring a separate proprietary campaign format.

## Scenario Rule Language — `src/scenarioRules.js`

Rules are data, not arbitrary executable JavaScript.

A rule contains:

- event;
- optional conditions;
- one or more actions;
- priority;
- optional cooldown;
- optional `once` behavior;
- notes / identity.

Authorable events include map start, timers, zone enter/leave, strategic capture, destruction, resource thresholds, age thresholds, objective completion, variable changes and manual/custom events.

Conditions include ownership, faction, age, resource thresholds, variables, tags, objective state and object state.

Actions include messages, resource/variable changes, object state/ownership/skin changes, formation/decoration spawning, objective completion/failure, camera focus, ambience/weather, diplomacy, custom event emission and victory/defeat.

Object-local rules are namespaced by object ID so cooldown/once state cannot silently collide between different placed objects.

### Runtime coverage boundary

The rule language is deliberately broader than any one runtime.

**Globe Conquest currently consumes:** map start, timers, strategic captures, destruction, age/resource threshold polling, variables and objective events; plus messages, resource changes, site ownership changes, formation spawns, objective state, camera focus, basic ambience changes and victory/defeat.

**Schema-ready but not yet fully adapted everywhere:** zone enter/leave execution, arbitrary live object enable/disable, live object skin swapping, decoration spawning and a complete diplomacy runtime.

These remain explicit extension points rather than being reported as finished behavior.

## Globe Conquest — `globe.html`

The earlier globe authoring boundary has now advanced into an actual experimental spherical RTS runtime.

### What is real

- formations exist directly on a sphere;
- positions are surface normals / geographic coordinates;
- movement follows shortest-arc **great-circle paths**;
- combat distance is geodesic surface distance;
- the planet can be rotated independently for inspection;
- player and AI capitals sit on the planet surface;
- player and AI formations can travel around the far side of the world;
- strategic sites can be captured around the entire planet;
- captured sites feed the macro economy;
- player and AI use faction data and faction runtime behaviors;
- AI reinforces and selects planetary objectives;
- age progression and resource allocation operate during globe battles;
- destruction of a capital resolves the skirmish;
- authored decorations and surface paint are rendered from the shared map format;
- surface-skin movement/hazard metadata affects globe formations;
- Scenario Studio globe exports can be loaded directly into Globe Conquest;
- the first built-in globe map is **Crownworld** with five strategic sites.

This is not a flat map wrapped visually around a ball. The movement/combat adapter operates on spherical geometry.

## Map schema v2 — `src/mapSchema.js`

The shared format now supports:

- `projection: "flat"` using `[x,y,z]`;
- `projection: "globe"` using `{lat,lon,elevation}`;
- environment metadata;
- strategic sites;
- resource zones;
- terrain stamps;
- decorations;
- rule zones;
- surface paint / tile skins;
- global and object-local rules;
- variables;
- campaign metadata and objectives.

Normalization keeps old map data compatible while upgrading it into the v2 shape.

## First flat skirmish map — Founder's Crossing

**Founder's Crossing** contains:

- **Founder Stone** — bonus gold;
- **Timber Crown** — bonus wood;
- **Old Quarry** — bonus stone.

Sites become neutral, contested, player-controlled or enemy-controlled based on physical formation presence.

## Run locally

The project uses browser ES modules, so serve the folder rather than double-clicking the HTML files:

```bash
python -m http.server 8080
```

Then open:

- flat game: `http://localhost:8080`
- World Builder: `http://localhost:8080/builder.html`
- Scenario Studio: `http://localhost:8080/scenario.html`
- Globe Conquest: `http://localhost:8080/globe.html`

Three.js is currently pinned through jsDelivr. A later local-intake pass can vendor it for fully offline use.

## Architecture

### Core flat runtime

- `index.html`, `styles.css`
- `src/world.js`
- `src/game.js`
- `src/maps.js`
- `src/mapDirector.js`
- `src/battlePatch.js`
- `src/defenseSystem.js`
- `src/minimapPatch.js`
- `src/healthBars.js`

### Factions

- `src/factions.js`
- `src/factionRuntime.js`

### Authoring / scenario format

- `builder.html`, `builder.css`, `src/mapBuilder.js`
- `scenario.html`, `scenario.css`, `src/scenarioStudio.js`
- `src/mapSchema.js`
- `src/worldCatalog.js`
- `src/scenarioRules.js`

### Globe runtime

- `globe.html`, `globe.css`
- `src/globeWorld.js`
- `src/globeGame.js`
- `src/globeMaps.js`
- `src/globeSurfacePatch.js`

## Verification status

GitHub structure and imports are inspected during these steward passes. **A successful browser runtime is not claimed yet from this chat environment.** The intended workflow is to take the merged build local, run it for real, then repair rendering/interaction issues with concrete visual evidence.

## Steward rule

Grow by extending systems and data. Do not collapse factions into reskins, do not reintroduce micro merely to imitate classic RTS conventions, and do not silently flatten globe data or discard scenario metadata.
