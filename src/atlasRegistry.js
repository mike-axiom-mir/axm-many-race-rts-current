import { FACTIONS } from "./factions.js";
import { FACTION_NPCS } from "./factionNpcs.js";
import { DECORATION_CATALOG, SURFACE_SKINS, ZONE_PRESETS } from "./worldCatalog.js";
import { MAPS } from "./maps.js";
import { BATTLE_MAPS } from "./battleMaps.js";
import { BUILTIN_FACTION_PACKS, BUILTIN_UNIT_PACKS } from "./contentPacks.js";

const CUSTOM_KEY = "axm.manyRaceRts.atlas.custom.v1";

export const ATLAS_TYPES = [
  ["faction", "Factions", "♜"],
  ["founder", "Founders", "♛"],
  ["faction-npc", "Faction NPCs", "◈"],
  ["unit", "Units", "⚔"],
  ["structure", "Structures", "▣"],
  ["resource", "Resources", "◆"],
  ["terrain", "Terrain & skins", "▦"],
  ["decoration", "World objects", "✦"],
  ["zone", "Rule zones", "◎"],
  ["map", "Maps", "◇"],
  ["battle-map", "Battle Maps", "⬢"],
  ["content-pack", "Content packs", "▤"],
  ["mode", "Game modes", "★"]
].map(([id, label, icon]) => ({ id, label, icon }));

const RESOURCES = [
  { id: "food", name: "Food", icon: "◆", summary: "Population, formation and growth resource. Macro allocation determines how much workforce feeds this stream." },
  { id: "wood", name: "Wood", icon: "♣", summary: "Construction, logistics and many mobile or ranged formation costs." },
  { id: "stone", name: "Stone", icon: "⬢", summary: "Fortification and durable-structure resource. Strong defensive play tends to pull this allocation upward." },
  { id: "gold", name: "Gold", icon: "●", summary: "Advanced military, progression and high-value strategic resource. Strategic sites can provide bonus income." },
  { id: "workshop-supply", name: "Workshop Supply", icon: "⌁", summary: "Shared survival-mode currency used in Defend the Workshop for towers, repairs and reinforcements. Passive gain is intentionally limited and grows after cleared waves." }
];

const MODES = [
  { id: "skirmish", name: "Skirmish", summary: "Free-form macro RTS play. Lobby seats can be Human, Connected AI, native Faction AI or Closed." },
  { id: "battle-maps", name: "Battle Maps", summary: "Premade battle challenges built on reusable maps, factions, unit packs, staged forces, modifiers and objectives." },
  { id: "globe-conquest", name: "Globe Conquest", summary: "True spherical RTS mode using great-circle movement, planetary territory and authored globe maps." },
  { id: "defend-workshop", name: "Defend the Workshop", summary: "1–4 allied-seat wave survival around a shared Workshop. Scarce passive supply, stronger defensive towers, escalating waves and between-wave upgrade choices." }
];

function costText(cost = {}) {
  return Object.entries(cost).map(([key, value]) => `${key} ${value}`).join(" • ") || "—";
}

function factionEntries() {
  const out = [];
  for (const faction of Object.values(FACTIONS)) {
    out.push({
      id: `faction:${faction.id}`, type: "faction", name: faction.name, icon: faction.symbol,
      subtitle: faction.tagline, summary: faction.special, factionId: faction.id,
      tags: ["faction", ...faction.traits],
      stats: {
        founder: faction.founder,
        "squad size": faction.military?.squadSize,
        "military cost": `${Math.round((faction.military?.cost || 1) * 100)}%`,
        "building health": `${Math.round((faction.building?.health || 1) * 100)}%`
      },
      sections: [
        { title: "Traits", body: faction.traits.join(" • ") },
        { title: "Economy", body: Object.entries(faction.economy || {}).map(([k,v]) => `${k} ×${v}`).join(" • ") },
        { title: "Identity rule", body: faction.special }
      ]
    });
    out.push({
      id: `founder:${faction.id}`, type: "founder", name: faction.founder, icon: "♛",
      subtitle: faction.founderTitle || `${faction.name} founder`, factionId: faction.id,
      summary: `Unique starting founder of the ${faction.name}. Founders are identity-bearing starting pieces rather than ordinary trainable heroes.`,
      tags: [faction.name, "founder", "starting-unit"], stats: { faction: faction.name }
    });
    for (const unit of faction.units || []) {
      out.push({
        id: `unit:${faction.id}:${unit.id}`, type: "unit", name: unit.name, icon: "⚔", factionId: faction.id,
        subtitle: faction.name, summary: unit.description || "Faction formation.",
        tags: [faction.name, unit.id, "formation"],
        stats: { hp: unit.hp, damage: unit.damage, speed: unit.speed, range: unit.range, cost: costText(unit.cost) }
      });
    }
    for (const building of faction.buildings || []) {
      out.push({
        id: `structure:${faction.id}:${building.id}`, type: "structure", name: building.name, icon: building.role === "defense" ? "▲" : "▣", factionId: faction.id,
        subtitle: `${faction.name} • ${building.role || "structure"}`, summary: building.description || "Faction structure.",
        tags: [faction.name, building.role || "structure", building.id],
        stats: { role: building.role, cost: costText(building.cost), defense: building.defense || "—", unlocks: building.unlocks || "—" }
      });
    }
  }
  return out;
}

function npcEntries() {
  return Object.values(FACTION_NPCS).map(npc => ({
    id: `npc:${npc.id}`, type: "faction-npc", name: npc.name, icon: "◈", factionId: npc.factionId,
    subtitle: npc.role, summary: npc.summary, tags: [...npc.strategicDoctrine, ...npc.battleMapHooks],
    stats: {
      aggression: Math.round(npc.aggression * 100), expansion: Math.round(npc.expansion * 100),
      defense: Math.round(npc.defense * 100), risk: Math.round(npc.risk * 100)
    },
    sections: [
      { title: "Doctrine", body: npc.strategicDoctrine.join(" • ") },
      { title: "Battle Map hooks", body: npc.battleMapHooks.join(" • ") },
      { title: "Voice", body: `${npc.voice.tone}. “${npc.voice.opening}”` }
    ]
  }));
}

function worldEntries() {
  const decorations = DECORATION_CATALOG.map(item => ({
    id: `decoration:${item.id}`, type: "decoration", name: item.name, icon: "✦",
    subtitle: item.category, summary: `${item.collision ? "Collidable" : "Non-blocking"}${item.animated ? ", animated" : ""} world object for authored maps and scenes.`,
    tags: [item.category, item.shape, item.collision ? "collision" : "decorative"],
    stats: { shape: item.shape, scale: item.scale, collision: item.collision ? "yes" : "no", animated: item.animated ? "yes" : "no" }
  }));
  const terrain = SURFACE_SKINS.map(item => ({
    id: `terrain:${item.id}`, type: "terrain", name: item.name, icon: "▦", subtitle: "Surface skin",
    summary: `${item.hazardous ? "Hazardous terrain. " : ""}Movement modifier ×${item.movement}. Surface skins can be visual-only in editors or consumed as gameplay terrain by runtimes that support them.`,
    tags: [item.id, item.hazardous ? "hazard" : "surface"],
    stats: { movement: `×${item.movement}`, roughness: item.roughness, hazardous: item.hazardous ? "yes" : "no", color: item.color }
  }));
  const zones = ZONE_PRESETS.map(item => ({
    id: `zone:${item.id}`, type: "zone", name: item.name, icon: "◎", subtitle: "Scenario zone",
    summary: item.description, tags: [item.id, "scenario", "zone"], stats: { tint: item.tint }
  }));
  return [...decorations, ...terrain, ...zones];
}

function mapEntries() {
  return Object.values(MAPS).map(map => ({
    id: `map:${map.id}`, type: "map", name: map.name, icon: "◇", subtitle: "Flat battlefield",
    summary: map.description || "Authored RTS map.", tags: ["flat", "map", ...(map.strategicSites || []).map(site => site.kind)],
    stats: { seed: map.seed, "strategic sites": map.strategicSites?.length || 0 }
  }));
}

function battleEntries() {
  return Object.values(BATTLE_MAPS).map(battle => ({
    id: `battle-map:${battle.id}`, type: "battle-map", name: battle.name, icon: "⬢", subtitle: battle.subtitle || "Battle challenge",
    summary: battle.description, tags: [...(battle.tags || []), battle.difficulty || "normal"],
    stats: { difficulty: battle.difficulty, projection: battle.map?.projection, objectives: battle.objectives?.length || 0 },
    sections: [{ title: "Objectives", body: (battle.objectives || []).map(item => item.text).join(" • ") }]
  }));
}

function packEntries() {
  const packs = [...Object.values(BUILTIN_FACTION_PACKS), ...Object.values(BUILTIN_UNIT_PACKS)];
  return packs.map(pack => ({
    id: `pack:${pack.id}`, type: "content-pack", name: pack.name, icon: "▤", factionId: pack.factionId,
    subtitle: pack.kind, summary: pack.kind === "faction-pack" ? `Portable ${pack.name} faction definition for Battle Maps and future content exchange.` : `${pack.units?.length || 0} portable unit definitions.`,
    tags: [pack.kind, pack.factionId || "custom"], stats: { kind: pack.kind, units: pack.units?.length || 0 }
  }));
}

function staticEntries() {
  return [
    ...factionEntries(), ...npcEntries(), ...worldEntries(), ...mapEntries(), ...battleEntries(), ...packEntries(),
    ...RESOURCES.map(item => ({ ...item, id: `resource:${item.id}`, type: "resource", subtitle: "Game resource", tags: ["resource"] })),
    ...MODES.map(item => ({ ...item, id: `mode:${item.id}`, type: "mode", icon: "★", subtitle: "Game mode", tags: ["mode"] }))
  ];
}

export function normalizeAtlasEntry(entry = {}) {
  return {
    id: String(entry.id || `custom:${Date.now()}:${Math.random().toString(36).slice(2)}`),
    type: ATLAS_TYPES.some(type => type.id === entry.type) ? entry.type : "decoration",
    name: String(entry.name || "Unnamed Atlas entry"),
    icon: String(entry.icon || ATLAS_TYPES.find(type => type.id === entry.type)?.icon || "◇"),
    subtitle: String(entry.subtitle || "Custom content"),
    summary: String(entry.summary || "No description yet."),
    factionId: entry.factionId || null,
    tags: Array.isArray(entry.tags) ? [...new Set(entry.tags.map(String).filter(Boolean))] : [],
    stats: entry.stats && typeof entry.stats === "object" ? { ...entry.stats } : {},
    sections: Array.isArray(entry.sections) ? entry.sections.map(section => ({ title: String(section.title || "Details"), body: String(section.body || "") })) : [],
    source: entry.source || "custom"
  };
}

export function loadCustomAtlasEntries() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    return Array.isArray(entries) ? entries.map(normalizeAtlasEntry) : [];
  } catch {
    return [];
  }
}

export function registerAtlasEntries(entries = []) {
  const current = loadCustomAtlasEntries();
  const byId = new Map(current.map(entry => [entry.id, entry]));
  for (const entry of entries) {
    const normalized = normalizeAtlasEntry(entry);
    byId.set(normalized.id, normalized);
  }
  const next = [...byId.values()];
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("axm-atlas-updated", { detail: { count: next.length } }));
  return next;
}

export function registerUnitPackInAtlas(pack = {}) {
  const entries = (pack.units || []).map(unit => normalizeAtlasEntry({
    id: `custom-unit:${pack.id}:${unit.id}`, type: "unit", name: unit.name || unit.id, icon: "⚔",
    factionId: pack.factionId || null, subtitle: pack.name || "Imported unit pack",
    summary: unit.description || `Imported formation from ${pack.name || "custom unit pack"}.`,
    tags: ["imported", "unit-pack", pack.id, pack.factionId].filter(Boolean),
    stats: { hp: unit.hp, damage: unit.damage, speed: unit.speed, range: unit.range, cost: costText(unit.cost) }, source: pack.id
  }));
  entries.push(normalizeAtlasEntry({
    id: `custom-pack:${pack.id}`, type: "content-pack", name: pack.name || pack.id, icon: "▤", factionId: pack.factionId || null,
    subtitle: "Imported unit pack", summary: `${pack.units?.length || 0} imported unit definitions available to Battle Map authoring.`,
    tags: ["imported", "unit-pack"], stats: { units: pack.units?.length || 0 }, source: pack.id
  }));
  return registerAtlasEntries(entries);
}

export function getAtlasEntries() {
  const byId = new Map();
  for (const entry of staticEntries().map(normalizeAtlasEntry)) byId.set(entry.id, entry);
  for (const entry of loadCustomAtlasEntries()) byId.set(entry.id, entry);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function atlasType(id) {
  return ATLAS_TYPES.find(type => type.id === id) || ATLAS_TYPES[0];
}
