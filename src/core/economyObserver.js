const RESOURCE_KEYS = ["food", "wood", "stone", "gold"];

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function resourceVector(state) {
  const resources = state?.seats?.player?.resources;
  if (!resources) return null;
  const vector = {};
  for (const key of RESOURCE_KEYS) {
    const value = finite(resources[key], null);
    if (value == null) return null;
    vector[key] = value;
  }
  return vector;
}

export class EconomyObserver {
  constructor({ maxSamples = 120 } = {}) {
    this.maxSamples = Math.max(2, Math.trunc(Number(maxSamples) || 120));
    this.reset();
  }

  reset() {
    this.previous = null;
    this.samples = [];
  }

  observe({ tick = 0, time = 0, state = null } = {}) {
    const resources = resourceVector(state);
    if (!resources) return null;
    const current = { tick: Math.max(0, Math.trunc(Number(tick) || 0)), time: Math.max(0, Number(time) || 0), resources };
    let observedRate = null;

    if (this.previous && current.time > this.previous.time) {
      const dt = current.time - this.previous.time;
      observedRate = Object.fromEntries(RESOURCE_KEYS.map(key => [key, (current.resources[key] - this.previous.resources[key]) / dt]));
    }

    const sample = {
      ...current,
      observedRate,
      workforce: finite(state?.seats?.player?.workforce, null),
      age: finite(state?.seats?.player?.age, null),
      allocation: state?.seats?.player?.allocation ? clone(state.seats.player.allocation) : null
    };
    this.previous = current;
    this.samples.push(sample);
    while (this.samples.length > this.maxSamples) this.samples.shift();
    return sample;
  }

  latest() {
    return this.samples.length ? clone(this.samples[this.samples.length - 1]) : null;
  }

  exportReceipt() {
    return {
      schema: "axm-rts-economy-observation/v1",
      authoritative: false,
      source: "public-runtime-readback",
      warning: "Observed rates are derived from public HUD stockpile changes. They are diagnostic evidence, not fixed-step economy authority.",
      sampleCount: this.samples.length,
      samples: clone(this.samples)
    };
  }
}

export function createEconomyObserver(options = {}) {
  return new EconomyObserver(options);
}
