import { DEFAULT_MAP, getMapById } from "./maps.js";

function selectedFlatMap() {
  try {
    const raw = localStorage.getItem("axm.manyRaceRts.lobby");
    const lobby = raw ? JSON.parse(raw) : null;
    const selected = getMapById(lobby?.mapId);
    return selected?.projection === "flat" ? selected : DEFAULT_MAP;
  } catch {
    return DEFAULT_MAP;
  }
}

const selected = selectedFlatMap();
if (selected !== DEFAULT_MAP) {
  for (const key of Object.keys(DEFAULT_MAP)) delete DEFAULT_MAP[key];
  Object.assign(DEFAULT_MAP, JSON.parse(JSON.stringify(selected)));
}

window.__AXM_ACTIVE_MAP__ = DEFAULT_MAP;
window.dispatchEvent(new CustomEvent("axm-active-map-ready", { detail: { mapId: DEFAULT_MAP.id } }));
