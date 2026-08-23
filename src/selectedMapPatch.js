import { DEFAULT_MAP, getMapById } from "./maps.js";
import { currentLiveSeatCount, runtimeMapStarts } from "./runtimeMapStarts.js";

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

const source = selectedFlatMap();
const liveStarts = runtimeMapStarts(source, currentLiveSeatCount());

if (source !== DEFAULT_MAP) {
  const copy = JSON.parse(JSON.stringify(source));
  for (const key of Object.keys(DEFAULT_MAP)) delete DEFAULT_MAP[key];
  Object.assign(DEFAULT_MAP, copy);
}

if (liveStarts[0]) DEFAULT_MAP.playerStart = [...liveStarts[0]];
if (liveStarts[1]) DEFAULT_MAP.enemyStart = [...liveStarts[1]];
else if (liveStarts[0]) DEFAULT_MAP.enemyStart = [-liveStarts[0][0], liveStarts[0][1], -liveStarts[0][2]];
DEFAULT_MAP.runtimeStarts = liveStarts.map(point => [...point]);

window.__AXM_ACTIVE_MAP__ = DEFAULT_MAP;
window.dispatchEvent(new CustomEvent("axm-active-map-ready", { detail: { mapId: DEFAULT_MAP.id, starts: DEFAULT_MAP.runtimeStarts } }));
