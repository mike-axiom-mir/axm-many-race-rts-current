import { MapDirector } from "./mapDirector.js";
import { FactionRuntime } from "./factionRuntime.js";

export const DOMINATION_ECO_STEP_POINTS = 3;
export const DOMINATION_ECO_STEP_BONUS = .01;
export const DOMINATION_ATTACK_PER_LOST_POINT = .01;

const previousMapReset = MapDirector.prototype.reset;
const previousMapUpdate = MapDirector.prototype.update;
const previousFactionUpdate = FactionRuntime.prototype.update;

function clampScore(value) {
  return Math.max(-100, Math.min(100, Number(value || 0)));
}

function teamFor(world, owner) {
  return world?.__axmTeamByOwner?.[owner] ?? owner;
}

function sameTeam(world, ownerA, ownerB) {
  if (!ownerA || !ownerB || ownerA === "neutral" || ownerB === "neutral") return false;
  return teamFor(world, ownerA) === teamFor(world, ownerB);
}

function allegianceValue(world, siteOwner, perspectiveOwner) {
  if (!siteOwner || siteOwner === "neutral") return 0;
  return sameTeam(world, siteOwner, perspectiveOwner) ? 100 : -100;
}

function siteContributionFor(world, site, owner) {
  const start = allegianceValue(world, site.owner, owner);
  const captureOwner = site.captureOwner;
  if (!captureOwner) return start;
  const end = allegianceValue(world, captureOwner, owner);
  const t = Math.max(0, Math.min(1, Number(site.progress || 0) / 100));
  return start + (end - start) * t;
}

export function signedMapDomination(director, owner = "player") {
  const sites = director?.sites || [];
  if (!sites.length) return 0;
  const total = sites.reduce((sum, site) => sum + siteContributionFor(director.world, site, owner), 0);
  return clampScore(total / sites.length);
}

export function dominationBonuses(score) {
  const signed = clampScore(score);
  const economyBonusPercent = Math.floor(Math.max(0, signed) / DOMINATION_ECO_STEP_POINTS);
  const attackBonusPercent = Math.floor(Math.max(0, -signed));
  return {
    score: signed,
    economyBonusPercent,
    economyMultiplier: 1 + economyBonusPercent * DOMINATION_ECO_STEP_BONUS,
    attackBonusPercent,
    attackMultiplier: 1 + attackBonusPercent * DOMINATION_ATTACK_PER_LOST_POINT
  };
}

function primaryEconomyLedgerOwner(owner) {
  return owner === "player" || owner === "enemy";
}

function primaryEconomyShared(world) {
  const factions = world?.__axmFactionByOwner || {};
  return Boolean(factions.player?.id && factions.player.id === factions.enemy?.id);
}

function activeOwners(world) {
  const owners = new Set(["player", "enemy"]);
  for (const owner of Object.keys(world?.__axmFactionByOwner || {})) owners.add(owner);
  for (const entity of world?.entities || []) if (entity?.userData?.owner) owners.add(entity.userData.owner);
  return [...owners].filter(owner => owner && owner !== "neutral");
}

function buildState(world, director = null) {
  const mirroredPrimaryEconomy = primaryEconomyShared(world);
  const byOwner = {};
  for (const owner of activeOwners(world)) {
    const data = dominationBonuses(director ? signedMapDomination(director, owner) : 0);
    const hasEconomyLedger = primaryEconomyLedgerOwner(owner);
    const blockedBySharedDefinition = mirroredPrimaryEconomy && hasEconomyLedger;
    data.hasEconomyLedger = hasEconomyLedger;
    data.economyBlockedBySharedDefinition = blockedBySharedDefinition;
    data.economyAppliedPercent = hasEconomyLedger && !blockedBySharedDefinition ? data.economyBonusPercent : 0;
    data.economyAppliedMultiplier = 1 + data.economyAppliedPercent * DOMINATION_ECO_STEP_BONUS;
    byOwner[owner] = data;
  }
  return {
    signedPlayer: byOwner.player?.score || 0,
    mirroredPrimaryEconomy,
    byOwner
  };
}

function formatSigned(value) {
  const rounded = Math.round(Number(value || 0));
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

function bonusText(data) {
  if (!data) return "0% • no bonus";
  if (data.score > 0) {
    if (!data.hasEconomyLedger && data.economyBonusPercent > 0) return `${formatSigned(data.score)} • ECO waits for ledger`;
    if (data.economyBlockedBySharedDefinition && data.economyBonusPercent > 0) return `${formatSigned(data.score)} • ECO guarded in mirror`;
    return `${formatSigned(data.score)} • ECO +${data.economyAppliedPercent}%`;
  }
  if (data.score < 0) return `${formatSigned(data.score)} • ATTACK +${data.attackBonusPercent}%`;
  return "0% • no bonus";
}

function ensureHud(world) {
  let root = document.getElementById("mapDominationMomentum");
  if (!root) {
    const waypoint = document.getElementById("combatWaypointControls");
    const powers = document.getElementById("factionPowerButtons");
    const leftHud = document.getElementById("leftHud");
    const anchor = waypoint || powers || leftHud;
    if (!anchor) return null;

    root = document.createElement("div");
    root.id = "mapDominationMomentum";
    root.innerHTML = `
      <div class="section-title"><span>Map domination</span><strong id="mapDominationPercent">0%</strong></div>
      <p class="hint">Every +3% domination = +1% economy. Every -1% lost = +1% combat attack.</p>
      <div class="state-row"><span>You</span><b id="mapDominationPlayer">0% • no bonus</b></div>
      <div class="state-row"><span>Enemy</span><b id="mapDominationEnemy">0% • no bonus</b></div>`;

    if (anchor === leftHud) leftHud.appendChild(root);
    else anchor.insertAdjacentElement("afterend", root);
  }
  world.__axmMapDominationHud = root;
  return root;
}

function renderHud(world) {
  const root = ensureHud(world);
  if (!root) return;
  const state = world.__axmMapDominationMomentum || buildState(world, null);
  const headline = root.querySelector("#mapDominationPercent");
  const player = root.querySelector("#mapDominationPlayer");
  const enemy = root.querySelector("#mapDominationEnemy");
  if (headline) headline.textContent = formatSigned(state.byOwner.player?.score || 0);
  if (player) player.textContent = bonusText(state.byOwner.player);
  if (enemy) enemy.textContent = bonusText(state.byOwner.enemy);
}

function publishState(director) {
  const world = director?.world;
  if (!world) return null;
  const state = buildState(world, director);
  world.__axmMapDominationMomentum = state;
  world.__axmDominationEconomyMultiplier = owner =>
    Number(world.__axmMapDominationMomentum?.byOwner?.[owner]?.economyAppliedMultiplier || 1);
  world.__axmDominationAttackMultiplier = owner =>
    Number(world.__axmMapDominationMomentum?.byOwner?.[owner]?.attackMultiplier || 1);
  renderHud(world);
  return state;
}

function ownerActors(world, owner) {
  return world.entities.filter(entity =>
    entity?.parent &&
    entity.userData?.hp > 0 &&
    entity.userData?.owner === owner &&
    (entity.userData.type === "squad" || entity.userData.type === "founder") &&
    entity.userData.economyUnit !== true &&
    entity.userData.civilian !== true &&
    entity.userData.worker !== true
  );
}

function applyEconomyMomentum(world) {
  const state = world.__axmMapDominationMomentum;
  if (!state) return;
  for (const owner of ["player", "enemy"]) {
    const faction = world.__axmFactionByOwner?.[owner];
    const data = state.byOwner?.[owner];
    if (!faction?.economy || !data || data.economyAppliedPercent <= 0) continue;
    for (const key of Object.keys(faction.economy)) {
      if (Number.isFinite(Number(faction.economy[key]))) faction.economy[key] *= data.economyAppliedMultiplier;
    }
  }
}

function applyAttackMomentum(world) {
  const state = world.__axmMapDominationMomentum;
  for (const owner of activeOwners(world)) {
    const data = state?.byOwner?.[owner] || dominationBonuses(0);
    for (const actor of ownerActors(world, owner)) {
      actor.userData.__axmDominationAttackBonus = data.attackBonusPercent;
      actor.userData.__axmDominationState = data.attackBonusPercent > 0
        ? `Map comeback • +${data.attackBonusPercent}% attack`
        : data.economyAppliedPercent > 0
          ? `Map control • +${data.economyAppliedPercent}% economy`
          : null;
      if (data.attackBonusPercent > 0) actor.userData.damage *= data.attackMultiplier;
    }
  }
}

MapDirector.prototype.reset = function dominationMomentumReset(map) {
  const result = previousMapReset.call(this, map);
  this.world.__axmMapDominationMomentum = buildState(this.world, this);
  this.world.__axmDominationEconomyMultiplier = () => 1;
  this.world.__axmDominationAttackMultiplier = () => 1;
  renderHud(this.world);
  return result;
};

MapDirector.prototype.update = function dominationMomentumMapUpdate(dt, time = 0) {
  const result = previousMapUpdate.call(this, dt, time);
  publishState(this);
  return result;
};

FactionRuntime.prototype.update = function dominationMomentumFactionUpdate(dt, time = 0) {
  const result = previousFactionUpdate.call(this, dt, time);
  // Phase-26 faction powers restore their own economy baseline first. Applying
  // map economy after that keeps the two temporary multipliers composable and
  // prevents permanent drift across frames.
  applyEconomyMomentum(this.world);
  // Base/passive/power damage is already resolved by the previous runtime.
  // The comeback multiplier is the final formation/founder attack layer.
  applyAttackMomentum(this.world);
  return result;
};

window.AXMMapDomination = {
  bonuses: dominationBonuses,
  state() { return window.__AXM_RTS_WORLD__?.__axmMapDominationMomentum || null; }
};
