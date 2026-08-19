(() => {
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const STORE = {
  history: "sayeed.v7.history",
  memory: "sayeed.v7.memory",
  angle: "sayeed.v7.angle",
  theme: "sayeed.v7.theme",
  sound: "sayeed.v7.sound"
};

const state = {
  expression: "",
  memory: Number(localStorage.getItem(STORE.memory) || 0),
  angle: localStorage.getItem(STORE.angle) || "DEG",
  second: false,
  sound: localStorage.getItem(STORE.sound) !== "off",
  theme: localStorage.getItem(STORE.theme) || "dark",
  history: readJSON(STORE.history, [])
};

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : fallback;
  } catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, String(value)); }
function format(n) {
  if (!Number.isFinite(n)) throw new Error("Math error");
  if (Object.is(n, -0)) n = 0;
  return Number(n.toPrecision(12)).toString();
}
function showToast(message) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => t.classList.remove("show"), 1400);
}
let audioCtx = null;
function beep(freq = 440, duration = .055) {
  if (!state.sound) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.026, audioCtx.currentTime + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration + .01);
  } catch {}
}
function buzz(ms = 7) {
  try { navigator.vibrate?.(ms); } catch {}
}

/* Tokenizer + recursive-descent parser.
   This avoids eval()/Function() and supports implicit multiplication,
   factorial, percentages, constants, trig, inverse trig and precedence. */
const FUNCTIONS = new Set(["sin","cos","tan","asin","acos","atan","log","ln","sqrt","abs","inv"]);
function tokenize(input) {
  const s = input.replaceAll("×","*").replaceAll("÷","/").replaceAll("−","-").replaceAll("π","pi");
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const start = i;
      let dots = 0;
      while (i < s.length && /[0-9.]/.test(s[i])) { if (s[i] === ".") dots++; i++; }
      const raw = s.slice(start, i);
      if (dots > 1 || raw === ".") throw new Error("Invalid number");
      out.push({t:"number", v:Number(raw)});
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      const start = i++;
      while (i < s.length && /[A-Za-z]/.test(s[i])) i++;
      const word = s.slice(start,i).toLowerCase();
      if (word === "pi") out.push({t:"number",v:Math.PI});
      else if (word === "e") out.push({t:"number",v:Math.E});
      else if (FUNCTIONS.has(word)) out.push({t:"fn",v:word});
      else throw new Error("Unknown function");
      continue;
    }
    if ("+-*/^%!()".includes(c)) { out.push({t:c,v:c}); i++; continue; }
    throw new Error("Invalid input");
  }
  return out;
}
function evaluate(input) {
  if (!input.trim()) return 0;
  const tokens = tokenize(input);
  let p = 0;
  const peek = () => tokens[p];
  const take = () => tokens[p++];
  const isStart = x => x && (x.t === "number" || x.t === "(" || x.t === "fn");
  function primary() {
    const t = peek();
    if (!t) throw new Error("Incomplete");
    if (t.t === "+") { take(); return primary(); }
    if (t.t === "-") { take(); return -primary(); }
    if (t.t === "number") { take(); return t.v; }
    if (t.t === "(") {
      take(); const v = addSub();
      if (!peek() || take().t !== ")") throw new Error("Missing )");
      return v;
    }
    if (t.t === "fn") {
      const fn = take().v;
      let value;
      if (peek()?.t === "(") {
        take(); value = addSub();
        if (!peek() || take().t !== ")") throw new Error("Missing )");
      } else value = primary();
      return applyFunction(fn, value);
    }
    throw new Error("Expected value");
  }
  function factorial(n) {
    if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error("Invalid factorial");
    let r = 1;
    for (let i=2;i<=n;i++) r *= i;
    return r;
  }
  function postfix() {
    let v = primary();
    while (peek()?.t === "!" || peek()?.t === "%") {
      const op = take().t;
      v = op === "!" ? factorial(v) : v / 100;
    }
    return v;
  }
  function power() {
    let v = postfix();
    if (peek()?.t === "^") { take(); v = Math.pow(v, power()); }
    return v;
  }
  function multiply() {
    let v = power();
    while (true) {
      const t = peek();
      if (t?.t === "*" || t?.t === "/") {
        take(); const r = power();
        if (t.t === "/" && r === 0) throw new Error("Cannot divide by zero");
        v = t.t === "*" ? v*r : v/r;
      } else if (isStart(t)) {
        v *= power(); // implicit multiplication: 2π, 2(3), 2sin(30)
      } else break;
    }
    return v;
  }
  function addSub() {
    let v = multiply();
    while (peek()?.t === "+" || peek()?.t === "-") {
      const op = take().t, r = multiply();
      v = op === "+" ? v+r : v-r;
    }
    return v;
  }
  function applyFunction(fn, x) {
    const rad = state.angle === "DEG" ? x * Math.PI / 180 : x;
    const inv = state.second;
    if (fn === "sin") return inv ? convertAngle(Math.asin(x)) : Math.sin(rad);
    if (fn === "cos") return inv ? convertAngle(Math.acos(x)) : Math.cos(rad);
    if (fn === "tan") return inv ? convertAngle(Math.atan(x)) : Math.tan(rad);
    if (fn === "asin") return convertAngle(Math.asin(x));
    if (fn === "acos") return convertAngle(Math.acos(x));
    if (fn === "atan") return convertAngle(Math.atan(x));
    if (fn === "log") return Math.log10(x);
    if (fn === "ln") return Math.log(x);
    if (fn === "sqrt") return Math.sqrt(x);
    if (fn === "abs") return Math.abs(x);
    if (fn === "inv") { if (x === 0) throw new Error("Cannot divide by zero"); return 1/x; }
    throw new Error("Unknown function");
  }
  function convertAngle(r) { return state.angle === "DEG" ? r * 180 / Math.PI : r; }
  const value = addSub();
  if (p !== tokens.length) throw new Error("Invalid expression");
  if (!Number.isFinite(value)) throw new Error("Math error");
  return value;
}

function preview() {
  const expr = state.expression;
  $("#expression").textContent = expr || "0";
  $("#memoryText").textContent = "M: " + format(state.memory);
  $("#degBtn").classList.toggle("active", state.angle === "DEG");
  $("#radBtn").classList.toggle("active", state.angle === "RAD");
  $("#result").textContent = "0";
  $("#displayState").textContent = expr ? "Preview" : "Ready";
  if (!expr) return;
  try { $("#result").textContent = format(evaluate(expr)); }
  catch { $("#result").textContent = "…"; }
}
function add(value) {
  state.expression += value;
  preview();
  beep(["+","−","×","÷"].includes(value) ? 520 : 430);
  buzz(5);
}
function action(action) {
  if (action === "clear") { state.expression = ""; preview(); beep(240); buzz(10); return; }
  if (action === "backspace") { state.expression = state.expression.slice(0,-1); preview(); beep(320); return; }
  if (action === "square") { state.expression += "^2"; preview(); beep(470); return; }
  if (action === "cube") { state.expression += "^3"; preview(); beep(470); return; }
  if (action === "factorial") { state.expression += "!"; preview(); beep(500); return; }
  if (action === "equals") calculate();
}
function calculate() {
  if (!state.expression) return;
  try {
    const result = format(evaluate(state.expression));
    state.history.unshift({ expression: state.expression, result, time: Date.now() });
    state.history = state.history.slice(0,60);
    save(STORE.history, JSON.stringify(state.history));
    state.expression = result;
    $("#displayState").textContent = "Calculated";
    animateResult(result);
    renderHistory();
    beep(840,.11); buzz(14);
  } catch (err) {
    $("#result").textContent = "Error";
    $("#displayState").textContent = err.message || "Invalid expression";
    beep(150,.12); buzz(30);
    setTimeout(preview, 900);
  }
}
function animateResult(value) {
  const r = $("#result");
  r.textContent = value;
  r.classList.remove("pop");
  void r.offsetWidth;
  r.classList.add("pop");
}
function renderHistory() {
  const list = $("#historyList");
  if (!state.history.length) {
    list.innerHTML = '<div class="empty">No calculations yet.<br>Recent results will appear here.</div>';
    return;
  }
  list.innerHTML = state.history.map((h,i) =>
    `<article class="history-item" data-index="${i}" style="animation-delay:${Math.min(i*28,280)}ms">
      <button class="delete-history" data-delete="${i}" aria-label="Delete calculation">×</button>
      <div class="history-expression">${escapeHTML(h.expression)}</div>
      <div class="history-result">= ${escapeHTML(h.result)}</div>
    </article>`).join("");
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function pressVisual(button, event) {
  const r = button.getBoundingClientRect();
  button.style.setProperty("--x", `${event.clientX-r.left}px`);
  button.style.setProperty("--y", `${event.clientY-r.top}px`);
  button.classList.remove("press","ripple");
  void button.offsetWidth;
  button.classList.add("press","ripple");
  setTimeout(() => button.classList.remove("press"), 140);
}

$("#keypad").addEventListener("pointerdown", e => {
  const b = e.target.closest(".key");
  if (b) pressVisual(b,e);
});
$("#keypad").addEventListener("click", e => {
  const b = e.target.closest(".key");
  if (!b) return;
  if (b.dataset.action) return action(b.dataset.action);
  if (b.dataset.fn) {
    let fn = b.dataset.fn;
    if (state.second && ["sin","cos","tan"].includes(fn)) fn = "a"+fn;
    state.expression += fn === "asin" || fn === "acos" || fn === "atan" ? fn+"(" : fn+"(";
    preview(); beep(460); buzz(5); return;
  }
  add(b.dataset.value || "");
});

$("#degBtn").onclick = () => { state.angle="DEG"; save(STORE.angle,state.angle); preview(); beep(500); };
$("#radBtn").onclick = () => { state.angle="RAD"; save(STORE.angle,state.angle); preview(); beep(500); };
$("#secondBtn").onclick = () => {
  state.second=!state.second;
  $("#secondBtn").classList.toggle("active",state.second);
  const labels = state.second ? ["sin⁻¹","cos⁻¹","tan⁻¹"] : ["sin","cos","tan"];
  ["sin","cos","tan"].forEach((n,i)=>$(`[data-fn="${n}"]`).textContent=labels[i]);
  showToast(state.second ? "Inverse functions ON" : "Inverse functions OFF");
  beep(600); buzz(9);
};
$("#mcBtn").onclick = () => { state.memory=0; save(STORE.memory,0); preview(); showToast("Memory cleared"); beep(280); };
$("#mrBtn").onclick = () => { add(format(state.memory)); beep(620); };
$("#mPlusBtn").onclick = () => memoryChange(1);
$("#mMinusBtn").onclick = () => memoryChange(-1);
function memoryChange(sign) {
  try { state.memory += sign * evaluate(state.expression); save(STORE.memory,state.memory); preview(); showToast(sign>0?"M+ saved":"M− saved"); beep(620); }
  catch { showToast("Invalid value"); beep(180); }
}
$("#copyBtn").onclick = async () => {
  try { await navigator.clipboard.writeText($("#result").textContent); showToast("Result copied"); beep(680); buzz(8); }
  catch { showToast("Copy unavailable"); }
};
$("#clearHistoryBtn").onclick = () => { state.history=[]; save(STORE.history,"[]"); renderHistory(); showToast("History cleared"); beep(240); };
$("#historyList").onclick = e => {
  const del=e.target.closest("[data-delete]");
  if(del){const i=Number(del.dataset.delete);state.history.splice(i,1);save(STORE.history,JSON.stringify(state.history));renderHistory();showToast("Calculation deleted");beep(280);return;}
  const item=e.target.closest(".history-item");
  if(item){state.expression=state.history[Number(item.dataset.index)].expression;preview();showToast("Expression restored");beep(520);}
};
$("#historyBtn").onclick=()=>$("#historySection").scrollIntoView({behavior:"smooth"});
$("#soundBtn").onclick=()=>{state.sound=!state.sound;save(STORE.sound,state.sound?"on":"off");$("#soundBtn").textContent=state.sound?"🔊":"🔇";if(state.sound)beep(680);};
$("#themeBtn").onclick=()=>{state.theme=document.body.classList.toggle("light")?"light":"dark";save(STORE.theme,state.theme);showToast(state.theme==="light"?"Light theme":"Dark theme");beep(520);};

document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k=e.key;
  if(/[0-9.]/.test(k)) add(k);
  else if(k==="+") add("+");
  else if(k==="-") add("−");
  else if(k==="*"){e.preventDefault();add("×");}
  else if(k==="/"){e.preventDefault();add("÷");}
  else if(k==="("||k===")") add(k);
  else if(k==="Enter"||k==="="){e.preventDefault();calculate();}
  else if(k==="Backspace"){e.preventDefault();state.expression=state.expression.slice(0,-1);preview();beep(320);}
  else if(k==="Escape"){state.expression="";preview();beep(240);}
});

if(state.theme==="light") document.body.classList.add("light");
$("#soundBtn").textContent=state.sound?"🔊":"🔇";
$("#year").textContent=new Date().getFullYear();
preview(); renderHistory();

window.addEventListener("load",()=>setTimeout(()=>$("#splash").classList.add("hide"),900));
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();
