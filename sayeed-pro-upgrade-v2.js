/* Sayeed Calculator — Pro Upgrade Pack v2
   Additive-only enhancement layer.
   Put this AFTER app.js and advanced-features.js.
   No calculator-engine replacement, no eval(), no dependencies.
*/
(() => {
  "use strict";

  const HISTORY_KEY = "sayeed_history";
  const PIN_KEY = "sayeed_pinned";
  const FAV_KEY = "sayeed_favorites";
  const SETTINGS_KEY = "sayeed_pro_settings";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  const readHistory = () => {
    try {
      const v = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  };

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  };

  const writeJSON = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  };

  const toast = (message) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__sayeedProToast);
    window.__sayeedProToast = setTimeout(() => el.classList.remove("show"), 1700);
  };

  const today = () => new Date().toISOString().slice(0, 10);

  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));

  const download = (filename, data, type) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.position = "fixed";
    a.style.left = "-9999px";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1200);
  };

  const getPinned = () => readJSON(PIN_KEY, []);
  const setPinned = v => writeJSON(PIN_KEY, v);
  const getFavorites = () => readJSON(FAV_KEY, []);
  const setFavorites = v => writeJSON(FAV_KEY, v);

  const idOf = item => `${item?.t || ""}|${item?.e || ""}|${item?.r || ""}`;

  const settings = Object.assign({
    compact: false,
    autoScroll: true,
    confirmClear: true
  }, readJSON(SETTINGS_KEY, {}));

  const saveSettings = () => writeJSON(SETTINGS_KEY, settings);

  /* ---------- CSS injected by JS: one-file installation ---------- */
  function injectStyles() {
    if ($("#sayeedProStyles")) return;
    const style = document.createElement("style");
    style.id = "sayeedProStyles";
    style.textContent = `
      #sayeedProHub{margin:14px 0 0;padding:16px;border:1px solid rgba(130,160,210,.18);
        border-radius:24px;background:linear-gradient(145deg,rgba(9,18,34,.92),rgba(8,13,27,.86));
        box-shadow:0 18px 50px rgba(0,0,0,.16);backdrop-filter:blur(16px)}
      #sayeedProHub *{box-sizing:border-box}
      .sph-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      .sph-kicker{font-size:10px;letter-spacing:3px;color:#16d9ff;font-weight:800}
      .sph-title{font-size:20px;font-weight:800;margin-top:4px}
      .sph-sub{font-size:12px;opacity:.55;margin-top:3px}
      .sph-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
      .sph-stat{padding:12px;border:1px solid rgba(140,170,220,.13);border-radius:16px;background:rgba(255,255,255,.025)}
      .sph-stat span{display:block;font-size:10px;opacity:.52;margin-bottom:5px}
      .sph-stat b{font-size:16px}
      .sph-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
      .sph-btn{border:1px solid rgba(140,170,220,.15);background:rgba(30,52,82,.42);color:inherit;
        border-radius:14px;padding:10px 8px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
      .sph-btn:active{transform:scale(.98)}
      .sph-btn.primary{background:linear-gradient(135deg,#786cff,#08bfff);color:#fff;border:0}
      .sph-tools{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:8px;margin-top:10px}
      .sph-input,.sph-select{width:100%;min-width:0;padding:11px 12px;border-radius:13px;border:1px solid rgba(140,170,220,.14);
        background:rgba(255,255,255,.035);color:inherit;outline:none}
      .sph-list{margin-top:10px;display:grid;gap:7px;max-height:320px;overflow:auto}
      .sph-row{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px 12px;border-radius:14px;
        border:1px solid rgba(140,170,220,.11);background:rgba(255,255,255,.018)}
      .sph-exp{font-size:12px;opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .sph-result{font-size:15px;font-weight:800;margin-top:3px}
      .sph-meta{font-size:10px;opacity:.42;margin-top:3px}
      .sph-row-actions{display:flex;align-items:center;gap:5px}
      .sph-mini{width:30px;height:30px;border-radius:10px;border:1px solid rgba(140,170,220,.12);
        background:rgba(255,255,255,.035);color:inherit;cursor:pointer}
      .sph-mini.active{color:#ffd65a}
      .sph-empty{text-align:center;padding:18px;opacity:.5;font-size:12px}
      .sph-overlay{position:fixed;inset:0;z-index:9999;background:rgba(2,6,14,.68);backdrop-filter:blur(10px);
        display:none;align-items:center;justify-content:center;padding:18px}
      .sph-overlay.show{display:flex}
      .sph-modal{width:min(560px,100%);max-height:88vh;overflow:auto;border:1px solid rgba(150,180,230,.18);
        border-radius:24px;background:#091221;padding:18px;box-shadow:0 30px 90px rgba(0,0,0,.45)}
      .sph-modal h3{margin:0 0 8px;font-size:19px}
      .sph-modal p{font-size:12px;opacity:.6;margin:0 0 14px;line-height:1.5}
      .sph-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(140,170,220,.1)}
      .sph-setting:last-child{border:0}
      .sph-setting label{font-size:13px}
      .sph-setting small{display:block;opacity:.48;margin-top:3px}
      .sph-switch{width:46px;height:26px;border-radius:99px;border:0;background:#26354b;position:relative;cursor:pointer}
      .sph-switch i{position:absolute;width:20px;height:20px;top:3px;left:3px;border-radius:50%;background:#fff;transition:.2s}
      .sph-switch.on{background:linear-gradient(135deg,#786cff,#08bfff)}
      .sph-switch.on i{transform:translateX(20px)}
      .sph-close{margin-top:14px;width:100%}
      .sayeed-pro-pin{position:absolute;right:42px;top:9px;border:0;background:transparent;color:#ffd65a;cursor:pointer;font-size:15px}
      .history-item{position:relative}
      .sayeed-pro-fav{position:absolute;right:9px;top:8px;border:0;background:transparent;color:#66758c;cursor:pointer;font-size:15px;z-index:2}
      .sayeed-pro-fav.active{color:#ffd65a}
      body.sayeed-pro-compact .history-item{padding-top:9px!important;padding-bottom:9px!important}
      body.sayeed-pro-compact #sayeedProHub{padding:12px}
      @media(max-width:620px){
        .sph-grid{grid-template-columns:repeat(2,1fr)}
        .sph-actions{grid-template-columns:repeat(2,1fr)}
        .sph-tools{grid-template-columns:1fr}
        #sayeedProHub{border-radius:20px}
      }
    `;
    document.head.appendChild(style);
  }

  function stats(history) {
    const now = Date.now();
    const day = history.filter(x => Number(x.t) && now - Number(x.t) <= 86400000).length;
    const nums = history.map(x => Number(x.r)).filter(Number.isFinite);
    const avg = nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : NaN;
    const operators = history.reduce((n,x) => n + (String(x.e||"").match(/[+\-×÷*/^]/g)||[]).length, 0);
    return { total:history.length, today:day, pinned:getPinned().length, favorites:getFavorites().length, operators, avg };
  }

  function formatNumber(n) {
    if (!Number.isFinite(n)) return "—";
    return Number(n.toPrecision(8)).toString();
  }

  function createHub() {
    if ($("#sayeedProHub")) return;

    const historySection = $("#historySection") || $(".history");
    if (!historySection?.parentNode) return;

    const hub = document.createElement("section");
    hub.id = "sayeedProHub";
    hub.setAttribute("aria-label","Sayeed advanced tools");
    hub.innerHTML = `
      <div class="sph-head">
        <div>
          <div class="sph-kicker">PRO TOOLS</div>
          <div class="sph-title">Smart Workspace</div>
          <div class="sph-sub">Advanced controls — your existing calculator stays untouched.</div>
        </div>
        <button class="sph-btn" data-pro="settings" title="Settings">⚙</button>
      </div>
      <div class="sph-grid">
        <div class="sph-stat"><span>Calculations</span><b data-stat="total">0</b></div>
        <div class="sph-stat"><span>Last 24h</span><b data-stat="today">0</b></div>
        <div class="sph-stat"><span>Pinned</span><b data-stat="pinned">0</b></div>
        <div class="sph-stat"><span>Average</span><b data-stat="avg">—</b></div>
      </div>
      <div class="sph-actions">
        <button class="sph-btn primary" data-pro="smart">✨ Smart view</button>
        <button class="sph-btn" data-pro="favorites">★ Favorites</button>
        <button class="sph-btn" data-pro="print">🖨 Print</button>
        <button class="sph-btn" data-pro="share">↗ Share</button>
      </div>
      <div class="sph-tools">
        <input class="sph-input" id="sphSearch" type="search" placeholder="Search all calculations…">
        <select class="sph-select" id="sphSort" aria-label="Sort history">
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
          <option value="resultHigh">Result high → low</option>
          <option value="resultLow">Result low → high</option>
        </select>
        <select class="sph-select" id="sphFilter" aria-label="Filter history">
          <option value="all">All calculations</option>
          <option value="positive">Positive results</option>
          <option value="negative">Negative results</option>
          <option value="zero">Zero results</option>
          <option value="pinned">Pinned only</option>
        </select>
      </div>
      <div class="sph-list" id="sphList"></div>
    `;
    historySection.parentNode.insertBefore(hub, historySection);

    const overlay = document.createElement("div");
    overlay.className = "sph-overlay";
    overlay.id = "sphOverlay";
    overlay.innerHTML = `
      <div class="sph-modal" role="dialog" aria-modal="true" aria-label="Pro settings">
        <h3>Pro Settings</h3>
        <p>These settings are stored only on this device.</p>
        <div class="sph-setting">
          <div><label>Compact workspace</label><small>Reduce spacing in history.</small></div>
          <button class="sph-switch" data-setting="compact"><i></i></button>
        </div>
        <div class="sph-setting">
          <div><label>Auto scroll after calculation</label><small>Keep the current calculator position unchanged by default.</small></div>
          <button class="sph-switch" data-setting="autoScroll"><i></i></button>
        </div>
        <div class="sph-setting">
          <div><label>Confirm clear history</label><small>Ask before deleting all saved calculations.</small></div>
          <button class="sph-switch" data-setting="confirmClear"><i></i></button>
        </div>
        <button class="sph-btn sph-close" data-pro="closeSettings">Close</button>
      </div>
    `;
    document.body.appendChild(overlay);

    bindHub();
    renderAll();
    applySettings();
  }

  function decorateNativeHistory() {
    const list = $("#historyList");
    if (!list) return;

    const history = readHistory();
    const pinned = getPinned();
    const favorites = getFavorites();

    $$(".history-item", list).forEach(node => {
      const idx = Number(node.dataset.index);
      const item = history[idx];
      if (!item) return;
      const id = idOf(item);

      if (!node.querySelector(".sayeed-pro-fav")) {
        const fav = document.createElement("button");
        fav.className = "sayeed-pro-fav" + (favorites.includes(id) ? " active" : "");
        fav.textContent = "★";
        fav.title = "Favorite";
        fav.dataset.proFav = id;
        node.appendChild(fav);
      }
      if (!node.querySelector(".sayeed-pro-pin")) {
        const pin = document.createElement("button");
        pin.className = "sayeed-pro-pin";
        pin.textContent = pinned.includes(id) ? "📌" : "☆";
        pin.title = pinned.includes(id) ? "Unpin" : "Pin";
        pin.dataset.proPin = id;
        node.appendChild(pin);
      }
    });
  }

  function sortedFiltered(history) {
    const q = ($("#sphSearch")?.value || "").trim().toLowerCase();
    const sort = $("#sphSort")?.value || "new";
    const filter = $("#sphFilter")?.value || "all";
    let list = history.slice();

    if (q) list = list.filter(x => `${x.e} ${x.r}`.toLowerCase().includes(q));

    if (filter === "positive") list = list.filter(x => Number(x.r) > 0);
    if (filter === "negative") list = list.filter(x => Number(x.r) < 0);
    if (filter === "zero") list = list.filter(x => Number(x.r) === 0);
    if (filter === "pinned") {
      const pins = getPinned();
      list = list.filter(x => pins.includes(idOf(x)));
    }

    if (sort === "old") list.sort((a,b)=>(a.t||0)-(b.t||0));
    if (sort === "resultHigh") list.sort((a,b)=>(Number(b.r)||0)-(Number(a.r)||0));
    if (sort === "resultLow") list.sort((a,b)=>(Number(a.r)||0)-(Number(b.r)||0));

    return list;
  }

  function renderAll() {
    const h = readHistory();
    const s = stats(h);
    $$("[data-stat]").forEach(el => {
      const key = el.dataset.stat;
      el.textContent = key === "avg" ? formatNumber(s.avg) : String(s[key] ?? 0);
    });

    const list = $("#sphList");
    if (list) {
      const items = sortedFiltered(h);
      if (!items.length) {
        list.innerHTML = `<div class="sph-empty">No matching calculations.</div>`;
      } else {
        const pins = getPinned();
        const favs = getFavorites();
        list.innerHTML = items.map(item => {
          const id = idOf(item);
          const when = item.t ? new Date(Number(item.t)).toLocaleString() : "Saved calculation";
          return `
            <div class="sph-row">
              <div>
                <div class="sph-exp">${escapeHTML(item.e || "")}</div>
                <div class="sph-result">= ${escapeHTML(item.r || "")}</div>
                <div class="sph-meta">${escapeHTML(when)}</div>
              </div>
              <div class="sph-row-actions">
                <button class="sph-mini ${pins.includes(id)?"active":""}" data-pro-row-pin="${escapeHTML(id)}" title="Pin">${pins.includes(id)?"📌":"☆"}</button>
                <button class="sph-mini ${favs.includes(id)?"active":""}" data-pro-row-fav="${escapeHTML(id)}" title="Favorite">${favs.includes(id)?"★":"☆"}</button>
                <button class="sph-mini" data-pro-copy="${escapeHTML(item.r||"")}" title="Copy result">⧉</button>
              </div>
            </div>`;
        }).join("");
      }
    }
    decorateNativeHistory();
  }

  function togglePin(id) {
    const pins = getPinned();
    const next = pins.includes(id) ? pins.filter(x => x !== id) : [...pins, id];
    setPinned(next.slice(-200));
    renderAll();
    toast(next.includes(id) ? "Calculation pinned" : "Calculation unpinned");
  }

  function toggleFavorite(id) {
    const favs = getFavorites();
    const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
    setFavorites(next.slice(-200));
    renderAll();
    toast(next.includes(id) ? "Added to favorites" : "Removed from favorites");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); toast("Copied"); }
      catch { toast("Copy unavailable"); }
      area.remove();
    }
  }

  function showFavorites() {
    const favs = getFavorites();
    const h = readHistory().filter(x => favs.includes(idOf(x)));
    if (!h.length) return toast("No favorites yet");
    $("#sphSearch").value = "";
    $("#sphFilter").value = "all";
    $("#sphSort").value = "new";
    const list = $("#sphList");
    list.innerHTML = h.map(item => `
      <div class="sph-row">
        <div><div class="sph-exp">${escapeHTML(item.e)}</div><div class="sph-result">= ${escapeHTML(item.r)}</div></div>
        <div class="sph-row-actions"><button class="sph-mini" data-pro-row-fav="${escapeHTML(idOf(item))}">★</button></div>
      </div>`).join("");
    toast(`${h.length} favorite${h.length===1?"":"s"} shown`);
  }

  function smartView() {
    $("#sphSearch").value = "";
    $("#sphSort").value = "new";
    $("#sphFilter").value = "all";
    renderAll();
    toast("Smart view refreshed");
  }

  function printReport() {
    const h = readHistory();
    if (!h.length) return toast("Nothing to print");
    const rows = h.map((x,i)=>`<tr><td>${i+1}</td><td>${escapeHTML(x.e)}</td><td>${escapeHTML(x.r)}</td><td>${x.t?new Date(x.t).toLocaleString():""}</td></tr>`).join("");
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return toast("Allow pop-ups to print");
    win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Sayeed Calculator Report</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 6px}p{color:#555}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f3f3}@media print{button{display:none}}</style>
      </head><body><h1>Sayeed Calculator</h1><p>Calculation Report • ${escapeHTML(new Date().toLocaleString())}</p><table><thead><tr><th>#</th><th>Expression</th><th>Result</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  }

  async function shareReport() {
    const h = readHistory();
    if (!h.length) return toast("Nothing to share");
    const text = `Sayeed Calculator — ${h.length} calculations\n\n` +
      h.slice(0,20).map((x,i)=>`${i+1}. ${x.e} = ${x.r}`).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title:"Sayeed Calculator", text });
        toast("Shared");
      } else {
        await copyText(text);
        toast("Report copied");
      }
    } catch {}
  }

  function exportProCSV() {
    const h = readHistory();
    if (!h.length) return toast("Nothing to export");
    const cell = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const rows = [["No","Expression","Result","Timestamp","Pinned","Favorite"]];
    const pins=getPinned(), favs=getFavorites();
    h.forEach((x,i)=>rows.push([i+1,x.e,x.r,x.t?new Date(x.t).toISOString():"",pins.includes(idOf(x)),favs.includes(idOf(x))]));
    download(`Sayeed-Pro-History-${today()}.csv`,"\uFEFF"+rows.map(r=>r.map(cell).join(",")).join("\r\n"),"text/csv;charset=utf-8");
    toast("Pro CSV exported");
  }

  function backupAll() {
    const payload = {
      app:"Sayeed Calculator",
      format:"sayeed-pro-backup",
      version:2,
      exportedAt:new Date().toISOString(),
      history:readHistory(),
      pinned:getPinned(),
      favorites:getFavorites(),
      settings
    };
    download(`Sayeed-Pro-Backup-${today()}.json`,JSON.stringify(payload,null,2),"application/json;charset=utf-8");
    toast("Full backup exported");
  }

  function restoreAll(file) {
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(String(reader.result||""));
        if(!Array.isArray(data.history)) throw new Error();
        const clean=data.history.filter (x=>x&&typeof x==="object"&&("e"in x||"r"in x))
          .map(x=>({e:String(x.e??""),r:String(x.r??""),t:Number(x.t)||Date.now()})).slice(0,1000);
        writeJSON(HISTORY_KEY,clean);
        writeJSON(PIN_KEY,Array.isArray(data.pinned)?data.pinned:[]);
        writeJSON(FAV_KEY,Array.isArray(data.favorites)?data.favorites:[]);
        toast(`${clean.length} calculations restored`);
      setTimeout(()=>location.reload(),450);
      }catch{toast("Invalid Pro backup")}
    };
    reader.readAsText(file);
  }

  function openSettings() {
    const o=$("#sphOverlay");
    if (!o) return;
    $$(".sph-switch",o).forEach(btn=>btn.classList.toggle("on",!!settings[btn.dataset.setting]));
    o.classList.add("show");
  }

  function closeSettings(){ $("#sphOverlay")?.classList.remove("show");
  }
  function applySettings(){
    document.body.classList.toggle("sayeed-pro-compact",!!settings.compact);
    if ($("#sphOverlay")) $$(".sph-switch",$("#sphOverlay")).forEach(btn=>btn.classList.toggle("on",!!settings[btn.dataset.setting]));
  }

  function clearAllWithConfirm(){
    if (settings.confirmClear && !confirm("Clear all calculator history? This cannot be undone unless you have a backup.")) return;
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(FAV_KEY);
    toast("History cleared");
    setTimeout(()=>location.reload(),300);
  }

  function addImportExportMenu() {
    if ($("#sphMenu")) return;
    const menu=document.createElement("div");
    menu.id="sphMenu";

menu.style.cssText="position:fixed;z-index:10000;display:none;padding:8px;border:1px solid rgba(150,180,230,.18);border-radius:16px;background:#091221;box-shadow:0 20px 60px rgba(0,0,0,.35)";
    menu.innerHTML=`
      <button class="sph-btn" data-pro="backup">💾 Full backup</button>
      <button class="sph-btn" data-pro="csv">📊 Pro CSV</button>
      <button class="sph-btn" data-pro="restore">♻ Restore backup</button>
      <button class="sph-btn" data-pro="clearPro">🗑 Clear saved history</button>`;
    document.body.appendChild(menu);
  }
  function bindHub(){
    const hub=$("#sayeedProHub");
    if (!hub) return;

    hub.addEventListener("input",e=>{
      if(e.target.id==="sphSearch") renderAll();
    });
    hub.addEventListener("change",e=>{
      if(e.target.id==="sphSort"||e.target.id==="sphFilter") renderAll();
    });

    hub.addEventListener("click",e=>{
      const b=e.target.closest("button");
      if(!b) return;
      const p=b.dataset.pro;
      if(p==="settings") openSettings();
      if(p==="smart") smartView();
      if(p==="favorites") showFavorites();
      if(p==="print") printReport();
      if(p==="share") shareReport();
      const pin=b.dataset.proRowPin;
      const fav=b.dataset.proRowFav;
      const copy=b.dataset.proCopy;
      if(pin!==undefined) togglePin(pin);
      if(fav!==undefined) toggleFavorite(fav);
      if(copy!==undefined) copyText(copy);
    });

    $("#sphOverlay")?.addEventListener("click",e=>{
      if(e.target.id==="sphOverlay") closeSettings();
      const b=e.target.closest("button");
      if(!b) return;
      if(b.dataset.pro==="closeSettings") closeSettings();
      if(b.dataset.setting){
        const key=b.dataset.setting;
        settings[key]=!settings[key];
        saveSettings();
        applySettings();
      }
    });
    document.addEventListener("click",e=>{
      const pin=e.target.closest("[data-pro-pin]");
      if(pin){e.preventDefault();e.stopPropagation();togglePin(pin.dataset.proPin);return;}
      const fav=e.target.closest("[data-pro-fav]");
      if(fav){e.preventDefault();e.stopPropagation();toggleFavorite(fav.dataset.proFav);return;}
    },true);

    const nativeList=$("#historyList");
    if(nativeList){
      const mo=new MutationObserver(()=>{decorateNativeHistory();});
      mo.observe(nativeList,{childList:true,subtree:true});
    }

/* Existing Export button remains untouched. Add a long-press/right-click style
       menu to the advanced hub only, so old export behavior is never replaced. */
    hub.addEventListener("contextmenu",e=>{
      if(e.target.closest(".sph-btn.primary")){e.preventDefault();showMenuAt(e.clientX,e.clientY);}
    });

    const exportBtn=$("#exportHistory");
    if(exportBtn){
      exportBtn.addEventListener("dblclick",e=>{e.preventDefault();showMenuAt(e.clientX,e.clientY);});
    }
  }
  function showMenuAt(x,y){
    addImportExportMenu();
    const m=$("#sphMenu");
    m.style.display="grid";
    m.style.gap="6px";
    m.style.left=Math.min(x,innerWidth-210)+"px";
    m.style.top=Math.min(y,innerHeight-230)+"px";
  }

  function bindMenu(){
    document.addEventListener("click",e=>{
      const m=$("#sphMenu");
      const b=e.target.closest("[data-pro]");
      if(!b) { if(m) m.style.display="none"; return; }
      const p=b.dataset.pro;
      if(p==="backup") backupAll();
      if(p==="csv") exportProCSV();
      if(p==="restore"){
        const input=document.createElement("input");
        input.type="file"; input.accept=".json,application/json";
        input.onchange=()=>input.files[0]&&restoreAll(input.files[0]);
        input.click();
      }
      if(p==="clearPro") clearAllWithConfirm();
      if(m) m.style.display="none";
    });
  }
function watchHistory(){
    let last="";
    const tick=()=>{
      const raw=localStorage.getItem(HISTORY_KEY)||"";
      if(raw!==last){last=raw;renderAll();}
      decorateNativeHistory();
    };
    tick();
    setInterval(tick,1200);
  }

  function init(){
    if(!document.body) return;
    injectStyles();
    createHub();
    bindMenu();
    watchHistory();
  }

 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
