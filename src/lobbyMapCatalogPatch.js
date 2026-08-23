import { getMapList, getMapById } from "./maps.js";

const MAP_SELECT = document.getElementById("mapSelect");
const MAP_NAME = document.getElementById("mapName");
const MAP_DESCRIPTION = document.getElementById("mapDescription");
const LAUNCH = document.getElementById("launchBtn");
const VALIDATION = document.getElementById("validation");

function savedLobby() {
  try {
    return JSON.parse(localStorage.getItem("axm.manyRaceRts.lobby") || "null") || {};
  } catch {
    return {};
  }
}

function activeSeatCount() {
  return (savedLobby().seats || []).filter(seat => seat?.controller !== "closed").length || 0;
}

function mapInfoText(map) {
  const designed = Number(map.recommendedPlayers || 2);
  const starts = Array.isArray(map.playerStarts) ? map.playerStarts.length : 2;
  const live = Math.min(4, starts);
  const extra = starts > 4
    ? ` ${starts} authored start slots are stored; the current live lobby can use the first four until the 8/12-seat runtime expands.`
    : "";
  return `${map.description} Designed for ${designed} player${designed === 1 ? "" : "s"} • ${starts} authored start slot${starts === 1 ? "" : "s"} • currently live with up to ${live} civilization seats.${extra}`;
}

function refreshMapInfo() {
  if (!MAP_SELECT) return;
  if (MAP_SELECT.value === "crownworld") {
    MAP_NAME.textContent = "Crownworld";
    MAP_DESCRIPTION.textContent = "Planetary battlefield using the spherical conquest runtime and great-circle movement.";
    LAUNCH.href = "./globe.html";
    LAUNCH.textContent = "Launch globe";
    return;
  }
  const map = getMapById(MAP_SELECT.value);
  if (!map) return;
  MAP_NAME.textContent = `${map.name} • ${map.recommendedPlayers}P`;
  MAP_DESCRIPTION.textContent = mapInfoText(map);
  LAUNCH.href = "./skirmish.html";
  LAUNCH.textContent = "Launch flat skirmish";

  const seats = activeSeatCount();
  const starts = map.playerStarts?.length || 2;
  const note = document.getElementById("axmMapCapacityNote") || document.createElement("div");
  note.id = "axmMapCapacityNote";
  note.className = seats > starts ? "warn" : "ok";
  note.textContent = seats > starts
    ? `• ${seats} active civilizations, but ${map.name} currently has ${starts} authored starts. Extra live seats use the legacy fallback corners.`
    : `✓ ${map.name}: ${seats || 1} active civilization${seats === 1 ? "" : "s"} / ${starts} authored starts.`;
  VALIDATION?.appendChild(note);
}

function populateMaps() {
  if (!MAP_SELECT) return;
  const current = savedLobby().mapId || MAP_SELECT.value || "founders-crossing";
  MAP_SELECT.innerHTML = "";
  for (const map of getMapList()) {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = `${map.recommendedPlayers}P • ${map.name}`;
    MAP_SELECT.appendChild(option);
  }
  const globe = document.createElement("option");
  globe.value = "crownworld";
  globe.textContent = "Globe • Crownworld";
  MAP_SELECT.appendChild(globe);
  if ([...MAP_SELECT.options].some(option => option.value === current)) MAP_SELECT.value = current;
  else MAP_SELECT.value = "founders-crossing";
  queueMicrotask(refreshMapInfo);
}

MAP_SELECT?.addEventListener("change", () => queueMicrotask(refreshMapInfo));
document.getElementById("seatList")?.addEventListener("change", () => setTimeout(refreshMapInfo, 0));

populateMaps();
