import assert from "node:assert/strict";
import test from "node:test";
import { damageFeedbackLifetime, summarizeDamageFeedback } from "../src/combatDamageFeedbackModel.js";

test("no feedback is invented without observable HP loss", () => {
  assert.equal(summarizeDamageFeedback(100, 100, 100), null);
  assert.equal(summarizeDamageFeedback(100, 105, 100), null);
  assert.equal(summarizeDamageFeedback(0, 0, 100), null);
});

test("feedback strength is derived from the actual bounded HP delta", () => {
  const light = summarizeDamageFeedback(100, 95, 100);
  const heavy = summarizeDamageFeedback(100, 60, 100);
  assert.deepEqual(light, { loss: 5, fraction: 0.05, strength: 0.38, lethal: false });
  assert.deepEqual(heavy, { loss: 40, fraction: 0.4, strength: 1, lethal: false });
  assert.ok(heavy.strength > light.strength);
});

test("lethal feedback remains presentation-only but gets a slightly longer lifetime", () => {
  const nonlethal = summarizeDamageFeedback(50, 30, 100);
  const lethal = summarizeDamageFeedback(20, -4, 100);
  assert.equal(nonlethal.lethal, false);
  assert.equal(lethal.lethal, true);
  assert.equal(lethal.loss, 20);
  assert.ok(damageFeedbackLifetime(lethal) > damageFeedbackLifetime(nonlethal));
});

test("invalid after values fail closed to no invented loss", () => {
  assert.equal(summarizeDamageFeedback(50, Number.NaN, 100), null);
  const summary = summarizeDamageFeedback(50, 40, Number.NaN);
  assert.equal(summary.fraction, 0.2);
  assert.ok(Math.abs(summary.strength - 0.86) < 1e-12);
});
