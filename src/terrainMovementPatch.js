import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";
import {
  findTerrainRoute,
  movementSurfaceAt,
  terrainMovementMultiplierAt,
  terrainSegmentWalkable
} from "./terrainPassability.js";

const previousMovement = RTSWorld.prototype.updateMovement;

function flatDistance(a, b) {
  return Math.hypot(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.z || 0) - Number(b?.z || 0));
}

function sameGoal(route, goal) {
  return route && Math.hypot(route.goalX - goal.x, route.goalZ - goal.z) < .9;
}

function makeRoute(entity, goal) {
  if (terrainSegmentWalkable(DEFAULT_MAP, entity.position, goal)) {
    return {
      goalX: goal.x,
      goalZ: goal.z,
      direct: true,
      waypoints: [],
      index: 0,
      reachesGoal: true,
      expanded: 0
    };
  }

  const plan = findTerrainRoute(DEFAULT_MAP, entity.position, goal);
  return {
    goalX: goal.x,
    goalZ: goal.z,
    direct: Boolean(plan.direct),
    waypoints: plan.waypoints || [],
    index: 0,
    reachesGoal: Boolean(plan.reachesGoal),
    expanded: Number(plan.expanded || 0)
  };
}

function moveWithSurface(world, entity, dt, time) {
  const paint = movementSurfaceAt(DEFAULT_MAP, entity.position.x, entity.position.z);
  const multiplier = terrainMovementMultiplierAt(DEFAULT_MAP, entity.position.x, entity.position.z);
  entity.userData.surfaceMovementMultiplier = multiplier;
  entity.userData.surfaceSkin = paint?.skin || "grassland";
  return previousMovement.call(world, entity, dt * multiplier, time);
}

RTSWorld.prototype.updateMovement = function terrainAwareMovement(entity, dt, time) {
  const data = entity?.userData || {};
  if ((data.type !== "squad" && data.type !== "founder") || !data.target) {
    return previousMovement.call(this, entity, dt, time);
  }

  const finalTarget = data.target.clone();
  let route = data.__axmTerrainRoute;
  if (!sameGoal(route, finalTarget)) {
    route = makeRoute(entity, finalTarget);
    data.__axmTerrainRoute = route;
  }

  if (route.direct) {
    data.terrainBlocked = false;
    data.terrainRouteExpanded = 0;
    return moveWithSurface(this, entity, dt, time);
  }

  while (route.index < route.waypoints.length && flatDistance(entity.position, route.waypoints[route.index]) < .78) {
    route.index++;
  }

  if (route.index >= route.waypoints.length) {
    delete data.__axmTerrainRoute;
    if (!route.reachesGoal) {
      data.target = null;
      data.terrainBlocked = true;
      data.terrainRouteExpanded = route.expanded;
      return undefined;
    }
    data.terrainBlocked = false;
    data.target = finalTarget;
    return moveWithSurface(this, entity, dt, time);
  }

  const waypoint = route.waypoints[route.index];
  const temporaryTarget = finalTarget.clone();
  temporaryTarget.x = waypoint.x;
  temporaryTarget.z = waypoint.z;
  data.target = temporaryTarget;
  const result = moveWithSurface(this, entity, dt, time);

  if (!entity.parent || data.hp <= 0) return result;
  if (flatDistance(entity.position, waypoint) < .78) route.index++;
  data.terrainRouteExpanded = route.expanded;

  if (route.index >= route.waypoints.length && !route.reachesGoal) {
    delete data.__axmTerrainRoute;
    data.target = null;
    data.terrainBlocked = true;
    return result;
  }

  data.terrainBlocked = false;
  if (flatDistance(entity.position, finalTarget) < .65) {
    data.target = null;
    delete data.__axmTerrainRoute;
  } else {
    data.target = finalTarget;
  }
  return result;
};
