import assert from "node:assert/strict";
import test from "node:test";
import { readMasterVolume, summarizeImpactAudio } from "../src/combatImpactAudioPatch.js";

const authority = Object.freeze({ gameplayMutation: false, combatAttribution: false, canon: false });

function event(overrides = {}) {
  return {
    schema: "axm.rts.visible-damage-feedback/v0.1",
    source: "observable-hp-loss",
    targetOwner: "enemy",
    targetType: "squad",
    lethal: false,
    impactStrength: 0.5,
    authority,
    ...overrides
  };
}

test("impact audio accepts only the existing observation-only damage receipt", () => {
  assert.equal(summarizeImpactAudio(null), null);
  assert.equal(summarizeImpactAudio(event({ schema: "wrong" })), null);
  assert.equal(summarizeImpactAudio(event({ source: "guessed-hit" })), null);
  assert.equal(summarizeImpactAudio(event({ authority: { gameplayMutation: true, canon: false } })), null);
  assert.ok(summarizeImpactAudio(event()));
});

test("volume is local presentation policy and can mute without changing the event", () => {
  const muted = summarizeImpactAudio(event(), 0);
  const audible = summarizeImpactAudio(event(), 35);
  assert.equal(muted.audible, false);
  assert.equal(muted.gain, 0);
  assert.equal(audible.audible, true);
  assert.equal(audible.volume, 0.35);
  assert.ok(audible.gain > 0);
  assert.deepEqual(event(), event());
});

test("stronger and lethal observed damage only enrich the replaceable sound realization", () => {
  const light = summarizeImpactAudio(event({ impactStrength: 0.2 }), 80);
  const strong = summarizeImpactAudio(event({ impactStrength: 0.9 }), 80);
  const lethal = summarizeImpactAudio(event({ impactStrength: 0.9, lethal: true, targetType: "capital" }), 80);
  assert.ok(strong.gain > light.gain);
  assert.ok(strong.frequency > light.frequency);
  assert.equal(strong.voiceCount, 1);
  assert.equal(lethal.voiceCount, 2);
  assert.ok(lethal.duration > strong.duration);
  assert.ok(lethal.frequency < strong.frequency);
});

test("saved master volume defaults safely and clamps malformed local preference", () => {
  const storage = value => ({ getItem: () => value });
  assert.equal(readMasterVolume(storage(null)), 80);
  assert.equal(readMasterVolume(storage("not-json")), 80);
  assert.equal(readMasterVolume(storage('{"masterVolume":"35"}')), 35);
  assert.equal(readMasterVolume(storage('{"masterVolume":999}')), 100);
  assert.equal(readMasterVolume(storage('{"masterVolume":-8}')), 0);
});
