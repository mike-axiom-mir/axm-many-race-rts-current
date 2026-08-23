import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";

const originalTick = RTSWorld.prototype.tick;
const WORLD = { minX: -50, maxX: 50, minZ: -36, maxZ: 36 };
const OWNER_COLORS = { player: "#78ddff", enemy: "#ff7b83", "seat-3": "#ffd66d", "seat-4": "#c69cff" };

function toMapX(x, width) { return ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * width; }
function toMapY(z, height) { return ((z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ)) * height; }

function injectStyle() {
  if (document.getElementById("axm-minimap-style")) return;
  const style = document.createElement("style");
  style.id = "axm-minimap-style";
  style.textContent = `
    .axm-minimap-wrap{position:absolute;z-index:7;left:50%;bottom:18px;transform:translateX(-50%);width:220px;height:150px;padding:6px;border:1px solid rgba(150,184,214,.28);border-radius:13px;background:rgba(6,13,20,.86);box-shadow:0 14px 34px rgba(0,0,0,.32);backdrop-filter:blur(10px)}
    .axm-minimap-title{position:absolute;left:10px;top:8px;z-index:2;font:800 8px/1 system-ui,sans-serif;letter-spacing:.14em;color:#c7d7e5;pointer-events:none;text-transform:uppercase}
    .axm-minimap{width:100%;height:100%;display:block;border-radius:8px;cursor:crosshair}
    @media(max-width:900px){.axm-minimap-wrap{left:auto;right:8px;top:72px;bottom:auto;transform:none;width:150px;height:104px;padding:4px}.axm-minimap-title{font-size:7px;left:7px;top:6px}}
  `;
  document.head.appendChild(style);
}

function ensureMinimap(world) {
  if (world.__axmMinimap) return world.__axmMinimap;
  injectStyle();
  const wrap = document.createElement("div");
  wrap.className = "axm-minimap-wrap";
  wrap.innerHTML = `<div class="axm-minimap-title">${DEFAULT_MAP.name}</div>`;
  const canvas = document.createElement("canvas");
  canvas.className = "axm-minimap"; canvas.width = 440; canvas.height = 300; wrap.appendChild(canvas);
  document.querySelector("main")?.appendChild(wrap);
  canvas.addEventListener("pointerdown", event => {
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    world.cameraTarget.set(WORLD.minX + px * (WORLD.maxX - WORLD.minX), 0, WORLD.minZ + py * (WORLD.maxZ - WORLD.minZ));
    world.clampCamera();
  });
  world.__axmMinimap = { wrap, canvas, ctx: canvas.getContext("2d"), lastDraw: 0 };
  return world.__axmMinimap;
}

function drawTerrain(ctx, width, height) {
  ctx.fillStyle = "#496644"; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(214,197,133,.35)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(width * .12, height * .70); ctx.lineTo(width * .88, height * .30); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(width * .44, height * .12); ctx.lineTo(width * .56, height * .88); ctx.stroke();
  for (const site of DEFAULT_MAP.strategicSites) {
    const x = toMapX(site.position[0], width), y = toMapY(site.position[2], height);
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = "rgba(230,207,125,.35)"; ctx.fill(); ctx.strokeStyle = "rgba(255,228,150,.75)"; ctx.lineWidth = 2; ctx.stroke();
  }
}

function drawFortification(ctx, entity, x, y) {
  const data = entity.userData;
  const cfg = data.fortification || {};
  const length = Math.max(9, Math.min(18, Number(cfg.width || 5.4) * 2.4));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-entity.rotation.y);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = data.role === "gate" ? 3 : 4;
  ctx.beginPath();
  if (data.role === "gate") {
    ctx.moveTo(-length / 2, 0); ctx.lineTo(-2.5, 0);
    ctx.moveTo(2.5, 0); ctx.lineTo(length / 2, 0);
  } else {
    ctx.moveTo(-length / 2, 0); ctx.lineTo(length / 2, 0);
  }
  ctx.stroke();
  ctx.restore();
}

function drawEntity(ctx, world, entity, width, height) {
  const data = entity.userData;
  if (!entity.parent || data.hp <= 0 || !data.owner) return;
  if (world.__axmFogSystem && !world.__axmFogSystem.isEntityVisibleToPlayer(entity)) return;
  const x = toMapX(entity.position.x, width), y = toMapY(entity.position.z, height);
  ctx.fillStyle = OWNER_COLORS[data.owner] || "#d8e2e8";
  if (data.type === "capital") { ctx.fillRect(x - 6, y - 6, 12, 12); ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.strokeRect(x - 7, y - 7, 14, 14); }
  else if (data.type === "building" && (data.role === "wall" || data.role === "gate")) drawFortification(ctx, entity, x, y);
  else if (data.type === "building") ctx.fillRect(x - 4, y - 4, 8, 8);
  else if (data.type === "founder") { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff6c9"; ctx.stroke(); }
  else if (data.type === "squad") { ctx.beginPath(); ctx.arc(x, y, data.isScout ? 4 : 3.2, 0, Math.PI * 2); ctx.fill(); }
}

function drawCamera(ctx, world, width, height) {
  const x = toMapX(world.cameraTarget.x, width), y = toMapY(world.cameraTarget.z, height);
  ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.lineWidth = 1.5; ctx.strokeRect(x - 13, y - 9, 26, 18);
}

function drawMinimap(world, time) {
  const mini = ensureMinimap(world); if (time - mini.lastDraw < .08) return; mini.lastDraw = time;
  const { ctx, canvas } = mini, width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  drawTerrain(ctx, width, height);
  for (const entity of world.entities) drawEntity(ctx, world, entity, width, height);
  world.__axmFogSystem?.drawMiniFog(ctx, width, height);
  drawCamera(ctx, world, width, height);
}

RTSWorld.prototype.tick = function minimapTick(time, dt) { const result = originalTick.call(this, time, dt); drawMinimap(this, time); return result; };