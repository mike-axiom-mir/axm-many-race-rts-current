export const PLAYTEST_SCOUTS = {
  ironvale: {
    id: "vale-surveyors",
    name: "Vale Surveyors",
    unlockAge: 0,
    requiresBuilding: "ironvale-drillhall",
    scout: true,
    vision: 18,
    squadSize: 3,
    cost: { food: 42, gold: 18 },
    hp: 52,
    damage: 5,
    speed: 4.15,
    range: 1.2,
    combat: { role: "mobile", armor: .02, attackInterval: .92 },
    visual: "survey",
    description: "Scout • cheap three-person recon formation with wide vision. Built to map ground, not win fights."
  },
  greenwake: {
    id: "reed-runners",
    name: "Reed Runners",
    unlockAge: 0,
    requiresBuilding: "greenwake-muster",
    scout: true,
    vision: 19,
    squadSize: 3,
    cost: { food: 44, wood: 12 },
    hp: 48,
    damage: 4,
    speed: 4.55,
    range: 1.2,
    combat: { role: "mobile", armor: .01, attackInterval: .88 },
    visual: "reeds",
    description: "Scout • light river-path recon formation with excellent sight and almost no desire for a fair fight."
  },
  ashwind: {
    id: "far-runners",
    name: "Far Runners",
    unlockAge: 0,
    requiresBuilding: "ashwind-yard",
    scout: true,
    vision: 20,
    squadSize: 2,
    cost: { food: 46, gold: 22 },
    hp: 44,
    damage: 5,
    speed: 5.35,
    range: 1.15,
    combat: { role: "mobile", armor: 0, attackInterval: .80 },
    visual: "windsock",
    description: "Scout • the fastest League formation; huge recon reach, tiny staying power."
  },
  prismkin: {
    id: "gleam-seekers",
    name: "Gleam Seekers",
    unlockAge: 0,
    requiresBuilding: "prism-loom",
    scout: true,
    vision: 19.5,
    squadSize: 3,
    cost: { food: 40, gold: 28 },
    hp: 46,
    damage: 6,
    speed: 4.75,
    range: 1.35,
    combat: { role: "mobile", armor: .01, attackInterval: .84 },
    visual: "sensor-orbit",
    description: "Scout • crystalline recon shards that read the battlefield through a broad resonance field."
  }
};

export function applyPlaytestScouts(factions) {
  for (const [factionId, scout] of Object.entries(PLAYTEST_SCOUTS)) {
    const faction = factions[factionId];
    if (!faction) continue;
    if ((faction.units || []).some(unit => unit.id === scout.id)) continue;
    faction.units = [...(faction.units || []), { ...scout }];
  }
  return factions;
}
