const OWNER_COLORS = {
  player: "#67d9ff",
  enemy: "#ef6f7a",
  neutral: "#d4c27b"
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function healthColor(ratio) {
  if (ratio > 0.62) return "#7ef29a";
  if (ratio > 0.28) return "#ffd166";
  return "#ff6678";
}

export class Canvas2DRenderer {
  constructor(getWorld) {
    this.getWorld = getWorld;
    this.domElement = document.createElement("canvas");
    this.domElement.className = "axm-canvas2d-fallback";
    this.domElement.setAttribute("aria-label", "Canvas 2D fallback battlefield");
    this.domElement.dataset.presentationMode = "canvas2d";
    this.domElement.style.display = "block";
    this.domElement.style.width = "100%";
    this.domElement.style.height = "100%";
    this.domElement.style.touchAction = "none";
    this.context = this.domElement.getContext("2d", { alpha: false });
    this.pixelRatio = 1;
    this.width = 1;
    this.height = 1;
    this.shadowMap = { enabled: false, type: null };
    this.outputColorSpace = null;
  }

  setPixelRatio(value) {
    this.pixelRatio = clamp(Number(value) || 1, 1, 2);
  }

  setSize(width, height) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.domElement.width = Math.max(1, Math.floor(this.width * this.pixelRatio));
    this.domElement.height = Math.max(1, Math.floor(this.height * this.pixelRatio));
    this.domElement.style.width = `${this.width}px`;
    this.domElement.style.height = `${this.height}px`;
  }

  project(position, world) {
    const target = world.cameraTarget || { x: 0, z: 0 };
    const scale = Math.min(this.width / 100, this.height / 72) * (world.cameraZoom || 1);
    return {
      x: this.width * 0.5 + (position.x - target.x) * scale,
      y: this.height * 0.5 + (position.z - target.z) * scale * 0.86,
      scale
    };
  }

  drawTerrain(ctx, world) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#486c58");
    gradient.addColorStop(1, "#273f35");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const origin = this.project({ x: 0, z: 0 }, world);
    const grid = Math.max(18, origin.scale * 5);
    ctx.strokeStyle = "rgba(214, 232, 204, 0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = origin.x % grid; x < this.width; x += grid) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = origin.y % grid; y < this.height; y += grid) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.rotate(-0.16);
    ctx.fillStyle = "rgba(197, 171, 118, 0.34)";
    ctx.fillRect(-this.width, -Math.max(8, origin.scale * 2), this.width * 2, Math.max(16, origin.scale * 4));
    ctx.restore();

    const pulse = 1 + Math.sin(performance.now() / 430) * 0.06;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, Math.max(14, origin.scale * 4.2) * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(244, 222, 146, 0.78)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, Math.max(5, origin.scale * 0.9), 0, Math.PI * 2);
    ctx.fillStyle = "#9be2ff";
    ctx.fill();
  }

  drawTarget(ctx, entity, point, world) {
    if (!point) return;
    const from = this.project(entity.position, world);
    const to = this.project(point, world);
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = entity.userData.owner === "enemy" ? "rgba(239,111,122,.35)" : "rgba(103,217,255,.42)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawEntity(ctx, entity, world) {
    const data = entity.userData || {};
    const point = this.project(entity.position, world);
    const ownerColor = OWNER_COLORS[data.owner] || OWNER_COLORS.neutral;
    const radius = Math.max(4, (data.radius || 1) * point.scale);
    this.drawTarget(ctx, entity, data.target, world);

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 3;

    if (data.type === "capital") {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = ownerColor;
      ctx.fillRect(-radius * 0.72, -radius * 0.72, radius * 1.44, radius * 1.44);
      ctx.fillStyle = "#13232b";
      ctx.fillRect(-radius * 0.34, -radius * 0.34, radius * 0.68, radius * 0.68);
    } else if (data.type === "building") {
      ctx.fillStyle = ownerColor;
      if (data.role === "defense") {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#f6e3a0";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillRect(-radius, -radius * 0.78, radius * 2, radius * 1.56);
      }
    } else if (data.type === "founder") {
      ctx.fillStyle = "#ffe59a";
      ctx.strokeStyle = ownerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 ? radius * 0.45 : radius;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = ownerColor;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(6, 16, 23, .78)";
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (Number.isFinite(data.hp) && Number.isFinite(data.maxHp) && data.maxHp > 0) {
      const ratio = clamp(data.hp / data.maxHp, 0, 1);
      const width = Math.max(16, radius * 2);
      const y = point.y - radius - 8;
      ctx.fillStyle = "rgba(4, 11, 16, .72)";
      ctx.fillRect(point.x - width / 2, y, width, 4);
      ctx.fillStyle = healthColor(ratio);
      ctx.fillRect(point.x - width / 2, y, width * ratio, 4);
    }

    if (data.type === "capital" || data.type === "founder") {
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#eef8ff";
      ctx.fillText(data.label || (data.type === "capital" ? `${data.owner} capital` : "founder"), point.x, point.y + radius + 14);
    }
  }

  render(_scene, _camera) {
    const world = this.getWorld();
    const ctx = this.context;
    if (!world || !ctx) return;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawTerrain(ctx, world);

    const living = (world.entities || [])
      .filter(entity => entity.parent && entity.userData?.hp > 0)
      .sort((a, b) => a.position.z - b.position.z);
    for (const entity of living) this.drawEntity(ctx, entity, world);

    ctx.fillStyle = "rgba(5, 14, 20, .78)";
    ctx.fillRect(12, this.height - 34, 252, 22);
    ctx.fillStyle = "#bdefff";
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("CANVAS 2D FALLBACK • SAME LIVE SIMULATION", 21, this.height - 19);
  }
}

