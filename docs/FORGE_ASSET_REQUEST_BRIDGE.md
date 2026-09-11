# Game Asset Forge request bridge v0.1

This bridge lets the Many-Race RTS turn one of its existing portable `unit-pack` records into an explicit, deterministic request for the separate **AXM Game Asset Forge** repository. It is deliberately a request boundary, not an asset-generation or runtime-adoption boundary.

## Why this exists

The RTS already has stable unit identities and an offline `unit-pack` seam. Game Asset Forge already accepts deterministic JSON requests and turns them into an auditable Game Asset Genome. Without an adapter, those two capabilities remain isolated and every future asset lane has to manually restate identity, engine target, delivery format, budgets and source provenance.

`src/forgeAssetRequest.js` maps only the visual-production information the Forge needs. It does **not** copy combat/economy truth such as HP, damage, speed, range or cost. Physical scale and asset type are required from the caller instead of being guessed from gameplay values.

`tools/export-forge-unit-request.mjs` writes the provider-compatible request plus a separate receipt bound to an exact RTS commit and an exact Game Asset Forge commit. The bridge is standard-library-only and local/offline.

## Bounded contract

For v0.1 the consumer-owned profile requests:

- Three.js as the engine target;
- GLB as the delivery target;
- descending LOD triangle budgets of 30k / 15k / 7k / 3k;
- base color, normal, roughness and metallic PBR channels;
- an `rts` variant that prioritizes distant silhouette readability within the declared budget.

Those values are **RTS request policy**, not claims about what the provider has already generated. The provider remains responsible for auditing the request and for any later production stages.

The receipt authority is `REQUEST_ONLY`. Exporting a request does not execute the provider, install anything, replace a current RTS mesh, mutate canonical game state, merge a branch, approve a release, or establish CANON.

## Local use

First produce or save a `unit-pack` using the existing `unitPackFrom(...)` seam, then run:

```bash
node --experimental-default-type=module tools/export-forge-unit-request.mjs \
  --unit-pack /path/to/unit-pack.json \
  --unit guard \
  --asset-type character \
  --unit-meters 1.82 \
  --source-ref <exact-40-character-RTS-commit> \
  --provider-ref <exact-40-character-Game-Asset-Forge-commit> \
  --output /tmp/forge-request.json \
  --receipt /tmp/forge-request-receipt.json
```

A caller may then deliberately pass `/tmp/forge-request.json` to the pinned provider:

```bash
python /path/to/Axm-game-assets/forge.py init /tmp/forge-request.json /tmp/forge-output
python /path/to/Axm-game-assets/forge.py audit /tmp/forge-output/genome.json
```

The repository workflow proves this roundtrip against Game Asset Forge commit `ec6abc19b00365f40a0b1ec48eff760d75283e1f`: it exports a real built-in Northpole unit pack, builds the request, checks out that exact provider head, runs the provider self-test/init/audit, and independently verifies that the request digest and source provenance survive into the generated genome unchanged.

## Truth boundary / known limit

A successful roundtrip proves that a real RTS unit identity can enter the Forge intake contract with deterministic provenance and provider-audited constraints. It does **not** prove that geometry, materials, rigging, animation, collision or an in-game GLB exists. The provider genome is expected to remain at `canonical_stage: "intake"` with `pipeline.status: "initialized"` after this bridge test. A later, separate lane can consume an actually compiled asset only when concrete delivery evidence exists and the RTS has an explicit renderer-loading boundary for it.

The commit refs in the receipt are caller-supplied pins. CI proves them by checking out and comparing the exact provider commit; the receipt by itself is not cryptographic authorship proof.
