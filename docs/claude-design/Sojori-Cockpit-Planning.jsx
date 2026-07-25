/* ===== Sojori — Cockpit Planning : grille Gantt + couche messages ===== */
const { useState, useMemo, useRef } = React;

/* ---------- données démo ---------- */
const DAYS = ['ven 24','sam 25','dim 26','lun 27','mar 28','mer 29','jeu 30','ven 31','sam 1','dim 2','lun 3','mar 4','mer 5','jeu 6'];
const WEEKEND = [1,2,8,9];
const TODAY = 2; // index colonne

const CH = {
  airbnb:{label:'Airbnb', color:'var(--abnb)', wash:'var(--abnbWash)'},
  booking:{label:'Booking', color:'var(--bkg)', wash:'var(--bkgWash)'},
  direct:{label:'Direct', color:'var(--direct)', wash:'var(--directWash)'},
};

const LISTINGS = [
  {id:'saphir', name:'Prestigia Saphir', meta:'Marrakech · 2 ch · 4 pers.', res:[
    {id:'r1', d:0, len:4, guest:'Léa Fournier', ch:'airbnb', pax:4,
     msg:{via:'wa', from:'guest', txt:"Bonjour, on arrive vers 22h30, est-ce que le check-in est possible si tard ?", unread:true, at:'il y a 12 min'},
     tasks:[{t:'Ménage', st:'open', who:'Fatima'},{t:'Linge', st:'done', who:'Fatima'}]},
    {id:'r2', d:5, len:3, guest:'Marc Ottavi', ch:'booking', pax:2,
     msg:{via:'ota', from:'guest', txt:"Is early check-in available on Wednesday?", unread:false, at:'hier'},
     tasks:[{t:'Ménage', st:'unassigned'}]},
    {id:'r3', d:10, len:4, guest:'Sofia Neri', ch:'direct', pax:3, msg:null,
     tasks:[{t:'Ménage', st:'open', who:'Rachid'}]},
  ]},
  {id:'atlas', name:'Nakhil Atlas', meta:'Route de Fès · 4 ch · 8 pers.', res:[
    {id:'r4', d:1, len:6, guest:'Famille Berrada', ch:'direct', pax:8,
     msg:{via:'wa', from:'staff', txt:"Code boîte à clés envoyé, piscine chauffée depuis ce matin.", unread:false, at:'il y a 2 h'},
     tasks:[{t:'Ménage', st:'done', who:'Nadia'},{t:'Piscine', st:'open', who:'Youssef'},{t:'Courses', st:'unassigned'}]},
    {id:'r5', d:9, len:5, guest:'Chen Wei', ch:'airbnb', pax:6, msg:null, tasks:[]},
  ]},
  {id:'orchidee', name:'Orchidée 14', meta:'Palmeraie · 2 ch · 4 pers.', res:[
    {id:'r6', d:0, len:2, guest:'Julie Damiens', ch:'booking', pax:2, msg:null,
     tasks:[{t:'Ménage', st:'open', who:'Fatima'}]},
    {id:'r7', d:3, len:4, guest:'Omar Tazi', ch:'airbnb', pax:4,
     msg:{via:'wa', from:'guest', txt:"La clim de la chambre du fond ne démarre plus, on peut avoir quelqu'un ?", unread:true, at:'il y a 40 min'},
     tasks:[{t:'Maintenance', st:'unassigned'},{t:'Ménage', st:'open', who:'Rachid'}]},
    {id:'r8', d:11, len:3, guest:'Anna Kowalski', ch:'booking', pax:3,
     msg:{via:'ota', from:'guest', txt:"Merci pour la confirmation, à très vite !", unread:false, at:'2 j'}, tasks:[]},
  ]},
  {id:'lila', name:'Lila 04', meta:'Hivernage · 3 ch · 5 pers.', res:[
    {id:'r9', d:2, len:5, guest:'Peter Haas', ch:'airbnb', pax:5,
     msg:{via:'wa', from:'guest', txt:"On a laissé les serviettes de piscine sur la terrasse, désolé !", unread:false, at:'il y a 5 h'},
     tasks:[{t:'Ménage', st:'open', who:'Nadia'},{t:'Linge', st:'open', who:'Nadia'}]},
    {id:'r10', d:8, len:2, guest:'Rita Salgado', ch:'direct', pax:2, msg:null, tasks:[{t:'Ménage', st:'done', who:'Fatima'}]},
  ]},
  {id:'ivoire', name:'Ivoire Penthouse', meta:'Agdal · 2 ch · 4 pers.', res:[
    {id:'r11', d:4, len:7, guest:'Hugo Lambert', ch:'direct', pax:4,
     msg:{via:'ota', from:'guest', txt:"Pouvons-nous ajouter un lit bébé pour la deuxième nuit ?", unread:true, at:'il y a 3 h'},
     tasks:[{t:'Ménage', st:'open', who:'Rachid'},{t:'Lit bébé', st:'unassigned'}]},
  ]},
];

/* ---------- helpers ---------- */
const hasOpen = r => r.tasks.some(t=>t.st!=='done');
const keep = (r, f) => f==='all' ? true : f==='res' ? true : f==='tasks' ? hasOpen(r) : !!r.msg;

/* ---------- icônes ---------- */
const IP={
  wa:'M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3Zm4.2 12.3c-.2.5-1 .9-1.5 1-.4.1-.9.1-1.4-.1a10 10 0 01-5.6-5.6c-.3-.6-.1-1.2.2-1.6.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.5l-.4.5c-.1.1-.2.3-.1.5a7 7 0 002.6 2.6c.2.1.4 0 .5-.1l.5-.6c.1-.2.3-.2.5-.1l1.5.7c.2.1.3.2.3.4 0 .1 0 .5-.2.9Z',
  ota:'M4 20V9l8-5 8 5v11M4 20h16M9 20v-6h6v6M8 11h.01M16 11h.01',
  users:'M9 11a3 3 0 100-6 3 3 0 000 6Zm-6 8a6 6 0 0112 0M17 11a3 3 0 100-6M20 19a6 6 0 00-4.5-5.8',
  broom:'M14 3l7 7-3 3-7-7 3-3ZM11 6l-7 7v5a1 1 0 001 1h5l6-6M4 18l3-3',
  check:'M4 12.5l5 5L20 6',
  alert:'M12 9v4m0 4h.01M10.3 4.3L2.6 18a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0Z',
  arrowIn:'M4 12h11m-4-5l5 5-5 5M20 4v16',
  arrowOut:'M20 12H9m4-5l-5 5 5 5M4 4v16',
  clock:'M12 21a9 9 0 100-18 9 9 0 000 18Zm0-13v5l3 2',
  search:'M11 4a7 7 0 105 12l4 4M11 4a7 7 0 010 14',
  chevD:'M6 9l6 6 6-6', chevL:'M15 6l-6 6 6 6', chevR:'M9 6l6 6-6 6',
  plus:'M12 5v14M5 12h14', cal:'M4 8h16M4 8a2 2 0 012-2h12a2 2 0 012 2v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8Zm4-4v3m8-3v3',
  filter:'M4 6h16M7 12h10M10 18h4', dots:'M12 6h.01M12 12h.01M12 18h.01',
};
function Icon({n, s=16, w=1.9, style}){
  const d=IP[n]||'';
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0,...style}}>
    {d.split('M').filter(Boolean).map((p,i)=><path key={i} d={'M'+p}/>)}</svg>);
}
function Mark({s=26}){
  return (<svg width={s} height={s} viewBox="0 0 40 40" fill="none" style={{display:'block'}}>
    <defs><linearGradient id="mkp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F4CF5E"/><stop offset="52%" stopColor="#E6B022"/><stop offset="100%" stopColor="#B8881A"/></linearGradient></defs>
    <circle cx="20" cy="20" r="17" stroke="url(#mkp)" strokeWidth="2" fill="none" strokeDasharray="3 4" opacity=".5"/>
    <circle cx="20" cy="20" r="11" stroke="url(#mkp)" strokeWidth="1.5" fill="none" opacity=".6"/>
    <path d="M 12 26 Q 20 26 20 20 Q 20 14 28 14" stroke="url(#mkp)" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <circle cx="20" cy="20" r="2.5" fill="#E6B022"/></svg>);
}

/* ---------- toolbar ---------- */
const KPI=[['Arrivées auj.','4','arrowIn'],['Départs','2','arrowOut'],['Ménages','7','broom'],['Non assigné','3','alert']];
function Toolbar({ filter, setFilter, compact }){
  const chips=[['all','Tout'],['res','Résas'],['tasks','Tâches'],['msgs','Msgs']];
  return (<div style={{borderBottom:'1px solid var(--line)',background:'var(--paper2)'}}>
    <div style={{display:'flex',alignItems:'center',gap:14,padding:compact?'10px 12px':'12px 16px',flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:9}}><Mark s={24}/>
        <span style={{fontWeight:800,fontSize:16,letterSpacing:'-.04em'}}>sojori</span>
        <span style={{width:1,height:18,background:'var(--line)',margin:'0 4px'}}/>
        <span style={{fontWeight:600,fontSize:14}}>Planning</span></div>
      {!compact&&<>
        <div style={{display:'flex',alignItems:'center',border:'1px solid var(--line)',borderRadius:8,background:'var(--paper)',overflow:'hidden'}}>
          {['chevL','chevR'].map(n=><button key={n} style={navBtn}><Icon n={n} s={14}/></button>)}
          <span className="mono" style={{fontSize:12,fontWeight:600,padding:'0 12px',letterSpacing:'.02em',borderLeft:'1px solid var(--line2)',lineHeight:'28px'}}>JUIL — AOÛT 2026</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 11px',border:'1px solid var(--line)',borderRadius:8,background:'var(--paper)',color:'var(--ink3)'}}>
          <Icon n="search" s={14}/><span style={{fontSize:12.5,color:'var(--ink3)'}}>Logement, client…</span></div>
      </>}
      <div style={{flex:1}}/>
      {/* KPIs */}
      <div style={{display:'flex',gap:compact?10:16,alignItems:'center'}}>
        {(compact?KPI.slice(0,3):KPI).map(([l,v,ic],i)=>(<div key={l} style={{display:'flex',alignItems:'center',gap:7,
          paddingLeft:i?compact?10:16:0,borderLeft:i?'1px solid var(--line)':'none'}}>
          <span style={{color:l==='Non assigné'?'var(--unassigned)':'var(--ink3)'}}><Icon n={ic} s={15}/></span>
          <span style={{fontWeight:700,fontSize:15,letterSpacing:'-.02em',color:l==='Non assigné'?'var(--unassigned)':'var(--ink)'}}>{v}</span>
          {!compact&&<span className="mono" style={{fontSize:10,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--ink3)'}}>{l}</span>}
        </div>))}
      </div>
    </div>
    {/* filtres */}
    <div style={{display:'flex',alignItems:'center',gap:6,padding:compact?'0 12px 10px':'0 16px 10px'}}>
      <span style={{color:'var(--ink4)',marginRight:2}}><Icon n="filter" s={14}/></span>
      {chips.map(([k,l])=>{const on=filter===k;
        return (<button key={k} onClick={()=>setFilter(k)} style={{fontFamily:'var(--sans)',fontSize:12.5,fontWeight:on?700:500,
          letterSpacing:'-.01em',padding:'6px 13px',borderRadius:7,cursor:'pointer',transition:'background .16s,color .16s,border-color .16s',
          border:'1px solid '+(on?'var(--ink)':'var(--line)'),background:on?'var(--ink)':'var(--paper)',color:on?'var(--cream)':'var(--ink2)'}}>{l}</button>);})}
      <span className="mono" style={{marginLeft:8,fontSize:10.5,letterSpacing:'.06em',color:'var(--ink4)',textTransform:'uppercase'}}>
        {filter==='all'?'tout visible':filter==='res'?'barres seules':filter==='tasks'?'résas avec tâches ouvertes':'résas avec message'}</span>
    </div>
  </div>);
}
const navBtn={width:28,height:28,display:'grid',placeItems:'center',border:'none',background:'transparent',color:'var(--ink2)',cursor:'pointer'};

/* ---------- en-tête de dates ---------- */
function DateHead({ cols=DAYS, col=78, listw=236, count=LISTINGS.length, compact }){
  return (<div style={{display:'flex',position:'sticky',top:0,zIndex:6,background:'var(--paper2)',borderBottom:'1px solid var(--line)'}}>
    <div style={{width:listw,flexShrink:0,position:'sticky',left:0,zIndex:2,background:'var(--paper2)',
      borderRight:'1px solid var(--line)',padding:'8px 14px',display:'flex',alignItems:'center'}}>
      <span className="mono" style={{fontSize:10,fontWeight:600,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--ink3)'}}>{count} logements</span></div>
    <div style={{display:'flex'}}>
      {cols.map((d,i)=>{const we=WEEKEND.includes(i),td=i===TODAY;const [dow,num]=d.split(' ');
        return (<div key={i} style={{width:col,flexShrink:0,padding:'7px 0 6px',textAlign:'center',
          borderRight:'1px solid var(--line2)',background:td?'var(--goldWash)':we?'rgba(22,19,14,.025)':'transparent'}}>
          <div className="mono" style={{fontSize:9.5,letterSpacing:'.1em',textTransform:'uppercase',color:td?'var(--goldDeep)':'var(--ink4)'}}>{dow}</div>
          <div style={{fontSize:13.5,fontWeight:td?800:600,color:td?'var(--goldDeep)':'var(--ink)',letterSpacing:'-.02em'}}>{num}</div>
        </div>);})}
    </div>
  </div>);
}

/* ---------- chip tâche ---------- */
function TaskChip({ t, dim }){
  const st=t.st;
  const c = st==='unassigned'?'var(--unassigned)':st==='done'?'var(--done)':'var(--open)';
  return (<span style={{display:'inline-flex',alignItems:'center',gap:4,height:18,padding:'0 7px',borderRadius:4,flexShrink:0,
    fontSize:11,fontWeight:600,letterSpacing:'-.01em',lineHeight:1,whiteSpace:'nowrap',opacity:dim?.5:1,
    color:c, background: st==='done'?'transparent':'var(--paper)',
    border:'1px '+(st==='unassigned'?'dashed':'solid')+' '+(st==='done'?'var(--line)':c),
    textDecoration:st==='done'?'none':'none'}}>
    {st==='done'?<Icon n="check" s={10} w={2.6}/>:st==='unassigned'?<Icon n="alert" s={10} w={2.2}/>:<Icon n="broom" s={10} w={2}/>}
    {t.t}{t.who&&st!=='unassigned'?<span style={{color:'var(--ink4)',fontWeight:500}}>·{t.who}</span>:null}
  </span>);
}

/* ---------- barre réservation ---------- */
function ResBar({ r, filter, col, onHover, dense }){
  const ch=CH[r.ch];
  const showMeta = filter!=='res';
  const showTasks = showMeta && r.tasks.length>0 && (filter==='all'||filter==='tasks');
  const showMsg = showMeta && r.msg && (filter==='all'||filter==='msgs');
  const emph = filter==='msgs' && !!r.msg;
  const barH = dense?22:26;
  const via = r.msg?.via;
  return (<div
    onMouseEnter={e=>onHover&&onHover({r,x:e.clientX,y:e.currentTarget.getBoundingClientRect().top})}
    onMouseMove={e=>onHover&&onHover({r,x:e.clientX,y:e.currentTarget.getBoundingClientRect().top})}
    onMouseLeave={()=>onHover&&onHover(null)}
    style={{position:'absolute',left:r.d*col+3,width:r.len*col-6,top:dense?6:9,cursor:'pointer'}} className="resw">
    {/* barre */}
    <div className="resbar" style={{height:barH,borderRadius:6,background:ch.wash,border:'1px solid '+ch.color+'2E',
      borderLeft:'3px solid '+ch.color,display:'flex',alignItems:'center',gap:7,padding:'0 8px 0 7px',
      transition:'height .15s ease, box-shadow .15s ease, background .15s ease',overflow:'hidden'}}>
      <span style={{fontSize:12.5,fontWeight:650,letterSpacing:'-.015em',color:'var(--ink)',whiteSpace:'nowrap',
        overflow:'hidden',textOverflow:'ellipsis',flex:1,minWidth:0}}>{r.guest}</span>
      <span className="mono" style={{fontSize:10,color:'var(--ink3)',flexShrink:0,letterSpacing:'.02em'}}>{r.pax}p</span>
      {r.msg&&<span style={{position:'relative',flexShrink:0,display:'flex',alignItems:'center',
        color:via==='wa'?'var(--wa)':'var(--ota)'}}>
        <Icon n={via==='wa'?'wa':'ota'} s={13} w={1.8}/>
        {r.msg.unread&&<span style={{position:'absolute',top:-1,right:-2,width:5,height:5,borderRadius:9,
          background:'var(--gold)',boxShadow:'0 0 0 1.5px '+ch.wash}}/>}
      </span>}
    </div>
    {/* ligne meta : chips tâches + snippet (1 ligne) */}
    {(showTasks||showMsg)&&<div style={{display:'flex',alignItems:'center',gap:6,marginTop:4,height:18,overflow:'hidden'}}>
      {showTasks&&r.tasks.filter(t=>filter==='tasks'?t.st!=='done':true).map((t,i)=><TaskChip key={i} t={t} dim={filter==='msgs'}/>)}
      {showMsg&&<span className="snip" style={{display:'flex',alignItems:'center',gap:5,minWidth:0,flex:1}}>
        <span style={{flexShrink:0,width:3,height:11,borderRadius:2,background:emph?(via==='wa'?'var(--wa)':'var(--gold)'):'var(--line)'}}/>
        <span style={{fontSize:11.5,letterSpacing:'-.01em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
          color:emph?'var(--ink)':'var(--ink3)',fontWeight:emph?550:400}}>
          {r.msg.from==='staff'&&<span className="mono" style={{fontSize:9.5,letterSpacing:'.08em',color:'var(--ink4)',marginRight:5}}>VOUS</span>}
          {r.msg.txt}</span>
      </span>}
    </div>}
  </div>);
}

/* ---------- une ligne logement ---------- */
function Row({ l, filter, col, listw, rowh, onHover, dense, last }){
  const res=l.res.filter(r=>keep(r,filter));
  return (<div style={{display:'flex',borderBottom:last?'none':'1px solid var(--line2)',minHeight:rowh}}>
    <div style={{width:listw,flexShrink:0,position:'sticky',left:0,zIndex:3,background:'var(--cream)',
      borderRight:'1px solid var(--line)',padding:dense?'9px 12px':'12px 14px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
      <div style={{fontSize:13.5,fontWeight:650,letterSpacing:'-.02em',lineHeight:1.2}}>{l.name}</div>
      {!dense&&<div style={{fontSize:11,color:'var(--ink3)',marginTop:2}}>{l.meta}</div>}
    </div>
    <div style={{position:'relative',width:DAYS.length*col,flexShrink:0}}>
      {/* colonnes */}
      <div style={{position:'absolute',inset:0,display:'flex'}}>
        {DAYS.map((_,i)=><div key={i} style={{width:col,flexShrink:0,borderRight:'1px solid var(--line2)',
          background:i===TODAY?'rgba(230,176,34,.07)':WEEKEND.includes(i)?'rgba(22,19,14,.022)':'transparent'}}/>)}
      </div>
      {res.map(r=><ResBar key={r.id} r={r} filter={filter} col={col} onHover={onHover} dense={dense}/>)}
    </div>
  </div>);
}

/* ---------- tooltip hover ---------- */
function Tip({ hov }){
  if(!hov) return null;
  const {r,x,y}=hov; const ch=CH[r.ch];
  const w=326;
  const left=Math.max(12,Math.min(window.innerWidth-w-12,x-w/2));
  const top=Math.max(12,y-14);
  return (<div style={{position:'fixed',left,top,width:w,transform:'translateY(-100%)',zIndex:60,pointerEvents:'none',
    background:'var(--paper)',border:'1px solid var(--line)',borderRadius:10,boxShadow:'0 16px 40px rgba(22,19,14,.18)',
    padding:'12px 13px',animation:'none'}}>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
      <span style={{width:8,height:8,borderRadius:2,background:ch.color,flexShrink:0}}/>
      <span style={{fontSize:13.5,fontWeight:700,letterSpacing:'-.02em'}}>{r.guest}</span>
      <span className="mono" style={{marginLeft:'auto',fontSize:9.5,letterSpacing:'.1em',textTransform:'uppercase',color:ch.color}}>{ch.label}</span>
    </div>
    <div style={{display:'flex',gap:14,fontSize:11.5,color:'var(--ink2)',marginBottom:r.tasks.length||r.msg?9:0}}>
      <span style={{display:'inline-flex',gap:5,alignItems:'center'}}><Icon n="cal" s={12}/>{r.len} nuits</span>
      <span style={{display:'inline-flex',gap:5,alignItems:'center'}}><Icon n="users" s={12}/>{r.pax} pers.</span>
    </div>
    {r.tasks.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:5,paddingTop:9,borderTop:'1px solid var(--line2)',marginBottom:r.msg?9:0}}>
      {r.tasks.map((t,i)=><TaskChip key={i} t={t}/>)}</div>}
    {r.msg&&<div style={{paddingTop:9,borderTop:'1px solid var(--line2)'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
        <span style={{color:r.msg.via==='wa'?'var(--wa)':'var(--ota)'}}><Icon n={r.msg.via==='wa'?'wa':'ota'} s={12}/></span>
        <span className="mono" style={{fontSize:9.5,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--ink3)'}}>
          {r.msg.via==='wa'?'WhatsApp':'Messagerie OTA'} · {r.msg.from==='staff'?'vous':'client'}</span>
        <span className="mono" style={{marginLeft:'auto',fontSize:9.5,color:'var(--ink4)'}}>{r.msg.at}</span>
      </div>
      <p style={{fontSize:12.5,lineHeight:1.45,color:'var(--ink)'}}>{r.msg.txt}</p>
    </div>}
  </div>);
}

/* ---------- grille ---------- */
function Grid({ filter, setFilter, hov, setHov }){
  return (<div className="sheet">
    <Toolbar filter={filter} setFilter={setFilter}/>
    <div style={{overflowX:'auto',overflowY:'hidden',background:'var(--cream)'}} className="scroller">
      <div style={{minWidth:236+DAYS.length*78}}>
        <DateHead/>
        {LISTINGS.map((l,i)=><Row key={l.id} l={l} filter={filter} col={78} listw={236} rowh={74}
          onHover={setHov} last={i===LISTINGS.length-1}/>)}
      </div>
    </div>
  </div>);
}

/* ---------- détail anatomie d'une barre ---------- */
function Anatomy(){
  const r=LISTINGS[0].res[0];
  const ann=[
    ['Nom du client','13 px / 650 · ink · tronqué à la largeur de la barre'],
    ['Bord gauche 3 px','couleur canal : Airbnb #C4483A · Booking #2C558F · Direct #B8881A'],
    ['Compteur voyageurs','Geist Mono 10 px · ink3 · jamais tronqué'],
    ['Icône message','13 px · WhatsApp #2F7D5C / OTA #6A6155 · point or 5 px si non lu'],
    ['Chips tâches','h 18 px · r 4 px · ouvert=or, non assigné=pointillé terracotta, fait=gris + coche'],
    ['Snippet','11,5 px · 1 ligne · filet 3×11 px du canal · WhatsApp prioritaire sur OTA'],
  ];
  return (<div className="sheet" style={{padding:'26px 24px'}}>
    <div style={{position:'relative',width:520,margin:'0 auto 26px'}}>
      <div style={{position:'relative',height:74,background:'var(--cream)',border:'1px dashed var(--line)',borderRadius:8}}>
        <div style={{position:'absolute',left:20,right:20,top:9}}>
          <div style={{height:26,borderRadius:6,background:CH.airbnb.wash,border:'1px solid #C4483A2E',borderLeft:'3px solid var(--abnb)',
            display:'flex',alignItems:'center',gap:7,padding:'0 8px 0 7px',boxShadow:'0 3px 10px rgba(22,19,14,.07)'}}>
            <span style={{fontSize:12.5,fontWeight:650,letterSpacing:'-.015em',flex:1}}>{r.guest}</span>
            <span className="mono" style={{fontSize:10,color:'var(--ink3)'}}>4p</span>
            <span style={{position:'relative',display:'flex',color:'var(--wa)'}}><Icon n="wa" s={13} w={1.8}/>
              <span style={{position:'absolute',top:-1,right:-2,width:5,height:5,borderRadius:9,background:'var(--gold)',boxShadow:'0 0 0 1.5px '+CH.airbnb.wash}}/></span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4,height:18}}>
            {r.tasks.map((t,i)=><TaskChip key={i} t={t}/>)}
            <span style={{display:'flex',alignItems:'center',gap:5,minWidth:0,flex:1}}>
              <span style={{flexShrink:0,width:3,height:11,borderRadius:2,background:'var(--wa)'}}/>
              <span style={{fontSize:11.5,color:'var(--ink3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.msg.txt}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 28px',maxWidth:900,margin:'0 auto'}}>
      {ann.map(([t,d],i)=>(<div key={t} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
        <span className="mono" style={{fontSize:10,fontWeight:600,color:'var(--goldDeep)',marginTop:2,flexShrink:0}}>{String(i+1).padStart(2,'0')}</span>
        <div><div style={{fontSize:12.5,fontWeight:650,letterSpacing:'-.01em'}}>{t}</div>
          <div style={{fontSize:11.5,color:'var(--ink2)',lineHeight:1.45,marginTop:1}}>{d}</div></div>
      </div>))}
    </div>
  </div>);
}

/* ---------- mobile compact ---------- */
const M_DAYS=DAYS.slice(0,6), M_COL=46;
function Mobile({ filter }){
  return (<div style={{width:402,margin:'0 auto',border:'1px solid var(--line)',borderRadius:16,overflow:'hidden',
    background:'var(--cream)',boxShadow:'0 18px 44px rgba(22,19,14,.14)'}}>
    <Toolbar filter={filter} setFilter={()=>{}} compact/>
    <div style={{overflowX:'auto'}}>
      <div style={{minWidth:118+M_DAYS.length*M_COL}}>
        <div style={{display:'flex',position:'sticky',top:0,background:'var(--paper2)',borderBottom:'1px solid var(--line)',zIndex:4}}>
          <div style={{width:118,flexShrink:0,borderRight:'1px solid var(--line)',padding:'6px 10px'}}>
            <span className="mono" style={{fontSize:9,letterSpacing:'.12em',color:'var(--ink3)'}}>LOGEMENT</span></div>
          {M_DAYS.map((d,i)=>{const [dow,num]=d.split(' ');const td=i===TODAY;
            return (<div key={i} style={{width:M_COL,flexShrink:0,textAlign:'center',padding:'5px 0',borderRight:'1px solid var(--line2)',
              background:td?'var(--goldWash)':WEEKEND.includes(i)?'rgba(22,19,14,.025)':'transparent'}}>
              <div className="mono" style={{fontSize:8,letterSpacing:'.08em',textTransform:'uppercase',color:td?'var(--goldDeep)':'var(--ink4)'}}>{dow.slice(0,1)}</div>
              <div style={{fontSize:11.5,fontWeight:td?800:600,color:td?'var(--goldDeep)':'var(--ink)'}}>{num}</div></div>);})}
        </div>
        {LISTINGS.slice(0,4).map((l,li)=>{const res=l.res.filter(r=>keep(r,filter)&&r.d<M_DAYS.length);
          return (<div key={l.id} style={{display:'flex',borderBottom:li===3?'none':'1px solid var(--line2)',minHeight:56}}>
            <div style={{width:118,flexShrink:0,position:'sticky',left:0,background:'var(--cream)',borderRight:'1px solid var(--line)',
              padding:'8px 10px',display:'flex',alignItems:'center'}}>
              <div style={{fontSize:11.5,fontWeight:650,letterSpacing:'-.02em',lineHeight:1.2}}>{l.name}</div></div>
            <div style={{position:'relative',width:M_DAYS.length*M_COL,flexShrink:0}}>
              <div style={{position:'absolute',inset:0,display:'flex'}}>
                {M_DAYS.map((_,i)=><div key={i} style={{width:M_COL,flexShrink:0,borderRight:'1px solid var(--line2)',
                  background:i===TODAY?'rgba(230,176,34,.07)':WEEKEND.includes(i)?'rgba(22,19,14,.022)':'transparent'}}/>)}
              </div>
              {res.map(r=>{const ch=CH[r.ch];const wpx=Math.min(r.len,M_DAYS.length-r.d)*M_COL-4;
                return (<div key={r.id} style={{position:'absolute',left:r.d*M_COL+2,width:wpx,top:7}}>
                  <div style={{height:20,borderRadius:5,background:ch.wash,border:'1px solid '+ch.color+'2E',borderLeft:'2.5px solid '+ch.color,
                    display:'flex',alignItems:'center',gap:5,padding:'0 5px'}}>
                    <span style={{fontSize:11,fontWeight:650,letterSpacing:'-.02em',flex:1,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.guest.split(' ')[0]}</span>
                    {r.msg&&<span style={{position:'relative',display:'flex',color:r.msg.via==='wa'?'var(--wa)':'var(--ota)'}}>
                      <Icon n={r.msg.via==='wa'?'wa':'ota'} s={11} w={1.9}/>
                      {r.msg.unread&&<span style={{position:'absolute',top:-1,right:-2,width:4,height:4,borderRadius:9,background:'var(--gold)'}}/>}</span>}
                  </div>
                  {(r.msg||r.tasks.length>0)&&filter!=='res'&&<div style={{display:'flex',alignItems:'center',gap:4,marginTop:3,height:15,overflow:'hidden'}}>
                    {r.tasks.filter(t=>t.st!=='done').slice(0,1).map((t,i)=><span key={i} style={{fontSize:9.5,fontWeight:600,
                      color:t.st==='unassigned'?'var(--unassigned)':'var(--open)',border:'1px '+(t.st==='unassigned'?'dashed':'solid')+' currentColor',
                      borderRadius:3,padding:'0 4px',height:15,lineHeight:'14px',flexShrink:0,whiteSpace:'nowrap'}}>{t.t}</span>)}
                    {r.msg&&<span style={{fontSize:10,color:filter==='msgs'?'var(--ink)':'var(--ink3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0}}>{r.msg.txt}</span>}
                  </div>}
                </div>);})}
            </div>
          </div>);})}
      </div>
    </div>
  </div>);
}

/* ---------- specs ---------- */
function Specs(){
  const groups=[
    ['Grille',[['Colonne jour','78 px (desktop) · 46 px (mobile)'],['Colonne logement','236 px sticky · 118 px mobile'],
      ['Hauteur de ligne','74 px (barre 26 + meta 18 + gaps) · 56 px mobile'],['Filets','1 px #EFECE4 interne · 1 px #E4E0D6 séparateurs'],
      ['Week-end / aujourd’hui','fond rgba(22,19,14,.022) / rgba(230,176,34,.07)']]],
    ['Barre résa',[['Hauteur','26 px · rayon 6 px · hover 30 px'],['Fond','wash du canal (5 % teinte)'],
      ['Bord','1 px canal @18 % + bord gauche 3 px pleine couleur'],['Client','Geist 12,5 px / 650 · #16130E'],
      ['Canaux','Airbnb #C4483A · Booking #2C558F · Direct #B8881A']]],
    ['Chips tâche',[['Gabarit','h 18 px · r 4 px · 11 px / 600 · padding 0 7 px'],
      ['Ouvert','trait + texte #B8881A sur blanc'],['Non assigné','trait pointillé + texte #C4483A'],
      ['Fait','trait #E4E0D6 · texte #9B9285 · coche 10 px'],['Assigné à','suffixe · Prénom en #BEB7AA 500']]],
    ['Signal message',[['Icône dans la barre','13 px · WA #2F7D5C · OTA #6A6155'],
      ['Non lu','point or 5 px, halo 1,5 px de la couleur du wash'],
      ['Snippet','11,5 px · 1 ligne · ellipsis · #9B9285 (filtre Msgs → #16130E / 550)'],
      ['Filet snippet','3 × 11 px r 2 px · couleur canal si Msgs actif, sinon #E4E0D6'],
      ['Priorité','WhatsApp > OTA si les deux existent · préfixe « VOUS » si sortant']]],
    ['Chips filtre',[['Gabarit','h 28 px · r 7 px · 12,5 px'],['Repos','1 px #E4E0D6 · texte #6A6155 sur blanc'],
      ['Actif','fond #16130E · texte #F6F5F1 · 700'],['Transition','background/color 160 ms']]],
    ['Motion',[['Hover barre','hauteur 26→30 px + ombre 0 3 10 rgba(22,19,14,.07) · 150 ms'],
      ['Tooltip','fixe, 326 px, apparition immédiate, sans overlay collant'],['Chip filtre','160 ms ease · aucun autre motion']]],
  ];
  return (<div className="sheet" style={{padding:'22px 24px'}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'22px 32px'}}>
      {groups.map(([g,rows])=>(<div key={g}>
        <div className="mono" style={{fontSize:10,fontWeight:600,letterSpacing:'.14em',textTransform:'uppercase',
          color:'var(--goldDeep)',paddingBottom:8,borderBottom:'1px solid var(--line)',marginBottom:10}}>{g}</div>
        {rows.map(([k,v])=>(<div key={k} style={{display:'flex',gap:10,padding:'5px 0',alignItems:'flex-start'}}>
          <span style={{fontSize:11.5,fontWeight:650,letterSpacing:'-.01em',width:112,flexShrink:0,lineHeight:1.35}}>{k}</span>
          <span style={{fontSize:11.5,color:'var(--ink2)',lineHeight:1.4}}>{v}</span></div>))}
      </div>))}
    </div>
  </div>);
}

function Sec({ n, title, desc }){
  return (<div className="seclabel"><span className="n">{n}</span><h2>{title}</h2><span className="d">{desc}</span></div>);
}

function App(){
  const [filter,setFilter]=useState('all');
  const [hov,setHov]=useState(null);
  return (<div className="wrap">
    <Sec n="01" title="Zone grille — cockpit ops" desc="La grille reste héro. Les messages sont un signal secondaire : icône dans la barre + snippet 1 ligne sous elle. Survolez une barre ; changez de filtre dans la toolbar."/>
    <Grid filter={filter} setFilter={setFilter} hov={hov} setHov={setHov}/>
    <Sec n="02" title="Anatomie d'une barre résa" desc="Client, canal, voyageurs, icône message + non-lu, chips tâches et snippet — tout tient sur deux lignes de 26 et 18 px."/>
    <Anatomy/>
    <Sec n="03" title="Filtre Msgs actif" desc="Seules les résas avec message restent. Le snippet passe en pleine lisibilité, le filet prend la couleur du canal, les chips tâches s'estompent."/>
    <div className="sheet"><Toolbar filter="msgs" setFilter={()=>{}}/>
      <div style={{overflowX:'auto',background:'var(--cream)'}}>
        <div style={{minWidth:236+DAYS.length*78}}>
          <DateHead/>
          {LISTINGS.map((l,i)=><Row key={l.id} l={l} filter="msgs" col={78} listw={236} rowh={74} onHover={setHov} last={i===LISTINGS.length-1}/>)}
        </div></div></div>
    <Sec n="04" title="Mobile compact" desc="Colonne logement 118 px, jour 46 px, 1 à 2 lignes par résa : prénom + icône message, puis la tâche la plus urgente et le snippet."/>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>
      <div><div className="mono" style={{fontSize:10,letterSpacing:'.12em',color:'var(--ink2)',marginBottom:10,textAlign:'center'}}>TOUT</div><Mobile filter="all"/></div>
      <div><div className="mono" style={{fontSize:10,letterSpacing:'.12em',color:'var(--ink2)',marginBottom:10,textAlign:'center'}}>MSGS</div><Mobile filter="msgs"/></div>
    </div>
    <Sec n="05" title="Specs" desc="Tailles, couleurs, espacements et typo — prêts à porter dans le code existant."/>
    <Specs/>
    <Tip hov={hov}/>
  </div>);
}
const style=document.createElement('style');
style.textContent='.resw:hover .resbar{height:30px!important;box-shadow:0 4px 14px rgba(22,19,14,.10)}.scroller{scrollbar-width:thin}.scroller::-webkit-scrollbar{height:10px}.scroller::-webkit-scrollbar-thumb{background:var(--line);border-radius:8px;border:3px solid transparent;background-clip:padding-box}';
document.head.appendChild(style);
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
