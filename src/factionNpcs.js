import { STARTER_FACTION_NPCS } from "./starterFactionNpcs.js";

export const FACTION_NPCS = {
  ...STARTER_FACTION_NPCS,

  northpole: {
    id: "npc-northpole-steward",
    factionId: "northpole",
    name: "The Winter Steward",
    role: "Native faction strategist",
    summary: "Patient preparation, defended supply lines, then a coordinated push around the founder.",
    economyBias: { food: 0.34, wood: 0.30, stone: 0.20, gold: 0.16 },
    strategicDoctrine: ["protect-founder", "fortify-key-site", "stockpile-before-push", "counterattack"],
    preferredSites: ["food", "wood", "defensive"],
    aggression: 0.46,
    expansion: 0.58,
    defense: 0.82,
    risk: 0.36,
    battleMapHooks: ["escort-founder", "hold-winter-store", "defend-caravan", "survive-siege"],
    voice: {
      tone: "calm, dry, prepared",
      opening: "Prepare the stores first. A winter won before battle is still a victory.",
      pressure: "Hold the line. Momentum belongs to whoever still has supplies.",
      victory: "Good. Nothing wasted, nothing hurried."
    }
  },
  suitcase: {
    id: "npc-suitcase-porter",
    factionId: "suitcase",
    name: "The Route Keeper",
    role: "Native faction strategist",
    summary: "Constant repositioning, opportunistic capture and rapid concentration where the opponent is weakest.",
    economyBias: { food: 0.23, wood: 0.24, stone: 0.14, gold: 0.39 },
    strategicDoctrine: ["reposition", "capture-open-site", "avoid-static-trade", "hit-and-relocate"],
    preferredSites: ["gold", "mobility", "forward"],
    aggression: 0.61,
    expansion: 0.84,
    defense: 0.32,
    risk: 0.64,
    battleMapHooks: ["moving-front", "evacuation", "race-for-sites", "mobile-defense"],
    voice: {
      tone: "practical, quick, route-focused",
      opening: "Nothing says home has to stay in one place.",
      pressure: "Pack it. Move it. Make them chase the wrong army.",
      victory: "Route secured. Next stop."
    }
  },
  fatfrotz: {
    id: "npc-fatfrotz-grand-marshal",
    factionId: "fatfrotz",
    name: "The Grand Musterer",
    role: "Native faction strategist",
    summary: "Builds mass, keeps formations mutually supporting and turns numerical pressure into map control.",
    economyBias: { food: 0.41, wood: 0.23, stone: 0.18, gold: 0.18 },
    strategicDoctrine: ["mass-formations", "push-wide-front", "replace-losses", "siege-capital"],
    preferredSites: ["food", "central", "production"],
    aggression: 0.78,
    expansion: 0.63,
    defense: 0.48,
    risk: 0.70,
    battleMapHooks: ["last-stand", "mass-assault", "breakthrough", "hold-the-feast"],
    voice: {
      tone: "booming, confident, slightly ridiculous",
      opening: "One formation is a suggestion. Four formations are policy.",
      pressure: "More! If the front is crowded, it is finally becoming useful.",
      victory: "Excellent. Somebody find a bigger table."
    }
  },
  clockworkOrchard: {
    id: "npc-clockwork-gardener",
    factionId: "clockworkOrchard",
    name: "The Orchard Tactician",
    role: "Native faction strategist",
    summary: "Fewer formations, stronger positions, careful resource timing and deliberate high-value engagements.",
    economyBias: { food: 0.18, wood: 0.31, stone: 0.18, gold: 0.33 },
    strategicDoctrine: ["hold-formation", "precision-engagement", "protect-investment", "selective-capture"],
    preferredSites: ["gold", "wood", "high-ground"],
    aggression: 0.44,
    expansion: 0.52,
    defense: 0.67,
    risk: 0.25,
    battleMapHooks: ["precision-defense", "limited-forces", "protect-workshop", "timed-strike"],
    voice: {
      tone: "precise, measured, quietly competitive",
      opening: "Do not confuse fewer pieces with fewer options.",
      pressure: "Stop moving. Set the formation. Let them enter the calculation.",
      victory: "The arrangement held. As intended."
    }
  }
};

export function factionNpcFor(factionId) {
  return FACTION_NPCS[factionId] || null;
}

export function listFactionNpcs() {
  return Object.values(FACTION_NPCS);
}

export function createFactionNpcRuntimeProfile(factionId, overrides = {}) {
  const base = factionNpcFor(factionId);
  if (!base) return null;
  return {
    ...base,
    ...overrides,
    economyBias: { ...base.economyBias, ...(overrides.economyBias || {}) },
    strategicDoctrine: overrides.strategicDoctrine || [...base.strategicDoctrine],
    preferredSites: overrides.preferredSites || [...base.preferredSites],
    battleMapHooks: overrides.battleMapHooks || [...base.battleMapHooks],
    voice: { ...base.voice, ...(overrides.voice || {}) }
  };
}
