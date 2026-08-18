const $=s=>document.querySelector(s);
const exprEl=$("#expression"), resultEl=$("#result"), previewEl=$("#preview"), historyList=$("#historyList");
let expr="", memory=Number(localStorage.getItem("sayeed_memory")||0), angle="DEG", second=false, sound=localStorage.getItem("sayeed_sound")!=="off";
let history=JSON.parse(localStorage.getItem("sayeed_history")||"[]");

function beep(type="key"){
  if(!sound) return;
  try{
    const C=window.AudioContext||window.webkitAudioContext, c=new C(),o=c.createOscillator(),g=c.createGain();
    o.type=type==="equal"?"sine":"triangle"; o.frequency.value=type==="equal"?720:430;
    g.gain.setValueAtTime(.0001,c.currentTime); g.gain.exponentialRampToValueAtTime(type==="equal"?.045:.025,c.currentTime+.008); g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.065);
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.07);
  }catch(e){}
}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>x.classList.remove("show"),1500)}
function tap(b){b.classList.remove("tap");void b.offsetWidth;b.classList.add("tap");setTimeout(()=>b.classList.remove("tap"),130)}
function format(n){if(!Number.isFinite(n))throw Error("Math error"); if(Math.abs(n)<1e-12)n=0; return Number(n.toPrecision(12)).toString()}
function fact(n){if(!Number.isInteger(n)||n<0||n>170)throw Error("Invalid factorial");let r=1;for(let i=2;i<=n;i++)r*=i;return r}
function trig(fn,x){const r=angle==="DEG"?x*Math.PI/180:x; return fn==="sin"?Math.sin(r):fn==="cos"?Math.cos(r):Math.tan(r)}
function inverseTrig(fn,x){let r=fn==="asin"?Math.asin(x):fn==="acos"?Math.acos(x):Math.atan(x);return angle==="DEG"?r*180/Math.PI:r}

function normalize(s){
  let t=s.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/π/g,"PI");
  t=t.replace(/\b(\d+(?:\.\d+)?)%/g,"($1/100)");
  t=t.replace(/(\d+(?:\.\d+)?)!/g,"fact($1)");
  t=t.replace(/\^2/g,"**2").replace(/\^3/g,"**3");
  t=t.replace(/\bsin\(/g,"sin(").replace(/\bcos\(/g,"cos(").replace(/\btan\(/g,"tan(");
  t=t.replace(/\bsqrt\(/g,"Math.sqrt(").replace(/\blog\(/g,"Math.log10(").replace(/\bln\(/g,"Math.log(").replace(/\babs\(/g,"Math.abs(").replace(/\binv\(/g,"(1/").replace(/\be\b/g,"E");
  t=t.replace(/asin\(/g,"asin(").replace(/acos\(/g,"acos(").replace(/atan\(/g,"atan(");
  t=t.replace(/sin\(/g,"trig('sin',").replace(/cos\(/g,"trig('cos',").replace(/tan\(/g,"trig('tan',");
  t=t.replace(/asin\(/g,"inverseTrig('asin',").replace(/acos\(/g,"inverseTrig('acos',").replace(/atan\(/g,"inverseTrig('atan',");
  return t;
}
function calculate(s){
  if(!s.trim())return 0;
  const safe=normalize(s);
  if(!/^[0-9+\-*/().,\sA-Za-z_'"*]+$/.test(safe))throw Error("Invalid input");
  if(/[A-Za-z_]+/.test(safe.replace(/(Math\.sqrt|Math\.log10|Math\.log|Math\.abs|trig|inverseTrig|fact|PI|E)/g,"")))throw Error("Invalid input");
  return Function("PI","E","trig","inverseTrig","fact","return ("+safe+")")(Math.PI,Math.E,trig,inverseTrig,fact);
}
function update(){
  exprEl.textContent=expr||"0"; $("#memoryStatus").textContent="M: "+format(memory);
  try{const v=calculate(expr); resultEl.textContent=format(v);previewEl.textContent=expr?"Preview":"Ready";}catch(e){resultEl.textContent=expr?"…":"0";previewEl.textContent=expr?"":"Ready";}
}
function add(v){
  expr+=v; update(); beep(); 
}
function clear(){expr="";update();beep()}
function back(){expr=expr.slice(0,-1);update();beep()}
function equal(){
  try{
    const v=format(calculate(expr)); if(!expr)return;
    history.unshift({e:expr,r:v});history=history.slice(0,30);localStorage.setItem("sayeed_history",JSON.stringify(history));
    expr=v;resultEl.textContent=v;previewEl.textContent="Calculated";renderHistory();beep("equal");resultEl.classList.remove("pulse");void resultEl.offsetWidth;resultEl.classList.add("pulse");
  }catch(e){resultEl.textContent="Error";previewEl.textContent=e.message||"Invalid expression";$(".display-wrap").classList.remove("shake");void $(".display-wrap").offsetWidth;$(".display-wrap").classList.add("shake");beep();setTimeout(update,850)}
}
function renderHistory(){
  if(!history.length){historyList.innerHTML='<div class="empty">No calculations yet.<br><br>Your recent results will appear here.</div>';return}
  historyList.innerHTML=history.map((h,i)=>`<div class="history-item" data-i="${i}"><div class="history-exp">${escapeHtml(h.e)}</div><div class="history-result">= ${escapeHtml(h.r)}</div></div>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

$("#keypad").addEventListener("click",e=>{
  const b=e.target.closest(".key");if(!b)return;tap(b);
  const a=b.dataset.action,v=b.dataset.value;
  if(a==="clear")clear();else if(a==="backspace")back();else if(a==="equals")equal();else add(v);
});
$("#keypad").addEventListener("pointerdown",e=>{const b=e.target.closest(".key");if(b)beep()});
$("#copyBtn").onclick=async()=>{try{await navigator.clipboard.writeText(resultEl.textContent);toast("Result copied");beep()}catch(e){toast("Copy unavailable")}};
$("#degBtn").onclick=()=>{angle="DEG";$("#degBtn").classList.add("active");$("#radBtn").classList.remove("active");$("#angleMode").textContent="DEG";update();beep()};
$("#radBtn").onclick=()=>{angle="RAD";$("#radBtn").classList.add("active");$("#degBtn").classList.remove("active");$("#angleMode").textContent="RAD";update();beep()};
$("#secondBtn").onclick=()=>{
  second=!second;$("#secondBtn").classList.toggle("active",second);
  const map=second?{"sin("> "asin(","cos("> "acos(","tan("> "atan(","log("> "10^(","ln("> "e^("}:{"asin("> "sin(","acos("> "cos(","atan("> "tan(","10^("> "log(","e^("> "ln("};
  document.querySelectorAll(".key.sci").forEach(b=>{if(map[b.dataset.value]){b.dataset.value=map[b.dataset.value];b.textContent=map[b.dataset.value].replace("(","").replace("^","^")}})
  beep();
};
$("#memoryClear").onclick=()=>{memory=0;localStorage.setItem("sayeed_memory",0);update();toast("Memory cleared");beep()};
$("#memoryRecall").onclick=()=>{add(format(memory));toast("Memory recalled")};
$("#memoryAdd").onclick=()=>{try{memory+=calculate(expr);localStorage.setItem("sayeed_memory",memory);update();toast("Added to memory");beep()}catch(e){toast("Invalid value")}};
$("#memorySub").onclick=()=>{try{memory-=calculate(expr);localStorage.setItem("sayeed_memory",memory);update();toast("Subtracted from memory");beep()}catch(e){toast("Invalid value")}};
$("#clearHistory").onclick=()=>{history=[];localStorage.removeItem("sayeed_history");renderHistory();toast("History cleared");beep()};
historyList.addEventListener("click",e=>{const item=e.target.closest(".history-item");if(!item)return;expr=history[+item.dataset.i].e;update();toast("Expression restored");beep()});
$("#historyBtn").onclick=()=>$("#historyPanel").scrollIntoView({behavior:"smooth",block:"start"});
$("#soundBtn").onclick=()=>{sound=!sound;localStorage.setItem("sayeed_sound",sound?"on":"off");$("#soundBtn").textContent=sound?"🔊":"🔇";if(sound)beep()};
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("sayeed_theme",document.body.classList.contains("light")?"light":"dark");beep()};
if(localStorage.getItem("sayeed_theme")==="light")document.body.classList.add("light");
$("#soundBtn").textContent=sound?"🔊":"🔇";
document.addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key;
  if(/[0-9.]/.test(k)){add(k);return}
  const m={"+":"+","-":"−","*":"×","/":"÷","%":"%","(":"(",")":")","^":"^2"};
  if(m[k]){e.preventDefault();add(m[k]);return}
  if(k==="Enter"||k==="="){e.preventDefault();equal();return}
  if(k==="Backspace"){e.preventDefault();back();return}
  if(k==="Escape"){e.preventDefault();clear();return}
});
document.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>tap(b)));
$("#year").textContent=new Date().getFullYear();renderHistory();update();
    
