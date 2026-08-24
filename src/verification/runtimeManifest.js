export const RUNTIME_VERIFICATION_TARGETS = Object.freeze([
  { id: "skirmish", label: "Skirmish", href: "index.html", kind: "runtime", critical: true },
  { id: "defend", label: "Defend", href: "defend.html", kind: "runtime", critical: true },
  { id: "globe", label: "Globe Conquest", href: "globe.html", kind: "runtime", critical: true },
  { id: "domination-battle", label: "Domination Battle", href: "domination-battle.html", kind: "runtime", critical: true },
  { id: "builder", label: "World Builder", href: "builder.html", kind: "authoring", critical: true },
  { id: "scenario", label: "Scenario Studio", href: "scenario.html", kind: "authoring", critical: true },
  { id: "battle-editor", label: "Battle Editor", href: "battle-editor.html", kind: "authoring", critical: false },
  { id: "atlas", label: "Atlas", href: "atlas.html", kind: "content", critical: false },
  { id: "battlemaps", label: "Battle Maps", href: "battlemaps.html", kind: "content", critical: false }
]);

export function verificationSummary(results = []) {
  const passed = results.filter(result => result.status === "pass").length;
  const failed = results.filter(result => result.status === "fail").length;
  const criticalFailures = results.filter(result => result.status === "fail" && result.target?.critical).length;
  return { total: results.length, passed, failed, criticalFailures, ok: criticalFailures === 0 && failed === 0 };
}
