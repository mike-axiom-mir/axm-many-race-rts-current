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

export function signedMapDomination(director) {
  const sites = director?.sites || [];
  if (!sites.length) return 0;
  const total = sites.reduce((sum, site) => sum + clampScore(site.progress), 0);
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

function samePrimaryFaction(world) {
  const factions = world?.__axmFactionByOwner || {};
  return Boolean(factions.player?.id && factions.player.id === factions.enemy?.id);
}

function buildState(world, signedPlayer) {
  const mirroredFaction = samePrimaryFaction(world);
  const player = dominationBonuses(signedPlayer);
  const enemy = dominationBonuses(-signedPlayer);
  player.economyAppliedPercent = mirroredFaction ? 0 : player.economyBonusPercent;
  enemy.economyAppliedPercent = mirroredFaction ? 0 : enemy.economyBonusPercent;
  player.economyAppliedMultiplier = 1 + player.economyAppliedPercent * DOMINATION_ECO_STEP_BONUS;
  enemy.economyAppliedMultiplier = 1 + enemy.economyAppliedPercent * DOMINATION_ECO_STEP_BONUS;
  return {
    signedPlayer: clampScore(signedPlayer),
    mirroredFaction,
    byOwner: { player, enemy }
  };
}

function formatSigned(value) {
  const rounded = Math.round(Number(value || 0));
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

function bonusText(data, mirrored = false) {
  if (!data) return "Neutral";
  if (data.score > 0) {
    if (mirrored && data.economyBonusPercent > 0) return `${formatSigned(data.score)} • ECO guarded in mirror`;
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
  const state = world.__axmMapDominationMomentum || buildState(world, 0);
  const headline = root.querySelector("#mapDominationPercent");
  const player = root.querySelector("#mapDominationPlayer");
  const enemy = root.querySelector("#mapDominationEnemy");
  if (headline) headline.textContent = formatSigned(state.signedPlayer);
  if (player) player.textContent = bonusText(state.byOwner.player, state.mirroredFaction);
  if (enemy) enemy.textContent = bonusText(state.byOwner.enemy, state.mirroredFaction);
}

function publishState(director) {
  const world = director?.world;
  if (!world) return null;
  const state = buildState(world, signedMapDomination(director));
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
  if (!state || state.mirroredFaction) return;
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
  for (const owner of ["player", "enemy"]) {
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
  this.world.__axmMapDominationMomentum = buildState(this.world, 0);
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
