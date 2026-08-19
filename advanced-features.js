/* Sayeed Calculator - Advanced Features Pack v1
   Add this AFTER app.js:
   <script src="./advanced-features.js" defer></script>
   Additive only: existing calculator engine is untouched.
*/
(() => {
  "use strict";

  const KEY = "sayeed_history";
  const $ = s => document.querySelector(s);

  const read = () => {
    try {
      const x = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(x) ? x : [];
    } catch { return []; }
  };

  const toast = msg => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(window.__advToast);
    window.__advToast = setTimeout(() => el.classList.remove("show"), 1600);
  };

  const download = (name, data, type) => {
    const blob = new Blob([data], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  function exportJSON() {
    const history = read();
    if (!history.length) return toast("No calculations to export");
    download(
      `Sayeed-Calculator-Backup-${new Date().toISOString().slice(0,10)}.json`,
      JSON.stringify({
        app: "Sayeed Calculator",
        version: 1,
        exportedAt: new Date().toISOString(),
        history
      }, null, 2),
      "application/json;charset=utf-8"
    );
    toast("JSON backup exported");
  }

  function csvCell(v) {
    return `"${String(v ?? "").replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    const history = read();
    if (!history.length) return toast("No calculations to export");

    const rows = [["No.","Expression","Result"]];
    history.forEach((x,i) => rows.push([i+1, x.e || "", x.r || ""]));

    download(
      `Sayeed-Calculator-History-${new Date().toISOString().slice(0,10)}.csv`,
      "\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n"),
      "text/csv;charset=utf-8"
    );
    toast("CSV exported");
  }

  function restoreBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        const history = Array.isArray(data) ? data : data.history;
        if (!Array.isArray(history)) throw 0;

        const clean = history
          .filter(x => x && typeof x === "object")
          .map(x => ({e:String(x.e ?? ""), r:String(x.r ?? ""), ...(x.t ? {t:x.t} : {})}))
          .filter(x => x.e || x.r)
          .slice(0, 1000);

        localStorage.setItem(KEY, JSON.stringify(clean));
        toast(`${clean.length} calculations restored`);
        setTimeout(() => location.reload(), 400);
      } catch {
        toast("Invalid backup file");
      }
    };
    reader.readAsText(file);
  }

  function formatNumber(n) {
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n) >= 1e9 || (Math.abs(n) > 0 && Math.abs(n) < 1e-6))
      return n.toExponential(2);
    return String(Number(n.toFixed(6)));
  }

  function refreshStats() {
    const panel = $("#sayeedAdvancedPanel");
    if (!panel) return;

    const h = read();
    const nums = h.map(x => Number(x.r)).filter(Number.isFinite);
    const avg = nums.length ? nums.reduce((a,b) => a+b, 0) / nums.length : NaN;
    const ops = h.reduce((n,x) => n + (String(x.e || "").match(/[+\\-×÷*/^]/g) || []).length, 0);

    panel.querySelector(".adv-stats").innerHTML = `
      <div><span>Total</span><b>${h.length}</b></div>
      <div><span>Operators</span><b>${ops}</b></div>
      <div><span>Numeric results</span><b>${nums.length}</b></div>
      <div><span>Average</span><b>${formatNumber(avg)}</b></div>
    `;
  }

  function addPanel() {
    if ($("#sayeedAdvancedPanel")) return;

    const history = $("#historySection") || $("#history") || document.querySelector(".history");
    if (!history) return;

    const panel = document.createElement("section");
    panel.id = "sayeedAdvancedPanel";
    panel.innerHTML = `
      <div class="adv-head">
        <div><small>SMART INSIGHTS</small><h3>Advanced Tools</h3></div>
        <em>LOCAL</em>
      </div>
      <div class="adv-stats">
        <div><span>Total</span><b>0</b></div>
        <div><span>Operators</span><b>0</b></div>
        <div><span>Numeric results</span><b>0</b></div>
        <div><span>Average</span><b>—</b></div>
      </div>
      <div class="adv-buttons">
        <button data-adv="json">Backup JSON</button>
        <button data-adv="csv">Export CSV</button>
        <button data-adv="restore">Restore</button>
        <button data-adv="refresh">Refresh</button>
      </div>
    `;

    history.appendChild(panel);

    panel.addEventListener("click", e => {
      const b = e.target.closest("[data-adv]");
      if (!b) return;

      if (b.dataset.adv === "json") exportJSON();
      if (b.dataset.adv === "csv") exportCSV();
      if (b.dataset.adv === "refresh") {
        refreshStats();
        toast("Stats refreshed");
      }
      if (b.dataset.adv === "restore") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = () => {
          if (input.files[0]) restoreBackup(input.files[0]);
        };
        input.click();
      }
    });

    refreshStats();
  }

  function styles() {
    if ($("#sayeedAdvancedStyles")) return;
    const s = document.createElement("style");
    s.id = "sayeedAdvancedStyles";
    s.textContent = `
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
      #sayeedAdvancedPanel button:active{transform:scale(.96)}
      @media(max-width:520px){#sayeedAdvancedPanel .adv-stats{grid-template-columns:repeat(2,1fr)}#sayeedAdvancedPanel button{flex:1 1 calc(50% - 7px)}}
    `;
    document.head.appendChild(s);
  }

  function init() {
    styles();
    addPanel();
    setTimeout(addPanel, 400);
    setTimeout(refreshStats, 800);
    let last = localStorage.getItem(KEY);
    setInterval(() => {
      const now = localStorage.getItem(KEY);
      if (now !== last) { last = now; refreshStats(); }
    }, 1200);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, {once:true})
    : init();
})();

