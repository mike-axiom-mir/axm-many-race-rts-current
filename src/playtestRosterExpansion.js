export const PLAYTEST_ROSTER_EXPANSIONS = {
  ironvale: {
    buildings: [
      {
        id: "ironvale-foundry",
        name: "Foundry Annex",
        role: "support",
        unlockAge: 1,
        cost: { wood: 135, stone: 85, gold: 55 },
        hp: 610,
        armor: .12,
        upgradeHub: true,
        visual: "forge",
        description: "Unlocks Compact upgrades and visibly works steel for the front."
      },
      {
        id: "ironvale-command-post",
        name: "Warden Command Post",
        role: "support",
        unlockAge: 2,
        cost: { wood: 165, stone: 115, gold: 75 },
        hp: 700,
        armor: .15,
        support: { kind: "armor", radius: 8.5, amount: .04 },
        visual: "signal",
        description: "Nearby formations gain a small armor bonus. A durable anchor for forward lines."
      }
    ],
    units: [
      {
        id: "standard-wardens",
        name: "Standard Wardens",
        unlockAge: 3,
        requiresBuilding: "ironvale-drillhall",
        cost: { food: 88, stone: 22, gold: 68 },
        hp: 118,
        damage: 11,
        speed: 2.9,
        range: 1.3,
        squadSize: 4,
        combat: { role: "line", armor: .15, attackInterval: .96 },
        support: { kind: "armor", radius: 6.8, amount: .035 },
        visual: "banner",
        description: "Slow elite line formation whose standard hardens nearby allied formations."
      }
    ]
  },

  greenwake: {
    buildings: [
      {
        id: "greenwake-rest-grove",
        name: "Rest Grove",
        role: "support",
        unlockAge: 1,
        cost: { wood: 120, stone: 42, gold: 42 },
        hp: 525,
        armor: .05,
        upgradeHub: true,
        support: { kind: "heal", radius: 8.5, amount: 1.15 },
        visual: "grove",
        description: "Unlocks Union upgrades and slowly restores nearby formations."
      },
      {
        id: "greenwake-river-mill",
        name: "River Mill",
        role: "economy",
        unlockAge: 2,
        cost: { wood: 160, stone: 52 },
        hp: 500,
        armor: .04,
        income: { food: .82, wood: .46 },
        visual: "waterwheel",
        description: "Late economy district with strong renewable food and wood output."
      }
    ],
    units: [
      {
        id: "grove-tenders",
        name: "Grove Tenders",
        unlockAge: 3,
        requiresBuilding: "greenwake-muster",
        cost: { food: 82, wood: 38, gold: 62 },
        hp: 78,
        damage: 10,
        speed: 3.05,
        range: 2.15,
        squadSize: 3,
        combat: { role: "ranged", armor: .03, attackInterval: 1.08 },
        support: { kind: "heal", radius: 6.5, amount: 1.25 },
        visual: "lantern",
        description: "Low-damage ranged support formation that heals nearby allied formations."
      }
    ]
  },

  ashwind: {
    buildings: [
      {
        id: "ashwind-forward-camp",
        name: "Forward Camp",
        role: "support",
        unlockAge: 1,
        cost: { wood: 112, gold: 58 },
        hp: 420,
        armor: .02,
        upgradeHub: true,
        support: { kind: "speed", radius: 9, amount: .05 },
        reinforcementPoint: true,
        visual: "camp",
        description: "Unlocks League upgrades, speeds nearby formations and acts as a forward muster point."
      },
      {
        id: "ashwind-ember-beacon",
        name: "Ember Beacon",
        role: "defense",
        unlockAge: 2,
        cost: { wood: 118, stone: 72, gold: 42 },
        hp: 500,
        armor: .03,
        defense: 22,
        defenseRange: 15.8,
        fireInterval: 1.28,
        projectileSpeed: 18,
        visual: "beacon",
        description: "Long-range forward tower with excellent reach and intentionally thin protection."
      }
    ],
    units: [
      {
        id: "trailblazers",
        name: "Trailblazer Pack",
        unlockAge: 3,
        requiresBuilding: "ashwind-yard",
        cost: { food: 86, wood: 34, gold: 66 },
        hp: 72,
        damage: 16,
        speed: 4.8,
        range: 1.3,
        squadSize: 4,
        combat: { role: "mobile", armor: .02, attackInterval: .72 },
        support: { kind: "speed", radius: 7.2, amount: .055 },
        visual: "streamers",
        description: "Fast veteran pack whose route markers pull nearby allies into a quicker march."
      }
    ]
  },

  prismkin: {
    buildings: [
      {
        id: "prism-harmonic-node",
        name: "Harmonic Node",
        role: "support",
        unlockAge: 1,
        cost: { wood: 122, stone: 58, gold: 64 },
        hp: 540,
        armor: .07,
        upgradeHub: true,
        support: { kind: "damage", radius: 8.2, amount: .04 },
        visual: "orbit",
        description: "Unlocks Chorus upgrades and adds a small damage resonance to nearby formations."
      },
      {
        id: "prism-vault",
        name: "Prismatic Vault",
        role: "economy",
        unlockAge: 2,
        cost: { wood: 138, stone: 92, gold: 45 },
        hp: 590,
        armor: .08,
        income: { stone: .38, gold: .55 },
        visual: "crystal",
        description: "Late material bank that converts stable resonance into stone and gold income."
      }
    ],
    units: [
      {
        id: "chorus-anchor",
        name: "Chorus Anchors",
        unlockAge: 3,
        requiresBuilding: "prism-loom",
        cost: { food: 84, stone: 28, gold: 72 },
        hp: 112,
        damage: 12,
        speed: 2.85,
        range: 1.4,
        squadSize: 3,
        combat: { role: "line", armor: .16, attackInterval: .94 },
        support: { kind: "damage", radius: 6.8, amount: .035 },
        visual: "orbit",
        description: "Slow resonant anchors that add a small damage chorus to nearby allied formations."
      }
    ]
  }
};

export function applyPlaytestRosterExpansion(factions) {
  for (const [factionId, expansion] of Object.entries(PLAYTEST_ROSTER_EXPANSIONS)) {
    const faction = factions[factionId];
    if (!faction) continue;
    const buildingIds = new Set((faction.buildings || []).map(item => item.id));
    const unitIds = new Set((faction.units || []).map(item => item.id));
    faction.buildings = [
      ...(faction.buildings || []),
      ...(expansion.buildings || []).filter(item => !buildingIds.has(item.id)).map(item => ({ ...item }))
    ];
    faction.units = [
      ...(faction.units || []),
      ...(expansion.units || []).filter(item => !unitIds.has(item.id)).map(item => ({ ...item }))
    ];
  }
  return factions;
}
