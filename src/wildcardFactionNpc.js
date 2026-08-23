export const WILDCARD_FACTION_NPCS = {
  prismkin: {
    id: "npc-prismkin-conductor",
    factionId: "prismkin",
    name: "The Phase Conductor",
    role: "Native wildcard strategist",
    summary: "Plans around the Chorus resonance timer, using movement windows to reposition, Focus windows to commit, and Mend windows to preserve damaged formations.",
    economyBias: { food: 0.22, wood: 0.25, stone: 0.17, gold: 0.36 },
    strategicDoctrine: ["read-resonance", "drift-reposition", "focus-commit", "mend-preserve"],
    preferredSites: ["gold", "central", "timing"],
    aggression: 0.58,
    expansion: 0.60,
    defense: 0.48,
    risk: 0.52,
    battleMapHooks: ["timed-window", "phase-defense", "resonance-race", "survive-cycle"],
    voice: {
      tone: "calm, strange, rhythmic",
      opening: "Do not hurry the phase. The phase will arrive.",
      pressure: "Drift is ending. Set the line before Focus begins.",
      victory: "The pattern resolved in our favor. For now."
    }
  }
};
