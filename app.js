/* =========================================================
   SAYEED CALCULATOR — ADVANCED ENGINE v3
   Safe parser • history search/export • memory • PWA
   ========================================================= */
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const el = {
    expression: $("#expression"),
    result: $("#result"),
    state: $("#displayState"),
    memory: $("#memoryText"),
    keypad: $("#keypad"),
    historyList: $("#historyList"),
    historySearch: $("#historySearch"),
    historyCount: $("#historyCount"),
    historySection: $("#historySection"),
    toast: $("#toast"),
    year: $("#year"),
    copy: $("#copyBtn"),
    sound: $("#soundBtn"),
    theme: $("#themeBtn"),
    historyBtn: $("#historyBtn"),
    deg: $("#degBtn"),
    rad: $("#radBtn"),
    second: $("#secondBtn"),
    mc: $("#mcBtn"),
    mr: $("#mrBtn"),
    mp: $("#mPlusBtn"),
    mm: $("#mMinusBtn"),
    clearHistory: $("#clearHistoryBtn")
  };

  const KEY = Object.freeze({
    memory: "sayeed_memory",
    angle: "sayeed_angle",
    sound: "sayeed_sound",
    theme: "sayeed_theme",
    history: "sayeed_history",
    answer: "sayeed_answer",
    second: "sayeed_second"
  });

  const MAX_HISTORY = 100;

  const num = (key, fallback = 0) => {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? n : fallback;
  };

  const json = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  let expr = "";
  let memory = num(KEY.memory);
  let angle = localStorage.getItem(KEY.angle) === "RAD" ? "RAD" : "DEG";
  let sound = localStorage.getItem(KEY.sound) !== "off";
  let second = localStorage.getItem(KEY.second) === "on";
  let lastAnswer = num(KEY.answer);
  let history = json(KEY.history, []);

  if (!Array.isArray(history)) history = [];

  let filteredHistory = history;
  let audioContext = null;

  function save(key, value) {
    try { localStorage.setItem(key, String(value)); } catch {}
  }

  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function format(value) {
    if (!Number.isFinite(value)) throw new Error("Math error");
    if (Math.abs(value) < 1e-12) value = 0;
    return Number(value.toPrecision(12)).toString();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function toast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(window.__sayeedToast);
    window.__sayeedToast = setTimeout(() => el.toast.classList.remove("show"), 1500);
  }

  function vibrate(ms = 6) {
    try { navigator.vibrate?.(ms); } catch {}
  }

  function beep(kind = "key") {
    if (!sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      audioContext ||= new AudioCtx();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = kind === "equal" ? "sine" : "triangle";
      oscillator.frequency.value =
        kind === "equal" ? 720 : kind === "error" ? 180 : 430;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        kind === "equal" ? 0.035 : 0.018, now + 0.006
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
    } catch {}
  }

  function tap(button) {
    button?.classList.remove("tap");
    if (!button) return;
    void button.offsetWidth;
    button.classList.add("tap");
    setTimeout(() => button.classList.remove("tap"), 130);
  }

  /* ---------------- Safe recursive parser ---------------- */

  class Parser {
    constructor(input) {
      this.input = input
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/\s+/g, "");
      this.i = 0;
    }

    peek() { return this.input[this.i] || ""; }

    consume(token) {
      if (this.input.startsWith(token, this.i)) {
        this.i += token.length;
        return true;
      }
      return false;
    }

    error(message = "Invalid expression") {
      throw new Error(message);
    }

    parse() {
      if (!this.input) return 0;
      const value = this.expression();
      if (this.i !== this.input.length) this.error();
      if (!Number.isFinite(value)) this.error("Math error");
      return value;
    }

    expression() {
      let value = this.term();
      while (true) {
        if (this.consume("+")) value += this.term();
        else if (this.consume("-")) value -= this.term();
        else break;
      }
      return value;
    }

    term() {
      let value = this.power();
      while (true) {
        if (this.consume("*")) value *= this.power();
        else if (this.consume("/")) {
          const divisor = this.power();
          if (Math.abs(divisor) < Number.EPSILON) this.error("Cannot divide by zero");
          value /= divisor;
        } else break;
      }
      return value;
    }

    power() {
      const base = this.unary();
      if (this.consume("^")) return Math.pow(base, this.power());
      return base;
    }

    unary() {
      if (this.consume("+")) return this.unary();
      if (this.consume("-")) return -this.unary();
      return this.postfix();
    }

    postfix() {
      let value = this.primary();
      while (true) {
        if (this.consume("!")) value = factorial(value);
        else if (this.consume("%")) value /= 100;
        else break;
      }
      return value;
    }

    primary() {
      const c = this.peek();

      if (c === "(") {
        this.i++;
        const value = this.expression();
        if (!this.consume(")")) this.error("Missing )");
        return value;
      }

      if (/[0-9.]/.test(c)) return this.number();

      if (/[A-Za-z_]/.test(c)) {
        const name = this.identifier();

        if (name === "PI") return Math.PI;
        if (name === "E") return Math.E;
        if (name === "ANS") return lastAnswer;

        if (!this.consume("(")) this.error("Unknown value");
        const argument = this.expression();
        if (!this.consume(")")) this.error("Missing )");

        return callFunction(name, argument);
      }

      this.error();
    }

    number() {
      const start = this.i;
      let digits = false;
      let dot = false;

      while (this.i < this.input.length) {
        const c = this.input[this.i];

        if (/[0-9]/.test(c)) {
          digits = true;
          this.i++;
        } else if (c === "." && !dot) {
          dot = true;
          this.i++;
        } else break;
      }

      if (!digits) this.error("Invalid number");

      if (this.peek() === "e" || this.peek() === "E") {
        const exponentStart = this.i;
        this.i++;

        if (this.peek() === "+" || this.peek() === "-") this.i++;

        const digitStart = this.i;
        while (/[0-9]/.test(this.peek())) this.i++;

        if (digitStart === this.i) this.i = exponentStart;
      }

      const value = Number(this.input.slice(start, this.i));
      if (!Number.isFinite(value)) this.error("Invalid number");
      return value;
    }

    identifier() {
      const start = this.i;
      while (/[A-Za-z_]/.test(this.peek())) this.i++;
      return this.input.slice(start, this.i);
    }
  }

  function factorial(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("Factorial needs a non-negative integer");
    }
    if (value > 170) throw new Error("Factorial too large");

    let result = 1;
    for (let i = 2; i <= value; i++) result *= i;
    return result;
  }

  function toRad(v) {
    return angle === "DEG" ? v * Math.PI / 180 : v;
  }

  function fromRad(v) {
    return angle === "DEG" ? v * 180 / Math.PI : v;
  }

  function callFunction(name, value) {
    switch (name) {
      case "sin": return Math.sin(toRad(value));
      case "cos": return Math.cos(toRad(value));
      case "tan": {
        const r = toRad(value);
        if (Math.abs(Math.cos(r)) < 1e-12) throw new Error("Undefined tangent");
        return Math.tan(r);
      }
      case "asin":
        if (value < -1 || value > 1) throw new Error("asin domain error");
        return fromRad(Math.asin(value));
      case "acos":
        if (value < -1 || value > 1) throw new Error("acos domain error");
        return fromRad(Math.acos(value));
      case "atan": return fromRad(Math.atan(value));
      case "sqrt":
        if (value < 0) throw new Error("√ domain error");
        return Math.sqrt(value);
      case "log":
        if (value <= 0) throw new Error("log domain error");
        return Math.log10(value);
      case "ln":
        if (value <= 0) throw new Error("ln domain error");
        return Math.log(value);
      case "abs": return Math.abs(value);
      case "inv":
        if (Math.abs(value) < Number.EPSILON) throw new Error("Cannot divide by zero");
        return 1 / value;
      default:
        throw new Error("Unknown function");
    }
  }

  function calculate(text) {
    return new Parser(text).parse();
  }

  /* ---------------- Display ---------------- */

  function update(forcedState = null) {
    if (el.expression) el.expression.textContent = expr || "0";
    if (el.memory) el.memory.textContent = `M: ${format(memory)}`;

    if (!expr) {
      if (el.result) el.result.textContent = "0";
      if (el.state) el.state.textContent = "Ready";
      return;
    }

    try {
      if (el.result) el.result.textContent = format(calculate(expr));
      if (el.state) el.state.textContent = forcedState || "Preview";
    } catch {
      if (el.result) el.result.textContent = "…";
      if (el.state) el.state.textContent = forcedState || "Editing";
    }
  }

  function error(message) {
    if (el.result) el.result.textContent = "Error";
    if (el.state) el.state.textContent = message;

    const display = $(".display");
    display?.classList.remove("shake");
    if (display) {
      void display.offsetWidth;
      display.classList.add("shake");
    }

    beep("error");
    vibrate(18);
  }

  /* ---------------- Input ---------------- */

  function valueEnds(text) {
    return /(?:[0-9.)%!]|π|e)$/.test(text) || text.endsWith("ANS");
  }

  function valueStarts(value) {
    return /^(?:[0-9.(]|π|e|A)/.test(value);
  }

  function appendValue(value) {
    if (!value) return;

    // IMPORTANT: digits continue the current number.
    // 2 then 5 must become 25, not 2×5.
    // Implicit multiplication is only inserted before a new
    // non-numeric value such as (, π, e or ANS.
    if (valueEnds(expr) && valueStarts(value) && !/^[0-9.]$/.test(value)) {
      expr += "×";
    }

    if (value === "." && /(?:^|[+−×÷^(])\d*\.$/.test(expr)) return;

    if (/^[+×÷]$/.test(value) && /[+×÷]$/.test(expr)) {
      expr = expr.slice(0, -1) + value;
    } else if (value === "−" && /[+×÷−]$/.test(expr)) {
      expr = expr.slice(0, -1) + value;
    } else {
      expr += value;
    }

    update();
  }

  function functionInput(name) {
    const normal = {
      sin: "sin(", cos: "cos(", tan: "tan(",
      log: "log(", ln: "ln(", sqrt: "sqrt(",
      abs: "abs(", inv: "inv("
    };

    const inverse = {
      sin: "asin(", cos: "acos(", tan: "atan("
    };

    const value = second && inverse[name] ? inverse[name] : normal[name];
    if (!value) return;

    if (valueEnds(expr)) expr += "×";
    expr += value;
    update();
    beep();
  }

  function postfix(action) {
    if (!expr) return toast("Enter a value first");

    if (action === "square") expr += "^2";
    if (action === "cube") expr += "^3";
    if (action === "factorial") expr += "!";

    update();
    beep();
    vibrate();
  }

  function clearExpression() {
    expr = "";
    update();
    beep();
    vibrate();
  }

  function backspace() {
    if (!expr) return;
    expr = expr.slice(0, -1);
    update();
    beep();
  }

  function equal() {
    if (!expr.trim()) return;

    try {
      const value = calculate(expr);
      const result = format(value);

      history.unshift({
        e: expr,
        r: result,
        t: Date.now()
      });

      history = history.slice(0, MAX_HISTORY);
      saveJSON(KEY.history, history);

      lastAnswer = value;
      save(KEY.answer, value);

      expr = result;
      update("Calculated");
      renderHistory();

      el.result?.classList.remove("pulse");
      void el.result?.offsetWidth;
      el.result?.classList.add("pulse");

      beep("equal");
      vibrate(10);
    } catch (e) {
      error(e?.message || "Invalid expression");
    }
  }

  /* ---------------- Memory ---------------- */

  function memoryClear() {
    memory = 0;
    save(KEY.memory, memory);
    update();
    toast("Memory cleared");
    beep();
  }

  function memoryRecall() {
    appendValue(format(memory));
    toast("Memory recalled");
  }

  function memoryChange(sign) {
    try {
      const value = expr ? calculate(expr) : lastAnswer;
      memory += sign * value;
      save(KEY.memory, memory);
      update();
      toast(sign > 0 ? "Added to memory" : "Subtracted from memory");
      beep();
    } catch {
      toast("Invalid value");
      beep("error");
    }
  }

  /* ---------------- History ---------------- */

  function getHistoryQuery() {
    return (el.historySearch?.value || "").trim().toLowerCase();
  }

  function updateHistoryCount() {
    if (!el.historyCount) return;
    const n = filteredHistory.length;
    el.historyCount.textContent = `${n} calculation${n === 1 ? "" : "s"}`;
  }

  function renderHistory() {
    const query = getHistoryQuery();

    filteredHistory = history.filter((item) => {
      if (!query) return true;
      return `${item.e} ${item.r}`.toLowerCase().includes(query);
    });

    updateHistoryCount();

    if (!el.historyList) return;

    if (!filteredHistory.length) {
      el.historyList.innerHTML = `
        <div class="empty">
          ${query ? "No matching calculations." : "No calculations yet."}
        </div>
      `;
      return;
    }

    el.historyList.innerHTML = filteredHistory.map((item, index) => `
      <div class="history-item" data-history-index="${index}" role="button" tabindex="0">
        <div class="history-exp">${escapeHTML(item.e)}</div>
        <div class="history-result">= ${escapeHTML(item.r)}</div>
      </div>
    `).join("");
  }

  function restoreHistory(index) {
    const item = filteredHistory[index];
    if (!item) return;

    expr = item.e;
    update();
    toast("Expression restored");
    beep();
  }

  function clearHistory() {
    history = [];
    filteredHistory = [];
    saveJSON(KEY.history, history);
    renderHistory();
    toast("History cleared");
    beep();
  }

  function exportHistory() {
    if (!history.length) {
      toast("No history to export");
      return;
    }

    const payload = {
      app: "Sayeed Calculator",
      exportedAt: new Date().toISOString(),
      calculations: history
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sayeed-calculator-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast("History exported");
    beep();
  }

  function copyResult() {
    const value = el.result?.textContent || "0";

    navigator.clipboard?.writeText(value)
      .then(() => {
        toast("Result copied");
        beep();
      })
      .catch(() => {
        const area = document.createElement("textarea");
        area.value = value;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();

        try {
          document.execCommand("copy");
          toast("Result copied");
          beep();
        } catch {
          toast("Copy unavailable");
        }

        area.remove();
      });
  }

  /* ---------------- Modes ---------------- */

  function setAngle(mode) {
    angle = mode === "RAD" ? "RAD" : "DEG";
    save(KEY.angle, angle);

    el.deg?.classList.toggle("active", angle === "DEG");
    el.rad?.classList.toggle("active", angle === "RAD");

    update();
  }

  function updateSecond() {
    el.second?.classList.toggle("active", second);
    el.second?.setAttribute("aria-pressed", String(second));

    const labels = second
      ? { sin: "sin⁻¹", cos: "cos⁻¹", tan: "tan⁻¹" }
      : { sin: "sin", cos: "cos", tan: "tan" };

    $$(".key[data-fn]").forEach((button) => {
      const fn = button.dataset.fn;
      if (labels[fn]) button.textContent = labels[fn];
    });

    save(KEY.second, second ? "on" : "off");
  }

  function toggleSecond() {
    second = !second;
    updateSecond();
    toast(second ? "Inverse functions ON" : "Normal functions ON");
    beep();
    vibrate();
  }

  function toggleTheme() {
    const light = !document.body.classList.contains("light");
    document.body.classList.toggle("light", light);
    save(KEY.theme, light ? "light" : "dark");
    toast(light ? "Light theme" : "Dark theme");
    beep();
  }

  function toggleSound() {
    sound = !sound;
    save(KEY.sound, sound ? "on" : "off");

    if (el.sound) {
      el.sound.textContent = sound ? "🔊" : "🔇";
      el.sound.setAttribute("aria-label", sound ? "Turn sound off" : "Turn sound on");
    }

    toast(sound ? "Sound ON" : "Sound OFF");
    if (sound) beep();
  }

  /* ---------------- Button handling ---------------- */

  function handleButton(button) {
    tap(button);

    const action = button.dataset.action;
    const value = button.dataset.value;
    const fn = button.dataset.fn;

    if (action === "clear") return clearExpression();
    if (action === "backspace") return backspace();
    if (action === "equals") return equal();

    if (action === "square" || action === "cube" || action === "factorial") {
      return postfix(action);
    }

    if (fn) {
      if (second && fn === "log") {
        if (valueEnds(expr)) expr += "×";
        expr += "10^(";
        update();
        beep();
        return;
      }

      if (second && fn === "ln") {
        if (valueEnds(expr)) expr += "×";
        expr += "e^(";
        update();
        beep();
        return;
      }

      return functionInput(fn);
    }

    if (value) {
      appendValue(value);
      beep();
      vibrate(4);
    }
  }

  /* ---------------- Keyboard ---------------- */

  function keyboard(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key;

    if (/^[0-9.]$/.test(key)) {
      appendValue(key);
      return;
    }

    const operators = {
      "+": "+", "-": "−", "*": "×", "/": "÷",
      "%": "%", "(": "(", ")": ")", "^": "^"
    };

    if (operators[key]) {
      event.preventDefault();
      appendValue(operators[key]);
      beep();
      return;
    }

    if (key === "Enter" || key === "=") {
      event.preventDefault();
      equal();
      return;
    }

    if (key === "Backspace") {
      event.preventDefault();
      backspace();
      return;
    }

    if (key === "Escape" || key === "Delete") {
      event.preventDefault();
      clearExpression();
      return;
    }

    if (key.toLowerCase() === "p") appendValue("π");
  }

  /* ---------------- Events ---------------- */

  function historyClick(event) {
    const item = event.target.closest(".history-item");
    if (!item) return;
    restoreHistory(Number(item.dataset.historyIndex));
  }

  function historyKey(event) {
     if (event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest(".history-item");
    if (!item) return;

    event.preventDefault();
    restoreHistory(Number(item.dataset.historyIndex));
  }

  function bind() {
    el.keypad?.addEventListener("click", (event) => {
      const button = event.target.closest(".key");
      if (button) handleButton(button);
    });

    el.copy?.addEventListener("click", copyResult);
    el.sound?.addEventListener("click", toggleSound);
    el.theme?.addEventListener("click", toggleTheme);
    el.historyBtn?.addEventListener("click", () =>
      el.historySection?.scrollIntoView({ behavior: "smooth" })
    );

    el.deg?.addEventListener("click", () => setAngle("DEG"));
    el.rad?.addEventListener("click", () => setAngle("RAD"));
    el.second?.addEventListener("click", toggleSecond);

    el.mc?.addEventListener("click", memoryClear);
    el.mr?.addEventListener("click", memoryRecall);
    el.mp?.addEventListener("click", () => memoryChange(1));
    el.mm?.addEventListener("click", () => memoryChange(-1));

    el.clearHistory?.addEventListener("click", clearHistory);

    el.historySearch?.addEventListener("input", renderHistory);

    el.historyList?.addEventListener("click", historyClick);
    el.historyList?.addEventListener("keydown", historyKey);

    document.addEventListener("keydown", keyboard);
     /* Dynamic ripple position */
    el.keypad?.addEventListener("pointerdown", (event) => {
      const button = event.target.closest(".key");
      if (!button) return;

      const rect = button.getBoundingClientRect();
      button.style.setProperty("--tap-x", `${event.clientX - rect.left}px`);
      button.style.setProperty("--tap-y", `${event.clientY - rect.top}px`);
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  function init() {
    if (localStorage.getItem(KEY.theme) === "light") {
      document.body.classList.add("light");
    }

    if (el.sound) {
      el.sound.textContent = sound ? "🔊" : "🔇";
      el.sound.setAttribute("aria-label", sound ? "Turn sound off" : "Turn sound on");
    }

    setAngle(angle);
    updateSecond();
    renderHistory();
    update();

    if (el.year) el.year.textContent = new Date().getFullYear();

    bind();
    registerServiceWorker();

    const splash = $("#splash");
    if (splash) {
      setTimeout(() => {
        splash.classList.add("hide");
        setTimeout(() => splash.remove(), 450);
      }, 650);
    }
  }

  init();
})();

