# Phase 16 — Authored Skirmish Map Pack

## Goal

Prioritize playable content before balance tuning by giving Many-Race RTS a real flat-map library across normal and deliberately odd player counts.

Player-count labels describe the map's intended scale, not a universal hard cap. The current live Skirmish runtime still supports up to four civilization seats. Smaller maps can be deliberately overcrowded; larger 5P/8P maps already preserve all authored start slots for the future larger lobby runtime.

## Current flat map library

### 1 player

**Hermit's Basin**

Compact solo/challenge bowl intended primarily for Battle Maps, survival-like scenarios and future true single-civilization play. Central Last Hearth with side wood/stone objectives.

### 2 player

**Founder's Crossing**

Existing classic. Three strategic objectives: center gold, northern wood and southern stone.

**Twin Rivers**

Two major crossing lanes with a central trade objective, side resource crossings and one safer food bank.

**Shattered Crown**

Broken-ring layout. Central prestige objective, north/south resource fragments and safer outer granaries encourage flanks instead of one permanent center lane.

### 3 player

**Triarch Delta**

Triangle pressure. Every territorial commitment exposes another side. Central mixed-income delta plus three inner resources.

### 4 player

**Four Winds Basin**

Corner starts with one valuable center and one secondary objective in every quadrant. Supports FFA and team configurations.

**Crown Crossroads**

North/south/east/west starts with long open approaches. Side mixed-economy sites encourage coordinated 2v2 timing.

### 5 player

**Fivefold March**

Pentagonal odd-player battlefield. No player has a perfect opposite. Five interior stepping-stone objectives surround a dangerous center.

### 8 player

**Octagon Reach**

Eight authored starts around the outer map ring, four major inner resources, two smaller cross objectives and a high-value central core.

**Empire Ring**

Eight authored starts arranged for eventual 4v4 lane play. Paired outer settlements contest an inner ring before the central Imperial Seat becomes sensible to hold.

## Runtime selection

The Skirmish Lobby now populates flat maps from the live `MAPS` registry rather than a hard-coded two-map list.

The selected flat map is applied before Skirmish runtime patches initialize, so the existing game loop, MapDirector and minimap consume the selected map's name, player/enemy starts and strategic-site layout.

### Start-slot sampling

For maps with more authored starts than the current active civilization count, live starts are sampled around the full layout rather than taking only the first N slots.

Examples:

- 2 live seats on an 8P map use widely separated authored positions.
- 4 live seats on an 8P map use four evenly distributed positions.
- 4 live seats on a 2P/1P compact map preserve the authored starts and use deliberate fallback corners for the extra seats, allowing intentionally crowded matches.

Seats 3/4 are translated onto the selected map's resolved runtime starts after the existing multi-seat adapter creates them.

## Player-count metadata

Built-in flat maps now support:

- `recommendedPlayers`
- `minPlayers`
- `maxPlayers`
- `playerStarts[]`
- map tags

Legacy `playerStart` and `enemyStart` remain present for compatibility with the current core game loop and existing consumers.

## Atlas

The existing Atlas map registry consumes `MAPS`, so all new maps automatically become player-readable map entries without a second hand-maintained list.

## Current truth boundary

- Nine authored flat map definitions are registered.
- Lobby selection is wired to the actual flat Skirmish runtime.
- Strategic sites/start layouts change with the selected map.
- Current live civilization cap remains four.
- Five- and eight-player maps already contain their complete future start layouts but do not claim 5/8 independent live seats yet.
- The base Three.js terrain mesh/scenery generator is still shared between flat maps; these maps currently differ primarily through starts, strategic geometry and match flow rather than bespoke terrain meshes/assets.
- No successful browser/local runtime smoke test is claimed from this chat environment.

## Local content test later

When local time is available, prioritize content integrity rather than balance:

1. Launch every flat map once from the lobby.
2. Verify title/minimap map names update.
3. Verify strategic sites match the selected map.
4. Verify 2-seat tests on Octagon Reach / Empire Ring start far apart.
5. Verify a 4-seat match distributes across a large map.
6. Deliberately run 4 seats on Twin Rivers or Shattered Crown and confirm fallback crowded starts remain playable.
7. Check all starts avoid immediate overlap with strategic-site footprints.
8. Only after the maps visibly work should bespoke terrain/scenery passes begin.
