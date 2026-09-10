const studio = document.getElementById("studio");
const workspace = document.getElementById("mobileWorkspace");

if (studio && workspace) {
  const panes = ["world", "author", "content"];
  const buttons = [...workspace.querySelectorAll("[data-mobile-pane]")];

  function selectPane(nextPane, { focus = false } = {}) {
    if (!panes.includes(nextPane)) return false;
    studio.dataset.mobilePane = nextPane;
    for (const button of buttons) {
      const selected = button.dataset.mobilePane === nextPane;
      button.setAttribute("aria-pressed", String(selected));
      if (selected && focus) button.focus();
    }
    return true;
  }

  workspace.addEventListener("click", event => {
    const button = event.target.closest("[data-mobile-pane]");
    if (!button || !workspace.contains(button)) return;
    selectPane(button.dataset.mobilePane);
  });

  workspace.addEventListener("keydown", event => {
    const current = event.target.closest("[data-mobile-pane]");
    if (!current) return;
    const index = panes.indexOf(current.dataset.mobilePane);
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = panes[(index + 1) % panes.length];
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = panes[(index - 1 + panes.length) % panes.length];
    if (event.key === "Home") next = panes[0];
    if (event.key === "End") next = panes[panes.length - 1];
    if (!next) return;
    event.preventDefault();
    selectPane(next, { focus: true });
  });

  selectPane(studio.dataset.mobilePane || "author");
}
