import { createGameManifest } from "./gameManifest.js";
import { createCanonicalGameState } from "./gameState.js";
import { createSimulationClock } from "./simulationClock.js";
import { RUNTIME_CONTRACTS } from "./runtimeContract.js";

const foundation = {
  version: 1,
  manifest: createGameManifest(),
  runtimeContracts: RUNTIME_CONTRACTS,
  createGameState: createCanonicalGameState,
  createSimulationClock
};

if (typeof window !== "undefined") {
  window.__AXM_RTS_FOUNDATION__ = foundation;
  window.dispatchEvent(new CustomEvent("axm-rts-foundation-ready", { detail: { version: foundation.version } }));
}

export default foundation;
