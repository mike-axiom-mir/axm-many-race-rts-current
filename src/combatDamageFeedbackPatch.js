import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { damageFeedbackLifetime, summarizeDamageFeedback } from "./combatDamageFeedbackModel.js";

const previousTick = RTSWorld.prototype.tick;
const previousResetDynamic = RTSWorld.prototype.resetDynamic;
const MAX_ACTIVE_FEEDBACK = 20;
const RING_GEOMETRY = new THREE.TorusGeometry(0.62, 0.07, 5, 18);
const BURST_GEOMETRY = new THREE.OctahedronGeometry(0.22, 0);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOut(value) {
  const t = clamp01(value);
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

function targetColor(owner) {
  if (owner === "player") return 0x86e6ff;
  if (owner === "enemy") return 0xff6677;
  if (owner === "seat-3") return 0xffd66d;
  if (owner === "seat-4") return 0xc69cff;
  return 0xe9f5ff;
}

function ensureFeedback(world) {
  if (world.__axmCombatDamageFeedbackFx) return world.__axmCombatDamageFeedbackFx;
  const group = new THREE.Group();
  group.name = "axm-combat-damage-feedback";
  world.scene.add(group);
  world.__axmCombatDamageFeedbackFx = {
    group,
    entries: [],
    byTarget: new WeakMap(),
    beforeHp: new Map(),
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  };
  return world.__axmCombatDamageFeedbackFx;
}

function presentationVisible(world, target) {
  if (!target) return false;
  const owner = target.userData?.owner;
  const fog = world.__axmFogSystem;
  if (!fog) return target.visible !== false;
  if (typeof fog.friendlyToPlayer === "function" && fog.friendlyToPlayer(owner)) return true;
  if (owner === "player") return true;
  if (typeof fog.isPointVisible === "function") {
    return Boolean(fog.isPointVisible(Number(target.position?.x || 0), Number(target.position?.z || 0)));
  }
  return target.visible !== false;
}

function effectHeight(target) {
  const type = target?.userData?.type;
  if (type === "capital") return 2.2;
  if (type === "building") return 1.55;
  if (type === "founder") return 1.3;
  return 1.0;
}

function makeMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false
  });
}

function disposeEntry(fx, entry) {
  if (!entry) return;
  entry.root.parent?.remove(entry.root);
  entry.ring.material.dispose();
  entry.burst.material.dispose();
  if (entry.target && fx.byTarget.get(entry.target) === entry) fx.byTarget.delete(entry.target);
  const index = fx.entries.indexOf(entry);
  if (index >= 0) fx.entries.splice(index, 1);
}

function trimFeedback(fx) {
  while (fx.entries.length > MAX_ACTIVE_FEEDBACK) disposeEntry(fx, fx.entries[0]);
}

function dispatchVisibleFeedback(target, summary) {
  window.dispatchEvent(new CustomEvent("axm:combat-damage-feedback", {
    detail: Object.freeze({
      schema: "axm.rts.visible-damage-feedback/v0.1",
      source: "observable-hp-loss",
      targetOwner: String(target.userData?.owner || "unknown"),
      targetType: String(target.userData?.type || "entity"),
      lethal: summary.lethal,
      impactStrength: Number(summary.strength.toFixed(3)),
      point: Object.freeze([
        Number(target.position.x.toFixed(3)),
        Number(target.position.y.toFixed(3)),
        Number(target.position.z.toFixed(3))
      ]),
      authority: Object.freeze({ gameplayMutation: false, combatAttribution: false, canon: false })
    })
  }));
}

function spawnDamageFeedback(world, target, summary) {
  if (!presentationVisible(world, target)) return;
  const fx = ensureFeedback(world);
  const existing = fx.byTarget.get(target);
  if (existing) {
    existing.age = 0;
    existing.duration = Math.max(existing.duration, damageFeedbackLifetime(summary));
    existing.strength = Math.max(existing.strength, summary.strength);
    existing.lethal ||= summary.lethal;
    existing.root.position.copy(target.position);
    existing.root.position.y += 0.08;
    dispatchVisibleFeedback(target, summary);
    return;
  }

  const color = targetColor(target.userData?.owner);
  const root = new THREE.Group();
  root.name = `damage-feedback-${target.userData?.id || target.userData?.type || "entity"}`;
  root.position.copy(target.position);
  root.position.y += 0.08;

  const ring = new THREE.Mesh(RING_GEOMETRY, makeMaterial(color, 0.9));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;

  const burst = new THREE.Mesh(BURST_GEOMETRY, makeMaterial(0xffffff, 0.96));
  burst.position.y = effectHeight(target);
  burst.scale.setScalar(0.86 + summary.strength * 0.5);

  root.add(ring, burst);
  fx.group.add(root);
  const entry = {
    target,
    root,
    ring,
    burst,
    age: 0,
    duration: damageFeedbackLifetime(summary),
    strength: summary.strength,
    lethal: summary.lethal
  };
  fx.entries.push(entry);
  fx.byTarget.set(target, entry);
  trimFeedback(fx);
  dispatchVisibleFeedback(target, summary);
}

function animateFeedback(world, dt) {
  const fx = world.__axmCombatDamageFeedbackFx;
  if (!fx?.entries?.length) return;
  for (const entry of [...fx.entries]) {
    entry.age += Math.max(0, Number(dt || 0));
    const progress = clamp01(entry.age / Math.max(0.01, entry.duration));
    const fade = 1 - progress;
    const expansion = fx.reducedMotion ? 1 : 0.68 + easeOut(progress) * (0.92 + entry.strength * 0.5);
    entry.ring.scale.setScalar(expansion);
    entry.ring.material.opacity = 0.9 * fade;
    entry.burst.material.opacity = 0.96 * Math.max(0, 1 - progress * 1.35);
    if (!fx.reducedMotion) {
      entry.burst.scale.setScalar((0.86 + entry.strength * 0.5) * (1 - progress * 0.34));
      entry.burst.rotation.y += Number(dt || 0) * (entry.lethal ? 6.2 : 4.6);
    }
    if (progress >= 1) disposeEntry(fx, entry);
  }
}

function clearFeedback(world) {
  const fx = world.__axmCombatDamageFeedbackFx;
  if (!fx) return;
  for (const entry of [...fx.entries]) disposeEntry(fx, entry);
  fx.beforeHp.clear();
}

RTSWorld.prototype.tick = function damageFeedbackTick(time, dt) {
  const fx = ensureFeedback(this);
  animateFeedback(this, dt);
  fx.beforeHp.clear();
  for (const entity of this.entities || []) {
    const hp = Number(entity?.userData?.hp);
    if (entity?.parent && Number.isFinite(hp) && hp > 0) fx.beforeHp.set(entity, hp);
  }

  const result = previousTick.call(this, time, dt);

  for (const [target, beforeHp] of fx.beforeHp.entries()) {
    const afterHp = Number(target?.userData?.hp);
    const summary = summarizeDamageFeedback(beforeHp, afterHp, target?.userData?.maxHp);
    if (summary) spawnDamageFeedback(this, target, summary);
  }
  return result;
};

RTSWorld.prototype.resetDynamic = function damageFeedbackResetDynamic(...args) {
  clearFeedback(this);
  return previousResetDynamic.apply(this, args);
};

export const COMBAT_DAMAGE_FEEDBACK_LIMIT = MAX_ACTIVE_FEEDBACK;
