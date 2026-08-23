let timer = null;

function attach() {
  const api = window.__AXM_DEFEND_WORKSHOP__;
  const metrics = api?.metrics;
  const button = document.getElementById("repairBtn");
  if (!api?.state || !metrics || !button || button.dataset.axmMetricsRepairCaptureBound) return false;
  button.dataset.axmMetricsRepairCaptureBound = "1";
  button.addEventListener("click", () => {
    if (!api.state.started || api.state.ended || !api.state.workshop?.parent) return;
    const beforeHp = Number(api.state.workshop.userData.hp || 0);
    const beforeSupply = Number(api.state.supply || 0);
    setTimeout(() => {
      const afterHp = Number(api.state.workshop?.userData?.hp || 0);
      const afterSupply = Number(api.state.supply || 0);
      if (afterHp > beforeHp && afterSupply < beforeSupply) {
        metrics.repairs++;
        metrics.manualRepairHp += afterHp - beforeHp;
      }
    }, 0);
  }, { capture: true });
  return true;
}

if (!attach()) {
  timer = setInterval(() => {
    if (attach() && timer) clearInterval(timer);
  }, 120);
}
