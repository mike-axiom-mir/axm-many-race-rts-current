export class SimulationClock {
  constructor({ tickRate = 20, maxCatchUpTicks = 5 } = {}) {
    this.tickRate = Math.max(1, Number(tickRate) || 20);
    this.tickDuration = 1 / this.tickRate;
    this.maxCatchUpTicks = Math.max(1, Number(maxCatchUpTicks) || 5);
    this.accumulator = 0;
    this.tick = 0;
    this.simulationTime = 0;
  }

  reset() {
    this.accumulator = 0;
    this.tick = 0;
    this.simulationTime = 0;
  }

  step(realDt, advance) {
    const dt = Math.max(0, Math.min(.25, Number(realDt) || 0));
    this.accumulator += dt;
    let executed = 0;

    while (this.accumulator + 1e-9 >= this.tickDuration && executed < this.maxCatchUpTicks) {
      this.accumulator -= this.tickDuration;
      this.tick += 1;
      this.simulationTime = this.tick * this.tickDuration;
      advance?.({
        tick: this.tick,
        dt: this.tickDuration,
        time: this.simulationTime
      });
      executed += 1;
    }

    if (executed === this.maxCatchUpTicks && this.accumulator > this.tickDuration * this.maxCatchUpTicks) {
      this.accumulator = this.tickDuration * this.maxCatchUpTicks;
    }

    return {
      executed,
      tick: this.tick,
      time: this.simulationTime,
      alpha: Math.min(1, this.accumulator / this.tickDuration)
    };
  }
}

export function createSimulationClock(options = {}) {
  return new SimulationClock(options);
}
