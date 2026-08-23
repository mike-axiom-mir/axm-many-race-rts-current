import { RTSWorld } from "./world.js";

const previousBindInput = RTSWorld.prototype.bindInput;

// Expose the active world only after this adapter is installed. Several optional
// macro helpers already look for this bridge, but the base runtime does not
// guarantee it by itself.
RTSWorld.prototype.bindInput = function combatWaypointWorldBridge() {
  window.__AXM_RTS_WORLD__ = this;
  return previousBindInput.call(this);
};

// Building placement is private to game.js. Its supported cancellation path is
// Escape, so arming the army destination uses that same public interaction
// rather than reaching into the game's closure state.
document.addEventListener("click", event => {
  const button = event.target?.closest?.('[data-axm-combat-waypoint="place"]');
  if (!button) return;
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}, true);
