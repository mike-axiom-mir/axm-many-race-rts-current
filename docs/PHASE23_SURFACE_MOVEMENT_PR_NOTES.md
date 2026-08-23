# Phase 23 PR Notes

Surface movement activation on top of Phase 22:

- existing surface-skin movement values now affect live squad/founder travel speed;
- Road accelerates while water/snow/ice/forest/sand/etc. slow according to the existing catalog;
- Ramp / Passable Cut keeps its Phase-22 passage role and uses its authored 0.95× movement value;
- cliff-detour routing compares painted travel cost instead of distance alone;
- route simplification preserves materially faster painted detours;
- open-field movement remains direct and does not become a constant road-seeking A* workload;
- editor/export schema stays on existing `surfacePaint`;
- no balance-finality, hazard-damage or local/browser-success claim.
