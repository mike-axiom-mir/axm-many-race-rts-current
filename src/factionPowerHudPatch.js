import { FactionPowerSystem } from "./factionPowerSystem.js";

const previousActivate = FactionPowerSystem.prototype.activate;
const previousRenderUi = FactionPowerSystem.prototype.renderUi;

function formatClock(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function ensureEnemyPowerRow() {
  let row = document.getElementById("enemyFactionPowerState");
  if (row) return row;
  const buttons = document.getElementById("factionPowerButtons");
  if (!buttons?.parentElement) return null;
  row = document.createElement("div");
  row.id = "enemyFactionPowerState";
  row.className = "state-row";
  row.innerHTML = "<span>Enemy power</span><strong>Watching…</strong>";
  buttons.insertAdjacentElement("afterend", row);
  return row;
}

FactionPowerSystem.prototype.activate = function recordedFactionPowerActivation(owner, powerId, source = "player") {
  const result = previousActivate.call(this, owner, powerId, source);
  if (result?.ok) this.stateFor(owner).lastPower = result.power;
  return result;
};

FactionPowerSystem.prototype.renderUi = function factionPowerHudRender(force = false) {
  const result = previousRenderUi.call(this, force);
  const row = ensureEnemyPowerRow();
  if (!row) return result;
  const value = row.querySelector("strong");
  const playerFaction = this.factionFor("player");
  const enemyFaction = this.factionFor("enemy");
  if (!enemyFaction) {
    value.textContent = "—";
    return result;
  }

  const mirrored = Boolean(playerFaction?.id && playerFaction.id === enemyFaction.id);
  const powerButtons = document.getElementById("factionPowerButtons");
  if (mirrored && powerButtons) {
    const ecoButton = powerButtons.querySelector('button[data-power-kind="eco"]');
    if (ecoButton) {
      ecoButton.disabled = true;
      ecoButton.title = "Mirrored factions share one economy definition in the current flat runtime; Attack and Defense remain available.";
      const small = ecoButton.querySelector("small");
      if (small && !small.textContent.includes("Mirrored matchup")) small.textContent += " • Mirrored matchup: unavailable";
    }
  }

  const state = this.stateFor("enemy");
  const cooldown = this.cooldownRemaining("enemy");
  const active = state.active && state.active.expiresAt > this.time ? state.active : null;
  if (active) {
    value.textContent = `${active.power.name} ${Math.ceil(active.expiresAt - this.time)}s • lock ${formatClock(cooldown)}`;
  } else if (state.lastPower && cooldown > 0) {
    value.textContent = `${state.lastPower.name} • lock ${formatClock(cooldown)}`;
  } else {
    value.textContent = "READY";
  }
  return result;
};
