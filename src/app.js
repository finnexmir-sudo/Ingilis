/* ==================================================================
   VERILENLER
   ================================================================== */
const WORDS = RAW.trim().split("\n").map((l, i) => {
  const p = l.split("|");
  return {id:i, en:p[0], az:p[1], pos:p[2]||"", ex:p[3]||"", pack:p[4]||"", tel:p[5]||""};
});

/* ==================================================================
   YADDAS
   ================================================================== */
const KEY = "ingilis_v2";
let mem = null;
const DEF = {p:{}, cfg:{dn:20, dr:60, ss:20, snd:1, goal:60}, log:[], xp:0,
             read:[], dlg:[], shd:[], ach:[], day:{d:"", xp:0}};
/* Xaricden gelen her deyeri tipine ve hedduna gore temizleyir.
   Beleliklə "berpa et" xanasina yapisdirilan zererli metn ise yaramir. */
function num(v, lo, hi, def){
  const n = parseInt(v, 10);
  return (Number.isFinite(n) && n >= lo && n <= hi) ? n : def;
}
function intArr(v, max){
  if (!Array.isArray(v)) return [];
  return v.map(x => parseInt(x, 10)).filter(x => Number.isFinite(x) && x >= 0 && x < max).slice(0, 5000);
}
function dateArr(v){
  if (!Array.isArray(v)) return [];
  return v.filter(x => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(0, 4000);
}
function sanitize(m){
  const o = {};
  const c = (m && typeof m.cfg === "object" && m.cfg) ? m.cfg : {};
  o.cfg = {
    dn:   num(c.dn,   5,  100, 20),
    dr:   num(c.dr,   5,  500, 60),
    ss:   num(c.ss,   5,  100, 20),
    goal: num(c.goal, 20, 300, 60),
    snd:  c.snd ? 1 : 0
  };
  o.xp  = num(m && m.xp, 0, 99999999, 0);
  o.log = dateArr(m && m.log);
  o.read = intArr(m && m.read, 999);
  o.dlg  = intArr(m && m.dlg,  999);
  o.shd  = intArr(m && m.shd,  999);
  o.ach  = Array.isArray(m && m.ach)
    ? m.ach.filter(x => typeof x === "string" && /^[a-z0-9]{1,10}$/.test(x)).slice(0, 100) : [];
  const d = (m && typeof m.day === "object" && m.day) ? m.day : {};
  o.day = { d: (typeof d.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.d)) ? d.d : "",
            xp: num(d.xp, 0, 999999, 0) };
  o.p = {};
  const p = (m && typeof m.p === "object" && m.p) ? m.p : {};
  const ST = ["new","learning","review","mastered"];
  let cnt = 0;
  for (const k in p){
    if (++cnt > 20000) break;
    const id = parseInt(k, 10);
    if (!Number.isFinite(id) || id < 0 || id >= 20000) continue;
    const w = p[k];
    if (!w || typeof w !== "object") continue;
    const e = parseFloat(w.e);
    o.p[id] = {
      s: ST.indexOf(w.s) >= 0 ? w.s : "new",
      r: num(w.r, 0, 9999, 0),
      e: (Number.isFinite(e) && e >= 1.3 && e <= 5) ? Math.round(e*1000)/1000 : 2.5,
      i: num(w.i, 0, 365, 0),
      d: (typeof w.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(w.d)) ? w.d : null,
      ok: num(w.ok, 0, 99999, 0),
      bad: num(w.bad, 0, 99999, 0)
    };
  }
  return o;
}
function load(){
  let raw = null;
  try{ raw = localStorage.getItem(KEY) || localStorage.getItem("ingilis_v1"); }catch(e){}
  let parsed = {};
  try{ parsed = raw ? JSON.parse(raw) : {}; }catch(e){ parsed = {}; }
  mem = sanitize(parsed);
  return mem;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(mem)); }catch(e){} }
const S = load();
const cfg = k => S.cfg[k];
function P(id){
  if (!S.p[id]) S.p[id] = {s:"new", r:0, e:2.5, i:0, d:null, ok:0, bad:0};
  return S.p[id];
}
const today = () => new Date().toISOString().slice(0,10);
const addDays = n => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };

function touchDay(){
  const t = today();
  if (S.day.d !== t) S.day = {d:t, xp:0};
  if (S.log[S.log.length-1] !== t) S.log.push(t);
}
function addXP(n){
  touchDay();
  const was = S.day.xp >= cfg("goal");
  S.xp += n; S.day.xp += n;
  save();
  if (!was && S.day.xp >= cfg("goal")){ buzz([16,60,16]); toast("Gündəlik hədəf tamam!"); }
  checkAch();
}
const LV = x => Math.floor(Math.sqrt(x / 40)) + 1;
const lvFloor = l => (l-1)*(l-1)*40;
const streak = () => {
  const set = new Set(S.log);
  let n = 0, d = new Date();
  if (!set.has(d.toISOString().slice(0,10))) d.setDate(d.getDate()-1);
  while (set.has(d.toISOString().slice(0,10))){ n++; d.setDate(d.getDate()-1); }
  return n;
};
const learnedCount = () => WORDS.filter(w => P(w.id).s !== "new").length;

/* ==================================================================
   NAILIYYETLER
   ================================================================== */
const ACH = [
  {id:"first", ic:"🌱", t:"İlk addım", d:"İlk məşqini bitir", f:()=>S.log.length>=1},
  {id:"s7",    ic:"🔥", t:"Bir həftə", d:"7 gün ardıcıl məşq", f:()=>streak()>=7},
  {id:"s30",   ic:"⚡", t:"Bir ay", d:"30 gün ardıcıl məşq", f:()=>streak()>=30},
  {id:"s100",  ic:"💎", t:"Yüz gün", d:"100 gün ardıcıl məşq", f:()=>streak()>=100},
  {id:"w100",  ic:"📗", t:"100 söz", d:"100 söz öyrən", f:()=>learnedCount()>=100},
  {id:"w500",  ic:"📘", t:"500 söz", d:"500 söz öyrən", f:()=>learnedCount()>=500},
  {id:"w1000", ic:"📚", t:"1000 söz", d:"1000 söz öyrən", f:()=>learnedCount()>=1000},
  {id:"m50",   ic:"🏆", t:"Möhkəm baza", d:"50 söz tam mənimsə",
   f:()=>WORDS.filter(w=>P(w.id).s==="mastered").length>=50},
  {id:"g10",   ic:"📖", t:"Qrammatika", d:"10 dərs oxu", f:()=>S.read.length>=10},
  {id:"gall",  ic:"🎓", t:"Bütün dərslər", d:"32 dərsin hamısını oxu", f:()=>S.read.length>=GRAMMAR.length},
  {id:"d5",    ic:"🎧", t:"Dinləyici", d:"5 dialoq dinlə", f:()=>S.dlg.length>=5},
  {id:"dall",  ic:"🎙", t:"Bütün dialoqlar", d:"Hamısını dinlə", f:()=>S.dlg.length>=DIALOGS.length},
  {id:"lv5",   ic:"⭐", t:"5-ci səviyyə", d:"5-ci səviyyəyə çat", f:()=>LV(S.xp)>=5},
  {id:"lv10",  ic:"🌟", t:"10-cu səviyyə", d:"10-cu səviyyəyə çat", f:()=>LV(S.xp)>=10},
  {id:"sh5",   ic:"🗣", t:"Kölgə ustası", d:"5 nitq parçası kölgələ", f:()=>(S.shd||[]).length>=5},
  {id:"perf",  ic:"🎯", t:"Mükəmməl", d:"Bir testi səhvsiz bitir", f:()=>false},
];
function checkAch(){
  let got = false;
  ACH.forEach(a => {
    if (S.ach.indexOf(a.id) < 0 && a.f()){
      S.ach.push(a.id); got = true;
      setTimeout(()=>{ buzz([20,70,20,70,20]); toast(a.ic + "  " + a.t); }, 500);
    }
  });
  if (got) save();
}
function grantAch(id){
  if (S.ach.indexOf(id) < 0){
    S.ach.push(id); save();
    setTimeout(()=>{ buzz([20,70,20]); toast("🎯  Mükəmməl"); }, 400);
  }
}

/* ==================================================================
   SM-2
   ================================================================== */
function sm2(e,i,r,q){
  if (q < 3) return [Math.max(1.3,e-0.2), 1, 0];
  if (r === 0) i = 1;
  else if (r === 1) i = q>=4 ? 6 : 3;
  else i = Math.max(1, Math.round(i * (q===3?1.2 : q===4?e : e*1.3)));
  e = Math.max(1.3, e + (0.1-(5-q)*(0.08+(5-q)*0.02)));
  return [e, Math.min(i,365), r+1];
}
function grade(id,q){
  const p = P(id);
  const [e,i,r] = sm2(p.e,p.i,p.r,q);
  p.e = Math.round(e*1000)/1000; p.i = i; p.r = r; p.d = addDays(i);
  p.s = q<3 ? "learning" : (i>=30&&r>=5 ? "mastered" : (r>=2 ? "review" : "learning"));
  if (q>=3) p.ok++; else p.bad++;
  touchDay(); save();
  addXP(q>=3 ? 2 : 1);
  return i;
}

/* ==================================================================
   KOMEKCILER
   ================================================================== */
const $ = id => document.getElementById(id);
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];} return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const jq = s => JSON.stringify(String(s)).replace(/"/g,"&quot;");
function buzz(p){ try{ if (navigator.vibrate) navigator.vibrate(p); }catch(e){} }
function toast(t){
  const d = document.createElement("div");
  d.className = "toast"; d.textContent = t;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 2100);
}
function norm(s){
  s = (s||"").trim().toLowerCase().replace(/\u2019/g,"'").replace(/[.,!?;:]/g,"");
  ["to ","a ","an ","the "].forEach(p=>{ if(s.startsWith(p)) s=s.slice(p.length); });
  return s.replace(/\s+/g," ").trim();
}
function lev(a,b){
  if (a===b) return 0;
  if (a.length<b.length) [a,b]=[b,a];
  let prev = Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++) cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]!==b[j-1]?1:0));
    prev=cur;
  }
  return prev[b.length];
}
function check(u,c){
  const a=norm(u), b=norm(c);
  if (!a) return "no";
  if (a===b) return "ok";
  for (const alt of b.replace(/\//g,",").split(",")) if (a===norm(alt)) return "ok";
  const d = lev(a,b);
  const tol = b.length>=25 ? 3 : b.length>=9 ? 2 : b.length>=5 ? 1 : 0;
  return (tol && d<=tol) ? "close" : "no";
}

/* ==================================================================
   SES
   ================================================================== */
let voices = [], vA = null, vB = null;
function pickVoices(){
  if (!("speechSynthesis" in window)) return;
  voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  const gb = voices.filter(v => /^en[-_]GB/i.test(v.lang));
  const pool = gb.length ? gb : voices;
  vA = pool[0] || null;
  vB = pool.find(v => v !== vA) || vA;
}
if ("speechSynthesis" in window){ pickVoices(); speechSynthesis.onvoiceschanged = pickVoices; }
function say(t, o){
  o = o || {};
  if (!cfg("snd") || !("speechSynthesis" in window)) { if (o.cb) o.cb(); return; }
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(t).replace(/\.\.\./g," "));
    u.lang = "en-GB"; u.rate = o.rate || 0.85; u.pitch = o.pitch || 1;
    const v = o.voice === "b" ? vB : vA;
    if (v) u.voice = v;
    if (o.cb) { u.onend = o.cb; u.onerror = o.cb; }
    speechSynthesis.speak(u);
  }catch(e){ if (o.cb) o.cb(); }
}
const speak = t => say(t);
function stopAudio(){ try{ speechSynthesis.cancel(); }catch(e){} }

/* ==================================================================
   SECIM
   ================================================================== */
const dueList  = n => WORDS.filter(w=>{const p=P(w.id);return p.s!=="new"&&p.d&&p.d<=today();})
                           .sort((a,b)=>P(a.id).d.localeCompare(P(b.id).d)).slice(0,n);
const newList  = n => WORDS.filter(w=>P(w.id).s==="new").slice(0,n);
const seenList = n => shuffle(WORDS.filter(w=>P(w.id).s!=="new")).slice(0,n);
const bare = s => s.replace(/\(.*?\)/g,"").replace(/[\/,].*$/,"").trim().toLowerCase();
function distractors(w,n){
  const key = bare(w.az);
  const ok = x => x.id!==w.id && bare(x.az)!==key && x.az!==w.az;
  let pool = shuffle(WORDS.filter(x=>ok(x)&&x.pos===w.pos)).slice(0,n);
  if (pool.length<n) pool = pool.concat(shuffle(WORDS.filter(ok)).slice(0,n-pool.length));
  const out=[]; for(const x of pool) if(!out.includes(x.az)) out.push(x.az);
  return out.slice(0,n);
}
function sentencePool(){
  const out = [];
  WORDS.forEach(w => { if (w.ex && w.ex.split(" ").length>=4) out.push({en:w.ex, az:w.az, w:w.en, id:w.id}); });
  DIALOGS.forEach(d => d.l.forEach(l => { if (l[1].split(" ").length>=4) out.push({en:l[1], az:l[2], w:d.t, id:null}); }));
  return out;
}
function clozePool(n){
  const src = WORDS.filter(w => P(w.id).s!=="new" && w.ex &&
    new RegExp("\\b"+w.en.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i").test(w.ex));
  const src2 = src.length >= 5 ? src : WORDS.filter(w => w.ex &&
    new RegExp("\\b"+w.en.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i").test(w.ex));
  return shuffle(src2).slice(0,n);
}

/* ==================================================================
   EKRAN IDARESI
   ================================================================== */
const main = $("main"), foot = $("foot"), footin = $("footin");
let ses = null, tab = "today";

const TABS = [
  {k:"today",  ic:"🎯", t:"Bu gün",  f:()=>scrToday()},
  {k:"words",  ic:"📗", t:"Sözlər",  f:()=>scrWords()},
  {k:"audio",  ic:"🎧", t:"Səs",     f:()=>scrAudio()},
  {k:"gram",   ic:"📖", t:"Dərs",    f:()=>gramList()},
  {k:"me",     ic:"👤", t:"Profil",  f:()=>scrMe()},
];
function drawTabs(){
  $("tabs").innerHTML = TABS.map(t =>
    `<button class="${tab===t.k?"on":""}" onclick="goTab('${t.k}')"><s>${t.ic}</s>${t.t}</button>`).join("");
}
function goTab(k){
  if (ses && ses.live && !confirm("Məşqdən çıxmaq istəyirsən?\n\nCavabların yadda saxlanılıb.")) return;
  stopAudio(); mStop(); ses = null; tab = k;
  buzz(8);
  drawTabs();
  TABS.find(t=>t.k===k).f();
}
function head(t, c, p){
  $("title").textContent = t||"";
  $("count").textContent = c||"";
  $("back").style.display = t ? "block" : "none";
  $("progi").style.width = p==null ? "0" : (p*100).toFixed(1)+"%";
}
function render(html, footHtml, top){
  mStop();
  main.innerHTML = `<div class="wrap anim${top?" top":""}">${html}</div>`;
  main.scrollTop = 0;
  if (footHtml){ footin.innerHTML = footHtml; foot.style.display = "block"; }
  else { footin.innerHTML=""; foot.style.display="none"; }
  $("back").onclick = backHome;
  $("tabs").style.display = (ses && ses.live) ? "none" : "flex";
}
function backHome(){
  if (ses && ses.live){
    if (!confirm("Məşqdən çıxmaq istəyirsən?\n\nCavabların yadda saxlanılıb.")) return;
  }
  stopAudio(); mStop(); ses = null;
  TABS.find(t=>t.k===tab).f();
}

function cardHTML(w,o){
  o = o||{};
  let h = '<div class="card">';
  if (o.en!==false){
    h += `<div class="hw${w.en.length>13?" sm":""}">${esc(w.en)}</div>`;
    if (w.tel) h += `<div class="tel">${esc(w.tel)}</div>`;
  }
  if (o.azFront) h += `<div class="hw sm" style="color:var(--amber)">${esc(w.az)}</div>`;
  if (w.pos) h += `<div class="pos">${esc(w.pos)}</div>`;
  if (o.az!==false && !o.azFront) h += `<div class="rule"></div><div class="az">${esc(w.az)}</div>`;
  if (o.ex!==false && w.ex) h += `<div class="ex">${esc(w.ex)}</div>`;
  if (o.en!==false) h += `<button class="spk" onclick="speak(${jq(w.en)})">🔊</button>`;
  return h+"</div>";
}

/* ==================================================================
   BU GUN
   ================================================================== */
function scrToday(){
  touchDay(); save();
  head("", "", null);
  const goal = cfg("goal"), got = S.day.xp, pct = Math.min(1, got/goal);
  const lv = LV(S.xp), inLv = S.xp - lvFloor(lv), need = lvFloor(lv+1) - lvFloor(lv);
  const due = dueList(9999).length, nw = WORDS.filter(w=>P(w.id).s==="new").length;
  const C = 2*Math.PI*82;
  render(`
    <div class="ring${pct>=1?" done":""}">
      <svg width="190" height="190" viewBox="0 0 190 190">
        <circle class="bg" cx="95" cy="95" r="82" fill="none" stroke-width="13"/>
        <circle class="fg" cx="95" cy="95" r="82" fill="none" stroke-width="13"
          stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct)}"/>
      </svg>
      <div class="in"><b>${got}</b><s>${goal} XP hədəf</s></div>
    </div>
    <div class="lvbar"><span>Səviyyə ${lv}</span><div><i style="width:${inLv*100/need}%"></i></div>
      <span>${inLv}/${need}</span></div>
    <div class="streak">🔥 <b>${streak()}</b> gün ardıcıl</div>

    <div class="sect">Bu günün məşqi</div>
    <button class="btn go" onclick="startMission()" style="padding:20px">
      Günün missiyası · 5 dəqiqə</button>
    <p class="note">Təkrar, yeni söz, dinləmə və yazı — hamısı bir seansda qarışıq.
    Ən effektiv üsul budur.</p>

    <div class="sect">Tez başla</div>
    <div class="menu">
      <button class="btn" onclick="startReview()"><u><s>🔁</s>Təkrar</u><i>${due}</i></button>
      <button class="btn" onclick="startLearn()"><u><s>✨</s>Yeni sözlər</u><i>${Math.min(nw,cfg("dn"))}</i></button>
      <button class="btn" onclick="dlgList()"><u><s>🎧</s>Dialoq dinlə</u><i>${DIALOGS.length}</i></button>
    </div>`, null, true);
}

/* ---------- gunun missiyasi: qarisiq seans ---------- */
function startMission(){
  const due = dueList(8);
  const nw = newList(due.length ? 4 : 8);
  const cl = clozePool(3), sp = shuffle(sentencePool()).slice(0,3);
  const q = [];
  due.forEach(w => q.push({t:"review", w}));
  nw.forEach(w => q.push({t:"intro", w}));
  cl.forEach(w => q.push({t:"cloze", w}));
  sp.forEach(c => q.push({t:"dict", c}));
  if (!q.length) return alert("Bu gün üçün material yoxdur.");
  ses = {live:true, mode:"mission", q:shuffle(q), i:0, ok:0, tot:0, xp0:S.xp};
  missionStep();
}
function missionStep(){
  const s = ses;
  if (s.i >= s.q.length){
    const gained = S.xp - s.xp0;
    if (s.tot && s.ok === s.tot) grantAch("perf");
    return done(s.ok+" / "+s.tot, "Missiya tamamlandı.", gained);
  }
  const it = s.q[s.i];
  head("Günün missiyası", (s.i+1)+" / "+s.q.length, (s.i+1)/s.q.length);
  if (it.t === "review") reviewCard(it.w, missionNext);
  else if (it.t === "intro") introCard(it.w, missionNext);
  else if (it.t === "cloze") clozeCard(it.w, missionNext);
  else dictCard(it.c, missionNext);
}
function missionNext(good){
  if (good !== null){ ses.tot++; if (good) ses.ok++; }
  ses.i++; missionStep();
}

/* ==================================================================
   SOZLER TAB
   ================================================================== */
function scrWords(){
  head("", "", null);
  const due = dueList(9999).length, nw = WORDS.filter(w=>P(w.id).s==="new").length;
  const learned = learnedCount();
  render(`
    <div class="tiles">
      <div class="tile"><b>${learned}</b><s>öyrənilib</s></div>
      <div class="tile"><b style="color:var(--amber)">${due}</b><s>təkrar</s></div>
      <div class="tile"><b style="color:var(--moss)">${nw}</b><s>yeni</s></div>
    </div>
    <div class="sect">Məşq rejimləri</div>
    <div class="menu">
      <button class="btn go" onclick="startReview()"><u><s>🔁</s>Təkrar (SRS)</u><i>${due}</i></button>
      <button class="btn" onclick="startLearn()"><u><s>✨</s>Yeni sözlər</u><i>${Math.min(nw,cfg("dn"))}</i></button>
      <button class="btn" onclick="startCloze()"><u><s>🧩</s>Boşluğu doldur</u><i>kontekst</i></button>
      <button class="btn" onclick="startQuiz()"><u><s>🎯</s>Çoxvariantlı test</u><i>${cfg("ss")}</i></button>
      <button class="btn" onclick="startType()"><u><s>⌨️</s>Yazma testi</u><i>${cfg("ss")}</i></button>
    </div>
    <div class="sect">Lüğət</div>
    <div class="menu">
      <button class="btn" onclick="searchScreen()"><u><s>🔍</s>Söz axtar</u><i>${WORDS.length}</i></button>
      <button class="btn" onclick="packScreen()"><u><s>📦</s>Paketlər</u><i>13</i></button>
    </div>`, null, true);
}

/* ---------- yeni sozler ---------- */
function startLearn(){
  const c = newList(cfg("dn"));
  if (!c.length) return alert("Bütün sözlər öyrənilib. Təkrara keç.");
  ses = {live:true, mode:"learn", cards:c, i:0, phase:"show", ok:0, tot:0, xp0:S.xp};
  learnStep();
}
function learnStep(){
  const s = ses;
  if (s.i >= s.cards.length){
    if (s.phase==="show"){ s.phase="test"; s.i=0; shuffle(s.cards); }
    else {
      if (s.tot && s.ok===s.tot) grantAch("perf");
      return done(s.ok+" / "+s.tot, "Bu sözlər sabah təkrara düşəcək.", S.xp-s.xp0);
    }
  }
  head("Yeni sözlər", (s.i+1)+" / "+s.cards.length, (s.i+1)/s.cards.length);
  if (s.phase==="show") introCard(s.cards[s.i], ()=>{ s.i++; learnStep(); });
  else typeCard(s.cards[s.i], g=>{ s.tot++; if(g) s.ok++; s.i++; learnStep(); });
}
function introCard(w, cb){
  render(cardHTML(w), `<button class="btn go" onclick="ICB()">Növbəti</button>`);
  window.ICB = () => { buzz(8); addXP(1); cb(null); };
  say(w.en);
}

/* ---------- tekrar ---------- */
function startReview(){
  const c = dueList(cfg("dr"));
  if (!c.length) return alert("Bu gün təkrar yoxdur.\n\nYeni söz öyrənə bilərsən.");
  ses = {live:true, mode:"review", cards:c, i:0, ok:0, tot:0, xp0:S.xp};
  reviewStep();
}
function reviewStep(){
  const s = ses;
  if (s.i>=s.cards.length){
    if (s.tot && s.ok===s.tot) grantAch("perf");
    return done(s.ok+" / "+s.tot, "Dəqiqlik "+Math.round(s.ok*100/Math.max(s.tot,1))+"%", S.xp-s.xp0);
  }
  head("Təkrar", (s.i+1)+" / "+s.cards.length, (s.i+1)/s.cards.length);
  reviewCard(s.cards[s.i], g=>{ s.tot++; if(g) s.ok++; s.i++; reviewStep(); });
}
function reviewCard(w, cb){
  const front = Math.random()<0.5 ? "en" : "az";
  const h = front==="en" ? cardHTML(w,{az:false,ex:false})
                         : cardHTML(w,{en:false,az:false,azFront:true,ex:false});
  render(h, `<button class="btn go" onclick="RV()">Cavabı göstər</button>`);
  if (front==="en") say(w.en);
  window.RV = () => {
    buzz(8);
    render(cardHTML(w), `<div class="grades">
      <button class="btn g0" onclick="RG(0)">Bilmədim</button>
      <button class="btn g3" onclick="RG(3)">Çətin</button>
      <button class="btn g4" onclick="RG(4)">Yaxşı</button>
      <button class="btn g5" onclick="RG(5)">Asan</button></div>`);
    if (front==="az") say(w.en);
    window.RG = q => { buzz(q>=3?10:[10,50,10]); grade(w.id,q); cb(q>=3); };
  };
}

/* ---------- bosluq doldurma ---------- */
function startCloze(){
  const c = clozePool(cfg("ss"));
  if (!c.length) return alert("Kontekst cümləsi tapılmadı.");
  ses = {live:true, mode:"cloze", cards:c, i:0, ok:0, tot:0, xp0:S.xp};
  clozeStep();
}
function clozeStep(){
  const s = ses;
  if (s.i>=s.cards.length){
    if (s.tot && s.ok===s.tot) grantAch("perf");
    return done(s.ok+" / "+s.tot, "Kontekstdə öyrənmək ən güclü üsullardandır.", S.xp-s.xp0);
  }
  head("Boşluğu doldur", (s.i+1)+" / "+s.cards.length, (s.i+1)/s.cards.length);
  clozeCard(s.cards[s.i], g=>{ s.tot++; if(g) s.ok++; s.i++; clozeStep(); });
}
function clozeCard(w, cb){
  const re = new RegExp("\\b"+w.en.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i");
  const blanked = w.ex.replace(re, '<span class="gap">&nbsp;?&nbsp;</span>');
  const opts = shuffle([w.en].concat(
    shuffle(WORDS.filter(x=>x.id!==w.id&&x.pos===w.pos&&x.en.split(" ").length===w.en.split(" ").length))
      .slice(0,3).map(x=>x.en)));
  while (opts.length<4) opts.push(shuffle(WORDS)[0].en);
  render(`
    <div class="cloze"><b>${blanked}</b><i>${esc(w.az)}</i></div>
    <div style="height:18px"></div>
    ${opts.map((o,k)=>`<button class="opt" id="c${k}" onclick="CZ(${k})"><b>${k+1}</b><span>${esc(o)}</span></button>`).join("")}
    <div id="fb"></div>`);
  let locked = false;
  window.CZ = k => {
    if (locked) return;
    locked = true;
    const good = opts[k]===w.en;
    buzz(good?10:[10,50,10]);
    grade(w.id, good?4:0);
    $("c"+k).className = "opt "+(good?"ok":"no");
    if (!good) $("c"+opts.indexOf(w.en)).className = "opt ok";
    $("fb").innerHTML = `<div class="note">${esc(w.ex)}${w.tel?" · "+esc(w.tel):""}</div>`;
    say(w.ex);
    setTimeout(()=>cb(good), 1500);
  };
}

/* ---------- coxvariantli ---------- */
function startQuiz(){
  const c = seenList(cfg("ss")).length ? seenList(cfg("ss")) : newList(cfg("ss"));
  if (!c.length) return alert("Söz tapılmadı.");
  ses = {live:true, mode:"quiz", cards:c, i:0, ok:0, tot:0, xp0:S.xp};
  quizStep();
}
function quizStep(){
  const s = ses;
  if (s.i>=s.cards.length){
    if (s.tot && s.ok===s.tot) grantAch("perf");
    return done(s.ok+" / "+s.tot, Math.round(s.ok*100/s.tot)+"% düzgün", S.xp-s.xp0);
  }
  const w = s.cards[s.i];
  const opts = shuffle(distractors(w,3).concat([w.az]));
  head("Çoxvariantlı test", (s.i+1)+" / "+s.cards.length, (s.i+1)/s.cards.length);
  render(cardHTML(w,{az:false,ex:false}) + '<div style="height:18px"></div>' +
    opts.map((o,k)=>`<button class="opt" id="o${k}" onclick="QP(${k})"><b>${k+1}</b><span>${esc(o)}</span></button>`).join("") +
    '<div id="fb"></div>');
  say(w.en);
  let locked = false;
  window.QP = k => {
    if (locked) return;
    locked = true;
    const good = opts[k]===w.az;
    buzz(good?10:[10,50,10]);
    grade(w.id, good?4:0);
    $("o"+k).className = "opt "+(good?"ok":"no");
    if (!good) $("o"+opts.indexOf(w.az)).className = "opt ok";
    if (w.ex) $("fb").innerHTML = `<div class="note">${esc(w.ex)}</div>`;
    s.tot++; if (good) s.ok++;
    setTimeout(()=>{ s.i++; quizStep(); }, 1200);
  };
}

/* ---------- yazma ---------- */
function startType(){
  const c = seenList(cfg("ss")).length ? seenList(cfg("ss")) : newList(cfg("ss"));
  if (!c.length) return alert("Söz tapılmadı.");
  ses = {live:true, mode:"type", cards:c, i:0, ok:0, tot:0, wrong:[], xp0:S.xp};
  typeStep();
}
function typeStep(){
  const s = ses;
  if (s.i>=s.cards.length){
    if (s.tot && s.ok===s.tot) grantAch("perf");
    const list = s.wrong.slice(0,8).map(w=>esc(w.en)+" — "+esc(w.az)).join("<br>");
    return done(s.ok+" / "+s.tot, list ? "Təkrar bax:<br>"+list : "Hamısı düzgün.", S.xp-s.xp0);
  }
  head("Yazma testi", (s.i+1)+" / "+s.cards.length, (s.i+1)/s.cards.length);
  typeCard(s.cards[s.i], (g,w)=>{ s.tot++; if(g) s.ok++; else s.wrong.push(w); s.i++; typeStep(); });
}
function typeCard(w, cb){
  render(`${cardHTML(w,{en:false,az:false,azFront:true,ex:false})}
    <div class="note">İngiliscəsini yaz</div>
    <input type="text" id="ans" autocomplete="off" autocorrect="off" autocapitalize="none"
           spellcheck="false" enterkeyhint="done">
    <div id="fb"></div>`, `<button class="btn go" id="act" onclick="TS()">Yoxla</button>`);
  const inp = $("ans");
  inp.focus();
  inp.onkeydown = e => { if (e.key==="Enter"){ e.preventDefault(); TS(); } };
  let locked = false;
  window.TS = () => {
    if (locked){ cb(window._tg, w); return; }
    locked = true;
    const r = check(inp.value, w.en);
    const good = r!=="no";
    window._tg = good;
    inp.disabled = true;
    buzz(good?10:[10,50,10]);
    grade(w.id, r==="ok"?5 : r==="close"?3 : 0);
    const m = {ok:["Düzgün","var(--moss)"], close:["Kiçik səhv — diqqət et","var(--amber)"],
               no:["Səhv","var(--rose)"]}[r];
    $("fb").innerHTML = `<div class="feed" style="color:${m[1]}">${m[0]}</div>` + cardHTML(w);
    $("act").textContent = "Növbəti";
    say(w.en);
    main.scrollTop = 9999;
  };
}

/* ==================================================================
   SES TAB
   ================================================================== */
function scrAudio(){
  head("", "", null);
  render(`
    <div class="sect">Dinləmə</div>
    <div class="menu">
      <button class="btn go" onclick="dlgList()"><u><s>💬</s>Səsli dialoqlar</u><i>${S.dlg.length}/${DIALOGS.length}</i></button>
      <button class="btn" onclick="startDict()"><u><s>✍️</s>Diktant — eşit və yaz</u><i>güclü</i></button>
    </div>
    <div class="sect">Danışıq</div>
    <div class="menu">
      <button class="btn go" onclick="shadowList()"><u><s>🗣</s>Kölgə texnikası</u><i>${(S.shd||[]).length}/${SHADOW.length}</i></button>
      <button class="btn" onclick="monoList()"><u><s>🎤</s>Monoloq</u><i>${MONO.length} mövzu</i></button>
    </div>
    <p class="note l">Qulaqlıqla işlə. Kölgə texnikasında öz səsini eşitməmək lazımdır ki,
    beyin natiqin intonasiyasını təqlid etsin.</p>
    <div class="sect">Necə işlətməli</div>
    <button class="btn sm" onclick="methodScreen()">Metodika və gündəlik plan</button>`, null, true);
}

/* ---------- dialoqlar ---------- */
function dlgList(){
  head("Səsli dialoqlar", S.dlg.length+" / "+DIALOGS.length, null);
  const caps = {A1:"Bünövrə",A2:"Əsas",B1:"Orta",B2:"Yuxarı"};
  let h = '<p class="note l" style="margin:0 0 14px">Əvvəl tərcüməsiz dinlə. Sonra mətnə bax. '+
          'Ən sonda özün rollardan birini oxu.</p>';
  ["A1","A2","B1","B2"].forEach(lv=>{
    const it = DIALOGS.map((d,i)=>[d,i]).filter(p=>p[0].lv===lv);
    if (!it.length) return;
    h += `<div class="sect">${lv} · ${caps[lv]}</div>`;
    h += it.map(p=>`<button class="les${S.dlg.indexOf(p[1])>=0?" read":""}" onclick="dlgOpen(${p[1]})">
      <n>${S.dlg.indexOf(p[1])>=0?"✓":(p[1]+1)}</n>
      <span>${esc(p[0].t)}<em style="display:block;font-weight:400;margin-top:2px">${esc(p[0].d)}</em></span></button>`).join("");
  });
  render(h, null, true);
}
function dlgOpen(i){
  const d = DIALOGS[i];
  window._dlgBack = true;
  ses = {live:false, mode:"dlg", i, at:-1, playing:false, tr:true, rate:0.85};
  head(d.lv+" · Dialoq", "", null);
  drawDlg();
  $("back").onclick = dlgList;
}
function drawDlg(){
  const d = DIALOGS[ses.i];
  const _r = render;
  render(`
    <div class="gh">${esc(d.t)}</div>
    <div class="spd">
      <button onclick="dRate(0.65)" class="${ses.rate===0.65?"on":""}">Yavaş</button>
      <button onclick="dRate(0.85)" class="${ses.rate===0.85?"on":""}">Orta</button>
      <button onclick="dRate(1)" class="${ses.rate===1?"on":""}">Normal</button>
    </div>
    <div class="row" style="margin-top:9px">
      <button class="btn sm" onclick="dTr()">${ses.tr?"Tərcüməni gizlət":"Tərcüməni göstər"}</button>
    </div>
    <div class="dl" style="margin-top:16px">
      ${d.l.map((l,k)=>`<div class="line ${l[0]==="A"?"a":"b"}${ses.tr?"":" mute"}" id="L${k}" onclick="dOne(${k})">
        <div class="who">${l[0]==="A"?"A":"B"}</div>
        <b>${esc(l[1])}</b><i>${esc(l[2])}</i></div>`).join("")}
    </div>
    <p class="note">Sətrə toxun — yalnız o cümlə səslənəcək.</p>`,
    `<button class="btn go" id="pb" onclick="dPlay()">${ses.playing?"Dayandır":"Hamısını dinlə"}</button>`);
  $("back").onclick = dlgList;
}
function dRate(r){ ses.rate=r; const p=ses.playing; dStop(); drawDlg(); if(p) dPlay(); }
function dTr(){ ses.tr=!ses.tr; const p=ses.playing; dStop(); drawDlg(); if(p) dPlay(); }
function dOne(k){
  dStop();
  const l = DIALOGS[ses.i].l[k];
  hi(k);
  say(l[1], {rate:ses.rate, voice:l[0]==="A"?"a":"b"});
}
function hi(k){
  document.querySelectorAll(".line").forEach(e=>e.classList.remove("hi"));
  const el = $("L"+k);
  if (el){ el.classList.add("hi");
    try{ el.scrollIntoView({block:"center", behavior:"smooth"}); }catch(e){ el.scrollIntoView(); } }
}
function dPlay(){
  if (ses.playing) return dStop();
  ses.playing = true; ses.at = -1;
  if ($("pb")) $("pb").textContent = "Dayandır";
  dNext();
}
function dNext(){
  if (!ses || !ses.playing) return;
  ses.at++;
  const d = DIALOGS[ses.i];
  if (ses.at >= d.l.length){
    dStop();
    if (S.dlg.indexOf(ses.i)<0){ S.dlg.push(ses.i); addXP(8); save(); toast("+8 XP · dialoq bitdi"); checkAch(); }
    return;
  }
  const l = d.l[ses.at];
  hi(ses.at);
  say(l[1], {rate:ses.rate, voice:l[0]==="A"?"a":"b", cb:()=>setTimeout(dNext, 420)});
}
function dStop(){
  if (!ses) return;
  ses.playing = false;
  stopAudio();
  if ($("pb")) $("pb").textContent = "Hamısını dinlə";
}

/* ---------- diktant ---------- */
function startDict(){
  const p = shuffle(sentencePool()).slice(0, 10);
  if (!p.length) return alert("Cümlə tapılmadı.");
  ses = {live:true, mode:"dict", cards:p, i:0, ok:0, tot:0, xp0:S.xp};
  dictStep();
}
function dictStep(){
  const s = ses;
  if (s.i>=s.cards.length){
    if (s.tot && s.ok===s.tot) grantAch("perf");
    return done(s.ok+" / "+s.tot, "Diktant eşitmə bacarığını ən sürətlə inkişaf etdirir.", S.xp-s.xp0);
  }
  head("Diktant", (s.i+1)+" / "+s.cards.length, (s.i+1)/s.cards.length);
  dictCard(s.cards[s.i], g=>{ s.tot++; if(g) s.ok++; s.i++; dictStep(); });
}
function dictCard(c, cb){
  let plays = 0, locked = false, rate = 0.8;
  const draw = () => render(`
    <div class="sh"><b>🎧</b><i>Cümləni dinlə və eşitdiyini yaz</i></div>
    <div class="spd" style="margin-top:14px">
      <button onclick="DR(0.6)" class="${rate===0.6?"on":""}">Yavaş</button>
      <button onclick="DR(0.8)" class="${rate===0.8?"on":""}">Orta</button>
      <button onclick="DR(1)" class="${rate===1?"on":""}">Normal</button>
    </div>
    <button class="play pulse" onclick="DP()">▶  Dinlə</button>
    <div class="reps" id="rp">dinləmə: ${plays}</div>
    <input type="text" id="ans" autocomplete="off" autocorrect="off" autocapitalize="none"
      spellcheck="false" enterkeyhint="done" style="margin-top:14px;font-size:17px">
    <div id="fb"></div>`,
    `<button class="btn go" id="act" onclick="DS()">Yoxla</button>`);
  draw();
  window.DR = r => { rate = r; draw(); DP(); };
  window.DP = () => { plays++; if($("rp")) $("rp").textContent="dinləmə: "+plays; say(c.en,{rate}); };
  setTimeout(DP, 350);
  window.DS = () => {
    if (locked){ cb(window._dg); return; }
    locked = true;
    const r = check($("ans").value, c.en);
    const good = r!=="no";
    window._dg = good;
    $("ans").disabled = true;
    buzz(good?10:[10,50,10]);
    if (c.id != null) grade(c.id, good?4:0); else addXP(good?2:1);
    const m = {ok:["Düzgün","var(--moss)"], close:["Az qala — diqqətlə bax","var(--amber)"],
               no:["Səhv","var(--rose)"]}[r];
    $("fb").innerHTML = `<div class="feed" style="color:${m[1]}">${m[0]}</div>
      <div class="sh"><b>${esc(c.en)}</b><i>${esc(c.az)}</i></div>`;
    $("act").textContent = "Növbəti";
    main.scrollTop = 9999;
  };
}

/* ---------- kolge ---------- */
function shadowList(){
  head("Kölgə texnikası", "", null);
  const caps = {A1:"Bünövrə",A2:"Əsas",B1:"Orta",B2:"Yuxarı"};
  let h = '<p class="note l" style="margin:0 0 14px">Uzun, təbii nitq parçaları. Səsi eşidən kimi '+
    'natiqin <b>ardınca, eyni anda</b> ucadan danış — dayanmadan, tərcümə etmədən.</p>'+
    '<button class="btn go" onclick="startShadow()">Qarışıq qısa cümlələr</button>'+
    '<p class="note l">Başlanğıc üçün. Uzun parçalar aşağıdadır.</p>';
  ["A2","B1","B2"].forEach(lv=>{
    const it = SHADOW.map((s,i)=>[s,i]).filter(p=>p[0].lv===lv);
    if (!it.length) return;
    h += `<div class="sect">${lv} · ${caps[lv]}</div>`;
    h += it.map(p=>`<button class="les${(S.shd||[]).indexOf(p[1])>=0?" read":""}" onclick="shOpen(${p[1]})">
      <n>${(S.shd||[]).indexOf(p[1])>=0?"✓":(p[1]+1)}</n>
      <span>${esc(p[0].t)}<em style="display:block;font-weight:400;margin-top:2px">${esc(p[0].d)} · ${p[0].l.length} cümlə</em></span></button>`).join("");
  });
  render(h, null, true);
}
function shOpen(i){
  ses = {live:true, mode:"shadow", pack:i, cards:SHADOW[i].l.map(l=>({en:l[0], az:l[1]})),
         i:0, rate:0.75, reps:0, tr:true};
  shadowStep();
}
function startShadow(){
  const p = shuffle(sentencePool()).slice(0,20);
  if (!p.length) return alert("Cümlə tapılmadı.");
  ses = {live:true, mode:"shadow", pack:null, cards:p, i:0, rate:0.75, reps:0, tr:true};
  shadowStep();
}
function shadowStep(){
  const s = ses;
  if (s.i >= s.cards.length){
    if (s.pack != null){
      S.shd = S.shd || [];
      if (S.shd.indexOf(s.pack)<0){ S.shd.push(s.pack); addXP(10); save(); checkAch(); }
    }
    return done(s.cards.length+" cümlə", "Kölgə məşqi bitdi. Sabah eyni parçanı bir də təkrarla — "+
      "ikinci gün həmişə daha rəvan alınır.", s.pack!=null?10:0, "shadowList");
  }
  const c = s.cards[s.i];
  s.reps = 0;
  const title = s.pack!=null ? SHADOW[s.pack].t : "Kölgə texnikası";
  head(title, (s.i+1)+" / "+s.cards.length, (s.i+1)/s.cards.length);
  const long = c.en.split(" ").length > 11;
  render(`
    <div class="sh${long?" long":""}"><b>${esc(c.en)}</b>${s.tr?`<i>${esc(c.az)}</i>`:""}</div>
    <div class="spd">
      <button id="r0" class="${s.rate===0.6?"on":""}" onclick="SR(0.6)">Yavaş</button>
      <button id="r1" class="${s.rate===0.75?"on":""}" onclick="SR(0.75)">Orta</button>
      <button id="r2" class="${s.rate===1?"on":""}" onclick="SR(1)">Normal</button>
    </div>
    <button class="play" onclick="SP()">🔊  Dinlə və eyni anda təkrarla</button>
    <div class="dots" id="dt">${[0,1,2].map(k=>'<i></i>').join("")}</div>
    <div class="reps" id="rp">3 dəfə təkrarla</div>
    <div class="row" style="margin-top:14px">
      <button class="btn sm" onclick="ST()">${s.tr?"Tərcüməni gizlət":"Tərcüməni göstər"}</button>
      ${s.pack!=null?'<button class="btn sm" onclick="SA()">Bütün parçanı dinlə</button>':""}
    </div>`,
    `<button class="btn go" onclick="SN()">Növbəti cümlə</button>`);
  setTimeout(SP, 320);
}
function SR(r){ ses.rate=r; ["r0","r1","r2"].forEach((id,k)=>{ if($(id)) $(id).className=([0.6,0.75,1][k]===r?"on":""); }); SP(); }
function ST(){ ses.tr=!ses.tr; shadowRedraw(); }
function shadowRedraw(){ const r=ses.reps; shadowStep(); ses.reps=r; }
function SP(){
  if (!ses || ses.mode!=="shadow") return;
  ses.reps++;
  const d = $("dt");
  if (d) d.innerHTML = [0,1,2].map(k=>`<i class="${k<ses.reps?"on":""}"></i>`).join("");
  if ($("rp")) $("rp").textContent = ses.reps>=3 ? "hazırsan · növbətiyə keç" : (3-ses.reps)+" dəfə də təkrarla";
  say(ses.cards[ses.i].en, {rate:ses.rate});
}
function SA(){
  const s = ses;
  s.auto = true;
  let k = 0;
  const step = () => {
    if (!ses || !ses.auto || k>=s.cards.length) { if(ses) ses.auto=false; return; }
    say(s.cards[k].en, {rate:s.rate, cb:()=>{ k++; setTimeout(step, 380); }});
  };
  step();
}
function SN(){
  if (ses.auto) ses.auto = false;
  if (ses.reps>0){ touchDay(); addXP(2); }
  ses.i++; shadowStep();
}

/* ---------- monoloq ---------- */
function monoList(){
  head("Monoloq", MONO.length+" mövzu", null);
  const caps = {A1:"Bünövrə",A2:"Əsas",B1:"Orta",B2:"Yuxarı"};
  let h = '<p class="note l" style="margin:0 0 14px">Mövzu seç, taymeri işə sal və ucadan danış. '+
          'Səhv etməkdən qorxma — məqsəd dayanmadan danışmaqdır.</p>';
  ["A1","A2","B1","B2"].forEach(lv=>{
    const it = MONO.map((m,i)=>[m,i]).filter(p=>p[0].lv===lv);
    if (!it.length) return;
    h += `<div class="sect">${lv} · ${caps[lv]}</div>`;
    h += it.map(p=>`<button class="les" onclick="monoOpen(${p[1]})"><n>${p[1]+1}</n>
      <span>${esc(p[0].t)}</span></button>`).join("");
  });
  render(h, null, true);
}
function monoOpen(i){
  const m = MONO[i];
  ses = {live:false, mode:"mono", left:120, timer:null};
  head(m.lv+" · Monoloq", "", null);
  render(`
    <div class="gh">${esc(m.t)}</div>
    <p class="gp">${esc(m.d)}</p>
    <div class="tmr" id="tm">2:00</div>
    <div class="spd">
      <button onclick="MS(60,0)">1 dəq</button>
      <button onclick="MS(120,1)" class="on">2 dəq</button>
      <button onclick="MS(180,2)">3 dəq</button>
    </div>
    <div class="sect">Kömək qəlibləri</div>
    ${m.p.map(x=>{ const q=x.split("~"); const en=(q[0]||"").trim(), az=(q[1]||"").trim();
      return `<div class="scaf"><button onclick="speak(${jq(en)})">🔊</button>
        <b>${esc(en)}</b><i>${esc(az)}</i></div>`; }).join("")}
    <p class="note">Üç nöqtəni öz sözlərinlə doldur. Bitəndən sonra eyni mövzunu bir də danış —
    ikinci dəfə həmişə daha rəvan alınır.</p>`,
    `<button class="btn go" id="mb" onclick="MT()">Başla</button>`, true);
}
function MS(sec,k){
  if (ses.timer) return;
  ses.left = sec;
  document.querySelectorAll(".spd button").forEach((b,n)=>b.className = n===k?"on":"");
  mShow();
}
function mShow(){
  if (!$("tm") || !ses) return;
  const m = Math.floor(ses.left/60), s = ses.left%60;
  $("tm").textContent = m+":"+(s<10?"0":"")+s;
}
function MT(){
  if (ses.timer) return mStop();
  $("mb").textContent = "Dayandır";
  $("tm").className = "tmr run";
  ses.timer = setInterval(()=>{
    ses.left--;
    if (ses.left<=0){
      const done = ses.left;
      mStop();
      if ($("tm")) $("tm").textContent = "0:00";
      buzz([20,80,20,80,20]);
      addXP(10); toast("+10 XP · danışıq məşqi");
      say("Time is up. Well done.");
      return;
    }
    mShow();
  }, 1000);
}
function mStop(){
  if (ses && ses.timer){ clearInterval(ses.timer); ses.timer = null; }
  if ($("mb")) $("mb").textContent = "Başla";
  if ($("tm")) $("tm").className = "tmr";
}

/* ==================================================================
   QRAMMATIKA
   ================================================================== */
const isRead = i => S.read.indexOf(i)>=0;
function markRead(i){
  if (!isRead(i)){ S.read.push(i); addXP(6); save(); toast("+6 XP · dərs oxundu"); checkAch(); }
}
function gramList(){
  head("", S.read.length+" / "+GRAMMAR.length, null);
  const caps = {A1:"Bünövrə",A2:"Əsas",B1:"Orta",B2:"Yuxarı"};
  let h = "";
  ["A1","A2","B1","B2"].forEach(lv=>{
    const it = GRAMMAR.map((g,i)=>[g,i]).filter(p=>p[0].lv===lv);
    if (!it.length) return;
    h += `<div class="sect">${lv} · ${caps[lv]}</div>`;
    h += it.map(p=>`<button class="les${isRead(p[1])?" read":""}" onclick="gramOpen(${p[1]})">
      <n>${isRead(p[1])?"✓":(p[1]+1)}</n><span>${esc(p[0].t)}</span></button>`).join("");
  });
  render(h, null, true);
}
function gramOpen(i){
  const g = GRAMMAR[i];
  ses = null;
  head(g.lv+" · Dərs "+(i+1), "", null);
  let h = `<div class="gh">${esc(g.t)}</div>`;
  g.s.forEach(b=>{
    const k=b[0], v=b[1];
    if (k==="h") h += `<div class="gh">${esc(v)}</div>`;
    else if (k==="p") h += `<p class="gp">${esc(v)}</p>`;
    else if (k==="f") h += `<div class="gf">${esc(v)}</div>`;
    else if (k==="w") h += `<div class="gw">${esc(v)}</div>`;
    else if (k==="e"){
      const q=v.split("~"), en=(q[0]||"").trim(), az=(q[1]||"").trim();
      h += `<div class="ge"><button onclick="speak(${jq(en)})">🔊</button><b>${esc(en)}</b><i>${esc(az)}</i></div>`;
    } else if (k==="x"){
      const q=v.split("~");
      h += `<div class="gx"><u>${esc((q[0]||"").trim())}</u><v>${esc((q[1]||"").trim())}</v></div>`;
    }
  });
  if (g.q && g.q.length){
    h += '<div class="sect">Özünü yoxla</div>';
    g.q.forEach((q,n)=>{
      h += `<div class="qz"><p>${esc(q.q)}</p>` +
        q.o.map((o,k)=>`<button class="qo" id="q${n}o${k}" onclick="GQ(${i},${n},${k})">${esc(o)}</button>`).join("") +
        `<div id="qw${n}"></div></div>`;
    });
  }
  render(h, i+1<GRAMMAR.length
    ? `<button class="btn go" onclick="markRead(${i});gramOpen(${i+1})">Oxudum · növbəti dərs</button>`
    : `<button class="btn go" onclick="markRead(${i});gramList()">Oxudum · siyahıya qayıt</button>`, true);
  $("back").onclick = gramList;
}
function GQ(les,n,k){
  const q = GRAMMAR[les].q[n];
  if ($("qw"+n).innerHTML) return;
  buzz(k===q.a?10:[10,50,10]);
  $("q"+n+"o"+k).className = "qo "+(k===q.a?"ok":"no");
  if (k!==q.a) $("q"+n+"o"+q.a).className = "qo ok";
  $("qw"+n).innerHTML = `<p class="qw">${esc(q.why)}</p>`;
}

/* ==================================================================
   PROFIL
   ================================================================== */
function scrMe(){
  head("", "", null);
  let ok=0,bad=0,mastered=0;
  const packs={};
  WORDS.forEach(w=>{
    const p=P(w.id); ok+=p.ok; bad+=p.bad;
    if (p.s==="mastered") mastered++;
    packs[w.pack]=packs[w.pack]||{t:0,s:0};
    packs[w.pack].t++;
    if (p.s!=="new") packs[w.pack].s++;
  });
  const lv = LV(S.xp), set = new Set(S.log);
  let heat = "";
  for (let i=97;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    heat += `<i class="${set.has(d.toISOString().slice(0,10))?"l3":""}"></i>`;
  }
  render(`
    <div class="tiles">
      <div class="tile"><b style="color:var(--violet)">${lv}</b><s>səviyyə</s></div>
      <div class="tile"><b>${S.xp}</b><s>ümumi XP</s></div>
      <div class="tile"><b style="color:var(--amber)">${streak()}</b><s>ardıcıl gün</s></div>
    </div>
    <div class="sect">Son 14 həftə</div>
    <div class="heat">${heat}</div>

    <div class="sect">İrəliləyiş</div>
    <div class="prow"><span>Öyrənilmiş söz</span><s>${learnedCount()} / ${WORDS.length}</s></div>
    <div class="pbar"><i style="width:${learnedCount()*100/WORDS.length}%"></i></div>
    <div class="prow"><span>Tam mənimsənilib</span><s>${mastered}</s></div>
    <div class="pbar"><i style="width:${mastered*100/WORDS.length}%"></i></div>
    <div class="prow"><span>Dəqiqlik</span><s>${ok+bad?Math.round(ok*100/(ok+bad)):0}% · ${ok}/${ok+bad}</s></div>
    <div class="pbar"><i style="width:${ok+bad?ok*100/(ok+bad):0}%"></i></div>
    <div class="prow"><span>Qrammatika</span><s>${S.read.length} / ${GRAMMAR.length}</s></div>
    <div class="pbar"><i style="width:${S.read.length*100/GRAMMAR.length}%"></i></div>
    <div class="prow"><span>Dialoqlar</span><s>${S.dlg.length} / ${DIALOGS.length}</s></div>
    <div class="pbar"><i style="width:${S.dlg.length*100/DIALOGS.length}%"></i></div>
    <div class="prow"><span>Kölgə parçaları</span><s>${(S.shd||[]).length} / ${SHADOW.length}</s></div>
    <div class="pbar"><i style="width:${(S.shd||[]).length*100/SHADOW.length}%"></i></div>

    <div class="sect">Nailiyyətlər · ${S.ach.length}/${ACH.length}</div>
    ${ACH.map(a=>`<div class="ach${S.ach.indexOf(a.id)>=0?" got":""}"><s>${a.ic}</s>
      <div><b>${a.t}</b><i>${a.d}</i></div></div>`).join("")}

    <div class="sect">Paketlər</div>
    ${Object.keys(packs).sort().map(k=>`
      <div class="prow"><span>${esc(k.replace(/^\d+_/,"").replace(/_/g," "))}</span><s>${packs[k].s}/${packs[k].t}</s></div>
      <div class="pbar"><i style="width:${packs[k].s*100/packs[k].t}%"></i></div>`).join("")}

    <div class="sect">Ayarlar</div>
    <div class="menu">
      <button class="btn" onclick="setGoal()"><u><s>🎯</s>Gündəlik hədəf</u><i>${cfg("goal")} XP</i></button>
      <button class="btn" onclick="setDaily()"><u><s>✨</s>Gündə yeni söz</u><i>${cfg("dn")}</i></button>
      <button class="btn" onclick="toggleSound()"><u><s>${cfg("snd")?"🔊":"🔇"}</s>Səs</u><i>${cfg("snd")?"açıq":"bağlı"}</i></button>
      <button class="btn" onclick="methodScreen()"><u><s>💡</s>Metodika</u><i></i></button>
    </div>

    <div class="sect">Oflayn</div>
    <p class="note l" id="offinfo">Yoxlanılır...</p>

    <div class="sect">Ehtiyat nüsxə</div>
    <p class="note l">Brauzer yaddaşı silinsə proqres itir. Aşağıdakı mətni kopyalayıb özünə göndər.</p>
    <textarea readonly onclick="this.select()">${esc(JSON.stringify(S))}</textarea>
    <button class="btn sm" style="margin-top:9px" onclick="restore()">Ehtiyat nüsxədən bərpa et</button>
    <div style="height:14px"></div>`, null, true);
  offInfo();
}
function offInfo(){
  const el = $("offinfo");
  if (!el) return;
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")){
    el.textContent = "Oflayn rejim yalnız veb ünvanından açılanda işləyir.";
    return;
  }
  navigator.serviceWorker.getRegistration().then(r => {
    el.innerHTML = r
      ? "Tətbiq telefonun yaddaşına yazılıb — internet olmadan da açılacaq. "+
        "Yeni versiya internet olanda avtomatik yüklənir."
      : "Yaddaşa yazılır... Səhifəni bir dəfə yeniləyib bura qayıt.";
  }).catch(()=>{ el.textContent = "Oflayn rejim əlçatan deyil."; });
}
function setGoal(){
  const v = parseInt(prompt("Gündəlik XP hədəfi (20-300):", cfg("goal")),10);
  if (v>=20 && v<=300){ S.cfg.goal=v; save(); }
  scrMe();
}
function setDaily(){
  const v = parseInt(prompt("Gündə neçə yeni söz? (5-100)", cfg("dn")),10);
  if (v>=5 && v<=100){ S.cfg.dn=v; save(); }
  scrMe();
}
function toggleSound(){ S.cfg.snd = cfg("snd")?0:1; save(); if(cfg("snd")) speak("Sound on"); scrMe(); }
function restore(){
  const t = prompt("Saxladığın mətni bura yapışdır:");
  if (!t) return;
  try{
    if (t.length > 3000000) throw 0;
    const o = JSON.parse(t);
    if (!o || typeof o !== "object" || !o.p) throw 0;
    mem = sanitize(o);
    save();
    alert("Bərpa olundu."); goTab("today");
  }catch(e){ alert("Mətn düzgün deyil."); }
}

/* ---------- axtaris / paketler ---------- */
function searchScreen(){
  head("Söz axtar", "", null);
  render(`<input type="text" id="q" placeholder="ingiliscə və ya azərbaycanca"
      autocomplete="off" autocapitalize="none" spellcheck="false"
      style="font-family:var(--sans);font-size:16px;text-align:right">
    <div id="res" style="margin-top:14px"></div>`, null, true);
  const q = $("q"); q.focus();
  q.oninput = () => {
    const t = q.value.trim().toLowerCase();
    if (t.length<2){ $("res").innerHTML=""; return; }
    const hits = WORDS.filter(w=>w.en.toLowerCase().includes(t)||w.az.toLowerCase().includes(t)).slice(0,30);
    $("res").innerHTML = hits.length ? hits.map(w=>{
      const p=P(w.id);
      return `<div class="hit" onclick="speak(${jq(w.en)})"><b>${esc(w.en)}</b>
        ${w.tel?`<u>${esc(w.tel)}</u>`:""}<p>${esc(w.az)}</p>
        <small>${p.s==="new"?"öyrənilməyib":p.s+" · "+(p.d||"")}</small></div>`;
    }).join("") : '<div class="empty">Tapılmadı</div>';
  };
}
function packScreen(){
  head("Paketlər", "", null);
  const packs = {};
  WORDS.forEach(w=>{ packs[w.pack]=packs[w.pack]||{t:0,s:0}; packs[w.pack].t++; if(P(w.id).s!=="new") packs[w.pack].s++; });
  render(Object.keys(packs).sort().map(k=>`
    <div class="prow"><span>${esc(k.replace(/^\d+_/,"").replace(/_/g," "))}</span><s>${packs[k].s}/${packs[k].t}</s></div>
    <div class="pbar"><i style="width:${packs[k].s*100/packs[k].t}%"></i></div>`).join("") +
    '<p class="note l">Sözlər paket ardıcıllığı ilə təqdim olunur: əsas sözlər, fellər, sifətlər, '+
    'gündəlik həyat, İT və bank, ifadələr, iş yazışması, nizamsız fellər, səyahət, müsahibə, '+
    'akademik, Linux, hazır bloklar.</p>', null, true);
}

/* ==================================================================
   METODIKA
   ================================================================== */
function methodScreen(){
  head("Metodika", "", null);
  render(`
    <p class="gp">Bu proqram dil öyrənmə üzrə sübut olunmuş altı üsul üzərində qurulub.
    Hər rejimin arxasında konkret səbəb var.</p>

    <div class="mtd"><b>1 · Aralıqlı təkrar</b>
    <p>Beyin unutmağa başlayanda təkrar ən effektiv olur. Proqram hər sözü tam unutmaq
    ərəfəsində qarşına çıxarır: <em>1 gün → 6 gün → 15 gün → 38 gün</em>.</p>
    <p>Bir sözü ömürlük yadda saxlamaq üçün cəmi 6 dəfə görmək kifayətdir.</p></div>

    <div class="mtd"><b>2 · Aktiv xatırlama</b>
    <p>Sözü oxumaq zəif, xatırlamağa çalışmaq güclü təsir yaradır. Ona görə yazma testi və
    diktant var — cavabı görməzdən əvvəl beyin işləməlidir.</p></div>

    <div class="mtd"><b>3 · Hazır bloklar</b>
    <p>Beyin dili tək sözlərlə deyil, qəliblərlə saxlayır. <em>look</em> və <em>forward</em>
    ayrı öyrənmək əvəzinə <em>I am looking forward to...</em> blokunu bütöv əzbərlə.</p></div>

    <div class="mtd"><b>4 · Kontekstdə öyrənmək</b>
    <p>Tək söz tez unudulur. <em>Boşluğu doldur</em> rejimi sözü cümlə içində göstərir —
    beyin sözü mənası ilə birlikdə kodlaşdırır.</p></div>

    <div class="mtd"><b>5 · Anlaşılan giriş</b>
    <p>Səviyyəndən bir az yuxarı, amma başa düşülən mətn dinləmək dilin ən təbii yoludur.
    <em>Səsli dialoqlar</em> bunun üçündür — əvvəl tərcüməsiz dinlə, sonra mətnə bax.</p></div>

    <div class="mtd"><b>6 · Danışıq istehsalı</b>
    <p>Passiv bilik yalnız istifadə ediləndə aktivləşir. <em>Kölgə texnikası</em> danışıq
    aparatını, <em>Monoloq</em> isə fikir formalaşdırma sürətini məşq etdirir.</p></div>

    <div class="sect">Gündəlik plan · 25 dəqiqə</div>
    <div class="gf">1  Günün missiyası      5 dəq
2  Yeni sözlər          5 dəq
3  Dialoq dinlə         5 dəq
4  Kölgə texnikası      5 dəq
5  Monoloq              5 dəq

həftədə 2 dəfə  ·  qrammatika dərsi</div>
    <p class="note l">Vaxtın azdırsa yalnız <b>Günün missiyası</b> düyməsinə bas — o, təkrarı,
    yeni sözü, kontekst və diktantı bir seansda qarışdırır. Fərqli tipləri qarışdırmaq
    (interleaving) eyni tipi ardıcıl etməkdən daha effektivdir.</p>
    <p class="note l">Bir qayda: təkrarı heç vaxt buraxma. Yeni söz öyrənməmək olar,
    təkrarı atlamaq olmaz.</p>`, null, true);
}

/* ==================================================================
   NETICE
   ================================================================== */
function done(big, sub, xp, ret){
  const back = ret || null;
  ses = null;
  head("Nəticə", "", 1);
  buzz([14,60,14]);
  render(`<div class="done">
    <div class="big">${big}</div>
    <h3>Məşq bitdi</h3>
    <p>${sub||""}</p>
    ${xp ? `<div class="xp">+${xp} XP</div>` : ""}
  </div>`, `<button class="btn go" onclick="${back?back+"()":"backHome()"}">Davam et</button>`);
}

/* ==================================================================
   OFFLINE / SERVICE WORKER
   ================================================================== */
function netFlag(){
  const el = $("off");
  if (el) el.className = navigator.onLine ? "" : "on";
}
window.addEventListener("online",  () => { netFlag(); toast("İnternet qayıtdı"); });
window.addEventListener("offline", () => { netFlag(); toast("Oflayn rejim"); });

if ("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

/* ==================================================================
   BASLAT
   ================================================================== */
document.addEventListener("gesturestart", e=>e.preventDefault());
document.addEventListener("visibilitychange", ()=>{ if(document.hidden){ stopAudio(); mStop(); } });
touchDay(); save(); checkAch();
netFlag();
drawTabs();
scrToday();
