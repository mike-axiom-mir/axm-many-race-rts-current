# Explicit Floorborn connected-seat application

This lane closes one boundary left deliberately open by the request-bound Floorborn bridge: a verified `READY` candidate can now cross the existing RTS connected-AI player door, but only after the caller supplies an approval bound to the exact admission bytes and exact seat.

## Why this is separate

`axm.rts.floorborn-bound-exchange` proves request identity, response integrity, deterministic provider replay, and exact legal-action selection. Its output intentionally has no command-execution or game-mutation authority.

This continuation does not weaken that boundary or teach Floorborn how to mutate the RTS directly. It adds a small host-side application gate after verification.

## Flow

```text
existing RTS public state + legal ordinary-seat moves
  -> exact local Floorborn v0.2 request/replay bridge
  -> READY bound-exchange admission
  -> caller inspects/chooses policy
  -> caller supplies:
       schema: axm.rts.floorborn-seat-approval/v0.1
       decision: APPROVE_THIS_DISPATCH
       admissionSha256: exact validated admission identity
       seatId: exact admitted seat
  -> application gate revalidates bound-exchange evidence + approval identity
  -> caller-supplied existing connectedAiCommand seat door
  -> existing axm-seat-command event path
  -> existing RTS seat admission decides the game-side effect
```

The provider never receives the game mutation callback. The application module does not execute, discover, install, or select Floorborn. A caller has to possess an already verified admission and separately authorize this dispatch.

## Approval object

The application gate deliberately does not mint approval automatically. The caller supplies the complete approval object:

```json
{
  "schema": "axm.rts.floorborn-seat-approval/v0.1",
  "decision": "APPROVE_THIS_DISPATCH",
  "admissionSha256": "<64 lowercase hex characters>",
  "seatId": "seat-1"
}
```

Use `fingerprintBoundFloorbornAdmission(admission)` to calculate the identity shown to the approving human or host policy. The same function revalidates the prerequisite evidence before hashing it.

## Fail-closed admission

Before dispatch, the gate requires:

- exact `axm.rts.floorborn-bound-exchange-receipt/v0.1` and `READY` state;
- the original all-false provider-selection / command-execution / game-mutation / merge / CANON authority record;
- exact Floorborn v0.2 request/response receipt fields;
- a PASS request-bound exchange verification whose own SHA-256 still matches its content;
- provider request/response identities that agree with that exchange verification;
- true exact-request, response-integrity, and deterministic-replay evidence, while authorship/game-mutation/CANON claims remain false;
- an ordinary `axm-rts-connected-seat-command/v1` move with finite coordinates;
- an approval whose admission SHA-256 and seat match the exact candidate being dispatched.

A post-approval mutation therefore invalidates the approval before the player door is called. If the supplied door throws, no successful application receipt is returned.

## Existing player door

The production callback is the repository's existing `connectedAiCommand(seatId, command)` export from `src/multiSeatPatch.js`. That function emits the existing `axm-seat-command` event; the existing seat listener remains responsible for checking that the seat is `connected-ai` or `human` and translating an admitted move into `world.command(...)`.

The hosted interoperability test imports that exact existing module, configures a connected-AI seat, and proves a real installed Floorborn candidate reaches the existing listener as `world.command("player", Vector3(12, 0, 8))`. A lightweight world-command witness is used so this focused bridge does not claim a complete rendered match.

## Authority boundary

A `DISPATCHED` receipt means the exact approved command crossed the supplied existing player door and that the door returned without throwing. It does not claim the downstream world reached a particular later state; the receipt explicitly records `downstreamGameStateObserved: false`.

The existing player door owns any game-side effect. This lane grants no automatic approval, provider execution, hidden seat choice, provider selection, merge, publication, or CANON authority. SHA-256 is content identity, not authorship authentication.

The approval is not crash-persistent replay protection. Reusing the same approval in a later explicit call can dispatch again; durable one-shot authorization would require caller-owned state and is outside this bounded lane.

The exact interoperability provider remains Floorborn PR #10 head `9183acabfd9fab1f2913527871e651300a160e62`, package `axm-floor-born@0.15.1`. This lane is stacked on RTS PR #49 exact head `15579a0b426829312bb7062146d7e2e341a9ee53`.

Mike remains the merge/CANON authority.
