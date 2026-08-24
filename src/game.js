import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { AGE_DATA, FACTIONS, RESOURCE_KEYS, getFactionList } from "./factions.js";
import { DEFAULT_MAP } from "./maps.js";
import { MapDirector } from "./mapDirector.js";
import {
  advancePopulationClock,
  applyIncomeTick,
  calculateIncomeRate
} from "./core/economySystem.js";
import {
  availabilityText,
  buildingAvailability,
  buildingAvailabilityText,
  chooseEnemyBuilding,
  chooseEnemyUnit,
  enemyAllocationForFaction,
  unitAvailability
} from "./gameplayProgression.js";
import {
  availableUpgradeOptions,
  buildingHealthUpgradeMultiplier,
  formationUpgradeMultiplier,
  towerDamageUpgradeMultiplier,
  upgradeHubBuilding,
  upgradeRequirementText
} from "./upgradeSystem.js";

const $ = id => document.getElementById(id);
const ui = {
  start: $("startScreen"), cards: $("factionCards"), left: $("leftHud"), right: $("rightHud"),
  factionName: $("factionName"), factionIcon: $("factionIcon"), factionTagline: $("factionTagline"),
  resources: $("resources"), workforce: $("workforceLabel"), allocation: $("allocation"),
  builds: $("buildButtons"), units: $("unitButtons"), upgrades: $("upgradeButtons"),
  state: $("strategyState"), age: $("ageBadge"), placement: $("placementHint"), toast: $("toast"), restart: $("restartBtn")
};

const RESOURCE_LABELS = { food: "Food", wood: "Wood", stone: "Stone", gold: "Gold" };
const RESOURCE_ICONS = { food: "◆", wood: "♣", stone: "⬢", gold: "●" };
const ACTIVE_MAP = DEFAULT_MAP;
const PLAYER_HOME = new THREE.Vector3(...ACTIVE_MAP.playerStart);
const ENEMY_HOME = new THREE.Vector3(...ACTIVE_MAP.enemyStart);
const AGE_NAMES = AGE_DATA.map(age => age.name);

const state = {
  started: false, ended: false, faction: null, enemyFaction: null,
  resources: { food: 0, wood: 0, stone: 0, gold: 0 }, workforce: 0,
  allocation: { food: 30, wood: 30, stone: 20, gold: 20 }, age: 0,
  buildings: [], upgradeLevels: {}, placement: null,
  playerCapital: null, enemyCapital: null, frontier: "neutral", elapsed: 0, workforceClock: 0, hudClock: 0,
  enemy: {
    resources: { food: 0, wood: 0, stone: 0, gold: 0 }, workforce: 0,
    allocation: { food: .30, wood: .27, stone: .18, gold: .25 }, age: 0,
    buildings: [], upgradeLevels: {}, workforceClock: 0, buildClock: 0, trainClock: 0,
    ageClock: 0, upgradeClock: 0, commandClock: 0, buildSerial: 0
  }
};

const world = new RTSWorld($("viewport"), {
  onGroundClick: point => handleGroundClick(point),
  onEntityDestroyed: entity => handleDestroyed(entity)
});
const mapDirector = new MapDirector(world);

function costText(cost = {}) { return Object.entries(cost).map(([k,v]) => `${RESOURCE_ICONS[k] || ""}${Math.round(v)}`).join(" "); }
function scaledCost(cost, multiplier = 1) { return Object.fromEntries(Object.entries(cost || {}).map(([k,v]) => [k, Math.ceil(v * multiplier)])); }
function canAfford(cost, resources = state.resources) { return Object.entries(cost).every(([k,v]) => (resources[k] || 0) >= v); }
function spend(cost, resources = state.resources) { if (!canAfford(cost, resources)) return false; for (const [k,v] of Object.entries(cost)) resources[k] -= v; return true; }
function toast(message, kind = "") { ui.toast.textContent = message; ui.toast.className = `toast ${kind}`.trim(); clearTimeout(toast.timer); toast.timer = setTimeout(() => ui.toast.classList.add("hidden"), 2400); }
function syncUpgradeState() { world.__axmUpgradeLevelsByOwner = { ...(world.__axmUpgradeLevelsByOwner || {}), player: state.upgradeLevels, enemy: state.enemy.upgradeLevels }; }

function renderFactionCards() {
  ui.cards.innerHTML = "";
  for (const faction of getFactionList()) {
    const btn = document.createElement("button"); btn.className = "faction-card";
    btn.innerHTML = `<div class="symbol">${faction.symbol}</div><h3>${faction.name}</h3><p>${faction.tagline}</p><div class="traits">${faction.traits.join(" • ")}</div>`;
    btn.addEventListener("click", () => startGame(faction.id)); ui.cards.appendChild(btn);
  }
}

function chooseEnemy(playerId) { const list = getFactionList(); const i = list.findIndex(f => f.id === playerId); return list[(i + 1) % list.length]; }
function resetEnemyState(faction) {
  const starting = { ...faction.starting }; delete starting.workforce;
  Object.assign(state.enemy, {
    resources: starting, workforce: faction.starting.workforce, allocation: enemyAllocationForFaction(faction), age: 0,
    buildings: [], upgradeLevels: {}, workforceClock: 0, buildClock: 0, trainClock: 0, ageClock: 0, upgradeClock: 0, commandClock: 0, buildSerial: 0
  });
}

function startGame(factionId) {
  const faction = FACTIONS[factionId];
  state.started = true; state.ended = false; state.faction = faction; state.enemyFaction = chooseEnemy(factionId);
  state.resources = { ...faction.starting }; delete state.resources.workforce; state.workforce = faction.starting.workforce;
  state.allocation = { food:30, wood:30, stone:20, gold:20 }; state.age = 0; state.buildings = []; state.upgradeLevels = {};
  state.placement = null; state.frontier = "neutral"; state.elapsed = 0; state.workforceClock = 0; state.hudClock = 0;
  resetEnemyState(state.enemyFaction); world.resetDynamic(); mapDirector.reset(ACTIVE_MAP); world.ground.material.color.setHex(faction.terrainTint);
  syncUpgradeState();

  state.playerCapital = world.spawnCapital(faction, PLAYER_HOME.clone(), false);
  world.spawnFounder(faction, PLAYER_HOME.clone().add(new THREE.Vector3(5,0,2)), false);
  applyFormationUpgrades(world.spawnSquad(faction.units[0], faction, PLAYER_HOME.clone().add(new THREE.Vector3(7,0,4)), false), state.upgradeLevels);

  const enemy = state.enemyFaction;
  state.enemyCapital = world.spawnCapital(enemy, ENEMY_HOME.clone(), true);
  world.spawnFounder(enemy, ENEMY_HOME.clone().add(new THREE.Vector3(-5,0,-2)), true);
  applyFormationUpgrades(world.spawnSquad(enemy.units[0], enemy, ENEMY_HOME.clone().add(new THREE.Vector3(-7,0,-4)), true), state.enemy.upgradeLevels);
  state.enemy.buildings = world.entities.filter(e => e.parent && e.userData.owner === "enemy" && e.userData.type === "building");

  ui.start.classList.add("hidden"); ui.left.classList.remove("hidden"); ui.right.classList.remove("hidden"); ui.restart.classList.remove("hidden");
  ui.factionName.textContent = faction.name; ui.factionIcon.textContent = faction.symbol;
  ui.factionTagline.textContent = `${faction.founder} begins beside your capital on ${ACTIVE_MAP.name}. ${faction.special}`;
  renderEconomyControls(); renderActions(); renderHud(); world.cameraTarget.copy(new THREE.Vector3(-18,0,-8));
  toast(`${faction.founder} has founded the ${faction.name} on ${ACTIVE_MAP.name}.`, "good");
}

function renderEconomyControls() {
  ui.allocation.innerHTML = "";
  for (const key of RESOURCE_KEYS) {
    const row = document.createElement("div"); row.className = "allocation-row";
    row.innerHTML = `<label>${RESOURCE_LABELS[key]}</label><input aria-label="${RESOURCE_LABELS[key]} priority" type="range" min="5" max="70" step="5" value="${state.allocation[key]}"><output></output>`;
    row.querySelector("input").addEventListener("input", event => { state.allocation[key] = Number(event.target.value); updateAllocationLabels(); }); ui.allocation.appendChild(row);
  }
  updateAllocationLabels();
}
function allocationShares() { const total = Object.values(state.allocation).reduce((a,b)=>a+b,0)||1; return Object.fromEntries(RESOURCE_KEYS.map(k=>[k,state.allocation[k]/total])); }
function updateAllocationLabels() { const shares=allocationShares(); [...ui.allocation.children].forEach((row,i)=>row.querySelector("output").textContent=`${Math.round(shares[RESOURCE_KEYS[i]]*100)}%`); }

function renderActions() {
  const faction = state.faction; ui.builds.innerHTML = "";
  for (const def of faction.buildings) {
    const cost = scaledCost(def.cost, faction.building.cost); const req = buildingAvailabilityText(def, state.age, AGE_NAMES);
    const btn = document.createElement("button"); btn.dataset.build = def.id;
    btn.innerHTML = `<b>${def.name}</b><small>${def.description}</small><small>${costText(cost)} • ${req}</small>`;
    btn.addEventListener("click", () => beginPlacement(def)); ui.builds.appendChild(btn);
  }
  ui.units.innerHTML = "";
  for (const def of faction.units) {
    const cost = scaledCost(def.cost, faction.military.cost); const req = availabilityText({faction,unit:def,age:state.age,buildings:state.buildings,ageNames:AGE_NAMES});
    const btn = document.createElement("button"); btn.dataset.unit = def.id;
    btn.innerHTML = `<b>${def.name}</b><small>${def.description}</small><small>${costText(cost)} • ${req}</small>`;
    btn.addEventListener("click", () => trainUnit(def)); ui.units.appendChild(btn);
  }
  renderUpgrades();
}

function renderUpgrades() {
  ui.upgrades.innerHTML = "";
  const nextAge = AGE_DATA[state.age + 1];
  if (nextAge) {
    const penalty = state.faction.id === "fatfrotz" ? 1.18 : 1; const cost = scaledCost(nextAge.cost, penalty);
    const btn = document.createElement("button"); btn.innerHTML = `<b>Advance to ${nextAge.name}</b><small>Economy scaling + later buildings/formations • ${costText(cost)}</small>`;
    btn.disabled = !canAfford(cost); btn.addEventListener("click", () => advanceAge(cost)); ui.upgrades.appendChild(btn);
  }
  if (!upgradeHubBuilding(state.faction)) return;
  for (const option of availableUpgradeOptions({ faction:state.faction, age:state.age, buildings:state.buildings, levels:state.upgradeLevels })) {
    const btn = document.createElement("button"); const suffix = option.signature ? "" : ` ${option.nextLevel}/${option.maxLevel}`;
    btn.innerHTML = `<b>${option.name}${suffix}</b><small>${option.description}</small><small>${costText(option.cost)} • ${upgradeRequirementText(option,state.faction)}</small>`;
    btn.disabled = !option.ready || !canAfford(option.cost); btn.addEventListener("click", () => researchUpgrade("player", option)); ui.upgrades.appendChild(btn);
  }
}

function advanceAge(cost) { if (!spend(cost)) return toast("Your economy cannot support that age yet.","bad"); state.age++; state.workforce+=4; renderActions(); renderHud(); toast(`${AGE_DATA[state.age].name} reached. New buildings, formations and upgrades may be available.`,"good"); }

function entityOwnerList(owner) { return world.entities.filter(e => e.parent && e.userData.owner === owner); }
function ratio(next, previous) { return previous > 0 ? next / previous : next; }
function applyFormationUpgrades(squad, levels) {
  if (!squad) return squad; const mult = formationUpgradeMultiplier(levels);
  if (mult !== 1) { squad.userData.maxHp *= mult; squad.userData.hp = squad.userData.maxHp; squad.userData.damage *= mult; if (squad.userData.__axmBaseDamage !== undefined) squad.userData.__axmBaseDamage *= mult; }
  return squad;
}
function applyBuildingUpgrades(building, levels) {
  if (!building) return building; const hpMult=buildingHealthUpgradeMultiplier(levels), dmgMult=towerDamageUpgradeMultiplier(levels);
  if (hpMult!==1) { building.userData.maxHp *= hpMult; building.userData.hp = building.userData.maxHp; }
  if (building.userData.role==="defense" && dmgMult!==1) building.userData.damage *= dmgMult;
  return building;
}
function applyUpgradeDelta(owner, id, oldLevel, newLevel) {
  const levels = owner === "player" ? state.upgradeLevels : state.enemy.upgradeLevels;
  if (id === "formations") {
    const r = ratio(formationUpgradeMultiplier({...levels,[id]:newLevel}), formationUpgradeMultiplier({...levels,[id]:oldLevel}));
    for (const e of entityOwnerList(owner).filter(e=>e.userData.type==="squad")) { const gain=e.userData.maxHp*(r-1); e.userData.maxHp*=r; e.userData.hp+=gain; e.userData.damage*=r; if(e.userData.__axmBaseDamage!==undefined)e.userData.__axmBaseDamage*=r; }
  }
  if (id === "fortifications") {
    const hpR=ratio(buildingHealthUpgradeMultiplier({...levels,[id]:newLevel}),buildingHealthUpgradeMultiplier({...levels,[id]:oldLevel}));
    const dmgR=ratio(towerDamageUpgradeMultiplier({...levels,[id]:newLevel}),towerDamageUpgradeMultiplier({...levels,[id]:oldLevel}));
    for (const e of entityOwnerList(owner).filter(e=>e.userData.type==="building")) { const gain=e.userData.maxHp*(hpR-1); e.userData.maxHp*=hpR; e.userData.hp+=gain; if(e.userData.role==="defense")e.userData.damage*=dmgR; }
  }
}
function researchUpgrade(owner, option) {
  const resources = owner === "player" ? state.resources : state.enemy.resources;
  const levels = owner === "player" ? state.upgradeLevels : state.enemy.upgradeLevels;
  if (!option.ready || !spend(option.cost, resources)) return owner === "player" ? toast("That upgrade is not affordable yet.","bad") : false;
  const oldLevel=Number(levels[option.id]||0); levels[option.id]=option.nextLevel; syncUpgradeState(); applyUpgradeDelta(owner,option.id,oldLevel,option.nextLevel);
  if (owner === "player") { renderUpgrades(); renderHud(); toast(`${option.name} upgraded.`,"good"); }
  return true;
}

function beginPlacement(def) {
  if (state.ended) return; const availability=buildingAvailability(def,state.age);
  if (!availability.ready) return toast(buildingAvailabilityText(def,state.age,AGE_NAMES),"bad");
  const cost=scaledCost(def.cost,state.faction.building.cost); if(!canAfford(cost))return toast("Not enough resources to construct that district.","bad");
  state.placement={def,cost}; ui.placement.textContent=`${def.name}: click open terrain near your empire • Esc to cancel`; ui.placement.classList.remove("hidden");
}
function strategicFootprintClear(point) { for(const site of mapDirector.sites){const center=new THREE.Vector3(...site.def.position);if(point.distanceTo(center)<Math.max(4.8,site.def.radius*.72))return false;}return true; }
function structureFootprintClear(point,extra=3.2){for(const e of world.entities){if(!e.parent||(e.userData.type!=="building"&&e.userData.type!=="capital"))continue;if(e.position.distanceTo(point)<(e.userData.radius||2)+extra)return false;}return true;}
function placementValid(point){return point.x<=15&&Math.abs(point.x)<=47&&Math.abs(point.z)<=33&&strategicFootprintClear(point)&&structureFootprintClear(point);}
function handleGroundClick(point) {
  if(!state.started||state.ended||!state.placement)return; point.y=0; if(!placementValid(point))return toast("That site is blocked, strategic ground, or too deep in enemy territory.","bad");
  const {def,cost}=state.placement;if(!spend(cost))return toast("Resources changed before construction could begin.","bad");
  const building=applyBuildingUpgrades(world.spawnBuilding(def,state.faction,point,false),state.upgradeLevels); state.buildings.push(building);
  if(def.role==="economy"){state.workforce+=3;if(state.faction.id==="northpole")state.resources.food+=80;}
  state.placement=null;ui.placement.classList.add("hidden");renderActions();renderHud();toast(`${def.name} established.`,"good");
}

function playerMusterPoint() {
  const forward=[...state.buildings].reverse().find(b=>b.parent&&b.userData.reinforcementPoint);
  return forward?.position?.clone?.() || state.playerCapital?.position?.clone?.() || PLAYER_HOME.clone();
}
function trainUnit(def) {
  if(state.ended)return;const availability=unitAvailability({faction:state.faction,unit:def,age:state.age,buildings:state.buildings});
  if(!availability.ready)return toast(availabilityText({faction:state.faction,unit:def,age:state.age,buildings:state.buildings,ageNames:AGE_NAMES})||"That formation is not available yet.","bad");
  const cost=scaledCost(def.cost,state.faction.military.cost);if(!spend(cost))return toast("Your stores cannot equip that formation yet.","bad");
  const base=playerMusterPoint();const spawn=base.add(new THREE.Vector3(4+Math.random()*2,0,2+Math.random()*3));
  applyFormationUpgrades(world.spawnSquad(def,state.faction,spawn,false),state.upgradeLevels);renderHud();toast(`${def.name} assembled as one formation.`,"good");
}

function commandArmy(command){if(!state.started||state.ended)return;if(command==="defend"){world.command("player",PLAYER_HOME.clone().add(new THREE.Vector3(6,0,5)));toast("Army doctrine: defend the homeland.");}else if(command==="center"){world.command("player",mapDirector.objectiveFor("player"));toast("Army doctrine: secure the next strategic site.");}else if(command==="attack"){world.command("player",state.enemyCapital?.position?.clone?.()||ENEMY_HOME.clone());toast("Army doctrine: pressure the enemy capital.");}}

function incomeRateFor({faction,workforce,allocation,age,buildings,owner,upgradeLevels={}}){return calculateIncomeRate({faction,workforce,allocation,age,buildings,territoryBonus:mapDirector.incomeBonus(owner),upgradeLevels});}
function playerIncomeRate(){return incomeRateFor({faction:state.faction,workforce:state.workforce,allocation:allocationShares(),age:state.age,buildings:state.buildings,owner:"player",upgradeLevels:state.upgradeLevels});}
function economyTick(dt){const rates=playerIncomeRate();applyIncomeTick(state.resources,rates,dt);const population=advancePopulationClock({clock:state.workforceClock,dt,buildings:state.buildings,side:"player"});state.workforceClock=population.clock;if(population.growth){state.workforce+=population.growth;toast("Population growth added one workforce unit.");}}
function processMapState(dt){mapDirector.update(dt,state.elapsed);state.frontier=mapDirector.centralOwner();for(const event of mapDirector.drainEvents()){if(event.owner==="player")toast(`${event.site.name} secured — its resource bonus is now yours.`,"good");else if(event.owner==="enemy")toast(`${event.site.name} fell under enemy control.`,"bad");else if(event.previous==="player")toast(`${event.site.name} has slipped back to neutral.`,"bad");}}

function enemyEconomyTick(dt){const e=state.enemy,rates=incomeRateFor({faction:state.enemyFaction,workforce:e.workforce,allocation:e.allocation,age:e.age,buildings:e.buildings,owner:"enemy",upgradeLevels:e.upgradeLevels});applyIncomeTick(e.resources,rates,dt);const population=advancePopulationClock({clock:e.workforceClock,dt,buildings:e.buildings,side:"enemy"});e.workforceClock=population.clock;if(population.growth)e.workforce+=population.growth;}
function enemyBuildPoint(role){const rings=[[8,-7],[9,7],[13,-2],[13,11],[16,-10],[18,5],[10,15],[20,14],[23,-4],[22,-15]];for(let o=0;o<rings.length;o++){const i=(state.enemy.buildSerial+o)%rings.length,[toward,z]=rings[i],point=ENEMY_HOME.clone().add(new THREE.Vector3(-toward,0,z));if(role==="defense")point.x+=2;if(point.x<8||Math.abs(point.z)>32)continue;if(!strategicFootprintClear(point)||!structureFootprintClear(point,2.7))continue;state.enemy.buildSerial=i+1;return point;}return null;}
function enemyBuildTick(dt){const e=state.enemy;e.buildClock+=dt;if(e.buildClock<6.5)return;e.buildClock=0;e.buildings=e.buildings.filter(b=>b.parent&&b.userData.hp>0);const def=chooseEnemyBuilding(state.enemyFaction,e.buildings,e.age);if(!def)return;const cap=5+e.age*2;if(e.buildings.length>=cap)return;const cost=scaledCost(def.cost,state.enemyFaction.building.cost);if(!canAfford(cost,e.resources))return;const point=enemyBuildPoint(def.role);if(!point)return;spend(cost,e.resources);const building=applyBuildingUpgrades(world.spawnBuilding(def,state.enemyFaction,point,true),e.upgradeLevels);e.buildings.push(building);if(def.role==="economy")e.workforce+=3;}
function enemyAgeTick(dt){const e=state.enemy;if(e.age>=AGE_DATA.length-1)return;e.ageClock+=dt;if(e.ageClock<8)return;e.ageClock=0;const next=AGE_DATA[e.age+1],penalty=state.enemyFaction.id==="fatfrotz"?1.18:1,cost=scaledCost(next.cost,penalty);if(!spend(cost,e.resources))return;e.age++;e.workforce+=4;toast(`${state.enemyFaction.name} has reached ${AGE_DATA[e.age].name}.`,"bad");}
function enemyUpgradeTick(dt){const e=state.enemy;if(!upgradeHubBuilding(state.enemyFaction))return;e.upgradeClock+=dt;if(e.upgradeClock<8.5)return;e.upgradeClock=0;const options=availableUpgradeOptions({faction:state.enemyFaction,age:e.age,buildings:e.buildings,levels:e.upgradeLevels}).filter(o=>o.ready&&canAfford(o.cost,e.resources));if(!options.length)return;const signatures=options.filter(o=>o.signature);const option=signatures.length&&Math.random()<.42?signatures[0]:options[Math.floor(Math.random()*options.length)];researchUpgrade("enemy",option);}
function enemyTrainTick(dt){const e=state.enemy;e.trainClock+=dt;if(e.trainClock<4.8)return;e.trainClock=0;const squads=world.getLiving("enemy","squad"),territory=mapDirector.ownershipCount("enemy"),cap=4+e.age*2+territory;if(squads.length>=cap)return;const unit=chooseEnemyUnit(state.enemyFaction,e.age,e.buildings);if(!unit)return;const cost=scaledCost(unit.cost,state.enemyFaction.military.cost);if(!spend(cost,e.resources))return;const spawn=state.enemyCapital?.position?.clone?.().add(new THREE.Vector3(-6-Math.random()*2,0,-3+Math.random()*6))||ENEMY_HOME.clone();applyFormationUpgrades(world.spawnSquad(unit,state.enemyFaction,spawn,true),e.upgradeLevels);}
function enemyCommandTick(dt){const e=state.enemy;e.commandClock+=dt;if(e.commandClock<16)return;e.commandClock=0;const squads=world.getLiving("enemy","squad");if(!squads.length)return;const playerTerritory=mapDirector.ownershipCount("player"),pressure=e.age>=2&&squads.length>=5&&Math.random()<.42,raid=playerTerritory>=2&&Math.random()<.28;world.command("enemy",pressure||raid?(state.playerCapital?.position?.clone?.()||PLAYER_HOME.clone()):mapDirector.objectiveFor("enemy"));}
function enemyTick(dt){if(!state.enemyCapital?.parent||state.ended)return;enemyEconomyTick(dt);enemyBuildTick(dt);enemyAgeTick(dt);enemyUpgradeTick(dt);enemyTrainTick(dt);enemyCommandTick(dt);}

function handleDestroyed(entity){if(!state.started||state.ended)return;if(entity.userData.type==="capital"){if(entity.userData.owner==="enemy")endGame(true);else endGame(false);}else if(entity.userData.owner==="player"&&entity.userData.type==="building"){state.buildings=state.buildings.filter(b=>b!==entity);renderActions();toast(`${entity.userData.id} was destroyed.`,"bad");}else if(entity.userData.owner==="enemy"&&entity.userData.type==="building")state.enemy.buildings=state.enemy.buildings.filter(b=>b!==entity);}
function endGame(victory){state.ended=true;state.placement=null;ui.placement.classList.add("hidden");toast(victory?"Enemy capital broken — strategic victory.":"Your capital has fallen — rebuild the doctrine.",victory?"good":"bad");ui.age.textContent=victory?"VICTORY":"DEFEAT";}
function rateText(rates){return RESOURCE_KEYS.map(k=>`${RESOURCE_ICONS[k]}${rates[k].toFixed(1)}`).join(" ");}
function upgradeText(levels){const rows=Object.entries(levels).filter(([,level])=>Number(level)>0);return rows.length?rows.map(([id,level])=>`${id.replace(/-/g," ")} ${level}`).join(" • "):"None";}

function renderHud(){if(!state.started)return;ui.age.textContent=AGE_DATA[state.age].name.toUpperCase();ui.workforce.textContent=`${state.workforce} workforce`;ui.resources.innerHTML=RESOURCE_KEYS.map(k=>`<div class="resource"><span>${RESOURCE_ICONS[k]} ${RESOURCE_LABELS[k]}</span><strong>${Math.floor(state.resources[k])}</strong></div>`).join("");
  const playerSquads=world.getLiving("player","squad"),enemySquads=world.getLiving("enemy","squad"),founder=world.getLiving("player","founder")[0],capitalHp=state.playerCapital?.parent?Math.max(0,state.playerCapital.userData.hp/state.playerCapital.userData.maxHp*100):0,territory=mapDirector.summary();
  const territoryRows=territory.map(site=>{const owner=site.contested?"Contested":site.owner==="player"?"Ours":site.owner==="enemy"?"Enemy":"Neutral",bonus=Object.entries(site.bonus||{}).map(([k,v])=>`+${v.toFixed(2)} ${k}/s`).join(" ");return `<div class="state-row"><span>${site.name}</span><b>${owner}${site.owner==="player"&&bonus?` • ${bonus}`:""}</b></div>`;}).join("");
  const availableUnits=state.faction.units.filter(unit=>unitAvailability({faction:state.faction,unit,age:state.age,buildings:state.buildings}).ready).length,income=playerIncomeRate();
  ui.state.innerHTML=`<div class="state-row"><span>Map</span><b>${ACTIVE_MAP.name}</b></div><div class="state-row"><span>Age</span><b>${AGE_DATA[state.age].name}</b></div><div class="state-row"><span>Income / sec</span><b>${rateText(income)}</b></div><div class="state-row"><span>Upgrades</span><b>${upgradeText(state.upgradeLevels)}</b></div><div class="state-row"><span>Formation roster</span><b>${availableUnits} / ${state.faction.units.length} unlocked</b></div><div class="state-row"><span>Formations</span><b>${playerSquads.length}</b></div><div class="state-row"><span>Enemy formations</span><b>${enemySquads.length}</b></div><div class="state-row"><span>Districts</span><b>${state.buildings.filter(b=>b.parent).length}</b></div><div class="state-row"><span>Enemy development</span><b>${AGE_DATA[state.enemy.age].name} • ${state.enemy.buildings.filter(b=>b.parent).length} districts</b></div><div class="state-row"><span>Territory</span><b>${mapDirector.ownershipCount("player")} / ${territory.length}</b></div>${territoryRows}<div class="state-row"><span>Capital integrity</span><b>${capitalHp.toFixed(0)}%</b></div><div class="state-row"><span>${state.faction.founder}</span><b>${founder?Math.ceil(founder.userData.hp)+" hp":"Fallen"}</b></div>`;
  for(const btn of ui.builds.querySelectorAll("button[data-build]")){const def=state.faction.buildings.find(x=>x.id===btn.dataset.build),availability=buildingAvailability(def,state.age);btn.disabled=!availability.ready||!canAfford(scaledCost(def.cost,state.faction.building.cost));const smalls=btn.querySelectorAll("small");if(smalls[1])smalls[1].textContent=`${costText(scaledCost(def.cost,state.faction.building.cost))} • ${buildingAvailabilityText(def,state.age,AGE_NAMES)}`;}
  for(const btn of ui.units.querySelectorAll("button[data-unit]")){const def=state.faction.units.find(x=>x.id===btn.dataset.unit),availability=unitAvailability({faction:state.faction,unit:def,age:state.age,buildings:state.buildings});btn.disabled=!availability.ready||!canAfford(scaledCost(def.cost,state.faction.military.cost));const smalls=btn.querySelectorAll("small");if(smalls[1])smalls[1].textContent=`${costText(scaledCost(def.cost,state.faction.military.cost))} • ${availabilityText({faction:state.faction,unit:def,age:state.age,buildings:state.buildings,ageNames:AGE_NAMES})}`;}renderUpgrades();}
function simulate(dt){if(!state.started||state.ended)return;state.elapsed+=dt;processMapState(dt);economyTick(dt);enemyTick(dt);state.hudClock+=dt;if(state.hudClock>=.35){state.hudClock=0;renderHud();}}

for(const btn of document.querySelectorAll("[data-command]"))btn.addEventListener("click",()=>commandArmy(btn.dataset.command));ui.restart.addEventListener("click",()=>location.reload());window.addEventListener("keydown",event=>{if(event.key==="Escape"&&state.placement){state.placement=null;ui.placement.classList.add("hidden");toast("Construction placement cancelled.");}});
renderFactionCards();let last=performance.now()/1000;function frame(ms){const now=ms/1000,dt=Math.min(.05,Math.max(0,now-last));last=now;simulate(dt);world.tick(now,dt);requestAnimationFrame(frame);}requestAnimationFrame(frame);