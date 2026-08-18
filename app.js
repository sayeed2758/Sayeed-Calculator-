(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const expressionEl = $('#expression');
  const resultEl = $('#result');
  const displayHintEl = $('#displayHint');
  const modeBadgeEl = $('#modeBadge');
  const memoryBadgeEl = $('#memoryBadge');
  const historyListEl = $('#historyList');
  const historyEmptyEl = $('#historyEmpty');
  const toastEl = $('#toast');

  let expression = '';
  let lastResult = '0';
  let justEvaluated = false;
  let mode = localStorage.getItem('sayeed_calc_mode') || 'DEG';
  let inverse = false;
  let memory = Number(localStorage.getItem('sayeed_calc_memory') || 0);
  let history = safeParse(localStorage.getItem('sayeed_calc_history'), []);
  if (!Array.isArray(history)) history = [];

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function saveState() {
    localStorage.setItem('sayeed_calc_mode', mode);
    localStorage.setItem('sayeed_calc_memory', String(memory));
    localStorage.setItem('sayeed_calc_history', JSON.stringify(history.slice(0, 30)));
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  function updateDisplay(hint = 'Ready') {
    expressionEl.textContent = expression || '0';
    resultEl.textContent = formatResult(lastResult);
    displayHintEl.textContent = hint;
    modeBadgeEl.textContent = mode;
    memoryBadgeEl.classList.toggle('hidden', memory === 0);
    $('#modeBtn').textContent = mode;
    $('#modeBtn').classList.toggle('active', true);
    $('#inverseBtn').classList.toggle('active', inverse);
  }

  function formatResult(value) {
    if (value === 'Error') return value;
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    if (Object.is(n, -0)) return '0';
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return n.toExponential(10).replace(/\.0+e/, 'e').replace(/(\.\d*?)0+e/, '$1e');
    return Number(n.toPrecision(13)).toLocaleString('en-US', { maximumFractionDigits: 12, useGrouping: false });
  }

  function sanitizeExpression(source) {
    return source
      .replace(/\s+/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, 'PI')
      .replace(/\be\b/g, 'E');
  }

  function factorial(n) {
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n) || n > 170) throw new Error('Invalid factorial');
    let out = 1;
    for (let i = 2; i <= n; i++) out *= i;
    return out;
  }

  function transformForEvaluation(source) {
    let s = sanitizeExpression(source);

    // Percent: 25% -> (25/100)
    s = s.replace(/(PI|E|\d+(?:\.\d+)?)%/g, '($1/100)');

    // Factorial: 5! or (2+3)!
    for (let i = 0; i < 10; i++) {
      const before = s;
      s = s.replace(/(\d+(?:\.\d+)?|PI|E|\([^()]*\))!/g, 'factorial($1)');
      if (s === before) break;
    }

    const trig = mode === 'DEG'
      ? `((x)=>x*Math.PI/180)`
      : `((x)=>x)`;
    const inv = inverse;

    const fnMap = {
      sin: inv ? (mode === 'DEG' ? 'asinDeg' : 'Math.asin') : `((x)=>Math.sin(${trig}(x)))`,
      cos: inv ? (mode === 'DEG' ? 'acosDeg' : 'Math.acos') : `((x)=>Math.cos(${trig}(x)))`,
      tan: inv ? (mode === 'DEG' ? 'atanDeg' : 'Math.atan') : `((x)=>Math.tan(${trig}(x)))`
    };

    s = s.replace(/sin\(/g, `${fnMap.sin}(`)
      .replace(/cos\(/g, `${fnMap.cos}(`)
      .replace(/tan\(/g, `${fnMap.tan}(`)
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/abs\(/g, 'Math.abs(')
      .replace(/\bPI\b/g, 'Math.PI')
      .replace(/\bE\b/g, 'Math.E');

    // Powers are inserted through ^ for direct typed expressions.
    s = s.replace(/\^/g, '**');

    if (!/^[0-9+\-*/()., Math_EPIa-zA-Z*]+$/.test(s)) throw new Error('Invalid input');
    return s;
  }

  function evaluate(source) {
    if (!source || !source.trim()) return 0;
    let s = source;

    // Convert common shorthand before validation.
    s = s.replace(/x²/g, '^2').replace(/x³/g, '^3');
    // Add multiplication for cases like 2(3), 2π and )( without changing function calls.
    s = s.replace(/(\d|\)|PI|E)(?=\()/g, '$1*');
    s = s.replace(/(\d|\)|PI|E)(?=(PI|E))/g, '$1*');

    const code = transformForEvaluation(s);
    // eslint-disable-next-line no-new-func
    const value = Function('factorial','asinDeg','acosDeg','atanDeg', `"use strict"; return (${code});`)(factorial, (x)=>radToDeg(Math.asin(x)), (x)=>radToDeg(Math.acos(x)), (x)=>radToDeg(Math.atan(x)));
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Math error');
    return value;
  }

  const radToDeg = (x) => x * 180 / Math.PI;

  function preview() {
    if (!expression) { lastResult = '0'; updateDisplay('Ready'); return; }
    try {
      const value = evaluate(expression);
      lastResult = String(value);
      updateDisplay('Preview');
    } catch {
      updateDisplay('Continue typing');
    }
  }

  function input(value) {
    if (justEvaluated && /[0-9.(πe]/i.test(value)) expression = '';
    justEvaluated = false;

    const operators = ['+', '−', '×', '÷'];
    const prev = expression.slice(-1);
    if (operators.includes(value) && operators.includes(prev)) {
      expression = expression.slice(0, -1) + value;
    } else if (value === '.' && /(^|[+−×÷(])\d*$/.test(expression) === false && /\d*\.$/.test(expression)) {
      return;
    } else {
      expression += value;
    }
    preview();
  }

  function clearAll() {
    expression = '';
    lastResult = '0';
    justEvaluated = false;
    updateDisplay('Cleared');
  }

  function del() {
    if (justEvaluated) { clearAll(); return; }
    expression = expression.slice(0, -1);
    preview();
  }

  function percent() {
    if (!expression) return;
    expression += '%';
    preview();
  }

  function equals() {
    if (!expression) return;
    try {
      const value = evaluate(expression);
      const result = formatResult(String(value));
      lastResult = String(value);
      addHistory(expression, result);
      expression = result.replace(/,/g, '');
      justEvaluated = true;
      updateDisplay('Calculated');
    } catch {
      lastResult = 'Error';
      updateDisplay('Check expression');
      showToast('That expression cannot be calculated');
    }
  }

  function scientific(fn) {
    const cursorLike = expression;
    if (fn === 'square') { input('^2'); return; }
    if (fn === 'cube') { input('^3'); return; }
    const label = inverse ? `a${fn}` : fn;
    expression = `${fnForInput(label)}(${cursorLike || '0'})`;
    justEvaluated = false;
    preview();
  }

  function fnForInput(label) {
    if (label === 'asin') return 'sin';
    if (label === 'acos') return 'cos';
    if (label === 'atan') return 'tan';
    return label;
  }

  function toggleMode() {
    mode = mode === 'DEG' ? 'RAD' : 'DEG';
    saveState();
    updateDisplay(`${mode} mode`);
    showToast(`Angle mode: ${mode}`);
    preview();
  }

  function toggleInverse() {
    inverse = !inverse;
    $$('.sci-btn[data-fn]').forEach(btn => btn.classList.toggle('inverse-active', inverse));
    showToast(inverse ? 'Inverse functions enabled' : 'Inverse functions disabled');
  }

  function currentNumeric() {
    try { return evaluate(expression || String(lastResult)); } catch { return Number(lastResult) || 0; }
  }

  function memoryAction(type) {
    const value = currentNumeric();
    if (type === 'memory-clear') memory = 0;
    if (type === 'memory-recall') { expression = String(memory); lastResult = String(memory); justEvaluated = true; }
    if (type === 'memory-add') memory += value;
    if (type === 'memory-sub') memory -= value;
    saveState(); updateDisplay('Memory updated');
    showToast(type === 'memory-recall' ? 'Memory recalled' : 'Memory updated');
  }

  function addHistory(expr, result) {
    history.unshift({ expr, result, at: Date.now() });
    history = history.slice(0, 30);
    saveState();
    renderHistory();
  }

  function renderHistory() {
    historyListEl.innerHTML = '';
    if (!history.length) {
      historyListEl.appendChild(historyEmptyEl);
      return;
    }
    history.forEach((item) => {
      const card = document.createElement('button');
      card.className = 'history-item';
      card.type = 'button';
      card.innerHTML = `<div class="history-expression"></div><div class="history-result"></div><div class="history-time"></div>`;
      card.querySelector('.history-expression').textContent = item.expr;
      card.querySelector('.history-result').textContent = `= ${item.result}`;
      card.querySelector('.history-time').textContent = new Date(item.at).toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
      card.addEventListener('click', () => {
        expression = item.expr;
        justEvaluated = false;
        lastResult = '0';
        preview();
        showToast('Loaded from history');
      });
      historyListEl.appendChild(card);
    });
  }

  function clearHistory() {
    history = [];
    saveState();
    renderHistory();
    showToast('History cleared');
  }

  async function copyResult() {
    const value = resultEl.textContent;
    try {
      await navigator.clipboard.writeText(value);
      showToast('Result copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      showToast('Result copied');
    }
  }

  function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;
    if (/^[0-9]$/.test(key)) input(key);
    else if (key === '+') input('+');
    else if (key === '-') input('−');
    else if (key === '*') input('×');
    else if (key === '/') { event.preventDefault(); input('÷'); }
    else if (key === '.') input('.');
    else if (key === '(' || key === ')' ) input(key);
    else if (key === 'Enter' || key === '=') { event.preventDefault(); equals(); }
    else if (key === 'Backspace') del();
    else if (key === 'Escape') clearAll();
    else if (key === '%') percent();
  }

  $$('#keypad [data-value]').forEach(btn => btn.addEventListener('click', () => input(btn.dataset.value)));
  $$('.sci-btn[data-value]').forEach(btn => btn.addEventListener('click', () => input(btn.dataset.value)));
  $$('.sci-btn[data-fn]').forEach(btn => btn.addEventListener('click', () => scientific(btn.dataset.fn)));
  $$('.tool-btn').forEach(btn => btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'mode') toggleMode();
    else if (action === 'inverse') toggleInverse();
    else if (action?.startsWith('memory')) memoryAction(action);
  }));

  $('[data-action="clear"]').addEventListener('click', clearAll);
  $('[data-action="delete"]').addEventListener('click', del);
  $('[data-action="percent"]').addEventListener('click', percent);
  $('[data-action="equals"]').addEventListener('click', equals);
  $('#copyBtn').addEventListener('click', copyResult);
  $('#clearHistoryBtn').addEventListener('click', clearHistory);
  document.addEventListener('keydown', handleKeydown);

  $('#themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('sayeed_calc_theme', document.body.classList.contains('light') ? 'light' : 'dark');
    showToast(document.body.classList.contains('light') ? 'Light theme' : 'Dark theme');
  });

  $('#historyBtn').addEventListener('click', () => {
    document.querySelector('.side-card')?.scrollIntoView({ behavior:'smooth', block:'center' });
  });

  document.addEventListener('DOMContentLoaded', () => {});
  document.getElementById('year').textContent = new Date().getFullYear();

  if (localStorage.getItem('sayeed_calc_theme') === 'light') document.body.classList.add('light');
  updateDisplay('Ready');
  renderHistory();
})();
      
