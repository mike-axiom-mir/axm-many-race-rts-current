function deco(id, asset, x, z, options = {}) {
  return {
    id,
    name: options.name || id,
    asset,
    position: [x, 0, z],
    scale: options.scale ?? 1,
    rotation: options.rotation ?? 0,
    tint: options.tint || "#ffffff",
    scatterCount: options.count ?? 1,
    scatterRadius: options.spread ?? 0,
    enabled: true,
    tags: options.tags || []
  };
}

function paint(id, skin, x, z, options = {}) {
  return {
    id,
    name: options.name || id,
    skin,
    position: [x, 0, z],
    shape: options.shape || "circle",
    radius: options.radius ?? 5,
    length: options.length ?? 16,
    width: options.width ?? 3.5,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? .62,
    tint: options.tint || "#ffffff",
    enabled: true,
    tags: options.tags || []
  };
}

function terrain(id, kind, x, z, radius, strength = 1) {
  return { id, name: id, kind, position: [x, 0, z], radius, strength, enabled: true, tags: ["visual-terrain"] };
}

const presets = {
  "founders-crossing": {
    environment: {
      terrainTint: "#78965f", skyTint: "#8eb4c4", fogTint: "#8eb4c4", fogDensity: .0105,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("founder-road-main", "road", 0, 0, { shape: "strip", length: 82, width: 4.4, rotation: -9, opacity: .72 }),
      paint("founder-road-cross", "road", 0, 0, { shape: "strip", length: 54, width: 3.6, rotation: 83, opacity: .62 }),
      paint("founder-meadow", "meadow", -10, 12, { radius: 10, opacity: .44 }),
      paint("founder-quarry-floor", "stone", 12, -12, { radius: 8, opacity: .58 })
    ],
    terrainStamps: [
      terrain("founder-west-rise", "hill", -24, 18, 12, .75),
      terrain("founder-east-rise", "hill", 25, -18, 12, .75),
      terrain("founder-quarry-cut", "crater", 12, -12, 8, .55)
    ],
    decorations: [
      deco("founder-grove", "tree-oak", -11, 14, { count: 14, spread: 8, scale: .95 }),
      deco("founder-quarry-rocks", "rock-large", 13, -13, { count: 8, spread: 7, scale: .8 }),
      deco("founder-stone-ruins", "ruin-pillar", 0, 1, { count: 4, spread: 4.5, scale: .9 }),
      deco("founder-stone-banner", "banner-neutral", 0, -2, { count: 3, spread: 3.4, scale: .9 }),
      deco("founder-market", "market-stall", -4, -3, { count: 3, spread: 3.5, scale: .85 })
    ]
  },

  "hermits-basin": {
    environment: {
      terrainTint: "#667a56", skyTint: "#78909b", fogTint: "#65757b", fogDensity: .015,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("basin-hearth-floor", "dirt", 0, 0, { radius: 12, opacity: .66 }),
      paint("basin-north-floor", "forest-floor", -16, -11, { radius: 9, opacity: .58 }),
      paint("basin-sun-cut", "stone", 17, -8, { radius: 8, opacity: .63 })
    ],
    terrainStamps: [
      terrain("basin-north-rim", "hill", 0, -27, 19, 1.45),
      terrain("basin-west-rim", "hill", -38, 0, 18, 1.25),
      terrain("basin-east-rim", "hill", 38, 0, 18, 1.25),
      terrain("basin-quarry", "crater", 17, -8, 8, .75)
    ],
    decorations: [
      deco("basin-pines-west", "tree-pine", -24, 3, { count: 18, spread: 12, scale: 1.05 }),
      deco("basin-pines-east", "tree-pine", 24, 4, { count: 17, spread: 11, scale: 1.0 }),
      deco("basin-deadwood", "tree-dead", 3, -18, { count: 7, spread: 9, scale: .9 }),
      deco("basin-hearth-fire", "campfire", 0, -2, { scale: 1.25 }),
      deco("basin-hearth-ruins", "ruin-wall", 0, 2, { count: 4, spread: 5, scale: .85 }),
      deco("basin-quarry-rocks", "rock-large", 17, -8, { count: 9, spread: 7, scale: .9 })
    ]
  },

  "twin-rivers": {
    environment: {
      terrainTint: "#76966a", skyTint: "#8ebbc7", fogTint: "#7fa7b1", fogDensity: .010,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("river-west", "shallow-water", -8, 0, { shape: "strip", length: 72, width: 5.1, rotation: -4, opacity: .76 }),
      paint("river-east", "shallow-water", 8, 0, { shape: "strip", length: 72, width: 5.1, rotation: 5, opacity: .76 }),
      paint("river-market-island", "dirt", 0, 0, { radius: 8.5, opacity: .7 }),
      paint("river-west-road", "road", -22, -8, { shape: "strip", length: 38, width: 3.2, rotation: -54, opacity: .56 }),
      paint("river-east-road", "road", 22, 8, { shape: "strip", length: 38, width: 3.2, rotation: -54, opacity: .56 })
    ],
    terrainStamps: [
      terrain("river-west-channel", "water", -8, 0, 10, .45),
      terrain("river-east-channel", "water", 8, 0, 10, .45),
      terrain("river-market-rise", "hill", 0, 0, 8, .28)
    ],
    decorations: [
      deco("river-willows", "tree-oak", -13, 15, { count: 16, spread: 9, scale: .88, tint: "#5f8c55" }),
      deco("river-reeds-west", "reed-bed", -8, 5, { count: 16, spread: 15, scale: .95 }),
      deco("river-reeds-east", "reed-bed", 8, -5, { count: 16, spread: 15, scale: .95 }),
      deco("river-bridge-north", "bridge-marker", 0, 17, { scale: 1.5, rotation: 90 }),
      deco("river-bridge-south", "bridge-marker", 0, -17, { scale: 1.5, rotation: 90 }),
      deco("river-waterwheel", "waterwheel", -3, 4, { scale: 1.15, rotation: 12 }),
      deco("river-market-stalls", "market-stall", 0, -2, { count: 4, spread: 4.2, scale: .9 })
    ]
  },

  "shattered-crown": {
    environment: {
      terrainTint: "#7f806a", skyTint: "#9aa0a1", fogTint: "#858986", fogDensity: .012,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("crown-center-stone", "stone", 0, 0, { radius: 12, opacity: .72 }),
      paint("crown-north-road", "road", 0, 12, { shape: "strip", length: 38, width: 3.2, rotation: 0, opacity: .58 }),
      paint("crown-south-road", "road", 0, -12, { shape: "strip", length: 38, width: 3.2, rotation: 0, opacity: .58 }),
      paint("crown-west-road", "road", -18, 0, { shape: "strip", length: 42, width: 3.2, rotation: 90, opacity: .52 }),
      paint("crown-east-road", "road", 18, 0, { shape: "strip", length: 42, width: 3.2, rotation: 90, opacity: .52 })
    ],
    terrainStamps: [
      terrain("crown-center-crater", "crater", 0, 0, 10, .45),
      terrain("crown-north-ridge", "rough", 0, 22, 12, .8),
      terrain("crown-south-ridge", "rough", 0, -22, 12, .8)
    ],
    decorations: [
      deco("crown-broken-arches", "ruin-arch", 0, 0, { count: 6, spread: 9, scale: 1.05 }),
      deco("crown-broken-walls", "ruin-wall", 0, 0, { count: 10, spread: 12, scale: .8 }),
      deco("crown-dead-trees-n", "tree-dead", -8, 19, { count: 8, spread: 8, scale: .9 }),
      deco("crown-rocks-s", "rock-large", 8, -19, { count: 9, spread: 8, scale: .85 }),
      deco("crown-obelisk", "obelisk", 0, 0, { scale: 1.45, rotation: 45 }),
      deco("crown-fires", "campfire", -2, 4, { count: 3, spread: 5, scale: .9 })
    ]
  },

  "triarch-delta": {
    environment: {
      terrainTint: "#72906b", skyTint: "#87adb8", fogTint: "#7495a0", fogDensity: .012,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("delta-river-south", "shallow-water", 0, -14, { shape: "strip", length: 34, width: 5.2, rotation: 0, opacity: .72 }),
      paint("delta-river-nw", "shallow-water", -10, 7, { shape: "strip", length: 36, width: 4.7, rotation: 60, opacity: .72 }),
      paint("delta-river-ne", "shallow-water", 10, 7, { shape: "strip", length: 36, width: 4.7, rotation: -60, opacity: .72 }),
      paint("delta-heart", "meadow", 0, 1, { radius: 9, opacity: .48 })
    ],
    terrainStamps: [
      terrain("delta-heart-low", "water", 0, 1, 10, .28),
      terrain("delta-west-bank", "hill", -22, 8, 12, .45),
      terrain("delta-east-bank", "hill", 22, 8, 12, .45)
    ],
    decorations: [
      deco("delta-reeds", "reed-bed", 0, 0, { count: 28, spread: 20, scale: .9 }),
      deco("delta-west-grove", "tree-oak", -20, -4, { count: 13, spread: 8, scale: .9 }),
      deco("delta-east-grove", "tree-oak", 20, -4, { count: 13, spread: 8, scale: .9 }),
      deco("delta-bridges", "bridge-marker", 0, 7, { count: 3, spread: 11, scale: 1.15, rotation: 90 }),
      deco("delta-fisher-camps", "campfire", -6, -8, { count: 4, spread: 9, scale: .8 })
    ]
  },

  "four-winds-basin": {
    environment: {
      terrainTint: "#7c9860", skyTint: "#90b5c1", fogTint: "#85a6ad", fogDensity: .009,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("winds-road-ns", "road", 0, 0, { shape: "strip", length: 66, width: 3.6, rotation: 0, opacity: .58 }),
      paint("winds-road-ew", "road", 0, 0, { shape: "strip", length: 88, width: 3.6, rotation: 90, opacity: .58 }),
      paint("winds-eye", "stone", 0, 0, { radius: 8.5, opacity: .63 }),
      paint("winds-nw", "forest-floor", -18, 14, { radius: 8, opacity: .42 }),
      paint("winds-sw", "farm", -18, -14, { radius: 8, opacity: .48 })
    ],
    terrainStamps: [
      terrain("winds-nw-rise", "hill", -27, 18, 11, .55),
      terrain("winds-ne-rise", "hill", 27, 18, 11, .55),
      terrain("winds-sw-rise", "hill", -27, -18, 11, .55),
      terrain("winds-se-rise", "hill", 27, -18, 11, .55)
    ],
    decorations: [
      deco("winds-nw-trees", "tree-pine", -20, 15, { count: 11, spread: 7, scale: .95 }),
      deco("winds-ne-rocks", "rock-large", 20, 15, { count: 9, spread: 7, scale: .85 }),
      deco("winds-sw-mills", "windmill", -18, -14, { count: 2, spread: 5, scale: 1.05 }),
      deco("winds-se-market", "market-stall", 18, -14, { count: 5, spread: 5, scale: .85 }),
      deco("winds-center-banners", "banner-neutral", 0, 0, { count: 4, spread: 5.5, scale: .9 }),
      deco("winds-center-beacon", "watch-beacon", 0, 0, { scale: 1.25 })
    ]
  },

  "crown-crossroads": {
    environment: {
      terrainTint: "#7e8f69", skyTint: "#98acb8", fogTint: "#8799a0", fogDensity: .010,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("crossroad-ns", "road", 0, 0, { shape: "strip", length: 68, width: 5.0, rotation: 0, opacity: .72 }),
      paint("crossroad-ew", "road", 0, 0, { shape: "strip", length: 94, width: 5.0, rotation: 90, opacity: .72 }),
      paint("crossroad-center", "stone", 0, 0, { radius: 8, opacity: .65 }),
      paint("crossroad-west-orchard", "farm", -22, 15, { radius: 8, opacity: .44 }),
      paint("crossroad-east-orchard", "farm", 22, -15, { radius: 8, opacity: .44 })
    ],
    terrainStamps: [
      terrain("crossroad-north-shelf", "hill", 15, 18, 9, .48),
      terrain("crossroad-south-shelf", "hill", -15, -18, 9, .48)
    ],
    decorations: [
      deco("crossroad-center-arches", "ruin-arch", 0, 0, { count: 4, spread: 6, scale: .9 }),
      deco("crossroad-center-market", "market-stall", 0, 0, { count: 6, spread: 7, scale: .82 }),
      deco("crossroad-west-orchard", "tree-oak", -23, 15, { count: 12, spread: 7, scale: .82 }),
      deco("crossroad-east-orchard", "tree-oak", 23, -15, { count: 12, spread: 7, scale: .82 }),
      deco("crossroad-quarry-rocks", "rock-large", 15, 18, { count: 7, spread: 6, scale: .8 }),
      deco("crossroad-beacons", "watch-beacon", 0, 0, { count: 4, spread: 9, scale: .85 })
    ]
  },

  "fivefold-march": {
    environment: {
      terrainTint: "#8a8d63", skyTint: "#a4adab", fogTint: "#939997", fogDensity: .011,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("five-spoke-1", "road", 0, -13, { shape: "strip", length: 29, width: 3.0, rotation: 0, opacity: .58 }),
      paint("five-spoke-2", "road", 12, -4, { shape: "strip", length: 29, width: 3.0, rotation: -72, opacity: .58 }),
      paint("five-spoke-3", "road", 8, 10, { shape: "strip", length: 29, width: 3.0, rotation: -144, opacity: .58 }),
      paint("five-spoke-4", "road", -8, 10, { shape: "strip", length: 29, width: 3.0, rotation: 144, opacity: .58 }),
      paint("five-spoke-5", "road", -12, -4, { shape: "strip", length: 29, width: 3.0, rotation: 72, opacity: .58 }),
      paint("five-center", "stone", 0, 0, { radius: 8, opacity: .58 })
    ],
    terrainStamps: [
      terrain("five-west-rise", "rough", -23, 7, 9, .7),
      terrain("five-east-rise", "rough", 23, 7, 9, .7),
      terrain("five-south-rise", "hill", 0, -21, 9, .5)
    ],
    decorations: [
      deco("five-center-banners", "banner-neutral", 0, 0, { count: 5, spread: 6, scale: .88 }),
      deco("five-march-fires", "campfire", 0, 0, { count: 5, spread: 13, scale: .82 }),
      deco("five-west-ruins", "ruin-wall", -20, 8, { count: 7, spread: 6, scale: .8 }),
      deco("five-east-rocks", "rock-large", 20, 8, { count: 7, spread: 6, scale: .8 }),
      deco("five-north-grove", "tree-dead", 0, 19, { count: 8, spread: 7, scale: .9 })
    ]
  },

  "octagon-reach": {
    environment: {
      terrainTint: "#748e69", skyTint: "#819ba8", fogTint: "#71858d", fogDensity: .0085,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("reach-center", "stone", 0, 0, { radius: 10, opacity: .62 }),
      paint("reach-road-ns", "road", 0, 0, { shape: "strip", length: 66, width: 3.3, rotation: 0, opacity: .52 }),
      paint("reach-road-ew", "road", 0, 0, { shape: "strip", length: 92, width: 3.3, rotation: 90, opacity: .52 }),
      paint("reach-road-ne", "road", 0, 0, { shape: "strip", length: 76, width: 3.0, rotation: 45, opacity: .44 }),
      paint("reach-road-nw", "road", 0, 0, { shape: "strip", length: 76, width: 3.0, rotation: -45, opacity: .44 })
    ],
    terrainStamps: [
      terrain("reach-center-rise", "hill", 0, 0, 11, .42),
      terrain("reach-east-ridge", "rough", 29, 0, 10, .52),
      terrain("reach-west-ridge", "rough", -29, 0, 10, .52)
    ],
    decorations: [
      deco("reach-center-obelisks", "obelisk", 0, 0, { count: 8, spread: 8, scale: .82 }),
      deco("reach-center-banners", "banner-neutral", 0, 0, { count: 8, spread: 11, scale: .72 }),
      deco("reach-north-pines", "tree-pine", 0, 22, { count: 16, spread: 10, scale: .88 }),
      deco("reach-south-rocks", "rock-large", 0, -22, { count: 15, spread: 10, scale: .78 }),
      deco("reach-east-beacons", "watch-beacon", 28, 0, { count: 3, spread: 7, scale: .88 }),
      deco("reach-west-markets", "market-stall", -28, 0, { count: 5, spread: 7, scale: .78 })
    ]
  },

  "empire-ring": {
    environment: {
      terrainTint: "#737f65", skyTint: "#87929e", fogTint: "#777f87", fogDensity: .010,
      proceduralScenery: false, legacyRoads: false, legacyCenterpiece: false
    },
    surfacePaint: [
      paint("empire-center", "stone", 0, 0, { radius: 10.5, opacity: .72 }),
      paint("empire-ring-n", "road", 0, 17, { shape: "strip", length: 42, width: 3.7, rotation: 90, opacity: .58 }),
      paint("empire-ring-s", "road", 0, -17, { shape: "strip", length: 42, width: 3.7, rotation: 90, opacity: .58 }),
      paint("empire-ring-e", "road", 20, 0, { shape: "strip", length: 34, width: 3.7, rotation: 0, opacity: .58 }),
      paint("empire-ring-w", "road", -20, 0, { shape: "strip", length: 34, width: 3.7, rotation: 0, opacity: .58 }),
      paint("empire-mid-nw", "dirt", -18, 12, { radius: 6.5, opacity: .45 }),
      paint("empire-mid-se", "dirt", 18, -12, { radius: 6.5, opacity: .45 })
    ],
    terrainStamps: [
      terrain("empire-center-crown", "hill", 0, 0, 10, .58),
      terrain("empire-nw-rough", "rough", -24, 15, 9, .55),
      terrain("empire-se-rough", "rough", 24, -15, 9, .55)
    ],
    decorations: [
      deco("empire-center-crown", "ruin-arch", 0, 0, { count: 8, spread: 8.5, scale: .95 }),
      deco("empire-center-obelisk", "obelisk", 0, 0, { scale: 1.65 }),
      deco("empire-north-gates", "watch-beacon", 0, 18, { count: 3, spread: 7, scale: .95 }),
      deco("empire-south-gates", "watch-beacon", 0, -18, { count: 3, spread: 7, scale: .95 }),
      deco("empire-west-walls", "ruin-wall", -20, 0, { count: 7, spread: 8, scale: .8 }),
      deco("empire-east-walls", "ruin-wall", 20, 0, { count: 7, spread: 8, scale: .8 }),
      deco("empire-north-camps", "campfire", -18, 20, { count: 4, spread: 7, scale: .75 }),
      deco("empire-south-camps", "campfire", 18, -20, { count: 4, spread: 7, scale: .75 })
    ]
  }
};

export function applyMapVisualPresets(mapRegistry = {}) {
  for (const map of Object.values(mapRegistry)) {
    const preset = presets[map.id];
    if (!preset) continue;
    map.environment = { width: 100, depth: 72, ...(map.environment || {}), ...(preset.environment || {}) };
    map.surfacePaint = (preset.surfacePaint || []).map(item => ({ ...item }));
    map.terrainStamps = (preset.terrainStamps || []).map(item => ({ ...item }));
    map.decorations = (preset.decorations || []).map(item => ({ ...item }));
  }
  return mapRegistry;
}

export function mapVisualPresetFor(id) {
  return presets[id] || null;
}
