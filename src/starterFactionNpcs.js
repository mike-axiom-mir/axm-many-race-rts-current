export const STARTER_FACTION_NPCS = {
  ironvale: {
    id: "npc-ironvale-linekeeper",
    factionId: "ironvale",
    name: "The Linekeeper",
    role: "Native starter strategist",
    summary: "Builds a stable economy, keeps formations supported by nearby infrastructure and advances only when a new line can be held.",
    economyBias: { food: 0.28, wood: 0.27, stone: 0.25, gold: 0.20 },
    strategicDoctrine: ["build-stable-line", "support-near-structures", "contest-center", "advance-in-steps"],
    preferredSites: ["stone", "central", "defensive"],
    aggression: 0.48,
    expansion: 0.52,
    defense: 0.74,
    risk: 0.30,
    battleMapHooks: ["hold-line", "learn-defense", "protect-districts", "measured-push"],
    voice: {
      tone: "steady, practical, instructional",
      opening: "Build somewhere worth defending, then make the enemy regret approaching it.",
      pressure: "Keep the line connected. Unsupported strength is wasted strength.",
      victory: "Good position. Good timing. Nothing complicated was required."
    }
  },

  greenwake: {
    id: "npc-greenwake-keeper",
    factionId: "greenwake",
    name: "The Grove Keeper",
    role: "Native starter strategist",
    summary: "Prioritizes renewable income, fights around productive territory and prefers preserving formations over replacing them.",
    economyBias: { food: 0.36, wood: 0.31, stone: 0.16, gold: 0.17 },
    strategicDoctrine: ["grow-economy", "fight-near-groves", "preserve-formations", "expand-after-surplus"],
    preferredSites: ["food", "wood", "safe"],
    aggression: 0.38,
    expansion: 0.64,
    defense: 0.62,
    risk: 0.24,
    battleMapHooks: ["sustain-defense", "protect-economy", "recover-and-return", "long-hold"],
    voice: {
      tone: "warm, patient, resource-aware",
      opening: "A formation that survives is cheaper than the one you have to replace.",
      pressure: "Bring them back through the groves. We can recover here.",
      victory: "The army held because the land kept supporting it."
    }
  },

  ashwind: {
    id: "npc-ashwind-rook",
    factionId: "ashwind",
    name: "The Forward Rook",
    role: "Native starter strategist",
    summary: "Uses speed to leave the homeland early, pressures distant objectives and tries to keep the enemy reacting instead of preparing.",
    economyBias: { food: 0.27, wood: 0.20, stone: 0.13, gold: 0.40 },
    strategicDoctrine: ["leave-home-early", "pressure-forward", "capture-open-route", "avoid-long-siege"],
    preferredSites: ["gold", "forward", "mobility"],
    aggression: 0.72,
    expansion: 0.70,
    defense: 0.28,
    risk: 0.60,
    battleMapHooks: ["forward-momentum", "race-objective", "deep-pressure", "mobile-assault"],
    voice: {
      tone: "energetic, direct, momentum-focused",
      opening: "Home is safe enough. The useful ground is over there.",
      pressure: "Keep moving forward. Make their decisions late.",
      victory: "That is what distance is for."
    }
  }
};
