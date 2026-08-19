/* Sayeed Calculator — Advanced Engine v2
   Clean, dependency-free, GitHub Pages / PWA friendly.
   Works with the current index.html without requiring XML/Android files.
*/
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    expression: $("#expression"),
    result: $("#result"),
    state: $("#displayState"),
    memory: $("#memoryText"),
    keypad: $("#keypad"),
    historyList: $("#historyList"),
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
    clearHistory: $("#clearHistoryBtn"),
    historySearch: $("#historySearch"),
    historyCount: $("#historyCount"),
    exportHistory: $("#exportHistory")
  };

  const STORAGE = Object.freeze({
    memory: "sayeed_memory",
    angle: "sayeed_angle",
    sound: "sayeed_sound",
    theme: "sayeed_theme",
    history: "sayeed_history",
    answer: "sayeed_answer",
    second: "sayeed_second"
  });

  const readNumber = (key, fallback = 0) => {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? n : fallback;
  };

  const safeJson = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  let expr = "";
  let memory = readNumber(STORAGE.memory, 0);
  let angle = localStorage.getItem(STORAGE.angle) === "RAD" ? "RAD" : "DEG";
  let sound = localStorage.getItem(STORAGE.sound) !== "off";
  let second = localStorage.getItem(STORAGE.second) === "on";
  let lastAnswer = readNumber(STORAGE.answer, 0);
  let history = safeJson(STORAGE.history, []);
  if (!Array.isArray(history)) history = [];

  const MAX_HISTORY = 100;
  let historyQuery = "";

  function save(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function format(value) {
    if (!Number.isFinite(value)) throw new Error("Math error");
    if (Math.abs(value) < 1e-12) value = 0;

    const abs = Math.abs(value);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
      return Number(value.toPrecision(12)).toString();
    }

    return Number(value.toPrecision(12)).toString();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  function toast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(window.__sayeedToast);
    window.__sayeedToast = setTimeout(() => {
      els.toast.classList.remove("show");
    }, 1400);
  }

  function vibrate(ms = 7) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {}
  }

  let audioContext = null;

  function beep(kind = "key") {
    if (!sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext ||= new AudioCtx();

      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = kind === "equal" ? "sine" : "triangle";
      oscillator.frequency.value = kind === "equal" ? 720 : kind === "error" ? 180 : 430;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === "equal" ? 0.035 : 0.018, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.065);
    } catch {}
  }

  function tap(button) {
    if (!button) return;
    button.classList.remove("tap");
    void button.offsetWidth;
    button.classList.add("tap");
    setTimeout(() => button.classList.remove("tap"), 120);
  }

  /* ---------- Math engine: no eval(), no Function() ---------- */

  class Parser {
    constructor(input) {
      this.input = input
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/\s+/g, "");
      this.i = 0;
    }

    peek() {
      return this.input[this.i] || "";
    }

    consume(char) {
      if (this.input.startsWith(char, this.i)) {
        this.i += char.length;
        return true;
      }
      return false;
    }

    error(message = "Invalid expression") {
      throw new Error(message);
    }

    parse() {
      if (!this.input) return 0;
      const value = this.parseExpression();
      if (this.i !== this.input.length) this.error();
      return value;
    }

    parseExpression() {
      let value = this.parseTerm();

      while (true) {
        if (this.consume("+")) {
          value += this.parseTerm();
        } else if (this.consume("-")) {
          value -= this.parseTerm();
        } else {
          break;
        }
      }

      return value;
    }

    parseTerm() {
      let value = this.parsePower();

      while (true) {
        if (this.consume("*")) {
          value *= this.parsePower();
        } else if (this.consume("/")) {
          const divisor = this.parsePower();
          if (Math.abs(divisor) < Number.EPSILON) this.error("Cannot divide by zero");
          value /= divisor;
        } else {
          break;
        }
      }

      return value;
    }

    parsePower() {
      let base = this.parseUnary();
      if (this.consume("^")) {
        const exponent = this.parsePower();
        base = Math.pow(base, exponent);
      }
      return base;
    }

    parseUnary() {
      if (this.consume("+")) return +this.parseUnary();
      if (this.consume("-")) return -this.parseUnary();

      let value = this.parsePostfix();
      return value;
    }

    parsePostfix() {
      let value = this.parsePrimary();

      while (true) {
        if (this.consume("!")) {
          value = factorial(value);
        } else if (this.consume("%")) {
          value /= 100;
        } else {
          break;
        }
      }

      return value;
    }

    parsePrimary() {
      const ch = this.peek();

      if (ch === "(") {
        this.i++;
        const value = this.parseExpression();
        if (!this.consume(")")) this.error("Missing )");
        return value;
      }

      if (/[0-9.]/.test(ch)) {
        return this.parseNumber();
      }

      if (/[A-Za-z_]/.test(ch)) {
        const name = this.parseIdentifier();

        if (name === "PI") return Math.PI;
        if (name === "E") return Math.E;
        if (name === "ANS") return lastAnswer;

        if (!this.consume("(")) this.error("Unknown value");
        const argument = this.parseExpression();
        if (!this.consume(")")) this.error("Missing )");

        return callFunction(name, argument);
      }

      this.error();
    }

    parseNumber() {
      const start = this.i;
      let hasDigit = false;
      let hasDot = false;

      while (this.i < this.input.length) {
        const ch = this.input[this.i];

        if (/[0-9]/.test(ch)) {
          hasDigit = true;
          this.i++;
        } else if (ch === "." && !hasDot) {
          hasDot = true;
          this.i++;
        } else {
          break;
        }
      }

      if (!hasDigit) this.error("Invalid number");

      if (this.peek() === "e" || this.peek() === "E") {
        const exponentStart = this.i;
        this.i++;

        if (this.peek() === "+" || this.peek() === "-") this.i++;

        const expDigitsStart = this.i;
        while (/[0-9]/.test(this.peek())) this.i++;

        if (this.i === expDigitsStart) {
          this.i = exponentStart;
        }
      }

      const raw = this.input.slice(start, this.i);
      const value = Number(raw);

      if (!Number.isFinite(value)) this.error("Invalid number");
      return value;
    }

    parseIdentifier() {
      const start = this.i;
      while (/[A-Za-z_]/.test(this.peek())) this.i++;
      return this.input.slice(start, this.i);
    }
  }

  function factorial(value) {
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new Error("Factorial needs a non-negative integer");
    }
    if (value > 170) throw new Error("Factorial too large");

    let result = 1;
    for (let i = 2; i <= value; i++) result *= i;
    return result;
  }

  function toRadians(value) {
    return angle === "DEG" ? value * Math.PI / 180 : value;
  }

  function fromRadians(value) {
    return angle === "DEG" ? value * 180 / Math.PI : value;
  }

  function trig(name, value) {
    const r = toRadians(value);

    if (name === "sin") return Math.sin(r);
    if (name === "cos") return Math.cos(r);
    if (name === "tan") {
      const c = Math.cos(r);
      if (Math.abs(c) < 1e-12) throw new Error("Undefined tangent");
      return Math.tan(r);
    }

    if (name === "asin") {
      if (value < -1 || value > 1) throw new Error("asin domain error");
      return fromRadians(Math.asin(value));
    }

    if (name === "acos") {
      if (value < -1 || value > 1) throw new Error("acos domain error");
      return fromRadians(Math.acos(value));
    }

    if (name === "atan") return fromRadians(Math.atan(value));

    throw new Error("Unknown function");
  }

  function callFunction(name, value) {
    switch (name) {
      case "sin": return trig("sin", value);
      case "cos": return trig("cos", value);
      case "tan": return trig("tan", value);
      case "asin": return trig("asin", value);
      case "acos": return trig("acos", value);
      case "atan": return trig("atan", value);
      case "sqrt":
        if (value < 0) throw new Error("√ domain error");
        return Math.sqrt(value);
      case "log":
        if (value <= 0) throw new Error("log domain error");
        return Math.log10(value);
      case "ln":
        if (value <= 0) throw new Error("ln domain error");
        return Math.log(value);
      case "abs":
        return Math.abs(value);
      case "inv":
        if (Math.abs(value) < Number.EPSILON) throw new Error("Cannot divide by zero");
        return 1 / value;
      case "exp":
        return Math.exp(value);
      case "pow10":
        return Math.pow(10, value);
      case "powE":
        return Math.exp(value);
      default:
        throw new Error("Unknown function");
    }
  }

  function calculate(expression) {
    const value = new Parser(expression).parse();
    if (!Number.isFinite(value)) throw new Error("Math error");
    return value;
  }

  /* ---------- Expression editing ---------- */

  function isValueEnding(text) {
    return /(?:[0-9.)%!]$|π$|e$|ANS$)/.test(text);
  }

  function isImplicitMultiplyStart(text) {
    // IMPORTANT: digits are deliberately NOT included here.
    // Therefore 5 followed by 8 becomes 58, never 5×8.
    return /^(?:\(|π|e|ANS|sin|cos|tan|asin|acos|atan|log|ln|sqrt|abs|inv)/.test(text);
  }

  function appendValue(value) {
    if (!value) return;

    const previous = expr.slice(-1);

    // Implicit multiplication: 2π, 2(, 2sin(
    if (isValueEnding(expr) && isImplicitMultiplyStart(value)) {
      expr += "×";
    }

    // Avoid duplicate decimal points in the same number.
    if (value === "." && /(?:^|[+\-×÷^(])\d*\.$/.test(expr)) return;

    // Avoid accidental duplicate binary operators.
    if (/^[+×÷]$/.test(value) && /[+×÷]$/.test(expr)) {
      expr = expr.slice(0, -1) + value;
    } else if (value === "−" && /[+×÷−]$/.test(expr)) {
      expr = expr.slice(0, -1) + value;
    } else {
      expr += value;
    }

    update();
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

  function appendFunction(name) {
    const map = {
      sin: "sin(",
      cos: "cos(",
      tan: "tan(",
      log: "log(",
      ln: "ln(",
      sqrt: "sqrt(",
      abs: "abs(",
      inv: "inv(",
      asin: "asin(",
      acos: "acos(",
      atan: "atan("
    };

    const value = map[name];
    if (!value) return;

    if (isValueEnding(expr)) expr += "×";
    expr += value;
    update();
    beep();
  }

  function postfix(action) {
    if (!expr) {
      toast("Enter a value first");
      return;
    }

    if (action === "square") expr += "^2";
    if (action === "cube") expr += "^3";
    if (action === "factorial") expr += "!";

    update();
    beep();
    vibrate();
  }

  function equal() {
    if (!expr.trim()) return;

    try {
      const numeric = calculate(expr);
      const result = format(numeric);

      history.unshift({
        e: expr,
        r: result,
        t: Date.now()
      });
      history = history.slice(0, MAX_HISTORY);
      saveJson(STORAGE.history, history);

      lastAnswer = numeric;
      save(STORAGE.answer, numeric);

      expr = result;
      update("Calculated");

      if (els.result) {
        els.result.classList.remove("pulse");
        void els.result.offsetWidth;
        els.result.classList.add("pulse");
      }

      renderHistory();
      beep("equal");
      vibrate(10);
    } catch (error) {
      showError(error?.message || "Invalid expression");
    }
  }

  function showError(message) {
    if (els.result) els.result.textContent = "Error";
    if (els.state) els.state.textContent = message;

    const display = $(".display");
    if (display) {
      display.classList.remove("shake");
      void display.offsetWidth;
      display.classList.add("shake");
    }

    beep("error");
    vibrate(20);
  }

  function update(forcedState = null) {
    if (els.expression) els.expression.textContent = expr || "0";
    if (els.memory) els.memory.textContent = `M: ${format(memory)}`;

    if (!expr) {
      if (els.result) els.result.textContent = "0";
      if (els.state) els.state.textContent = "Ready";
      return;
    }

    try {
      const value = calculate(expr);
      if (els.result) els.result.textContent = format(value);
      if (els.state) els.state.textContent = forcedState || "Preview";
    } catch {
      if (els.result) els.result.textContent = "…";
      if (els.state) els.state.textContent = forcedState || "Editing";
    }
  }

  /* ---------- Memory ---------- */

  function memoryClear() {
    memory = 0;
    save(STORAGE.memory, memory);
    update();
    toast("Memory cleared");
    beep();
  }

  function memoryRecall() {
    appendValue(format(memory));
    toast("Memory recalled");
  }

  function memoryAdd(sign = 1) {
    try {
      const value = expr ? calculate(expr) : lastAnswer;
      memory += sign * value;
      save(STORAGE.memory, memory);
      update();
      toast(sign > 0 ? "Added to memory" : "Subtracted from memory");
      beep();
    } catch {
      toast("Invalid value");
      beep("error");
    }
  }

  /* ---------- History ---------- */

  function getFilteredHistory() {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(item =>
      String(item.e).toLowerCase().includes(q) ||
      String(item.r).toLowerCase().includes(q)
    );
  }

  function renderHistory() {
    if (!els.historyList) return;

    const filtered = getFilteredHistory();

    if (els.historyCount) {
      els.historyCount.textContent =
        `${filtered.length} calculation${filtered.length === 1 ? "" : "s"}`;
    }

    if (!filtered.length) {
      els.historyList.innerHTML = history.length && historyQuery
        ? '<div class="empty">No matching calculations.</div>'
        : '<div class="empty">No calculations yet.<br><br>Your recent results will appear here.</div>';
      return;
    }

    els.historyList.innerHTML = filtered.map((item) => {
      const originalIndex = history.indexOf(item);
      return `
      <div class="history-item" data-index="${originalIndex}" role="button" tabindex="0">
        <div class="history-exp">${escapeHtml(item.e)}</div>
        <div class="history-result">= ${escapeHtml(item.r)}</div>
        <button class="history-delete" data-delete="${originalIndex}" type="button" aria-label="Delete calculation">×</button>
      </div>`;
    }).join("");
  }

  function exportHistory() {
    if (!history.length) {
      toast("Nothing to export");
      beep("error");
      return;
    }

    const lines = [
      "Sayeed Calculator — Calculation History",
      `Exported: ${new Date().toLocaleString()}`,
      "",
      ...history.map((item, i) => `${i + 1}. ${item.e} = ${item.r}`)
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const filename =
      `Sayeed-Calculator-History-${new Date().toISOString().slice(0,10)}.txt`;

    const finishDownload = () => {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.setAttribute("download", filename);
      link.rel = "noopener";
      link.style.position = "fixed";
      link.style.left = "-9999px";
      document.body.appendChild(link);

      // Android Chrome handles a trusted click on a Blob URL reliably.
      link.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      }));

      setTimeout(() => link.remove(), 100);
    };

    try {
      finishDownload();
      toast("Export started");
      beep("equal");
    } catch {
      try {
        const file = new File([blob], filename, { type: "text/plain" });
        if (navigator.canShare?.({ files: [file] }) && navigator.share) {
          navigator.share({
            title: "Sayeed Calculator History",
            text: "Sayeed Calculator History",
            files: [file]
          }).then(
            () => toast("History shared"),
            () => window.open(url, "_blank", "noopener,noreferrer")
          );
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  function clearHistory() {
    history = [];
    saveJson(STORAGE.history, history);
    renderHistory();
    toast("History cleared");
    beep();
  }

  function restoreHistory(index) {
    const item = history[index];
    if (!item) return;
    expr = item.e;
    update();
    toast("Expression restored");
    beep();
  }

  function deleteHistory(index) {
    if (!history[index]) return;
    history.splice(index, 1);
    saveJson(STORAGE.history, history);
    renderHistory();
    toast("Calculation deleted");
    beep();
  }

  /* ---------- UI state ---------- */

  function setAngle(mode) {
    angle = mode === "RAD" ? "RAD" : "DEG";
    save(STORAGE.angle, angle);

    els.deg?.classList.toggle("active", angle === "DEG");
    els.rad?.classList.toggle("active", angle === "RAD");

    update();
    toast(`${angle} mode`);
    beep();
  }

  function updateSecondButtons() {
    els.second?.classList.toggle("active", second);
    save(STORAGE.second, second ? "on" : "off");

    const labels = second
      ? { sin: "sin⁻¹", cos: "cos⁻¹", tan: "tan⁻¹", log: "10ˣ", ln: "eˣ" }
      : { sin: "sin", cos: "cos", tan: "tan", log: "log", ln: "ln" };

    $$(".key[data-fn]").forEach((button) => {
      const fn = button.dataset.fn;
      if (labels[fn]) button.textContent = labels[fn];
    });
  }

  function toggleSecond() {
    second = !second;
    updateSecondButtons();
    toast(second ? "Inverse functions ON" : "Normal functions ON");
    beep();
    vibrate();
  }

  function setTheme(light) {
    document.body.classList.toggle("light", light);
    save(STORAGE.theme, light ? "light" : "dark");
    toast(light ? "Light theme" : "Dark theme");
    beep();
  }

  function toggleTheme() {
    setTheme(!document.body.classList.contains("light"));
  }

  async function copyResult() {
    const value = els.result?.textContent || "0";

    try {
      await navigator.clipboard.writeText(value);
      toast("Result copied");
      beep();
    } catch {
      // Clipboard fallback for older browsers / non-secure contexts.
      try {
        const area = document.createElement("textarea");
        area.value = value;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
        toast("Result copied");
        beep();
      } catch {
        toast("Copy unavailable");
      }
    }
  }

  function scrollHistory() {
    els.historySection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
   /* ---------- Button dispatcher ---------- */

  function handleButton(button) {
    if (!button) return;

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
      if (second && (fn === "sin" || fn === "cos" || fn === "tan")) {
        return appendFunction(`a${fn}`);
      }

      if (second && fn === "log") {
        expr += isValueEnding(expr) ? "×10^(" : "10^(";
        update();
        beep();
        return;
      }

      if (second && fn === "ln") {
        expr += isValueEnding(expr) ? "×e^(" : "e^(";
        update();
        beep();
        return;
      }

      return appendFunction(fn);
    }

    if (value) {
      appendValue(value);
      beep();
      vibrate(5);
    }
  }

 /* ---------- Keyboard ---------- */

  function keyboard(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key;

    if (/^[0-9.]$/.test(key)) {
      appendValue(key);
      return;
    }

    const operators = {
      "+": "+",
      "-": "−",
      "*": "×",
      "/": "÷",
      "%": "%",
      "(": "(",
      ")": ")",
      "^": "^"
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

    if (key.toLowerCase() === "p") {
      appendValue("π");
    }
  }
   /* ---------- History gestures ---------- */

  function historyClick(event) {
    const del = event.target.closest("[data-delete]");
    if (del) {
      deleteHistory(Number(del.dataset.delete));
      return;
    }

    const item = event.target.closest(".history-item");
    if (!item) return;
    restoreHistory(Number(item.dataset.index));
  }

  function historyKeyboard(event) {
    const item = event.target.closest(".history-item");
    if (!item) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      restoreHistory(Number(item.dataset.index));
    }
  }
   /* ---------- Initialization ---------- */

  function bind() {
    els.keypad?.addEventListener("click", (event) => {
      const button = event.target.closest(".key");
      if (!button) return;
      handleButton(button);
    });

    els.keypad?.addEventListener("pointerdown", (event) => {
      const button = event.target.closest(".key");
      if (button && sound) beep();
    }, { passive: true });

    els.copy?.addEventListener("click", copyResult);
    els.deg?.addEventListener("click", () => setAngle("DEG"));
    els.rad?.addEventListener("click", () => setAngle("RAD"));
    els.second?.addEventListener("click", toggleSecond);

    els.mc?.addEventListener("click", memoryClear);
    els.mr?.addEventListener("click", memoryRecall);
    els.mp?.addEventListener("click", () => memoryAdd(1));
    els.mm?.addEventListener("click", () => memoryAdd(-1));

    els.clearHistory?.addEventListener("click", clearHistory);
    els.historyBtn?.addEventListener("click", scrollHistory);
    els.exportHistory?.addEventListener("click", exportHistory);
    els.historySearch?.addEventListener("input", (event) => {
      historyQuery = event.target.value || "";
      renderHistory();
    });

    els.sound?.addEventListener("click", () => {
      sound = !sound;
      save(STORAGE.sound, sound ? "on" : "off");
      els.sound.textContent = sound ? "🔊" : "🔇";
      toast(sound ? "Sound ON" : "Sound OFF");
      if (sound) beep();
    });

    els.theme?.addEventListener("click", toggleTheme);

    els.historyList?.addEventListener("click", historyClick);
    els.historyList?.addEventListener("keydown", historyKeyboard);

    document.addEventListener("keydown", keyboard);

    // Prevent double-tap zoom on calculator buttons without blocking scrolling.
    els.keypad?.addEventListener("dblclick", (event) => event.preventDefault());
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  function init() {
    const savedTheme = localStorage.getItem(STORAGE.theme);
    if (savedTheme === "light") document.body.classList.add("light");

    if (els.sound) els.sound.textContent = sound ? "🔊" : "🔇";

    setAngle(angle);
    updateSecondButtons();
    renderHistory();
    update();

    if (els.year) els.year.textContent = new Date().getFullYear();

    bind();
    registerServiceWorker();

    // Keep splash lightweight and avoid blocking first interaction.
    const splash = $("#splash");
    if (splash) {
      setTimeout(() => {
        splash.classList.add("hide");
        setTimeout(() => splash.remove(), 350);
      }, 650);
    }
  }

  init();
})();
