# Phase 10 — World Domination

## Purpose

World Domination is the persistent strategic layer above normal flat/globe RTS battles.

It is designed as a real-time clan match for **1v1 through 4v4**. The globe itself owns territory adjacency, persistent resources, city ownership, local armies and battle handoff. Individual RTS maps remain reusable battlefields loaded only when a territory contest needs them.

## Core rules

1. A clan may only contest a territory directly connected to one it already controls.
2. Expedition forces come only from the source territory's current local garrison.
3. Committed formations are removed from the source territory immediately; no distant-map teleportation is allowed.
4. Other owned territories continue their real-time economies while the contest is elsewhere.
5. Each territory has multiple cities. Neutral territories begin with neutral cities; conquest updates city ownership.
6. Territories can exist before their final battle maps exist. A finished Map Editor JSON can later be attached to any territory slot.
7. Territory contests create an explicit battle packet containing the target map reference, source expedition, defenders and city objectives.
8. A future flat/globe battle runtime returns a result packet containing the winner, surviving formations and final city ownership. Applying that result updates the persistent world.

## Economy correction / no free unit production

Automatic formation production is not a free timer.

Every controlled territory has:

- a local Food / Wood / Stone / Gold treasury;
- gross resource income determined by its territory profile and controlled cities;
- a selected production faction/unit;
- a real production interval;
- the real faction-scaled unit cost;
- a garrison limit;
- a financial ledger.

When a production cycle completes:

1. the territory checks the actual cost of its selected formation;
2. if the local treasury cannot pay, production waits;
3. if it can pay, resources are deducted and one formation is added locally;
4. only successful paid production counts toward reserve-generation progress.

The territory keeps an operating reserve large enough to fund future local production. Resources above that reserve are swept to the clan/global treasury. Therefore the clan receives genuine map surplus rather than gross income while units are being produced for free.

The territory UI exposes:

- local treasury;
- current production unit;
- unit cost;
- production cycle length;
- projected net resource flow per minute after production;
- successful formations produced;
- production blocks caused by insufficient economy;
- local garrison / cap.

## Expedition reserve

Every **4 successful economically funded local formation productions** grant that clan one bonus expedition-reserve formation.

This reserve is global only while unassigned. It cannot be injected directly into a live territory battle.

Before use it must be assigned to an owned, unlocked territory. At that moment it becomes part of that territory's physical garrison and follows normal adjacency/expedition rules.

This preserves geography while still rewarding a strong empire-wide production network.

## Real-time persistence

The world state is stored locally.

When World Domination is reopened, elapsed real time is simulated up to a bounded catch-up window. This allows owned maps to keep producing during normal absence without permitting unlimited weeks/months of runaway accumulation.

## Territory graph

Phase 10 seeds 20 territory nodes around the strategic globe.

Each node already defines:

- geographic position;
- direct neighbors;
- terrain identity;
- 2–5 cities;
- base resource rates;
- formation-production interval;
- garrison limit;
- strategic value;
- optional battle map reference.

Only World Crossroads currently carries a built-in map reference. All other nodes are intentionally valid strategic map slots awaiting later map creation.

## Map attachment

From the World Domination territory inspector a Map Editor JSON can be attached or replaced.

Map slots are stored separately from the persistent war state, allowing the territory topology and war save to survive later map-library changes.

Imported territory maps also register into the local Atlas.

## Battle adapter boundary

`domination-battle.html` is intentionally a staging/adapter page rather than fake gameplay.

It shows:

- source territory;
- destination territory;
- exact expedition formations;
- exact defenders;
- city objectives;
- attached map;
- adapter/runtime status.

The packet can be copied/exported for a future battle runtime.

A completed battle returns `domination-territory-result` data containing:

- winner;
- surviving attacker formations;
- surviving defender formations;
- city ownership;
- optional battle statistics.

The staging page can import that result and resolve the persistent strategic contest.

## Atlas integration

Atlas now adds:

- a World Domination game-mode entry;
- a dedicated World Territories category;
- one entry for each seeded territory including cities, neighbors, economy profile, production cycle, garrison cap and map-slot state.

## Truth boundary

Implemented in Phase 10:

- persistent strategic globe;
- 1v1–4v4 clan seat data foundation;
- territory adjacency graph;
- territory/city ownership state;
- real-time/offline catch-up economy;
- local unit-production costs;
- production blocking when unaffordable;
- local operating reserves and clan surplus treasury;
- reserve generation tied to paid production;
- reserve assignment back to physical territories;
- neighbor-only expedition staging;
- source-garrison-only expedition composition;
- territory map slots and JSON attachment;
- battle handoff/result schemas;
- Atlas/menu/How-to integration.

Not yet claimed as complete:

- live flat/globe RTS force injection from a domination battle packet;
- city capture logic inside the actual battle runtime;
- automatic result emission from live battles;
- simultaneous networked human clan members;
- server-authoritative persistence / anti-cheat for internet clan wars;
- deep native faction-AI strategic control of the world layer;
- diplomacy between more than the current two-clan match model;
- final authored maps for all 20 territory nodes.

## Local intake checklist

1. Open `domination.html` and create 1v1, 2v2 and 4v4 saves.
2. Rotate/zoom globe and verify every territory node is selectable.
3. Confirm only adjacent territories are offered as contest targets.
4. Confirm source garrison numbers drop immediately after committing an expedition.
5. Leave the world running and confirm local treasuries increase.
6. Verify automatic production deducts the displayed faction unit cost.
7. Drain a territory below unit cost and confirm formation production stalls.
8. Confirm production resumes only after the local map can afford it again.
9. Confirm map surplus moves into clan resources while an operating reserve remains local.
10. Confirm every four successful paid productions create one expedition reserve formation.
11. Assign that reserve to a territory and confirm it leaves the global reserve and enters the local garrison.
12. Save, close, wait briefly, reopen and confirm real-time catch-up.
13. Attach a Map Editor JSON to an empty territory slot and verify the map status updates.
14. Stage a territory contest and open `domination-battle.html`.
15. Verify the battle packet includes only source-map expedition forces, the destination defenders and all destination cities.
16. Import a test result packet only in a controlled local test and confirm the persistent globe updates ownership/garrisons/cities correctly.

No successful browser smoke run is claimed from the chat-only build environment.
