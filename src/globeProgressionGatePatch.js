import { FACTIONS } from "./factions.js";
import { unitUnlockAge } from "./gameplayProgression.js";

function currentFaction() {
  const name = document.getElementById("factionName")?.textContent?.trim();
  return Object.values(FACTIONS).find(faction => faction.name === name) || null;
}

function currentAge() {
  const text = document.getElementById("ageBtn")?.textContent || "";
  if (text.includes("Expansion Age")) return 0;
  if (text.includes("Dominion Age")) return 1;
  if (text.includes("Legacy Age")) return 2;
  if (text.includes("Legacy Age reached")) return 3;
  return 0;
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
    if (ageLocked) {
      button.disabled = true;
      button.dataset.axmAgeLocked = "1";
      const small = button.querySelector("small");
      if (small && !small.textContent.includes("Unlock:")) small.textContent += ` • Unlock: ${["Founding","Expansion","Dominion","Legacy"][requiredAge]} Age`;
    } else if (button.dataset.axmAgeLocked === "1") {
      button.disabled = false;
      delete button.dataset.axmAgeLocked;
    }
  }
}

const observer = new MutationObserver(applyGate);
observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
window.addEventListener("click", () => queueMicrotask(applyGate));
window.addEventListener("axm-globe-map-loaded", applyGate);
setInterval(applyGate, 700);
