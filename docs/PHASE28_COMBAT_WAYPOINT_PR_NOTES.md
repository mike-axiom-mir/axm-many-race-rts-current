# Phase 28 PR Notes

Macro army movement refinement:

- All Combat → Map arms one battlefield tap;
- the tap places/moves one persistent army waypoint and orders current combat actors;
- Go To Waypoint explicitly reissues the saved destination to the current combat roster;
- newly trained units do not auto-rally unless the player reissues;
- economy/civilian units are explicitly excluded;
- future economy-unit definition tags are propagated to live entities for the same exclusion;
- loose formation offsets prevent intentional exact-coordinate stacking;
- left-HUD placement keeps the controls mobile-accessible;
- construction placement is cancelled through the existing Escape path when army-map mode is armed;
- no multi-waypoint queue, pathfinding rewrite or combat-stat change;
- implemented/source-audited only; no local/browser runtime-success claim.
