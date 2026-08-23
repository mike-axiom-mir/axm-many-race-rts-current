import * as THREE from "three";
import { waveSpec } from "./defendConfig.js";

const LANE_ORDER = ["north", "east", "south", "west"];
const SPAWN_LANE_ORDER = ["west", "west", "east", "east", "north", "north", "south", "south"];
const LANE_DATA = {
  north: { id: "north", label: "North", hold: new THREE.Vector3(0, 0, -10), approach: new THREE.Vector3(0, 0, -19), color: 0x78c9ff },
  east: { id: "east", label: "East", hold: new THREE.Vector3(10, 0, 0), approach: new THREE.Vector3(19, 0, 0), color: 0xffcf70 },
  south: { id: "south", label: "South", hold: new THREE.Vector3(0, 0, 10), approach: new THREE.Vector3(0, 0, 19), color: 0x8de0a7 },
  west: { id: "west", label: "West", hold: new THREE.Vector3(-10, 0, 0), approach: new THREE.Vector3(-19, 0, 0), color: 0xd6a6ff }
};

let timer = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function activeSeats(state) {
  return (state.seats || []).filter(seat => seat.controller !== "closed");
}

function laneForSeat(state, seatId) {
  const index = Math.max(0, activeSeats(state).findIndex(seat => seat.id === seatId));
  return LANE_DATA[LANE_ORDER[index % LANE_ORDER.length]];
}

function laneForPosition(position) {
  const x = Number(position?.x || 0);
  const z = Number(position?.z || 0);
  if (Math.abs(x) > Math.abs(z)) return x >= 0 ? LANE_DATA.east : LANE_DATA.west;
  return z >= 0 ? LANE_DATA.south : LANE_DATA.north;
}

function livingLaneThreats(world) {
  const counts = { north: 0, east: 0, south: 0, west: 0 };
  for (const entity of world.entities || []) {
    if (!entity?.parent || entity.userData?.hp <= 0 || entity.userData?.owner !== "enemy" || entity.userData.type !== "squad") continue;
    const laneId = entity.userData.__axmDefenseLane || laneForPosition(entity.position).id;
    if (counts[laneId] !== undefined) counts[laneId]++;
  }
  return counts;
}

function nextWavePreview(state) {
  if (!state.started || state.ended || state.waveActive) return null;
  const nextWave = Math.max(1, Number(state.wave || 0) + 1);
  const seats = Math.max(1, activeSeats(state).length);
  const spec = waveSpec(nextWave, seats, state.difficultyId || "normal");
  const counts = { north: 0, east: 0, south: 0, west: 0 };
  for (let index = 0; index < spec.count; index++) counts[SPAWN_LANE_ORDER[index % SPAWN_LANE_ORDER.length]]++;
  return { wave: nextWave, boss: Boolean(spec.boss), count: spec.count, counts };
}

function hottestLane(counts) {
  let best = LANE_DATA.north;
  let bestCount = -1;
  for (const laneId of LANE_ORDER) {
    if ((counts[laneId] || 0) > bestCount) {
      best = LANE_DATA[laneId];
      bestCount = counts[laneId] || 0;
    }
  }
  return best;
}

function commandSeat(world, seatId, point) {
  for (const entity of world.entities || []) {
    if (!entity?.parent || entity.userData?.hp <= 0 || entity.userData?.owner !== "player" || entity.userData?.seatId !== seatId) continue;
    if (entity.userData.type !== "squad" && entity.userData.type !== "founder") continue;
    entity.userData.target = point.clone();
  }
}

function injectStyle() {
  if (document.getElementById("axmCoopSectorStyle")) return;
  const style = document.createElement("style");
  style.id = "axmCoopSectorStyle";
  style.textContent = `
    #coopSectorPanel{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:10px}
    #coopSectorPanel .sector-head{display:flex;justify-content:space-between;gap:8px;align-items:center}
    #coopSectorPanel .sector-head b{color:var(--accent);letter-spacing:.06em}
    #coopLaneGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:7px}
    #coopLaneGrid div{padding:5px 3px;text-align:center;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.035)}
    #coopLaneGrid span{display:block;font-size:7px;color:var(--muted);text-transform:uppercase}
    #coopLaneGrid b{font-size:13px}
    #coopSectorActions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}
    #coopSectorActions button{font-size:9px;min-height:38px}
    #coopSectorActions button:last-child{grid-column:1/-1}
    #coopWavePreview{margin-top:7px;color:var(--muted);font-size:8px}
    #coopThreatRibbon{position:absolute;z-index:8;left:50%;top:86px;transform:translateX(-50%);display:flex;gap:5px;align-items:center;padding:6px 8px;border:1px solid var(--line);border-radius:999px;background:rgba(6,16,26,.88);backdrop-filter:blur(10px);font-size:8px;pointer-events:none}
    #coopThreatRibbon b{font-size:10px}.coop-hot{color:var(--danger)!important}
    @media(max-width:930px){#coopThreatRibbon{top:72px;max-width:calc(100vw - 14px);flex-wrap:wrap;justify-content:center}}
  `;
  document.head.appendChild(style);
}

function makeSectorMarkers(world) {
  if (world.__axmCoopSectorMarkers) return world.__axmCoopSectorMarkers;
  const root = new THREE.Group();
  root.name = "coop-defense-sector-markers";
  for (const laneId of LANE_ORDER) {
    const lane = LANE_DATA[laneId];
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, .08, 6, 28),
      new THREE.MeshBasicMaterial({ color: lane.color, transparent: true, opacity: .34, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(lane.hold);
    ring.position.y = .13;
    ring.userData.__axmSectorLane = laneId;
    root.add(ring);
  }
  world.scene.add(root);
  world.__axmCoopSectorMarkers = root;
  return root;
}

function ensureUi(api) {
  injectStyle();
  const { world, state } = api;
  const leftHud = document.getElementById("leftHud");
  if (!leftHud) return null;
  let panel = document.getElementById("coopSectorPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "coopSectorPanel";
    panel.innerHTML = `
      <div class="sector-head"><span>CO-OP DEFENSE SECTOR</span><b id="coopAssignedSector">—</b></div>
      <div id="coopLaneGrid"></div>
      <div id="coopSectorActions">
        <button type="button" data-coop-sector="hold">Hold My Sector</button>
        <button type="button" data-coop-sector="assist">Assist Hot Lane</button>
        <button type="button" data-coop-sector="reset">Reset Team Sectors</button>
      </div>
      <div id="coopWavePreview">Next-wave lanes appear here during intermission.</div>`;
    const factionBox = document.getElementById("activeFaction");
    if (factionBox) factionBox.insertAdjacentElement("afterend", panel);
    else leftHud.appendChild(panel);

    panel.querySelector('[data-coop-sector="hold"]')?.addEventListener("click", () => {
      const seatId = state.activeSeatId;
      const lane = laneForSeat(state, seatId);
      commandSeat(world, seatId, lane.hold);
    });
    panel.querySelector('[data-coop-sector="assist"]')?.addEventListener("click", () => {
      const seatId = state.activeSeatId;
      const lane = hottestLane(livingLaneThreats(world));
      commandSeat(world, seatId, lane.approach);
    });
    panel.querySelector('[data-coop-sector="reset"]')?.addEventListener("click", () => {
      for (const seat of activeSeats(state)) commandSeat(world, seat.id, laneForSeat(state, seat.id).hold);
    });
  }

  let ribbon = document.getElementById("coopThreatRibbon");
  if (!ribbon) {
    ribbon = document.createElement("div");
    ribbon.id = "coopThreatRibbon";
    ribbon.className = "hidden";
    document.getElementById("app")?.appendChild(ribbon);
  }
  makeSectorMarkers(world);
  return panel;
}

function refreshSeatLabels(state) {
  const select = document.getElementById("activeSeat");
  if (!select) return;
  const seats = activeSeats(state);
  for (const option of select.options) {
    const seat = seats.find(item => item.id === option.value);
    if (!seat) continue;
    const lane = laneForSeat(state, seat.id);
    const base = option.textContent?.split(" • ").slice(0, 2).join(" • ") || seat.label;
    option.textContent = `${base} • ${lane.label}`;
  }
}

function render(api) {
  const { world, state } = api;
  const panel = ensureUi(api);
  if (!panel || !state.started) return;
  const counts = livingLaneThreats(world);
  const hot = hottestLane(counts);
  const activeLane = laneForSeat(state, state.activeSeatId);
  const assigned = panel.querySelector("#coopAssignedSector");
  if (assigned) assigned.textContent = activeLane.label.toUpperCase();

  const grid = panel.querySelector("#coopLaneGrid");
  if (grid) grid.innerHTML = LANE_ORDER.map(id => {
    const lane = LANE_DATA[id], value = counts[id] || 0;
    return `<div><span>${esc(lane.label)}</span><b class="${value > 0 && id === hot.id ? "coop-hot" : ""}">${value}</b></div>`;
  }).join("");

  const preview = nextWavePreview(state);
  const previewNode = panel.querySelector("#coopWavePreview");
  if (previewNode) {
    previewNode.textContent = preview
      ? `${preview.boss ? "Heavy " : ""}Wave ${preview.wave} preview • N ${preview.counts.north} • E ${preview.counts.east} • S ${preview.counts.south} • W ${preview.counts.west}`
      : state.waveActive ? `Wave ${state.wave} live • hottest lane: ${hot.label}` : "Run complete.";
  }

  const ribbon = document.getElementById("coopThreatRibbon");
  if (ribbon) {
    const data = state.waveActive ? counts : preview?.counts;
    if (!state.ended && data) {
      const heading = state.waveActive ? `WAVE ${state.wave}` : `NEXT ${preview.wave}`;
      ribbon.innerHTML = `<strong>${heading}</strong>${LANE_ORDER.map(id => `<span>${LANE_DATA[id].label[0]} <b class="${state.waveActive && id === hot.id && counts[id] > 0 ? "coop-hot" : ""}">${data[id] || 0}</b></span>`).join("")}`;
      ribbon.classList.remove("hidden");
    } else ribbon.classList.add("hidden");
  }
  refreshSeatLabels(state);
}

function steerEnemyLanes(api) {
  const { world, state } = api;
  if (!state.started || state.ended || !state.workshop?.parent) return;
  for (const entity of world.entities || []) {
    if (!entity?.parent || entity.userData?.hp <= 0 || entity.userData?.owner !== "enemy" || entity.userData.type !== "squad") continue;
    if (!entity.userData.__axmDefenseLane) entity.userData.__axmDefenseLane = laneForPosition(entity.position).id;
    const lane = LANE_DATA[entity.userData.__axmDefenseLane] || laneForPosition(entity.position);
    const distanceToWorkshop = entity.position.distanceTo(state.workshop.position);
    entity.userData.target = (distanceToWorkshop > 20.5 ? lane.approach : state.workshop.position).clone();
  }
}

function attach() {
  const api = window.__AXM_DEFEND_WORKSHOP__;
  if (!api?.world || !api?.state || api.__coopSectorPatched) return false;
  api.__coopSectorPatched = true;
  const { world } = api;
  const originalTick = world.tick.bind(world);
  let uiClock = 0;
  world.tick = function coopSectorTick(time, dt) {
    const result = originalTick(time, dt);
    steerEnemyLanes(api);
    uiClock += Number(dt || 0);
    if (uiClock >= .2) {
      uiClock = 0;
      render(api);
    }
    return result;
  };
  api.coopSectors = {
    lanes: LANE_DATA,
    laneForSeat: seatId => laneForSeat(api.state, seatId).id,
    threatCounts: () => livingLaneThreats(world),
    nextWavePreview: () => nextWavePreview(api.state)
  };
  render(api);
  return true;
}

if (!attach()) {
  timer = setInterval(() => {
    if (attach() && timer) clearInterval(timer);
  }, 120);
}
