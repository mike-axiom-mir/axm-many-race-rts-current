import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";
import { flatHeightAt } from "./mapVisuals.js";

const previousBindInput = RTSWorld.prototype.bindInput;
const previousResetDynamic = RTSWorld.prototype.resetDynamic;
let toastTimer = null;

const ECONOMY_ROLES = new Set(["economy", "economic", "worker", "civilian", "villager", "gatherer", "trader", "merchant", "laborer", "labourer"]);

function roleOf(entity) {
  const data = entity?.userData || {};
  return String(data.strategicRole || data.unitRole || data.role || data.combatRole || data.combat?.role || "").toLowerCase();
}

export function isEconomyUnit(entity) {
  const data = entity?.userData || {};
  if (data.economyUnit === true || data.isEconomyUnit === true || data.worker === true || data.civilian === true) return true;
  return ECONOMY_ROLES.has(roleOf(entity));
}

export function combatCommandUnits(world, owner = "player") {
  return world.entities.filter(entity => {
    if (!entity?.parent || Number(entity.userData?.hp || 0) <= 0 || entity.userData?.owner !== owner) return false;
    if (entity.userData.type !== "squad" && entity.userData.type !== "founder") return false;
    return !isEconomyUnit(entity);
  });
}

function showToast(message, kind = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${kind}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function mapBounds() {
  const width = Math.max(40, Number(DEFAULT_MAP?.environment?.width || 100));
  const depth = Math.max(32, Number(DEFAULT_MAP?.environment?.depth || 72));
  return { halfWidth: width / 2 - 2.2, halfDepth: depth / 2 - 2.2 };
}

function clampPoint(point) {
  const { halfWidth, halfDepth } = mapBounds();
  const target = point.clone();
  target.x = THREE.MathUtils.clamp(target.x, -halfWidth, halfWidth);
  target.z = THREE.MathUtils.clamp(target.z, -halfDepth, halfDepth);
  target.y = 0;
  return target;
}

function formationTarget(center, index, count) {
  const spacing = 2.35;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const target = center.clone();
  target.x += (column - (columns - 1) / 2) * spacing;
  target.z += (row - (rows - 1) / 2) * spacing;
  return clampPoint(target);
}

function makeWaypointMarker(world) {
  const group = new THREE.Group();
  group.name = "player-combat-waypoint";
  group.visible = false;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.65, .11, 7, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc86d, transparent: true, opacity: .82, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .12;

  const inner = new THREE.Mesh(
    new THREE.RingGeometry(.32, .62, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe3a6, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false })
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = .13;

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(.055, .075, 2.7, 6),
    new THREE.MeshBasicMaterial({ color: 0xd8bd7e })
  );
  mast.position.y = 1.45;

  const pennant = new THREE.Mesh(
    new THREE.ConeGeometry(.42, .9, 3),
    new THREE.MeshBasicMaterial({ color: 0xffb95e })
  );
  pennant.rotation.z = -Math.PI / 2;
  pennant.position.set(.48, 2.45, 0);

  group.add(ring, inner, mast, pennant);
  group.userData.ring = ring;
  world.scene.add(group);
  return group;
}

function ensureUi(system) {
  let root = document.getElementById("combatWaypointControls");
  if (!root) {
    const powers = document.getElementById("factionPowerButtons");
    const leftHud = document.getElementById("leftHud");
    const anchor = powers?.parentElement || leftHud;
    if (!anchor) return;

    root = document.createElement("div");
    root.id = "combatWaypointControls";
    root.innerHTML = `
      <div class="section-title"><span>Army movement</span><strong id="combatWaypointState">NO WAYPOINT</strong></div>
      <p class="hint">Combat troops only. Economy/civilian units are excluded.</p>
      <div class="action-grid">
        <button type="button" data-axm-combat-waypoint="place"><b>All Combat → Map</b><small>Select all combat troops, then tap one destination.</small></button>
        <button type="button" data-axm-combat-waypoint="reissue"><b>Go To Waypoint</b><small>Reissue the saved waypoint to the current combat army.</small></button>
      </div>`;

    if (powers) powers.insertAdjacentElement("afterend", root);
    else anchor.appendChild(root);

    root.querySelector('[data-axm-combat-waypoint="place"]')?.addEventListener("click", () => system.armMapTap());
    root.querySelector('[data-axm-combat-waypoint="reissue"]')?.addEventListener("click", () => system.reissue());
  }
  system.uiRoot = root;
  system.refreshUi();
}

class CombatWaypointSystem {
  constructor(world) {
    this.world = world;
    this.mode = null;
    this.waypoint = null;
    this.marker = makeWaypointMarker(world);
    this.uiRoot = null;
    ensureUi(this);
  }

  refreshUi() {
    if (!this.uiRoot) return;
    const state = this.uiRoot.querySelector("#combatWaypointState");
    const place = this.uiRoot.querySelector('[data-axm-combat-waypoint="place"]');
    const reissue = this.uiRoot.querySelector('[data-axm-combat-waypoint="reissue"]');
    if (state) state.textContent = this.mode === "place" ? "TAP MAP" : this.waypoint ? "WAYPOINT SET" : "NO WAYPOINT";
    if (place) place.classList.toggle("active", this.mode === "place");
    if (reissue) reissue.disabled = !this.waypoint;
  }

  armMapTap() {
    this.mode = "place";
    this.refreshUi();
    showToast("All combat selected — tap the battlefield to place/move the army waypoint.");
  }

  cancelArm() {
    if (!this.mode) return;
    this.mode = null;
    this.refreshUi();
  }

  setWaypoint(point) {
    const target = clampPoint(point);
    this.waypoint = target;
    const y = flatHeightAt(DEFAULT_MAP, target.x, target.z);
    this.marker.position.set(target.x, y + .03, target.z);
    this.marker.visible = true;
    this.issue(target, true);
    this.mode = null;
    this.refreshUi();
  }

  issue(point, placed = false) {
    const units = combatCommandUnits(this.world, "player");
    if (!units.length) {
      showToast("No combat troops available. Economy/civilian units remain excluded.", "bad");
      return 0;
    }
    for (let index = 0; index < units.length; index++) {
      const unit = units[index];
      unit.userData.target = formationTarget(point, index, units.length);
      delete unit.userData.__axmTerrainRoute;
      unit.userData.__axmCombatWaypoint = true;
    }
    showToast(`${placed ? "Waypoint set" : "Waypoint order reissued"} — ${units.length} combat formation${units.length === 1 ? "" : "s"} moving.`, "good");
    return units.length;
  }

  reissue() {
    if (!this.waypoint) {
      showToast("No army waypoint set yet.", "bad");
      return;
    }
    this.issue(this.waypoint, false);
  }

  handleGroundClick(point) {
    if (this.mode !== "place") return false;
    this.setWaypoint(point);
    return true;
  }

  update(time) {
    if (!this.marker?.visible) return;
    const ring = this.marker.userData.ring;
    if (ring) {
      const pulse = 1 + Math.sin(Number(time || 0) * 2.7) * .07;
      ring.scale.setScalar(pulse);
      ring.material.opacity = .72 + Math.sin(Number(time || 0) * 2.7) * .10;
    }
  }

  reset() {
    this.mode = null;
    this.waypoint = null;
    if (this.marker) this.marker.visible = false;
    this.refreshUi();
  }
}

function ensureCombatWaypoint(world) {
  if (!world.__axmCombatWaypoint) world.__axmCombatWaypoint = new CombatWaypointSystem(world);
  return world.__axmCombatWaypoint;
}

RTSWorld.prototype.bindInput = function combatWaypointInputBridge() {
  const originalGroundClick = this.hooks?.onGroundClick;
  if (this.hooks) {
    this.hooks.onGroundClick = point => {
      const system = ensureCombatWaypoint(this);
      if (system.handleGroundClick(point)) return;
      return originalGroundClick?.(point);
    };
  }
  const result = previousBindInput.call(this);
  ensureCombatWaypoint(this);
  return result;
};

const previousTick = RTSWorld.prototype.tick;
RTSWorld.prototype.tick = function combatWaypointTick(time, dt) {
  ensureCombatWaypoint(this).update(time);
  return previousTick.call(this, time, dt);
};

RTSWorld.prototype.resetDynamic = function combatWaypointReset() {
  this.__axmCombatWaypoint?.reset();
  return previousResetDynamic.call(this);
};

document.addEventListener("click", event => {
  const button = event.target?.closest?.("button");
  if (!button || button.dataset.axmCombatWaypoint) return;
  const world = window.__AXM_RTS_WORLD__;
  world?.__axmCombatWaypoint?.cancelArm?.();
}, true);

window.AXMCombatWaypoint = {
  combatCommandUnits,
  isEconomyUnit,
  arm() { window.__AXM_RTS_WORLD__?.__axmCombatWaypoint?.armMapTap?.(); },
  reissue() { window.__AXM_RTS_WORLD__?.__axmCombatWaypoint?.reissue?.(); }
};
