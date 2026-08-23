# Phase 24 — Unit and Building Visual Depth

## Goal

Increase battlefield visual quality and readability without replacing the existing low-poly AXM art language or changing gameplay balance.

Phase 24 builds on the existing roster-detail, animation, defense-visual and fortification layers. It adds a second visual-readability pass after those systems have created their final geometry.

## Unit silhouette language

Every supported core faction formation now receives role-aware silhouette details in addition to its existing unit-specific weapons and accessories.

### Line

- heavier shoulder shapes;
- clearer chest/armor plate;
- broader frontline silhouette.

### Ranged

- quiver and arrow bundle;
- lighter chest bar;
- clearer rear-support silhouette.

### Mobile

- compact travel pack;
- lower-leg detail;
- formation-level moving vane to make mobile groups easier to identify at a glance.

### Siege

- heavier shoulders;
- tool harness;
- formation-level axle/wheel detail so small siege crews read as equipment-bearing units rather than ordinary infantry.

### Scout and support metadata

When existing unit metadata marks a formation as Scout or Support, Phase 24 adds a small visual cue:

- Scout — observation glass;
- Support — subtle spinning halo/ring.

These are visual-only. No new scout/support mechanics are introduced here.

## Faction identity language

The role silhouette is then combined with a faction-specific visual vocabulary.

### Ironvale Compact

- reinforced brow/helmet plate;
- narrow vertical crest;
- hard-edged structural braces on buildings;
- ring/crown geometry on major defensive structures and capital.

### Greenwake Union

- leaf-like mantle and head shard;
- root braces around structures;
- living lantern/pulse details;
- leaf crown language on the capital.

### Ashwind League

- animated scarf/goggle details;
- canvas-like awnings;
- mast and rotating vane language;
- larger wind-vane silhouette on the capital.

### Prismkin Chorus

- crystal head/back shards;
- corner crystal buttresses;
- spinning halo/ring geometry;
- orbiting crystal crown on the capital.

## Building role readability

Existing generic building masses are preserved, but their function is made more readable.

### Economy

- doors and lintels;
- window panels;
- exterior crates/storage clutter.

### Military

- doors and windows;
- weapon racks and spears;
- faction structural identity layered around the military hall.

### Defense

- firing/vision slit details;
- faction-specific crown or halo structures;
- existing tower/defense visuals remain underneath.

## Fortifications

Phase 24 intentionally installs after the existing fortification patch.

That means Wall/Gate geometry is already final when the visual-depth layer runs. It can therefore add:

- external braces;
- accent plates;
- gate crest detail;

without being erased by the Phase-19 fortification geometry replacement.

No collision, LOS, gate-open, HP or wall-balance behavior is modified.

## Capital and founder polish

Capitals gain:

- perimeter light/window panels;
- paired standards;
- a faction-specific crown silhouette.

Founders gain:

- cape;
- shoulder pieces;
- faction crest.

These additions make the founder/capital relationship more visually intentional without changing their gameplay statistics.

## Animation compatibility

Phase 24 reuses the existing animation tags already consumed by the world traversal:

- `spin`;
- `pulse`;
- `wave`.

No second animation loop or renderer is introduced.

## Wrapper order

The Skirmish import sequence places `visualDepthPatch.js`:

1. after existing roster/unit visual layers;
2. after final Wall/Gate construction;
3. before Fog of War and multi-seat wrappers.

Later wrappers call through the enhanced spawn chain, so extra seats and enemy factions inherit the same visual depth.

## Boundaries

- visual/content pass only;
- no unit stat changes;
- no building stat changes;
- no balance tuning;
- no new gameplay commands;
- no replacement of the current low-poly art direction;
- no local/browser runtime-success claim from this chat environment.

## Local smoke focus

1. core line/ranged/mobile/siege roles remain readable when zoomed out;
2. existing unique weapons/accessories are still visible rather than buried by new geometry;
3. all four factions read differently at formation distance;
4. economy/military/defense buildings are easier to distinguish without HUD text;
5. Wall and Gate details appear after final fortification geometry;
6. gate animation remains unobstructed;
7. capital banners/crowns animate correctly;
8. founder cape/crest does not clip badly during motion;
9. fog-hidden enemies hide all added child meshes with their parent entity;
10. large multi-seat battles remain within acceptable visual/performance cost.
