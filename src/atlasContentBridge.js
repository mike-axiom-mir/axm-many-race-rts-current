import { normalizeUnitPack, validateUnitPack } from "./contentPacks.js";
import { normalizeMapDefinition } from "./mapSchema.js";
import { normalizeBattleMap } from "./battleMapSchema.js";
import { registerAtlasEntries, registerUnitPackInAtlas } from "./atlasRegistry.js";

function registerMap(map) {
  registerAtlasEntries([{
    id: `custom-map:${map.id}`, type: "map", name: map.name, icon: map.projection === "globe" ? "◎" : "◇",
    subtitle: `Imported ${map.projection} map`, summary: map.description || "Custom map imported into Battle Map authoring.",
    tags: ["imported", map.projection, "map"], stats: { projection: map.projection, sites: map.strategicSites?.length || 0 }, source: map.id
  }]);
}

function registerBattle(battle) {
  registerAtlasEntries([{
    id: `custom-battle:${battle.id}`, type: "battle-map", name: battle.name, icon: "⬢", subtitle: battle.subtitle || "Imported Battle Map",
    summary: battle.description || "Custom premade battle challenge.", tags: ["imported", "battle-map", battle.difficulty].filter(Boolean),
    stats: { projection: battle.map?.projection, difficulty: battle.difficulty, objectives: battle.objectives?.length || 0 }, source: battle.id
  }]);
  for (const pack of battle.contentPacks?.unitPacks || []) registerUnitPackInAtlas(pack);
  if (battle.map?.embedded) registerMap(battle.map.embedded);
}

function bindFile(id, parser, register) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try { register(parser(JSON.parse(await file.text()))); } catch { /* Main editor owns visible import errors. */ }
  });
}

bindFile("packFile", value => {
  const pack = normalizeUnitPack(value);
  const result = validateUnitPack(pack);
  if (!result.valid) throw new Error(result.errors.join(" "));
  return pack;
}, registerUnitPackInAtlas);
bindFile("mapFile", normalizeMapDefinition, registerMap);
bindFile("battleFile", normalizeBattleMap, registerBattle);
