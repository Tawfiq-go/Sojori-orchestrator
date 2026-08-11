/* ── Sojori Ops Board · Nommos Beach Resort — maquette navigable, données mockées ── */
const $=s=>document.querySelector(s);
const now=()=>new Date();
const pad=n=>String(n).padStart(2,'0');

/* États du cycle : occ · dep(dirty) · doing · cleaned · insp · ready */
const CAT={s:'Suite signature',vs:'Villa signature',vc:'Villa confort'};
const U=[
  {id:'v01',n:'Villa 01',cat:'vs',st:'dirty',dep:'11h05',assign:null},
  {id:'v02',n:'Villa 02',cat:'vs',st:'doing',who:'Samira',since:Date.now()-12*60000},
  {id:'v03',n:'Villa 03',cat:'vs',hs:'OutOfOrder',why:'Plomberie SdB'},
  {id:'v04',n:'Villa 04',cat:'vs',st:'occ',guest:'Fam. Berrada',rec:'Recouche 14h · Khadija'},
  {id:'v05',n:'Villa 05',cat:'vs',st:'insp',who:'Naïma',since:Date.now()-6*60000},
  {id:'v06',n:'Villa 06',cat:'vc',hs:'OutOfService',why:'Peinture terrasse'},
  {id:'v07',n:'Villa 07',cat:'vc',hs:'OutOfOrder',why:'Climatisation'},
  {id:'v08',n:'Villa 08',cat:'vc',st:'ready',arr:'M. Benkirane · 15h00',pack:'pack en préparation · Yassine'},
  {id:'v09',n:'Villa 09',cat:'vc',hs:'OutOfService',why:'Moustiquaires'},
  {id:'s10',n:'Suite signature 10',cat:'s',st:'occ',guest:'Mme Laurent',dep2:'Départ prévu 12h00'},
  {id:'s11',n:'Suite signature 11',cat:'s',hs:'OutOfOrder',why:'Dégât des eaux'},
  {id:'s12',n:'Suite signature 12',cat:'s',st:'ready',arr:'Mme Laurent · 16h00',pack:'pack livré ✓',packdone:true},
  {id:'v13',n:'Villa 13',cat:'vc',hs:'OutOfService',why:'Rénovation légère'},
  {id:'v14',n:'Villa 14',cat:'vc',hs:'OutOfOrder',why:'Mobilier en attente'},
];
const ARR=[
  {id:'a1',h:'15h00',g:'M. Benkirane',room:'Villa 08',pack:'prep',here:false},
  {id:'a2',h:'16h00',g:'Mme Laurent',room:'Suite signature 12',pack:'done',here:false,note:'room move depuis Suite 10'},
  {id:'a3',h:'17h30',g:'Fam. Okada',room:'Villa 02',pack:'todo',here:false},
];
let ALERTS=[
  {k:'crit',t:'Villa 01 — ménage non assigné',s:'Départ déclaré à 11h05 · aucun staff sur la tâche'},
  {k:'warn',t:'Villa 08 — arrivée à 15h00',s:'Pack bienvenue en préparation — à livrer avant l\u2019arrivée'},
  {k:'photo',t:'Villa 02 — problème signalé par Samira',s:'« Tache moquette chambre » · photo jointe · 11h48'},
];
const TOMORROW=[['Départs','3'],['Arrivées','5 · dont 2 suites'],['Recouches prévues','4'],['Ménages à planifier','8'],['Retour service Villa 06','peinture finie 10h']];

const COLS=[
  ['occ','Occupées',u=>u.st==='occ'],
  ['dirty','À nettoyer',u=>u.st==='dirty'],
  ['doing','Ménage en cours',u=>u.st==='doing'],
  ['insp','Nettoyée · inspection',u=>u.st==='cleaned'||u.st==='insp'],
  ['ready','Prêtes ✓',u=>u.st==='ready'],
];
const STL={occ:'Occupée',dirty:'À nettoyer',doing:'Ménage en cours',cleaned:'Nettoyée — attente inspection',insp:'Inspection en cours',ready:'Inspectée · prête'};
const CLS={occ:'occ',dirty:'dirty',doing:'doing',cleaned:'cleaned',insp:'insp',ready:'ready'};

let showTomorrow=false, flashIds=new Set(), movedArr=null;

function mins(t){return Math.max(0,Math.floor((Date.now()-t)/60000));}
function card(u){
  const who=u.who?`<span class="who"><span class="av">${u.who[0]}</span>${u.who}${u.since?`<span class="tm">${pad(Math.floor(mins(u.since)/60))}:${pad(mins(u.since)%60)}</span>`:''}</span>`:'';
  let meta='';
  if(u.st==='occ')meta=`<span class="meta"><b>${u.guest}</b>${u.dep2?` · ${u.dep2}`:''}</span>${u.rec?`<span class="flag ${/faite/.test(u.rec)?'ok':'busy'}">${u.rec}</span>`:''}`;
  if(u.st==='dirty')meta=`<span class="meta">Départ déclaré <b>${u.dep}</b></span>${u.assign?'':'<span class="flag crit">Non assigné</span>'}`;
  if(u.st==='ready')meta=`<span class="meta">Arrivée <b>${u.arr}</b></span><span class="flag ${u.packdone?'ok':'warn'}">${u.pack}</span>`;
  if(u.st==='cleaned')meta='<span class="meta">En attente de la gouvernante</span>';
  return `<div class="rc ${CLS[u.st]} ${flashIds.has(u.id)?'flash':''}" data-fid="${u.id}">
    <span class="top"><span class="num">${u.n}</span><span class="cat ${u.cat}">${CAT[u.cat]}</span></span>
    <span class="st"><span class="dot"></span>${STL[u.st]}</span>${who}${meta}</div>`;
}
function render(){
  const act=U.filter(u=>!u.hs), hs=U.filter(u=>u.hs);
  const deps=4, recs=act.filter(u=>u.rec).length, arrs=ARR.length;
  const menDone=1+(U.find(u=>u.id==='v02').st!=='doing'?1:0), menTot=4;
  const inspDone=U.filter(u=>u.st==='ready').length, inspTot=4;
  const packDone=ARR.filter(a=>a.pack==='done').length;
  const d=now();
  const days=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const months=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

  $('#root').innerHTML=`
  <header class="hd">
    <span class="brand">
      <svg width="26" height="26" viewBox="0 0 40 40" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F4CF5E"/><stop offset="52%" stop-color="#E6B022"/><stop offset="100%" stop-color="#B8881A"/></linearGradient></defs><circle cx="20" cy="20" r="17" stroke="url(#g)" stroke-width="2" fill="none" stroke-dasharray="3 4" opacity=".5"/><path d="M 12 26 Q 20 26 20 20 Q 20 14 28 14" stroke="url(#g)" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="20" cy="20" r="2.5" fill="#E6B022"/></svg>
      <span class="wm">sojori</span></span>
    <span class="hotel">Nommos Beach Resort</span>
    <span class="sep"></span>
    <span class="clock"><b id="clk">${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}</b><span>${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}</span></span>
    <span class="meteo">
      <span class="m"><b>${deps}</b> départs</span><span class="m"><b>${recs}</b> recouches</span>
      <span class="m"><b>${arrs}</b> arrivées</span><span class="m hs"><b>${hs.length}</b> unités HS</span></span>
    <span class="gauges">
      <span class="gauge ${menDone>=menTot?'done':''}"><span class="t">Ménages</span><span class="bar"><i style="width:${menDone/menTot*100}%"></i></span><span class="n">${menDone} / ${menTot}</span></span>
      <span class="gauge ${inspDone>=inspTot?'done':''}"><span class="t">Inspectées</span><span class="bar"><i style="width:${inspDone/inspTot*100}%"></i></span><span class="n">${inspDone} / ${inspTot}</span></span>
      <span class="gauge"><span class="t">Packs</span><span class="bar"><i style="width:${packDone/arrs*100}%"></i></span><span class="n">${packDone} / ${arrs}</span></span></span>
    <button class="btn" id="tmr" aria-pressed="${showTomorrow}">Demain</button>
  </header>
  <div class="body">
    <div class="main">
      <div class="kan">${COLS.map(([k,t,f])=>{
        const list=act.filter(f);
        return `<div class="col c-${k}"><span class="ch"><b>${t}</b><span class="n">${list.length}</span></span>
          <div class="drop">${list.map(card).join('')||''}</div></div>`;}).join('')}
      </div>
      <div class="hsrow"><span class="t">Hors service · ${hs.length}</span>
        ${hs.map(u=>`<span class="hsu"><i>${u.hs==='OutOfOrder'?'OOO':'OOS'}</i>${u.n}<span>· ${u.why}</span></span>`).join('')}
      </div>
    </div>
    <aside class="rail">
      <section class="pan"><span class="ph"><b>Arrivées du jour</b><span class="n">${ARR.filter(a=>a.here).length} / ${arrs}</span></span>
        ${ARR.map(a=>`<div class="arr ${a.here?'here':''} ${movedArr===a.id?'moved':''}">
          <span class="h">${a.h}</span><span class="g">${a.g}${a.here?' ✓':''}</span>
          <span class="pk"><span class="flag ${a.pack==='done'?'ok':a.pack==='prep'?'warn':'crit'}">${a.pack==='done'?'Pack livré ✓':a.pack==='prep'?'Pack en cours':'Pack à préparer'}</span></span>
          <span class="r">→ <b>${a.room}</b>${a.note?` · ${a.note}`:''}</span></div>`).join('')}
      </section>
      <section class="pan"><span class="ph"><b>Alertes</b><span class="n">${ALERTS.length}</span></span>
        ${ALERTS.map(a=>`<div class="al"><span class="ic ${a.k==='photo'?'ph':a.k}">${a.k==='photo'?'':a.k==='crit'?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C4483A" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v9m0 4v.1"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B8881A" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="13" r="7"/><path d="M12 10v4M9 3h6"/></svg>'}</span>
          <span><b>${a.t}</b><span>${a.s}</span></span></div>`).join('')}
      </section>
      ${showTomorrow?`<section class="pan tm-pan"><span class="ph"><b>Demain — aperçu</b></span>
        ${TOMORROW.map(([k,v])=>`<span class="row">${k}<b>${v}</b></span>`).join('')}
      </section>`:`<p class="legend">Cycle d'une unité : départ → à nettoyer → ménage (nom de la FdM + chrono) → nettoyée → inspection gouvernante → prête ✓ → pack bienvenue → arrivée. Transitions en direct (webhooks Mews + déclarations WhatsApp du staff).</p>`}
    </aside>
  </div>`;
  $('#tmr').addEventListener('click',()=>{showTomorrow=!showTomorrow;render();});
}

/* ── FLIP : anime les cartes qui changent de colonne ── */
function snap(){const m={};document.querySelectorAll('[data-fid]').forEach(el=>m[el.dataset.fid]=el.getBoundingClientRect());return m;}
function flip(before){
  document.querySelectorAll('[data-fid]').forEach(el=>{
    const b=before[el.dataset.fid];if(!b)return;
    const a=el.getBoundingClientRect(),dx=b.left-a.left,dy=b.top-a.top;
    if(!dx&&!dy)return;
    el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:620,easing:'cubic-bezier(.22,1,.36,1)'});
  });
}
function transition(fn,ids){
  const before=snap();
  fn(); flashIds=new Set(ids||[]);
  render(); flip(before);
  setTimeout(()=>{flashIds.clear();movedArr=null;},1500);
}

/* ── Scénario temps réel (démo) ── */
const SCRIPT=[
  ()=>transition(()=>{const u=U.find(x=>x.id==='v02');u.st='cleaned';delete u.since;
    ALERTS=ALERTS.filter(a=>!/Villa 01/.test(a.t));
    const v1=U.find(x=>x.id==='v01');v1.assign='Samira';},['v02','v01']),
  ()=>transition(()=>{const u=U.find(x=>x.id==='v05');u.st='ready';u.arr='—';u.pack='aucune arrivée aujourd\u2019hui';u.packdone=true;delete u.who;delete u.since;},['v05']),
  ()=>transition(()=>{const u=U.find(x=>x.id==='s10');u.st='dirty';u.dep='12h02';delete u.guest;delete u.dep2;
    const a=ARR.find(x=>x.id==='a2');a.note='room move Suite 10 → Suite 12 ✓';},['s10']),
  ()=>transition(()=>{const u=U.find(x=>x.id==='v01');u.st='doing';u.who='Samira';u.since=Date.now();},['v01']),
  ()=>transition(()=>{const a=ARR.find(x=>x.id==='a1');a.here=true;
    const u=U.find(x=>x.id==='v08');u.st='occ';u.guest='M. Benkirane';delete u.arr;delete u.pack;
    ALERTS=ALERTS.filter(x=>!/Villa 08/.test(x.t));movedArr='a1';},['v08']),
  ()=>transition(()=>{const u=U.find(x=>x.id==='v02');u.st='insp';u.who='Naïma';u.since=Date.now();},['v02']),
];
let step=0;
setInterval(()=>{if(step<SCRIPT.length)SCRIPT[step++]();},8000);

/* horloge + chronos vivants */
setInterval(()=>{
  const c=$('#clk');if(c){const d=now();c.textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;}
  document.querySelectorAll('.rc .tm').forEach(el=>{
    const u=U.find(x=>x.id===el.closest('[data-fid]').dataset.fid);
    if(u&&u.since){const m=mins(u.since);el.textContent=`${pad(Math.floor(m/60))}:${pad(m%60)}`;}
  });
},1000);

render();
