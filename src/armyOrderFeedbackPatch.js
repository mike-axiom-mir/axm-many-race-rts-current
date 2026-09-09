import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { summarizeArmyOrder, armyOrderDetail } from "./armyOrderFeedbackModel.js";

const previousCommand = RTSWorld.prototype.command;
const previousTick = RTSWorld.prototype.tick;
const previousResetDynamic = RTSWorld.prototype.resetDynamic;
const DOCTRINES = {
  defend: { label: "Defend homeland", color: 0x7dd7ff, shortcut: "1" },
  center: { label: "Contest the frontier", color: 0xffd06b, shortcut: "2" },
  attack: { label: "Push enemy capital", color: 0xff8585, shortcut: "3" }
};

let pendingDoctrine = null;

function playerFormations(world) {
  return world.entities.filter(entity => entity?.parent && entity.userData?.owner === "player" &&
    (entity.userData.type === "squad" || entity.userData.type === "founder") && Number(entity.userData.hp || 0) > 0);
}

function makeDestinationBeacon(world) {
  const group = new THREE.Group();
  group.name = "player-army-order-destination";
  group.visible = false;

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: DOCTRINES.center.color,
    transparent: true,
    opacity: .82,
    depthWrite: false
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, .13, 7, 40), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .16;

  const coreMaterial = new THREE.MeshBasicMaterial({
    color: DOCTRINES.center.color,
    transparent: true,
    opacity: .22,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const core = new THREE.Mesh(new THREE.RingGeometry(.28, 1.08, 28), coreMaterial);
  core.rotation.x = -Math.PI / 2;
  core.position.y = .17;

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(.06, .09, 3.2, 7),
    new THREE.MeshBasicMaterial({ color: 0xe5eef5, transparent: true, opacity: .76 })
  );
  mast.position.y = 1.72;

  const chevron = new THREE.Mesh(
    new THREE.ConeGeometry(.55, 1.3, 3),
    new THREE.MeshBasicMaterial({ color: DOCTRINES.center.color })
  );
  chevron.rotation.z = Math.PI;
  chevron.position.y = 3.55;

  group.add(ring, core, mast, chevron);
  group.userData = { ring, core, chevron };
  world.scene.add(group);
  return group;
}

function ensureUi() {
  let root = document.getElementById("armyOrderFeedback");
  if (root) return root;
  const commandStack = document.querySelector("#rightHud .command-stack");
  if (!commandStack) return null;

  root = document.createElement("section");
  root.id = "armyOrderFeedback";
  root.className = "army-order-feedback";
  root.dataset.phase = "idle";
  root.setAttribute("aria-label", "Current army order");
  root.innerHTML = `
    <div class="army-order-kicker"><span>Current order</span><strong id="armyOrderPhase">STANDING BY</strong></div>
    <div id="armyOrderName" class="army-order-name">No doctrine issued</div>
    <div id="armyOrderProgress" class="army-order-progress" role="progressbar" aria-label="Army order progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
    <p id="armyOrderDetail">Choose a doctrine. Its destination and formation response will remain visible.</p>
    <p id="armyOrderAnnouncement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>`;
  commandStack.insertAdjacentElement("afterend", root);

  for (const button of document.querySelectorAll("[data-command]")) {
    const doctrine = DOCTRINES[button.dataset.command];
    if (!doctrine) continue;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-keyshortcuts", doctrine.shortcut);
    const key = document.createElement("span");
    key.className = "command-key";
    key.setAttribute("aria-hidden", "true");
    key.textContent = doctrine.shortcut;
    button.appendChild(key);
  }
  return root;
}

function setActiveDoctrine(command) {
  for (const button of document.querySelectorAll("[data-command]")) {
    const active = button.dataset.command === command;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

class ArmyOrderFeedback {
  constructor(world) {
    this.world = world;
    this.root = ensureUi();
    this.beacon = makeDestinationBeacon(world);
    this.order = null;
    this.lastPhase = "idle";
    this.lastUiUpdate = -Infinity;
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }

  accept(command, point, formations) {
    const doctrine = DOCTRINES[command] || { label: "Field order", color: 0xffd06b };
    const destination = point.clone();
    const tracked = formations.map(entity => ({
      entity,
      startDistance: Math.max(2.2, entity.position.distanceTo(destination))
    }));
    this.order = { command, doctrine, destination, tracked };
    this.lastPhase = "accepted";
    this.beacon.position.set(destination.x, Number(destination.y || 0) + .05, destination.z);
    this.beacon.visible = true;
    for (const mesh of [this.beacon.userData.ring, this.beacon.userData.core, this.beacon.userData.chevron]) {
      mesh.material.color.setHex(doctrine.color);
    }
    setActiveDoctrine(command);
    this.render(true);
    window.dispatchEvent(new CustomEvent("axm:army-order", { detail: {
      command,
      label: doctrine.label,
      formations: tracked.length,
      destination: [destination.x, destination.y, destination.z]
    } }));
  }

  summary() {
    if (!this.order) return null;
    return summarizeArmyOrder(this.order.tracked.map(({ entity, startDistance }) => ({
      active: Boolean(entity?.parent && Number(entity.userData?.hp || 0) > 0),
      distance: entity?.position?.distanceTo?.(this.order.destination) ?? Infinity,
      startDistance
    })));
  }

  render(announceAccepted = false) {
    if (!this.root || !this.order) return;
    const summary = this.summary();
    const phase = summary.phase === "advancing" ? "ADVANCING" : summary.phase === "holding" ? "HOLDING" : summary.phase === "lost" ? "ORDER LOST" : "NO FORMATIONS";
    this.root.dataset.phase = summary.phase;
    this.root.querySelector("#armyOrderPhase").textContent = phase;
    this.root.querySelector("#armyOrderName").textContent = this.order.doctrine.label;
    this.root.querySelector("#armyOrderDetail").textContent = armyOrderDetail(summary);
    const progress = this.root.querySelector("#armyOrderProgress");
    progress.setAttribute("aria-valuenow", String(summary.progress));
    progress.setAttribute("aria-valuetext", `${summary.progress}% • ${armyOrderDetail(summary)}`);
    progress.querySelector("span").style.width = `${summary.progress}%`;

    const announcement = this.root.querySelector("#armyOrderAnnouncement");
    if (announceAccepted) {
      announcement.textContent = `${this.order.doctrine.label} accepted by ${summary.accepted} formation${summary.accepted === 1 ? "" : "s"}.`;
    } else if (summary.phase !== this.lastPhase && (summary.phase === "holding" || summary.phase === "lost")) {
      announcement.textContent = summary.phase === "holding" ? `${this.order.doctrine.label} complete. Formations are holding.` : `${this.order.doctrine.label}. All assigned formations were lost.`;
    }
    this.lastPhase = summary.phase;
  }

  update(time) {
    if (!this.order) return;
    if (!this.reducedMotion && this.beacon.visible) {
      const wave = Math.sin(Number(time || 0) * 3.1);
      this.beacon.userData.ring.scale.setScalar(1 + wave * .055);
      this.beacon.userData.ring.material.opacity = .74 + wave * .10;
      this.beacon.userData.chevron.position.y = 3.55 + wave * .14;
    }
    if (Number(time || 0) - this.lastUiUpdate >= .2) {
      this.lastUiUpdate = Number(time || 0);
      this.render(false);
    }
  }

  reset() {
    this.order = null;
    this.lastPhase = "idle";
    this.beacon.visible = false;
    setActiveDoctrine("");
    if (!this.root) return;
    this.root.dataset.phase = "idle";
    this.root.querySelector("#armyOrderPhase").textContent = "STANDING BY";
    this.root.querySelector("#armyOrderName").textContent = "No doctrine issued";
    this.root.querySelector("#armyOrderDetail").textContent = "Choose a doctrine. Its destination and formation response will remain visible.";
    const progress = this.root.querySelector("#armyOrderProgress");
    progress.setAttribute("aria-valuenow", "0");
    progress.querySelector("span").style.width = "0%";
  }
}

function ensureFeedback(world) {
  if (!world.__axmArmyOrderFeedback) world.__axmArmyOrderFeedback = new ArmyOrderFeedback(world);
  return world.__axmArmyOrderFeedback;
}

RTSWorld.prototype.command = function armyOrderCommandFeedback(owner, point) {
  const formations = owner === "player" ? playerFormations(this) : [];
  const result = previousCommand.call(this, owner, point);
  if (owner === "player" && point?.clone) {
    const command = pendingDoctrine && performance.now() - pendingDoctrine.time < 500 ? pendingDoctrine.command : "field";
    ensureFeedback(this).accept(command, point, formations);
    pendingDoctrine = null;
  }
  return result;
};

RTSWorld.prototype.tick = function armyOrderFeedbackTick(time, dt) {
  const result = previousTick.call(this, time, dt);
  this.__axmArmyOrderFeedback?.update(time);
  return result;
};

RTSWorld.prototype.resetDynamic = function armyOrderFeedbackReset() {
  this.__axmArmyOrderFeedback?.reset();
  return previousResetDynamic.call(this);
};

document.addEventListener("click", event => {
  const button = event.target?.closest?.("[data-command]");
  if (!button || !DOCTRINES[button.dataset.command]) return;
  const pending = { command: button.dataset.command, time: performance.now() };
  pendingDoctrine = pending;
  setTimeout(() => {
    if (pendingDoctrine === pending) pendingDoctrine = null;
  }, 0);
}, true);

window.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName))) return;
  const entry = Object.entries(DOCTRINES).find(([, doctrine]) => doctrine.shortcut === event.key);
  if (!entry) return;
  const button = document.querySelector(`[data-command="${entry[0]}"]`);
  if (!button || button.disabled || button.closest(".hidden")) return;
  event.preventDefault();
  button.click();
});

ensureUi();
