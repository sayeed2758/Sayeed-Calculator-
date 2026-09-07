(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const expressionEl = $("#expression");
  const resultEl = $("#result");
  const keypad = $("#keypad");
  const toast = $("#toast");
  const historyPanel = $("#historyPanel");
  const settingsPanel = $("#settingsPanel");
  const historyList = $("#historyList");
  const historyEmpty = $("#historyEmpty");
  const soundToggle = $("#soundToggle");
  const copyBtn = $("#copyBtn");
  const shareBtn = $("#shareBtn");
  const modeInfoBtn = $("#modeInfoBtn");

  const STORAGE = {
    history: "sayeed_calc_history_v5",
    sound: "sayeed_calc_sound_v5"
  };

  let expression = "";
  let justEvaluated = false;
  let history = loadHistory();
  let soundOn = localStorage.getItem(STORAGE.sound) === "on";
  let audioContext = null;
  let memory = Number(localStorage.getItem("sayeed_calc_memory_v1") || "0");

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE.history) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function saveHistory() {
    localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 50)));
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1200);
  }

  function beep() {
    if (!soundOn) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioContext ||= new Ctx();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 460;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.016, audioContext.currentTime + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.045);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.05);
    } catch {}
  }

  function cleanNumber(number) {
    if (!Number.isFinite(number)) throw new Error("Math error");
    if (Math.abs(number) < 1e-12) number = 0;
    return Number(number.toPrecision(12)).toString();
  }

  function tokenize(input) {
    const tokens = [];
    let i = 0;
    while (i < input.length) {
      const ch = input[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        const start = i;
        let dots = 0;
        while (i < input.length && /[0-9.]/.test(input[i])) {
          if (input[i] === ".") dots++;
          if (dots > 1) throw new Error("Invalid number");
          i++;
        }
        const raw = input.slice(start, i);
        if (raw === ".") throw new Error("Invalid number");
        tokens.push({ type: "number", value: Number(raw) });
        continue;
      }
      if ("+-−×÷*/%".includes(ch)) { tokens.push({ type: "op", value: ch }); i++; continue; }
      if (ch === "(") { tokens.push({ type: "lparen" }); i++; continue; }
      if (ch === ")") { tokens.push({ type: "rparen" }); i++; continue; }
      throw new Error("Invalid expression");
    }
    return tokens;
  }

  function precedence(op) {
    if (op === "u+" || op === "u-") return 4;
    if (op === "%") return 5;
    if (["×", "÷", "*", "/"].includes(op)) return 3;
    if (["+", "−", "-"].includes(op)) return 2;
    return 0;
  }

  function applyOp(a, b, op) {
    if (op === "+") return a + b;
    if (op === "−" || op === "-") return a - b;
    if (op === "×" || op === "*") return a * b;
    if (op === "÷" || op === "/") {
      if (Math.abs(b) < Number.EPSILON) throw new Error("Cannot divide by zero");
      return a / b;
    }
    if (op === "%") return a / 100;
    throw new Error("Invalid operator");
  }

  function calculate(input) {
    const tokens = tokenize(input.replace(/\u2212/g, "−"));
    if (!tokens.length) return 0;
    const values = [];
    const ops = [];
    let expectingValue = true;

    const applyTop = () => {
      const op = ops.pop();
      if (op === "u+" || op === "u-") {
        const value = values.pop();
        if (value === undefined) throw new Error("Invalid expression");
        values.push(op === "u-" ? -value : value);
        return;
      }
      const b = values.pop();
      const a = values.pop();
      if (a === undefined || b === undefined) throw new Error("Invalid expression");
      values.push(applyOp(a, b, op));
    };

    for (const token of tokens) {
      if (token.type === "number") {
        values.push(token.value);
        expectingValue = false;
      } else if (token.type === "lparen") {
        ops.push("(");
        expectingValue = true;
      } else if (token.type === "rparen") {
        while (ops.length && ops.at(-1) !== "(") applyTop();
        if (ops.pop() !== "(") throw new Error("Missing bracket");
        expectingValue = false;
      } else {
        let op = token.value;
        if (expectingValue && (op === "+" || op === "-" || op === "−")) op = op === "+" ? "u+" : "u-";
        if (op === "%") {
          const value = values.pop();
          if (value === undefined) throw new Error("Invalid percent");
          values.push(applyOp(value, 0, "%"));
          expectingValue = false;
          continue;
        }
        if (expectingValue && !op.startsWith("u")) throw new Error("Invalid expression");
        while (ops.length && ops.at(-1) !== "(" && precedence(ops.at(-1)) >= precedence(op)) applyTop();
        ops.push(op);
        expectingValue = true;
      }
    }

    if (expectingValue) throw new Error("Incomplete expression");
    while (ops.length) {
      if (ops.at(-1) === "(") throw new Error("Missing bracket");
      applyTop();
    }
    if (values.length !== 1) throw new Error("Invalid expression");
    return cleanNumber(values[0]);
  }

  function lastNumberStart(text) {
    let i = text.length - 1;
    while (i >= 0 && /[0-9.]/.test(text[i])) i--;
    return i + 1;
  }

  function append(value) {
    beep();
    if (justEvaluated && (/[0-9.]/.test(value[0]) || value === "%")) expression = "";
    justEvaluated = false;

    const last = expression.at(-1) || "";
    const binary = ["+", "−", "×", "÷"];

    if (value === "00") value = "00";

    if (/^[0-9.]$/.test(value[0])) {
      const start = lastNumberStart(expression);
      const current = expression.slice(start);
      if (value === "." && current.includes(".")) return;
      if (current === "0" && value !== ".") expression = expression.slice(0, start);
    }

    if (binary.includes(value)) {
      if (!expression) return;
      if (binary.includes(last)) expression = expression.slice(0, -1);
    }

    expression += value;
    render();
  }

  function clearAll() {
    expression = "";
    justEvaluated = false;
    render();
    beep();
  }

  function backspace() {
    if (!expression) return;
    expression = expression.slice(0, -1);
    justEvaluated = false;
    render();
    beep();
  }

  function toggleSign() {
    if (!expression) return;
    const start = lastNumberStart(expression);
    const number = expression.slice(start);
    if (!number) return;

    if (start > 0 && expression[start - 1] === "−") {
      const before = expression[start - 2] || "";
      if (start === 1 || ["+", "−", "×", "÷", "("].includes(before)) {
        expression = expression.slice(0, start - 1) + number;
      } else {
        expression = expression.slice(0, start) + "−" + number;
      }
    } else {
      expression = expression.slice(0, start) + "−" + number;
    }
    justEvaluated = false;
    render();
    beep();
  }

  function equals() {
    if (!expression) return;
    try {
      const result = String(calculate(expression));
      addHistory(expression, result);
      justEvaluated = true;
      expressionEl.textContent = expression;
      resultEl.textContent = result;
      resultEl.classList.add("final-result");
      beep();
    } catch (error) {
      showToast(error.message || "Math error");
      resultEl.textContent = "Error";
    }
  }

  function addHistory(expr, result) {
    history.unshift({ expr, result, at: Date.now() });
    history = history.slice(0, 50);
    saveHistory();
  }

  function formatDate(timestamp) {
    const d = new Date(timestamp);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join(".");
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  }

  function renderHistory() {
    historyList.innerHTML = "";
    historyEmpty.style.display = history.length ? "none" : "block";
    for (const item of history) {
      const row = document.createElement("article");
      row.className = "history-item";
      row.innerHTML = `<div class="history-date">${formatDate(item.at)}</div><div class="history-expression">${escapeHtml(item.expr)}</div><div class="history-result">=${escapeHtml(item.result)}</div>`;
      historyList.appendChild(row);
    }
  }


  function shareText() {
    const expr = expression || "0";
    let result = "0";
    try { result = String(calculate(expr)); } catch { result = resultEl.textContent || "0"; }
    return `Standard Calculator\n${expr} = ${result}\n\nMade With ❤️ By Shahid Sir`;
  }

  async function copyResult() {
    const text = resultEl.textContent?.trim() || "0";
    try {
      await navigator.clipboard.writeText(text);
      showToast("Result copied");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); showToast("Result copied"); } catch { showToast("Copy unavailable"); }
      area.remove();
    }
    beep();
  }

  async function shareCalculation() {
    const text = shareText();
    if (navigator.share) {
      try { await navigator.share({ title: "Standard Calculator", text }); }
      catch (error) { if (error?.name !== "AbortError") showToast("Share unavailable"); }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        showToast("Calculation copied to share");
      } catch { showToast("Sharing unavailable"); }
    }
    beep();
  }

  function openPanel(panel) {
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  }

  function closePanel(panel) {
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
  }

  function render() {
    expressionEl.textContent = expression || "0";
    resultEl.classList.remove("final-result");
    if (!expression) {
      resultEl.textContent = "0";
      return;
    }
    if (justEvaluated) return;
    try {
      resultEl.textContent = String(calculate(expression));
    } catch {
      resultEl.textContent = "";
    }
  }

  function currentNumber() {
    if (!expression) return 0;
    try { return Number(calculate(expression)); } catch { return 0; }
  }

  function handleMemory(action) {
    beep();
    if (action === "clear") memory = 0;
    if (action === "recall") {
      expression = cleanNumber(memory);
      justEvaluated = false;
    }
    if (action === "add") memory += currentNumber();
    if (action === "subtract") memory -= currentNumber();
    if (action === "store") memory = currentNumber();
    if (action !== "recall") localStorage.setItem("sayeed_calc_memory_v1", String(memory));
    if (action === "recall") render();
    showToast(action === "clear" ? "Memory cleared" : action === "recall" ? "Memory recalled" : "Memory saved");
  }

  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "clear") return clearAll();
    if (action === "backspace") return backspace();
    if (action === "toggle-sign") return toggleSign();
    if (action === "equals") return equals();
    if (button.dataset.value) append(button.dataset.value);
  });

  document.querySelectorAll("[data-memory]").forEach((button) => button.addEventListener("click", () => handleMemory(button.dataset.memory)));


  copyBtn.addEventListener("click", copyResult);
  shareBtn.addEventListener("click", shareCalculation);
  modeInfoBtn.addEventListener("click", () => showToast("Standard calculator"));

  $("#historyBtn").addEventListener("click", () => { renderHistory(); openPanel(historyPanel); });
  $("#settingsBtn").addEventListener("click", () => { syncSoundUI(); openPanel(settingsPanel); });

  $("#clearHistory").addEventListener("click", () => {
    history = [];
    saveHistory();
    renderHistory();
  });

  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.close === "history") closePanel(historyPanel);
    if (button.dataset.close === "settings") closePanel(settingsPanel);
  }));

  soundToggle.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem(STORAGE.sound, soundOn ? "on" : "off");
    syncSoundUI();
    if (soundOn) beep();
  });

  function syncSoundUI() {
    soundToggle.classList.toggle("on", soundOn);
    soundToggle.setAttribute("aria-pressed", String(soundOn));
  }

  document.addEventListener("keydown", (event) => {
    if (!historyPanel.classList.contains("hidden") || !settingsPanel.classList.contains("hidden")) {
      if (event.key === "Escape") { closePanel(historyPanel); closePanel(settingsPanel); }
      return;
    }
    if (/^[0-9.]$/.test(event.key)) append(event.key);
    else if (["+", "-", "*", "/"].includes(event.key)) append(event.key === "*" ? "×" : event.key === "/" ? "÷" : event.key === "-" ? "−" : "+");
    else if (event.key === "Enter" || event.key === "=") equals();
    else if (event.key === "Backspace") backspace();
    else if (event.key === "Escape") clearAll();
    else if (event.key === "%") append("%");
  });

  syncSoundUI();
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
