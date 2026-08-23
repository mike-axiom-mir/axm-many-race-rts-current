# Phase 8 — Game Shell, Battle Maps and Seat Architecture

## Mode split

The project now has explicit player-facing modes rather than one page containing every tool.

### Main Menu
`index.html`

Entry point for the game.

### Skirmish
`lobby.html` → `skirmish.html` (flat) or `globe.html` (planetary)

Free-form matches. Lobby contract currently exposes four seats by default.

### Battle Maps
`battlemaps.html`

Premade battle challenges. These are campaign-like in progression/curation but are intentionally not defined as story campaigns. A Battle Map can be a defense, race, siege, limited-force challenge, moving front, globe-control fight, etc.

### Map Editor
`builder.html`

Owns geography/world construction. It should remain useful to a map maker who does not care about scenario scripting.

### Battle Map Editor
`battle-editor.html`

Consumes a finished map plus faction/unit packs and stages the fight: seats, starting forces, objectives, scene setup and challenge modifiers.

### Scenario Studio
`scenario.html`

Advanced rule/trigger/campaign-metadata layer. This is deliberately separate from basic map creation.

### Faction Hall
`factions.html`

Single place for faction visuals, founder, mechanics, units/buildings and native faction NPC identity.

### How to Play / Settings
`howto.html`, `settings.html`

Player guide and expandable settings shell.

---

## Seat contract

Current lobby capacity: **4 seats**.

Future capacities reserved by the architecture: **8 and 12 seats** once the runtime, maps and performance are stable enough.

A seat can be:

- `human`
- `faction-ai`
- `connected-ai`
- `closed`

The lobby can therefore contain 1–4 active seats without changing its schema.

## Human vs Connected AI vs Faction AI

These are intentionally different concepts.

### Human
A normal player controller.

### Connected AI
An external or local AI occupies a **normal player-side seat**. It must use the same information gate as a human in that seat. The seat controller does not grant hidden map state or special authority.

The current flat runtime exposes an explicit seat command event:

```js
window.dispatchEvent(new CustomEvent("axm-seat-command", {
  detail: {
    seatId: "seat-3",
    type: "move",
    point: [10, 0, -4]
  }
}));
```

or:

```js
window.dispatchEvent(new CustomEvent("axm-seat-command", {
  detail: {
    seatId: "seat-3",
    type: "attack-capital"
  }
}));
```

This is a command surface, not a completed provider/network bridge.

### Faction AI
Every faction has a native in-game strategist profile in `src/factionNpcs.js`.

This NPC belongs to the faction identity and can be used as:

- a CPU controller in skirmish;
- an authored actor/brain in a Battle Map;
- a source of faction-specific economy/doctrine preferences;
- a future dialogue/advisor personality without changing the seat model.

The native NPC is not the same thing as a connected external AI model.

---

## Current flat multi-seat execution

The original flat runtime began as two-side `player`/`enemy` code. Phase 8 adds an adapter instead of rewriting the stable core.

Implemented now:

- Seat 3 and Seat 4 spawn from the unused map corners when active;
- extra Faction-AI seats issue formation movement and reinforcement behavior;
- unique owner identities exist for all four seats;
- lobby teams are respected by unit combat and defensive structures;
- faction runtime mechanics execute for all seat owners;
- minimap and seat HUD show all active owners;
- strategic sites can be captured by arbitrary seat owners;
- team-aware victory prevents an extra-seat capital from accidentally triggering the old two-side loss rule;
- Connected-AI/human seats beyond Seat 1 require explicit seat-authority commands instead of inheriting the legacy CPU command path.

Not yet complete:

- independent macro-economy UI/state for Seats 2–4;
- full network multiplayer;
- same-device multi-human control routing;
- provider/local-model observation bridge for Connected AI;
- mature faction-NPC strategic planning for every seat (the current profiles + faction runtime are foundations, not finished brains);
- map-specific 8/12-seat spawning and balance.

Do not represent those pending layers as finished.

---

## Battle Map package model

`src/battleMapSchema.js` defines a Battle Map as a package layered over a reusable world map.

It can contain:

- map reference or embedded custom map;
- 4-seat lobby setup;
- faction packs;
- unit packs;
- starting force groups and map anchors;
- objectives;
- scene text / time / weather;
- build/economy/reinforcement modifiers;
- scenario rules;
- optional collection/order/next-battle metadata.

This lets map creators build geography once, then many different Battle Maps can reuse the same terrain.

## Content packs

`src/contentPacks.js` exposes portable faction/unit-pack contracts.

Built-in factions automatically produce built-in faction and unit packs. Custom unit packs can be imported by Battle Map Editor without rewriting the base faction registry.

---

## Design root

Do not collapse this back into one editor or one controller type.

The intentional separation is:

**world geography → battle staging → deep rules → runtime**

and:

**seat controller → faction identity/NPC**

Those separations are what allow simple map creation, deep custom Battle Maps, connected AI seats and native faction behavior to grow independently.
