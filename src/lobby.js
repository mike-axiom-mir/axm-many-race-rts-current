import { FACTIONS } from "./factions.js";
import { factionNpcFor } from "./factionNpcs.js";
import { CONTROLLER_TYPES, loadLobby, saveLobby, validateLobby, normalizeLobby } from "./seatControllers.js";

const $ = id => document.getElementById(id);
const ui = {
  seats: $("seatList"), map: $("mapSelect"), mapName: $("mapName"), mapDescription: $("mapDescription"),
  speed: $("speedSelect"), age: $("ageSelect"), resources: $("resourceSelect"), victory: $("victorySelect"), seed: $("seedInput"),
  validation: $("validation"), teams: $("teamSummary"), save: $("saveBtn"), launch: $("launchBtn")
};

let lobby = loadLobby();
const factionIds = Object.keys(FACTIONS);

const MAP_INFO = {
  "founders-crossing": {
    name: "Founder's Crossing",
    projection: "flat",
    description: "Current stable flat skirmish battlefield. Lobby metadata supports four active seats while the underlying multi-side combat adapter continues to mature.",
    launch: "./skirmish.html"
  },
  crownworld: {
    name: "Crownworld",
    projection: "globe",
    description: "Planetary battlefield using the spherical conquest runtime and great-circle movement.",
    launch: "./globe.html"
  }
};

function render() {
  lobby = normalizeLobby(lobby);
  ui.seats.innerHTML = "";
  lobby.seats.forEach((seat, index) => ui.seats.appendChild(renderSeat(seat, index)));
  ui.map.value = lobby.mapId;
  ui.speed.value = lobby.gameSpeed;
  ui.age.value = String(lobby.startingAge);
  ui.resources.value = lobby.resources;
  ui.victory.value = lobby.victory;
  ui.seed.value = lobby.seed;
  updateMapInfo();
  renderValidation();
}

function renderSeat(seat, index) {
  const row = document.createElement("div");
  row.className = `seat ${seat.controller === "closed" ? "closed" : ""}`;

  const slot = document.createElement("div");
  slot.className = "slot";
  slot.textContent = index + 1;

  const identity = document.createElement("div");
  const label = document.createElement("input");
  label.value = seat.label || `Seat ${index + 1}`;
  label.addEventListener("change", () => { seat.label = label.value.trim() || `Seat ${index + 1}`; persist(); });
  identity.appendChild(label);
  const identityNote = document.createElement("small");
  identityNote.textContent = seat.controller === "connected-ai" ? "External/local AI uses normal player-visible state." : seat.controller === "faction-ai" ? "Native faction NPC controls this seat." : seat.controller === "human" ? "Human player seat." : "Disabled.";
  identity.appendChild(identityNote);

  const controllerCell = document.createElement("div");
  const controller = document.createElement("select");
  for (const type of CONTROLLER_TYPES) {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.name;
    controller.appendChild(option);
  }
  controller.value = seat.controller;
  controller.addEventListener("change", () => {
    seat.controller = controller.value;
    if (seat.controller === "faction-ai") seat.ready = true;
    if (seat.controller === "closed") seat.ready = false;
    if (seat.controller === "human") seat.ready = false;
    if (seat.controller === "connected-ai") seat.connectedAI.sameInformationGate = true;
    persist();
    render();
  });
  controllerCell.appendChild(controller);
  const controllerNote = document.createElement("small");
  controllerNote.textContent = CONTROLLER_TYPES.find(x => x.id === seat.controller)?.description || "";
  controllerCell.appendChild(controllerNote);

  const factionCell = document.createElement("div");
  factionCell.className = "faction-cell";
  const faction = document.createElement("select");
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "Choose faction";
  faction.appendChild(none);
  for (const factionId of factionIds) {
    const f = FACTIONS[factionId];
    const option = document.createElement("option");
    option.value = factionId;
    option.textContent = `${f.symbol} ${f.name}`;
    faction.appendChild(option);
  }
  faction.value = seat.factionId || "";
  faction.disabled = seat.controller === "closed";
  faction.addEventListener("change", () => { seat.factionId = faction.value || null; if (seat.controller === "faction-ai" && seat.factionId) seat.label = factionNpcFor(seat.factionId)?.name || `Faction AI ${index + 1}`; persist(); render(); });
  factionCell.appendChild(faction);
  const npc = seat.factionId ? factionNpcFor(seat.factionId) : null;
  const factionNote = document.createElement("small");
  factionNote.textContent = npc && seat.controller === "faction-ai" ? npc.summary : seat.factionId ? FACTIONS[seat.factionId].tagline : "Faction can be selected later.";
  factionCell.appendChild(factionNote);

  const teamCell = document.createElement("div");
  teamCell.className = "team-cell";
  const team = document.createElement("select");
  for (let i = 1; i <= 4; i++) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Team ${i}`;
    team.appendChild(option);
  }
  team.value = String(seat.team || index + 1);
  team.disabled = seat.controller === "closed";
  team.addEventListener("change", () => { seat.team = Number(team.value); persist(); renderValidation(); });
  teamCell.appendChild(team);

  const readyCell = document.createElement("div");
  readyCell.className = "ready-cell";
  const ready = document.createElement("input");
  ready.type = "checkbox";
  ready.checked = Boolean(seat.ready);
  ready.disabled = seat.controller === "closed" || seat.controller === "faction-ai";
  ready.addEventListener("change", () => { seat.ready = ready.checked; persist(); renderValidation(); });
  const readyLabel = document.createElement("small");
  readyLabel.textContent = seat.controller === "closed" ? "Closed" : seat.controller === "faction-ai" ? "Auto ready" : "Ready";
  readyCell.append(ready, readyLabel);

  row.append(slot, identity, controllerCell, factionCell, teamCell, readyCell);
  return row;
}

function updateMapInfo() {
  const info = MAP_INFO[lobby.mapId] || MAP_INFO["founders-crossing"];
  lobby.projection = info.projection;
  ui.mapName.textContent = info.name;
  ui.mapDescription.textContent = info.description;
  ui.launch.href = info.launch;
  ui.launch.textContent = info.projection === "globe" ? "Launch globe" : "Launch flat skirmish";
}

function renderValidation() {
  const result = validateLobby(lobby);
  const lines = [];
  if (result.valid) lines.push(`<div class="ok">✓ Lobby contract valid</div>`);
  for (const error of result.errors) lines.push(`<div class="bad">× ${escapeHtml(error)}</div>`);
  for (const warning of result.warnings) lines.push(`<div class="warn">• ${escapeHtml(warning)}</div>`);
  ui.validation.innerHTML = lines.join("");

  const active = result.lobby.seats.filter(seat => seat.controller !== "closed");
  const teams = new Map();
  for (const seat of active) teams.set(seat.team, (teams.get(seat.team) || 0) + 1);
  ui.teams.innerHTML = [...teams.entries()].map(([team, count]) => `<span class="chip">Team ${team}: ${count}</span>`).join("");
  ui.launch.style.pointerEvents = result.valid ? "auto" : "none";
  ui.launch.style.opacity = result.valid ? "1" : ".45";
}

function persist() {
  saveLobby(lobby);
}

ui.map.addEventListener("change", () => { lobby.mapId = ui.map.value; updateMapInfo(); persist(); renderValidation(); });
ui.speed.addEventListener("change", () => { lobby.gameSpeed = ui.speed.value; persist(); });
ui.age.addEventListener("change", () => { lobby.startingAge = Number(ui.age.value); persist(); });
ui.resources.addEventListener("change", () => { lobby.resources = ui.resources.value; persist(); });
ui.victory.addEventListener("change", () => { lobby.victory = ui.victory.value; persist(); });
ui.seed.addEventListener("change", () => { lobby.seed = Number(ui.seed.value) || Math.floor(Math.random() * 99999999); persist(); });
ui.save.addEventListener("click", () => { persist(); ui.save.textContent = "Saved ✓"; setTimeout(() => ui.save.textContent = "Save lobby", 1000); });
ui.launch.addEventListener("click", () => persist());

function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }

render();
