import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { loadLobby } from "./seatControllers.js";

const directCommand = RTSWorld.prototype.command;
const OWNERS = ["player", "enemy", "seat-3", "seat-4"];
const RESULT_SCHEMA = "axm.rts.seat-command-result/v0.1";

function seatForOwner(owner) {
  const lobby = loadLobby();
  const index = OWNERS.indexOf(owner);
  return index >= 0 ? lobby.seats[index] : null;
}

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

function publishSeatCommandResult({ seatId = null, owner = null, commandType = null, status, reason }) {
  window.dispatchEvent(new CustomEvent("axm-seat-command-result", {
    detail: Object.freeze({
      schema: RESULT_SCHEMA,
      seatId,
      owner,
      commandType,
      status,
      reason,
      authority: "OBSERVATION_ONLY",
    }),
  }));
}

RTSWorld.prototype.command = function seatAwareCommand(owner, point) {
  const seat = seatForOwner(owner);
  if (!seat || seat.controller === "closed") return;

  if (owner === "player") return directCommand.call(this, owner, point);
  if (seat.controller === "faction-ai") return directCommand.call(this, owner, point);
  if (this.__axmAuthorizedSeatCommand === owner) return directCommand.call(this, owner, point);
};

window.addEventListener("axm-seat-command", event => {
  const world = window.__AXM_RTS_WORLD__;
  const detail = event.detail || {};
  const commandType = typeof detail.type === "string" ? detail.type : null;

  if (!world) {
    publishSeatCommandResult({ seatId: detail.seatId || null, commandType, status: "HELD", reason: "WORLD_UNAVAILABLE" });
    return;
  }
  if (!detail.seatId) {
    publishSeatCommandResult({ commandType, status: "HELD", reason: "SEAT_ID_REQUIRED" });
    return;
  }

  const lobby = loadLobby();
  const index = lobby.seats.findIndex(seat => seat.id === detail.seatId);
  if (index < 0) {
    publishSeatCommandResult({ seatId: detail.seatId, commandType, status: "HELD", reason: "SEAT_UNKNOWN" });
    return;
  }

  const seat = lobby.seats[index];
  const owner = OWNERS[index];
  if (seat.controller !== "connected-ai" && seat.controller !== "human") {
    publishSeatCommandResult({ seatId: detail.seatId, owner, commandType, status: "HELD", reason: "CONTROLLER_NOT_EXTERNAL" });
    return;
  }
  if (!owner) {
    publishSeatCommandResult({ seatId: detail.seatId, commandType, status: "HELD", reason: "OWNER_UNAVAILABLE" });
    return;
  }

  world.__axmAuthorizedSeatCommand = owner;
  try {
    if (detail.type === "move" && Array.isArray(detail.point)) {
      const [x = 0, y = 0, z = 0] = detail.point.map(Number);
      directCommand.call(world, owner, new THREE.Vector3(x || 0, y || 0, z || 0));
      publishSeatCommandResult({ seatId: detail.seatId, owner, commandType: "move", status: "APPLIED", reason: "WORLD_COMMAND_CALLED" });
      return;
    }
    if (detail.type === "attack-capital") {
      const target = world.entities.find(entity =>
        entity.parent &&
        entity.userData?.hp > 0 &&
        entity.userData?.type === "capital" &&
        entity.userData?.owner &&
        !sameTeam(world, owner, entity.userData.owner)
      );
      if (!target) {
        publishSeatCommandResult({ seatId: detail.seatId, owner, commandType: "attack-capital", status: "HELD", reason: "NO_HOSTILE_CAPITAL" });
        return;
      }
      directCommand.call(world, owner, target.position);
      publishSeatCommandResult({ seatId: detail.seatId, owner, commandType: "attack-capital", status: "APPLIED", reason: "WORLD_COMMAND_CALLED" });
      return;
    }
    publishSeatCommandResult({ seatId: detail.seatId, owner, commandType, status: "HELD", reason: "COMMAND_UNSUPPORTED" });
  } finally {
    world.__axmAuthorizedSeatCommand = null;
  }
});

export const SEAT_COMMAND_RESULT_SCHEMA = RESULT_SCHEMA;
