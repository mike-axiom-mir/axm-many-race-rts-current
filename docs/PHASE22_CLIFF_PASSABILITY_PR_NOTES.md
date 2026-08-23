# Phase 22 PR Notes

Terrain movement continuation from Phase 21:

- sufficiently steep authored relief now blocks squads/founders;
- blocked direct movement uses a small cached coarse route rather than a global navmesh;
- `Ramp / Passable Cut` is authored through the existing Visual Layer `surfacePaint` contract;
- Shattered Crown now contains a steep central example plus a real ramp passage;
- Wall/Gate movement remains authoritative after terrain routing;
- high ground still has no arbitrary combat-stat buff;
- source/diff audited only; no browser/local runtime success claim from this chat environment.
