/* SAYEED PRO+ V4 — additive 20+ feature upgrade. Keep all older files. */
(()=>{"use strict";if(window.SAYEED_PRO_V4)return;window.SAYEED_PRO_V4=1;
const K="sayeed_pro_v4",S=JSON.parse(localStorage.getItem(K)||'{"tape":[]}'),$=s=>document.querySelector(s);
const save=()=>localStorage.setItem(K,JSON.stringify(S)),n=s=>Number($(s)?.value),f=x=>Number.isFinite(x)?Number(x.toPrecision(12)).toString():"Error";
const toast=m=>{let t=$("#v4toast");if(!t){t=document.createElement("div");t.id="v4toast";document.body.append(t)}t.textContent=m;t.className="show";clearTimeout(t.t);t.t=setTimeout(()=>t.className="",1600)};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const gcd=(a,b)=>{a=Math.abs(Math.trunc(a));b=Math.abs(Math.trunc(b));while(b)[a,b]=[b,a%b];return a};
function card(t,body,id){return `<section class=v4card><b>${t}</b>${body}<button data-v4=${id}>Calculate</button><div id=${id}o class=v4out>Ready</div></section>`}
const inp=(id,p)=>`<input id=${id} type=number inputmode=decimal placeholder="${p}">`;
function calc(id,fn){try{$("#"+id+"o").textContent=fn()}catch(e){$("#"+id+"o").textContent=e.message||"Error"}}
function open(){
 if($("#v4launch"))return;
 let st=document.createElement("style");st.textContent=`
#v4launch{position:fixed;right:78px;bottom:16px;z-index:9997;width:54px;height:54px;border:0;border-radius:18px;background:linear-gradient(135deg,#345a9c,#6b5cff);color:#fff;font-weight:800;box-shadow:0 10px 30px #0005}
#v4panel{display:none;position:fixed;right:12px;bottom:78px;z-index:9996;width:min(390px,calc(100vw - 24px));max-height:78vh;overflow:auto;padding:13px;border-radius:23px;background:#071225f7;color:#edf4ff;border:1px solid #ffffff18;font:13px system-ui;box-shadow:0 25px 70px #0008}
#v4panel.open{display:block}.v4head{display:flex;justify-content:space-between;align-items:center}.v4head b{font-size:17px}.v4x{background:#142640;color:#fff;border:0;border-radius:9px;font-size:20px}
.v4tabs{display:flex;gap:6px;overflow:auto;margin:10px 0}.v4tab{background:#12243e;color:#9fb0c9;border:1px solid #ffffff12;border-radius:10px;padding:8px 12px;white-space:nowrap}.v4tab.on{background:#625cff;color:#fff}
.v4view{display:none}.v4view.on{display:block}.v4card{margin:8px 0;padding:11px;border:1px solid #ffffff0e;border-radius:15px;background:#11233bc2}.v4card b{display:block;margin-bottom:8px}.v4card input,.v4card select,.v4card textarea{box-sizing:border-box;width:100%;margin:3px 0;padding:9px;border-radius:9px;border:1px solid #ffffff14;background:#0a192d;color:#fff}.v4grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.v4card button{width:100%;margin-top:6px;padding:9px;border:0;border-radius:10px;background:linear-gradient(135deg,#655cff,#00a8ee);color:#fff;font-weight:700}.v4out{margin-top:7px;padding:8px;border-radius:9px;background:#0003;line-height:1.4;color:#d9e7fa}.v4row{display:block;width:100%;text-align:left;margin:5px 0;padding:9px;background:#10213a;color:#fff;border:1px solid #ffffff10;border-radius:10px}.v4row small{display:block;color:#91a2ba;margin-top:3px}
#v4toast{position:fixed;left:50%;bottom:85px;z-index:10000;transform:translate(-50%,12px);opacity:0;background:#09172b;color:#fff;border:1px solid #ffffff18;padding:9px 14px;border-radius:12px;transition:.2s}#v4toast.show{opacity:1;transform:translate(-50%,0)}`;
 document.head.append(st);
 let b=document.createElement("button");b.id="v4launch";b.textContent="PRO+";
 let p=document.createElement("aside");p.id="v4panel";p.innerHTML=`
 <div class=v4head><div><b>Sayeed Pro+ Tools</b><small>20+ offline utilities</small></div><button class=v4x id=v4close>×</button></div>
 <div class=v4tabs><button class="v4tab on" data-t=tools>Tools</button><button class=v4tab data-t=finance>Finance</button><button class=v4tab data-t=math>Math</button><button class=v4tab data-t=tape>Tape</button></div>
 <div class="v4view on" data-v=tools>
 ${card("Unit Converter",`<select id=uCat><option>length</option><option>mass</option><option>time</option><option>speed</option></select>${inp("uVal","Value")}<div class=v4grid><select id=uFrom></select><select id=uTo></select></div>`,"unit")}
 ${card("Temperature",`<div class=v4grid>${inp("tv","Value")}<select id=tf><option>C</option><option>F</option><option>K</option></select></div><select id=tt><option>C</option><option>F</option><option>K</option></select>`,"temp")}
 ${card("Percentage",`<div class=v4grid>${inp("pa","A")}${inp("pb","B")}</div><select id=pm><option value=of>A × B%</option><option value=wp>A is what % of B</option><option value=up>Increase A by B%</option><option value=down>Decrease A by B%</option></select>`,"pct")}
 ${card("Discount + Tax",`<div class=v4grid>${inp("dp","Price")}${inp("dd","Discount %")}</div>${inp("dt","Tax %")}`,"disc")}
 ${card("Ratio Simplifier",`<div class=v4grid>${inp("ra","A")}${inp("rb","B")}</div>`,"ratio")}
 ${card("Random Integer",`<div class=v4grid>${inp("rmin","Min")}${inp("rmax","Max")}</div>`,"rand")}
 </div>
 <div class=v4view data-v=finance>
 ${card("Simple Interest",`<div class=v4grid>${inp("sip","Principal")}${inp("sir","Rate %")}</div>${inp("sit","Years")}`,"si")}
 ${card("Compound Interest",`<div class=v4grid>${inp("cip","Principal")}${inp("cir","Rate %")}</div><div class=v4grid>${inp("cit","Years")}${inp("cin","Times/year")}</div>`,"ci")}
 ${card("Loan EMI",`<div class=v4grid>${inp("ep","Loan")}${inp("er","Annual rate %")}</div>${inp("en","Months")}`,"emi")}
 </div>
 <div class=v4view data-v=math>
 ${card("GCD + LCM",`<div class=v4grid>${inp("ga","A")}${inp("gb","B")}</div>`,"gcd")}
 ${card("Prime Checker",inp("pn","Integer"),"prime")}
 ${card("Prime Factorization",inp("fn","Integer"),"factor")}
 ${card("Quadratic Solver",`<div class=v4grid>${inp("qa","a")}${inp("qb","b")}</div>${inp("qc","c")}`,"quad")}
 ${card("Statistics",`<textarea id=stats placeholder="10,20,30,40"></textarea>`,"stats")}
 ${card("Average",`<textarea id=avg placeholder="1 2 3 4 5"></textarea>`,"avg")}
 ${card("Fraction Simplifier",`<div class=v4grid>${inp("fn1","Numerator")}${inp("fd1","Denominator")}</div>`,"frac")}
 ${card("Decimal → Fraction",inp("dec","Decimal"),"dec")}
 ${card("Base Converter",`<input id=basev placeholder="1010"><div class=v4grid>${inp("basef","From base")}${inp("baset","To base")}</div>`,"base")}
 ${card("Date Difference",`<div class=v4grid><input id=da type=date><input id=db type=date></div>`,"date")}
 ${card("BMI Utility",`<div class=v4grid>${inp("bk","Weight kg")}${inp("bh","Height cm")}</div>`,"bmi")}
 </div>
 <div class=v4view data-v=tape><button data-v4=addtape>Add current calculation</button><button data-v4=exptape>Export tape CSV</button><div id=tapelist></div></div>`;
 document.body.append(b,p);b.onclick=()=>p.classList.toggle("open");$("#v4close").onclick=()=>p.classList.remove("open");
 p.addEventListener("click",e=>{let t=e.target.closest("[data-t]");if(t){$$(".v4tab",p).forEach(x=>x.classList.toggle("on",x===t));$$(".v4view",p).forEach(x=>x.classList.toggle("on",x.dataset.v===t.dataset.t))}
 let q=e.target.closest("[data-v4]");if(!q)return;let id=q.dataset.v4;
 if(id==="unit")calc("unit",()=>{let C={length:{m:1,km:1000,cm:.01,mi:1609.344,ft:.3048},mass:{kg:1,g:.001,lb:.45359237},time:{s:1,min:60,h:3600,day:86400},speed:{"m/s":1,"km/h":1/3.6,mph:.44704}}[$("#uCat").value];return f(n("#uVal")*C[$("#uFrom").value]/C[$("#uTo").value])+" "+$("#uTo").value});
 if(id==="temp")calc("temp",()=>{let v=n("#tv"),a=$("#tf").value,z=$("#tt").value,c=a==="C"?v:a==="F"?(v-32)*5/9:v-273.15;let o=z==="C"?c:z==="F"?c*9/5+32:c+273.15;return f(o)+" °"+z});
 if(id==="pct")calc("pct",()=>{let a=n("#pa"),b=n("#pb"),m=$("#pm").value;return f(m==="of"?a*b/100:m==="wp"?a/b*100:m==="up"?a*(1+b/100):a*(1-b/100))});
 if(id==="disc")calc("disc",()=>{let x=n("#dp")*(1-n("#dd")/100),y=x*(1+n("#dt")/100);return `After discount: ${f(x)} • Final: ${f(y)}`});
 if(id==="ratio")calc("ratio",()=>{let a=n("#ra"),b=n("#rb"),g=gcd(a,b);return g?`${a/g} : ${b/g}`:"Invalid"});
 if(id==="rand")calc("rand",()=>String(Math.floor(Math.random()*(Math.floor(n("#rmax"))-Math.ceil(n("#rmin"))+1))+Math.ceil(n("#rmin"))));
 if(id==="si")calc("si",()=>{let p=n("#sip"),i=p*n("#sir")*n("#sit")/100;return `Interest: ${f(i)} • Total: ${f(p+i)}`});
 if(id==="ci")calc("ci",()=>{let p=n("#cip"),N=Math.max(1,n("#cin")),a=p*(1+n("#cir")/100/N)**(N*n("#cit"));return `Interest: ${f(a-p)} • Total: ${f(a)}`});
 if(id==="emi")calc("emi",()=>{let p=n("#ep"),r=n("#er")/1200,m=Math.max(1,n("#en")),e=r?p*r*(1+r)**m/((1+r)**m-1):p/m;return `EMI: ${f(e)} • Total interest: ${f(e*m-p)}`});
 if(id==="gcd")calc("gcd",()=>{let a=n("#ga"),b=n("#gb"),g=gcd(a,b);return `GCD: ${g} • LCM: ${g?Math.abs(a*b)/g:0}`});
 if(id==="prime")calc("prime",()=>{let x=Math.trunc(n("#pn"));if(x<2)return"Not prime";for(let i=2;i*i<=x;i++)if(x%i===0)return"Not prime";return"Prime ✓"});
 if(id==="factor")calc("factor",()=>{let x=Math.abs(Math.trunc(n("#fn"))),a=[];for(let p=2;p*p<=x;p++)while(x%p===0){a.push(p);x/=p}if(x>1)a.push(x);return a.join(" × ")||String(x)});
 if(id==="quad")calc("quad",()=>{let a=n("#qa"),b=n("#qb"),c=n("#qc"),d=b*b-4*a*c;if(!a)return f(-c/b);if(d<0){let r=-b/2/a,i=Math.sqrt(-d)/2/a;return `x₁=${f(r)}+${f(i)}i • x₂=${f(r)}−${f(i)}i`}return `x₁=${f((-b+Math.sqrt(d))/2/a)} • x₂=${f((-b-Math.sqrt(d))/2/a)}`});
 if(id==="stats")calc("stats",()=>{let a=$("#stats").value.split(/[\s,]+/).map(Number).filter(Number.isFinite).sort((x,y)=>x-y),m=a.reduce((x,y)=>x+y,0)/a.length;return `n=${a.length} • Mean=${f(m)} • Median=${f(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2)} • Min=${a[0]} • Max=${a.at(-1)}`});
 if(id==="avg")calc("avg",()=>{let a=$("#avg").value.split(/[\s,]+/).map(Number).filter(Number.isFinite);return f(a.reduce((x,y)=>x+y,0)/a.length)});
 if(id==="frac")calc("frac",()=>{let a=Math.trunc(n("#fn1")),b=Math.trunc(n("#fd1"));if(!b)return"Denominator cannot be 0";let g=gcd(a,b);return`${a/g}/${b/g}`});
 if(id==="dec")calc("dec",()=>{let x=n("#dec"),s=String(x),d=(s.split(".")[1]||"").length,D=10**d,g=gcd(Math.round(x*D),D);return`${Math.round(x*D)/g}/${D/g}`});
 if(id==="base")calc("base",()=>parseInt($("#basev").value,Math.trunc(n("#basef"))).toString(Math.trunc(n("#baset"))).toUpperCase());
 if(id==="date")calc("date",()=>`${Math.round(Math.abs(new Date($("#db").value)-new Date($("#da").value))/86400000)} days`);
 if(id==="bmi")calc("bmi",()=>{let x=n("#bk")/(n("#bh")/100)**2;return`BMI ${f(x)} • ${x<18.5?"Underweight":x<25?"Normal":x<30?"Overweight":"Obesity"}`});
 if(id==="addtape"){let e=$("#expression")?.textContent||"",r=$("#result")?.textContent||"";if(!e&&!r)return toast("No calculation");S.tape.unshift({e,r,t:Date.now()});S.tape=S.tape.slice(0,200);save();render();toast("Added to tape")}
 if(id==="exptape"){let csv=[["Expression","Result","Time"],...S.tape.map(x=>[x.e,x.r,new Date(x.t).toISOString()])].map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(",")).join("\n"),blob=new Blob([csv],{type:"text/csv"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="sayeed-tape.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),500);toast("Tape exported ✓")}
 });
 function render(){let x=$("#tapelist");if(x)x.innerHTML=S.tape.length?S.tape.map(x=>`<div class=v4row><b>${esc(x.e)}</b><small>= ${esc(x.r)}</small></div>`).join(""):"<div class=v4out>No tape entries.</div>"}
 let C={length:{m:1,km:1000,cm:.01,mi:1609.344,ft:.3048},mass:{kg:1,g:.001,lb:.45359237},time:{s:1,min:60,h:3600,day:86400},speed:{"m/s":1,"km/h":1/3.6,mph:.44704}};
 function units(){let cat=$("#uCat")?.value;if(!cat)return;let o=Object.keys(C[cat]);$("#uFrom").innerHTML=o.map(x=>`<option>${x}</option>`).join("");$("#uTo").innerHTML=o.map(x=>`<option>${x}</option>`).join("");if(o[1])$("#uTo").selectedIndex=1}
 document.addEventListener("change",e=>{if(e.target.id==="uCat")units()});render();setTimeout(units,0)
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",open,{once:true}):open();
})();
