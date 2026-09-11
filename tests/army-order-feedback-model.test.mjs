import assert from "node:assert/strict";
import { summarizeArmyOrder, armyOrderDetail } from "../src/armyOrderFeedbackModel.js";

const empty = summarizeArmyOrder([]);
assert.deepEqual(empty, { accepted: 0, active: 0, arrived: 0, enRoute: 0, lost: 0, progress: 0, phase: "empty" });
assert.match(armyOrderDetail(empty), /No available formations/);

const advancing = summarizeArmyOrder([
  { active: true, startDistance: 20, distance: 10 },
  { active: true, startDistance: 12, distance: 1 },
  { active: false, startDistance: 18, distance: 9 }
]);
assert.equal(advancing.accepted, 3);
assert.equal(advancing.active, 2);
assert.equal(advancing.enRoute, 1);
assert.equal(advancing.arrived, 1);
assert.equal(advancing.lost, 1);
assert.equal(advancing.progress, 75);
assert.equal(advancing.phase, "advancing");
assert.equal(armyOrderDetail(advancing), "1 en route or engaged • 1 holding at destination • 1 lost.");

const holding = summarizeArmyOrder([
  { active: true, startDistance: 30, distance: 2.2 },
  { active: true, startDistance: 1, distance: 0 }
]);
assert.equal(holding.progress, 100);
assert.equal(holding.phase, "holding");
assert.equal(holding.arrived, 2);

const lost = summarizeArmyOrder([
  { active: false, startDistance: 30, distance: 20 },
  { active: false, startDistance: 10, distance: 4 }
]);
assert.equal(lost.phase, "lost");
assert.equal(lost.lost, 2);
assert.match(armyOrderDetail(lost), /All 2 assigned formations have been lost/);

const clamped = summarizeArmyOrder([{ active: true, startDistance: 10, distance: 40 }]);
assert.equal(clamped.progress, 0);
assert.equal(clamped.phase, "advancing");

console.log("army order feedback model: 24 assertions passed");
