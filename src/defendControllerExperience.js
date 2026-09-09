const $ = id => document.getElementById(id);

const ui = {
  status: $("controllerStatus"),
  feedback: $("controllerFeedback"),
  setup: $("setup"),
  start: $("startBtn"),
  activeSeat: $("activeSeat"),
  tower: $("towerBtn"),
  repair: $("repairBtn"),
  recruits: $("recruitButtons"),
  wavePanel: $("wavePanel"),
  nextWave: $("nextWaveBtn"),
  upgradePanel: $("upgradePanel"),
  upgradeChoices: $("upgradeChoices"),
  endPanel: $("endPanel"),
  restart: $("restartBtn")
};

const GAMEPAD_DEADZONE = 0.62;
const GAMEPAD_ACTIONS = [
  "primary", "hold", "build", "repair", "seat-prev", "seat-next",
  "recruit-1", "recruit-2", "north", "south", "west", "east"
];

let previousGamepad = Object.fromEntries(GAMEPAD_ACTIONS.map(action => [action, false]));
let connectedGamepadId = null;
let upgradeIndex = 0;

function isVisible(element) {
  return Boolean(element && !element.classList.contains("hidden"));
}

function setStatus(text, connected = false) {
  if (!ui.status) return;
  ui.status.textContent = text;
  ui.status.dataset.connected = connected ? "true" : "false";
}

function announce(text, kind = "") {
  if (!ui.feedback) return;
  ui.feedback.textContent = text;
  ui.feedback.dataset.kind = kind;
}

function clickControl(element, success, unavailable = `${success} unavailable`) {
  if (!element || element.disabled || !isVisible(element.closest(".hidden") ? null : element)) {
    announce(unavailable, "blocked");
    return false;
  }
  element.click();
  announce(success, "good");
  return true;
}

function commandButton(command) {
  return document.querySelector(`[data-command="${command}"]`);
}

function runCommand(command, label) {
  const button = commandButton(command);
  if (!button || button.disabled) {
    announce(`${label} unavailable`, "blocked");
    return false;
  }
  button.click();
  announce(label, "good");
  return true;
}

function cycleSeat(delta) {
  const select = ui.activeSeat;
  if (!select || select.disabled || select.options.length < 2) {
    announce("Only one allied seat is active", "blocked");
    return false;
  }
  const count = select.options.length;
  select.selectedIndex = (select.selectedIndex + delta + count) % count;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  const option = select.options[select.selectedIndex];
  announce(`Active seat · ${option?.textContent || select.value}`, "good");
  return true;
}

function recruit(index) {
  const buttons = [...(ui.recruits?.querySelectorAll("button") || [])];
  const button = buttons[index];
  if (!button || button.disabled) {
    announce(`Recruit slot ${index + 1} unavailable`, "blocked");
    return false;
  }
  const label = button.querySelector("b")?.textContent || `Recruit slot ${index + 1}`;
  button.click();
  announce(label, "good");
  return true;
}

function upgradeButtons() {
  return [...(ui.upgradeChoices?.querySelectorAll("button") || [])];
}

function renderUpgradeFocus() {
  const buttons = upgradeButtons();
  if (!buttons.length) return;
  upgradeIndex = Math.max(0, Math.min(upgradeIndex, buttons.length - 1));
  buttons.forEach((button, index) => {
    button.classList.toggle("controller-focus", index === upgradeIndex);
    button.setAttribute("aria-current", index === upgradeIndex ? "true" : "false");
  });
}

function moveUpgradeFocus(delta) {
  const buttons = upgradeButtons();
  if (!buttons.length) return false;
  upgradeIndex = (upgradeIndex + delta + buttons.length) % buttons.length;
  renderUpgradeFocus();
  const button = buttons[upgradeIndex];
  announce(`Upgrade ${upgradeIndex + 1} of ${buttons.length} · ${button.querySelector("b")?.textContent || "choice"}`);
  return true;
}

function confirmUpgrade() {
  const buttons = upgradeButtons();
  if (!buttons.length) {
    announce("Upgrade choice unavailable", "blocked");
    return false;
  }
  upgradeIndex = Math.max(0, Math.min(upgradeIndex, buttons.length - 1));
  const button = buttons[upgradeIndex];
  const label = button.querySelector("b")?.textContent || `Upgrade ${upgradeIndex + 1}`;
  button.click();
  announce(`Installed · ${label}`, "good");
  return true;
}

function primaryAction() {
  if (isVisible(ui.setup)) return clickControl(ui.start, "Workshop run started");
  if (isVisible(ui.endPanel)) return clickControl(ui.restart, "Restarting Workshop run");
  if (isVisible(ui.upgradePanel)) return confirmUpgrade();
  if (isVisible(ui.wavePanel)) return clickControl(ui.nextWave, ui.nextWave?.textContent || "Wave started");
  return runCommand("intercept", "Intercept nearest wave");
}

function performAction(action, source = "keyboard") {
  if (source === "keyboard") setStatus("INPUT · KEYBOARD", false);

  if (isVisible(ui.upgradePanel)) {
    if (["west", "north", "seat-prev"].includes(action)) return moveUpgradeFocus(-1);
    if (["east", "south", "seat-next"].includes(action)) return moveUpgradeFocus(1);
    if (action === "primary") return confirmUpgrade();
  }

  switch (action) {
    case "primary": return primaryAction();
    case "hold": return runCommand("hold", "Hold Workshop");
    case "build": return clickControl(ui.tower, "Guard Tower build requested");
    case "repair": return clickControl(ui.repair, "Workshop repair requested");
    case "seat-prev": return cycleSeat(-1);
    case "seat-next": return cycleSeat(1);
    case "recruit-1": return recruit(0);
    case "recruit-2": return recruit(1);
    case "north": return runCommand("north", "Push north");
    case "south": return runCommand("south", "Push south");
    case "west": return runCommand("west", "Push west");
    case "east": return runCommand("east", "Push east");
    default: return false;
  }
}

function buttonPressed(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  return Boolean(button && (button.pressed || Number(button.value || 0) > 0.55));
}

function readGamepad(gamepad) {
  const x = Number(gamepad?.axes?.[0] || 0);
  const y = Number(gamepad?.axes?.[1] || 0);
  return {
    primary: buttonPressed(gamepad, 0) || buttonPressed(gamepad, 9),
    hold: buttonPressed(gamepad, 1),
    build: buttonPressed(gamepad, 2),
    repair: buttonPressed(gamepad, 3),
    "seat-prev": buttonPressed(gamepad, 4),
    "seat-next": buttonPressed(gamepad, 5),
    "recruit-1": buttonPressed(gamepad, 6),
    "recruit-2": buttonPressed(gamepad, 7),
    north: buttonPressed(gamepad, 12) || y < -GAMEPAD_DEADZONE,
    south: buttonPressed(gamepad, 13) || y > GAMEPAD_DEADZONE,
    west: buttonPressed(gamepad, 14) || x < -GAMEPAD_DEADZONE,
    east: buttonPressed(gamepad, 15) || x > GAMEPAD_DEADZONE
  };
}

function pollGamepad() {
  const pads = typeof navigator.getGamepads === "function" ? [...navigator.getGamepads()] : [];
  const gamepad = pads.find(pad => pad?.connected);

  if (!gamepad) {
    if (connectedGamepadId !== null) {
      connectedGamepadId = null;
      previousGamepad = Object.fromEntries(GAMEPAD_ACTIONS.map(action => [action, false]));
      setStatus("INPUT · KEYBOARD / POINTER", false);
      announce("Gamepad disconnected · keyboard and pointer remain available");
    }
    requestAnimationFrame(pollGamepad);
    return;
  }

  if (connectedGamepadId !== gamepad.id) {
    connectedGamepadId = gamepad.id;
    previousGamepad = Object.fromEntries(GAMEPAD_ACTIONS.map(action => [action, false]));
    setStatus("GAMEPAD · CONNECTED", true);
    announce("Gamepad ready · A confirms, D-pad commands, LB/RB changes seat");
  }

  const current = readGamepad(gamepad);
  for (const action of GAMEPAD_ACTIONS) {
    if (current[action] && !previousGamepad[action]) performAction(action, "gamepad");
  }
  previousGamepad = current;
  requestAnimationFrame(pollGamepad);
}

const KEY_ACTIONS = new Map([
  ["Enter", "primary"], [" ", "primary"],
  ["ArrowUp", "north"], ["w", "north"],
  ["ArrowDown", "south"], ["s", "south"],
  ["ArrowLeft", "west"], ["a", "west"],
  ["ArrowRight", "east"], ["d", "east"],
  ["i", "primary"], ["h", "hold"],
  ["t", "build"], ["r", "repair"],
  ["q", "seat-prev"], ["e", "seat-next"],
  ["1", "recruit-1"], ["2", "recruit-2"]
]);

document.addEventListener("keydown", event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) return;
  const action = KEY_ACTIONS.get(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  if (!action) return;
  event.preventDefault();
  performAction(action, "keyboard");
});

ui.upgradeChoices && new MutationObserver(() => {
  upgradeIndex = 0;
  renderUpgradeFocus();
}).observe(ui.upgradeChoices, { childList: true });

setStatus("INPUT · KEYBOARD / POINTER", false);
announce("Gamepad optional · A or Enter confirms · D-pad or WASD issues macro orders");
requestAnimationFrame(pollGamepad);
