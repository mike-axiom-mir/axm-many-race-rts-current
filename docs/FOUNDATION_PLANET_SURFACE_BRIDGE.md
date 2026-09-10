# Foundation Planet → RTS globe-surface bridge v0.1

This bridge lets the Many-Race RTS deliberately consume verified coordinate samples from the separate Foundation Planet experiment and turn them into **proposal-only** `surfacePaint` entries for the RTS Map Schema v2 globe format.

It exists because both sides already had useful seams that were still isolated. Foundation Planet PR #9 exposes a private local package, `axm-foundation-planet-sampler`, that deterministically samples terrain/biome/ecology/geology evidence at explicit latitude/longitude coordinates. The RTS already stores globe authoring data at `{lat, lon, elevation}` and consumes `surfacePaint` through World Builder, Scenario Studio, and Globe Conquest. The bridge connects those contracts without copying the Planet model into the game.

## Boundary

`src/foundationPlanetSurfaceBridge.js` accepts a sampler receipt only after the caller supplies the provider's `verifySampleReceipt` function and that replay verification succeeds. It then maps the provider biome to one existing RTS surface skin while preserving the exact coordinate, provider receipt digest, provider biome/label/elevation evidence, and the fact that the mapping is a game projection.

The biome mapping is intentionally explicit and fail-closed:

- deep ocean / ocean → `shallow-water`;
- coast / desert → `sand`;
- savanna / grassland → `grassland`;
- temperate forest / rainforest / taiga → `forest-floor`;
- tundra → `snow`;
- alpine → `stone`;
- ice → `ice`.

These are **RTS presentation/gameplay skin choices**, not claims that two scientific/environmental categories are physically equivalent. Unknown future provider biomes are rejected until somebody deliberately chooses a projection.

The result uses schema `axm.rts.foundation-planet-surface-proposal/v1` with status `PROPOSAL_ONLY`. Nothing is applied automatically. `applyFoundationPlanetSurfaceProposal(...)` is a separate explicit call that returns a new Map Schema v2 globe object and refuses collisions with existing object IDs.

## Provider pin and provenance

The integration is pinned to:

- repository: `mike-axiom-mir/foundation-planet-experiments`;
- PR: #9;
- provider head: `8f4e543669141acf93c61d44cf3827b1240e76f0`;
- package: `axm-foundation-planet-sampler@0.1.0`;
- capability: `axm.foundation-planet.coordinate-sampler@1.0.0`;
- underlying Planet model revision declared by the package: `b838933c0cf13b03add15bad9757a75a380d2173`.

`integrations/foundation-planet-surface.json` records the same provider/consumer boundary in machine-readable form. The hosted interoperability job checks out that exact provider head, runs its own package test, packs it, installs the tarball locally with npm offline mode, generates a genuine sample receipt, verifies it with the installed provider, maps it, explicitly applies it to a real blank RTS globe map, and requires the current `validateMapDefinition(...)` consumer seam to admit the result.

## Authority and non-goals

A passing bridge proves that a reviewed Foundation Planet sample receipt can become valid RTS globe-surface authoring data through an explicit adapter. It does **not** establish scientific truth, physical realism, suitable game balance, automatic map replacement, automatic provider execution, authorship authentication, release approval, merge authority, or CANON.

The adapter does not change existing RTS maps, choose coordinates, choose the Foundation Planet profile, run the provider itself, fetch anything from the network, or add the provider as a mandatory game dependency. A human or other explicitly authorized caller chooses whether to run the sampler and whether to apply the resulting proposal.
