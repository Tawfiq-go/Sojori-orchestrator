/* ===== Kit WhatsApp — STRICTEMENT les composants Flow natifs =====
   Palette imposée par Meta : aucun contrôle de couleur, de police ni de mise en page.
   Composants utilisés dans tout ce document (sous-ensemble sûr, Flow JSON ≥ 3.0) :
     TextHeading · TextSubheading · TextBody · TextCaption
     RadioButtonsGroup · Dropdown · TextInput · TextArea · OptIn
     Footer (UN par écran) · EmbeddedLink
   Volontairement exclus (dépendants de version ou du client) :
     Image · ImageCarousel · RichText · ChipsSelector · NavigationList
     CalendarPicker · DatePicker · TimePicker · If/Switch
*/
const { useState } = React;

/* ---------- petites icônes du document (hors flow) ---------- */
const IP={
  chevL:'M14.5 6l-6 6 6 6', chevR:'M9.5 6l6 6-6 6', chevD:'M6 9.5l6 6 6-6',
  x:'M6 6l12 12M18 6L6 18', check:'M4.5 12.5l5 5L20 6',
  alert:'M12 9.5v4m0 3.5h.01M10.6 4.6L3.2 17.8A1.8 1.8 0 004.8 20.5h14.4a1.8 1.8 0 001.6-2.7L13.4 4.6a1.6 1.6 0 00-2.8 0Z',
  info:'M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17Zm0-12.5h.01M11 12h1v4.5h1',
  ban:'M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17ZM6 6l12 12',
  img:'M4 5.5h16v13H4zM4 15l4.5-4.5 4 4 3-3L20 15M9 9.5h.01',
  lock:'M6 11h12v9H6zM9 11V8a3 3 0 016 0v3',
};
function Ic({n,s=16,w=1.8,style}){
  const d=IP[n]||'';
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0,...style}}>
    {d.split('M').filter(Boolean).map((p,i)=><path key={i} d={'M'+p}/>)}</svg>);
}
function Mark({s=26}){
  const id='fm'+s;
  return (<svg width={s} height={s} viewBox="0 0 40 40" fill="none" style={{display:'block'}}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#F4CF5E"/><stop offset="52%" stopColor="#E6B022"/><stop offset="100%" stopColor="#B0841C"/></linearGradient></defs>
    <circle cx="20" cy="20" r="17" stroke={`url(#${id})`} strokeWidth="2" fill="none" strokeDasharray="3 4" opacity=".5"/>
    <circle cx="20" cy="20" r="11" stroke={`url(#${id})`} strokeWidth="1.5" fill="none" opacity=".6"/>
    <path d="M 12 26 Q 20 26 20 20 Q 20 14 28 14" stroke={`url(#${id})`} strokeWidth="3" strokeLinecap="round" fill="none"/>
    <circle cx="20" cy="20" r="2.5" fill="#E6B022"/></svg>);
}

/* ================= CONVERSATION (hors Flow) ================= */
function ChatTop({name='Sojori'}){
  return (<div style={{display:'flex',alignItems:'center',gap:11,padding:'11px 13px',background:'#F0F2F5',
    borderBottom:'1px solid var(--wa-div)',flexShrink:0}}>
    <span style={{color:'var(--wa-text)',fontSize:17}}>‹</span>
    <div style={{width:33,height:33,borderRadius:33,background:'var(--wa-green)',display:'grid',placeItems:'center',
      color:'#FFF',fontSize:13,fontWeight:700}}>S</div>
    <div><div style={{fontSize:14,fontWeight:600,color:'var(--wa-text)'}}>{name}</div>
      <div style={{fontSize:11,color:'var(--wa-text-2)'}}>compte professionnel</div></div></div>);
}
function Chat({children,h=560}){
  return (<div className="phone" style={{height:h,background:'var(--wa-chat)'}}>
    <ChatTop/>
    <div style={{flex:1,padding:'12px 10px',display:'flex',flexDirection:'column',gap:7,
      justifyContent:'flex-end',overflow:'hidden'}}>{children}</div></div>);
}
function In({children,at='14:02',btn,cap}){
  return (<div style={{alignSelf:'flex-start',maxWidth:'92%',background:'var(--wa-bubble)',
    borderRadius:'7px 7px 7px 2px',padding:'8px 10px 6px',boxShadow:'0 1px .5px rgba(11,20,26,.13)'}}>
    <div style={{fontSize:14,lineHeight:1.42,color:'var(--wa-text)'}}>{children}</div>
    <div style={{fontSize:10.5,color:'var(--wa-text-2)',textAlign:'right',marginTop:2}}>{at}</div>
    {btn&&<div style={{marginTop:6,marginInline:-10,marginBottom:-6,borderTop:'1px solid var(--wa-div)',
      padding:'9px 0',textAlign:'center',fontSize:14,fontWeight:600,color:'var(--wa-blue)'}}>{btn}</div>}
  </div>);
}
function Out({children,at='14:03'}){
  return (<div style={{alignSelf:'flex-end',maxWidth:'86%',background:'var(--wa-out)',borderRadius:'7px 7px 2px 7px',
    padding:'7px 10px 5px',boxShadow:'0 1px .5px rgba(11,20,26,.13)'}}>
    <div style={{fontSize:14,lineHeight:1.42,color:'var(--wa-text)'}}>{children}</div>
    <div style={{fontSize:10.5,color:'var(--wa-text-2)',textAlign:'right',marginTop:2}}>{at} ✓✓</div></div>);
}
/* message image + caption — 1 message par image, il n'y a pas d'album en Cloud API */
function ImgMsg({tint=0,at='14:01',caption,n,total}){
  const T=[['#E9D8B6','#C79B54'],['#CCDBD3','#4D897D'],['#E5C8B4','#B4754D']][tint%3];
  return (<div style={{alignSelf:'flex-start',width:248,flexShrink:0,background:'var(--wa-bubble)',borderRadius:'7px 7px 7px 2px',
    padding:3,boxShadow:'0 1px .5px rgba(11,20,26,.13)'}}>
    <div style={{position:'relative',aspectRatio:'1200/628',borderRadius:5,overflow:'hidden',
      background:`linear-gradient(135deg,${T[0]},${T[1]})`}}>
      <div style={{position:'absolute',inset:0,opacity:.4,mixBlendMode:'soft-light',
        background:'radial-gradient(120% 90% at 22% 12%,rgba(255,255,255,.7),transparent 62%)'}}/>
      {n&&<div style={{position:'absolute',left:7,bottom:6,fontFamily:'var(--mono)',fontSize:8.5,fontWeight:600,
        letterSpacing:'.08em',color:'rgba(255,255,255,.92)'}}>{n}/{total} · 1200×628</div>}
    </div>
    {caption&&<div style={{padding:'6px 7px 4px',fontSize:13.5,lineHeight:1.42,color:'var(--wa-text)'}}>{caption}
      <span style={{fontSize:10.5,color:'var(--wa-text-2)',float:'right',marginLeft:8,marginTop:4}}>{at}</span></div>}
  </div>);
}
function DayTag({children='AUJOURD’HUI'}){
  return (<div style={{alignSelf:'center',fontSize:10.5,fontWeight:600,color:'var(--wa-text-2)',
    background:'rgba(255,255,255,.8)',padding:'4px 10px',borderRadius:7,margin:'2px 0 3px'}}>{children}</div>);
}
/* liste interactive Cloud API — max 10 lignes par section, 24 lignes au total */
function ListMsg({title,body,btn,at='14:02'}){
  return (<div style={{alignSelf:'flex-start',maxWidth:'92%',background:'var(--wa-bubble)',borderRadius:'7px 7px 7px 2px',
    padding:'8px 10px 6px',boxShadow:'0 1px .5px rgba(11,20,26,.13)'}}>
    {title&&<div style={{fontSize:14,fontWeight:700,color:'var(--wa-text)',marginBottom:3}}>{title}</div>}
    <div style={{fontSize:14,lineHeight:1.42,color:'var(--wa-text)'}}>{body}</div>
    <div style={{fontSize:10.5,color:'var(--wa-text-2)',textAlign:'right',marginTop:2}}>{at}</div>
    <div style={{marginTop:6,marginInline:-10,marginBottom:-6,borderTop:'1px solid var(--wa-div)',padding:'9px 0',
      textAlign:'center',fontSize:14,fontWeight:600,color:'var(--wa-blue)',
      display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
      <span style={{fontSize:15,lineHeight:1}}>☰</span>{btn}</div>
  </div>);
}

/* ================= ÉCRANS FLOW (composants natifs) ================= */
function FHead({title}){
  return (<div style={{display:'flex',alignItems:'center',gap:13,padding:'13px 15px',
    borderBottom:'1px solid var(--wa-div)',background:'var(--wa-surface)',flexShrink:0}}>
    <span style={{color:'var(--wa-text)',fontSize:18,lineHeight:1}}>✕</span>
    <span style={{fontSize:15.5,fontWeight:600,color:'var(--wa-text)',flex:1,minWidth:0,
      whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</span>
    <span style={{fontSize:16,color:'var(--wa-text-2)'}}>⋮</span></div>);
}
function FBody({children,gap=11,pad='15px'}){
  return (<div style={{padding:pad,display:'flex',flexDirection:'column',gap,flex:1,
    background:'var(--wa-surface)',overflow:'hidden'}}>{children}</div>);
}
/* TextHeading — une ligne forte, en tête d'écran */
function TH({children}){return <div style={{fontSize:19,fontWeight:700,color:'var(--wa-text)',lineHeight:1.25,letterSpacing:'-.01em'}}>{children}</div>;}
/* TextSubheading */
function TSH({children}){return <div style={{fontSize:14.5,fontWeight:600,color:'var(--wa-text)',lineHeight:1.35}}>{children}</div>;}
/* TextBody */
function TB({children,style}){return <div style={{fontSize:14,color:'var(--wa-text)',lineHeight:1.48,...style}}>{children}</div>;}
/* TextCaption */
function TC({children}){return <div style={{fontSize:12,color:'var(--wa-text-2)',lineHeight:1.45}}>{children}</div>;}
/* RadioButtonsGroup — une option */
function Radio({title,desc,on,meta}){
  return (<div style={{display:'flex',gap:11,alignItems:'flex-start',padding:'11px 2px',borderBottom:'1px solid var(--wa-div)'}}>
    <div style={{width:19,height:19,borderRadius:19,flexShrink:0,marginTop:1,
      border:'2px solid '+(on?'var(--wa-green)':'#B0B7BC'),display:'grid',placeItems:'center'}}>
      {on&&<div style={{width:9,height:9,borderRadius:9,background:'var(--wa-green)'}}/>}</div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:14.5,fontWeight:600,color:'var(--wa-text)',lineHeight:1.3,
        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</div>
      {desc&&<div style={{fontSize:12.5,color:'var(--wa-text-2)',lineHeight:1.35,marginTop:2,
        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{desc}</div>}
      {meta&&<div style={{fontSize:12.5,color:'var(--wa-green)',fontWeight:600,marginTop:3}}>{meta}</div>}</div></div>);
}
/* Dropdown */
function Drop({label,value}){
  return (<div style={{border:'1px solid #C9D2D3',borderRadius:6,padding:'8px 12px',display:'flex',alignItems:'center',gap:10}}>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:10.5,color:'var(--wa-text-2)',marginBottom:1}}>{label}</div>
      <div style={{fontSize:14,color:'var(--wa-text)',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{value}</div></div>
    <span style={{color:'var(--wa-text-2)',fontSize:10}}>▾</span></div>);
}
/* TextArea / TextInput */
function TArea({label,ph,rows=2}){
  return (<div style={{border:'1px solid #C9D2D3',borderRadius:6,padding:'8px 12px'}}>
    <div style={{fontSize:10.5,color:'var(--wa-text-2)',marginBottom:3}}>{label}</div>
    <div style={{fontSize:14,color:'#98A2A8',lineHeight:1.45,minHeight:rows*20}}>{ph}</div></div>);
}
/* OptIn — case à cocher légale */
function OptIn({children,on}){
  return (<div style={{display:'flex',gap:11,alignItems:'flex-start',paddingTop:2}}>
    <div style={{width:18,height:18,borderRadius:4,flexShrink:0,marginTop:1,
      border:'2px solid '+(on?'var(--wa-green)':'#B0B7BC'),background:on?'var(--wa-green)':'transparent',
      display:'grid',placeItems:'center',color:'#FFF',fontSize:11,fontWeight:700,lineHeight:1}}>{on?'✓':''}</div>
    <div style={{fontSize:12.5,color:'var(--wa-text)',lineHeight:1.45}}>{children}</div></div>);
}
/* EmbeddedLink */
function Link({children}){
  return <div style={{fontSize:14,fontWeight:600,color:'var(--wa-blue)',textAlign:'center',padding:'2px 0'}}>{children}</div>;
}
/* Footer — EXACTEMENT un par écran, ancré en bas */
function Footer({label,caption,link}){
  return (<div style={{padding:'10px 15px 15px',background:'var(--wa-surface)',borderTop:'1px solid var(--wa-div)',flexShrink:0}}>
    {link&&<div style={{paddingBottom:9}}><Link>{link}</Link></div>}
    {caption&&<div style={{fontSize:11.5,color:'var(--wa-text-2)',textAlign:'center',lineHeight:1.4,paddingBottom:9}}>{caption}</div>}
    <div style={{height:45,borderRadius:23,display:'grid',placeItems:'center',fontSize:15,fontWeight:600,
      background:'var(--wa-green)',color:'#FFF'}}>{label}</div></div>);
}
const PH=560;

/* ---------- inventaire auditable des composants d'un écran ---------- */
function Audit({items,screen}){
  const n=items.length;
  const ok=n<=6;
  return (<div className="audit">
    <div className="h">
      <span className="n" style={{color:ok?'var(--ok)':'var(--danger)'}}>{n} COMPOSANTS</span>
      {screen&&<span className="mono" style={{fontSize:9,color:'var(--ink4)',marginLeft:'auto'}}>{screen}</span>}
    </div>
    <ol>{items.map((t,i)=><li key={i} dangerouslySetInnerHTML={{__html:t}}/>)}</ol></div>);
}
function Frame({cap,sub,children,audit,screen}){
  return (<div className="frame">
    <div className="cap">{cap}</div>
    {children}
    {audit&&<Audit items={audit} screen={screen}/>}
    {sub&&<div className="sub">{sub}</div>}</div>);
}
function Sec({n,title,desc}){
  return (<div style={{display:'flex',alignItems:'baseline',gap:13,margin:'54px 0 18px',flexWrap:'wrap'}}>
    <span className="mono" style={{fontSize:11,fontWeight:600,letterSpacing:'.16em',color:'var(--gold-deep)'}}>{n}</span>
    <h2 className="d" style={{fontSize:22}}>{title}</h2>
    {desc&&<span style={{fontSize:12.5,color:'var(--ink2)',marginLeft:'auto',textAlign:'right',maxWidth:560,lineHeight:1.5}}>{desc}</span>}</div>);
}
function Table({head,rows,widths}){
  return (<table><thead><tr>{head.map((h,i)=><th key={h} style={widths?{width:widths[i]}:null}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} dangerouslySetInnerHTML={{__html:c}}/>)}</tr>)}</tbody></table>);
}

Object.assign(window,{useState,Ic,Mark,Chat,ChatTop,In,Out,ImgMsg,DayTag,ListMsg,
  FHead,FBody,TH,TSH,TB,TC,Radio,Drop,TArea,OptIn,Link,Footer,PH,Audit,Frame,Sec,Table});
