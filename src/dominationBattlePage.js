import { FACTIONS } from "./factions.js";
import {
  loadPendingDominationBattle,
  validateDominationBattlePacket,
  validateDominationBattleResult,
  applyDominationBattleResult,
  runtimeHintForMap
} from "./dominationBattleAdapter.js";
import { territoryDefinition } from "./dominationWorld.js";

const $ = id => document.getElementById(id);
const ui = {
  title: $("battleTitle"), subtitle: $("battleSubtitle"), validation: $("validation"), runtime: $("runtimeStatus"),
  attackerName: $("attackerName"), attackerForces: $("attackerForces"), defenderName: $("defenderName"), defenderForces: $("defenderForces"),
  cities: $("cityObjectives"), copy: $("copyPacketBtn"), exportPacket: $("exportPacketBtn"), importResult: $("importResultBtn"), resultFile: $("resultFile"), resultStatus: $("resultStatus")
};

const packet = loadPendingDominationBattle();

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function forceRows(forces = []) {
  if (!forces.length) return `<div class="force"><span>No formations in this packet.</span></div>`;
  return forces.map(force => {
    const faction = FACTIONS[force.factionId];
    const unit = faction?.units.find(item => item.id === force.unitId);
    return `<div class="force"><b>${esc(unit?.name || force.unitId)} ×${force.count}</b><span>${esc(faction?.name || force.factionId)} • veterancy ${Number(force.veterancy || 0)}</span></div>`;
  }).join("");
}

function render() {
  const validation = validateDominationBattlePacket(packet);
  if (!packet) {
    ui.validation.innerHTML = `<div class="bad">No pending World Domination battle packet found.</div>`;
    ui.copy.disabled = true;
    ui.exportPacket.disabled = true;
    ui.importResult.disabled = true;
    return;
  }

  const source = territoryDefinition(packet.sourceTerritoryId);
  const target = territoryDefinition(packet.targetTerritoryId);
  ui.title.textContent = `${source?.name || packet.sourceTerritoryId} → ${target?.name || packet.targetTerritoryId}`;
  ui.subtitle.textContent = `${packet.attacker?.teamId || "attacker"} expedition into ${packet.defender?.teamId || "neutral"} territory`;
  ui.validation.innerHTML = [
    validation.valid ? `<div class="ok">✓ Strategic battle packet is valid.</div>` : "",
    ...validation.errors.map(text => `<div class="bad">× ${esc(text)}</div>`),
    ...validation.warnings.map(text => `<div class="warn">• ${esc(text)}</div>`)
  ].join("");

  const hint = runtimeHintForMap(packet.map);
  ui.runtime.innerHTML = `<div><b>${esc(hint.status)}</b><br>${esc(hint.text)}</div>`;
  ui.attackerName.textContent = packet.attacker?.teamId || "Attacker";
  ui.defenderName.textContent = packet.defender?.teamId || "Neutral defenders";
  ui.attackerForces.innerHTML = forceRows(packet.attacker?.forces);
  ui.defenderForces.innerHTML = forceRows(packet.defender?.forces);
  ui.cities.innerHTML = (packet.cityObjectives || []).map(city => `<div class="city"><b>${esc(city.name)}</b><span>${city.required ? "Required territory objective" : "Optional city"} • currently ${esc(city.owner || "neutral")}</span></div>`).join("") || `<div class="city"><span>No city objectives.</span></div>`;
}

async function copyPacket() {
  if (!packet) return;
  await navigator.clipboard?.writeText(JSON.stringify(packet, null, 2));
  ui.resultStatus.innerHTML = `<div class="ok">Battle packet copied.</div>`;
}

function exportPacket() {
  if (!packet) return;
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${packet.id.replace(/[^a-z0-9_-]+/gi, "-")}.domination-battle.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function importResult() {
  const file = ui.resultFile.files?.[0];
  if (!file || !packet) return;
  try {
    const result = JSON.parse(await file.text());
    const validation = validateDominationBattleResult(packet, result);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    const applied = applyDominationBattleResult(packet, result);
    if (!applied.ok) throw new Error(applied.errors.join(" "));
    ui.resultStatus.innerHTML = `<div class="ok">✓ Result applied to the persistent globe. ${esc(territoryDefinition(packet.targetTerritoryId)?.name || packet.targetTerritoryId)} has been updated.</div>`;
  } catch (error) {
    ui.resultStatus.innerHTML = `<div class="bad">× ${esc(error.message)}</div>`;
  }
  ui.resultFile.value = "";
}

ui.copy.addEventListener("click", copyPacket);
ui.exportPacket.addEventListener("click", exportPacket);
ui.importResult.addEventListener("click", () => ui.resultFile.click());
ui.resultFile.addEventListener("change", importResult);
render();
