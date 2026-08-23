import { createBlankBattleMap, normalizeBattleMap } from "./battleMapSchema.js";

function makeBattle(overrides) {
  return normalizeBattleMap({ ...createBlankBattleMap(), ...overrides });
}

export const BATTLE_MAPS = {
  holdFounderStone: makeBattle({
    id: "hold-founder-stone",
    name: "Hold the Founder Stone",
    subtitle: "Territory pressure challenge",
    description: "The center of Founder's Crossing matters more than the enemy capital. Secure it, survive repeated pressure and keep your economy alive long enough to finish the hold.",
    tags: ["flat", "territory", "defense"],
    difficulty: "normal",
    scene: {
      timeOfDay: "late-afternoon",
      weather: "clear",
      ambience: "tense",
      introText: "The crossing is already contested. Whoever owns the Founder Stone controls the pace of the battle.",
      victoryText: "The crossing holds. The enemy cannot break the center.",
      defeatText: "The Founder Stone is lost and the defensive line collapses."
    },
    objectives: [
      { id: "capture-stone", type: "primary", text: "Capture Founder Stone.", complete: false, hidden: false },
      { id: "hold-stone", type: "primary", text: "Hold Founder Stone through the pressure phase.", complete: false, hidden: false },
      { id: "keep-founder", type: "secondary", text: "Keep your founder alive.", complete: false, hidden: false }
    ],
    modifiers: { buildMode: "normal", economyMode: "normal", ageLock: 2, fogMode: "normal", reinforcements: "waves" },
    campaignMeta: { collectionId: "founders-crossing-challenges", order: 1, nextBattleMapId: "moving-front", unlocks: [] }
  }),

  movingFront: makeBattle({
    id: "moving-front",
    name: "The Moving Front",
    subtitle: "Mobility challenge",
    description: "Static defense is intentionally inefficient. The winning side must keep relocating between resource and strategic zones while reacting to shifting pressure.",
    tags: ["flat", "mobility", "multi-objective"],
    difficulty: "hard",
    scene: {
      timeOfDay: "morning",
      weather: "wind",
      ambience: "mobile",
      introText: "No single position will stay valuable for long. Read the map, move early and do not become attached to yesterday's front.",
      victoryText: "The front never caught you. Every important route ends under your control.",
      defeatText: "The army becomes fixed in place and the routes close around it."
    },
    objectives: [
      { id: "take-two", type: "primary", text: "Control any two strategic sites at the same time.", complete: false, hidden: false },
      { id: "relocate", type: "primary", text: "Respond to the final route shift.", complete: false, hidden: false }
    ],
    modifiers: { buildMode: "limited", economyMode: "mobile", ageLock: 1, fogMode: "normal", reinforcements: "limited" },
    campaignMeta: { collectionId: "founders-crossing-challenges", order: 2, nextBattleMapId: null, unlocks: [] }
  }),

  fiveCrowns: makeBattle({
    id: "five-crowns",
    name: "Five Crowns",
    subtitle: "Planetary control challenge",
    description: "A globe battle where no single front exists. Formations must cross the planet, claim distant crowns and decide when a long march is worth the risk.",
    tags: ["globe", "planetary", "territory"],
    difficulty: "hard",
    map: { source: "builtin", mapId: "crownworld", projection: "globe", embedded: null },
    scene: {
      timeOfDay: "orbital-day",
      weather: "clear",
      ambience: "planetary",
      introText: "Five crowns. One world. Your closest objective is not always your most important one.",
      victoryText: "The planet has a new strategic center.",
      defeatText: "The crowns fall out of reach and the world closes around your capital."
    },
    objectives: [
      { id: "three-crowns", type: "primary", text: "Control three strategic crowns simultaneously.", complete: false, hidden: false },
      { id: "far-side", type: "secondary", text: "Capture at least one crown on the far side of the starting hemisphere.", complete: false, hidden: false }
    ],
    modifiers: { buildMode: "normal", economyMode: "normal", ageLock: null, fogMode: "planet", reinforcements: "normal" },
    campaignMeta: { collectionId: "crownworld-challenges", order: 1, nextBattleMapId: null, unlocks: [] }
  })
};

export function listBattleMaps() {
  return Object.values(BATTLE_MAPS).sort((a, b) => a.name.localeCompare(b.name));
}
