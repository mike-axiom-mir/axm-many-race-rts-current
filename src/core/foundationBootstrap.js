import { createEntityIdAllocator } from "./entityIdentity.js";
import { createGameManifest } from "./gameManifest.js";
import { createCanonicalGameState } from "./gameState.js";
import { createReplayBridge } from "./replayBridge.js";
import { RUNTIME_CONTRACTS } from "./runtimeContract.js";
import { createWorldSnapshot, snapshotFingerprint } from "./runtimeSnapshot.js";
import { createSeededRng } from "./seededRng.js";
import { createSimulationClock } from "./simulationClock.js";

const foundation = {
  version: 2,
  manifest: createGameManifest(),
  runtimeContracts: RUNTIME_CONTRACTS,
  createGameState: createCanonicalGameState,
  createSimulationClock,
  createSeededRng,
  createEntityIdAllocator,
  createWorldSnapshot,
  snapshotFingerprint,
  createReplayBridge
};

if (typeof window !== "undefined") {
  window.__AXM_RTS_FOUNDATION__ = foundation;
  window.dispatchEvent(new CustomEvent("axm-rts-foundation-ready", { detail: { version: foundation.version } }));
}

export default foundation;
