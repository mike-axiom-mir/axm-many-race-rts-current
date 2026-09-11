const media = window.matchMedia("(max-width: 900px)");
const nav = document.getElementById("mobileHudNav");
const status = document.getElementById("mobileHudStatus");
const leftHud = document.getElementById("leftHud");
const rightHud = document.getElementById("rightHud");
const buttons = [...(nav?.querySelectorAll("[data-mobile-view]") || [])];

let current = "field";

function labelFor(view) {
  if (view === "economy") return "Economy view. Civilization, resources, powers, production and progression are available.";
  if (view === "strategy") return "Strategy view. Army doctrine, strategic state and controls are available.";
  return "Battlefield view. Open Economy or Strategy when you need commands.";
}

export function setMobileSkirmishView(view, announce = true) {
  if (!media.matches || !["field", "economy", "strategy"].includes(view)) return false;
  current = view;
  leftHud?.classList.toggle("mobile-panel-active", view === "economy");
  rightHud?.classList.toggle("mobile-panel-active", view === "strategy");
  for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.mobileView === view));
  if (announce && status) status.textContent = labelFor(view);
  return true;
}

function resetForViewport() {
  if (media.matches && !leftHud?.classList.contains("hidden")) {
    nav?.classList.remove("hidden");
    setMobileSkirmishView(current, false);
  }
  else {
    nav?.classList.add("hidden");
    leftHud?.classList.remove("mobile-panel-active");
    rightHud?.classList.remove("mobile-panel-active");
  }
}

for (const button of buttons) {
  button.addEventListener("click", () => setMobileSkirmishView(button.dataset.mobileView));
  button.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = buttons.indexOf(button);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    setMobileSkirmishView(buttons[next].dataset.mobileView);
  });
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && media.matches && current !== "field") {
    setMobileSkirmishView("field");
    nav?.querySelector('[data-mobile-view="field"]')?.focus();
  }
});

let wasHidden = leftHud?.classList.contains("hidden") ?? true;
const matchStart = new MutationObserver(() => {
  const isHidden = leftHud?.classList.contains("hidden") ?? true;
  if (media.matches && wasHidden && !isHidden) {
    nav?.classList.remove("hidden");
    setMobileSkirmishView("field", false);
  }
  if (isHidden) nav?.classList.add("hidden");
  wasHidden = isHidden;
});
if (leftHud) matchStart.observe(leftHud, { attributes: true, attributeFilter: ["class"] });
media.addEventListener?.("change", resetForViewport);
resetForViewport();

window.__AXM_MOBILE_SKIRMISH_HUD__ = Object.freeze({
  current: () => current,
  select: view => setMobileSkirmishView(view)
});
