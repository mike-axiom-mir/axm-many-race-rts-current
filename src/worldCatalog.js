export const DECORATION_CATALOG = [
  { id: "tree-oak", name: "Broadleaf Tree", category: "nature", shape: "tree", tint: "#4f7d45", scale: 1, collision: true },
  { id: "tree-pine", name: "Pine Tree", category: "nature", shape: "pine", tint: "#376746", scale: 1, collision: true },
  { id: "tree-dead", name: "Dead Tree", category: "nature", shape: "dead-tree", tint: "#715d48", scale: 1, collision: true },
  { id: "reed-bed", name: "Reed Bed", category: "nature", shape: "reeds", tint: "#79955f", scale: 1, collision: false },
  { id: "rock-small", name: "Small Rock", category: "nature", shape: "rock", tint: "#858985", scale: .7, collision: true },
  { id: "rock-large", name: "Large Boulder", category: "nature", shape: "rock", tint: "#737976", scale: 1.35, collision: true },
  { id: "flowers", name: "Flower Patch", category: "nature", shape: "flowers", tint: "#d99bc2", scale: 1, collision: false },
  { id: "ruin-pillar", name: "Ruined Pillar", category: "ruins", shape: "pillar", tint: "#a29a84", scale: 1, collision: true },
  { id: "ruin-arch", name: "Ruined Arch", category: "ruins", shape: "arch", tint: "#918a79", scale: 1, collision: true },
  { id: "ruin-wall", name: "Ruined Wall", category: "ruins", shape: "wall", tint: "#8d8778", scale: 1, collision: true },
  { id: "campfire", name: "Campfire", category: "settlement", shape: "campfire", tint: "#ffb65d", scale: 1, collision: false, animated: true },
  { id: "banner-neutral", name: "Neutral Banner", category: "settlement", shape: "banner", tint: "#d3c782", scale: 1, collision: false, animated: true },
  { id: "market-stall", name: "Market Stall", category: "settlement", shape: "stall", tint: "#b87355", scale: 1, collision: true },
  { id: "windmill", name: "Windmill", category: "settlement", shape: "windmill", tint: "#b88c63", scale: 1, collision: true, animated: true },
  { id: "waterwheel", name: "Waterwheel Hut", category: "settlement", shape: "waterwheel", tint: "#82684f", scale: 1, collision: true, animated: true },
  { id: "bridge-marker", name: "Bridge", category: "infrastructure", shape: "bridge", tint: "#8b765a", scale: 1, collision: true },
  { id: "watch-beacon", name: "Watch Beacon", category: "infrastructure", shape: "beacon", tint: "#8f8068", scale: 1, collision: true, animated: true },
  { id: "crystal-blue", name: "Blue Crystal", category: "fantasy", shape: "crystal", tint: "#68cfee", scale: 1, collision: true, animated: true },
  { id: "crystal-red", name: "Red Crystal", category: "fantasy", shape: "crystal", tint: "#e67478", scale: 1, collision: true, animated: true },
  { id: "obelisk", name: "Obelisk", category: "fantasy", shape: "obelisk", tint: "#756c8c", scale: 1, collision: true }
];

export const SURFACE_SKINS = [
  { id: "grassland", name: "Grassland", color: "#75985f", roughness: 1, movement: 1 },
  { id: "meadow", name: "Meadow", color: "#8eaa69", roughness: 1, movement: 1.03 },
  { id: "forest-floor", name: "Forest Floor", color: "#566f47", roughness: 1, movement: .90 },
  { id: "dirt", name: "Dirt", color: "#9b7e59", roughness: 1, movement: .98 },
  { id: "sand", name: "Sand", color: "#c6ad72", roughness: 1, movement: .88 },
  { id: "snow", name: "Snow", color: "#dce8e6", roughness: .92, movement: .84 },
  { id: "ice", name: "Ice", color: "#a9d5dc", roughness: .25, movement: .78 },
  { id: "stone", name: "Stone", color: "#858882", roughness: .9, movement: .95 },
  { id: "ash", name: "Ash", color: "#5e5b58", roughness: 1, movement: .88 },
  { id: "lava", name: "Lava", color: "#b64b2d", roughness: .45, movement: .35, hazardous: true },
  { id: "shallow-water", name: "Shallow Water", color: "#4f91a5", roughness: .35, movement: .55 },
  { id: "road", name: "Road", color: "#aa936e", roughness: 1, movement: 1.18 },
  { id: "farm", name: "Farmland", color: "#8f8552", roughness: 1, movement: .92 },
  { id: "alien-purple", name: "Alien Purple", color: "#75558d", roughness: .72, movement: .96 },
  { id: "alien-teal", name: "Alien Teal", color: "#4e8e84", roughness: .72, movement: 1 }
];

export const ZONE_PRESETS = [
  { id: "trigger", name: "Trigger Zone", tint: "#e6c86d", description: "Fires scenario rules when formations enter or leave." },
  { id: "no-build", name: "No-Build Zone", tint: "#dc7777", description: "Prevents construction inside the zone." },
  { id: "ambush", name: "Ambush Zone", tint: "#c883da", description: "Useful for hidden reinforcements or campaign events." },
  { id: "safe", name: "Safe Zone", tint: "#77d69c", description: "Author-defined protected or recovery area." },
  { id: "weather", name: "Weather Zone", tint: "#79b9dd", description: "Can change ambience or movement rules locally." },
  { id: "objective", name: "Objective Zone", tint: "#f0aa67", description: "Mission or campaign objective area." }
];

export const OWNER_OPTIONS = ["neutral", "player", "enemy", "world", "script"];

export function decorationById(id) {
  return DECORATION_CATALOG.find(item => item.id === id) || DECORATION_CATALOG[0];
}

export function skinById(id) {
  return SURFACE_SKINS.find(item => item.id === id) || SURFACE_SKINS[0];
}
