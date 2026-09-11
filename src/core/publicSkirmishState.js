import { AGE_DATA, RESOURCE_KEYS } from "../factions.js";

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function firstNumber(value) {
  const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  return match ? finite(match[0], null) : null;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function ageIndexFromText(value) {
  const text = String(value || "").trim().toLowerCase();
  return AGE_DATA.findIndex(age => text.includes(String(age.name || "").toLowerCase()));
}

function readPlayerResources() {
  const result = Object.fromEntries(RESOURCE_KEYS.map(key => [key, null]));
  for (const row of document.querySelectorAll("#resources .resource")) {
    const label = String(row.querySelector("span")?.textContent || "").toLowerCase();
    const key = RESOURCE_KEYS.find(resource => label.includes(resource));
    if (!key) continue;
    result[key] = firstNumber(row.querySelector("strong")?.textContent);
  }
  return result;
}

function readAllocation() {
  const values = {};
  for (const row of document.querySelectorAll("#allocation .allocation-row")) {
    const label = String(row.querySelector("label")?.textContent || "").toLowerCase();
    const key = RESOURCE_KEYS.find(resource => label.includes(resource));
    if (!key) continue;
    values[key] = Math.max(0, finite(row.querySelector("input")?.value, 0));
  }
  const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1;
  return {
    values,
    shares: Object.fromEntries(RESOURCE_KEYS.map(key => [key, (values[key] || 0) / total]))
  };
}

function strategyRows() {
  const rows = {};
  for (const row of document.querySelectorAll("#strategyState .state-row")) {
    const label = String(row.querySelector("span")?.textContent || "").trim();
    const value = String(row.querySelector("b")?.textContent || "").trim();
    if (label) rows[label] = value;
  }
  return rows;
}

function livingCount(world, owner, type) {
  return (world?.entities || []).filter(entity =>
    entity?.parent && entity.userData?.hp > 0 && entity.userData?.owner === owner && (!type || entity.userData.type === type)
  ).length;
}

function ownerList(world) {
  const owners = new Set(["player", "enemy"]);
  for (const entity of world?.entities || []) if (entity?.userData?.owner) owners.add(String(entity.userData.owner));
  for (const owner of Object.keys(world?.__axmFactionByOwner || {})) owners.add(owner);
  for (const owner of Object.keys(world?.__axmTeamByOwner || {})) owners.add(owner);
  return [...owners].sort((a, b) => a.localeCompare(b));
}

function readSeat(world, owner, rows, playerEconomy) {
  const faction = world?.__axmFactionByOwner?.[owner] || null;
  const team = world?.__axmTeamByOwner?.[owner] ?? null;
  const isPlayer = owner === "player";
  let ageIndex = isPlayer ? ageIndexFromText(document.getElementById("ageBadge")?.textContent) : -1;
  if (!isPlayer && owner === "enemy") ageIndex = ageIndexFromText(rows["Enemy development"]);

  return {
    id: owner,
    factionId: faction?.id || null,
    factionName: faction?.name || null,
    team,
    age: ageIndex >= 0 ? ageIndex : null,
    workforce: isPlayer ? firstNumber(document.getElementById("workforceLabel")?.textContent) : null,
    resources: isPlayer ? playerEconomy.resources : null,
    allocation: isPlayer ? playerEconomy.allocation : null,
    formations: livingCount(world, owner, "squad"),
    buildings: livingCount(world, owner, "building"),
    founders: livingCount(world, owner, "founder"),
    capitals: livingCount(world, owner, "capital")
  };
}

export function readPublicSkirmishState(world) {
  if (typeof document === "undefined") return deepFreeze({
    schema: "axm-rts-public-skirmish-state/v1",
    authoritative: false,
    coverage: "world-seats-only",
    seats: {},
    strategy: {}
  });

  const rows = strategyRows();
  const badge = String(document.getElementById("ageBadge")?.textContent || "").trim().toUpperCase();
  const startHidden = document.getElementById("startScreen")?.classList?.contains("hidden") || false;
  const status = badge === "VICTORY" || badge === "DEFEAT" ? "ended" : startHidden ? "running" : "setup";
  const playerEconomy = { resources: readPlayerResources(), allocation: readAllocation() };
  const seats = {};
  for (const owner of ownerList(world)) seats[owner] = readSeat(world, owner, rows, playerEconomy);

  return deepFreeze({
    schema: "axm-rts-public-skirmish-state/v1",
    authoritative: false,
    source: "public-runtime-readback",
    coverage: "player-economy-ui+world-seats+strategy-ui",
    status,
    result: badge === "VICTORY" || badge === "DEFEAT" ? badge : null,
    seats,
    strategy: rows
  });
}
