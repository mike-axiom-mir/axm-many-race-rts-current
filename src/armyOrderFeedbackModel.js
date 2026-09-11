const DEFAULT_ARRIVAL_RADIUS = 2.2;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function summarizeArmyOrder(samples, arrivalRadius = DEFAULT_ARRIVAL_RADIUS) {
  const radius = Math.max(0, finite(arrivalRadius, DEFAULT_ARRIVAL_RADIUS));
  const formations = Array.isArray(samples) ? samples : [];
  const active = formations.filter(sample => sample?.active !== false);
  const arrived = active.filter(sample => finite(sample.distance, Infinity) <= radius).length;
  const enRoute = Math.max(0, active.length - arrived);
  const lost = Math.max(0, formations.length - active.length);

  if (!formations.length) {
    return { accepted: 0, active: 0, arrived: 0, enRoute: 0, lost: 0, progress: 0, phase: "empty" };
  }

  if (!active.length) {
    return { accepted: formations.length, active: 0, arrived: 0, enRoute: 0, lost, progress: 0, phase: "lost" };
  }

  const progress = Math.round(active.reduce((sum, sample) => {
    const distance = Math.max(0, finite(sample.distance, 0));
    const startDistance = Math.max(radius, finite(sample.startDistance, radius));
    if (distance <= radius) return sum + 1;
    return sum + Math.max(0, Math.min(1, 1 - distance / startDistance));
  }, 0) / active.length * 100);

  return {
    accepted: formations.length,
    active: active.length,
    arrived,
    enRoute,
    lost,
    progress,
    phase: enRoute ? "advancing" : "holding"
  };
}

export function armyOrderDetail(summary) {
  if (!summary || summary.phase === "empty") return "No available formations accepted this order.";
  if (summary.phase === "lost") return `All ${summary.accepted} assigned formation${summary.accepted === 1 ? "" : "s"} have been lost.`;

  const parts = [];
  if (summary.enRoute) parts.push(`${summary.enRoute} en route or engaged`);
  if (summary.arrived) parts.push(`${summary.arrived} holding at destination`);
  if (summary.lost) parts.push(`${summary.lost} lost`);
  return `${parts.join(" • ")}.`;
}
