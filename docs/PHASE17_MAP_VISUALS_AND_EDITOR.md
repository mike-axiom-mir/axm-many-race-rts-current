# Phase 17 — Authored Map Visuals + Map Builder Visual Layer

## Goal

Make the Phase-16 flat-map pack visually distinct now, while ensuring every new visual capability used by built-in maps is available to map authors instead of remaining a developer-only trick.

This phase does not rebalance the game. It expands map content and map-authoring capability.

## Built-in map visual identities

All nine registered flat maps now carry authored visual/environment data.

### Founder's Crossing
- crossing road network
- meadow and quarry surface regions
- wooded Timber Crown
- quarry boulders
- old pillars, banners and market stalls around Founder Stone
- low hills framing opposite sides

### Hermit's Basin
- darker enclosed atmosphere
- raised basin rim
- central dirt hearth ground
- dense pine clusters and deadwood
- campfire / ruined-wall identity
- cut quarry basin

### Twin Rivers
- two visible shallow-water river lanes
- central market island
- approach roads
- reed beds and willow-like broadleaf clusters
- bridge props at crossing points
- animated waterwheel + market stalls

### Shattered Crown
- broken stone center
- fractured road approaches
- shallow central crater and rough ridges
- ruined arches and walls
- dead trees / boulders
- central obelisk and campfires

### Triarch Delta
- three visible river branches meeting at the delta
- low central floodplain
- raised outer banks
- extensive reed beds
- side groves
- bridges and small campfires

### Four Winds Basin
- strong north/south + east/west roads
- stone center
- quadrant-specific ground identity
- four raised outer areas
- pine cluster, quarry rocks, animated windmills, market stalls
- center banners + animated watch beacon

### Crown Crossroads
- broad cross-shaped road system
- stone central square
- orchard/farm regions
- raised quarry shelves
- ruins and market cluster at the crossing
- tree rows, rocks and animated beacons

### Fivefold March
- five road spokes pointing toward the shared center
- central stone ground
- asymmetric rough/rising terrain pockets
- five banners and dispersed campfires
- separate ruin, rock and deadwood regions

### Octagon Reach
- four major approach axes including diagonal lanes
- raised central prestige ground
- east/west rough ridges
- eight-obelisk / banner center identity
- north pines, south rocks, east beacons and west market cluster

### Empire Ring
- central elevated stone crown
- inner-ring route segments
- sector-specific ground pockets
- large ruined crown / obelisk center
- animated north/south gates
- east/west ruined wall regions
- opposing camp clusters

## Shared visual renderer

`src/mapVisuals.js` is the reusable flat-map visual layer.

It supports:

- map-specific sky color
- fog color + density
- ground tint
- procedural-scene fallback toggle
- legacy road fallback toggle
- legacy center-piece toggle
- circular surface paint
- strip surface paint for roads, rivers and lanes
- terrain stamps with real vertical relief
- deterministic scattered decoration clusters
- animated decoration hooks

The same renderer primitives are used by the Skirmish runtime and the Visual Layer authoring mode.

## Surface paint

Surface paint remains part of the normal AXM map JSON.

Supported visual shape vocabulary in this phase:

- `circle`
- `strip`

A strip can define:

- length
- width
- rotation
- skin
- tint
- opacity

This allows roads, rivers, lane markings and broad regional treatments without adding one special schema type per visual feature.

## Terrain relief

Terrain stamps are no longer preview-only decoration in flat Skirmish.

Supported relief kinds include:

- hill
- rough
- water/basin
- crater
- forest-floor rise

The flat ground mesh consumes the same height function as actor grounding.

Therefore:

- formations follow the terrain surface while moving;
- founders follow the terrain surface;
- capitals/buildings spawn at authored ground height;
- strategic-site visuals sit on the authored relief;
- Seats 3/4 are re-grounded after map-start translation;
- capture checks use horizontal map distance so relief does not silently shrink capture zones.

This is still lightweight RTS relief. It is not a navmesh/cliff-obstacle system yet.

## Decoration vocabulary

The existing catalog is retained and expanded.

New reusable assets include:

- dead tree
- reed bed
- ruined wall
- windmill
- waterwheel hut
- watch beacon

Existing assets remain available:

- broadleaf / pine trees
- rocks
- flowers
- ruined pillars / arches
- campfires
- banners
- market stalls
- bridges
- crystals
- obelisk

Scatter properties allow one authoring object to create a deterministic cluster:

- `scatterCount`
- `scatterRadius`

The cluster uses map seed + object identity, so reloading/exporting the same map does not randomly redesign the forest every time.

## Animation

Map decorations reuse the existing simple Three.js animation vocabulary:

- spin
- spinZ
- wave
- pulse

This produces animated:

- campfires
- banners
- crystals
- windmills
- waterwheels
- watch-beacon arms

No external art package is required.

## Map Builder gap resolved: Visual Layer

The existing Geography Editor remains focused on:

- projection
- map dimensions
- starts
- strategic sites
- resource zones
- terrain stamps

A new linked Map Builder mode is added:

`map-visual-editor.html`

The Map Builder header and placement section link directly to **Visual Layer**.

Visual Layer edits the exact same AXM map JSON and can:

- load any built-in flat map;
- import custom map JSON;
- edit ground / sky / fog environment values;
- place decorations;
- scatter decoration clusters;
- paint circular regions;
- create road/river strips;
- add/edit terrain relief;
- inspect and edit visual objects;
- undo visual edits;
- clear only visual content while preserving strategic map data;
- copy/export the completed map JSON.

The 3D preview uses the same `mapVisuals.js` rendering helpers as flat Skirmish, reducing editor/runtime drift.

## Why Visual Layer is a separate Map Builder mode

This is intentional rather than a new unrelated editor.

The existing geography screen is already dense and stable. Mixing dozens of scenery/surface controls into start/site placement would make basic map creation harder.

The intended workflow is now:

1. **Map Builder — Geography**: shape the battlefield, starts and strategic layout.
2. **Map Builder — Visual Layer**: give that same map roads, rivers, relief, scenery and atmosphere.
3. **Battle Map Editor**: stage a specific fight on the finished map.
4. **Scenario Studio**: add deeper rules/triggers/campaign logic when needed.

All stages exchange the same map JSON rather than silently cloning source truth.

## Current boundaries

### Cosmetic scenery collision

Trees, ruins, bridges and other decoration props are rendered as scenery but flat Skirmish does not yet route formations around those props. This phase therefore does not claim obstruction/navmesh gameplay from decoration collision metadata.

### Surface gameplay

Surface skins expose movement/hazard metadata in the shared catalog, but this visual pass does not newly apply every surface modifier to flat Skirmish movement. Existing runtime/rule layers remain authoritative for gameplay modifiers.

### Globe authoring

The new Visual Layer page is flat-map focused. Globe visual/rule authoring remains available through the existing globe-aware Map Builder / Scenario Studio systems. Do not treat this page as a replacement for the globe pipeline.

### Runtime verification

No successful local/browser smoke run is claimed from this chat environment.

## Local intake / eventual smoke order

1. Open Skirmish Lobby and select each flat map.
2. Confirm map-specific sky/fog/ground palette appears.
3. Confirm authored surface strips/circles appear without z-fighting severe enough to obscure units.
4. Confirm animated props move.
5. Confirm hills/basins visibly deform the ground.
6. March formations across relief and confirm they stay grounded.
7. Build a structure on raised/lowered terrain and confirm it sits on the surface.
8. Capture a site on relief and verify capture radius behavior remains normal.
9. Run four-seat Skirmish on a relief map and verify translated Seats 3/4 are grounded.
10. Open Map Builder → Visual Layer.
11. Load Twin Rivers.
12. Add a tree scatter, road strip, terrain hill and atmosphere change.
13. Export JSON, reimport it, and verify the visual layer survives exactly.
14. Launch the exported/custom map through the normal local content intake path when that runtime adapter is being exercised.

## Tuning hold

Do not spend time balancing road/water movement or prop collision yet. First verify that the maps are visibly distinct, readable during combat and pleasant to navigate. Content is the current priority.
