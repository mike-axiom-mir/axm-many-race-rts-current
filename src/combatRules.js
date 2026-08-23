export const COMBAT_ROLES = {
  legacy: {
    id: "legacy",
    name: "Legacy",
    summary: "Preserved neutral combat profile for factions that predate the new role system.",
    defaultArmor: 0,
    defaultAttackInterval: 0.85,
    bonuses: {}
  },
  line: {
    id: "line",
    name: "Line",
    summary: "Durable frontline formation. Best at holding mobile formations in place.",
    defaultArmor: 0.08,
    defaultAttackInterval: 0.9,
    bonuses: { mobile: 1.22 }
  },
  ranged: {
    id: "ranged",
    name: "Ranged",
    summary: "Longer-reach formation. Best when protected from fast flankers.",
    defaultArmor: 0.02,
    defaultAttackInterval: 1.05,
    bonuses: { line: 1.20 }
  },
  mobile: {
    id: "mobile",
    name: "Mobile",
    summary: "Fast pressure formation. Best at closing on exposed ranged formations.",
    defaultArmor: 0.04,
    defaultAttackInterval: 0.78,
    bonuses: { ranged: 1.26 }
  },
  siege: {
    id: "siege",
    name: "Siege",
    summary: "Slow structure-breaking formation. Vulnerable if unsupported in open battle.",
    defaultArmor: 0.10,
    defaultAttackInterval: 1.22,
    bonuses: { structure: 1.85 },
    penalties: { line: 0.78, mobile: 0.72, ranged: 0.82 }
  }
};

export function combatRoleDefinition(role) {
  return COMBAT_ROLES[role] || COMBAT_ROLES.legacy;
}

export function combatClassFor(entity) {
  if (!entity?.userData) return "unknown";
  if (entity.userData.type === "building" || entity.userData.type === "capital" || entity.userData.type === "workshop") return "structure";
  return entity.userData.combatRole || "legacy";
}

export function combatMultiplier(attacker, target) {
  const attackerRole = combatRoleDefinition(attacker?.userData?.combatRole || "legacy");
  const targetClass = combatClassFor(target);
  if (attackerRole.bonuses?.[targetClass]) return attackerRole.bonuses[targetClass];
  if (attackerRole.penalties?.[targetClass]) return attackerRole.penalties[targetClass];
  return 1;
}

export function preferredTargetWeight(attacker, target) {
  const multiplier = combatMultiplier(attacker, target);
  if (multiplier > 1) return 1 / multiplier;
  if (multiplier < 1) return Math.min(1.35, 1 / Math.max(.55, multiplier));
  return 1;
}

export function resolvedCombatProfile(unitDef = {}) {
  const role = combatRoleDefinition(unitDef.combat?.role || unitDef.role || "legacy");
  return {
    role: role.id,
    armor: Math.max(0, Math.min(.65, Number(unitDef.combat?.armor ?? role.defaultArmor ?? 0))),
    attackInterval: Math.max(.35, Number(unitDef.combat?.attackInterval ?? role.defaultAttackInterval ?? .85)),
    description: role.summary
  };
}

export function roleCounterText(role) {
  const def = combatRoleDefinition(role);
  const strong = Object.keys(def.bonuses || {}).map(id => id === "structure" ? "Structures" : combatRoleDefinition(id).name);
  return strong.length ? `${def.name} • strong vs ${strong.join(", ")}` : def.name;
}
