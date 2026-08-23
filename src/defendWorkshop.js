import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { FACTIONS } from "./factions.js";
import { CONTROLLER_TYPES } from "./seatControllers.js";
import { DefenseSystem } from "./defenseSystem.js";
import { DEFEND_DIFFICULTIES, chooseUpgradeChoices, waveSpec } from "./defendConfig.js";

const $ = id => document.getElementById(id);
const ui = {
  setup: $("setup"), seatSetup: $("seatSetup"), difficulty: $("difficulty"), runLength: $("runLength"), setupValidation: $("setupValidation"), start: $("startBtn"),
  left: $("leftHud"), right: $("rightHud"), workshopHp: $("workshopHp"), workshopBar: $("workshopBar"), supply: $("supply"), supplyRate: $("supplyRate"), wave: $("wave"), hostiles: $("hostiles"),
  activeSeat: $("activeSeat"), activeFaction: $("activeFaction"), tower: $("towerBtn"), towerCost: $("towerCost"), repair: $("repairBtn"), repairCost: $("repairCost"), recruits: $("recruitButtons"),
  perimeter: $("perimeter"), owned: $("ownedUpgrades"), moveHint: $("moveHint"), toast: $("toast"), wavePanel: $("wavePanel"), waveKicker: $("waveKicker"), waveTitle: $("waveTitle"), waveText: $("waveText"), nextWave: $("nextWaveBtn"),
  upgradePanel: $("upgradePanel"), upgradeTitle: $("upgradeTitle"), upgradeChoices: $("upgradeChoices"), endPanel: $("endPanel"), endKicker: $("endKicker"), endTitle: $("endTitle"), endText: $("endText"), restart: $("restartBtn")
};

const seatControllers = CONTROLLER_TYPES.filter(type => ["human", "faction-ai", "connected-ai", "closed"].includes(type.id));
const factionList = Object.values(FACTIONS);
const seatSetup = Array.from({ length: 4 }, (_, index) => ({
  id: `seat-${index + 1}`,
  controller: index === 0 ? "human" : "closed",
  factionId: factionList[index % factionList.length].id,
  label: `Seat ${index + 1}`
}));

const state = {
  started: false, ended: false, seats: [], activeSeatId: null, difficultyId: "normal", targetWaves: 10,
  workshop: null, supply: 320, passiveRate: .72, wave: 0, waveActive: false, waveSpec: null, waveClearDelay: 0,
  towers: [], unlockedSockets: 8, usedSockets: new Set(), upgrades: [], pendingUpgrade: false, moveMode: false,
  towerDamageMult: 1, towerRangeBonus: 0, towerRateMult: 1, towerHealthMult: 1, waveRewardMult: 1,
  squadDamageMult: 1, squadHealthMult: 1, repairBonus: 0, aiClock: {}, hudClock: 0
};

const world = new RTSWorld($("viewport"), { onGroundClick: point => onGroundClick(point), onEntityDestroyed: entity => onDestroyed(entity) });
world.__axmTeamByOwner = { player: 1, enemy: 2 };
world.controlPoint.visible = false;
const defenseSystem = new DefenseSystem(world);
const socketGroup = new THREE.Group();
world.scene.add(socketGroup);

const WORKSHOP_TOWER_DEF = { id: "workshop-guard-tower", name: "Workshop Guard Tower", role: "defense", cost: {}, defense: 44, description: "Heavy survival-mode defense." };
const SOCKET_POSITIONS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index / 12) * Math.PI * 2;
  const radius = index % 2 ? 11.7 : 10.3;
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
});
const SPAWN_POINTS = [
  new THREE.Vector3(-44,0,-20), new THREE.Vector3(-44,0,20), new THREE.Vector3(44,0,-18), new THREE.Vector3(44,0,18),
  new THREE.Vector3(-20,0,-31), new THREE.Vector3(20,0,-31), new THREE.Vector3(-20,0,31), new THREE.Vector3(20,0,31)
];
const ALLY_STARTS = [new THREE.Vector3(-5,0,3), new THREE.Vector3(5,0,3), new THREE.Vector3(-5,0,-4), new THREE.Vector3(5,0,-4)];

function esc(value) { return String(value ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }
function activeSeats() { return state.seats.filter(seat => seat.controller !== "closed"); }
function seatById(id) { return state.seats.find(seat => seat.id === id) || state.seats[0]; }
function activeSeat() { return seatById(state.activeSeatId); }
function factionForSeat(seat) { return FACTIONS[seat?.factionId] || factionList[0]; }
function livingSeatSquads(seatId) { return world.getLiving("player", "squad").filter(entity => entity.userData.seatId === seatId); }

function toast(message, kind = "") {
  ui.toast.textContent = message;
  ui.toast.className = `toast ${kind}`.trim();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.add("hidden"), 2200);
}

function buildSetup() {
  ui.difficulty.innerHTML = Object.values(DEFEND_DIFFICULTIES).map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join("");
  ui.seatSetup.innerHTML = "";
  seatSetup.forEach((seat, index) => {
    const card = document.createElement("div");
    card.className = "seat-card";
    card.innerHTML = `<h3>Seat ${index + 1}</h3>`;
    const controllerLabel = document.createElement("label"); controllerLabel.textContent = "Controller";
    const controller = document.createElement("select");
    seatControllers.forEach(type => { const option = document.createElement("option"); option.value = type.id; option.textContent = type.name; controller.appendChild(option); });
    controller.value = seat.controller;
    controller.addEventListener("change", () => { seat.controller = controller.value; renderSetupValidation(); });
    controllerLabel.appendChild(controller);

    const factionLabel = document.createElement("label"); factionLabel.textContent = "Faction";
    const faction = document.createElement("select");
    factionList.forEach(item => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.symbol} ${item.name}`; faction.appendChild(option); });
    faction.value = seat.factionId;
    faction.addEventListener("change", () => seat.factionId = faction.value);
    factionLabel.appendChild(faction);
    card.append(controllerLabel, factionLabel);
    ui.seatSetup.appendChild(card);
  });
  renderSetupValidation();
}

function renderSetupValidation() {
  const active = seatSetup.filter(seat => seat.controller !== "closed");
  const players = active.filter(seat => seat.controller === "human" || seat.controller === "connected-ai");
  const lines = [];
  if (!active.length) lines.push(`<div class="bad">× At least one allied seat is required.</div>`);
  else lines.push(`<div class="ok">✓ ${active.length} allied seat${active.length === 1 ? "" : "s"} ready.</div>`);
  if (!players.length && active.length) lines.push(`<div>• AI-only defense run. Valid for simulation/testing.</div>`);
  if (active.filter(seat => seat.controller === "human").length > 1) lines.push(`<div>• Multiple human seats share one screen and use the active-seat command selector for now.</div>`);
  if (active.some(seat => seat.controller === "connected-ai")) lines.push(`<div>• Connected-AI seat present; external observation/command bridge can bind later.</div>`);
  ui.setupValidation.innerHTML = lines.join("");
  ui.start.disabled = !active.length;
}

function makeMat(color, roughness = .84) { return new THREE.MeshStandardMaterial({ color, roughness, metalness: .07, flatShading: true }); }
function cast(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

function spawnWorkshop() {
  const group = new THREE.Group();
  const dark = makeMat(0x273746), metal = makeMat(0x7895a6, .55), warm = makeMat(0xe7b965, .5), glass = makeMat(0x8fe2ff, .25);
  const base = cast(new THREE.Mesh(new THREE.CylinderGeometry(5.3, 6.0, 1.1, 10), dark)); base.position.y = .55;
  const hall = cast(new THREE.Mesh(new THREE.BoxGeometry(7.3, 3.4, 6.4), metal)); hall.position.y = 2.25;
  const roof = cast(new THREE.Mesh(new THREE.ConeGeometry(5.0, 2.0, 8), dark)); roof.position.y = 4.8; roof.rotation.y = Math.PI / 8;
  const core = cast(new THREE.Mesh(new THREE.OctahedronGeometry(1.0), glass)); core.position.y = 6.25; core.userData.spin = .65;
  group.add(base, hall, roof, core);
  for (const [x,z] of [[-3.2,-2.7],[3.2,-2.7],[-3.2,2.7],[3.2,2.7]]) {
    const stack = cast(new THREE.Mesh(new THREE.CylinderGeometry(.35,.48,3.6,7), dark)); stack.position.set(x,4.0,z); group.add(stack);
    const cap = cast(new THREE.Mesh(new THREE.ConeGeometry(.52,.8,7), warm)); cap.position.set(x,6.1,z); group.add(cap);
  }
  const difficulty = DEFEND_DIFFICULTIES[state.difficultyId] || DEFEND_DIFFICULTIES.normal;
  const maxHp = Math.round(3600 * difficulty.workshopHealth);
  group.userData = { type: "workshop", owner: "player", hp: maxHp, maxHp, damage: 0, radius: 5.7, label: "The Workshop" };
  world.dynamic.add(group); world.entities.push(group);
  state.workshop = group;
  return group;
}

function rebuildSockets() {
  while (socketGroup.children.length) {
    const child = socketGroup.children.pop(); child.geometry?.dispose?.(); child.material?.dispose?.();
  }
  SOCKET_POSITIONS.forEach((point, index) => {
    if (index >= state.unlockedSockets) return;
    const occupied = state.usedSockets.has(index) && state.towers[index]?.parent;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.7,.055,6,24), new THREE.MeshBasicMaterial({ color: occupied ? 0x77dca0 : 0x8aa6b9, transparent:true, opacity: occupied ? .18 : .34, depthWrite:false }));
    ring.rotation.x = Math.PI / 2; ring.position.copy(point); ring.position.y = .08; socketGroup.add(ring);
  });
}

function towerCost() { return Math.round(180 + state.towers.filter(tower => tower?.parent).length * 14); }
function repairCost() { return 80; }
function repairAmount() { return 430 + state.repairBonus; }
function unitSupplyCost(unit) { return Math.max(65, Math.round(Object.values(unit.cost || {}).reduce((a,b) => a + Number(b || 0), 0) * .72)); }

function buildTower(free = false) {
  const index = SOCKET_POSITIONS.findIndex((_, i) => i < state.unlockedSockets && !state.usedSockets.has(i));
  if (index < 0) return toast("No open Workshop tower sockets. Expanded Perimeter can unlock more.");
  const cost = towerCost();
  if (!free && state.supply < cost) return toast("Not enough Workshop Supply.");
  if (!free) state.supply -= cost;
  const visualFaction = FACTIONS.clockworkOrchard || factionList[0];
  const tower = world.spawnBuilding(WORKSHOP_TOWER_DEF, visualFaction, SOCKET_POSITIONS[index].clone(), false);
  tower.userData.seatId = "workshop";
  tower.userData.maxHp = Math.round(980 * state.towerHealthMult);
  tower.userData.hp = tower.userData.maxHp;
  tower.userData.damage = 44 * state.towerDamageMult;
  tower.userData.defenseRange = 14 + state.towerRangeBonus;
  tower.userData.fireInterval = .82 * state.towerRateMult;
  tower.userData.projectileSpeed = 16;
  state.towers[index] = tower; state.usedSockets.add(index); rebuildSockets();
  toast(free ? "Workshop Guard Tower online." : `Guard Tower built for ${cost} supply.`, "good");
}

function repairWorkshop() {
  if (!state.workshop?.parent || state.workshop.userData.hp >= state.workshop.userData.maxHp) return toast("Workshop does not need repairs.");
  const cost = repairCost(); if (state.supply < cost) return toast("Not enough Workshop Supply.");
  state.supply -= cost; state.workshop.userData.hp = Math.min(state.workshop.userData.maxHp, state.workshop.userData.hp + repairAmount());
  toast(`Workshop repaired +${repairAmount()} integrity.`, "good");
}

function markSeatEntity(entity, seat) {
  entity.userData.seatId = seat.id;
  entity.userData.controller = seat.controller;
  entity.userData.factionId = seat.factionId;
  return entity;
}

function applySquadRunMods(squad) {
  if (state.squadDamageMult !== 1) squad.userData.damage *= state.squadDamageMult;
  if (state.squadHealthMult !== 1) {
    squad.userData.maxHp *= state.squadHealthMult;
    squad.userData.hp = squad.userData.maxHp;
  }
}

function spawnAllies() {
  activeSeats().forEach((seat, index) => {
    const faction = factionForSeat(seat), start = ALLY_STARTS[index] || ALLY_STARTS[0];
    const founder = markSeatEntity(world.spawnFounder(faction, start.clone(), false), seat);
    founder.position.x += index % 2 ? .4 : -.4;
    const squad = markSeatEntity(world.spawnSquad(faction.units[0], faction, start.clone().add(new THREE.Vector3(index % 2 ? 2.5 : -2.5,0,2))), false), seat);
    applySquadRunMods(squad);
    state.aiClock[seat.id] = 2 + index;
  });
}

function spawnEnemyWave() {
  state.wave++;
  state.waveSpec = waveSpec(state.wave, activeSeats().length, state.difficultyId);
  state.waveActive = true; state.waveClearDelay = 0; ui.wavePanel.classList.add("hidden");
  const enemyFaction = factionList[(state.wave - 1) % factionList.length];
  for (let i = 0; i < state.waveSpec.count; i++) {
    const baseUnit = enemyFaction.units[(state.waveSpec.boss && i < 2) ? Math.min(1, enemyFaction.units.length - 1) : (Math.random() < .23 ? Math.min(1, enemyFaction.units.length - 1) : 0)];
    const scaled = {
      ...baseUnit,
      hp: Math.round(baseUnit.hp * state.waveSpec.healthScale * (state.waveSpec.boss && i < 2 ? 1.38 : 1)),
      damage: baseUnit.damage * state.waveSpec.damageScale * (state.waveSpec.boss && i < 2 ? 1.22 : 1),
      speed: baseUnit.speed * state.waveSpec.speedScale
    };
    const spawn = SPAWN_POINTS[i % SPAWN_POINTS.length].clone().add(new THREE.Vector3((Math.random()-.5)*6,0,(Math.random()-.5)*6));
    const squad = world.spawnSquad(scaled, enemyFaction, spawn, true);
    squad.userData.wave = state.wave;
    squad.userData.label = state.waveSpec.boss && i < 2 ? `Wave ${state.wave} breaker` : `${enemyFaction.name} wave force`;
  }
  world.command("enemy", state.workshop.position.clone());
  ui.waveKicker.textContent = state.waveSpec.boss ? "HEAVY WAVE" : "WAVE ACTIVE";
  toast(`${state.waveSpec.boss ? "Heavy " : ""}Wave ${state.wave} incoming: ${state.waveSpec.count} formations.`, "bad");
}

function completeWave() {
  state.waveActive = false;
  const reward = Math.round(state.waveSpec.clearReward * state.waveRewardMult);
  state.supply += reward;
  state.passiveRate += state.waveSpec.passiveIncrease;
  if (state.workshop?.parent) state.workshop.userData.hp = Math.min(state.workshop.userData.maxHp, state.workshop.userData.hp + 110);
  if (state.targetWaves > 0 && state.wave >= state.targetWaves) return endRun(true);
  state.pendingUpgrade = true;
  ui.upgradeTitle.textContent = `Wave ${state.wave} cleared • +${reward} supply`;
  renderUpgradeChoices();
  ui.upgradePanel.classList.remove("hidden");
}

function renderUpgradeChoices() {
  const choices = chooseUpgradeChoices(3, state.upgrades);
  ui.upgradeChoices.innerHTML = "";
  choices.forEach(upgrade => {
    const button = document.createElement("button"); button.className = "upgrade-card";
    button.innerHTML = `<div class="icon">${esc(upgrade.icon)}</div><b>${esc(upgrade.name)}</b><span>${esc(upgrade.description)}</span>`;
    button.addEventListener("click", () => chooseUpgrade(upgrade)); ui.upgradeChoices.appendChild(button);
  });
}

function chooseUpgrade(upgrade) {
  state.upgrades.push(upgrade.id);
  const e = upgrade.effect || {};
  if (e.towerDamage) { state.towerDamageMult *= e.towerDamage; for (const tower of state.towers) if (tower?.parent) tower.userData.damage *= e.towerDamage; }
  if (e.towerRange) { state.towerRangeBonus += e.towerRange; for (const tower of state.towers) if (tower?.parent) tower.userData.defenseRange += e.towerRange; }
  if (e.towerRate) { state.towerRateMult *= e.towerRate; for (const tower of state.towers) if (tower?.parent) tower.userData.fireInterval *= e.towerRate; }
  if (e.towerHealth) { state.towerHealthMult *= e.towerHealth; for (const tower of state.towers) if (tower?.parent) { const gain = tower.userData.maxHp * (e.towerHealth - 1); tower.userData.maxHp *= e.towerHealth; tower.userData.hp += gain; } }
  if (e.workshopHp && state.workshop?.parent) { state.workshop.userData.maxHp += e.workshopHp; state.workshop.userData.hp = Math.min(state.workshop.userData.maxHp, state.workshop.userData.hp + e.workshopHp); }
  if (e.passiveSupply) state.passiveRate += e.passiveSupply;
  if (e.waveReward) state.waveRewardMult *= e.waveReward;
  if (e.squadDamage) { state.squadDamageMult *= e.squadDamage; for (const squad of world.getLiving("player","squad")) squad.userData.damage *= e.squadDamage; }
  if (e.squadHealth) { state.squadHealthMult *= e.squadHealth; for (const squad of world.getLiving("player","squad")) { const gain = squad.userData.maxHp * (e.squadHealth - 1); squad.userData.maxHp *= e.squadHealth; squad.userData.hp += gain; } }
  if (e.repairBonus) state.repairBonus += e.repairBonus;
  if (e.supply) state.supply += e.supply;
  if (e.towerSockets) { state.unlockedSockets = Math.min(SOCKET_POSITIONS.length, state.unlockedSockets + e.towerSockets); rebuildSockets(); }
  state.pendingUpgrade = false; ui.upgradePanel.classList.add("hidden");
  showIntermission(`Upgrade installed: ${upgrade.name}.`, `Wave ${state.wave + 1} will bring stronger formations.`);
  toast(`${upgrade.name} installed.`, "good");
}

function showIntermission(title, text) {
  ui.waveKicker.textContent = "INTERMISSION"; ui.waveTitle.textContent = title; ui.waveText.textContent = text;
  ui.nextWave.textContent = `START WAVE ${state.wave + 1}`; ui.wavePanel.classList.remove("hidden");
}

function recruitmentCost(seat, unit) { return Math.round(unitSupplyCost(unit) * (factionForSeat(seat).military?.cost || 1)); }
function recruit(seat, unit) {
  const cost = recruitmentCost(seat, unit); if (state.supply < cost) return toast("Not enough Workshop Supply.");
  state.supply -= cost;
  const faction = factionForSeat(seat), index = activeSeats().findIndex(item => item.id === seat.id), start = ALLY_STARTS[Math.max(0,index)] || ALLY_STARTS[0];
  const squad = markSeatEntity(world.spawnSquad(unit, faction, start.clone().add(new THREE.Vector3((Math.random()-.5)*3,0,(Math.random()-.5)*3)), false), seat);
  applySquadRunMods(squad); toast(`${unit.name} joined ${seat.label}.`, "good");
}

function renderActiveSeat() {
  const seat = activeSeat(); if (!seat) return;
  const faction = factionForSeat(seat);
  ui.activeFaction.innerHTML = `<b>${faction.symbol} ${esc(faction.name)}</b>${esc(seat.controller)} • ${esc(faction.special)}`;
  ui.recruits.innerHTML = "";
  faction.units.forEach(unit => {
    const cost = recruitmentCost(seat, unit), button = document.createElement("button");
    button.innerHTML = `<b>Recruit ${esc(unit.name)}</b><small>${cost} supply • ${esc(unit.description || "formation")}</small>`;
    button.disabled = state.supply < cost; button.addEventListener("click", () => recruit(seat, unit)); ui.recruits.appendChild(button);
  });
}

function commandSeat(seatId, point) {
  for (const entity of world.entities) {
    if (!entity.parent || entity.userData.owner !== "player" || entity.userData.seatId !== seatId) continue;
    if (entity.userData.type !== "squad" && entity.userData.type !== "founder") continue;
    entity.userData.target = point.clone();
  }
}
function commandAll(point) { activeSeats().forEach(seat => commandSeat(seat.id, point)); }
function closestEnemyTo(point) {
  let best = null, bestD = Infinity;
  for (const enemy of world.getLiving("enemy")) { const d = enemy.position.distanceTo(point); if (d < bestD) { best = enemy; bestD = d; } }
  return best;
}
function runCommand(type) {
  const seat = activeSeat(); if (!seat) return;
  if (type === "hold") return commandSeat(seat.id, new THREE.Vector3((ALLY_STARTS[state.seats.indexOf(seat)]?.x || 0),0,(ALLY_STARTS[state.seats.indexOf(seat)]?.z || 0)));
  if (type === "intercept") { const enemy = closestEnemyTo(state.workshop.position); if (enemy) commandSeat(seat.id, enemy.position); return; }
  const points = { north:new THREE.Vector3(0,0,-21), east:new THREE.Vector3(24,0,0), south:new THREE.Vector3(0,0,21), west:new THREE.Vector3(-24,0,0) };
  if (points[type]) return commandSeat(seat.id, points[type]);
  if (type === "move") { state.moveMode = true; ui.moveHint.classList.remove("hidden"); }
}
function onGroundClick(point) {
  if (!state.started || !state.moveMode) return;
  state.moveMode = false; ui.moveHint.classList.add("hidden"); commandSeat(state.activeSeatId, point); toast("Active seat moving to marked ground.");
}

function updateFactionAi(dt) {
  if (!state.waveActive) return;
  for (const seat of activeSeats()) {
    if (seat.controller !== "faction-ai") continue;
    state.aiClock[seat.id] = (state.aiClock[seat.id] || 0) - dt;
    if (state.aiClock[seat.id] > 0) continue;
    state.aiClock[seat.id] = 4 + Math.random() * 3;
    const enemy = closestEnemyTo(state.workshop.position);
    if (enemy) commandSeat(seat.id, enemy.position);
    const squads = livingSeatSquads(seat.id);
    const faction = factionForSeat(seat), unit = faction.units[0], cost = recruitmentCost(seat, unit);
    if (squads.length < 2 && state.supply > Math.max(430, cost + 230)) recruit(seat, unit);
  }
}

function startRun() {
  const chosen = seatSetup.filter(seat => seat.controller !== "closed").map(seat => ({ ...seat })); if (!chosen.length) return;
  state.started = true; state.ended = false; state.seats = chosen; state.difficultyId = ui.difficulty.value; state.targetWaves = Number(ui.runLength.value) || 0;
  state.activeSeatId = chosen.find(seat => seat.controller === "human")?.id || chosen[0].id;
  state.supply = 320; state.passiveRate = .72; state.wave = 0; state.waveActive = false; state.towers = []; state.usedSockets = new Set(); state.unlockedSockets = 8; state.upgrades = [];
  state.towerDamageMult = 1; state.towerRangeBonus = 0; state.towerRateMult = 1; state.towerHealthMult = 1; state.waveRewardMult = 1; state.squadDamageMult = 1; state.squadHealthMult = 1; state.repairBonus = 0; state.aiClock = {};
  world.resetDynamic(); defenseSystem.reset(); world.__axmTeamByOwner = { player:1, enemy:2 }; world.controlPoint.visible = false;
  spawnWorkshop(); spawnAllies(); rebuildSockets(); buildTower(true); buildTower(true);
  ui.setup.classList.add("hidden"); ui.left.classList.remove("hidden"); ui.right.classList.remove("hidden");
  ui.activeSeat.innerHTML = chosen.map(seat => `<option value="${seat.id}">${esc(seat.label)} • ${esc(factionForSeat(seat).name)}</option>`).join(""); ui.activeSeat.value = state.activeSeatId;
  renderActiveSeat(); showIntermission("Workshop perimeter online.", "Two guard towers are already active. Passive supply is intentionally slow; wave clears are your main growth engine.");
  world.cameraTarget.set(0,0,0); world.cameraZoom = 1.15; world.camera.zoom = world.cameraZoom; world.camera.updateProjectionMatrix();
  window.__AXM_DEFEND_WORKSHOP__ = { world, state, command: connectedDefendCommand };
}

function onDestroyed(entity) {
  if (!state.started || state.ended) return;
  if (entity === state.workshop || entity.userData.type === "workshop") return endRun(false);
  if (entity.userData.owner === "player" && entity.userData.role === "defense") toast("A Workshop Guard Tower was destroyed.", "bad");
}

function endRun(victory) {
  if (state.ended) return; state.ended = true; state.waveActive = false;
  ui.wavePanel.classList.add("hidden"); ui.upgradePanel.classList.add("hidden"); ui.moveHint.classList.add("hidden"); ui.endPanel.classList.remove("hidden");
  ui.endKicker.textContent = victory ? "WORKSHOP HELD" : "WORKSHOP LOST";
  ui.endTitle.textContent = victory ? `${state.wave} waves survived.` : `The Workshop fell on wave ${Math.max(1,state.wave)}.`;
  ui.endText.textContent = victory ? "The run is complete. Your upgrade path and defense choices carried the Workshop through." : "The survival mode is built around one shared objective: once the Workshop goes down, every allied seat loses together.";
}

function updateWaveState(dt) {
  if (!state.waveActive || state.ended) return;
  const enemies = world.getLiving("enemy", "squad");
  if (enemies.length) { state.waveClearDelay = 0; return; }
  state.waveClearDelay += dt;
  if (state.waveClearDelay >= 1.0) completeWave();
}

function updateEnemyOrders(dt) {
  if (!state.waveActive || !state.workshop?.parent) return;
  state.enemyOrderClock = (state.enemyOrderClock || 0) - dt;
  if (state.enemyOrderClock > 0) return;
  state.enemyOrderClock = 2.2;
  world.command("enemy", state.workshop.position.clone());
}

function renderHud() {
  if (!state.started) return;
  const workshop = state.workshop;
  const hp = workshop?.parent ? Math.max(0, workshop.userData.hp) : 0, max = workshop?.userData.maxHp || 1;
  ui.workshopHp.textContent = `${Math.ceil(hp)} / ${Math.ceil(max)}`; ui.workshopBar.style.transform = `scaleX(${Math.max(0,Math.min(1,hp/max))})`;
  ui.supply.textContent = Math.floor(state.supply); ui.supplyRate.textContent = `${state.passiveRate.toFixed(2)}/s`; ui.wave.textContent = state.waveActive ? `${state.wave} ⚠` : state.wave; ui.hostiles.textContent = world.getLiving("enemy","squad").length;
  ui.towerCost.textContent = `${towerCost()} supply`; ui.repairCost.textContent = `${repairCost()} supply • +${repairAmount()} hp`;
  ui.tower.disabled = state.supply < towerCost() || state.usedSockets.size >= state.unlockedSockets; ui.repair.disabled = state.supply < repairCost() || !workshop?.parent || hp >= max;
  ui.perimeter.innerHTML = `<div><span>Guard towers</span><b>${state.towers.filter(tower => tower?.parent).length} / ${state.unlockedSockets}</b></div><div><span>Tower damage</span><b>${Math.round(44*state.towerDamageMult)}</b></div><div><span>Tower range</span><b>${(14+state.towerRangeBonus).toFixed(1)}</b></div><div><span>Fire interval</span><b>${(.82*state.towerRateMult).toFixed(2)}s</b></div>`;
  const counts = state.upgrades.reduce((map,id) => map.set(id,(map.get(id)||0)+1),new Map());
  ui.owned.innerHTML = counts.size ? [...counts.entries()].map(([id,count]) => `<div><span>${esc(id.replace(/-/g," "))}</span><b>×${count}</b></div>`).join("") : `<div><span>No wave upgrades yet</span><b>—</b></div>`;
  renderActiveSeat();
}

function update(dt) {
  if (!state.started || state.ended) return;
  state.supply += state.passiveRate * dt;
  updateEnemyOrders(dt); updateFactionAi(dt); updateWaveState(dt);
  state.hudClock += dt; if (state.hudClock >= .25) { state.hudClock = 0; renderHud(); }
}

function connectedDefendCommand(detail = {}) {
  const seat = seatById(detail.seatId); if (!seat || seat.controller !== "connected-ai") return false;
  if (detail.type === "move" && Array.isArray(detail.point)) { commandSeat(seat.id, new THREE.Vector3(Number(detail.point[0])||0,0,Number(detail.point[2])||0)); return true; }
  if (detail.type === "hold") { commandSeat(seat.id, new THREE.Vector3(0,0,0)); return true; }
  if (detail.type === "intercept") { const enemy = closestEnemyTo(state.workshop.position); if (enemy) commandSeat(seat.id, enemy.position); return Boolean(enemy); }
  if (detail.type === "recruit") { const faction = factionForSeat(seat), unit = faction.units.find(item => item.id === detail.unitId) || faction.units[0]; recruit(seat, unit); return true; }
  return false;
}

window.addEventListener("axm-defend-seat-command", event => connectedDefendCommand(event.detail || {}));
window.connectedDefendCommand = connectedDefendCommand;

ui.start.addEventListener("click", startRun); ui.nextWave.addEventListener("click", () => { if (!state.waveActive && !state.pendingUpgrade && !state.ended) spawnEnemyWave(); });
ui.tower.addEventListener("click", () => buildTower(false)); ui.repair.addEventListener("click", repairWorkshop); ui.activeSeat.addEventListener("change", () => { state.activeSeatId = ui.activeSeat.value; renderActiveSeat(); });
for (const button of document.querySelectorAll("[data-command]")) button.addEventListener("click", () => runCommand(button.dataset.command));
ui.restart.addEventListener("click", () => location.reload());

buildSetup();
let last = performance.now()/1000;
function frame(ms) {
  const now = ms/1000, dt = Math.min(.05, Math.max(0, now-last)); last = now;
  update(dt); defenseSystem.update(dt); world.tick(now,dt); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
