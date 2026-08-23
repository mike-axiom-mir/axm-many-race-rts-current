import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { loadLobby } from "./seatControllers.js";

const directCommand = RTSWorld.prototype.command;
const OWNERS = ["player", "enemy", "seat-3", "seat-4"];

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
  if (!world || !detail.seatId) return;
  const lobby = loadLobby();
  const index = lobby.seats.findIndex(seat => seat.id === detail.seatId);
  if (index < 0) return;
  const seat = lobby.seats[index];
  if (seat.controller !== "connected-ai" && seat.controller !== "human") return;
  const owner = OWNERS[index];
  if (!owner) return;

  world.__axmAuthorizedSeatCommand = owner;
  try {
    if (detail.type === "move" && Array.isArray(detail.point)) {
      const [x = 0, y = 0, z = 0] = detail.point.map(Number);
      directCommand.call(world, owner, new THREE.Vector3(x || 0, y || 0, z || 0));
    }
    if (detail.type === "attack-capital") {
      const target = world.entities.find(entity =>
        entity.parent &&
        entity.userData?.hp > 0 &&
        entity.userData?.type === "capital" &&
        entity.userData?.owner &&
        !sameTeam(world, owner, entity.userData.owner)
      );
      if (target) directCommand.call(world, owner, target.position);
    }
  } finally {
    world.__axmAuthorizedSeatCommand = null;
  }
});
