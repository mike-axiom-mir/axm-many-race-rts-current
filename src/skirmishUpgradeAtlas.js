import { CORE_UPGRADES, SIGNATURE_UPGRADES } from "./upgradeSystem.js";

export const SKIRMISH_UPGRADE_ATLAS_ENTRIES = [
  ...CORE_UPGRADES.flatMap(upgrade => Array.from({ length: upgrade.maxLevel }, (_, index) => ({
    id: `upgrade:skirmish:${upgrade.id}:${index + 1}`,
    type: "upgrade",
    name: `${upgrade.name} ${index + 1}`,
    icon: upgrade.id === "supply" ? "◆" : upgrade.id === "formations" ? "⚔" : "▣",
    subtitle: "Skirmish upgrade",
    summary: upgrade.descriptions[index],
    tags: ["skirmish", "upgrade", upgrade.id, `level-${index + 1}`],
    stats: { level: index + 1, "minimum age": (upgrade.ageByLevel[index] || 0) + 1 },
    source: "builtin-skirmish-upgrades"
  })),
  ...Object.entries(SIGNATURE_UPGRADES).map(([factionId, upgrade]) => ({
    id: `upgrade:skirmish:${upgrade.id}`,
    type: "upgrade",
    name: upgrade.name,
    icon: "✦",
    factionId,
    subtitle: "Faction signature upgrade",
    summary: upgrade.description,
    tags: ["skirmish", "upgrade", "signature", factionId],
    stats: { "minimum age": Number(upgrade.age || 0) + 1 },
    source: "builtin-skirmish-upgrades"
  }))
];
