function hashSeed(value) {
  const text = String(value ?? "axm-rts");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mixSeed(seed, stream) {
  return hashSeed(`${String(seed ?? "axm-rts")}::${String(stream || "default")}`) || 0x6d2b79f5;
}

export class SeededRng {
  constructor(seed = "axm-rts", stream = "default") {
    this.reset(seed, stream);
  }

  reset(seed = this.seed, stream = this.stream) {
    this.seed = String(seed ?? "axm-rts");
    this.stream = String(stream || "default");
    this.state = mixSeed(this.seed, this.stream);
    this.calls = 0;
    return this;
  }

  next() {
    let t = this.state += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    this.state = t >>> 0;
    this.calls += 1;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min = 0, max = 1) {
    const a = Number(min) || 0;
    const b = Number(max) || 0;
    return a + (b - a) * this.next();
  }

  int(min = 0, maxExclusive = 1) {
    const a = Math.trunc(Number(min) || 0);
    const b = Math.max(a + 1, Math.trunc(Number(maxExclusive) || 1));
    return a + Math.floor(this.next() * (b - a));
  }

  chance(probability = .5) {
    return this.next() < Math.max(0, Math.min(1, Number(probability) || 0));
  }

  pick(values = []) {
    return values.length ? values[this.int(0, values.length)] : undefined;
  }

  fork(stream) {
    return new SeededRng(this.seed, `${this.stream}/${String(stream || "child")}`);
  }

  snapshot() {
    return { seed: this.seed, stream: this.stream, state: this.state >>> 0, calls: this.calls };
  }
}

export function createSeededRng(seed = "axm-rts", stream = "default") {
  return new SeededRng(seed, stream);
}
