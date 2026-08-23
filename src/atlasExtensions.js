import { ATLAS_TYPES, registerAtlasEntries } from "./atlasRegistry.js";
import { DEFEND_ATLAS_ENTRIES, DEFEND_UPGRADES } from "./defendConfig.js";
import { SKIRMISH_UPGRADE_ATLAS_ENTRIES } from "./skirmishUpgradeAtlas.js";
import "./dominationAtlas.js";

if (!ATLAS_TYPES.some(type => type.id === "upgrade")) {
  const modeIndex = ATLAS_TYPES.findIndex(type => type.id === "mode");
  ATLAS_TYPES.splice(modeIndex < 0 ? ATLAS_TYPES.length : modeIndex, 0, { id: "upgrade", label: "Upgrades & research", icon: "⬆" });
}

registerAtlasEntries([
  ...DEFEND_ATLAS_ENTRIES.map(entry => ({ ...entry, source: "builtin-defend-workshop" })),
  ...DEFEND_UPGRADES.map(upgrade => ({
    id: `upgrade:defend-workshop:${upgrade.id}`,
    type: "upgrade",
    name: upgrade.name,
    icon: upgrade.icon,
    subtitle: "Defend the Workshop run upgrade",
    summary: upgrade.description,
    tags: ["defend-workshop", "wave-upgrade", upgrade.id],
    stats: Object.fromEntries(Object.entries(upgrade.effect || {}).map(([key, value]) => [key, value])),
    source: "builtin-defend-workshop"
  })),
  ...SKIRMISH_UPGRADE_ATLAS_ENTRIES
]);
