import * as THREE from "three";
import { mapPlayerStarts } from "./maps.js";

const FALLBACK_STARTS = [
  [-36, 0, -22],
  [36, 0, 22],
  [-36, 0, 22],
  [36, 0, -22],
  [0, 0, -27],
  [0, 0, 27],
  [-42, 0, 0],
  [42, 0, 0]
];

export function currentLiveSeatCount(fallback = 2) {
  try {
    const raw = localStorage.getItem("axm.manyRaceRts.lobby");
    const lobby = raw ? JSON.parse(raw) : null;
    const count = (lobby?.seats || []).filter(seat => seat?.controller !== "closed").length;
    return Math.max(1, Math.min(4, count || fallback));
  } catch {
    return fallback;
  }
}

function addFallbacks(starts, targetCount) {
  for (const candidate of FALLBACK_STARTS) {
    if (starts.length >= targetCount) break;
    const point = new THREE.Vector3(...candidate);
    const tooClose = starts.some(existing => point.distanceTo(new THREE.Vector3(...existing)) < 8);
    if (!tooClose) starts.push([...candidate]);
  }
  return starts;
}

export function runtimeMapStarts(map, seatCount = currentLiveSeatCount()) {
  const targetCount = Math.max(1, Math.min(4, Number(seatCount) || 1));
  const authored = mapPlayerStarts(map);
  if (!authored.length) return addFallbacks([], targetCount);

  if (authored.length >= targetCount) {
    if (targetCount === 1) return [[...authored[0]]];
    const chosen = [];
    for (let index = 0; index < targetCount; index++) {
      const slot = Math.floor(index * authored.length / targetCount) % authored.length;
      chosen.push([...authored[slot]]);
    }
    return chosen;
  }

  return addFallbacks(authored.map(point => [...point]), targetCount);
}
