import { STR } from './i18n.js';
import { THEMES, THEME_ORDER, SLOT_IDS, BASES, CLICK_RITES } from './myths.js';

/* Tuning for the end game (same for every myth) */
const DAWN_AT=1e6;          // night total needed before dawn can be greeted
const FLOWER_PCT=2;         // each prestige token: +2 % permanently
const BATTLE_COST=1e11;     // poured in during one night to win the great battle
const VELES_AT=3000;

const $ = id=>document.getElementById(id);
const fill=(s,o)=>s.replace(/\{(\w+)\}/g,(_,k)=>o[k]);
const THEME_KEY='noc-mitova:tema', LANG_KEY='noc-mitova:jezik';
// Save slots in this browser's local storage, one per myth.
const saveKey=id=>'noc-mitova:save2:'+id;
let T, L, lang='hr', themeId, GENS, UPS, S, qty=1;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const merged=id=>{const b=THEMES[id]; return Object.assign({id},b,b[lang]);};
const pct=p=>L.pct(p);

function buildData(){
  GENS=T.spirits.map((s,i)=>({id:SLOT_IDS[i],name:s[0],cyr:s[1],desc:s[2],ups:s[3],hello:s[4],g:T.glyphs[i],base:BASES[i][0],rate:BASES[i][1]}));
  UPS=CLICK_RITES.map((r,i)=>({...r,name:T.clicks[i][0],desc:T.clicks[i][1],req:s=>s.total>=r.at}));
  UPS.push({id:'bells',name:T.bells[0],desc:T.bells[1],cost:6000,req:s=>!s.won && (s.repelled||0)+(s.lost||0)>=1,strike:2});
  GENS.forEach(g=>{
    [[1,10],[10,60]].forEach(([need,mul],i)=>UPS.push({
      id:g.id+i, name:g.ups[i][0], desc:L.genUp(g.ups[i][1],g.name,T), cost:g.base*mul,
      req:s=>(s.gens[g.id]||0)>=need, gen:g.id
    }));
  });
  UPS.sort((a,b)=>a.cost-b.cost);
}

function bandSvg(t){
  const a=t.c1, b=t.c2;
  const svg = t.band==='meander'
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'><path d='M0 13H14M13 13V1H3V9H9V5H6' fill='none' stroke='${a}' stroke-width='1.6'/><rect x='6' y='5' width='1.6' height='1.6' fill='${b}'/></svg>`
    : t.band==='zigzag'
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='14' viewBox='0 0 20 14'><path d='M0 11L5 3L10 11L15 3L20 11' fill='none' stroke='${a}' stroke-width='2'/><circle cx='10' cy='4' r='1.3' fill='${b}'/></svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='14' viewBox='0 0 28 14'><path d='M14 2l5 5-5 5-5-5z' fill='none' stroke='${a}' stroke-width='2'/><path d='M13 6h2v2h-2z' fill='${b}'/><path d='M0 6h4v2H0zM24 6h4v2h-4z' fill='${a}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Static interface text and everything that depends on myth + language.
function applyTexts(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-t]').forEach(el=>el.textContent=L[el.dataset.t]);
  document.querySelectorAll('[data-t-aria]').forEach(el=>el.setAttribute('aria-label',L[el.dataset.tAria]));
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===lang));
  document.querySelectorAll('[data-cheat]').forEach(b=>b.textContent='+'+fmt(+b.dataset.cheat));
  if(!$('reset').classList.contains('armed')) $('reset').textContent=L.reset;
  if(!$('dawnBtn').classList.contains('armed')) $('dawnBtn').textContent=L.dawnBtn;
  const r=document.documentElement.style;
  r.setProperty('--red',T.c1); r.setProperty('--ember',T.c2); r.setProperty('--fern',T.bonusColor);
  r.setProperty('--glag',T.glyphFont); r.setProperty('--glyph-size',T.glyphSize); r.setProperty('--stitch',bandSvg(T));
  $('h1').innerHTML=`${T.h1[0]} <span>${T.h1[1]}</span>`;
  $('tag').innerHTML=T.tag;
  $('themeBtn').textContent=L.themeBtn(T.label);
  $('fire').setAttribute('aria-label',T.fire.aria);
  $('hint').textContent=T.fire.hint;
  $('spiritsTitle').textContent=T.spiritsTitle;
  $('raid').setAttribute('aria-label',L.attack(T.raid.who));
  $('raidHead').textContent=T.raid.head; $('raidSub').textContent=T.raid.sub;
  $('endA').textContent=T.raid.ends[0]; $('endB').textContent=T.raid.ends[1];
  $('serpent').textContent=T.marker; $('serpent').style.fontFamily=T.markerFont; $('serpent').title=T.raid.who;
  $('strikeLabel').textContent=T.raid.strike;
  $('finLabel').textContent=T.raid.fin[0]; $('finSub').textContent=T.raid.fin[1];
  $('battleTitle').textContent=T.battle.name;
  $('perunPill').textContent=`${T.battle.blessing} ×2`;
  $('flowersLabel').textContent=T.prestige.short;
  $('dawnCopy').innerHTML=L.dawnCopy(T,pct(FLOWER_PCT));
}

// Per-night fields are reset at dawn; everything listed in KEEP survives it.
function fresh(){return {v:4,dukh:0,total:0,clicks:0,gens:{},ups:[],log:[],buffEnd:0,nextFern:Date.now()+45000,last:Date.now(),
  raid:null,nextVeles:0,repelled:0,lost:0,nightRepelled:0,battle:0,
  flowers:0,nights:1,lifetime:0,ferns:0,started:Date.now(),won:false,wonAt:0,fightStats:null}}
const KEEP=['clicks','repelled','lost','flowers','nights','lifetime','ferns','started','won','wonAt','fightStats'];

function fmt(n){
  const c=s=>s.replace('.',L.dec);
  if(n<1000) return (n<100 && n%1) ? c(n.toFixed(1)) : Math.floor(n).toString();
  const u=L.units; let i=-1;
  while(n>=1000 && i<u.length-1){n/=1000;i++}
  return c(n.toFixed(n<10?2:n<100?1:0))+L.sp+u[i];
}
function dur(ms){const m=Math.floor(ms/60000),h=Math.floor(m/60),d=Math.floor(h/24);
  return d?`${d} d ${h%24} h`:h?`${h} h ${m%60} min`:`${Math.max(1,m)} min`}
const has = id=>S.ups.includes(id);
function genMult(id){return 2**UPS.filter(u=>u.gen===id && has(u.id)).length}
function permMult(){return (1+S.flowers*FLOWER_PCT/100)*(S.won?2:1)}
function buffMult(){return Date.now()<S.buffEnd ? 7 : 1}
function baseRate(){return GENS.reduce((a,g)=>a+(S.gens[g.id]||0)*g.rate*genMult(g.id),0)*permMult()}
function perSec(){return baseRate()*buffMult()*(S.raid?0.75:1)}
function perClick(){
  const m = UPS.filter(u=>u.click && has(u.id)).reduce((a,u)=>a*u.click,1);
  const p = UPS.filter(u=>u.pct && has(u.id)).reduce((a,u)=>a+u.pct,0);
  return m*permMult() + perSec()*p;
}
function genCost(g,k){const n=S.gens[g.id]||0; return g.base*1.15**n*(1.15**k-1)/0.15}

function gain(x){S.dukh+=x;S.total+=x;S.lifetime+=x}
let toastT;
function toast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,4200)}

/* ---------- Chronicle: stored as events, rendered in the current language ---------- */
function log(e){S.log.unshift(e);S.log=S.log.slice(0,6);renderLog()}
function logText(e){
  if(typeof e==='string') return e;
  const x=e.x!=null?fmt(e.x):'';
  switch(e.k){
    case 'hello': return GENS[e.i].hello;
    case 'rite': { const u=UPS.find(u=>u.id===e.id); return u?L.rite(u.name):''; }
    case 'buff': return T.bonus.buff;
    case 'treasure': return fill(T.bonus.treasure,{x});
    case 'flee': case 'finFlee': case 'win': return fill(T.raid[e.k],{x});
    case 'pour': return L.pourLog(x,T,GENS[8].name);
    case 'battleWin': return L.battleWin(T);
    case 'night': return L.newNight(e.n);
  }
  return '';
}
function renderLog(){
  const ol=$('log'); ol.innerHTML='';
  const items=S.log.length?S.log.map(logText):[T.fire.start];
  items.forEach(m=>{const li=document.createElement('li');li.textContent=m;ol.appendChild(li)});
}

/* ---------- Duhovi / spirits ---------- */
const genEls={};
function buildGens(){
  const box=$('gens'); box.innerHTML='';
  GENS.forEach(g=>{
    const b=document.createElement('button'); b.className='gen'; b.id='gen-'+g.id;
    b.innerHTML=`<span class="glyph" aria-hidden="true"></span>
      <span><span class="name"></span><span class="cyr"></span><div class="desc"></div></span>
      <span class="side"><div class="owned">0</div><div class="cost"></div></span>`;
    b.addEventListener('click',()=>buyGen(g));
    box.appendChild(b); genEls[g.id]=b;
  });
}
function renderGens(){
  let shownMystery=false;
  GENS.forEach((g,i)=>{
    const el=genEls[g.id], n=S.gens[g.id]||0;
    const known = n>0 || i===0 || (S.gens[GENS[i-1].id]||0)>0 || S.total>=g.base*0.6;
    const cost=genCost(g,qty), can=S.dukh>=cost;
    if(!known){
      if(shownMystery){el.hidden=true;return}
      shownMystery=true; el.hidden=false; el.classList.add('mystery');
      el.querySelector('.glyph').textContent='?';
      el.querySelector('.glyph').title='';
      el.querySelector('.name').textContent=L.mystery;
      el.querySelector('.cyr').textContent='';
      el.querySelector('.desc').textContent=L.mysteryDesc(T);
    } else {
      el.hidden=false; el.classList.remove('mystery');
      el.querySelector('.glyph').textContent=g.g;
      el.querySelector('.glyph').title=`${T.glyphTitle} ${i+1}`;
      el.querySelector('.name').textContent=g.name;
      el.querySelector('.cyr').textContent=g.cyr;
      el.querySelector('.desc').textContent=n>0 ? `${g.desc} ${L.oneGives(fmt(g.rate*genMult(g.id)*permMult()))}` : g.desc;
    }
    el.querySelector('.owned').textContent=n;
    el.querySelector('.cost').textContent=fmt(cost)+(qty>1?L.costFor(qty):'');
    el.setAttribute('aria-disabled', (!known||!can)?'true':'false');
  });
}
function buyGen(g){
  const cost=genCost(g,qty); if(S.dukh<cost) return;
  const first=!(S.gens[g.id]>0);
  S.dukh-=cost; S.gens[g.id]=(S.gens[g.id]||0)+qty;
  if(first) log({k:'hello',i:GENS.indexOf(g)});
  renderAll();
}

/* ---------- Obredi / rites ---------- */
let upKey='';
function renderUps(){
  const avail=UPS.filter(u=>!has(u.id) && u.req(S));
  const key=themeId+lang+':'+avail.map(u=>u.id).join();
  const box=$('ups');
  if(key!==upKey){
    upKey=key; box.innerHTML='';
    if(!avail.length){ const p=document.createElement('p'); p.className='empty'; p.textContent=L.noRites; box.appendChild(p); }
    avail.forEach(u=>{
      const b=document.createElement('button'); b.className='up'; b.dataset.id=u.id;
      b.innerHTML=`<span class="name"></span><span class="desc"></span><span class="cost"></span>`;
      b.querySelector('.name').textContent=u.name;
      b.querySelector('.desc').textContent=u.desc;
      b.querySelector('.cost').textContent=L.cost(fmt(u.cost),T);
      b.addEventListener('click',()=>{ if(S.dukh<u.cost||has(u.id))return; S.dukh-=u.cost; S.ups.push(u.id); log({k:'rite',id:u.id}); renderAll(); });
      box.appendChild(b);
    });
  }
  box.querySelectorAll('.up').forEach(b=>{
    const u=UPS.find(x=>x.id===b.dataset.id);
    b.setAttribute('aria-disabled', S.dukh>=u.cost?'false':'true');
  });
}

function renderTop(){
  $('dukh').textContent=fmt(S.dukh);
  $('rate').textContent=fmt(perSec())+' '+L.perSec;
  $('perClick').textContent=fmt(perClick());
  $('total').textContent=fmt(S.total);
  $('clicks').textContent=S.clicks.toLocaleString(L.locale);
  $('nightLabel').textContent=S.nights>1?L.nightLabel(T.cur.nom,S.nights):T.cur.nom;
  const left=Math.ceil((S.buffEnd-Date.now())/1000);
  $('buff').hidden=left<=0;
  if(left>0) $('buff').textContent=L.buff(T.bonus.name,left);
  $('flowerPill').hidden=!S.flowers;
  if(S.flowers) $('flowerPill').textContent=`${T.prestige.name} +${pct(S.flowers*FLOWER_PCT)}`;
  $('perunPill').hidden=!S.won;
  $('hint').hidden=S.clicks>=15;
  renderRaid();
}
function renderAll(){renderTop();renderGens();renderUps();renderBattle();renderDawn()}

/* ---------- Bonus in the fire (fern flower etc.) ---------- */
let fernEl=null, fernGone=0;
function spawnFern(){
  const b=document.createElement('button'); b.className='fern'; b.setAttribute('aria-label',L.take(T.bonus.name));
  b.innerHTML=`<svg viewBox="-26 -26 52 52" width="52" height="52" aria-hidden="true">${
    [0,72,144,216,288].map(r=>`<ellipse rx="7" ry="15" cy="-11" fill="${T.bonusColor}" transform="rotate(${r})"/>`).join('')
  }<circle r="6" fill="${T.c2}"/></svg>`;
  b.style.left=(8+Math.random()*68)+'%'; b.style.top=(6+Math.random()*50)+'%';
  b.addEventListener('click',e=>{e.stopPropagation();pickFern()});
  $('fireWrap').appendChild(b); fernEl=b; fernGone=Date.now()+13000;
  toast(T.bonus.toast);
}
function pickFern(){
  if(!fernEl) return; fernEl.remove(); fernEl=null; S.ferns++;
  if(Math.random()<0.5 && baseRate()>0){
    S.buffEnd=Date.now()+30000; log({k:'buff'});
  } else {
    const x=Math.max(25, Math.min(S.dukh*0.15, baseRate()*900)+baseRate()*60);
    gain(x); log({k:'treasure',x});
  }
  S.nextFern=Date.now()+60000+Math.random()*90000;
  renderAll();
}

/* ---------- Raid (Veles, Typhon, Apep …) ---------- */
// p runs from 0 (start) to 1 (goal). He moves a little faster each time you drive him off in the same night.
function climbRate(){return 0.05*Math.min(2,1+0.1*S.nightRepelled)}
function strikePower(){return 0.025*((S.gens.firebird||0)>0?2:1)*(has('bells')?2:1)}
function scheduleVeles(min,spread){S.nextVeles=Date.now()+min+Math.random()*spread}
function startRaid(){
  S.raid={p:0.2};
  toast(T.raid.start);
  renderAll();
}
function velesFlees(byFinisher){
  const x=Math.max(50, baseRate()*120);
  S.raid=null; S.repelled++; S.nightRepelled++; gain(x); scheduleVeles(180000,180000);
  log({k:byFinisher?'finFlee':'flee',x});
  renderAll();
}
function velesWins(){
  const x=Math.min(S.dukh*0.1, baseRate()*600+100);
  S.raid=null; S.lost++; S.dukh-=x; scheduleVeles(180000,180000);
  log({k:'win',x});
  toast(fill(T.raid.lost,{x:fmt(x)}));
  renderAll();
}
function renderRaid(){
  const on=!!S.raid; $('raid').hidden=!on; if(!on) return;
  const p=Math.max(0,Math.min(1,S.raid.p))*100;
  $('oakFill').style.width=p+'%'; $('serpent').style.left=p+'%';
  const bonus=[(S.gens.firebird||0)>0&&`${T.raid.helper} ×2`, has('bells')&&`${T.bells[2]} ×2`].filter(Boolean).join(' · ');
  $('strikeSub').textContent=L.strikeSub+(bonus?' · '+bonus:'');
  $('perunBtn').hidden=!((S.gens.perun||0)>0);
}
$('strike').addEventListener('click',()=>{
  if(!S.raid) return;
  S.raid.p-=strikePower(); boltFx(false);
  if(S.raid.p<=0) velesFlees(false); else renderRaid();
});
$('perunBtn').addEventListener('click',()=>{ if(!S.raid) return; boltFx(true); velesFlees(true); });

/* ---------- Great battle ---------- */
function renderBattle(){
  const show=S.won || (S.gens.perun||0)>0;
  $('battle').hidden=!show; if(!show) return;
  if(S.won){
    $('battleCopy').innerHTML=L.wonCopy(T);
    $('battleFill').style.width='100%';
    $('battleTxt').textContent=L.wonOn(S.wonAt||S.nights);
    $('battleBtn').textContent=L.watchEnd;
    $('battleBtn').setAttribute('aria-disabled','false');
    $('fightBtn').hidden=true;
    $('fightHint').textContent=`${L.trophy}: ${TROPHY[themeId][lang]}`;
    return;
  }
  const s=strength(), full=S.battle>=BATTLE_COST;
  $('battleCopy').innerHTML=L.battleCopy(T);
  $('battleFill').style.width=s*100+'%';
  $('battleTxt').textContent=L.progress(fmt(S.battle),fmt(BATTLE_COST),T);
  $('battleBtn').textContent=full?L.full:L.pour(T);
  $('battleBtn').setAttribute('aria-disabled', (!full&&S.dukh>=1)?'false':'true');
  $('fightBtn').hidden=false;
  $('fightBtn').textContent=L.fightBegin;
  $('fightBtn').setAttribute('aria-disabled', s>=FIGHT_MIN?'false':'true');
  $('fightHint').textContent = s>=FIGHT_MIN ? L.fightReady(pct(Math.round(s*100))) : L.fightNeed(fmt(BATTLE_COST*FIGHT_MIN),T);
}
$('battleBtn').addEventListener('click',()=>{
  if(S.won){ showEnding(false); return; }
  if(S.dukh<1 || S.battle>=BATTLE_COST) return;
  const give=Math.min(S.dukh, BATTLE_COST-S.battle);
  S.dukh-=give; S.battle+=give; boltFx(false);
  log({k:'pour',x:give}); renderAll();
});
$('fightBtn').addEventListener('click',()=>startFight());
function winBattle(){
  S.won=true; S.wonAt=S.nights; S.raid=null; S.battle=BATTLE_COST;
  log({k:'battleWin'});
  renderAll(); save(); boltFx(true);
  showEnding(true);
}

/* ---------- The great battle: a three-phase fight ----------
   1 The climb: the monster climbs the scene; clicks knock it back. Poured strength sets how hard each click hits.
   2 Hide and seek: it glows in one of three hiding places from the myth, they shuffle, you pick one. Three rounds.
   3 The final strike: click while the needle is in the golden zone. Helpers and hide-and-seek hits widen the zone.
   Losing costs nothing but time; the poured strength stays for the next try. */
const FIGHT_MIN=.2, CLIMB=.07;
const HIDES={hr:['tree','stone','water'],sl:['mountain','cloud','water'],no:['tree','water','cave'],gr:['water','mountain','cave'],ro:['cave','stone','tree'],eg:['water','stone','cave']};
const MONSTER_COL={hr:'#7d9c4a',sl:'#5e8f3c',no:'#4f8a76',gr:'#9a7440',ro:'#8a5236',eg:'#7464a8'};
const TROPHY={hr:{hr:'Velesov rog',en:'Veles’s horn'},sl:{hr:'Zmajev zub',en:'The Zmey’s fang'},no:{hr:'Níðhöggrov zub',en:'Níðhöggr’s fang'},
  gr:{hr:'Tifonov rog',en:'Typhon’s horn'},ro:{hr:'Kakov rog',en:'Cacus’s horn'},eg:{hr:'Apepov zub',en:'Apep’s fang'}};
const ICONS={
  tree:'<svg viewBox="0 0 24 24"><path d="M12 22v-7M12 3c-4 0-6.5 3-6.5 6.2S8.5 15 12 15s6.5-2.6 6.5-5.8S16 3 12 3z"/></svg>',
  stone:'<svg viewBox="0 0 24 24"><path d="M3 19l2.5-7 5-4.5 6 2 4.5 6-3 3.5z"/></svg>',
  water:'<svg viewBox="0 0 24 24"><path d="M2 9c2.5-2 5 2 7.5 0s5 2 7.5 0 4 0 5 0M2 15c2.5-2 5 2 7.5 0s5 2 7.5 0 4 0 5 0"/></svg>',
  cloud:'<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/></svg>',
  mountain:'<svg viewBox="0 0 24 24"><path d="M2 20l7-12 4 6 3-4 6 10z"/></svg>',
  cave:'<svg viewBox="0 0 24 24"><path d="M3 20c0-9 4-15 9-15s9 6 9 15M8 20c0-4 1.8-7 4-7s4 3 4 7"/></svg>',
};
let F=null;
const fcv=$('fcv');
const FX={ctx:fcv.getContext('2d'),W:0,H:0,parts:[],bolt:null,flash:0,heat:0};
new ResizeObserver(()=>{const r=fcv.getBoundingClientRect(),d=devicePixelRatio||1;FX.W=r.width;FX.H=r.height;fcv.width=r.width*d;fcv.height=r.height*d;FX.ctx.setTransform(d,0,0,d,0,0)}).observe(fcv);
// Run scene-drawing code against the fight canvas instead of the main one.
function withFight(fn){
  const o={ctx,W,H,parts,bolt,flash,heat};
  ctx=FX.ctx;W=FX.W;H=FX.H;parts=FX.parts;bolt=FX.bolt;flash=FX.flash;heat=FX.heat;
  try{fn()}finally{FX.parts=parts;FX.bolt=bolt;FX.flash=flash;FX.heat=heat;({ctx,W,H,parts,bolt,flash,heat}=o)}
}
const strength=()=>Math.min(1,S.battle/BATTLE_COST);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fightAlive=id=>F&&F.id===id&&!$('fight').hidden;
const helperOwned=()=>(S.gens.firebird||0)>0;
function climbPower(){return .012*(.5+strength())*(helperOwned()?1.5:1)*(has('bells')?1.25:1)}
function zoneWidth(){return .1+(helperOwned()?.04:0)+(has('bells')?.03:0)+F.hits*.02}
function newZone(){const w=zoneWidth();return [.04+Math.random()*(.92-w),w]}

function startFight(){
  if(S.won||strength()<FIGHT_MIN) return;
  S.raid=null;
  F={id:Math.random(),phase:1,p:.35,hits:0,round:0,attempts:3,used:0,needle:0,t3:0,speed:1,zone:[.45,.12],last:performance.now(),over:false};
  FX.parts=[]; FX.bolt=null; FX.flash=0;
  $('fight').hidden=false; $('fEnd').hidden=true;
  $('fTitle').textContent=T.battle.name; $('fQuit').textContent=L.quit;
  setPhase(1);
  requestAnimationFrame(fightLoop);
  setTimeout(()=>$('fStrike').focus({preventScroll:true}),60);
}
function setPhase(n){
  F.phase=n;
  [...$('fSteps').children].forEach((s,i)=>s.className=i<n-1?'done':i===n-1?'now':'');
  $('fPhase').textContent=`${n}/3 · ${L.phases[n-1]}`;
  $('fHelp').textContent=L.phaseHelp[n-1](T);
  $('fClimb').hidden=n!==1; $('fPower').hidden=n!==3; $('fTimer').hidden=true;
  $('fStrike').hidden=n===2; $('fStrike').textContent=L.strikeNow;
  $('fTokens').innerHTML='';
  if(n===3){F.zone=newZone();F.attempts=3;F.used=0;F.speed=1;F.t3=0}
  fInfo();
  if(n===2) runHide(F.id);
}
function fInfo(){
  const s=pct(Math.round(strength()*100));
  $('fInfo').textContent = F.phase===2 ? L.roundN(Math.max(1,F.round)) : F.phase===3 ? `${L.attemptsLeft(F.attempts)} · ${L.strengthLabel} ${s}` : `${L.strengthLabel} ${s}`;
}
function flashMsg(text){const m=$('fMsg');m.textContent=text;m.classList.add('on');clearTimeout(flashMsg.t);flashMsg.t=setTimeout(()=>m.classList.remove('on'),750)}
function monsterPos(t=performance.now()){
  if(F.phase>=2.5) return [.5+Math.sin(t/420)*.06,.3+Math.sin(t/300)*.02];
  return [.5+Math.sin(t/520)*.08,.92-Math.max(0,F.p)*.78];
}
function drawMonster(t){
  const [hx,hy]=monsterPos(t), col=MONSTER_COL[themeId];
  for(let i=14;i>=1;i--){
    const u=i/14, x=hx+Math.sin(t/220+i*.8)*.04*(u+.2), y=hy+u*.34;
    circ(x,y,.045-.026*u,col); if(i%2) circ(x,y,.045-.026*u,'rgba(0,0,0,.22)');
  }
  line(hx-.028,hy-.03,hx-.055,hy-.085,'#ece2c8',.011); line(hx+.028,hy-.03,hx+.055,hy-.085,'#ece2c8',.011);
  ell(hx,hy,.058,.046,col); ell(hx,hy+.022,.04,.018,'rgba(0,0,0,.3)');
  halo(hx,hy,.07,'255,90,60',.25);
  circ(hx-.021,hy-.01,.009,'#ffdd55'); circ(hx+.021,hy-.01,.009,'#ffdd55');
}
function fBolt([x,y],big){
  withFight(()=>{
    flash=big?1:.45; heat=Math.min(1,heat+.3);
    if(reduce||!W) return;
    const pts=[]; let bx=W*(x+(Math.random()-.5)*.3), by=0; pts.push([bx,by]);
    while(by<y*H){by+=H*(.05+Math.random()*.06); bx+=(x*W-bx)*.3+(Math.random()-.5)*W*.06; pts.push([bx,Math.min(by,y*H)])}
    pts.push([x*W,y*H]); bolt={pts,life:big?20:8};
    for(let i=0;i<(big?36:12);i++) parts.push({x:x*W,y:y*H,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,life:0,max:28+Math.random()*20,r:1.5+Math.random()*2,spark:true});
  });
}
function fightLoop(now){
  if(!F||$('fight').hidden) return;
  const dt=Math.min(.1,(now-F.last)/1000); F.last=now;
  if(F.phase===1&&!F.over){
    F.p+=CLIMB*dt;
    if(F.p>=1){F.p=1;F.over=true;flashMsg(L.miss);setTimeout(()=>fightLost(),700)}
    $('fClimbFill').style.width=Math.min(100,F.p*100)+'%';
  }
  if(F.phase===3&&!F.over){
    F.t3+=dt*F.speed; F.needle=(Math.sin(F.t3*2.4)+1)/2;
    $('fNeedle').style.left=F.needle*100+'%';
    $('fZone').style.left=F.zone[0]*100+'%'; $('fZone').style.width=F.zone[1]*100+'%';
  }
  if(FX.W) withFight(()=>{
    if(Math.random()<.6) emit(reduce?1:2,false);
    for(const p of parts){p.life++;p.x+=p.vx+(Math.random()-.5)*.6;p.y+=p.vy;if(!p.spark)p.vx*=.96}
    parts=parts.filter(p=>p.life<p.max); heat*=.96;
    draw(now);
    if(F.phase!==2 && !(F.phase===1.5)) drawMonster(reduce?0:now);
  });
  requestAnimationFrame(fightLoop);
}
function fightStrike(){
  if(!F||F.over) return;
  if(F.phase===1){
    F.p-=climbPower(); fBolt(monsterPos(),false);
    if(F.p<=0){F.p=0;F.phase=1.5;flashMsg(L.hit);const id=F.id;setTimeout(()=>fightAlive(id)&&setPhase(2),800)}
  } else if(F.phase===3){
    F.used++;
    const [z,w]=F.zone;
    if(F.needle>=z&&F.needle<=z+w){F.over=true;fBolt(monsterPos(),true);flashMsg(L.victoryShort);const id=F.id;setTimeout(()=>fightAlive(id)&&fightWon(),1300)}
    else{
      F.attempts--; flashMsg(L.miss);
      if(F.attempts<=0){F.over=true;setTimeout(()=>fightLost(),800)}
      else{F.zone=newZone();F.speed*=1.18}
    }
    fInfo();
  }
}
async function runHide(id){
  const kinds=HIDES[themeId], box=$('fTokens'), slots=[.2,.5,.8], pos=[0,1,2];
  box.innerHTML='';
  const toks=kinds.map(k=>{const b=document.createElement('button');b.className='token';b.disabled=true;
    b.innerHTML=`${ICONS[k]}<span>${L.spots[k]}</span><span class="peek" aria-hidden="true">${T.marker}</span>`;
    b.querySelector('.peek').style.fontFamily=T.markerFont; box.appendChild(b); return b});
  const place=()=>toks.forEach((b,i)=>b.style.left=slots[pos[i]]*100+'%');
  place();
  for(let r=1;r<=3;r++){
    F.round=r; fInfo(); $('fHelp').textContent=L.watch;
    await sleep(600); if(!fightAlive(id)) return;
    const real=Math.floor(Math.random()*3);
    toks[real].classList.add('has'); await sleep(reduce?1500:1000); if(!fightAlive(id)) return;
    toks[real].classList.remove('has'); await sleep(300);
    const swaps=[3,5,7][r-1], ms=reduce?700:[440,340,270][r-1];
    toks.forEach(b=>b.style.transitionDuration=reduce?'0s':ms*.85+'ms');
    for(let s=0;s<swaps;s++){
      const a=Math.floor(Math.random()*3), b=(a+1+Math.floor(Math.random()*2))%3;
      [pos[a],pos[b]]=[pos[b],pos[a]]; place();
      await sleep(ms); if(!fightAlive(id)) return;
    }
    $('fHelp').textContent=L.choose;
    const pick=await new Promise(res=>{
      let done=false, iv=0; const t0=performance.now();
      const fin=v=>{if(done)return;done=true;clearInterval(iv);toks.forEach(b=>{b.disabled=true;b.onclick=null});$('fTimer').hidden=true;res(v)};
      toks.forEach((b,i)=>{b.disabled=false;b.onclick=e=>{e.stopPropagation();fin(i)}});
      $('fTimer').hidden=false;
      iv=setInterval(()=>{if(!fightAlive(id)){fin(-2);return}const u=(performance.now()-t0)/4500;$('fTimerFill').style.width=Math.max(0,100-u*100)+'%';if(u>=1)fin(-1)},50);
    });
    if(!fightAlive(id)) return;
    toks[real].classList.add('has');
    if(pick===real){F.hits++;toks[real].classList.add('hit');fBolt([slots[pos[real]],.82],false);flashMsg(L.hit)}
    else{if(pick>=0)toks[pick].classList.add('wrong');flashMsg(L.miss)}
    fInfo();
    await sleep(1100); if(!fightAlive(id)) return;
    toks.forEach(b=>b.classList.remove('hit','has','wrong'));
  }
  F.phase=2.5; await sleep(300); if(!fightAlive(id)) return;
  setPhase(3);
}
function fightLost(){
  if(!F) return;
  F.over=true;
  ['fStrike','fPower','fClimb','fTimer'].forEach(i=>$(i).hidden=true); $('fTokens').innerHTML='';
  $('fEnd').hidden=false;
  $('fEnd').innerHTML=`<h3>${L.lostTitle}</h3><p>${L.lostText(T)}</p><div class="fbtns"><button data-f="retry">${L.retry}</button><button data-f="later">${L.later}</button></div>`;
  $('fEnd').querySelector('button').focus({preventScroll:true});
}
function closeFight(){F=null;$('fight').hidden=true;renderAll()}
function fightWon(){
  const reward=10+5*F.hits+(F.used===1?10:0);
  S.flowers+=reward; S.fightStats={hits:F.hits,used:F.used,reward};
  F=null; $('fight').hidden=true;
  winBattle();
}
$('fStrike').addEventListener('click',fightStrike);
$('fStage').addEventListener('pointerdown',e=>{if(e.target.closest('.token'))return;e.preventDefault();fightStrike()});
$('fQuit').addEventListener('click',closeFight);
$('fEnd').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;if(b.dataset.f==='retry')startFight();else closeFight()});
addEventListener('keydown',e=>{
  if($('fight').hidden||!F) return;
  if(e.key==='Escape'){closeFight();return}
  if((e.key===' '||e.code==='Space') && !(document.activeElement&&document.activeElement.tagName==='BUTTON')){e.preventDefault();fightStrike()}
});

/* ---------- Dawn ---------- */
function pendingFlowers(){return S.total<DAWN_AT?0:Math.floor(5*Math.cbrt(S.total/DAWN_AT))}
function renderDawn(){
  const show=S.flowers>0 || S.nights>1 || S.total>=DAWN_AT*0.1;
  $('dawnPanel').hidden=!show; if(!show) return;
  const p=pendingFlowers();
  $('nightNo').textContent=L.nightNo(S.nights);
  $('flowers').textContent=S.flowers;
  $('flowerBonus').textContent='+'+pct(S.flowers*FLOWER_PCT);
  $('pending').textContent='+'+p;
  if(!$('dawnBtn').classList.contains('armed')) $('dawnBtn').setAttribute('aria-disabled',p>0?'false':'true');
  $('dawnHint').textContent = p>0 ? L.dawnHintReady(fmt(DAWN_AT*((p+1)/5)**3),T) : L.dawnHintWait(fmt(DAWN_AT),T);
}
let dawnArmT;
$('dawnBtn').addEventListener('click',e=>{
  const b=e.currentTarget, p=pendingFlowers(); if(p<1) return;
  if(!b.classList.contains('armed')){
    b.classList.add('armed'); b.textContent=L.dawnArmed(p);
    dawnArmT=setTimeout(()=>{b.classList.remove('armed');b.textContent=L.dawnBtn},4500); return;
  }
  clearTimeout(dawnArmT); b.classList.remove('armed'); b.textContent=L.dawnBtn;
  greetDawn();
});
function greetDawn(){
  const p=pendingFlowers(), old=S, kept={};
  KEEP.forEach(k=>kept[k]=old[k]);
  S=Object.assign(fresh(),kept);
  S.flowers+=p; S.nights++;
  S.log=[{k:'night',n:S.nights}];
  if(fernEl){fernEl.remove();fernEl=null}
  upKey=''; renderLog(); renderAll(); save();
  showOverlay('sunrise',`
    <h2 class="line">${L.sunrise}</h2>
    <p class="line" style="animation-delay:.6s">${L.sunriseLine}</p>
    <p class="line" style="animation-delay:1.4s">${L.sunriseGain(T,p,S.flowers,pct(S.flowers*FLOWER_PCT))}</p>
    <button class="line" style="animation-delay:2.2s" data-close>${L.newFire}</button>`);
}

/* ---------- Overlay ---------- */
let overlayKind='';
function showOverlay(kind,html,focusDelay){
  const o=$('overlay'); overlayKind=kind; o.className='overlay '+kind; $('ov').innerHTML=html; o.hidden=false; o.scrollTop=0;
  const btn=o.querySelector('[data-close],[data-theme]');
  if(btn) setTimeout(()=>btn.focus({preventScroll:true}), reduce?0:(focusDelay??2400));
}
$('overlay').addEventListener('click',e=>{
  const pick=e.target.closest('[data-theme]');
  if(pick){ $('overlay').hidden=true; if(pick.dataset.theme!==themeId) switchTheme(pick.dataset.theme); return; }
  if(e.target.closest('[data-close]')) $('overlay').hidden=true;
});
addEventListener('keydown',e=>{ if(e.key==='Escape' && !$('overlay').hidden && $('overlay').querySelector('[data-close]')) $('overlay').hidden=true; });

function showEnding(animate){
  const lines=T.battle.lines;
  const step=animate?2.2:0, end=lines.length*step;
  showOverlay('storm',`
    ${lines.map((l,i)=>`<p class="line" style="animation-delay:${i*step}s">${l}</p>`).join('')}
    <div class="end line" style="animation-delay:${end}s">
      <h2>${L.victory}</h2>
      <p>${T.battle.victory}</p>
      <dl>
        <div><dt>${L.nights}</dt><dd>${S.wonAt||S.nights}</dd></div>
        <div><dt>${L.played}</dt><dd>${dur(Date.now()-S.started)}</dd></div>
        <div><dt>${L.total(T)}</dt><dd>${fmt(S.lifetime)}</dd></div>
        <div><dt>${L.clicks}</dt><dd>${S.clicks.toLocaleString(L.locale)}</dd></div>
        <div><dt>${L.drivenOff(T.raid.who)}</dt><dd>${L.times(S.repelled)}</dd></div>
        <div><dt>${L.gotAway(T.raid.who)}</dt><dd>${L.times(S.lost)}</dd></div>
        <div><dt>${T.bonus.name.toLowerCase()}</dt><dd>${S.ferns}</dd></div>
        <div><dt>${T.prestige.short}</dt><dd>${S.flowers}</dd></div>
        ${S.fightStats?`
        <div><dt>${L.endHide}</dt><dd>${S.fightStats.hits} / 3</dd></div>
        <div><dt>${L.endStrike}</dt><dd>${L.strikeTries(S.fightStats.used)}</dd></div>
        <div><dt>${L.reward}</dt><dd>+${S.fightStats.reward} ${T.prestige.short}</dd></div>
        <div><dt>${L.trophy}</dt><dd>${TROPHY[themeId][lang]}</dd></div>`:''}
      </dl>
      <button data-close>${L.keepPlaying}</button>
    </div>`, end*1000+800);
}

/* ---------- Myth picker ---------- */
function peekSave(id){
  if(id===themeId && S) return S;
  try{const raw=localStorage.getItem(saveKey(id)); return raw?JSON.parse(raw):null}catch(_){return null}
}
let pickerFirst=false;
function showPicker(first){
  pickerFirst=first;
  const cards=THEME_ORDER.map(id=>{
    const t=merged(id), s=peekSave(id);
    const prog=s ? `${L.night(s.nights||1)}${s.won?L.won:''}${s.flowers?` · ${t.prestige.short} ${s.flowers}`:''}` : L.newGame;
    return `<button class="myth" data-theme="${id}" aria-current="${id===themeId&&!first}" style="--c1:${t.c1};--c2:${t.c2}">
      <span class="mlabel">${t.label}</span>
      <span class="mtitle">${t.h1.join(' ')}</span>
      <span class="mblurb">${t.blurb}</span>
      <span class="mprog">${prog}</span>
    </button>`;
  }).join('');
  showOverlay('picker',`
    <h2>${L.pick}</h2>
    <p>${L.pickDesc}</p>
    <div class="lang" role="group" aria-label="${L.lang}">
      <button data-lang="hr" aria-pressed="${lang==='hr'}">HR</button>
      <button data-lang="en" aria-pressed="${lang==='en'}">EN</button>
    </div>
    <div class="myths">${cards}</div>
    ${first?'':`<button data-close>${L.close}</button>`}`, 0);
}
$('themeBtn').addEventListener('click',()=>showPicker(false));

/* ---------- Language ---------- */
function setLang(l){
  if(!STR[l]) return;
  lang=l; L=STR[l];
  try{localStorage.setItem(LANG_KEY,l)}catch(_){}
  if(!themeId) return;
  T=merged(themeId); buildData(); applyTexts();
  upKey=''; buildGens(); setQty(qty); renderLog(); renderAll();
  if(!$('overlay').hidden && overlayKind==='picker') showPicker(pickerFirst);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-lang]');
  if(b && b.dataset.lang!==lang) setLang(b.dataset.lang);
});

function loadTheme(id, snap){
  themeId=id; T=merged(id);
  try{localStorage.setItem(THEME_KEY,id)}catch(_){}
  buildData(); applyTexts();
  S = snap ? Object.assign(fresh(),snap) : (load()||fresh());
  if(S.v!==4){S.v=4;S.log=[]}  // chronicle is now stored as language-neutral events
  if(!snap){ S.raid=null; if(S.nextVeles) S.nextVeles=Math.max(S.nextVeles, Date.now()+30000); }
  const away=(Date.now()-S.last)/1000;
  if(!snap && away>60 && baseRate()>0){
    const x=baseRate()*Math.min(away,8*3600)*0.5; gain(x);
    toast(L.away(fmt(x),T));
  }
  S.last=Date.now(); lastTick=Date.now();
  if(fernEl){fernEl.remove();fernEl=null}
  parts=[];
  upKey=''; buildGens(); setQty(qty); renderLog(); renderAll();
}
function switchTheme(id){ save(); loadTheme(id,null); }

/* ---------- Fire scene (canvas) ----------
   Each myth paints its own sky and landscape (back), then the flames, then the vessel the fire burns in (front),
   so the vessel hides the base of the flames. All coordinates are fractions of the square canvas. */
const cv=$('cv'); let ctx=cv.getContext('2d');
let W=0,H=0,parts=[],heat=0,bolt=null,flash=0,stars=[];
function resize(){
  const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);
  stars=Array.from({length:70},()=>({x:Math.random(),y:Math.random()*.62,r:Math.random()*1.3+.4,p:Math.random()*6}));
}
new ResizeObserver(resize).observe(cv);

// drawing helpers
function path(pts){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x*W,y*H):ctx.moveTo(x*W,y*H));ctx.closePath()}
function poly(pts,fill){path(pts);ctx.fillStyle=fill;ctx.fill()}
function circ(x,y,r,fill){ctx.beginPath();ctx.arc(x*W,y*H,r*W,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
function ell(x,y,rx,ry,fill,a0=0,a1=Math.PI*2){ctx.beginPath();ctx.ellipse(x*W,y*H,rx*W,ry*H,0,a0,a1);ctx.fillStyle=fill;ctx.fill()}
function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x*W,y*H,w*W,h*H)}
function line(x0,y0,x1,y1,c,w){ctx.strokeStyle=c;ctx.lineWidth=w*W;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x0*W,y0*H);ctx.lineTo(x1*W,y1*H);ctx.stroke()}
function gradX(x0,x1,stops){const g=ctx.createLinearGradient(x0*W,0,x1*W,0);stops.forEach((c,i)=>g.addColorStop(i/(stops.length-1),c));return g}
// After the great battle is won, every scene shows the first light of morning.
function sky(top,bottom,t){
  const won=S&&S.won, g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,top); if(won){g.addColorStop(.55,bottom);g.addColorStop(1,'#d9826a')} else g.addColorStop(1,bottom);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(const s of stars){ctx.fillStyle=`rgba(255,250,235,${(.3+.3*Math.sin(t/800+s.p))*(won?.35:1)})`;ctx.fillRect(s.x*W,s.y*H,s.r,s.r)}
  if(won) halo(.5,1,.75,'255,190,120',.3);
}
// The defeated monster's horn or fang, kept by the fire
function drawTrophy(){
  halo(.86,.8,.13,'255,220,140',.2);
  ell(.86,.9,.065,.018,'#2a2630');
  const g=ctx.createLinearGradient(.82*W,.89*H,.92*W,.7*H); g.addColorStop(0,'#f2ead6'); g.addColorStop(1,THEMES[themeId].c2);
  ctx.strokeStyle=g; ctx.lineCap='round';
  ctx.lineWidth=W*.03; ctx.beginPath(); ctx.moveTo(.83*W,.885*H); ctx.quadraticCurveTo(.835*W,.76*H,.895*W,.725*H); ctx.stroke();
  ctx.lineWidth=W*.014; ctx.beginPath(); ctx.moveTo(.885*W,.73*H); ctx.lineTo(.925*W,.705*H); ctx.stroke();
}
function halo(x,y,r,rgb,a){const g=ctx.createRadialGradient(x*W,y*H,0,x*W,y*H,r*W);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function reflection(y){const a=.12+heat*.18;ell(.5,y,.16,.035,`rgba(255,150,70,${a})`);ell(.5,y+.03,.1,.015,`rgba(255,190,110,${a*.8})`)}
function palm(x,base,h){
  ctx.strokeStyle='#0d0912';ctx.lineWidth=W*.012;ctx.beginPath();ctx.moveTo(x*W,base*H);ctx.quadraticCurveTo((x+.035)*W,(base-h*.5)*H,(x+.015)*W,(base-h)*H);ctx.stroke();
  ctx.lineWidth=W*.007;for(let i=0;i<7;i++){const a=-Math.PI+i*Math.PI/6;ctx.beginPath();ctx.moveTo((x+.015)*W,(base-h)*H);
    ctx.quadraticCurveTo((x+.015+Math.cos(a)*.05)*W,(base-h-.04)*H,(x+.015+Math.cos(a)*.09)*W,(base-h+.02+Math.abs(Math.sin(a))*.0)*H);ctx.stroke()}
}

const SCENES={
  // Hrvatska: a tall krijes of branches under the moon, Zagorje hills and the sacred oak
  hr:{fire:{y:.8,w:.3,size:1.15,lift:1.35,h0:48,h1:6,l:55},
    back(t){
      sky('#0b1030','#2c2452',t);
      halo(.78,.17,.16,'244,234,208',.22); circ(.78,.17,.042,'#efe6cc');
      ctx.beginPath();ctx.moveTo(0,.7*H);ctx.quadraticCurveTo(.25*W,.57*H,.5*W,.67*H);ctx.quadraticCurveTo(.75*W,.59*H,W,.68*H);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fillStyle='#16153a';ctx.fill();
      rect(.105,.4,.03,.4,'#0a0b1c');
      [[.12,.34,.1],[.035,.41,.065],[.21,.4,.075],[.12,.25,.07],[.05,.3,.05]].forEach(([x,y,r])=>circ(x,y,r,'#0a0b1c'));
      rect(0,.84,1,.16,'#0a0b1c');
    },
    front(){
      for(let i=0;i<11;i++){const bx=.3+i*.04;line(bx,.88,.5+(bx-.5)*.14,.4,i%2?'#2b1a10':'#3d2516',.016)}
      line(.48,.42,.53,.33,'#3d2516',.012);
      for(let i=0;i<9;i++) ell(.29+i*.053,.89,.03,.022,i%2?'#3b3a4a':'#4c4a5c');
    }},
  // Slavenska: a crib-stacked Kupala fire by the river, birches and a floating wreath
  sl:{fire:{y:.6,w:.26,size:1.1,lift:1.25,h0:44,h1:0,l:54},
    back(t){
      sky('#08121f','#1b2b3a',t);
      ctx.beginPath();ctx.moveTo(0,.74*H);ctx.quadraticCurveTo(.5*W,.68*H,W,.75*H);ctx.lineTo(W,.8*H);ctx.lineTo(0,.8*H);ctx.fillStyle='#0c1918';ctx.fill();
      rect(0,.8,1,.2,'#0a1824'); reflection(.86);
      [[.06,.1],[.15,.2],[.86,.15],[.95,.08]].forEach(([x,top])=>{
        circ(x,top+.03,.065,'rgba(16,40,30,.9)'); circ(x+.03,top+.09,.05,'rgba(16,40,30,.85)');
        rect(x-.012,top,.024,.8-top,'#d2d5d0');
        for(let y=top+.05;y<.78;y+=.075) rect(x-.012+((y*100|0)%2)*.01,y,.014,.011,'#1b1d1f');
      });
    },
    front(){
      const cx=.5;
      for(let i=0;i<5;i++){const y=.79-i*.042;
        if(i%2===0){ctx.fillStyle='#4a2e1a';ctx.beginPath();ctx.roundRect((cx-.17)*W,(y-.019)*H,.34*W,.038*H,.019*H);ctx.fill();rect(cx-.16,y-.016,.32,.006,'#73492a')}
        else [-.14,0,.14].forEach(dx=>{circ(cx+dx,y,.021,'#5a3a22');circ(cx+dx,y,.012,'#8a6040');circ(cx+dx,y,.004,'#5a3a22')});
      }
      const cols=['#e94b5b','#f4d35e','#f2efe6','#7bc67b'];
      for(let i=0;i<14;i++){const a=i/14*Math.PI*2;circ(.77+Math.cos(a)*.05,.885+Math.sin(a)*.017,.011,cols[i%4])}
      circ(.77,.875,.006,'#ffcf6a');
    }},
  // Nordijska: aurora over the fjord, a stone hearth and an iron cauldron on a tripod
  no:{fire:{y:.84,w:.26,size:1,lift:1.15,h0:46,h1:8,l:55,alt:176,altRate:.18},
    back(t){
      sky('#050a17','#0f1f38',t);
      for(let k=0;k<3;k++){ctx.beginPath();for(let i=0;i<=20;i++){const x=i/20,y=.17+k*.075+Math.sin(x*5+t/1500+k*1.7)*.045;i?ctx.lineTo(x*W,y*H):ctx.moveTo(0,y*H)}
        ctx.lineWidth=H*(.055-k*.012);ctx.lineCap='round';ctx.strokeStyle=k===1?`rgba(90,200,230,${.16})`:`rgba(110,255,170,${.2-k*.05})`;ctx.stroke()}
      poly([[0,.66],[.12,.48],[.22,.6],[.34,.42],[.48,.62],[.6,.5],[.72,.6],[.86,.4],[1,.57],[1,1],[0,1]],'#0d1628');
      [[.12,.48],[.34,.42],[.86,.4]].forEach(([x,y])=>poly([[x-.035,y+.05],[x,y],[x+.035,y+.05],[x,y+.035]],'#30425f'));
      rect(0,.87,1,.13,'#080d18');
    },
    front(){
      line(.26,.92,.5,.33,'#2a2018',.013); line(.74,.92,.5,.33,'#2a2018',.013); line(.5,.33,.5,.43,'#6a6f7a',.004);
      ell(.5,.5,.125,.13,'#15171d',0,Math.PI); ell(.5,.5,.13,.02,'#3d424e');
      ctx.strokeStyle='#5b8ec9';ctx.lineWidth=W*.004;[[.44,.54],[.5,.57],[.56,.54]].forEach(([x,y])=>{ctx.beginPath();ctx.moveTo(x*W,(y-.025)*H);ctx.lineTo(x*W,(y+.025)*H);ctx.moveTo(x*W,(y-.01)*H);ctx.lineTo((x+.015)*W,(y-.025)*H);ctx.stroke()});
      for(let i=0;i<9;i++){const a=Math.PI*(i/8),x=.5+Math.cos(a)*.29,y=.89+Math.sin(a)*.045;ell(x,y,.036,.03,i%2?'#4a5060':'#5c6474')}
    }},
  // Grčka: a black-figure krater on the temple steps, Olympus behind
  gr:{fire:{y:.5,w:.34,size:1.25,lift:1.25,h0:52,h1:20,l:58},
    back(t){
      sky('#120d2e','#3c2858',t);
      poly([[.46,.72],[.66,.37],[.74,.46],[.84,.33],[1,.6],[1,.72]],'#1f1744');
      poly([[.62,.44],[.66,.37],[.7,.43],[.66,.415]],'#463d72'); poly([[.8,.39],[.84,.33],[.88,.4],[.84,.38]],'#463d72');
      const c='#140f30'; rect(.03,.66,.4,.03,c); rect(.05,.63,.36,.035,c);
      for(let i=0;i<6;i++) rect(.07+i*.058,.47,.026,.165,c);
      rect(.05,.44,.36,.032,c); poly([[.04,.445],[.23,.37],[.42,.445]],c);
      rect(0,.76,1,.24,'#0f0b24');
      ell(.5,.5,.2,.03,'#2a1206');
    },
    front(){
      const cx=.5, body=()=>{ctx.beginPath();ctx.moveTo((cx-.2)*W,.5*H);ctx.bezierCurveTo((cx-.2)*W,.62*H,(cx-.13)*W,.7*H,(cx-.05)*W,.71*H);ctx.lineTo((cx-.03)*W,.78*H);ctx.lineTo((cx-.12)*W,.84*H);ctx.lineTo((cx+.12)*W,.84*H);ctx.lineTo((cx+.03)*W,.78*H);ctx.lineTo((cx+.05)*W,.71*H);ctx.bezierCurveTo((cx+.13)*W,.7*H,(cx+.2)*W,.62*H,(cx+.2)*W,.5*H);ctx.closePath()};
      ctx.strokeStyle='#8a3a18';ctx.lineWidth=W*.014;
      ctx.beginPath();ctx.arc((cx-.205)*W,.565*H,.035*W,Math.PI*.5,Math.PI*1.5);ctx.stroke();
      ctx.beginPath();ctx.arc((cx+.205)*W,.565*H,.035*W,-Math.PI*.5,Math.PI*.5);ctx.stroke();
      body();ctx.fillStyle=gradX(cx-.2,cx+.2,['#6a2810','#d0703a','#e0884a','#6a2810']);ctx.fill();
      ctx.save();body();ctx.clip();
      rect(0,.55,1,.075,'#1a0c06');
      ctx.strokeStyle='#d8783f';ctx.lineWidth=W*.004;
      for(let x=cx-.2;x<cx+.2;x+=.032){ctx.beginPath();ctx.moveTo(x*W,.605*H);ctx.lineTo(x*W,.568*H);ctx.lineTo((x+.022)*W,.568*H);ctx.lineTo((x+.022)*W,.594*H);ctx.lineTo((x+.011)*W,.594*H);ctx.lineTo((x+.011)*W,.582*H);ctx.stroke()}
      rect(0,.675,1,.008,'#1a0c06');
      ctx.restore();
      ctx.beginPath();ctx.ellipse(cx*W,.5*H,.205*W,.03*H,0,0,Math.PI);ctx.lineWidth=W*.012;ctx.strokeStyle='#e8935a';ctx.stroke();
    }},
  // Rimska: Vesta's flame in a bronze bowl on a fluted marble altar with a laurel swag; the round temple behind
  ro:{fire:{y:.47,w:.26,size:1.2,lift:1.25,h0:50,h1:18,l:60},
    back(t){
      sky('#100d24','#35243f',t);
      const c='#1b1532'; rect(.55,.68,.42,.035,c);
      for(let i=0;i<7;i++) rect(.575+i*.054,.47,.022,.21,c);
      rect(.55,.44,.42,.035,c); ell(.76,.445,.19,.11,c,Math.PI,0); rect(.755,.32,.01,.03,c);
      [[.08,.28],[.18,.36],[.29,.46]].forEach(([x,top])=>ell(x,(top+.8)/2,.032,(.8-top)/2,'#0a0f12'));
      rect(0,.79,1,.21,'#0d0b1a');
      ell(.5,.47,.14,.022,'#3a2408');
    },
    front(){
      const cx=.5, marble=gradX(cx-.13,cx+.13,['#8f8676','#efe9dc','#d9d1c2','#8a8171']);
      rect(cx-.09,.56,.18,.27,marble);
      for(let i=1;i<7;i++) rect(cx-.09+i*.0257,.575,.004,.24,'rgba(90,80,64,.4)');
      rect(cx-.12,.535,.24,.03,marble); rect(cx-.11,.815,.22,.025,marble); rect(cx-.135,.84,.27,.04,marble);
      ctx.strokeStyle='#3e6b2c';ctx.lineWidth=W*.005;ctx.beginPath();ctx.moveTo((cx-.09)*W,.6*H);ctx.quadraticCurveTo(cx*W,.7*H,(cx+.09)*W,.6*H);ctx.stroke();
      for(let i=0;i<=10;i++){const u=i/10,x=(1-u)*(1-u)*(cx-.09)+2*(1-u)*u*cx+u*u*(cx+.09),y=(1-u)*(1-u)*.6+2*(1-u)*u*.7+u*u*.6;ell(x,y-.008,.011,.008,'#5b8a3c');ell(x+.006,y+.006,.011,.008,'#4c7a32')}
      circ(cx-.09,.6,.008,'#c9a24a'); circ(cx+.09,.6,.008,'#c9a24a');
      const bronze=gradX(cx-.14,cx+.14,['#6a4a14','#e9c06a','#b8862c','#5a3e10']);
      rect(cx-.03,.515,.06,.022,bronze);
      ell(cx,.47,.14,.06,bronze,0,Math.PI);
      ctx.beginPath();ctx.ellipse(cx*W,.47*H,.14*W,.022*H,0,0,Math.PI);ctx.lineWidth=W*.008;ctx.strokeStyle='#f3d88a';ctx.stroke();
    }},
  // Egipatska: a golden lotus brazier by the Nile, pyramids and palms under a crescent moon
  eg:{fire:{y:.5,w:.26,size:1.2,lift:1.3,h0:50,h1:26,l:58,alt:208,altRate:.12},
    back(t){
      sky('#060919','#1d1838',t);
      circ(.2,.16,.042,'#f1e6c0'); circ(.218,.148,.04,'#0a0d22');
      poly([[.55,.72],[.79,.35],[1.03,.72]],'#2b2138'); poly([[.79,.35],[1.03,.72],[.86,.72]],'#3d2f4a');
      poly([[.28,.72],[.43,.5],[.58,.72]],'#251c32'); poly([[.43,.5],[.58,.72],[.49,.72]],'#33263f');
      rect(0,.72,1,.1,'#1a1322');
      palm(.1,.8,.3); palm(.2,.8,.22);
      rect(0,.82,1,.18,'#0b1430'); reflection(.88);
    },
    front(){
      const cx=.5, gold=gradX(cx-.18,cx+.18,['#7a5414','#f1c75a','#c9962a','#6a4a10']);
      line(cx,.84,cx-.085,.9,'#b8862c',.01); line(cx,.84,cx+.085,.9,'#b8862c',.01);
      rect(cx-.013,.6,.026,.25,gold);
      [.66,.72,.78].forEach(y=>rect(cx-.018,y,.036,.012,'#2a9d8f'));
      for(let i=-3;i<=3;i++){
        const a=i*.33, len=i===0?.085:.13, tx=cx+Math.sin(a)*len*1.25, ty=.615-Math.cos(a)*len, nx=Math.cos(a)*.035, ny=Math.sin(a)*.035;
        ctx.beginPath();ctx.moveTo(cx*W,.615*H);
        ctx.quadraticCurveTo(((cx+tx)/2-nx)*W,((.615+ty)/2-ny)*H,tx*W,ty*H);
        ctx.quadraticCurveTo(((cx+tx)/2+nx)*W,((.615+ty)/2+ny)*H,cx*W,.615*H);
        ctx.fillStyle=Math.abs(i)%2?'#c9962a':gold;ctx.fill();ctx.lineWidth=W*.004;ctx.strokeStyle='#2a9d8f';ctx.stroke();
      }
    }},
};
const SC=()=>SCENES[themeId]||SCENES.hr;

function boltFx(big){
  flash=big?1:.5;
  if(reduce||!W) return;
  const end=H*(SC().fire.y-.06);
  const pts=[]; let x=W*(.3+Math.random()*.4), y=0; pts.push([x,y]);
  while(y<end){y+=H*(.05+Math.random()*.06); x+=(Math.random()-.5)*W*.12; pts.push([x,Math.min(y,end)])}
  bolt={pts,life:big?16:9}; heat=Math.min(1,heat+.3); emit(big?24:10,true);
}
function emit(n,burst){
  const f=SC().fire, x0=W/2, y0=H*f.y, w=W*f.w;
  for(let i=0;i<n;i++){
    const spark=burst&&Math.random()<.5, alt=f.alt!=null&&Math.random()<f.altRate;
    parts.push({x:x0+(Math.random()-.5)*w*(burst?.6:1), y:y0,
      vx:(Math.random()-.5)*(spark?3:.6), vy:-(spark?2+Math.random()*3:(0.8+Math.random()*1.4)*f.lift),
      life:0, max:spark?50+Math.random()*30:30+Math.random()*30, r:spark?1.2+Math.random()*1.6:W*(.012+Math.random()*.018)*f.size, spark, alt});
  }
}
// Flame tongues: three layers (outer red, orange, yellow core) of teardrop shapes that flicker and sway.
// Clicking raises the heat, which makes the whole fire taller for a moment.
function flames(t){
  const f=SC().fire, x0=W/2, y0=H*f.y, w=W*f.w, n=7, tt=(reduce?t*.35:t)/1000;
  const hgt=H*.27*f.lift*f.size*(1+heat*.45);
  ctx.globalCompositeOperation='lighter';
  for(let layer=0;layer<3;layer++){
    const sc=[1,.74,.46][layer], hue=[f.h1+6,(f.h0+f.h1)/2,f.h0][layer], light=[48,55,70][layer], a=[.55,.6,.8][layer];
    for(let i=0;i<n;i++){
      const u=(i+.5)/n-.5, ph=tt*(2.4+i*.41+layer*.3)+i*1.7+layer;
      const fl=Math.sin(ph)*.5+Math.sin(ph*2.3+i)*.3+Math.sin(ph*5.1)*.12;
      const bx=x0+u*w*sc*.9, bw=w/n*1.9*sc;
      const h=hgt*sc*(1-Math.abs(u)*1.15)*(.82+fl*.28);
      if(h<=4) continue;
      const tipx=bx+Math.sin(ph*1.3)*bw*.7, tipy=y0-h;
      const g=ctx.createLinearGradient(0,y0,0,tipy);
      g.addColorStop(0,`hsla(${hue},100%,${light}%,${a})`);
      g.addColorStop(.6,`hsla(${hue-6},100%,${light-6}%,${a*.6})`);
      g.addColorStop(1,`hsla(${hue-12},100%,${light-12}%,0)`);
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(bx-bw/2,y0);
      ctx.bezierCurveTo(bx-bw/2,y0-h*.45,tipx-bw*.18,tipy+h*.28,tipx,tipy);
      ctx.bezierCurveTo(tipx+bw*.18,tipy+h*.28,bx+bw/2,y0-h*.45,bx+bw/2,y0);
      ctx.quadraticCurveTo(bx,y0+bw*.25,bx-bw/2,y0); ctx.fill();
    }
  }
  ctx.globalCompositeOperation='source-over';
}
function draw(t){
  const sc=SC(), f=sc.fire, x0=W/2, y0=H*f.y;
  ctx.clearRect(0,0,W,H);
  sc.back(t);
  const flick=.04*Math.sin(t/90)+.03*Math.sin(t/37);
  const glow=ctx.createRadialGradient(x0,y0-H*.1,0,x0,y0-H*.1,W*.5);
  glow.addColorStop(0,`rgba(255,150,60,${.22+heat*.25+flick})`); glow.addColorStop(1,'rgba(255,150,60,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  flames(t);
  ctx.globalCompositeOperation='lighter';
  for(const p of parts){
    const u=p.life/p.max, a=(1-u)*(p.spark?1:.5);
    const hue=p.alt?f.alt:f.h0-(f.h0-f.h1)*u;
    ctx.fillStyle=`hsla(${hue},${p.alt?85:100}%,${p.spark?70:f.l}%,${a})`;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.spark?p.r:p.r*(1-u*.7),0,Math.PI*2); ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';
  sc.front(t);
  if(S&&S.won) drawTrophy();
  if(flash>0){ctx.fillStyle=`rgba(211,226,255,${flash*.22})`;ctx.fillRect(0,0,W,H);flash*=.86;if(flash<.02)flash=0}
  if(bolt){
    ctx.save(); ctx.strokeStyle=`rgba(240,245,255,${Math.min(1,bolt.life/8)})`; ctx.lineWidth=3; ctx.lineJoin='round';
    ctx.shadowColor='#d3e2ff'; ctx.shadowBlur=16; ctx.beginPath();
    bolt.pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke(); ctx.restore();
    if(--bolt.life<=0) bolt=null;
  }
}
function loop(t){
  if(W){
    if(Math.random()<.6) emit(reduce?1:Math.round(1+heat*4+Math.min(2,Math.log10(1+perSec())/2)),false);
    if(!reduce && Math.random()<.08) emit(1,true);
    for(const p of parts){p.life++;p.x+=p.vx+(Math.random()-.5)*.6;p.y+=p.vy;if(!p.spark)p.vx*=.96}
    parts=parts.filter(p=>p.life<p.max);
    heat*=.96; draw(t);
  }
  requestAnimationFrame(loop);
}

$('fire').addEventListener('click',e=>{
  const v=perClick(); gain(v); S.clicks++; heat=Math.min(1,heat+.15);
  if(!reduce) emit(10,true);
  const wr=$('fireWrap').getBoundingClientRect();
  const x=e.clientX? e.clientX-wr.left : wr.width/2, y=e.clientY? e.clientY-wr.top : wr.height/2;
  const f=document.createElement('div'); f.className='float'; f.textContent='+'+fmt(v);
  f.style.left=x+'px'; f.style.top=y+'px';
  f.addEventListener('animationend',()=>f.remove()); if(reduce) setTimeout(()=>f.remove(),600);
  $('fireWrap').appendChild(f);
  renderTop();
});

/* ---------- Controls ---------- */
function setQty(n){qty=n;$('q1').setAttribute('aria-pressed',n===1);$('q10').setAttribute('aria-pressed',n===10);renderGens()}
$('q1').onclick=()=>setQty(1); $('q10').onclick=()=>setQty(10);
let armT;
$('reset').addEventListener('click',e=>{
  const b=e.currentTarget;
  if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent=L.resetArmed(T);armT=setTimeout(()=>{b.classList.remove('armed');b.textContent=L.reset},4000);return}
  clearTimeout(armT); b.classList.remove('armed'); b.textContent=L.reset;
  S=fresh(); try{localStorage.removeItem(saveKey(themeId))}catch(_){}
  if(fernEl){fernEl.remove();fernEl=null}
  upKey=''; renderLog(); renderAll(); toast(L.resetDone);
});

/* ---------- Test buttons: shown only when running the dev server (npm run dev) ---------- */
document.querySelector('.foot.test').hidden=!import.meta.env.DEV;
document.querySelectorAll('[data-cheat]').forEach(b=>b.addEventListener('click',()=>{
  const x=+b.dataset.cheat; gain(x); toast(L.cheat(fmt(x),T)); renderAll();
}));
$('cheatVeles').addEventListener('click',()=>{
  if(S.won){ toast(L.alreadyBeaten(T.raid.who)); return; }
  if(!S.raid) startRaid();
});

/* ---------- Save / tick ---------- */
function save(){if(!S)return;S.last=Date.now();try{localStorage.setItem(saveKey(themeId),JSON.stringify(S))}catch(_){}}
function load(){
  try{const raw=localStorage.getItem(saveKey(themeId)); if(raw){const s=JSON.parse(raw); if(s.lifetime==null) s.lifetime=s.total||0; return Object.assign(fresh(),s)}}catch(_){}
  return null;
}
let lastTick=Date.now(), saveAcc=0;
function tick(){
  const now=Date.now(), dt=Math.min((now-lastTick)/1000, 3600); lastTick=now;
  gain(perSec()*dt);
  if(!fernEl && now>=S.nextFern && S.total>=50) spawnFern();
  if(fernEl && now>=fernGone){fernEl.remove();fernEl=null;S.nextFern=now+60000+Math.random()*90000}
  // The raider only moves while the page is visible, so he never wins while you're in another tab. After the great battle he stays away.
  if(!S.won && !F){
    if(!S.nextVeles && S.total>=VELES_AT) scheduleVeles(60000,60000);
    if(S.raid && !document.hidden){ S.raid.p+=climbRate()*dt; if(S.raid.p>=1) velesWins(); }
    else if(!S.raid && S.nextVeles && now>=S.nextVeles && !document.hidden) startRaid();
  }
  saveAcc+=dt; if(saveAcc>=10){saveAcc=0;save()}
  renderAll();
}
addEventListener('visibilitychange',()=>{if(document.hidden)save()});
addEventListener('pagehide',save);

function start(data){
  let id=data&&data.themeId, stored=null, legacy=false, storedLang=null;
  try{stored=localStorage.getItem(THEME_KEY); legacy=!!localStorage.getItem(saveKey('hr')); storedLang=localStorage.getItem(LANG_KEY)}catch(_){}
  lang = STR[data&&data.lang] ? data.lang : STR[storedLang] ? storedLang : 'hr';
  L=STR[lang];
  if(!THEMES[id]) id=THEMES[stored]?stored:'hr';
  if(data && data.qty) qty=data.qty;
  loadTheme(id, data&&data.S);
  setInterval(tick,100); requestAnimationFrame(loop);
  // First visit with no earlier progress: let the player choose a myth (and language).
  if(!(data&&data.S) && !stored && !legacy) showPicker(true);
}
start({});
