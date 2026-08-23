# AXM Many-Race RTS — Phase 8 Action Report

## Result

Phase 8 turns the project from a collection of runtimes/editors into a coherent game shell.

## Built

### Title / navigation system
- `index.html` is now the real title menu.
- The previous flat game entry is preserved as `skirmish.html`.
- Main destinations are separated by player intent rather than technical implementation.

### Skirmish lobby
- four civilization slots by default;
- 1–4 player-controlled seats are representable using Human and Connected AI controllers;
- remaining seats can use Faction AI or be closed where the current runtime permits;
- team assignment;
- faction selection;
- map/speed/age/resources/victory/seed setup;
- persistent local lobby state;
- future lobby capacities 8 and 12 are reserved in the data architecture rather than exposed prematurely.

### Controller separation
Four explicit controller states:
- Human
- Faction AI
- Connected AI
- Closed

Connected AI is a normal player-side controller and is not allowed a hidden-information privilege by the seat contract.

### Native faction NPCs
Every current faction now has a separate native strategist identity in `src/factionNpcs.js`:
- economy bias;
- doctrine preferences;
- expansion/aggression/defense/risk profile;
- Battle Map hooks;
- lightweight voice/identity seeds.

These are reusable independently from external Connected AI seats.

### Faction Hall
`factions.html`

Single home for:
- faction identity;
- founder;
- traits;
- economy/military profile;
- buildings;
- units;
- native faction NPC.

### Battle Maps
`battlemaps.html`

Battle Maps are explicitly defined as **premade battle challenges**, not necessarily story campaigns.

Initial challenge registry:
- Hold the Founder Stone
- The Moving Front
- Five Crowns

### Battle Map package
`src/battleMapSchema.js`

A Battle Map layers battle design over reusable geography:
- map reference / embedded map;
- lobby/seat setup;
- faction/unit packs;
- starting forces;
- named map anchors;
- objectives;
- scene setup;
- challenge modifiers;
- scenario rules;
- optional collection/order/next-battle metadata.

### Content packs
`src/contentPacks.js`

Built-in factions can produce faction and unit packs. Battle Map Editor can import custom unit packs.

### Battle Map Editor
`battle-editor.html`

Normal challenge-authoring layer separated from Map Builder:
- pull a built-in or exported map;
- pull custom unit packs;
- configure seats/factions/teams;
- stage starting formation groups;
- anchor forces to map starts/sites/resources;
- author objectives;
- set time/weather/intro/victory text;
- set build/economy/reinforcement modifiers;
- export Battle Map JSON;
- hand off advanced rules to Scenario Studio.

### Map Builder separation
The existing `builder.html` remains geography/world focused. Scenario complexity is not required to build a normal map.

### How to Play
`howto.html`

Documents macro economy, formations, factions, lobby/AI concepts, Battle Maps, editors and globe play.

### Settings shell
`settings.html`

Expandable settings architecture for graphics, interface/accessibility, gameplay, controls, AI seats, audio and local play. Only lightweight browser persistence is claimed now; deeper runtime adapters remain later work.

---

## Experimental flat four-seat runtime adapter

The original flat runtime was built around `player` and `enemy`. Phase 8 adds a compatibility adapter rather than rewriting that stable core.

Implemented:
- unique Seat 3 / Seat 4 owners;
- extra active civilizations spawn from unused corners;
- extra Faction-AI seats move formations and reinforce;
- team-aware unit combat;
- team-aware defensive towers/projectiles;
- faction runtime mechanics apply to all owners;
- four-owner minimap colors;
- compact in-battle seat/team HUD;
- arbitrary-seat strategic-site capture;
- allied seats do not steal friendly sites;
- team-aware capital elimination / victory bridging;
- Connected-AI / extra-human seat command authority gate;
- `axm-seat-command` event surface for explicit seat commands.

Not yet a finished 4-human multiplayer system:
- Seats 2–4 do not have independent macro economy UI/state yet;
- networking is not implemented;
- same-device multi-human input routing is not implemented;
- Seat 2 still inherits pieces of the legacy opposing-side reinforcement path;
- Connected AI has a command surface but no completed observation/provider/local-model bridge;
- Faction NPC profiles are seeds for deeper strategy, not complete faction brains;
- full Battle Map runtime consumption of every authored package field is still pending.

The title/lobby/editor architecture should therefore be considered **strong and persistent**, while the multi-seat battle adapter is **experimental runtime groundwork** pending local playtest and later maturation.

---

## Existing systems preserved

No replacement of the Phase 1–7 work:
- 3D flat runtime;
- macro economy;
- asymmetric factions;
- faction runtime mechanics;
- Founder's Crossing;
- strategic sites;
- towers/projectiles;
- minimap;
- flat/globe Map Builder;
- Scenario Studio;
- scenario rule schema;
- Globe Conquest;
- true spherical movement;
- surface skins/hazards;
- Crownworld.

## Verification boundary

Repository structure and integration were reviewed in-chat. No successful browser smoke run is claimed from this environment.

Expected local workflow remains:
1. run the build;
2. catch syntax/runtime/visual issues;
3. repair visuals and interaction details locally;
4. preserve the architecture rather than rebuilding the game shell.
