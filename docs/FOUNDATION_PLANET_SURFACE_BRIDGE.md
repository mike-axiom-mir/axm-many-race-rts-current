# Foundation Planet → RTS globe-surface bridge v0.2

This bridge lets the Many-Race RTS deliberately consume verified coordinate samples from the separate Foundation Planet experiment and turn them into **proposal-only** `surfacePaint` entries for the RTS Map Schema v2 globe format.

It exists because both sides already had useful seams that were still isolated. Foundation Planet exposes the private local package `axm-foundation-planet-sampler`, which deterministically samples terrain/biome/ecology/geology evidence at explicit latitude/longitude coordinates. The RTS already stores globe authoring data at `{lat, lon, elevation}` and consumes `surfacePaint` through World Builder, Scenario Studio, and Globe Conquest. The bridge connects those contracts without copying the Planet model into the game.

## Boundary

`src/foundationPlanetSurfaceBridge.js` accepts a sampler receipt only after the caller supplies the provider's `verifySampleReceipt` function and that replay verification succeeds. It then maps the provider biome to one existing RTS surface skin while preserving coordinate evidence, provider receipt digest, provider capability version, biome/label/elevation evidence, and the fact that the mapping is a game projection.

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

## Versioned provider compatibility

The current interoperability pin is Foundation Planet PR #11:

- provider head: `d04a47289cdf6ed9f38b65fa989965504eee7e3e`;
- package: `axm-foundation-planet-sampler@0.2.0`;
- capability: `axm.foundation-planet.coordinate-sampler@1.1.0`;
- underlying Planet model revision: `b838933c0cf13b03add15bad9757a75a380d2173`.

Capability 1.1.0 defines coordinate identity explicitly: longitude is canonical in `[-180, 180)`, `+180` becomes `-180`, longitude at either exact pole is `0`, and signed zero becomes positive zero. The bridge independently refuses a 1.1.0 receipt that claims provider verification but still carries a noncanonical request/sample coordinate, and it preserves the declared coordinate-identity contract in proposal evidence.

The earlier PR #9 / package `0.1.0` / capability `1.0.0` receipt remains accepted as **legacy evidence**. It is not silently reinterpreted under the newer identity rules. Unsupported future capability versions fail closed until explicitly reviewed.

`integrations/foundation-planet-surface.json` records both the current pin and this compatibility boundary in machine-readable form. Hosted interoperability checks out the exact current provider head, runs its package regression, packs it, installs the tarball locally with npm offline mode, creates genuine receipts for equivalent antimeridian/pole/signed-zero coordinates, verifies those receipts with the installed provider, requires one canonical provider identity, maps the result, explicitly applies it to a real blank RTS globe map, and requires the current `validateMapDefinition(...)` consumer seam to admit it.

## Authority and non-goals

A passing bridge proves that a reviewed Foundation Planet sample receipt can become valid RTS globe-surface authoring data through an explicit adapter and that the current provider's coordinate identity survives that projection. It does **not** establish scientific truth, physical realism, suitable game balance, automatic map replacement, automatic provider execution, authorship authentication, release approval, merge authority, or CANON.

The adapter does not change existing RTS maps, choose coordinates, choose the Foundation Planet profile, run the provider itself, fetch anything from the network, or add the provider as a mandatory game dependency. A human or other explicitly authorized caller chooses whether to run the sampler and whether to apply the resulting proposal.
