import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";
import {
  applyMapEnvironment,
  applyTerrainStampsToGeometry,
  createDecorationLayer,
  createSurfacePaintLayer
} from "./mapVisuals.js";

const originalMakeTerrain = RTSWorld.prototype.makeTerrain;
const originalMakeScenery = RTSWorld.prototype.makeScenery;
const originalResetDynamic = RTSWorld.prototype.resetDynamic;

function hideLegacyRoads(world) {
  if (DEFAULT_MAP.environment?.legacyRoads !== false) return;
  for (const child of world.scene.children) {
    if (child === world.ground || child === world.controlPoint) continue;
    if (!child?.isMesh || child.geometry?.type !== "PlaneGeometry") continue;
    if (child.material?.transparent && Number(child.material?.opacity) <= .75) child.visible = false;
  }
}

function clearVisualLayer(world) {
  for (const key of ["__axmMapSurfaceLayer", "__axmMapDecorationLayer"]) {
    const layer = world[key];
    if (!layer) continue;
    layer.traverse?.(object => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(material => material?.dispose?.());
      else object.material?.dispose?.();
    });
    layer.parent?.remove?.(layer);
    world[key] = null;
  }
}

RTSWorld.prototype.makeTerrain = function mapVisualTerrain() {
  const result = originalMakeTerrain.call(this);
  applyMapEnvironment(this.scene, DEFAULT_MAP);
  if (this.ground?.material?.color && DEFAULT_MAP.environment?.terrainTint) this.ground.material.color.set(DEFAULT_MAP.environment.terrainTint);
  if (this.ground?.geometry) applyTerrainStampsToGeometry(this.ground.geometry, DEFAULT_MAP, { additive: false });
  hideLegacyRoads(this);
  if (DEFAULT_MAP.environment?.legacyCenterpiece === false && this.controlPoint) this.controlPoint.visible = false;

  this.__axmMapSurfaceLayer = createSurfacePaintLayer(DEFAULT_MAP);
  this.scene.add(this.__axmMapSurfaceLayer);
  return result;
};

RTSWorld.prototype.makeScenery = function mapVisualScenery() {
  if (DEFAULT_MAP.environment?.proceduralScenery !== false) originalMakeScenery.call(this);
  this.__axmMapDecorationLayer = createDecorationLayer(DEFAULT_MAP);
  this.scene.add(this.__axmMapDecorationLayer);
};

RTSWorld.prototype.resetDynamic = function mapVisualReset() {
  // Visual layers belong to the selected map and stay static across a normal match restart.
  // If a runtime ever swaps maps on one world instance, the selected-map loader can call this hook first.
  return originalResetDynamic.call(this);
};

RTSWorld.prototype.__axmRebuildMapVisuals = function rebuildMapVisuals() {
  clearVisualLayer(this);
  applyMapEnvironment(this.scene, DEFAULT_MAP);
  this.__axmMapSurfaceLayer = createSurfacePaintLayer(DEFAULT_MAP);
  this.__axmMapDecorationLayer = createDecorationLayer(DEFAULT_MAP);
  this.scene.add(this.__axmMapSurfaceLayer, this.__axmMapDecorationLayer);
};
