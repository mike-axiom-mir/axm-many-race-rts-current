import { DEFAULT_MAP, getMapById } from "./maps.js";

export function lobbyMapId() {
  try {
    const raw = localStorage.getItem("axm.manyRaceRts.lobby");
    const lobby = raw ? JSON.parse(raw) : null;
    return lobby?.mapId || DEFAULT_MAP.id;
  } catch {
    return DEFAULT_MAP.id;
  }
}

export function resolveActiveFlatMap() {
  const map = getMapById(lobbyMapId()) || DEFAULT_MAP;
  return map.projection === "flat" ? map : DEFAULT_MAP;
}

export function exposeActiveMap(map) {
  if (typeof window !== "undefined") window.__AXM_ACTIVE_MAP__ = map;
  return map;
}
