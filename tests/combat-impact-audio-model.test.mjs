import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ACTIVE_AUDIO_VOICES, hasImpactVoiceBudget, readMasterVolume, summarizeImpactAudio } from "../src/combatImpactAudioPatch.js";

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
  assert.equal(summarizeImpactAudio(event({ authority: { gameplayMutation: true, combatAttribution: false, canon: false } })), null);
  assert.equal(summarizeImpactAudio(event({ authority: { gameplayMutation: false, combatAttribution: true, canon: false } })), null);
  assert.equal(summarizeImpactAudio(event({ authority: { gameplayMutation: false, combatAttribution: false, canon: true } })), null);
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

test("concurrent sound expression degrades before exceeding the bounded voice budget", () => {
  assert.equal(MAX_ACTIVE_AUDIO_VOICES, 8);
  assert.equal(hasImpactVoiceBudget(0, 1), true);
  assert.equal(hasImpactVoiceBudget(6, 2), true);
  assert.equal(hasImpactVoiceBudget(7, 2), false);
  assert.equal(hasImpactVoiceBudget(8, 1), false);
  assert.equal(hasImpactVoiceBudget(0, 0), false);
  assert.equal(hasImpactVoiceBudget(-4, 1), true);
});

test("saved master volume defaults safely and clamps malformed local preference", () => {
  const storage = value => ({ getItem: () => value });
  assert.equal(readMasterVolume(storage(null)), 80);
  assert.equal(readMasterVolume(storage("not-json")), 80);
  assert.equal(readMasterVolume(storage('{"masterVolume":"35"}')), 35);
  assert.equal(readMasterVolume(storage('{"masterVolume":999}')), 100);
  assert.equal(readMasterVolume(storage('{"masterVolume":-8}')), 0);
});
