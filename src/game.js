import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { AGE_DATA, FACTIONS, RESOURCE_KEYS, getFactionList } from "./factions.js";
import { DEFAULT_MAP } from "./maps.js";
import { MapDirector } from "./mapDirector.js";
import {
  availabilityText,
  chooseEnemyBuilding,
  chooseEnemyUnit,
  enemyAllocationForFaction,
  unitAvailability
} from "./gameplayProgression.js";

const $ = id => document.getElementById(id);
const ui = {
  start: $("startScreen"), cards: $("factionCards"), left: $("leftHud"), right: $("rightHud"),
  factionName: $("factionName"), factionIcon: $("factionIcon"), factionTagline: $("factionTagline"),
  resources: $("resources"), workforce: $("workforceLabel"), allocation: $("allocation"),
  builds: $("buildButtons"), units: $("unitButtons"), upgrades: $("upgradeButtons"),
  state: $("strategyState"), age: $("ageBadge"), placement: $("placementHint"), toast: $("toast"), restart: $("restartBtn")
};

const BASE_INCOME = { food: .78, wood: .68, stone: .48, gold: .44 };
const RESOURCE_LABELS = { food: "Food", wood: "Wood", stone: "Stone", gold: "Gold" };
const RESOURCE_ICONS = { food: "◆", wood: "♣", stone: "⬢", gold: "●" };
const ACTIVE_MAP = DEFAULT_MAP;
const PLAYER_HOME = new THREE.Vector3(...ACTIVE_MAP.playerStart);
const ENEMY_HOME = new THREE.Vector3(...ACTIVE_MAP.enemyStart);
const AGE_NAMES = AGE_DATA.map(age => age.name);

const state = {
  started: false,
  ended: false,
  faction: null,
  enemyFaction: null,
  resources: { food: 0, wood: 0, stone: 0, gold: 0 },
  workforce: 0,
  allocation: { food: 30, wood: 30, stone: 20, gold: 20 },
  age: 0,
  buildings: [],
  researched: new Set(),
  placement: null,
  playerCapital: null,
  enemyCapital: null,
  frontier: "neutral",
  elapsed: 0,
  workforceClock: 0,
  hudClock: 0,
  enemy: {
    resources: { food: 0, wood: 0, stone: 0, gold: 0 },
    workforce: 0,
    allocation: { food: .30, wood: .27, stone: .18, gold: .25 },
    age: 0,
    buildings: [],
    workforceClock: 0,
    buildClock: 0,
    trainClock: 0,
    ageClock: 0,
    commandClock: 0,
    buildSerial: 0
  }
};

const world = new RTSWorld($("viewport"), {
  onGroundClick: point => handleGroundClick(point),
  onEntityDestroyed: entity => handleDestroyed(entity)
});
const mapDirector = new MapDirector(world);

function costText(cost = {}) {
  return Object.entries(cost).map(([k, v]) => `${RESOURCE_ICONS[k] || ""}${Math.round(v)}`).join(" ");
}

function scaledCost(cost, multiplier = 1) {
  return Object.fromEntries(Object.entries(cost || {}).map(([k, v]) => [k, Math.ceil(v * multiplier)]));
}

function canAfford(cost, resources = state.resources) {
  return Object.entries(cost).every(([k, v]) => (resources[k] || 0) >= v);
}

function spend(cost, resources = state.resources) {
  if (!canAfford(cost, resources)) return false;
  for (const [k, v] of Object.entries(cost)) resources[k] -= v;
  return true;
}

function toast(message, kind = "") {
  ui.toast.textContent = message;
  ui.toast.className = `toast ${kind}`.trim();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.add("hidden"), 2400);
}

function renderFactionCards() {
  ui.cards.innerHTML = "";
  for (const faction of getFactionList()) {
    const btn = document.createElement("button");
    btn.className = "faction-card";
    btn.innerHTML = `
      <div class="symbol">${faction.symbol}</div>
      <h3>${faction.name}</h3>
      <p>${faction.tagline}</p>
      <div class="traits">${faction.traits.join(" • ")}</div>`;
    btn.addEventListener("click", () => startGame(faction.id));
    ui.cards.appendChild(btn);
  }
}

function chooseEnemy(playerId) {
  const list = getFactionList();
  const i = list.findIndex(faction => faction.id === playerId);
  return list[(i + 1) % list.length];
}

function resetEnemyState(faction) {
  const starting = { ...faction.starting };
  delete starting.workforce;
  state.enemy.resources = starting;
  state.enemy.workforce = faction.starting.workforce;
  state.enemy.allocation = enemyAllocationForFaction(faction);
  state.enemy.age = 0;
  state.enemy.buildings = [];
  state.enemy.workforceClock = 0;
  state.enemy.buildClock = 0;
  state.enemy.trainClock = 0;
  state.enemy.ageClock = 0;
  state.enemy.commandClock = 0;
  state.enemy.buildSerial = 0;
}

function startGame(factionId) {
  const faction = FACTIONS[factionId];
  state.started = true;
  state.ended = false;
  state.faction = faction;
  state.enemyFaction = chooseEnemy(factionId);
  state.resources = { ...faction.starting };
  delete state.resources.workforce;
  state.workforce = faction.starting.workforce;
  state.allocation = { food: 30, wood: 30, stone: 20, gold: 20 };
  state.age = 0;
  state.buildings = [];
  state.researched = new Set();
  state.placement = null;
  state.frontier = "neutral";
  state.elapsed = 0;
  state.workforceClock = 0;
  state.hudClock = 0;
  resetEnemyState(state.enemyFaction);
  world.resetDynamic();
  mapDirector.reset(ACTIVE_MAP);
  world.ground.material.color.setHex(faction.terrainTint);

  state.playerCapital = world.spawnCapital(faction, PLAYER_HOME.clone(), false);
  world.spawnFounder(faction, PLAYER_HOME.clone().add(new THREE.Vector3(5,0,2)), false);
  world.spawnSquad(faction.units[0], faction, PLAYER_HOME.clone().add(new THREE.Vector3(7,0,4)), false);

  const enemy = state.enemyFaction;
  state.enemyCapital = world.spawnCapital(enemy, ENEMY_HOME.clone(), true);
  world.spawnFounder(enemy, ENEMY_HOME.clone().add(new THREE.Vector3(-5,0,-2)), true);
  world.spawnSquad(enemy.units[0], enemy, ENEMY_HOME.clone().add(new THREE.Vector3(-7,0,-4)), true);
  state.enemy.buildings = world.entities.filter(entity => entity.parent && entity.userData.owner === "enemy" && entity.userData.type === "building");

  ui.start.classList.add("hidden");
  ui.left.classList.remove("hidden");
  ui.right.classList.remove("hidden");
  ui.restart.classList.remove("hidden");
  ui.factionName.textContent = faction.name;
  ui.factionIcon.textContent = faction.symbol;
  ui.factionTagline.textContent = `${faction.founder} begins beside your capital on ${ACTIVE_MAP.name}. ${faction.special}`;
  renderEconomyControls();
  renderActions();
  renderHud();
  world.cameraTarget.copy(new THREE.Vector3(-18, 0, -8));
  toast(`${faction.founder} has founded the ${faction.name} on ${ACTIVE_MAP.name}.`, "good");
}

function renderEconomyControls() {
  ui.allocation.innerHTML = "";
  for (const key of RESOURCE_KEYS) {
    const row = document.createElement("div");
    row.className = "allocation-row";
    row.innerHTML = `<label>${RESOURCE_LABELS[key]}</label><input aria-label="${RESOURCE_LABELS[key]} priority" type="range" min="5" max="70" step="5" value="${state.allocation[key]}"><output></output>`;
    const input = row.querySelector("input");
    input.addEventListener("input", () => {
      state.allocation[key] = Number(input.value);
      updateAllocationLabels();
    });
    ui.allocation.appendChild(row);
  }
  updateAllocationLabels();
}

function allocationShares() {
  const total = Object.values(state.allocation).reduce((a,b) => a+b, 0) || 1;
  return Object.fromEntries(RESOURCE_KEYS.map(k => [k, state.allocation[k] / total]));
}

function updateAllocationLabels() {
  const shares = allocationShares();
  [...ui.allocation.children].forEach((row, i) => {
    const key = RESOURCE_KEYS[i];
    row.querySelector("output").textContent = `${Math.round(shares[key] * 100)}%`;
  });
}

function renderActions() {
  const faction = state.faction;
  ui.builds.innerHTML = "";
  for (const def of faction.buildings) {
    const cost = scaledCost(def.cost, faction.building.cost);
    const btn = document.createElement("button");
    btn.dataset.build = def.id;
    btn.innerHTML = `<b>${def.name}</b><small>${def.description}</small><small>${costText(cost)}</small>`;
    btn.addEventListener("click", () => beginPlacement(def));
    ui.builds.appendChild(btn);
  }

  ui.units.innerHTML = "";
  for (const def of faction.units) {
    const cost = scaledCost(def.cost, faction.military.cost);
    const requirement = availabilityText({ faction, unit: def, age: state.age, buildings: state.buildings, ageNames: AGE_NAMES });
    const btn = document.createElement("button");
    btn.dataset.unit = def.id;
    btn.innerHTML = `<b>${def.name}</b><small>${def.description}</small><small>${costText(cost)} • ${requirement}</small>`;
    btn.addEventListener("click", () => trainUnit(def));
    ui.units.appendChild(btn);
  }

  renderUpgrades();
}

function renderUpgrades() {
  ui.upgrades.innerHTML = "";
  const nextAge = AGE_DATA[state.age + 1];
  if (nextAge) {
    const researchPenalty = state.faction.id === "fatfrotz" ? 1.18 : 1;
    const cost = scaledCost(nextAge.cost, researchPenalty);
    const btn = document.createElement("button");
    btn.innerHTML = `<b>Advance to ${nextAge.name}</b><small>Stronger economy and access to later formations • ${costText(cost)}</small>`;
    btn.disabled = !canAfford(cost);
    btn.addEventListener("click", () => advanceAge(cost));
    ui.upgrades.appendChild(btn);
  }

  const techs = [
    { id:"stewarded-economy", name:"Stewarded Economy", age:0, cost:{wood:150,gold:100}, text:"All resource sectors +12%" },
    { id:"formation-doctrine", name:"Formation Doctrine", age:1, cost:{food:220,gold:160}, text:"New squads gain +15% health" },
    { id:"deep-foundations", name:"Deep Foundations", age:1, cost:{stone:220,wood:160}, text:"Future buildings gain +20% health" }
  ];
  for (const tech of techs) {
    if (state.age < tech.age || state.researched.has(tech.id)) continue;
    const btn = document.createElement("button");
    btn.innerHTML = `<b>${tech.name}</b><small>${tech.text} • ${costText(tech.cost)}</small>`;
    btn.disabled = !canAfford(tech.cost);
    btn.addEventListener("click", () => researchTech(tech));
    ui.upgrades.appendChild(btn);
  }
}

function advanceAge(cost) {
  if (!spend(cost)) return toast("Your economy cannot support that age yet.", "bad");
  state.age++;
  state.workforce += 4;
  renderActions();
  renderHud();
  toast(`${AGE_DATA[state.age].name} reached. New progression options are online.`, "good");
}

function researchTech(tech) {
  if (!spend(tech.cost)) return toast("Not enough resources for that doctrine.", "bad");
  state.researched.add(tech.id);
  renderUpgrades();
  toast(`${tech.name} integrated.`, "good");
}

function beginPlacement(def) {
  if (state.ended) return;
  const cost = scaledCost(def.cost, state.faction.building.cost);
  if (!canAfford(cost)) return toast("Not enough resources to construct that district.", "bad");
  state.placement = { def, cost };
  ui.placement.textContent = `${def.name}: click open terrain near your empire • Esc to cancel`;
  ui.placement.classList.remove("hidden");
}

function strategicFootprintClear(point) {
  for (const site of mapDirector.sites) {
    const center = new THREE.Vector3(...site.def.position);
    if (point.distanceTo(center) < Math.max(4.8, site.def.radius * .72)) return false;
  }
  return true;
}

function structureFootprintClear(point, extra = 3.2) {
  for (const entity of world.entities) {
    if (!entity.parent || (entity.userData.type !== "building" && entity.userData.type !== "capital")) continue;
    if (entity.position.distanceTo(point) < (entity.userData.radius || 2) + extra) return false;
  }
  return true;
}

function placementValid(point) {
  if (point.x > 15) return false;
  if (Math.abs(point.x) > 47 || Math.abs(point.z) > 33) return false;
  return strategicFootprintClear(point) && structureFootprintClear(point);
}

function handleGroundClick(point) {
  if (!state.started || state.ended || !state.placement) return;
  point.y = 0;
  if (!placementValid(point)) return toast("That site is blocked, strategic ground, or too deep in enemy territory.", "bad");
  const { def, cost } = state.placement;
  if (!spend(cost)) return toast("Resources changed before construction could begin.", "bad");
  const building = world.spawnBuilding(def, state.faction, point, false);
  if (state.researched.has("deep-foundations")) {
    building.userData.maxHp *= 1.2;
    building.userData.hp = building.userData.maxHp;
  }
  state.buildings.push(building);
  if (def.role === "economy") {
    state.workforce += 3;
    if (state.faction.id === "northpole") state.resources.food += 80;
  }
  state.placement = null;
  ui.placement.classList.add("hidden");
  renderActions();
  renderHud();
  toast(`${def.name} established.`, "good");
}

function trainUnit(def) {
  if (state.ended) return;
  const availability = unitAvailability({ faction: state.faction, unit: def, age: state.age, buildings: state.buildings });
  if (!availability.ready) {
    const reason = availabilityText({ faction: state.faction, unit: def, age: state.age, buildings: state.buildings, ageNames: AGE_NAMES });
    return toast(reason || "That formation is not available yet.", "bad");
  }
  const cost = scaledCost(def.cost, state.faction.military.cost);
  if (!spend(cost)) return toast("Your stores cannot equip that formation yet.", "bad");

  const spawn = state.playerCapital?.position?.clone?.().add(new THREE.Vector3(6 + Math.random()*2,0,3 + Math.random()*3)) || PLAYER_HOME.clone();
  const squad = world.spawnSquad(def, state.faction, spawn, false);
  if (state.researched.has("formation-doctrine")) {
    squad.userData.maxHp *= 1.15;
    squad.userData.hp = squad.userData.maxHp;
  }
  renderHud();
  toast(`${def.name} assembled as one formation.`, "good");
}

function commandArmy(command) {
  if (!state.started || state.ended) return;
  if (command === "defend") {
    world.command("player", PLAYER_HOME.clone().add(new THREE.Vector3(6,0,5)));
    toast("Army doctrine: defend the homeland.");
  } else if (command === "center") {
    const objective = mapDirector.objectiveFor("player");
    world.command("player", objective);
    toast("Army doctrine: secure the next strategic site.");
  } else if (command === "attack") {
    const target = state.enemyCapital?.position?.clone?.() || ENEMY_HOME.clone();
    world.command("player", target);
    toast("Army doctrine: pressure the enemy capital.");
  }
}

function incomeRateFor({ faction, workforce, allocation, age, buildings, owner, doctrine = 1 }) {
  const ageMult = AGE_DATA[age].multiplier;
  const territoryBonus = mapDirector.incomeBonus(owner);
  const rate = {};
  for (const key of RESOURCE_KEYS) {
    const factionMult = faction.economy[key] || 1;
    let gain = workforce * allocation[key] * BASE_INCOME[key] * factionMult * ageMult * doctrine;
    for (const building of buildings) {
      if (!building.parent || building.userData.hp <= 0) continue;
      const def = faction.buildings.find(item => item.id === building.userData.id);
      gain += def?.income?.[key] || 0;
    }
    gain += (territoryBonus[key] || 0) * ageMult;
    rate[key] = gain;
  }
  return rate;
}

function playerIncomeRate() {
  return incomeRateFor({
    faction: state.faction,
    workforce: state.workforce,
    allocation: allocationShares(),
    age: state.age,
    buildings: state.buildings,
    owner: "player",
    doctrine: state.researched.has("stewarded-economy") ? 1.12 : 1
  });
}

function economyTick(dt) {
  const rates = playerIncomeRate();
  for (const key of RESOURCE_KEYS) state.resources[key] += rates[key] * dt;

  state.workforceClock += dt;
  const ecoCount = state.buildings.filter(building => building.parent && building.userData.role === "economy").length;
  const growthInterval = Math.max(26, 48 - ecoCount * 5);
  if (state.workforceClock >= growthInterval) {
    state.workforceClock = 0;
    state.workforce += 1;
    toast("Population growth added one workforce unit.");
  }
}

function processMapState(dt) {
  mapDirector.update(dt, state.elapsed);
  state.frontier = mapDirector.centralOwner();
  for (const event of mapDirector.drainEvents()) {
    if (event.owner === "player") toast(`${event.site.name} secured — its resource bonus is now yours.`, "good");
    else if (event.owner === "enemy") toast(`${event.site.name} fell under enemy control.`, "bad");
    else if (event.previous === "player") toast(`${event.site.name} has slipped back to neutral.`, "bad");
  }
}

function enemyEconomyTick(dt) {
  const enemy = state.enemy;
  const faction = state.enemyFaction;
  const rates = incomeRateFor({
    faction,
    workforce: enemy.workforce,
    allocation: enemy.allocation,
    age: enemy.age,
    buildings: enemy.buildings,
    owner: "enemy"
  });
  for (const key of RESOURCE_KEYS) enemy.resources[key] += rates[key] * dt;

  enemy.workforceClock += dt;
  const ecoCount = enemy.buildings.filter(building => building.parent && building.userData.role === "economy").length;
  const growthInterval = Math.max(27, 49 - ecoCount * 5);
  if (enemy.workforceClock >= growthInterval) {
    enemy.workforceClock = 0;
    enemy.workforce += 1;
  }
}

function enemyBuildPoint(role) {
  const rings = [
    [8,-7], [9,7], [13,-2], [13,11], [16,-10], [18,5], [10,15], [20,14], [23,-4], [22,-15]
  ];
  for (let offset = 0; offset < rings.length; offset++) {
    const index = (state.enemy.buildSerial + offset) % rings.length;
    const [towardCenter, z] = rings[index];
    const point = ENEMY_HOME.clone().add(new THREE.Vector3(-towardCenter, 0, z));
    if (role === "defense") point.x += 2;
    if (point.x < 8 || Math.abs(point.z) > 32) continue;
    if (!strategicFootprintClear(point) || !structureFootprintClear(point, 2.7)) continue;
    state.enemy.buildSerial = index + 1;
    return point;
  }
  return null;
}

function enemyBuildTick(dt) {
  const enemy = state.enemy;
  enemy.buildClock += dt;
  if (enemy.buildClock < 6.5) return;
  enemy.buildClock = 0;
  enemy.buildings = enemy.buildings.filter(building => building.parent && building.userData.hp > 0);
  const def = chooseEnemyBuilding(state.enemyFaction, enemy.buildings);
  if (!def) return;
  const livingCount = enemy.buildings.length;
  const cap = 4 + enemy.age * 2;
  if (livingCount >= cap) return;
  const cost = scaledCost(def.cost, state.enemyFaction.building.cost);
  if (!canAfford(cost, enemy.resources)) return;
  const point = enemyBuildPoint(def.role);
  if (!point) return;
  spend(cost, enemy.resources);
  const building = world.spawnBuilding(def, state.enemyFaction, point, true);
  enemy.buildings.push(building);
  if (def.role === "economy") {
    enemy.workforce += 3;
    if (state.enemyFaction.id === "northpole") enemy.resources.food += 80;
  }
}

function enemyAgeTick(dt) {
  const enemy = state.enemy;
  if (enemy.age >= AGE_DATA.length - 1) return;
  enemy.ageClock += dt;
  if (enemy.ageClock < 8) return;
  enemy.ageClock = 0;
  const nextAge = AGE_DATA[enemy.age + 1];
  const penalty = state.enemyFaction.id === "fatfrotz" ? 1.18 : 1;
  const cost = scaledCost(nextAge.cost, penalty);
  if (!spend(cost, enemy.resources)) return;
  enemy.age++;
  enemy.workforce += 4;
  toast(`${state.enemyFaction.name} has reached ${AGE_DATA[enemy.age].name}.`, "bad");
}

function enemyTrainTick(dt) {
  const enemy = state.enemy;
  enemy.trainClock += dt;
  if (enemy.trainClock < 4.8) return;
  enemy.trainClock = 0;
  const enemySquads = world.getLiving("enemy", "squad");
  const territory = mapDirector.ownershipCount("enemy");
  const cap = 4 + enemy.age * 2 + territory;
  if (enemySquads.length >= cap) return;
  const unit = chooseEnemyUnit(state.enemyFaction, enemy.age, enemy.buildings);
  if (!unit) return;
  const cost = scaledCost(unit.cost, state.enemyFaction.military.cost);
  if (!spend(cost, enemy.resources)) return;
  const spawn = state.enemyCapital?.position?.clone?.().add(new THREE.Vector3(-6 - Math.random()*2,0,-3 + Math.random()*6)) || ENEMY_HOME.clone();
  world.spawnSquad(unit, state.enemyFaction, spawn, true);
}

function enemyCommandTick(dt) {
  const enemy = state.enemy;
  enemy.commandClock += dt;
  if (enemy.commandClock < 16) return;
  enemy.commandClock = 0;
  const squads = world.getLiving("enemy", "squad");
  if (!squads.length) return;
  const playerTerritory = mapDirector.ownershipCount("player");
  const pressureCapital = enemy.age >= 2 && squads.length >= 5 && Math.random() < .42;
  const raidCapital = playerTerritory >= 2 && Math.random() < .28;
  const target = pressureCapital || raidCapital
    ? state.playerCapital?.position?.clone?.() || PLAYER_HOME.clone()
    : mapDirector.objectiveFor("enemy");
  world.command("enemy", target);
}

function enemyTick(dt) {
  if (!state.enemyCapital?.parent || state.ended) return;
  enemyEconomyTick(dt);
  enemyBuildTick(dt);
  enemyAgeTick(dt);
  enemyTrainTick(dt);
  enemyCommandTick(dt);
}

function handleDestroyed(entity) {
  if (!state.started || state.ended) return;
  if (entity.userData.type === "capital") {
    if (entity.userData.owner === "enemy") endGame(true);
    else endGame(false);
  } else if (entity.userData.owner === "player" && entity.userData.type === "building") {
    state.buildings = state.buildings.filter(building => building !== entity);
    renderActions();
    toast(`${entity.userData.id} was destroyed.`, "bad");
  } else if (entity.userData.owner === "enemy" && entity.userData.type === "building") {
    state.enemy.buildings = state.enemy.buildings.filter(building => building !== entity);
  }
}

function endGame(victory) {
  state.ended = true;
  state.placement = null;
  ui.placement.classList.add("hidden");
  toast(victory ? "Enemy capital broken — strategic victory." : "Your capital has fallen — rebuild the doctrine.", victory ? "good" : "bad");
  ui.age.textContent = victory ? "VICTORY" : "DEFEAT";
}

function rateText(rates) {
  return RESOURCE_KEYS.map(key => `${RESOURCE_ICONS[key]}${rates[key].toFixed(1)}`).join(" ");
}

function renderHud() {
  if (!state.started) return;
  ui.age.textContent = AGE_DATA[state.age].name.toUpperCase();
  ui.workforce.textContent = `${state.workforce} workforce`;
  ui.resources.innerHTML = RESOURCE_KEYS.map(key => `<div class="resource"><span>${RESOURCE_ICONS[key]} ${RESOURCE_LABELS[key]}</span><strong>${Math.floor(state.resources[key])}</strong></div>`).join("");

  const playerSquads = world.getLiving("player", "squad");
  const enemySquads = world.getLiving("enemy", "squad");
  const founder = world.getLiving("player", "founder")[0];
  const capitalHp = state.playerCapital?.parent ? Math.max(0, state.playerCapital.userData.hp / state.playerCapital.userData.maxHp * 100) : 0;
  const territory = mapDirector.summary();
  const territoryRows = territory.map(site => {
    const owner = site.contested ? "Contested" : site.owner === "player" ? "Ours" : site.owner === "enemy" ? "Enemy" : "Neutral";
    const bonus = Object.entries(site.bonus || {}).map(([key,value]) => `+${value.toFixed(2)} ${key}/s`).join(" ");
    return `<div class="state-row"><span>${site.name}</span><b>${owner}${site.owner === "player" && bonus ? ` • ${bonus}` : ""}</b></div>`;
  }).join("");
  const availableUnits = state.faction.units.filter(unit => unitAvailability({ faction: state.faction, unit, age: state.age, buildings: state.buildings }).ready).length;
  const income = playerIncomeRate();

  ui.state.innerHTML = `
    <div class="state-row"><span>Map</span><b>${ACTIVE_MAP.name}</b></div>
    <div class="state-row"><span>Age</span><b>${AGE_DATA[state.age].name}</b></div>
    <div class="state-row"><span>Income / sec</span><b>${rateText(income)}</b></div>
    <div class="state-row"><span>Formation roster</span><b>${availableUnits} / ${state.faction.units.length} unlocked</b></div>
    <div class="state-row"><span>Formations</span><b>${playerSquads.length}</b></div>
    <div class="state-row"><span>Enemy formations</span><b>${enemySquads.length}</b></div>
    <div class="state-row"><span>Districts</span><b>${state.buildings.filter(building => building.parent).length}</b></div>
    <div class="state-row"><span>Enemy development</span><b>${AGE_DATA[state.enemy.age].name} • ${state.enemy.buildings.filter(building => building.parent).length} districts</b></div>
    <div class="state-row"><span>Territory</span><b>${mapDirector.ownershipCount("player")} / ${territory.length}</b></div>
    ${territoryRows}
    <div class="state-row"><span>Capital integrity</span><b>${capitalHp.toFixed(0)}%</b></div>
    <div class="state-row"><span>${state.faction.founder}</span><b>${founder ? Math.ceil(founder.userData.hp) + " hp" : "Fallen"}</b></div>`;

  for (const btn of ui.builds.querySelectorAll("button[data-build]")) {
    const def = state.faction.buildings.find(item => item.id === btn.dataset.build);
    btn.disabled = !canAfford(scaledCost(def.cost, state.faction.building.cost));
  }
  for (const btn of ui.units.querySelectorAll("button[data-unit]")) {
    const def = state.faction.units.find(item => item.id === btn.dataset.unit);
    const availability = unitAvailability({ faction: state.faction, unit: def, age: state.age, buildings: state.buildings });
    btn.disabled = !availability.ready || !canAfford(scaledCost(def.cost, state.faction.military.cost));
    const smalls = btn.querySelectorAll("small");
    if (smalls[1]) smalls[1].textContent = `${costText(scaledCost(def.cost, state.faction.military.cost))} • ${availabilityText({ faction: state.faction, unit: def, age: state.age, buildings: state.buildings, ageNames: AGE_NAMES })}`;
  }
  renderUpgrades();
}

function simulate(dt) {
  if (!state.started || state.ended) return;
  state.elapsed += dt;
  processMapState(dt);
  economyTick(dt);
  enemyTick(dt);
  state.hudClock += dt;
  if (state.hudClock >= .35) {
    state.hudClock = 0;
    renderHud();
  }
}

for (const btn of document.querySelectorAll("[data-command]")) btn.addEventListener("click", () => commandArmy(btn.dataset.command));
ui.restart.addEventListener("click", () => location.reload());
window.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.placement) {
    state.placement = null;
    ui.placement.classList.add("hidden");
    toast("Construction placement cancelled.");
  }
});

renderFactionCards();
let last = performance.now() / 1000;
function frame(ms) {
  const now = ms / 1000;
  const dt = Math.min(.05, Math.max(0, now - last));
  last = now;
  simulate(dt);
  world.tick(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
