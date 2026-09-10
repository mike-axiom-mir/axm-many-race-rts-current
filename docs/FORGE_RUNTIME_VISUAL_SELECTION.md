# Explicit Forge runtime visual selection

This lane is the downstream boundary after the verified Forge GLB consumer and the RTS tactical audition.

It answers one narrow question: after an exact Forge delivery has been admitted, parsed and explicitly approved by a caller, can the replaceable visual expression be installed on one live RTS squad and later rolled back without changing that squad's gameplay state?

## Contract

`src/forgeRuntimeVisual.js` exposes `axm.rts.forge-runtime-visual/v0.1`.

The sequence is deliberately explicit:

1. an existing `axm.rts.forge-unit-request/v0.1` identifies one RTS unit;
2. the existing verified GLB consumer produces `REALIZED_NOT_INSTALLED` evidence;
3. `bindExplicitVisualApproval(...)` accepts only an exact caller-declared `APPROVE_RUNTIME_VISUAL_EXPRESSION` decision bound to the verified GLB and admission digests;
4. `installApprovedFormationVisual(...)` requires a live `squad` whose `userData.id` matches the request's source `unit_id`, preserves every existing procedural child as the rollback fallback, and replaces only those visual children with clones of the verified realization;
5. `rollbackFormationVisual(...)` requires the exact installation SHA-256 and restores the original fallback objects.

The approval receipt says `authenticated_identity: false`. The capability can prove that an explicit approval object was supplied and content-bound; it cannot prove who supplied it.

## Authority boundary

Installation has authority to mutate the selected formation's replaceable render children only. It does not receive authority to change HP, damage, speed, targets, ownership, simulation rules, canonical game state, saves, package state, merge state, or CANON.

The current installation is intentionally session-local. It is not persisted and is not automatically re-applied after a reset or reload. Rollback state is held in a `WeakMap`, so losing the live formation also loses the temporary selector state rather than creating a hidden durable override.

The original procedural children are detached but not disposed while the verified expression is active. Rollback restores those exact object identities. A second installation is rejected until the first one is rolled back.

## Three.js grounding helper

`prepareGroundedThreeVisual(THREE, root)` is optional caller-side visual preparation. It creates a nested content group and centers/grounds only the cloned expression inside that group. The outer runtime slot transform remains owned by the formation layout.

That preparation is expression work, not gameplay truth. It does not rescale the asset to hide a bad physical-size match.

## Evidence target

The dedicated workflow keeps the provider and consumer boundaries executable. It:

- reruns the Game Asset Forge package/GLB regressions at the exact pinned provider head;
- exports a real Northpole Guard request from the exact RTS branch;
- builds a caller-pin-verified provider package and deterministic GLB;
- re-runs the inherited verified consumer and audition contracts;
- uses real Three.js + `GLTFLoader` in Chromium;
- creates a five-slot live `guard` squad, binds explicit approval, installs five verified visual clones, and renders them;
- proves a wrong rollback identity fails closed;
- rolls back and proves all five original procedural fallback objects return by identity;
- proves the formation gameplay `userData` remained byte-equivalent across install and rollback.

A passing workflow is evidence for this bounded expression-selection seam only. It is not visual-quality approval, authorship authentication, a finished Guard asset, animation/rigging evidence, persistence, release approval, merge approval, or CANON.
