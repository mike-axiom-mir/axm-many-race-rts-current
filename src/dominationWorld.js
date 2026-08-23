export const DOMINATION_VERSION = 1;
export const DOMINATION_MAX_TEAM_SEATS = 4;
export const DOMINATION_TEAMS = ["azure", "crimson"];
export const REALTIME_CATCHUP_LIMIT_SECONDS = 43200;
export const RESERVE_PRODUCTION_STEP = 4;

export const TEAM_VISUALS = {
  azure: { name: "Azure Clan", color: "#67d6ff", dark: "#214f68", symbol: "◆" },
  crimson: { name: "Crimson Clan", color: "#ff7d86", dark: "#6b2832", symbol: "◆" },
  neutral: { name: "Neutral", color: "#d1c589", dark: "#625d44", symbol: "◇" }
};

const TERRITORY_ROWS = [
  ["frost-gate","Frost Gate",52,-144,["white-hollow","westmere"],"snow",3],
  ["white-hollow","White Hollow",31,-125,["frost-gate","westmere","founders-reach"],"snow",2],
  ["westmere","Westmere",13,-153,["frost-gate","white-hollow","green-crown","southwatch"],"grassland",3],
  ["founders-reach","Founder's Reach",23,-96,["white-hollow","green-crown","high-quarry"],"meadow",4],
  ["green-crown","Green Crown",1,-111,["westmere","founders-reach","southwatch","crossroads"],"forest-floor",3],
  ["southwatch","Southwatch",-19,-139,["westmere","green-crown","crossroads","sunken-road"],"dirt",2],
  ["high-quarry","High Quarry",35,-57,["founders-reach","crossroads","clockwork-basin"],"stone",3],
  ["crossroads","World Crossroads",3,-58,["green-crown","southwatch","high-quarry","clockwork-basin","red-steppe"],"road",5],
  ["sunken-road","Sunken Road",-31,-92,["southwatch","crossroads","red-steppe"],"sand",2],
  ["clockwork-basin","Clockwork Basin",26,-11,["high-quarry","crossroads","orchard-line","red-steppe"],"farm",4],
  ["red-steppe","Red Steppe",-10,-18,["crossroads","sunken-road","clockwork-basin","orchard-line","ember-coast"],"ash",3],
  ["orchard-line","Orchard Line",31,32,["clockwork-basin","red-steppe","eastwall"],"meadow",3],
  ["ember-coast","Ember Coast",-28,24,["red-steppe","eastwall","glass-desert"],"ash",2],
  ["eastwall","Eastwall",13,58,["orchard-line","ember-coast","glass-desert","far-crown"],"stone",4],
  ["glass-desert","Glass Desert",-24,74,["ember-coast","eastwall","far-crown"],"sand",2],
  ["far-crown","Far Crown",8,112,["eastwall","glass-desert","north-rim","south-rim"],"alien-purple",4],
  ["north-rim","North Rim",43,131,["far-crown","polar-vault"],"snow",3],
  ["south-rim","South Rim",-40,132,["far-crown","deep-harbor"],"alien-teal",3],
  ["polar-vault","Polar Vault",66,165,["north-rim","deep-harbor"],"ice",2],
  ["deep-harbor","Deep Harbor",-52,169,["south-rim","polar-vault"],"shallow-water",3]
];

function makeCities(territoryId, count) {
  const prefixes = ["North","Old","River","Crown","South"];
  return Array.from({ length: count }, (_, index) => ({
    id: `${territoryId}:city-${index + 1}`,
    name: `${prefixes[index] || `City ${index + 1}`} ${territoryId.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")}`,
    owner: "neutral",
    offset: { lat: [-5,4,-2,6,0][index] || 0, lon: (index % 2 ? 1 : -1) * (3 + index * 1.6) },
    productionMultiplier: 1 + index * .06,
    defenseValue: 1 + (count > 3 && index === count - 1 ? .35 : 0)
  }));
}

function resourceRate(index, terrain) {
  const rate = { food:.20, wood:.18, stone:.16, gold:.14 };
  if (["grassland","meadow","farm"].includes(terrain)) rate.food += .13;
  if (terrain === "forest-floor") rate.wood += .17;
  if (["stone","ash"].includes(terrain)) rate.stone += .15;
  if (["road","alien-purple","alien-teal"].includes(terrain)) rate.gold += .12;
  ["food","wood","stone","gold"].forEach((key, i) => { if (i === index % 4) rate[key] += .08; });
  return rate;
}

export const DOMINATION_TERRITORIES = TERRITORY_ROWS.map((row, index) => {
  const [id,name,lat,lon,neighbors,terrainSkin,cityCount] = row;
  return {
    id, name, geo:{lat,lon,elevation:0}, neighbors:[...neighbors], terrainSkin,
    mapRef: index === 7 ? { kind:"builtin", id:"founders-crossing", projection:"flat" } : null,
    battleMapPool: [],
    cities: makeCities(id, cityCount),
    resourceRate: resourceRate(index, terrainSkin),
    unitProductionSeconds: 58 - Math.min(18, cityCount * 4),
    garrisonLimit: 28 + cityCount * 6,
    strategicValue: 1 + cityCount * .25 + (neighbors.length >= 4 ? .45 : 0)
  };
});

export function territoryDefinition(id) {
  return DOMINATION_TERRITORIES.find(item => item.id === id) || null;
}

export function territoriesAreAdjacent(a, b) {
  return Boolean(territoryDefinition(a)?.neighbors.includes(b));
}
