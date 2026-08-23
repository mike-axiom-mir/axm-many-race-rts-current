import { FACTIONS, RESOURCE_KEYS } from "./factions.js";
import { unitUnlockAge } from "./gameplayProgression.js";

function currentFaction() {
  const name = document.getElementById("factionName")?.textContent?.trim();
  return Object.values(FACTIONS).find(faction => faction.name === name) || null;
}

function currentAge() {
  const text = document.getElementById("ageBtn")?.textContent || "";
  if (text.includes("Legacy Age reached")) return 3;
  if (text.includes("Advance: Legacy Age")) return 2;
  if (text.includes("Advance: Dominion Age")) return 1;
  if (text.includes("Advance: Expansion Age")) return 0;
  return 0;
}

function visibleResources() {
  const values = [...document.querySelectorAll("#resources .resource strong")].map(node => Number(node.textContent) || 0);
  return Object.fromEntries(RESOURCE_KEYS.map((key, index) => [key, values[index] || 0]));
}

function affordable(faction, unit) {
  const resources = visibleResources();
  const multiplier = Number(faction?.military?.cost || 1);
  return Object.entries(unit?.cost || {}).every(([key, value]) => (resources[key] || 0) >= Math.ceil(Number(value || 0) * multiplier));
}

function applyGate() {
  const faction = currentFaction();
  if (!faction) return;
  const age = currentAge();
  for (const button of document.querySelectorAll("#trainButtons button[data-unit]")) {
    const unit = faction.units.find(item => item.id === button.dataset.unit);
    if (!unit) continue;
    const requiredAge = unitUnlockAge(faction, unit);
    const ageLocked = age < requiredAge;
    button.disabled = ageLocked || !affordable(faction, unit);
    button.dataset.axmAgeLocked = ageLocked ? "1" : "0";
    if (ageLocked) {
      const small = button.querySelector("small");
      const label = ["Founding", "Expansion", "Dominion", "Legacy"][requiredAge] || `Age ${requiredAge + 1}`;
      if (small && !small.textContent.includes("Unlock:")) small.textContent += ` • Unlock: ${label} Age`;
    }
  }
}

const observer = new MutationObserver(applyGate);
observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
window.addEventListener("click", () => queueMicrotask(applyGate));
window.addEventListener("axm-globe-map-loaded", applyGate);
setInterval(applyGate, 700);
