import { AGE_DATA } from "./factions.js";
import { CORE_UPGRADES, SIGNATURE_UPGRADES } from "./upgradeSystem.js";

function bridge() {
  return typeof window !== "undefined" ? window.__AXM_RTS_SKIRMISH_BRIDGE__ : null;
}

function record(type, payload) {
  try {
    return bridge()?.recordObservedCommand?.({ type, seatId: "player", payload }) || null;
  } catch (error) {
    console.warn("AXM observed-command capture skipped:", error);
    return null;
  }
}

function allocationValues() {
  const values = {};
  for (const row of document.querySelectorAll("#allocation .allocation-row")) {
    const label = String(row.querySelector("label")?.textContent || "").trim().toLowerCase();
    const input = row.querySelector("input");
    if (!input) continue;
    for (const key of ["food", "wood", "stone", "gold"]) {
      if (label.includes(key)) values[key] = Number(input.value || 0);
    }
  }
  return values;
}

function ageIntent(button) {
  const label = String(button.querySelector("b")?.textContent || button.textContent || "").trim();
  if (!label.toLowerCase().startsWith("advance to ")) return false;
  const age = AGE_DATA.find(item => label.toLowerCase().includes(String(item.name || "").toLowerCase()));
  if (!age) return false;
  record("advance-age-intent", { targetAge: age.index, ageName: age.name });
  return true;
}

function researchIntent(button) {
  const label = String(button.querySelector("b")?.textContent || button.textContent || "").trim();
  const candidates = [
    ...CORE_UPGRADES,
    ...Object.values(SIGNATURE_UPGRADES)
  ];
  const upgrade = candidates.find(item => label.toLowerCase().startsWith(String(item.name || "").toLowerCase()));
  if (!upgrade) return false;
  const levelMatch = label.match(/(\d+)\s*\/\s*(\d+)/);
  record("research-intent", { upgradeId: upgrade.id, nextLevel: levelMatch ? Number(levelMatch[1]) : 1 });
  return true;
}

function onClick(event) {
  const button = event.target?.closest?.("button");
  if (!button || button.disabled) return;

  if (button.dataset.build) {
    record("build-intent", { buildingId: button.dataset.build });
    return;
  }
  if (button.dataset.unit) {
    record("train-intent", { unitId: button.dataset.unit });
    return;
  }
  if (button.closest("#upgradeButtons")) {
    if (ageIntent(button)) return;
    researchIntent(button);
  }
}

function onAllocationChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "range" || !input.closest("#allocation")) return;
  record("economy-allocation", { values: allocationValues() });
}

if (typeof document !== "undefined") {
  document.addEventListener("click", onClick, true);
  document.addEventListener("change", onAllocationChange, true);
}
