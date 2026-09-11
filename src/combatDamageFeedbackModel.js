function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function summarizeDamageFeedback(beforeHp, afterHp, maxHp) {
  const before = finite(beforeHp, 0);
  const after = finite(afterHp, before);
  if (before <= 0 || after >= before) return null;

  const loss = Math.max(0, before - Math.max(0, after));
  const ceiling = Math.max(1, before, finite(maxHp, before));
  const fraction = clamp01(loss / ceiling);

  return Object.freeze({
    loss,
    fraction,
    strength: clamp01(0.22 + fraction * 3.2),
    lethal: after <= 0
  });
}

export function damageFeedbackLifetime(summary) {
  if (!summary) return 0;
  // This is human-facing presentation time, not simulation authority. Keep the
  // response visible long enough to read at RTS scale without overlapping the
  // ordinary ~0.85s formation attack cadence.
  return summary.lethal ? 0.82 : 0.68;
}
