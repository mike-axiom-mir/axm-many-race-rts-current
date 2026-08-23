# Phase 31 — Skirmish Match Results

## Goal

Extend the Age-of-Empires-style end-of-match statistics idea beyond Defend the Workshop so a normal Skirmish also ends with a useful result page.

## Result overlay

When the existing Skirmish age badge changes to `VICTORY` or `DEFEAT`, Phase 31 opens a result overlay with four tabs:

- Summary
- Military
- Empire
- Players

The overlay includes New World and Main Menu actions.

## Summary

Shows:

- result;
- match time;
- selected map;
- player faction;
- final Map Domination percentage;
- peak player formation count;
- surviving player formations;
- surviving player structures.

## Military

The runtime observes all active owners and records:

- direct squad/founder field damage;
- direct finishing removals while that owner is the active combat source;
- formations fielded;
- formation losses;
- surviving formations;
- structure/capital losses;
- unattributed/defense finishing removals kept separate from direct formation credit.

Direct field damage is measured from actual hostile HP reduction around the final role-aware combat call.

Fixed-defense/projectile finishing removals are not silently assigned to whichever Human owns the UI.

## Empire

Normal Skirmish keeps its economy state private inside `game.js`, so Phase 31 does not fabricate lifetime gathered/spent totals.

Instead the Empire tab truthfully captures the existing final HUD state:

- final resource stockpile;
- Age;
- Income / sec;
- upgrades;
- formation roster state;
- territory;
- capital integrity;
- final Map Domination score and active domination reward;
- structures fielded/remaining.

## Players

For Player, Enemy and any additional observed seats the page shows:

- seat/owner;
- faction;
- team;
- field damage;
- direct finishing removals;
- formation losses;
- surviving formations;
- Founder state.

## Order count

Explicit primary-player macro button presses are counted, including Army Doctrine and All-Combat Waypoint controls.

Hidden AI decision loops are not reported as Human orders.

## Lifecycle

The metrics state resets through the normal `RTSWorld.resetDynamic()` chain when a new Skirmish starts.

The results overlay is removed on reset/reload so no old-match values leak into a new world.

## Preservation

This module does not change:

- damage formulas;
- target selection;
- tower behavior;
- map domination calculations;
- economy values;
- faction powers;
- weather;
- terrain routing;
- victory conditions;
- multi-seat team logic.

It observes the final runtime and renders statistics only.

## Verification boundary

Implemented and source-audited in chat. Local/browser rendering and live reconciliation are not claimed here.
