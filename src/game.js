import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { AGE_DATA, FACTIONS, RESOURCE_KEYS, getFactionList } from "./factions.js";

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
const PLAYER_HOME = new THREE.Vector3(-30, 0, -17);
const ENEMY_HOME = new THREE.Vector3(30, 0, 17);

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
  unlocked: new Set(),
  researched: new Set(),
  placement: null,
  playerCapital: null,
  enemyCapital: null,
  frontier: "neutral",
  elapsed: 0,
  enemySpawnClock: 0,
  enemyAttackClock: 0,
  workforceClock: 0,
  hudClock: 0
};

const world = new RTSWorld($("viewport"), {
  onGroundClick: point => handleGroundClick(point),
  onEntityDestroyed: entity => handleDestroyed(entity)
});

function costText(cost = {}) {
  return Object.entries(cost).map(([k, v]) => `${RESOURCE_ICONS[k] || ""}${Math.round(v)}`).join(" ");
}

function scaledCost(cost, multiplier = 1) {
  return Object.fromEntries(Object.entries(cost || {}).map(([k, v]) => [k, Math.ceil(v * multiplier)]));
}

function canAfford(cost) {
  return Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v);
}

function pay(cost) {
  if (!canAfford(cost)) return false;
  for (const [k, v] of Object.entries(cost)) state.resources[k] -= v;
  return true;
}

function addResources(bundle) {
  for (const [k, v] of Object.entries(bundle || {})) state.resources[k] = (state.resources[k] || 0) + v;
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
  const ids = Object.keys(FACTIONS);
  const i = ids.indexOf(playerId);
  return FACTIONS[ids[(i + 1) % ids.length]];
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
  state.unlocked = new Set([faction.units[0].id]);
  state.researched = new Set();
  state.placement = null;
  state.frontier = "neutral";
  state.elapsed = 0;
  state.enemySpawnClock = 0;
  state.enemyAttackClock = 0;
  state.workforceClock = 0;
  state.hudClock = 0;
  world.resetDynamic();
  world.ground.material.color.setHex(faction.terrainTint);

  state.playerCapital = world.spawnCapital(faction, PLAYER_HOME.clone(), false);
  world.spawnFounder(faction, PLAYER_HOME.clone().add(new THREE.Vector3(5,0,2)), false);
  world.spawnSquad(faction.units[0], faction, PLAYER_HOME.clone().add(new THREE.Vector3(7,0,4)), false);

  const enemy = state.enemyFaction;
  state.enemyCapital = world.spawnCapital(enemy, ENEMY_HOME.clone(), true);
  world.spawnFounder(enemy, ENEMY_HOME.clone().add(new THREE.Vector3(-5,0,-2)), true);
  world.spawnSquad(enemy.units[0], enemy, ENEMY_HOME.clone().add(new THREE.Vector3(-7,0,-4)), true);

  ui.start.classList.add("hidden");
  ui.left.classList.remove("hidden");
  ui.right.classList.remove("hidden");
  ui.restart.classList.remove("hidden");
  ui.factionName.textContent = faction.name;
  ui.factionIcon.textContent = faction.symbol;
  ui.factionTagline.textContent = `${faction.founder} begins beside your capital. ${faction.special}`;
  renderEconomyControls();
  renderActions();
  renderHud();
  world.cameraTarget.copy(new THREE.Vector3(-18, 0, -8));
  toast(`${faction.founder} has founded the ${faction.name}.`, "good");
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
  const f = state.faction;
  ui.builds.innerHTML = "";
  for (const def of f.buildings) {
    const cost = scaledCost(def.cost, f.building.cost);
    const btn = document.createElement("button");
    btn.dataset.build = def.id;
    btn.innerHTML = `<b>${def.name}</b><small>${def.description}</small><small>${costText(cost)}</small>`;
    btn.addEventListener("click", () => beginPlacement(def));
    ui.builds.appendChild(btn);
  }

  ui.units.innerHTML = "";
  for (const def of f.units) {
    const cost = scaledCost(def.cost, f.military.cost);
    const btn = document.createElement("button");
    btn.dataset.unit = def.id;
    btn.innerHTML = `<b>${def.name}</b><small>${def.description}</small><small>${costText(cost)}</small>`;
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
    btn.innerHTML = `<b>Advance to ${nextAge.name}</b><small>Stronger economy, army and new scaling • ${costText(cost)}</small>`;
    btn.disabled = !canAfford(cost);
    btn.addEventListener("click", () => advanceAge(cost));
    ui.upgrades.appendChild(btn);
  }

  const techs = [
    { id:"stewarded-economy", name:"Stewarded Economy", age:0, cost:{wood:150,gold:100}, text:"All resource sectors +12%", effect:"economy" },
    { id:"formation-doctrine", name:"Formation Doctrine", age:1, cost:{food:220,gold:160}, text:"New squads gain +15% health", effect:"army" },
    { id:"deep-foundations", name:"Deep Foundations", age:1, cost:{stone:220,wood:160}, text:"Future buildings gain +20% health", effect:"building" }
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
  if (!pay(cost)) return toast("Your economy cannot support that age yet.", "bad");
  state.age++;
  state.workforce += 4;
  renderActions();
  renderHud();
  toast(`${AGE_DATA[state.age].name} reached. Your empire's output rises.`, "good");
}

function researchTech(tech) {
  if (!pay(tech.cost)) return toast("Not enough resources for that doctrine.", "bad");
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

function placementValid(point) {
  if (point.x > 15) return false;
  if (Math.abs(point.x) > 47 || Math.abs(point.z) > 33) return false;
  if (point.distanceTo(new THREE.Vector3(0,0,0)) < 5.5) return false;
  for (const e of world.entities) {
    if (!e.parent || (e.userData.type !== "building" && e.userData.type !== "capital")) continue;
    if (e.position.distanceTo(point) < (e.userData.radius || 2) + 3.2) return false;
  }
  return true;
}

function handleGroundClick(point) {
  if (!state.started || state.ended || !state.placement) return;
  point.y = 0;
  if (!placementValid(point)) return toast("That site is blocked or too deep in enemy territory.", "bad");
  const { def, cost } = state.placement;
  if (!pay(cost)) return toast("Resources changed before construction could begin.", "bad");
  const building = world.spawnBuilding(def, state.faction, point, false);
  if (state.researched.has("deep-foundations")) {
    building.userData.maxHp *= 1.2;
    building.userData.hp = building.userData.maxHp;
  }
  state.buildings.push(building);
  if (def.unlocks) state.unlocked.add(def.unlocks);
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
  if (!state.unlocked.has(def.id)) return toast("Build the matching military district first.", "bad");
  const cost = scaledCost(def.cost, state.faction.military.cost);
  if (!pay(cost)) return toast("Your stores cannot equip that formation yet.", "bad");

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
    world.command("player", new THREE.Vector3(-1,0,-1));
    toast("Army doctrine: contest the frontier.");
  } else if (command === "attack") {
    const target = state.enemyCapital?.position?.clone?.() || ENEMY_HOME.clone();
    world.command("player", target);
    toast("Army doctrine: pressure the enemy capital.");
  }
}

function economyTick(dt) {
  const shares = allocationShares();
  const ageMult = AGE_DATA[state.age].multiplier;
  const doctrine = state.researched.has("stewarded-economy") ? 1.12 : 1;
  for (const key of RESOURCE_KEYS) {
    const factionMult = state.faction.economy[key] || 1;
    let gain = state.workforce * shares[key] * BASE_INCOME[key] * factionMult * ageMult * doctrine * dt;
    for (const b of state.buildings) {
      if (!b.parent || b.userData.hp <= 0) continue;
      const def = state.faction.buildings.find(x => x.id === b.userData.id);
      gain += (def?.income?.[key] || 0) * dt;
    }
    if (state.frontier === "player" && key === "gold") gain += 1.5 * ageMult * dt;
    state.resources[key] += gain;
  }

  state.workforceClock += dt;
  const ecoCount = state.buildings.filter(b => b.parent && b.userData.role === "economy").length;
  const growthInterval = Math.max(26, 48 - ecoCount * 5);
  if (state.workforceClock >= growthInterval) {
    state.workforceClock = 0;
    state.workforce += 1;
    toast("Population growth added one workforce unit.");
  }
}

function updateFrontier() {
  const near = owner => world.getLiving(owner).filter(e => (e.userData.type === "squad" || e.userData.type === "founder") && e.position.length() < 7).length;
  const p = near("player"), e = near("enemy");
  state.frontier = p > e ? "player" : e > p ? "enemy" : p === 0 && e === 0 ? "neutral" : "contested";
}

function enemyTick(dt) {
  if (!state.enemyCapital?.parent || state.ended) return;
  state.enemySpawnClock += dt;
  state.enemyAttackClock += dt;
  const enemySquads = world.getLiving("enemy", "squad");

  const spawnEvery = Math.max(10, 20 - state.age * 2.2);
  if (state.enemySpawnClock >= spawnEvery && enemySquads.length < 7 + state.age) {
    state.enemySpawnClock = 0;
    const f = state.enemyFaction;
    const def = f.units[Math.random() < .28 ? Math.min(1, f.units.length - 1) : 0];
    world.spawnSquad(def, f, ENEMY_HOME.clone().add(new THREE.Vector3(-7 + Math.random()*2,0,-4 + Math.random()*3)), true);
  }

  if (state.enemyAttackClock >= 26) {
    state.enemyAttackClock = 0;
    const target = Math.random() < .46 ? new THREE.Vector3(1,0,1) : state.playerCapital.position.clone();
    world.command("enemy", target);
  }
}

function handleDestroyed(entity) {
  if (!state.started || state.ended) return;
  if (entity.userData.type === "capital") {
    if (entity.userData.owner === "enemy") endGame(true);
    else endGame(false);
  } else if (entity.userData.owner === "player" && entity.userData.type === "building") {
    state.buildings = state.buildings.filter(b => b !== entity);
    toast(`${entity.userData.id} was destroyed.`, "bad");
  }
}

function endGame(victory) {
  state.ended = true;
  state.placement = null;
  ui.placement.classList.add("hidden");
  toast(victory ? "Enemy capital broken — strategic victory." : "Your capital has fallen — rebuild the doctrine.", victory ? "good" : "bad");
  ui.age.textContent = victory ? "VICTORY" : "DEFEAT";
}

function renderHud() {
  if (!state.started) return;
  ui.age.textContent = AGE_DATA[state.age].name.toUpperCase();
  ui.workforce.textContent = `${state.workforce} workforce`;
  ui.resources.innerHTML = RESOURCE_KEYS.map(k => `<div class="resource"><span>${RESOURCE_ICONS[k]} ${RESOURCE_LABELS[k]}</span><strong>${Math.floor(state.resources[k])}</strong></div>`).join("");

  const playerSquads = world.getLiving("player", "squad");
  const enemySquads = world.getLiving("enemy", "squad");
  const founder = world.getLiving("player", "founder")[0];
  const capitalHp = state.playerCapital?.parent ? Math.max(0, state.playerCapital.userData.hp / state.playerCapital.userData.maxHp * 100) : 0;
  const frontierText = state.frontier === "player" ? "Ours (+gold)" : state.frontier === "enemy" ? "Enemy held" : state.frontier === "contested" ? "Contested" : "Unclaimed";
  ui.state.innerHTML = `
    <div class="state-row"><span>Age</span><b>${AGE_DATA[state.age].name}</b></div>
    <div class="state-row"><span>Formations</span><b>${playerSquads.length}</b></div>
    <div class="state-row"><span>Enemy formations</span><b>${enemySquads.length}</b></div>
    <div class="state-row"><span>Districts</span><b>${state.buildings.filter(b=>b.parent).length}</b></div>
    <div class="state-row"><span>Frontier</span><b>${frontierText}</b></div>
    <div class="state-row"><span>Capital integrity</span><b>${capitalHp.toFixed(0)}%</b></div>
    <div class="state-row"><span>${state.faction.founder}</span><b>${founder ? Math.ceil(founder.userData.hp) + " hp" : "Fallen"}</b></div>`;

  for (const btn of ui.builds.querySelectorAll("button[data-build]")) {
    const def = state.faction.buildings.find(x => x.id === btn.dataset.build);
    btn.disabled = !canAfford(scaledCost(def.cost, state.faction.building.cost));
  }
  for (const btn of ui.units.querySelectorAll("button[data-unit]")) {
    const def = state.faction.units.find(x => x.id === btn.dataset.unit);
    btn.disabled = !state.unlocked.has(def.id) || !canAfford(scaledCost(def.cost, state.faction.military.cost));
  }
  renderUpgrades();
}

function simulate(dt) {
  if (!state.started || state.ended) return;
  state.elapsed += dt;
  economyTick(dt);
  enemyTick(dt);
  state.hudClock += dt;
  if (state.hudClock >= .35) {
    state.hudClock = 0;
    updateFrontier();
    renderHud();
  }
}

for (const btn of document.querySelectorAll("[data-command]")) btn.addEventListener("click", () => commandArmy(btn.dataset.command));
ui.restart.addEventListener("click", () => location.reload());
window.addEventListener("keydown", e => {
  if (e.key === "Escape" && state.placement) {
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
