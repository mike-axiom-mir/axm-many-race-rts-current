const SETTINGS_KEY = "axm.manyRaceRts.settings";
const AUDIO_EVENT = "axm:combat-impact-audio";

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function readMasterVolume(storage = globalThis.localStorage) {
  let saved = {};
  try {
    saved = JSON.parse(storage?.getItem?.(SETTINGS_KEY) || "{}");
  } catch {
    saved = {};
  }
  return clamp(finite(saved.masterVolume, 80), 0, 100);
}

export function summarizeImpactAudio(detail, masterVolume = 80) {
  if (!detail || detail.schema !== "axm.rts.visible-damage-feedback/v0.1") return null;
  if (detail.source !== "observable-hp-loss") return null;
  if (detail.authority?.gameplayMutation !== false || detail.authority?.canon !== false) return null;

  const strength = clamp(finite(detail.impactStrength, 0), 0, 1);
  const volume = clamp(finite(masterVolume, 80), 0, 100) / 100;
  const type = String(detail.targetType || "entity");
  const baseFrequency = type === "capital" ? 82 : type === "building" ? 94 : type === "founder" ? 118 : type === "squad" ? 145 : 126;
  const lethal = detail.lethal === true;

  return Object.freeze({
    targetOwner: String(detail.targetOwner || "unknown"),
    targetType: type,
    lethal,
    strength,
    volume,
    audible: volume > 0,
    frequency: Math.round(baseFrequency * (1 + strength * 0.18)),
    duration: Number((0.07 + strength * 0.06 + (lethal ? 0.07 : 0)).toFixed(3)),
    gain: Number(((0.025 + strength * 0.045) * volume).toFixed(4)),
    voiceCount: lethal ? 2 : 1
  });
}

function dispatchReceipt(win, profile, played, reason, contextState = "unavailable") {
  win.dispatchEvent(new CustomEvent(AUDIO_EVENT, {
    detail: Object.freeze({
      schema: "axm.rts.combat-impact-audio/v0.1",
      source: "axm:combat-damage-feedback",
      targetOwner: profile?.targetOwner || "unknown",
      targetType: profile?.targetType || "entity",
      lethal: Boolean(profile?.lethal),
      impactStrength: Number(profile?.strength || 0),
      masterVolume: Number(profile?.volume || 0),
      voiceCount: played ? Number(profile?.voiceCount || 0) : 0,
      contextState,
      played,
      reason,
      authority: Object.freeze({ gameplayMutation: false, combatAttribution: false, canon: false })
    })
  }));
}

function scheduleVoice(context, destination, frequency, gainValue, duration, type = "triangle") {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(36, frequency * 0.58), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.015);
}

export function installCombatImpactAudio(win = globalThis.window) {
  if (!win?.addEventListener || win.__axmCombatImpactAudioInstalled) return win?.__axmCombatImpactAudioInstalled || null;

  const AudioContextCtor = win.AudioContext || win.webkitAudioContext;
  const state = {
    context: null,
    armed: false,
    supported: Boolean(AudioContextCtor),
    scheduled: 0
  };

  async function armFromHumanInput() {
    if (!AudioContextCtor) return;
    if (!state.context) state.context = new AudioContextCtor({ latencyHint: "interactive" });
    try {
      if (state.context.state === "suspended") await state.context.resume();
      state.armed = state.context.state === "running";
    } catch {
      state.armed = false;
    }
  }

  win.addEventListener("pointerdown", armFromHumanInput, { capture: true, passive: true });
  win.addEventListener("keydown", armFromHumanInput, { capture: true, passive: true });

  win.addEventListener("axm:combat-damage-feedback", event => {
    const profile = summarizeImpactAudio(event.detail, readMasterVolume(win.localStorage));
    if (!profile) return;

    if (!profile.audible) {
      dispatchReceipt(win, profile, false, "muted-by-local-setting", state.context?.state || "not-created");
      return;
    }
    if (!state.supported) {
      dispatchReceipt(win, profile, false, "webaudio-unavailable", "unavailable");
      return;
    }
    if (!state.armed || state.context?.state !== "running") {
      dispatchReceipt(win, profile, false, "awaiting-human-audio-activation", state.context?.state || "not-created");
      return;
    }

    try {
      scheduleVoice(state.context, state.context.destination, profile.frequency, profile.gain, profile.duration, "triangle");
      if (profile.lethal) {
        scheduleVoice(state.context, state.context.destination, Math.max(42, Math.round(profile.frequency * 0.52)), profile.gain * 0.82, profile.duration * 1.12, "sine");
      }
      state.scheduled += profile.voiceCount;
      dispatchReceipt(win, profile, true, "observable-hit-scheduled", state.context.state);
    } catch {
      dispatchReceipt(win, profile, false, "webaudio-schedule-failed", state.context?.state || "unknown");
    }
  });

  win.__axmCombatImpactAudioInstalled = state;
  return state;
}

if (typeof window !== "undefined") installCombatImpactAudio(window);
