/* =========================================================
   SAYEED CALCULATOR — PRO SUITE V3
   Additive upgrade: does NOT replace app.js or other modules.
   20 lightweight professional features in one file.
   ========================================================= */
(() => {
  "use strict";

  const KEY = "sayeed_pro_suite_v3";
  const HISTORY_KEYS = ["sayeed_history", "calculatorHistory", "ezee_history", "history"];
  const defaults = {
    precision: 10,
    format: "normal",
    sound: false,
    vibration: true,
    wakeLock: false,
    favorites: [],
    session: { expression: "", result: "" }
  };

  let state = loadState();
  let wakeLock = null;
  let lastResult = "";
  let lastExpression = "";

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { ...defaults, ...saved, session: { ...defaults.session, ...(saved.session || {}) } };
    } catch {
      return structuredClone ? structuredClone(defaults) : JSON.parse(JSON.stringify(defaults));
    }
  }

  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  function $(sel, root = document) {
    try { return root.querySelector(sel); } catch { return null; }
  }

  function $$ (sel, root = document) {
    try { return [...root.querySelectorAll(sel)]; } catch { return []; }
  }

  function getDisplay() {
    return (
      $("#expression") ||
      $("#display") ||
      $(".calculator-display") ||
      $("input[readonly]") ||
      $("input[type='text']")
    );
  }

  function readDisplay() {
    const el = getDisplay();
    if (!el) return "";
    return "value" in el ? String(el.value || "") : String(el.textContent || "");
  }

  function findResultText() {
    const candidates = [
      "#result", "#displayResult", ".result", ".display-result",
      ".result-value", ".display__result", "[data-result]"
    ];
    for (const s of candidates) {
      const el = $(s);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return readDisplay();
  }

  function toast(message, type = "info") {
    let t = $("#sayeedProToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "sayeedProToast";
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.dataset.type = type;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  function beep() {
    if (!state.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 620;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {}
  }

  function vibrate(pattern = 8) {
    if (state.vibration && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch {}
    }
  }

  function copyText(text) {
    if (!text) return toast("Nothing to copy");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast("Copied ✓", "success"),
        () => fallbackCopy(text)
      );
    } else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("Copied ✓", "success"); }
    catch { toast("Copy unavailable", "error"); }
    ta.remove();
  }

  function getHistory() {
    for (const key of HISTORY_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.history)) return data.history;
      } catch {}
    }
    return [];
  }

  function normalizeHistory() {
    return getHistory().map((item, i) => {
      if (typeof item === "string") return { expression: item, result: "", index: i };
      return {
        expression: item.expression ?? item.expr ?? item.input ?? "",
        result: item.result ?? item.answer ?? item.output ?? "",
        timestamp: item.timestamp ?? item.time ?? "",
        index: i
      };
    });
  }

  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJSON() {
    const payload = {
      app: "Sayeed Calculator",
      version: "Pro Suite V3",
      exportedAt: new Date().toISOString(),
      history: normalizeHistory(),
      favorites: state.favorites,
      settings: {
        precision: state.precision,
        format: state.format,
        sound: state.sound,
        vibration: state.vibration
      }
    };
    downloadFile("sayeed-calculator-backup.json", JSON.stringify(payload, null, 2), "application/json");
    toast("Backup exported ✓", "success");
  }

  function exportCSV() {
    const rows = normalizeHistory();
    const esc = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [
      ["Expression", "Result", "Timestamp"],
      ...rows.map(x => [x.expression, x.result, x.timestamp])
    ].map(r => r.map(esc).join(",")).join("\n");
    downloadFile("sayeed-calculation-history.csv", csv, "text/csv;charset=utf-8");
    toast("CSV exported ✓", "success");
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.history)) throw new Error("Invalid backup");
        const target = HISTORY_KEYS[0];
        localStorage.setItem(target, JSON.stringify(data.history));
        if (Array.isArray(data.favorites)) state.favorites = data.favorites;
        saveState();
        toast("Backup imported. Reloading…", "success");
        setTimeout(() => location.reload(), 700);
      } catch {
        toast("Invalid backup file", "error");
      }
    };
    reader.readAsText(file);
  }

  function addFavorite() {
    const expression = lastExpression || readDisplay();
    const result = lastResult || findResultText();
    if (!expression && !result) return toast("Nothing to save");
    const item = { expression, result, savedAt: Date.now() };
    state.favorites = [item, ...state.favorites.filter(x =>
      x.expression !== expression || x.result !== result
    )].slice(0, 50);
    saveState();
    toast("Saved to favorites ★", "success");
  }

  function showFavorites() {
    const list = state.favorites;
    if (!list.length) return toast("No favorites yet");
    const body = list.map((x, i) =>
      `<button class="sp-row" data-fav="${i}">
        <span><b>${escapeHTML(x.expression || "Result")}</b><small>= ${escapeHTML(x.result)}</small></span>
        <i>↗</i>
      </button>`
    ).join("");
    openModal("Favorites", `<div class="sp-list">${body}</div>`);
    $$(".sp-row[data-fav]").forEach(btn => {
      btn.onclick = () => {
        const x = state.favorites[Number(btn.dataset.fav)];
        if (x?.expression) copyText(`${x.expression} = ${x.result}`);
      };
    });
  }

  function showStats() {
    const rows = normalizeHistory();
    const nums = rows.map(x => Number(String(x.result).replace(/,/g, ""))).filter(Number.isFinite);
    const total = rows.length;
    const avg = nums.length ? nums.reduce((a,b) => a+b, 0) / nums.length : 0;
    const max = nums.length ? Math.max(...nums) : 0;
    const min = nums.length ? Math.min(...nums) : 0;
    openModal("Calculation Insights", `
      <div class="sp-stats">
        <div><b>${total}</b><span>Total calculations</span></div>
        <div><b>${state.favorites.length}</b><span>Favorites</span></div>
        <div><b>${formatNumber(avg)}</b><span>Average result</span></div>
        <div><b>${formatNumber(max)}</b><span>Highest result</span></div>
        <div><b>${formatNumber(min)}</b><span>Lowest result</span></div>
      </div>
    `);
  }

  function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value ?? "");
    const p = Math.max(0, Math.min(16, Number(state.precision) || 10));
    if (state.format === "scientific") return n.toExponential(Math.min(p, 12));
    if (state.format === "engineering") {
      if (n === 0) return "0";
      const exp = Math.floor(Math.log10(Math.abs(n)) / 3) * 3;
      return `${(n / 10 ** exp).toPrecision(Math.min(12, p))}e${exp >= 0 ? "+" : ""}${exp}`;
    }
    return Number(n.toPrecision(Math.min(15, Math.max(1, p)))).toLocaleString("en-US", {
      maximumFractionDigits: Math.min(12, p)
    });
  }

  function applyFormatToVisibleResult() {
    const text = findResultText();
    const n = Number(String(text).replace(/,/g, ""));
    if (Number.isFinite(n)) {
      const el = $("#result") || $("#displayResult") || $(".result-value");
      if (el) el.textContent = formatNumber(n);
      toast("Display format applied");
    } else toast("No numeric result detected");
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(
        () => toast("Fullscreen enabled"),
        () => toast("Fullscreen unavailable", "error")
      );
    } else document.exitFullscreen?.();
  }

  async function toggleWakeLock() {
    if (!("wakeLock" in navigator)) return toast("Wake Lock not supported");
    try {
      if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
        state.wakeLock = false;
        saveState();
        toast("Screen lock disabled");
      } else {
        wakeLock = await navigator.wakeLock.request("screen");
        state.wakeLock = true;
        saveState();
        toast("Screen stays awake ✓");
        wakeLock.addEventListener?.("release", () => { wakeLock = null; });
      }
    } catch {
      toast("Wake Lock unavailable", "error");
    }
  }

  function escapeHTML(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
  }

  function openModal(title, html) {
    closeModal();
    const modal = document.createElement("div");
    modal.id = "sayeedProModal";
    modal.innerHTML = `
      <div class="sp-backdrop" data-close></div>
      <section class="sp-modal" role="dialog" aria-modal="true">
        <header><h3>${escapeHTML(title)}</h3><button class="sp-close" data-close>×</button></header>
        <div class="sp-modal-body">${html}</div>
      </section>`;
    document.body.appendChild(modal);
    $$("[data-close]", modal).forEach(x => x.onclick = closeModal);
  }

  function closeModal() {
    $("#sayeedProModal")?.remove();
  }

  function showSettings() {
    openModal("Pro Settings", `
      <label class="sp-setting">Result precision
        <select id="spPrecision">
          ${[4,6,8,10,12,15].map(x => `<option ${state.precision===x?"selected":""}>${x}</option>`).join("")}
        </select>
      </label>
      <label class="sp-setting">Number format
        <select id="spFormat">
          <option value="normal" ${state.format==="normal"?"selected":""}>Normal</option>
          <option value="scientific" ${state.format==="scientific"?"selected":""}>Scientific</option>
          <option value="engineering" ${state.format==="engineering"?"selected":""}>Engineering</option>
        </select>
      </label>
      <label class="sp-switch"><input id="spSound" type="checkbox" ${state.sound?"checked":""}> Button sound</label>
      <label class="sp-switch"><input id="spVibration" type="checkbox" ${state.vibration?"checked":""}> Haptic feedback</label>
      <button class="sp-primary" id="spApply">Save settings</button>
    `);
    $("#spApply").onclick = () => {
      state.precision = Number($("#spPrecision").value);
      state.format = $("#spFormat").value;
      state.sound = $("#spSound").checked;
      state.vibration = $("#spVibration").checked;
      saveState();
      closeModal();
      toast("Settings saved ✓", "success");
      applyFormatToVisibleResult();
    };
  }

  function showShortcuts() {
    openModal("Keyboard Shortcuts", `
      <div class="sp-shortcuts">
        <p><kbd>0–9</kbd> Numbers</p>
        <p><kbd>+ − × ÷</kbd> Operators</p>
        <p><kbd>Enter</kbd> Calculate</p>
        <p><kbd>Backspace</kbd> Delete</p>
        <p><kbd>Esc</kbd> Clear</p>
        <p><kbd>Ctrl / ⌘ + K</kbd> Open Pro Suite</p>
        <p><kbd>Ctrl / ⌘ + Shift + C</kbd> Copy result</p>
      </div>
    `);
  }

  function createUI() {
    if ($("#sayeedProLauncher")) return;

    const style = document.createElement("style");
    style.textContent = `
      #sayeedProLauncher{
        position:fixed;right:16px;bottom:18px;z-index:9998;
        width:54px;height:54px;border:1px solid rgba(255,255,255,.15);
        border-radius:18px;background:linear-gradient(135deg,#6f62ff,#00b7ff);
        color:#fff;font:800 13px system-ui;box-shadow:0 12px 32px rgba(0,130,255,.25);
        cursor:pointer;transition:transform .18s ease,box-shadow .18s ease;
      }
      #sayeedProLauncher:active{transform:scale(.93)}
      #sayeedProPanel{
        position:fixed;right:16px;bottom:82px;z-index:9997;width:min(340px,calc(100vw - 32px));
        max-height:min(70vh,560px);overflow:auto;padding:14px;border:1px solid rgba(255,255,255,.12);
        border-radius:24px;background:rgba(7,14,29,.94);backdrop-filter:blur(20px);
        -webkit-backdrop-filter:blur(20px);box-shadow:0 24px 70px rgba(0,0,0,.45);
        color:#eaf2ff;display:none;font-family:system-ui,sans-serif;
      }
      #sayeedProPanel.open{display:block;animation:spIn .18s ease}
      @keyframes spIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
      .sp-head{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 12px}
      .sp-head b{font-size:17px}.sp-head small{display:block;color:#8090aa;margin-top:2px}
      .sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .sp-btn,.sp-primary,.sp-close,.sp-row{
        border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(22,39,65,.9);
        color:#dce9ff;padding:12px 10px;font:650 13px system-ui;cursor:pointer;
      }
      .sp-btn:active,.sp-primary:active{transform:scale(.98)}
      .sp-btn span{display:block;font-size:17px;margin-bottom:4px}.sp-btn small{color:#8292aa}
      .sp-primary{width:100%;margin-top:12px;background:linear-gradient(135deg,#6f62ff,#00aef5);color:#fff}
      #sayeedProToast{
        position:fixed;left:50%;bottom:84px;transform:translate(-50%,12px);z-index:10001;
        padding:10px 15px;border-radius:13px;background:rgba(10,18,34,.94);color:#fff;
        border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 40px rgba(0,0,0,.3);
        opacity:0;pointer-events:none;transition:.2s;font:650 13px system-ui;
      }
      #sayeedProToast.show{opacity:1;transform:translate(-50%,0)}
      #sayeedProToast[data-type=error]{border-color:rgba(255,80,120,.4)}
      #sayeedProToast[data-type=success]{border-color:rgba(0,220,170,.35)}
      #sayeedProModal{position:fixed;inset:0;z-index:10000}
      .sp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55)}
      .sp-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        width:min(430px,calc(100vw - 28px));max-height:78vh;overflow:auto;
        background:#081225;border:1px solid rgba(255,255,255,.12);border-radius:22px;
        box-shadow:0 28px 80px rgba(0,0,0,.55);color:#edf4ff}
      .sp-modal header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08)}
      .sp-modal h3{margin:0;font-size:18px}.sp-close{padding:5px 11px;font-size:20px}
      .sp-modal-body{padding:16px 18px}.sp-list{display:grid;gap:8px}
      .sp-row{width:100%;display:flex;justify-content:space-between;text-align:left}
      .sp-row small{display:block;color:#8090aa;margin-top:3px}.sp-row i{font-style:normal}
      .sp-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .sp-stats div{padding:14px;border-radius:15px;background:rgba(24,42,70,.7)}
      .sp-stats b{display:block;font-size:22px}.sp-stats span{color:#8292aa;font-size:12px}
      .sp-setting,.sp-switch{display:block;margin-bottom:13px;color:#b9c7dc;font-size:13px}
      .sp-setting select{display:block;width:100%;margin-top:7px;padding:11px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#101f37;color:#fff}
      .sp-switch input{margin-right:8px;accent-color:#6f62ff}
      .sp-shortcuts p{display:flex;justify-content:space-between;margin:9px 0;color:#aebbd0}
      kbd{padding:4px 7px;border-radius:7px;background:#162a47;color:#fff;border:1px solid rgba(255,255,255,.1);font-size:11px}
      @media(max-width:480px){#sayeedProLauncher{right:12px;bottom:14px}.sp-grid{gap:7px}}
    `;
    document.head.appendChild(style);

    const launcher = document.createElement("button");
    launcher.id = "sayeedProLauncher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open Sayeed Pro Suite");
    launcher.textContent = "PRO";

    const panel = document.createElement("aside");
    panel.id = "sayeedProPanel";
    panel.innerHTML = `
      <div class="sp-head">
        <div><b>Sayeed Pro Suite</b><small>Advanced tools • local • offline</small></div>
        <button class="sp-close" id="spPanelClose">×</button>
      </div>
      <div class="sp-grid">
        <button class="sp-btn" data-action="copy"><span>⧉</span><small>Copy result</small></button>
        <button class="sp-btn" data-action="share"><span>↗</span><small>Share result</small></button>
        <button class="sp-btn" data-action="favorite"><span>★</span><small>Save favorite</small></button>
        <button class="sp-btn" data-action="favorites"><span>☆</span><small>Favorites</small></button>
        <button class="sp-btn" data-action="stats"><span>▦</span><small>Insights</small></button>
        <button class="sp-btn" data-action="csv"><span>⇩</span><small>Export CSV</small></button>
        <button class="sp-btn" data-action="json"><span>◈</span><small>Backup JSON</small></button>
        <button class="sp-btn" data-action="import"><span>⇧</span><small>Restore backup</small></button>
        <button class="sp-btn" data-action="format"><span>≈</span><small>Format result</small></button>
        <button class="sp-btn" data-action="fullscreen"><span>⛶</span><small>Fullscreen</small></button>
        <button class="sp-btn" data-action="wake"><span>☀</span><small>Keep awake</small></button>
        <button class="sp-btn" data-action="shortcuts"><span>⌨</span><small>Shortcuts</small></button>
        <button class="sp-btn" data-action="settings"><span>⚙</span><small>Pro settings</small></button>
        <button class="sp-btn" data-action="session"><span>↺</span><small>Last session</small></button>
        <button class="sp-btn" data-action="reset"><span>⟲</span><small>Reset Pro settings</small></button>
      </div>
    `;

    document.body.append(launcher, panel);

    launcher.onclick = () => panel.classList.toggle("open");
    $("#spPanelClose").onclick = () => panel.classList.remove("open");

    panel.addEventListener("click", async e => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      beep(); vibrate();
      const action = btn.dataset.action;
      const result = lastResult || findResultText();
      switch (action) {
        case "copy": copyText(result); break;
        case "share":
          if (navigator.share) {
            try { await navigator.share({ title:"Sayeed Calculator", text:`${lastExpression || readDisplay()} = ${result}` }); }
            catch {}
          } else copyText(`${lastExpression || readDisplay()} = ${result}`);
          break;
        case "favorite": addFavorite(); break;
        case "favorites": showFavorites(); break;
        case "stats": showStats(); break;
        case "csv": exportCSV(); break;
        case "json": exportJSON(); break;
        case "import": {
          const input = document.createElement("input");
          input.type = "file"; input.accept = ".json,application/json";
          input.onchange = () => input.files?.[0] && importJSON(input.files[0]);
          input.click(); break;
        }
        case "format": applyFormatToVisibleResult(); break;
        case "fullscreen": toggleFullscreen(); break;
        case "wake": toggleWakeLock(); break;
        case "shortcuts": showShortcuts(); break;
        case "settings": showSettings(); break;
        case "session":
          if (state.session.expression || state.session.result) {
            openModal("Last Session", `<p><b>${escapeHTML(state.session.expression)}</b></p><p>= ${escapeHTML(state.session.result)}</p>`);
          } else toast("No saved session");
          break;
        case "reset":
          state = { ...defaults, favorites: [], session: { ...defaults.session } };
          saveState(); toast("Pro settings reset");
          break;
      }
    });

  }
   function watchCalculator() {
    const saveSession = () => {
      const expr = readDisplay();
      const result = findResultText();
      if (expr || result) {
        lastExpression = expr;
        lastResult = result;
        state.session = { expression: expr, result };
        saveState();
      }
    };

    document.addEventListener("click", e => {
      if (e.target.closest("button,[role='button']")) {
        beep();
        vibrate();
        setTimeout(saveSession, 40);
      }
    }, { passive: true });

    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        $("#sayeedProPanel")?.classList.toggle("open");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyText(lastResult || findResultText());
      }
      if (e.key === "Escape") $("#sayeedProModal")?.remove();
    });

    const display = getDisplay();
    if (display) {
      const observer = new MutationObserver(saveSession);
      observer.observe(display, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:["value"] });
    }
    window.addEventListener("beforeunload", saveSession);
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible" && state.wakeLock && !wakeLock) {
        try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
      }
    });
  }

  function boot() {
    createUI();
    watchCalculator();
    lastExpression = state.session.expression || "";
    lastResult = state.session.result || "";
    if (state.wakeLock) {
      // Re-acquire only after a user gesture when browsers require it.
      document.addEventListener("click", () => toggleWakeLock(), { once:true, passive:true });
    }
  }
   
   if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  } else boot();

  window.SayeedProSuiteV3 = {
    version: "3.0.0",
    exportJSON,
    exportCSV,
    showStats,
    showFavorites,
    openSettings: showSettings
  };
})();
