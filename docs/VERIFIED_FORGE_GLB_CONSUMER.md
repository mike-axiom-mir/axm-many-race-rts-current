# Verified Game Asset Forge GLB consumer

Status: experimental interoperability seam, proposal/realization evidence only. No automatic runtime adoption, merge, release, or CANON authority.

## Why this exists

RTS PR #40 introduced `axm.rts.forge-unit-request/v0.1`: one unit-pack identity can be exported as an explicit Game Asset Forge request for Three.js + GLB. Game Asset Forge PR #17 later introduced `axm.game-assets.verified-glb-delivery/v0.1`: one caller-pinned verified rigid package can become a deterministic self-contained GLB bound back to that exact RTS request.

Those contracts still stopped before an RTS renderer consumed the produced bytes. This lane adds the missing consumer boundary without replacing the existing procedural RTS visuals or making Game Asset Forge a runtime dependency.

## Exact prerequisite and provider evidence

- RTS prerequisite: PR #40 exact head `020da41ef913a50856569ad0643e4882581ee3ff`.
- External delivery provider: `mike-axiom-mir/Axm-game-assets` PR #17 exact head `666409d64c15d9b836b56d0603f1c869b84d2bb4`.
- Provider delivery schema: `axm.game-assets.verified-glb-delivery/v0.1`.
- Consumer schema added here: `axm.rts.verified-forge-glb-consumer/v0.1`.

No provider source is copied into the RTS.

## Two explicit gates

`admitVerifiedForgeGlb(...)` is renderer-free. It independently checks:

- exact RTS request contract and explicit `rigid-proxy` + `threejs` + `glb` scope;
- provider delivery schema/state and closed authority envelope;
- canonical RTS request SHA-256 against the provider receipt;
- exact received GLB byte count and SHA-256;
- self-contained GLB v2 structure with one embedded buffer and no external image URIs;
- the source package manifest SHA-256 embedded inside the GLB against the delivery receipt.

Admission does not parse with Three.js and cannot alter a scene.

`realizeAdmittedForgeGlb(...)` is a separate explicit caller action. It rechecks the admitted GLB content identity before invoking a caller-supplied renderer parser. It accepts only a parsed Three.js Object3D containing at least one mesh and returns `REALIZED_NOT_INSTALLED`. It does not add that Object3D to any live scene, replace any RTS unit mesh, change gameplay state, or persist an asset.

A host may later choose to add the returned scene to a render graph. That host action remains separate from the admission/realization contract.

## Cross-repo proof

The dedicated workflow checks out the exact Game Asset Forge PR #17 head, runs its provider regressions, exports a real Northpole Guard `rigid-proxy` request from this RTS branch, builds and verifies a provider-owned rigid package, and derives the exact self-contained GLB through the provider seam.

It then installs exact Three.js r180 and Playwright only inside the CI evidence environment. A real Chromium page loads the produced request/receipt/GLB, passes the bytes through this consumer, parses the GLB once with the real Three.js `GLTFLoader`, explicitly attaches the returned scene only in the test host, and renders a frame with `WebGLRenderer`. The proof requires nonzero mesh count, finite nonzero bounds, at least one draw call and at least one rendered triangle, while keeping canonical game-state and runtime-install authority false.

Three.js is already the RTS renderer dependency. This lane adds no new product CDN, account, cloud, paid relay, AI, or runtime provider dependency.

## Truth boundary

A PASS proves content-bound interoperability from the exact RTS request through the exact pinned Game Asset Forge delivery into a real Three.js renderer parse/render path. It does not prove that the generated rigid box is a finished Northpole Guard, that it should replace the current unit art, that its scale/collision/balance is correct, or that any human visually approved it.

SHA-256 is content identity/integrity evidence, not producer or approver authentication. The GLB is replaceable expression; RTS unit/gameplay state remains authoritative. No asset is installed or selected automatically and no canonical game state is mutated by this capability.
