import { FACTIONS } from "./factions.js";
import { CONTROLLER_TYPES, createSeat } from "./seatControllers.js";
import { BUILTIN_UNIT_PACKS, normalizeUnitPack, validateUnitPack } from "./contentPacks.js";
import { createBlankBattleMap, normalizeBattleMap, validateBattleMap, exportBattleMapJSON } from "./battleMapSchema.js";
import { normalizeMapDefinition } from "./mapSchema.js";

const $ = id => document.getElementById(id);
const ui = {
  name: $("battleName"), id: $("battleId"), subtitle: $("battleSubtitle"), description: $("battleDescription"), difficulty: $("difficulty"),
  mapSelect: $("mapSelect"), mapStatus: $("mapStatus"), importMap: $("importMapBtn"), importPack: $("importPackBtn"), packList: $("packList"),
  time: $("timeOfDay"), weather: $("weather"), intro: $("introText"), victory: $("victoryText"), sceneName: $("sceneName"), sceneSummary: $("sceneSummary"),
  markers: $("sceneMarkers"), slots: $("slotEditor"), forces: $("forceList"), addForce: $("addForceBtn"), objectives: $("objectiveList"), addObjective: $("addObjectiveBtn"),
  buildMode: $("buildMode"), economyMode: $("economyMode"), reinforcements: $("reinforcements"), validation: $("battleValidation"),
  newBattle: $("newBattleBtn"), importBattle: $("importBattleBtn"), exportBattle: $("exportBattleBtn"),
  mapFile: $("mapFile"), packFile: $("packFile"), battleFile: $("battleFile")
};

let battle = createBlankBattleMap();
const customPacks = [];
const factionIds = Object.keys(FACTIONS);

function slugify(text) {
  return String(text || "battle-map").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "battle-map";
}

function allUnitPacks() {
  return [...Object.values(BUILTIN_UNIT_PACKS), ...customPacks];
}

function allUnits() {
  const rows = [];
  for (const pack of allUnitPacks()) {
    for (const unit of pack.units) rows.push({ packId: pack.id, factionId: pack.factionId, unit });
  }
  return rows;
}

function anchors() {
  const list = [
    { id: "playerStart", name: "Player start" },
    { id: "enemyStart", name: "Enemy start" }
  ];
  const embedded = battle.map.embedded;
  if (embedded) {
    for (const site of embedded.strategicSites || []) list.push({ id: `site:${site.id}`, name: site.name || site.id });
    for (const zone of embedded.resourceZones || []) list.push({ id: `resource:${zone.id}`, name: zone.name || zone.id });
  } else if (battle.map.mapId === "founders-crossing") {
    list.push(
      { id: "site:crossing", name: "Founder Stone" },
      { id: "site:timber-crown", name: "Timber Crown" },
      { id: "site:old-quarry", name: "Old Quarry" }
    );
  } else if (battle.map.mapId === "crownworld") {
    ["north-crown", "east-crown", "south-crown", "west-crown", "far-crown"].forEach(id => list.push({ id: `site:${id}`, name: id.replace(/-/g, " ") }));
  }
  return list;
}

function render() {
  syncInputsFromBattle();
  renderMapState();
  renderPacks();
  renderSlots();
  renderForces();
  renderObjectives();
  renderSceneBoard();
  renderValidation();
}

function syncInputsFromBattle() {
  ui.name.value = battle.name;
  ui.id.value = battle.id;
  ui.subtitle.value = battle.subtitle || "";
  ui.description.value = battle.description || "";
  ui.difficulty.value = battle.difficulty || "normal";
  ui.time.value = battle.scene.timeOfDay || "day";
  ui.weather.value = battle.scene.weather || "clear";
  ui.intro.value = battle.scene.introText || "";
  ui.victory.value = battle.scene.victoryText || "";
  ui.buildMode.value = battle.modifiers.buildMode || "normal";
  ui.economyMode.value = battle.modifiers.economyMode || "normal";
  ui.reinforcements.value = battle.modifiers.reinforcements || "normal";
  ui.sceneName.textContent = battle.name;
  ui.sceneSummary.textContent = `${battle.map.projection} map • ${battle.lobby.seats.filter(s => s.controller !== "closed").length} active seats • ${battle.startingForces.length} staged force groups • ${battle.objectives.length} objectives`;
}

function renderMapState() {
  if (battle.map.source === "custom" && battle.map.embedded) {
    ui.mapSelect.value = "custom";
    ui.mapStatus.textContent = `Embedded: ${battle.map.embedded.name} • ${battle.map.projection}`;
  } else {
    ui.mapSelect.value = battle.map.mapId === "crownworld" ? "crownworld" : "founders-crossing";
    ui.mapStatus.textContent = `Using built-in ${battle.map.mapId === "crownworld" ? "Crownworld" : "Founder's Crossing"}`;
  }
}

function renderPacks() {
  ui.packList.innerHTML = "";
  for (const pack of allUnitPacks()) {
    const item = document.createElement("div");
    item.className = "pack";
    item.innerHTML = `<b>${escapeHtml(pack.name)}</b><br><span class="muted">${escapeHtml(pack.factionId || "custom")} • ${pack.units.length} units • ${escapeHtml(pack.source || "custom")}</span>`;
    ui.packList.appendChild(item);
  }
}

function renderSlots() {
  ui.slots.innerHTML = "";
  battle.lobby.seats.forEach((seat, index) => {
    const row = document.createElement("div");
    row.className = "sloteditor";
    row.innerHTML = `<b>Seat ${index + 1}</b>`;

    const controller = document.createElement("select");
    for (const type of CONTROLLER_TYPES) {
      const option = document.createElement("option");
      option.value = type.id;
      option.textContent = type.name;
      controller.appendChild(option);
    }
    controller.value = seat.controller;
    controller.addEventListener("change", () => { seat.controller = controller.value; renderValidation(); renderSceneBoard(); });

    const faction = document.createElement("select");
    const none = document.createElement("option");
    none.value = ""; none.textContent = "No faction"; faction.appendChild(none);
    for (const id of factionIds) {
      const option = document.createElement("option"); option.value = id; option.textContent = `${FACTIONS[id].symbol} ${FACTIONS[id].name}`; faction.appendChild(option);
    }
    faction.value = seat.factionId || "";
    faction.addEventListener("change", () => { seat.factionId = faction.value || null; renderValidation(); });

    const team = document.createElement("select");
    for (let t = 1; t <= 4; t++) { const option = document.createElement("option"); option.value = String(t); option.textContent = `Team ${t}`; team.appendChild(option); }
    team.value = String(seat.team || index + 1);
    team.addEventListener("change", () => { seat.team = Number(team.value); renderValidation(); });

    row.append(controller, faction, team);
    ui.slots.appendChild(row);
  });
}

function renderForces() {
  ui.forces.innerHTML = "";
  const unitRows = allUnits();
  const anchorRows = anchors();
  battle.startingForces.forEach((force, index) => {
    const row = document.createElement("div");
    row.className = "force";

    const seat = document.createElement("select");
    battle.lobby.seats.forEach((s, i) => { const o = document.createElement("option"); o.value = s.id; o.textContent = `Seat ${i + 1}`; seat.appendChild(o); });
    seat.value = force.seatId || "seat-1";
    seat.addEventListener("change", () => force.seatId = seat.value);

    const unit = document.createElement("select");
    for (const item of unitRows) { const o = document.createElement("option"); o.value = `${item.packId}|${item.unit.id}`; o.textContent = `${item.unit.name} (${item.factionId || "custom"})`; unit.appendChild(o); }
    unit.value = `${force.packId || unitRows[0]?.packId || ""}|${force.unitId || unitRows[0]?.unit.id || ""}`;
    unit.addEventListener("change", () => { const [packId, unitId] = unit.value.split("|"); force.packId = packId; force.unitId = unitId; renderSceneBoard(); });

    const anchor = document.createElement("select");
    for (const item of anchorRows) { const o = document.createElement("option"); o.value = item.id; o.textContent = item.name; anchor.appendChild(o); }
    anchor.value = force.anchor || "playerStart";
    anchor.addEventListener("change", () => { force.anchor = anchor.value; renderSceneBoard(); });

    const count = document.createElement("input");
    count.type = "number"; count.min = "1"; count.max = "20"; count.value = force.count || 1;
    count.addEventListener("change", () => { force.count = Math.max(1, Number(count.value) || 1); renderSceneBoard(); });

    const remove = document.createElement("button"); remove.textContent = "×"; remove.addEventListener("click", () => { battle.startingForces.splice(index, 1); renderForces(); renderSceneBoard(); renderValidation(); });
    row.append(seat, unit, anchor, count, remove);
    ui.forces.appendChild(row);
  });
}

function renderObjectives() {
  ui.objectives.innerHTML = "";
  battle.objectives.forEach((objective, index) => {
    const row = document.createElement("div"); row.className = "objrow";
    const type = document.createElement("select"); ["primary","secondary","hidden"].forEach(value => { const o = document.createElement("option"); o.value = value; o.textContent = value; type.appendChild(o); }); type.value = objective.hidden ? "hidden" : objective.type || "primary";
    type.addEventListener("change", () => { objective.hidden = type.value === "hidden"; objective.type = type.value === "secondary" ? "secondary" : "primary"; });
    const text = document.createElement("input"); text.value = objective.text || ""; text.addEventListener("change", () => objective.text = text.value);
    const remove = document.createElement("button"); remove.textContent = "×"; remove.addEventListener("click", () => { battle.objectives.splice(index, 1); renderObjectives(); renderValidation(); });
    row.append(type, text, remove); ui.objectives.appendChild(row);
  });
}

function renderSceneBoard() {
  ui.sceneName.textContent = battle.name;
  ui.sceneSummary.textContent = `${battle.map.projection} map • ${battle.lobby.seats.filter(s => s.controller !== "closed").length} active seats • ${battle.startingForces.length} staged force groups • ${battle.objectives.length} objectives`;
  ui.markers.innerHTML = "";
  battle.startingForces.forEach((force, index) => {
    const marker = document.createElement("div"); marker.className = "marker";
    const seatIndex = Math.max(0, battle.lobby.seats.findIndex(s => s.id === force.seatId));
    const x = 18 + ((index * 23 + seatIndex * 11) % 65);
    const y = 18 + ((index * 31 + seatIndex * 17) % 54);
    marker.style.left = `${x}%`; marker.style.top = `${y}%`;
    const unitName = allUnits().find(item => item.packId === force.packId && item.unit.id === force.unitId)?.unit.name || force.unitId || "Formation";
    marker.innerHTML = `<b>Seat ${seatIndex + 1}</b><br>${escapeHtml(unitName)} ×${force.count || 1}<br><span class="muted">${escapeHtml(force.anchor || "start")}</span>`;
    ui.markers.appendChild(marker);
  });
}

function renderValidation() {
  const result = validateBattleMap(battle);
  const lines = [];
  if (result.valid) lines.push(`<div class="ok">✓ Battle Map package valid</div>`);
  result.errors.forEach(text => lines.push(`<div class="bad">× ${escapeHtml(text)}</div>`));
  result.warnings.forEach(text => lines.push(`<div class="warn">• ${escapeHtml(text)}</div>`));
  if (battle.lobby.seats.filter(s => s.controller !== "closed").length > 2) lines.push(`<div class="warn">• Four-seat package is authored; current flat battle runtime still needs the multi-side adapter to execute all seats simultaneously.</div>`);
  ui.validation.innerHTML = lines.join("");
}

function bindMainFields() {
  const bindings = [
    [ui.name, value => { battle.name = value; if (!battle.id || battle.id === "new-battle-map") battle.id = slugify(value); }],
    [ui.id, value => battle.id = slugify(value)], [ui.subtitle, value => battle.subtitle = value], [ui.description, value => battle.description = value],
    [ui.difficulty, value => battle.difficulty = value], [ui.time, value => battle.scene.timeOfDay = value], [ui.weather, value => battle.scene.weather = value],
    [ui.intro, value => battle.scene.introText = value], [ui.victory, value => battle.scene.victoryText = value],
    [ui.buildMode, value => battle.modifiers.buildMode = value], [ui.economyMode, value => battle.modifiers.economyMode = value], [ui.reinforcements, value => battle.modifiers.reinforcements = value]
  ];
  for (const [input, setter] of bindings) input.addEventListener("change", () => { setter(input.value); render(); });
}

ui.mapSelect.addEventListener("change", () => {
  const id = ui.mapSelect.value;
  if (id === "custom") return ui.mapFile.click();
  battle.map = { source: "builtin", mapId: id, projection: id === "crownworld" ? "globe" : "flat", embedded: null };
  render();
});
ui.importMap.addEventListener("click", () => ui.mapFile.click());
ui.importPack.addEventListener("click", () => ui.packFile.click());
ui.importBattle.addEventListener("click", () => ui.battleFile.click());

ui.mapFile.addEventListener("change", async () => {
  const file = ui.mapFile.files?.[0]; if (!file) return;
  try { const map = normalizeMapDefinition(JSON.parse(await file.text())); battle.map = { source: "custom", mapId: map.id, projection: map.projection, embedded: map }; render(); }
  catch (error) { alert(`Map import failed: ${error.message}`); }
  ui.mapFile.value = "";
});
ui.packFile.addEventListener("change", async () => {
  const file = ui.packFile.files?.[0]; if (!file) return;
  try { const pack = normalizeUnitPack(JSON.parse(await file.text())); const validation = validateUnitPack(pack); if (!validation.valid) throw new Error(validation.errors.join(" ")); customPacks.push(pack); battle.contentPacks.unitPacks.push(pack); render(); }
  catch (error) { alert(`Unit pack import failed: ${error.message}`); }
  ui.packFile.value = "";
});
ui.battleFile.addEventListener("change", async () => {
  const file = ui.battleFile.files?.[0]; if (!file) return;
  try { battle = normalizeBattleMap(JSON.parse(await file.text())); render(); }
  catch (error) { alert(`Battle Map import failed: ${error.message}`); }
  ui.battleFile.value = "";
});

ui.addForce.addEventListener("click", () => {
  const unit = allUnits()[0];
  battle.startingForces.push({ id: `force-${battle.startingForces.length + 1}`, seatId: "seat-1", packId: unit?.packId || null, unitId: unit?.unit.id || null, count: 1, anchor: "playerStart", facing: 0, behavior: "default" });
  renderForces(); renderSceneBoard(); renderValidation();
});
ui.addObjective.addEventListener("click", () => { battle.objectives.push({ id: `objective-${battle.objectives.length + 1}`, type: "primary", text: "New battle objective.", complete: false, hidden: false }); renderObjectives(); renderValidation(); });
ui.newBattle.addEventListener("click", () => { battle = createBlankBattleMap(); render(); });
ui.exportBattle.addEventListener("click", () => {
  const result = validateBattleMap(battle);
  const blob = new Blob([exportBattleMapJSON(result.battle)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${slugify(result.battle.id)}.battlemap.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
});

bindMainFields();
render();

function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }
