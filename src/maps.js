export const MAPS = {
  foundersCrossing: {
    id: "founders-crossing",
    name: "Founder's Crossing",
    description: "A broad green crossing where three old strategic sites turn map control into economic momentum.",
    seed: 20260623,
    playerStart: [-30, 0, -17],
    enemyStart: [30, 0, 17],
    strategicSites: [
      {
        id: "crossing",
        name: "Founder Stone",
        kind: "monument",
        position: [0, 0, 0],
        radius: 7,
        captureRate: 23,
        bonus: { gold: 1.35 },
        description: "The central crossing. Holding it feeds trade and prestige into the treasury."
      },
      {
        id: "timber-crown",
        name: "Timber Crown",
        kind: "forest",
        position: [-9, 0, 13],
        radius: 6.5,
        captureRate: 25,
        bonus: { wood: 1.15 },
        description: "An old managed grove with prepared timber lanes."
      },
      {
        id: "old-quarry",
        name: "Old Quarry",
        kind: "quarry",
        position: [11, 0, -12],
        radius: 6.5,
        captureRate: 25,
        bonus: { stone: 0.95 },
        description: "Abandoned cuts and stockpiles make stone extraction far easier."
      }
    ]
  }
};

export const DEFAULT_MAP = MAPS.foundersCrossing;
