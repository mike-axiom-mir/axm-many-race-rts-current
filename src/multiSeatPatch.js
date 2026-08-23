import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { FACTIONS } from "./factions.js";
import { DEFAULT_MAP } from "./maps.js";
import { loadLobby } from "./seatControllers.js";

const previousSpawnCapital = RTSWorld.prototype.spawnCapital;
const previousSpawnFounder = RTSWorld.prototype.spawnFounder;
const previousSpawnSquad = RTSWorld.prototype.spawnSquad;
const previousSpawnBuilding = RTSWorld.prototype.spawnBuilding;
const previousTick = RTSWorld.prototype.tick;

const EXTRA_STARTS = [
  new THREE.Vector3(-30, 0, 17),
  new THREE.Vector3(30, 0, -17)
];

function lobbyState(world) {
  if (!world.__axmLobby) world.__axmLobby = loadLobby();
  return world.__axmLobby;
}

function ownerForSeat(index) {
  if (index === 0) return "player";
  if (index === 1) return "enemy";
  return `seat-${index + 1}`;
}

function setTeams(world) {
  const lobby = lobbyState(world);
  world.__axmTeamByOwner = {};
  lobby.seats.forEach((seat, index) => {
    if (seat.controller === "closed") return;
    world.__axmTeamByOwner[ownerForSeat(index)] = Number(seat.team || index + 1);
  });
}

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

RTSWorld.prototype.nearestEnemy = function multiSeatNearestEnemy(entity, maxDistance = Infinity) {
  let best = null;
  let bestD = maxDistance;
  for (const other of this.entities) {
    if (!other.parent || other === entity || other.userData.hp <= 0) continue;
    if (!other.userData.owner || sameTeam(this, entity.userData.owner, other.userData.owner)) continue;
    const d = entity.position.distanceTo(other.position) - (other.userData.radius || 0);
    if (d < bestD) { best = other; bestD = d; }
  }
  return best ? { entity: best, distance: bestD } : null;
};

function overrideOwner(world, entity, owner, faction) {
  if (!entity) return entity;
  entity.userData.owner = owner;
  entity.userData.faction = faction;
  world.__axmFactionByOwner ||= {};
  world.__axmFactionByOwner[owner] = faction;
  return entity;
}

function spawnSeatBase(world, seat, index) {
  if (!seat || seat.controller === "closed" || index < 2) return;
  const faction = FACTIONS[seat.factionId] || Object.values(FACTIONS)[index % Object.keys(FACTIONS).length];
  const owner = ownerForSeat(index);
  const start = EXTRA_STARTS[index - 2]?.clone();
  if (!start || world.getLiving(owner).length) return;

  const rememberedPlayerFaction = world.__axmFactionByOwner?.player;
  const capital = previousSpawnCapital.call(world, faction, start.clone(), false);
  if (rememberedPlayerFaction) world.__axmFactionByOwner.player = rememberedPlayerFaction;
  overrideOwner(world, capital, owner, faction);

  const founder = previousSpawnFounder.call(world, faction, start.clone().add(new THREE.Vector3(index === 2 ? 5 : -5, 0, 2)), false);
  overrideOwner(world, founder, owner, faction);

  const unit = faction.units[0];
  const squad = previousSpawnSquad.call(world, unit, faction, start.clone().add(new THREE.Vector3(index === 2 ? 7 : -7, 0, 4)), false);
  overrideOwner(world, squad, owner, faction);

  const economyDef = faction.buildings.find(def => def.role === "economy");
  const defenseDef = faction.buildings.find(def => def.role === "defense");
  if (economyDef) overrideOwner(world, previousSpawnBuilding.call(world, economyDef, faction, start.clone().add(new THREE.Vector3(index === 2 ? 5 : -5, 0, -6)), false), owner, faction);
  if (defenseDef) overrideOwner(world, previousSpawnBuilding.call(world, defenseDef, faction, start.clone().add(new THREE.Vector3(index === 2 ? 7 : -7, 0, 7)), false), owner, faction);

  world.__axmSeatAiClock ||= {};
  world.__axmSeatAiClock[owner] = 5 + index * 2;
}

function ensureExtraSeats(world) {
  const lobby = lobbyState(world);
  setTeams(world);
  for (let i = 2; i < lobby.seats.length; i++) spawnSeatBase(world, lobby.seats[i], i);
}

function chooseAiTarget(world, owner) {
  const hostileCapitals = world.entities.filter(entity => entity.parent && entity.userData.type === "capital" && !sameTeam(world, owner, entity.userData.owner));
  const centerSites = DEFAULT_MAP.strategicSites || [];
  if (centerSites.length && Math.random() < .58) {
    const site = centerSites[Math.floor(Math.random() * centerSites.length)];
    return new THREE.Vector3(...site.position);
  }
  const capital = hostileCapitals[Math.floor(Math.random() * Math.max(1, hostileCapitals.length))];
  return capital?.position?.clone() || new THREE.Vector3(0, 0, 0);
}

function updateExtraFactionAi(world, dt) {
  const lobby = lobbyState(world);
  world.__axmSeatAiClock ||= {};
  for (let index = 2; index < lobby.seats.length; index++) {
    const seat = lobby.seats[index];
    if (seat.controller !== "faction-ai") continue;
    const owner = ownerForSeat(index);
    world.__axmSeatAiClock[owner] = (world.__axmSeatAiClock[owner] ?? 7) - dt;
    if (world.__axmSeatAiClock[owner] > 0) continue;
    world.__axmSeatAiClock[owner] = 16 + Math.random() * 9;
    world.command(owner, chooseAiTarget(world, owner));

    const faction = world.__axmFactionByOwner?.[owner];
    const capital = world.entities.find(entity => entity.parent && entity.userData.type === "capital" && entity.userData.owner === owner);
    if (faction && capital && world.getLiving(owner, "squad").length < 5) {
      const unit = faction.units[Math.random() < .30 ? Math.min(1, faction.units.length - 1) : 0];
      const squad = previousSpawnSquad.call(world, unit, faction, capital.position.clone().add(new THREE.Vector3((Math.random()-.5)*7,0,(Math.random()-.5)*7)), false);
      overrideOwner(world, squad, owner, faction);
    }
  }
}

RTSWorld.prototype.spawnCapital = function multiSeatCapital(faction, pos, enemy = false) {
  const lobby = lobbyState(this);
  setTeams(this);
  let actualFaction = faction;
  if (enemy && lobby.seats[1]?.factionId && FACTIONS[lobby.seats[1].factionId]) actualFaction = FACTIONS[lobby.seats[1].factionId];
  const capital = previousSpawnCapital.call(this, actualFaction, pos, enemy);
  if (enemy) {
    this.__axmFactionByOwner ||= {};
    this.__axmFactionByOwner.enemy = actualFaction;
    queueMicrotask(() => ensureExtraSeats(this));
  }
  window.__AXM_RTS_WORLD__ = this;
  return capital;
};

RTSWorld.prototype.spawnFounder = function multiSeatFounder(faction, pos, enemy = false) {
  const lobby = lobbyState(this);
  const actualFaction = enemy && lobby.seats[1]?.factionId && FACTIONS[lobby.seats[1].factionId] ? FACTIONS[lobby.seats[1].factionId] : faction;
  return previousSpawnFounder.call(this, actualFaction, pos, enemy);
};

RTSWorld.prototype.spawnSquad = function multiSeatSquad(unitDef, faction, pos, enemy = false, countOverride = null) {
  const lobby = lobbyState(this);
  if (enemy && lobby.seats[1]?.factionId && FACTIONS[lobby.seats[1].factionId]) {
    const actualFaction = FACTIONS[lobby.seats[1].factionId];
    const actualUnit = actualFaction.units.find(unit => unit.id === unitDef?.id) || actualFaction.units[0];
    return previousSpawnSquad.call(this, actualUnit, actualFaction, pos, true, countOverride);
  }
  return previousSpawnSquad.call(this, unitDef, faction, pos, enemy, countOverride);
};

RTSWorld.prototype.tick = function multiSeatTick(time, dt) {
  const result = previousTick.call(this, time, dt);
  ensureExtraSeats(this);
  updateExtraFactionAi(this, dt);
  return result;
};

window.addEventListener("axm-seat-command", event => {
  const world = window.__AXM_RTS_WORLD__;
  if (!world) return;
  const detail = event.detail || {};
  const lobby = lobbyState(world);
  const seatIndex = lobby.seats.findIndex(seat => seat.id === detail.seatId);
  if (seatIndex < 0) return;
  const seat = lobby.seats[seatIndex];
  if (seat.controller !== "connected-ai" && seat.controller !== "human") return;
  const owner = ownerForSeat(seatIndex);
  if (detail.type === "move" && Array.isArray(detail.point)) world.command(owner, new THREE.Vector3(Number(detail.point[0])||0,0,Number(detail.point[2])||0));
  if (detail.type === "attack-capital") world.command(owner, chooseAiTarget(world, owner));
});

export function connectedAiCommand(seatId, command) {
  window.dispatchEvent(new CustomEvent("axm-seat-command", { detail: { seatId, ...command } }));
}
