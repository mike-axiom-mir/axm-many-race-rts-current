export const DEFENSE_ROSTER_EXPANSION = {
  ironvale: {
    units: [
      {
        id: "vale-outriders", name: "Vale Outriders", unlockAge: 1, requiresBuilding: "ironvale-drillhall",
        cost: { food: 74, wood: 24, gold: 46 }, hp: 92, damage: 15, speed: 4.25, range: 1.35, squadSize: 4,
        combat: { role: "mobile", armor: .07, attackInterval: .80 }, visual: "armored-mount",
        description: "Mobile • armored response formation for intercepting exposed ranged armies without copying Ashwind's extreme speed."
      },
      {
        id: "pavise-bolters", name: "Pavise Bolters", unlockAge: 2, requiresBuilding: "ironvale-drillhall",
        cost: { food: 72, wood: 46, gold: 60 }, hp: 92, damage: 17, speed: 2.75, range: 2.15, squadSize: 4,
        combat: { role: "ranged", armor: .10, attackInterval: 1.08 }, visual: "pavise",
        description: "Ranged • slower protected missile line with less reach than Ridgebows but much better staying power."
      }
    ],
    buildings: [
      {
        id: "ironvale-bolt-bastion", name: "Bolt Bastion", role: "defense", unlockAge: 2,
        cost: { wood: 125, stone: 130, gold: 65 }, hp: 720, armor: .14,
        defense: 32, defenseRange: 14.2, fireInterval: 1.55, projectileSpeed: 18, visionRadius: 15.5, visual: "signal",
        description: "Slow heavy defensive tower. Expensive bolts punish committed pushes, but its cadence leaves windows between shots."
      },
      {
        id: "ironvale-wall", name: "Compact Wall", role: "wall", unlockAge: 1,
        cost: { wood: 35, stone: 45 }, hp: 390, armor: .10,
        fortification: { kind: "wall", width: 5.4, depth: .85, passFriendly: false },
        description: "Moderate wall segment. Delays armies and shapes approaches, but concentrated formations and Siege break it efficiently."
      },
      {
        id: "ironvale-gate", name: "Warden Gate", role: "gate", unlockAge: 1,
        cost: { wood: 52, stone: 48 }, hp: 315, armor: .07,
        fortification: { kind: "gate", width: 5.8, depth: 1.0, passFriendly: true },
        description: "Friendly-passable gate with lower durability than a wall segment."
      }
    ]
  },

  greenwake: {
    units: [
      {
        id: "marsh-javelineers", name: "Marsh Javelineers", unlockAge: 1, requiresBuilding: "greenwake-muster",
        cost: { food: 66, wood: 24, gold: 36 }, hp: 78, damage: 14, speed: 4.20, range: 1.80, squadSize: 5,
        combat: { role: "mobile", armor: .02, attackInterval: .80 }, visual: "javelin",
        description: "Mobile • light river skirmishers that respond quickly and pressure exposed ranged formations from a little distance."
      },
      {
        id: "rootbreakers", name: "Rootbreaker Crew", unlockAge: 2, requiresBuilding: "greenwake-muster",
        cost: { food: 84, wood: 62, gold: 42 }, hp: 126, damage: 18, speed: 2.45, range: 1.10, squadSize: 3,
        combat: { role: "siege", armor: .08, attackInterval: 1.22 }, visual: "rootram",
        description: "Siege • heavy timber-and-root crew that gives Greenwake a deliberate answer to walls and defensive structures."
      }
    ],
    buildings: [
      {
        id: "greenwake-briar-nest", name: "Briar Nest", role: "defense", unlockAge: 2,
        cost: { wood: 128, stone: 82, gold: 40 }, hp: 540, armor: .06,
        defense: 14, defenseRange: 12.6, fireInterval: .62, projectileSpeed: 16, visionRadius: 14,
        support: { kind: "heal", radius: 6.5, amount: .45 }, visual: "grove",
        description: "Fast-firing living defense whose nearby recovery helps a position survive attrition rather than burst damage."
      },
      {
        id: "greenwake-wall", name: "Woven Palisade", role: "wall", unlockAge: 1,
        cost: { wood: 48, stone: 24 }, hp: 310, armor: .05,
        fortification: { kind: "wall", width: 5.4, depth: .82, passFriendly: false },
        description: "Cheap timber wall. Easy to replace and easy for dedicated Siege to tear down."
      },
      {
        id: "greenwake-gate", name: "Grove Gate", role: "gate", unlockAge: 1,
        cost: { wood: 62, stone: 25 }, hp: 260, armor: .03,
        fortification: { kind: "gate", width: 5.8, depth: 1.0, passFriendly: true },
        description: "Light friendly-passable gate for Greenwake perimeter routes."
      }
    ]
  },

  ashwind: {
    units: [
      {
        id: "ember-slingers", name: "Ember Slingers", unlockAge: 1, requiresBuilding: "ashwind-yard",
        cost: { food: 62, wood: 28, gold: 42 }, hp: 64, damage: 13, speed: 3.85, range: 2.00, squadSize: 5,
        combat: { role: "ranged", armor: .01, attackInterval: .72 }, visual: "ember-sling",
        description: "Ranged • quick-firing harassment formation with less reach and durability than Dune Arbalests."
      },
      {
        id: "wind-rams", name: "Wind Ram Crew", unlockAge: 2, requiresBuilding: "ashwind-yard",
        cost: { food: 80, wood: 58, gold: 52 }, hp: 106, damage: 20, speed: 3.05, range: 1.10, squadSize: 3,
        combat: { role: "siege", armor: .04, attackInterval: 1.12 }, visual: "windram",
        description: "Siege • unusually quick structure breaker that reaches a wall faster but survives less punishment once committed."
      }
    ],
    buildings: [
      {
        id: "ashwind-flare-battery", name: "Flare Battery", role: "defense", unlockAge: 2,
        cost: { wood: 120, stone: 66, gold: 72 }, hp: 430, armor: .02,
        defense: 26, defenseRange: 18.0, fireInterval: 1.48, projectileSpeed: 21, visionRadius: 20.5, visual: "beacon",
        description: "Extreme-range frontier battery with exceptional sight. Very fragile if the enemy actually reaches it."
      },
      {
        id: "ashwind-wall", name: "Frontier Barricade", role: "wall", unlockAge: 1,
        cost: { wood: 46, stone: 20 }, hp: 270, armor: .03,
        fortification: { kind: "wall", width: 5.4, depth: .78, passFriendly: false },
        description: "Fast cheap barricade for channeling pressure. It is intentionally the easiest faction wall to destroy."
      },
      {
        id: "ashwind-gate", name: "March Gate", role: "gate", unlockAge: 1,
        cost: { wood: 58, stone: 20 }, hp: 225, armor: .02,
        fortification: { kind: "gate", width: 5.8, depth: .95, passFriendly: true },
        description: "Light gate that keeps the League moving but will not hold a committed assault for long."
      }
    ]
  },

  prismkin: {
    units: [
      {
        id: "prism-lancers", name: "Prism Lancers", unlockAge: 1, requiresBuilding: "prism-loom",
        cost: { food: 72, wood: 20, gold: 52 }, hp: 88, damage: 16, speed: 4.05, range: 1.50, squadSize: 4,
        combat: { role: "mobile", armor: .06, attackInterval: .82 }, visual: "prism-lance",
        description: "Mobile • tougher resonant lancer that trades some Shard Runner speed for a steadier committed flank."
      },
      {
        id: "fracture-array", name: "Fracture Array", unlockAge: 2, requiresBuilding: "prism-loom",
        cost: { food: 78, stone: 34, gold: 66 }, hp: 108, damage: 19, speed: 2.40, range: 1.65, squadSize: 3,
        combat: { role: "siege", armor: .08, attackInterval: 1.34 }, visual: "fracture",
        description: "Siege • slow crystal array that focuses resonance into structures and becomes especially threatening during Focus."
      }
    ],
    buildings: [
      {
        id: "prism-mirror-battery", name: "Mirror Battery", role: "defense", unlockAge: 2,
        cost: { wood: 118, stone: 104, gold: 58 }, hp: 600, armor: .09,
        defense: 21, defenseRange: 14.6, fireInterval: .86, projectileSpeed: 18, visionRadius: 16,
        support: { kind: "damage", radius: 6.0, amount: .02 }, visual: "orbit",
        description: "Stable resonant defense with a tiny nearby damage chorus. Strong placement matters more than raw tower damage."
      },
      {
        id: "prism-wall", name: "Facet Wall", role: "wall", unlockAge: 1,
        cost: { wood: 32, stone: 42, gold: 10 }, hp: 330, armor: .07,
        fortification: { kind: "wall", width: 5.4, depth: .82, passFriendly: false },
        description: "Crystalline wall segment with moderate protection and no offensive function."
      },
      {
        id: "prism-gate", name: "Resonant Gate", role: "gate", unlockAge: 1,
        cost: { wood: 40, stone: 45, gold: 14 }, hp: 275, armor: .05,
        fortification: { kind: "gate", width: 5.8, depth: .98, passFriendly: true },
        description: "Friendly-passable crystal gate. Lower HP than the matching wall keeps openings meaningful."
      }
    ]
  }
};

export function applyDefenseRosterExpansion(factions) {
  for (const [factionId, expansion] of Object.entries(DEFENSE_ROSTER_EXPANSION)) {
    const faction = factions[factionId];
    if (!faction) continue;
    const unitIds = new Set((faction.units || []).map(item => item.id));
    const buildingIds = new Set((faction.buildings || []).map(item => item.id));
    faction.units = [
      ...(faction.units || []),
      ...(expansion.units || []).filter(item => !unitIds.has(item.id)).map(item => ({ ...item }))
    ];
    faction.buildings = [
      ...(faction.buildings || []),
      ...(expansion.buildings || []).filter(item => !buildingIds.has(item.id)).map(item => ({ ...item }))
    ];
  }
  return factions;
}
