import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { FactionRuntime } from "./factionRuntime.js";

export const FACTION_POWER_SHARED_COOLDOWN = 120;

export const FACTION_POWER_CATALOG = {
  ironvale: {
    attack: { id: "ironvale-warden-advance", kind: "attack", name: "Warden Advance", duration: 18, description: "Commit the Compact line: +15% damage and +8% speed.", effects: { damage: 1.15, speed: 1.08 } },
    defense: { id: "ironvale-seal-the-line", kind: "defense", name: "Seal the Line", duration: 24, description: "Lock the formation: +14% armor, formation recovery and structure repair.", effects: { armor: .14, heal: 3.2, repair: 5.0 } },
    eco: { id: "ironvale-foundry-reserve", kind: "eco", name: "Foundry Reserve", duration: 30, description: "30s production surge focused on Wood, Stone and Gold.", economy: { food: 1.08, wood: 1.34, stone: 1.48, gold: 1.18 } }
  },
  greenwake: {
    attack: { id: "greenwake-briar-surge", kind: "attack", name: "Briar Surge", duration: 20, description: "Advance through attrition: +11% damage, +8% speed and light regeneration.", effects: { damage: 1.11, speed: 1.08, heal: 3.8 } },
    defense: { id: "greenwake-shared-canopy", kind: "defense", name: "Shared Canopy", duration: 24, description: "Deep sustain: +10% armor, strong formation healing and living-structure repair.", effects: { armor: .10, heal: 7.5, repair: 4.5 } },
    eco: { id: "greenwake-harvest-bloom", kind: "eco", name: "Harvest Bloom", duration: 30, description: "30s Food/Wood harvest bloom with a smaller Stone/Gold lift.", economy: { food: 1.52, wood: 1.44, stone: 1.12, gold: 1.10 } }
  },
  ashwind: {
    attack: { id: "ashwind-redline-march", kind: "attack", name: "Redline March", duration: 16, description: "Explosive commitment: +24% damage and +20% speed.", effects: { damage: 1.24, speed: 1.20 } },
    defense: { id: "ashwind-dust-screen", kind: "defense", name: "Dust Screen", duration: 18, description: "Survive by moving: +11% armor, +14% speed and light recovery.", effects: { armor: .11, speed: 1.14, heal: 2.5 } },
    eco: { id: "ashwind-frontier-windfall", kind: "eco", name: "Frontier Windfall", duration: 30, description: "30s caravan windfall heavily weighted toward Gold.", economy: { food: 1.18, wood: 1.16, stone: 1.08, gold: 1.62 } }
  },
  prismkin: {
    attack: { id: "prismkin-forced-focus", kind: "attack", name: "Forced Focus", duration: 18, description: "Overlay the cycle with +18% damage and +0.35 range.", effects: { damage: 1.18, range: .35 } },
    defense: { id: "prismkin-mend-chorus", kind: "defense", name: "Mend Chorus", duration: 22, description: "Resonant shelter: +10% armor and powerful formation recovery.", effects: { armor: .10, heal: 8.5, repair: 2.5 } },
    eco: { id: "prismkin-resonant-synthesis", kind: "eco", name: "Resonant Synthesis", duration: 30, description: "30s balanced synthesis across every resource stream.", economy: { food: 1.30, wood: 1.30, stone: 1.30, gold: 1.34 } }
  },
  northpole: {
    attack: { id: "northpole-prepared-offensive", kind: "attack", name: "Prepared Offensive", duration: 20, description: "Release stored momentum: +16% damage and +10% speed.", effects: { damage: 1.16, speed: 1.10 } },
    defense: { id: "northpole-whiteout-bastion", kind: "defense", name: "Whiteout Bastion", duration: 24, description: "Prepared shelter: +14% armor with strong structure repair.", effects: { armor: .14, heal: 2.5, repair: 6.0 } },
    eco: { id: "northpole-open-the-stores", kind: "eco", name: "Open the Stores", duration: 30, description: "30s reserve release focused on Food and Wood.", economy: { food: 1.58, wood: 1.40, stone: 1.12, gold: 1.08 } }
  },
  suitcase: {
    attack: { id: "suitcase-rapid-unpack", kind: "attack", name: "Rapid Unpack", duration: 16, description: "Turn logistics into pressure: +16% damage and +24% speed.", effects: { damage: 1.16, speed: 1.24 } },
    defense: { id: "suitcase-foldout-shelter", kind: "defense", name: "Foldout Shelter", duration: 20, description: "Mobile protection: +11% armor, +12% speed and light repair.", effects: { armor: .11, speed: 1.12, repair: 3.0 } },
    eco: { id: "suitcase-trade-route", kind: "eco", name: "Trade Route", duration: 30, description: "30s logistics boom focused on Gold and Wood.", economy: { food: 1.10, wood: 1.34, stone: 1.08, gold: 1.58 } }
  },
  fatfrotz: {
    attack: { id: "fatfrotz-mass-charge", kind: "attack", name: "Mass Charge", duration: 20, description: "Throw the mass forward: +20% damage and +12% speed.", effects: { damage: 1.20, speed: 1.12 } },
    defense: { id: "fatfrotz-dig-in-and-eat", kind: "defense", name: "Dig In & Eat", duration: 24, description: "Absorb the punishment: +16% armor and heavy formation recovery.", effects: { armor: .16, heal: 6.0, repair: 2.5 } },
    eco: { id: "fatfrotz-grand-feast", kind: "eco", name: "Grand Feast", duration: 30, description: "30s Food explosion with modest support to the other stores.", economy: { food: 1.66, wood: 1.16, stone: 1.10, gold: 1.08 } }
  },
  clockworkOrchard: {
    attack: { id: "clockwork-overclock-precision", kind: "attack", name: "Overclock Precision", duration: 18, description: "Tune the strike: +20% damage, +10% speed and +0.25 range.", effects: { damage: 1.20, speed: 1.10, range: .25 } },
    defense: { id: "clockwork-lockwork-formation", kind: "defense", name: "Lockwork Formation", duration: 22, description: "Precise defensive cadence: +14% armor and steady recovery.", effects: { armor: .14, heal: 4.5, repair: 4.0 } },
    eco: { id: "clockwork-perfect-harvest", kind: "eco", name: "Perfect Harvest", duration: 30, description: "30s precision harvest focused on Gold and Wood.", economy: { food: 1.08, wood: 1.38, stone: 1.16, gold: 1.52 } }
  }
};

const CATEGORY_LABEL = { attack: "ATTACK", defense: "DEFENSE", eco: "ECONOMY" };
const CATEGORY_COLOR = { attack: 0xff8b70, defense: 0x83cfff, eco: 0x92e29d };
const previousFactionUpdate = FactionRuntime.prototype.update;
const previousResetDynamic = RTSWorld.prototype.resetDynamic;
let lastWorld = null;
let toastTimer = null;

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

function ownerActors(world, owner) {
  return world.entities.filter(entity => entity.parent && entity.userData.hp > 0 && entity.userData.owner === owner && (entity.userData.type === "squad" || entity.userData.type === "founder"));
}

function ownerStructures(world, owner) {
  return world.entities.filter(entity => entity.parent && entity.userData.hp > 0 && entity.userData.owner === owner && (entity.userData.type === "building" || entity.userData.type === "capital"));
}

function showToast(message, kind = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${kind}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

function formatClock(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, "0")}`;
}

function powerForFaction(faction, powerId) {
  const powers = FACTION_POWER_CATALOG[faction?.id];
  return powers ? Object.values(powers).find(power => power.id === powerId) || null : null;
}

export class FactionPowerSystem {
  constructor(world) {
    this.world = world;
    this.time = 0;
    this.states = new Map();
    this.baseEconomy = new Map();
    this.pulses = [];
    this.uiFactionId = null;
    this.uiClock = 0;
    lastWorld = world;
  }

  factionFor(owner) {
    return this.world.__axmFactionByOwner?.[owner] || null;
  }

  stateFor(owner) {
    if (!this.states.has(owner)) this.states.set(owner, { cooldownUntil: 0, active: null, aiNextDecision: 20 });
    return this.states.get(owner);
  }

  rememberEconomy(faction) {
    if (!faction?.id || this.baseEconomy.has(faction.id)) return;
    this.baseEconomy.set(faction.id, { ...(faction.economy || {}) });
  }

  restoreEconomy(faction) {
    const base = this.baseEconomy.get(faction?.id);
    if (!base || !faction?.economy) return;
    for (const [key, value] of Object.entries(base)) faction.economy[key] = value;
  }

  reset() {
    for (const faction of Object.values(this.world.__axmFactionByOwner || {})) this.restoreEconomy(faction);
    this.states.clear();
    for (const pulse of this.pulses) this.disposePulse(pulse);
    this.pulses.length = 0;
    this.uiFactionId = null;
    this.renderUi(true);
  }

  cooldownRemaining(owner) {
    return Math.max(0, this.stateFor(owner).cooldownUntil - this.time);
  }

  activeRemaining(owner) {
    const active = this.stateFor(owner).active;
    return active ? Math.max(0, active.expiresAt - this.time) : 0;
  }

  available(owner) {
    const faction = this.factionFor(owner);
    const capital = ownerStructures(this.world, owner).find(entity => entity.userData.type === "capital");
    return Boolean(faction && FACTION_POWER_CATALOG[faction.id] && capital && this.cooldownRemaining(owner) <= 0);
  }

  activate(owner, powerId, source = "player") {
    const faction = this.factionFor(owner);
    const power = powerForFaction(faction, powerId);
    if (!power) return { ok: false, reason: "No faction power found." };
    const state = this.stateFor(owner);
    const remaining = this.cooldownRemaining(owner);
    if (remaining > 0) return { ok: false, reason: `Shared power cooldown: ${formatClock(remaining)}.` };
    if (!ownerStructures(this.world, owner).some(entity => entity.userData.type === "capital")) return { ok: false, reason: "No living capital." };

    this.rememberEconomy(faction);
    state.cooldownUntil = this.time + FACTION_POWER_SHARED_COOLDOWN;
    state.active = { power, expiresAt: this.time + Math.max(.1, Number(power.duration || 0)) };
    this.applyEconomyLayer(owner, state.active);
    this.spawnActivationPulse(owner, power);
    this.renderUi(true);

    const prefix = source === "ai" ? `${faction.name} used` : "Activated";
    showToast(`${prefix} ${power.name} — all three powers locked for 2:00.`, source === "ai" ? "bad" : "good");
    window.dispatchEvent(new CustomEvent("axm-faction-power-used", { detail: { owner, factionId: faction.id, powerId: power.id, kind: power.kind } }));
    return { ok: true, power };
  }

  applyEconomyLayer(owner, active) {
    const faction = this.factionFor(owner);
    if (!faction) return;
    this.rememberEconomy(faction);
    this.restoreEconomy(faction);
    if (!active || active.power.kind !== "eco" || active.expiresAt <= this.time) return;
    for (const [key, multiplier] of Object.entries(active.power.economy || {})) {
      if (Number.isFinite(Number(faction.economy?.[key]))) faction.economy[key] *= Number(multiplier || 1);
    }
  }

  clearActorPower(actor) {
    if (!actor?.userData) return;
    actor.userData.__axmPowerState = null;
  }

  applyCombatLayer(owner, active, dt) {
    if (!active || active.expiresAt <= this.time || active.power.kind === "eco") return;
    const effects = active.power.effects || {};
    for (const actor of ownerActors(this.world, owner)) {
      const data = actor.userData;
      if (Number(effects.damage) > 0) data.damage *= Number(effects.damage);
      if (Number(effects.speed) > 0) data.speed *= Number(effects.speed);
      if (Number(effects.range)) data.range += Number(effects.range);
      if (Number(effects.armor) > 0) data.__axmFactionArmor = Math.min(.55, Number(data.__axmFactionArmor || 0) + Number(effects.armor));
      if (Number(effects.heal) > 0 && data.hp < data.maxHp) data.hp = Math.min(data.maxHp, data.hp + Number(effects.heal) * dt);
      data.__axmPowerState = `${active.power.name} • ${Math.max(1, Math.ceil(active.expiresAt - this.time))}s`;
    }
    if (Number(effects.repair) > 0) {
      for (const structure of ownerStructures(this.world, owner)) {
        const data = structure.userData;
        if (data.hp < data.maxHp) data.hp = Math.min(data.maxHp, data.hp + Number(effects.repair) * dt);
      }
    }
  }

  updateActiveOwners(dt) {
    const owners = new Set([...Object.keys(this.world.__axmFactionByOwner || {}), ...this.world.entities.map(entity => entity.userData.owner).filter(Boolean)]);
    for (const owner of owners) {
      const faction = this.factionFor(owner);
      if (!faction) continue;
      this.rememberEconomy(faction);
      const state = this.stateFor(owner);
      for (const actor of ownerActors(this.world, owner)) this.clearActorPower(actor);
      if (state.active && state.active.expiresAt <= this.time) {
        this.restoreEconomy(faction);
        state.active = null;
      }
      this.applyEconomyLayer(owner, state.active);
      this.applyCombatLayer(owner, state.active, dt);
    }
  }

  nearestHostileDistance(entity, owner) {
    let best = Infinity;
    for (const other of this.world.entities) {
      if (!other.parent || other.userData.hp <= 0 || !other.userData.owner || sameTeam(this.world, owner, other.userData.owner)) continue;
      if (other.userData.type !== "squad" && other.userData.type !== "founder") continue;
      best = Math.min(best, entity.position.distanceTo(other.position));
    }
    return best;
  }

  maybeUseEnemyPower() {
    const owner = "enemy";
    const faction = this.factionFor(owner);
    const powers = FACTION_POWER_CATALOG[faction?.id];
    if (!powers) return;
    const state = this.stateFor(owner);
    if (this.time < state.aiNextDecision || this.cooldownRemaining(owner) > 0) return;
    const capital = ownerStructures(this.world, owner).find(entity => entity.userData.type === "capital");
    if (!capital) return;

    const squads = ownerActors(this.world, owner).filter(entity => entity.userData.type === "squad");
    const capitalRatio = Number(capital.userData.hp || 0) / Math.max(1, Number(capital.userData.maxHp || 1));
    const danger = this.nearestHostileDistance(capital, owner);
    const engaged = squads.some(squad => this.nearestHostileDistance(squad, owner) <= 7.5);
    const threatened = capitalRatio < .72 || danger <= 17;
    let choice = powers.eco;
    if (threatened) choice = powers.defense;
    else if (engaged || squads.length >= 5) choice = powers.attack;

    const result = this.activate(owner, choice.id, "ai");
    state.aiNextDecision = result.ok ? state.cooldownUntil + .5 : this.time + 4;
  }

  spawnActivationPulse(owner, power) {
    const capital = ownerStructures(this.world, owner).find(entity => entity.userData.type === "capital");
    const anchor = capital || ownerActors(this.world, owner)[0];
    if (!anchor) return;
    const color = CATEGORY_COLOR[power.kind] || 0xffffff;
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(capital ? 5.4 : 2.1, .12, 7, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .72, depthWrite: false })
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(anchor.position);
    mesh.position.y += .12;
    mesh.renderOrder = 5;
    this.world.scene.add(mesh);
    this.pulses.push({ mesh, age: 0, duration: 2.2 });
  }

  disposePulse(pulse) {
    pulse.mesh?.parent?.remove(pulse.mesh);
    pulse.mesh?.geometry?.dispose?.();
    pulse.mesh?.material?.dispose?.();
  }

  updatePulses(dt) {
    for (let index = this.pulses.length - 1; index >= 0; index--) {
      const pulse = this.pulses[index];
      pulse.age += dt;
      const t = Math.min(1, pulse.age / pulse.duration);
      pulse.mesh.scale.setScalar(1 + t * 1.8);
      pulse.mesh.material.opacity = .72 * (1 - t);
      if (t >= 1) {
        this.disposePulse(pulse);
        this.pulses.splice(index, 1);
      }
    }
  }

  renderUi(force = false) {
    const container = document.getElementById("factionPowerButtons");
    const cooldown = document.getElementById("factionPowerCooldown");
    if (!container || !cooldown) return;
    const faction = this.factionFor("player");
    const powers = FACTION_POWER_CATALOG[faction?.id];
    if (!faction || !powers) {
      if (force) container.innerHTML = "";
      cooldown.textContent = "—";
      return;
    }

    if (force || this.uiFactionId !== faction.id || container.children.length !== 3) {
      this.uiFactionId = faction.id;
      container.innerHTML = "";
      for (const power of [powers.attack, powers.defense, powers.eco]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.powerId = power.id;
        button.dataset.powerKind = power.kind;
        button.innerHTML = `<span>${CATEGORY_LABEL[power.kind]}</span><b>${power.name}</b><small>${power.description}</small>`;
        button.addEventListener("click", () => {
          const world = window.__AXM_RTS_WORLD__ || lastWorld;
          const system = world ? ensureFactionPowerSystem(world) : null;
          if (!system) return;
          const result = system.activate("player", power.id, "player");
          if (!result.ok) showToast(result.reason, "bad");
        });
        container.appendChild(button);
      }
    }

    const remaining = this.cooldownRemaining("player");
    const active = this.stateFor("player").active;
    const livingCapital = ownerStructures(this.world, "player").some(entity => entity.userData.type === "capital");
    cooldown.textContent = remaining > 0 ? `LOCKED ${formatClock(remaining)}` : "READY";
    cooldown.classList.toggle("locked", remaining > 0);
    for (const button of container.querySelectorAll("button")) {
      button.disabled = remaining > 0 || !livingCapital;
      const power = powerForFaction(faction, button.dataset.powerId);
      button.classList.toggle("active", Boolean(active && power?.id === active.power.id && active.expiresAt > this.time));
      const small = button.querySelector("small");
      if (small && power) {
        small.textContent = active?.power.id === power.id && active.expiresAt > this.time
          ? `${power.description} • ACTIVE ${Math.ceil(active.expiresAt - this.time)}s`
          : power.description;
      }
    }
  }

  update(dt, time) {
    this.time = Number(time || 0);
    this.updateActiveOwners(dt);
    this.maybeUseEnemyPower();
    this.updatePulses(dt);
    this.uiClock += dt;
    if (this.uiClock >= .15) {
      this.uiClock = 0;
      this.renderUi();
    }
  }
}

export function ensureFactionPowerSystem(world) {
  if (!world.__axmFactionPowerSystem) world.__axmFactionPowerSystem = new FactionPowerSystem(world);
  lastWorld = world;
  return world.__axmFactionPowerSystem;
}

export function activateFactionPower(world, owner, powerId) {
  return ensureFactionPowerSystem(world).activate(owner, powerId, owner === "enemy" ? "ai" : "player");
}

FactionRuntime.prototype.update = function factionPowerAwareUpdate(dt, time = 0) {
  const result = previousFactionUpdate.call(this, dt, time);
  ensureFactionPowerSystem(this.world).update(dt, time);
  return result;
};

RTSWorld.prototype.resetDynamic = function factionPowerAwareReset() {
  this.__axmFactionPowerSystem?.reset();
  return previousResetDynamic.call(this);
};

window.AXMFactionPowers = {
  catalog: FACTION_POWER_CATALOG,
  sharedCooldown: FACTION_POWER_SHARED_COOLDOWN,
  activate(owner, powerId) {
    const world = window.__AXM_RTS_WORLD__ || lastWorld;
    return world ? activateFactionPower(world, owner, powerId) : { ok: false, reason: "No active Skirmish world." };
  }
};
