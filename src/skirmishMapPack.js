function site(id, name, kind, position, radius, captureRate, bonus, description) {
  return { id, name, kind, position, radius, captureRate, bonus, description };
}

function map(definition) {
  const starts = definition.playerStarts.map(point => [...point]);
  return {
    projection: "flat",
    minPlayers: definition.minPlayers ?? definition.recommendedPlayers,
    recommendedPlayers: definition.recommendedPlayers,
    maxPlayers: definition.maxPlayers ?? definition.recommendedPlayers,
    tags: [...(definition.tags || [])],
    ...definition,
    playerStarts: starts,
    playerStart: [...starts[0]],
    enemyStart: [...(starts[1] || starts[0])]
  };
}

export const SKIRMISH_MAP_PACK = {
  hermitsBasin: map({
    id: "hermits-basin",
    name: "Hermit's Basin",
    description: "A compact one-seat challenge bowl built for solo Battle Maps, survival variants and future single-civilization scenarios.",
    seed: 202608231,
    recommendedPlayers: 1,
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["solo", "compact", "challenge", "defense"],
    playerStarts: [[0, 0, 23]],
    strategicSites: [
      site("last-hearth", "Last Hearth", "monument", [0, 0, 0], 6.8, 24, { gold: 1.05 }, "The basin's old gathering place. A natural final objective or survival anchor."),
      site("north-grove", "North Grove", "forest", [-16, 0, -11], 5.6, 26, { wood: .88 }, "A small managed grove tucked against the basin wall."),
      site("sun-cut", "Sun Cut", "quarry", [17, 0, -8], 5.6, 26, { stone: .78 }, "An exposed stone cut that rewards leaving the safest ground.")
    ]
  }),

  twinRivers: map({
    id: "twin-rivers",
    name: "Twin Rivers",
    description: "A two-player lane map with two valuable side crossings and a dangerous central trade island.",
    seed: 202608232,
    recommendedPlayers: 2,
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["2-player", "lanes", "crossings", "balanced"],
    playerStarts: [[-36, 0, -18], [36, 0, 18]],
    strategicSites: [
      site("river-market", "River Market", "monument", [0, 0, 0], 7, 23, { gold: 1.22 }, "Central trade ground where both river roads meet."),
      site("willow-ford", "Willow Ford", "forest", [-6, 0, 17], 6, 25, { wood: .98 }, "A wooded northern crossing that supports sustained expansion."),
      site("stone-ford", "Stone Ford", "quarry", [7, 0, -17], 6, 25, { stone: .86 }, "A southern ford cut through exposed rock shelves."),
      site("fisher-bank", "Fisher Bank", "monument", [-21, 0, 2], 5.5, 27, { food: .82 }, "A safer food objective slightly closer to the western start.")
    ]
  }),

  shatteredCrown: map({
    id: "shattered-crown",
    name: "Shattered Crown",
    description: "A two-player map built around a broken ring of objectives: safe outer income, risky inner control and multiple attack approaches.",
    seed: 202608233,
    recommendedPlayers: 2,
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["2-player", "ring", "flanking", "territory"],
    playerStarts: [[-39, 0, 0], [39, 0, 0]],
    strategicSites: [
      site("broken-throne", "Broken Throne", "monument", [0, 0, 0], 7.2, 22, { gold: 1.30 }, "The shattered center of the old crown road."),
      site("north-gem", "North Gem", "forest", [0, 0, 20], 5.8, 25, { wood: .92 }, "Northern crown fragment surrounded by dense timber."),
      site("south-gem", "South Gem", "quarry", [0, 0, -20], 5.8, 25, { stone: .82 }, "Southern fragment cut into the old quarry shelf."),
      site("west-granary", "West Granary", "monument", [-22, 0, -13], 5.2, 27, { food: .75 }, "Safer western growth objective."),
      site("east-granary", "East Granary", "monument", [22, 0, 13], 5.2, 27, { food: .75 }, "Safer eastern growth objective.")
    ]
  }),

  triarchDelta: map({
    id: "triarch-delta",
    name: "Triarch Delta",
    description: "A three-player triangular battlefield where every expansion opens one flank and the central delta never belongs to anyone for long.",
    seed: 202608234,
    recommendedPlayers: 3,
    minPlayers: 3,
    maxPlayers: 3,
    tags: ["3-player", "triangle", "free-for-all", "central-control"],
    playerStarts: [[-34, 0, 19], [34, 0, 19], [0, 0, -27]],
    strategicSites: [
      site("delta-heart", "Delta Heart", "monument", [0, 0, 1], 7.5, 22, { gold: 1.15, food: .30 }, "The central floodplain and most exposed economic prize."),
      site("west-reed", "West Reedbank", "forest", [-18, 0, -6], 5.6, 26, { wood: .82 }, "A west-side resource anchor between two rivals."),
      site("east-reed", "East Reedbank", "forest", [18, 0, -6], 5.6, 26, { wood: .82 }, "An east-side resource anchor between two rivals."),
      site("north-cut", "North Stone Cut", "quarry", [0, 0, 19], 5.5, 27, { stone: .76 }, "The northern quarry sits equally exposed to the upper pair.")
    ]
  }),

  fourWindsBasin: map({
    id: "four-winds-basin",
    name: "Four Winds Basin",
    description: "A four-player corner map with a lucrative center and one secondary objective in every quadrant.",
    seed: 202608235,
    recommendedPlayers: 4,
    minPlayers: 2,
    maxPlayers: 4,
    tags: ["4-player", "corners", "teams", "free-for-all"],
    playerStarts: [[-36, 0, -23], [36, 0, 23], [-36, 0, 23], [36, 0, -23]],
    strategicSites: [
      site("wind-eye", "Eye of the Winds", "monument", [0, 0, 0], 7.8, 21, { gold: 1.38 }, "A high-value center designed to create four-way pressure."),
      site("northwest-grove", "Northwest Grove", "forest", [-17, 0, 14], 5.4, 26, { wood: .78 }, "Timber support for the northwest quadrant."),
      site("northeast-cut", "Northeast Cut", "quarry", [17, 0, 14], 5.4, 26, { stone: .70 }, "Stone support for the northeast quadrant."),
      site("southwest-fields", "Southwest Fields", "monument", [-17, 0, -14], 5.4, 26, { food: .72 }, "Food support for the southwest quadrant."),
      site("southeast-market", "Southeast Market", "monument", [17, 0, -14], 5.4, 26, { gold: .66 }, "Gold support for the southeast quadrant.")
    ]
  }),

  crownCrossroads: map({
    id: "crown-crossroads",
    name: "Crown Crossroads",
    description: "A four-player cross-shaped battlefield with long sightlines, side resources and a center that favors coordinated team timing.",
    seed: 202608236,
    recommendedPlayers: 4,
    minPlayers: 2,
    maxPlayers: 4,
    tags: ["4-player", "crossroads", "2v2", "open"],
    playerStarts: [[0, 0, -27], [0, 0, 27], [-40, 0, 0], [40, 0, 0]],
    strategicSites: [
      site("cross-crown", "Cross Crown", "monument", [0, 0, 0], 7.4, 22, { gold: 1.18 }, "The open crossing at the exact center of all four approaches."),
      site("west-orchard", "West Orchard", "forest", [-22, 0, 15], 5.3, 27, { food: .46, wood: .48 }, "Mixed economy objective on the west flank."),
      site("east-orchard", "East Orchard", "forest", [22, 0, -15], 5.3, 27, { food: .46, wood: .48 }, "Mixed economy objective on the east flank."),
      site("north-quarry", "North Quarry", "quarry", [15, 0, 18], 5.3, 27, { stone: .74 }, "Northern fortification resource."),
      site("south-quarry", "South Quarry", "quarry", [-15, 0, -18], 5.3, 27, { stone: .74 }, "Southern fortification resource.")
    ]
  }),

  fivefoldMarch: map({
    id: "fivefold-march",
    name: "Fivefold March",
    description: "An intentionally odd five-player pentagonal map where no seat has a perfect opposite and diplomacy or opportunism can reshape the whole match.",
    seed: 202608237,
    recommendedPlayers: 5,
    minPlayers: 3,
    maxPlayers: 5,
    tags: ["5-player", "pentagon", "asymmetric-pressure", "free-for-all"],
    playerStarts: [[0, 0, -28], [36, 0, -10], [22, 0, 24], [-22, 0, 24], [-36, 0, -10]],
    strategicSites: [
      site("fivefold-center", "Fivefold Center", "monument", [0, 0, 0], 7.8, 21, { gold: 1.25 }, "A deliberately dangerous shared center."),
      site("march-one", "First March", "forest", [0, 0, -14], 4.9, 28, { wood: .58 }, "Southern interior stepping stone."),
      site("march-two", "Second March", "quarry", [14, 0, -3], 4.9, 28, { stone: .56 }, "Southeastern interior stepping stone."),
      site("march-three", "Third March", "monument", [8, 0, 13], 4.9, 28, { food: .58 }, "Northeastern interior stepping stone."),
      site("march-four", "Fourth March", "forest", [-8, 0, 13], 4.9, 28, { wood: .58 }, "Northwestern interior stepping stone."),
      site("march-five", "Fifth March", "quarry", [-14, 0, -3], 4.9, 28, { stone: .56 }, "Southwestern interior stepping stone.")
    ]
  }),

  octagonReach: map({
    id: "octagon-reach",
    name: "Octagon Reach",
    description: "An eight-seat battlefield with a wide outer settlement ring, four mid-map resources and a single central prestige objective.",
    seed: 202608238,
    recommendedPlayers: 8,
    minPlayers: 4,
    maxPlayers: 8,
    tags: ["8-player", "octagon", "large-team", "free-for-all"],
    playerStarts: [[0,0,-28],[29,0,-22],[42,0,0],[29,0,22],[0,0,28],[-29,0,22],[-42,0,0],[-29,0,-22]],
    strategicSites: [
      site("reach-core", "Reach Core", "monument", [0,0,0], 8.2, 20, { gold: 1.55 }, "The central prize. Holding it paints a target on an entire team."),
      site("north-wood", "North Timber", "forest", [0,0,16], 5.3, 27, { wood: .78 }, "Northern inner-ring timber."),
      site("south-food", "South Commons", "monument", [0,0,-16], 5.3, 27, { food: .72 }, "Southern inner-ring food ground."),
      site("east-stone", "East Quarry", "quarry", [21,0,0], 5.3, 27, { stone: .70 }, "Eastern inner-ring stone."),
      site("west-gold", "West Exchange", "monument", [-21,0,0], 5.3, 27, { gold: .68 }, "Western inner-ring exchange."),
      site("northeast-cross", "Northeast Cross", "monument", [14,0,12], 4.7, 29, { food: .30, gold: .28 }, "Small mixed objective between two neighboring seats."),
      site("southwest-cross", "Southwest Cross", "monument", [-14,0,-12], 4.7, 29, { food: .30, gold: .28 }, "Small mixed objective between two neighboring seats.")
    ]
  }),

  empireRing: map({
    id: "empire-ring",
    name: "Empire Ring",
    description: "A second eight-seat map designed for 4v4 lanes: paired starts feed into a contested inner ring before the center becomes reachable.",
    seed: 202608239,
    recommendedPlayers: 8,
    minPlayers: 4,
    maxPlayers: 8,
    tags: ["8-player", "4v4", "ring", "lanes"],
    playerStarts: [[-39,0,-23],[-14,0,-27],[14,0,-27],[39,0,-23],[39,0,23],[14,0,27],[-14,0,27],[-39,0,23]],
    strategicSites: [
      site("imperial-seat", "Imperial Seat", "monument", [0,0,0], 8.6, 19, { gold: 1.65 }, "The center is intentionally difficult to hold before a team controls the ring."),
      site("ring-northwest", "Northwest Ring", "forest", [-18,0,12], 5.2, 27, { wood: .68 }, "Northwest inner-ring supply point."),
      site("ring-northeast", "Northeast Ring", "monument", [18,0,12], 5.2, 27, { food: .62 }, "Northeast inner-ring supply point."),
      site("ring-southeast", "Southeast Ring", "quarry", [18,0,-12], 5.2, 27, { stone: .62 }, "Southeast inner-ring supply point."),
      site("ring-southwest", "Southwest Ring", "monument", [-18,0,-12], 5.2, 27, { gold: .58 }, "Southwest inner-ring supply point."),
      site("ring-north", "North Gate", "monument", [0,0,18], 4.8, 29, { food: .34, wood: .30 }, "Northern team-route objective."),
      site("ring-south", "South Gate", "monument", [0,0,-18], 4.8, 29, { stone: .30, gold: .32 }, "Southern team-route objective.")
    ]
  })
};
