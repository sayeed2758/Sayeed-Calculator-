/* Sayeed Calculator — Advanced Features compatibility layer
   The original export/restore/stat code was duplicated by later Pro packs.
   This file keeps the legacy entry point and Advanced Tools panel, while
   delegating JSON/CSV export to Pro Suite V3 when available.
*/
(() => {
  "use strict";
  const KEY = "sayeed_history";
  const $ = (s, root = document) => root.querySelector(s);

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__advToast);
    window.__advToast = setTimeout(() => el.classList.remove("show"), 1600);
  }

  function fallbackDownload(name, data, type) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.hidden = true;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function exportJSON() {
    if (window.SayeedProSuiteV3?.exportJSON) return window.SayeedProSuiteV3.exportJSON();
    const history = readHistory();
    if (!history.length) return toast("No calculations to export");
    fallbackDownload(`Sayeed-Calculator-Backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({app:"Sayeed Calculator", version:1, exportedAt:new Date().toISOString(), history}, null, 2), "application/json;charset=utf-8");
    toast("JSON backup exported");
  }

  function exportCSV() {
    if (window.SayeedProSuiteV3?.exportCSV) return window.SayeedProSuiteV3.exportCSV();
    const history = readHistory();
    if (!history.length) return toast("No calculations to export");
    const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["No.","Expression","Result"], ...history.map((x,i)=>[i+1,x.e||"",x.r||""])]
      .map(row => row.map(cell).join(",")).join("\r\n");
    fallbackDownload(`Sayeed-Calculator-History-${new Date().toISOString().slice(0,10)}.csv`, "\uFEFF" + rows, "text/csv;charset=utf-8");
    toast("CSV exported");
  }

  function restoreBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        const history = Array.isArray(data) ? data : data.history;
        if (!Array.isArray(history)) throw new Error();
        const clean = history.filter(x => x && typeof x === "object")
          .map(x => ({ e:String(x.e ?? x.expression ?? ""), r:String(x.r ?? x.result ?? ""), ...(x.t || x.timestamp ? {t:Number(x.t || x.timestamp) || Date.now()} : {}) }))
          .filter(x => x.e || x.r).slice(0, 1000);
        localStorage.setItem(KEY, JSON.stringify(clean));
        toast(`${clean.length} calculations restored`);
        setTimeout(() => location.reload(), 350);
      } catch { toast("Invalid backup file"); }
    };
    reader.readAsText(file);
  }

  function refreshStats() {
    const panel = $("#sayeedAdvancedPanel");
    if (!panel) return;
    const h = readHistory();
    const nums = h.map(x => Number(x.r)).filter(Number.isFinite);
    const avg = nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : NaN;
    const ops = h.reduce((n,x)=>n + (String(x.e || "").match(/[+\-×÷*/^]/g) || []).length, 0);
    panel.querySelector(".adv-stats").innerHTML = `
      <div><span>Total</span><b>${h.length}</b></div>
      <div><span>Operators</span><b>${ops}</b></div>
      <div><span>Numeric results</span><b>${Number.isFinite(avg) ? Number(avg.toPrecision(8)) : "—"}</b></div>
      <div><span>Average</span><b>${Number.isFinite(avg) ? Number(avg.toPrecision(8)) : "—"}</b></div>`;
  }

  function addPanel() {
    if ($("#sayeedAdvancedPanel")) return;
    const history = $("#historySection") || $(".history");
    if (!history) return;
    const panel = document.createElement("section");
    panel.id = "sayeedAdvancedPanel";
    panel.innerHTML = `
      <div class="adv-head"><div><small>SMART INSIGHTS</small><h3>Advanced Tools</h3></div><em>LOCAL</em></div>
      <div class="adv-stats"><div><span>Total</span><b>0</b></div><div><span>Operators</span><b>0</b></div><div><span>Numeric results</span><b>0</b></div><div><span>Average</span><b>—</b></div></div>
      <div class="adv-buttons">
        <button type="button" data-adv="json">Backup JSON</button>
        <button type="button" data-adv="csv">Export CSV</button>
        <button type="button" data-adv="restore">Restore</button>
        <button type="button" data-adv="refresh">Refresh</button>
      </div>`;
    history.appendChild(panel);
    panel.addEventListener("click", e => {
      const b = e.target.closest("[data-adv]");
      if (!b) return;
      const action = b.dataset.adv;
      if (action === "json") exportJSON();
      else if (action === "csv") exportCSV();
      else if (action === "refresh") { refreshStats(); toast("Stats refreshed"); }
      else if (action === "restore") {
        const input = document.createElement("input");
        input.type = "file"; input.accept = ".json,application/json";
        input.onchange = () => input.files?.[0] && restoreBackup(input.files[0]);
        input.click();
      }
    });
    refreshStats();
  }

  const style = document.createElement("style");
  style.textContent = `
    #sayeedAdvancedPanel{margin-top:14px;padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(10,18,34,.72);backdrop-filter:blur(14px)}
    #sayeedAdvancedPanel .adv-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    #sayeedAdvancedPanel small{color:#20dcff;font-weight:800;letter-spacing:.18em}
    #sayeedAdvancedPanel h3{margin:3px 0 0;font-size:18px}
    #sayeedAdvancedPanel em{font-style:normal;font-size:9px;color:#20dcff;border:1px solid rgba(32,220,255,.25);padding:5px 8px;border-radius:20px}
    #sayeedAdvancedPanel .adv-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    #sayeedAdvancedPanel .adv-stats div{padding:10px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06)}
    #sayeedAdvancedPanel span{display:block;color:var(--muted,#7f8ba5);font-size:10px;margin-bottom:4px}
    #sayeedAdvancedPanel b{font-size:15px}
    #sayeedAdvancedPanel .adv-buttons{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
    #sayeedAdvancedPanel button{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);color:inherit;border-radius:11px;padding:9px 11px;font:inherit;font-size:11px}
    @media(max-width:520px){#sayeedAdvancedPanel .adv-stats{grid-template-columns:repeat(2,1fr)}#sayeedAdvancedPanel button{flex:1 1 calc(50% - 7px)}}`;
  document.head.appendChild(style);

  const init = () => { addPanel(); setTimeout(addPanel, 350); setTimeout(refreshStats, 700); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init, {once:true}) : init();
})();
