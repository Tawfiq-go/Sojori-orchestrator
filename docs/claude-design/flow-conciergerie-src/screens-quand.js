/* ===== Écran QUAND — date & heure, 3 variantes selon la config partenaire =====
   Aucun DatePicker / CalendarPicker / TimePicker : dépendants de version.
   Les dates éligibles sont calculées côté serveur (jours ouvrés, délai, horizon,
   dates bloquées) puis servies en Dropdown. Les règles de jours deviennent
   invisibles côté client : un jour non ouvré n'est simplement jamais listé. */

/* --- A. créneaux fixes --- */
function S_WhenSlots(){
  return (<div className="phone" style={{height:576}}>
    <FHead title="Soirée camp Agafay"/>
    <FBody gap={12}>
      <TH>Quand souhaitez-vous venir&nbsp;?</TH>
      <Drop label="Date" value="Samedi 1 août"/>
      <div>
        <TSH>Heure d’arrivée au camp</TSH>
        <div style={{marginTop:5}}>
          <Radio on title="15:00" desc="Quad, puis chameau au coucher du soleil"/>
          <Radio title="16:30" desc="Chameau au coucher du soleil, puis dîner"/>
        </div>
      </div>
      <TC>Départs à heures fixes, tous les jours. Retour vers 22 h 30.</TC>
    </FBody>
    <Footer label="Envoyer ma demande" caption="Tarif indicatif · confirmation sous 2 h"/>
  </div>);
}

/* --- B. plage libre --- */
function S_WhenWindow(){
  return (<div className="phone" style={{height:530}}>
    <FHead title="Quad à Agafay"/>
    <FBody gap={12}>
      <TH>Quand souhaitez-vous partir&nbsp;?</TH>
      <Drop label="Date" value="Jeudi 30 juillet"/>
      <Drop label="Heure de départ" value="10:00"/>
      <TC>Ouvert tous les jours, de 9 h à 18 h. Dernier départ à 16 h pour la formule 2 h.</TC>
    </FBody>
    <Footer label="Envoyer ma demande" caption="Tarif indicatif · confirmation sous 2 h"/>
  </div>);
}

/* --- C. heure imposée --- */
function S_WhenFixed(){
  return (<div className="phone" style={{height:530}}>
    <FHead title="Montgolfière"/>
    <FBody gap={12}>
      <TH>Choisissez votre date</TH>
      <Drop label="Date" value="Vendredi 31 juillet"/>
      <TSH>Départ à 05:30</TSH>
      <TC>Un seul départ par jour, au lever du soleil. Prise en charge à votre logement vers 04 h 45. Vol confirmé la veille selon la météo.</TC>
    </FBody>
    <Footer label="Envoyer ma demande" caption="Tarif indicatif · confirmation sous 2 h"/>
  </div>);
}

/* --- D. jours restreints, la contrainte est expliquée --- */
function S_WhenWeekdays(){
  return (<div className="phone" style={{height:576}}>
    <FHead title="Vallée de l’Ourika"/>
    <FBody gap={12}>
      <TH>Quand souhaitez-vous partir&nbsp;?</TH>
      <Drop label="Date" value="Mercredi 29 juillet"/>
      <div>
        <TSH>Heure de départ</TSH>
        <div style={{marginTop:5}}>
          <Radio on title="08:30" desc="Retour vers 17 h"/>
          <Radio title="09:30" desc="Retour vers 18 h"/>
        </div>
      </div>
      <TC>Cette excursion part du mardi au dimanche. Les lundis ne sont pas proposés.</TC>
    </FBody>
    <Footer label="Envoyer ma demande" caption="Tarif indicatif · confirmation sous 2 h"/>
  </div>);
}

/* --- E. aucune disponibilité sur l'horizon --- */
function S_WhenNone(){
  return (<div className="phone" style={{height:470}}>
    <FHead title="Vallée de l’Ourika"/>
    <FBody gap={12}>
      <div style={{margin:'auto 0',textAlign:'center'}}>
        <div style={{fontSize:34,marginBottom:12}}>📅</div>
        <TH>Complet pour le moment</TH>
        <div style={{marginTop:9}}>
          <TB>Plus aucune place sur les 30 prochains jours pour cette excursion.</TB></div>
        <div style={{marginTop:9}}>
          <TC>Écrivez au concierge&nbsp;: il vous prévient dès qu’une place se libère, ou vous propose une alternative équivalente.</TC></div>
      </div>
    </FBody>
    <Footer label="Revoir le catalogue" link="Écrire au concierge"/>
  </div>);
}

/* --- confirmation, avec la date et l'heure --- */
function S_ConfirmWhen(){
  return (<div className="phone" style={{height:PH}}>
    <FHead title="Demande envoyée"/>
    <FBody gap={12}>
      <div style={{margin:'auto 0',textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:12}}>✅</div>
        <TH>Votre demande est partie</TH>
        <div style={{marginTop:10,textAlign:'left',border:'1px solid var(--wa-div)',borderRadius:8,padding:'12px 13px'}}>
          <TB style={{marginBottom:5}}><b>Quad dans le désert d’Agafay</b></TB>
          <TB style={{marginBottom:5}}>Quad solo · 1 h — 450 MAD</TB>
          <TB><b>Jeudi 30 juillet · 10:00</b></TB>
        </div>
        <div style={{marginTop:11}}>
          <TC>Nous vérifions la disponibilité à cette heure et vous confirmons sous 2 h, dans cette conversation. Le créneau n’est pas encore réservé.</TC></div>
      </div>
    </FBody>
    <Footer label="Terminer"/>
  </div>);
}

/* ===== Maquette admin — éditeur de disponibilité (à implémenter par l'autre agent) ===== */
function AvailEditor(){
  const [mode,setMode]=useState('window');
  const [days,setDays]=useState([2,3,4,5,6,7]);
  const D=[['1','L'],['2','M'],['3','M'],['4','J'],['5','V'],['6','S'],['7','D']];
  const opt=(v,l,d)=>{
    const on=mode===v;
    return (<button key={v} onClick={()=>setMode(v)} style={{display:'flex',gap:11,alignItems:'flex-start',width:'100%',
      textAlign:'left',padding:'12px 13px',borderRadius:'var(--r)',transition:'all .14s ease',
      border:'1.5px solid '+(on?'var(--gold)':'var(--line)'),background:on?'var(--gold-wash)':'var(--surface)'}}>
      <span style={{width:18,height:18,borderRadius:18,flexShrink:0,marginTop:1,display:'grid',placeItems:'center',
        border:'2px solid '+(on?'var(--gold-deep)':'var(--ink4)')}}>
        {on&&<span style={{width:8,height:8,borderRadius:8,background:'var(--gold-deep)'}}/>}</span>
      <span><span style={{display:'block',fontSize:13.5,fontWeight:650,marginBottom:2}}>{l}</span>
        <span style={{display:'block',fontSize:11.5,color:'var(--ink2)',lineHeight:1.45}}>{d}</span></span>
    </button>);
  };
  const fld=(label,value,w)=>(<label style={{display:'block',width:w}}>
    <div className="lbl" style={{marginBottom:6,fontSize:9}}>{label}</div>
    <div style={{border:'1px solid var(--line)',borderRadius:8,padding:'8px 11px',background:'var(--surface)',
      fontFamily:'var(--mono)',fontSize:13}}>{value}</div></label>);
  return (<div style={{maxWidth:430,background:'var(--surface)',border:'1px solid var(--line)',
    borderRadius:'var(--r-lg)',padding:'20px 22px'}}>
    <div className="lbl" style={{marginBottom:6}}>Par activité</div>
    <h3 className="d" style={{fontSize:20,marginBottom:5}}>Quand cette activité a-t-elle lieu&nbsp;?</h3>
    <p style={{fontSize:12,color:'var(--ink2)',lineHeight:1.5,marginBottom:15}}>
      Ce réglage détermine les dates et les heures proposées au client dans WhatsApp.</p>
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {opt('window','Plage libre','Le client choisit son heure dans une plage, par pas de 30 min.')}
      {opt('slots','Créneaux fixes','Vous listez les départs. Le client choisit parmi eux.')}
      {opt('fixed','Un seul départ','Heure unique, non négociable — vol au lever du soleil, par exemple.')}
    </div>
    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--line2)'}}>
      {mode==='window'&&<div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
        {fld('OUVERTURE','09:00','1fr')}{fld('FERMETURE','18:00','1fr')}{fld('PAS','30 min','82px')}</div>}
      {mode==='slots'&&<div>
        <div className="lbl" style={{marginBottom:8,fontSize:9}}>Créneaux</div>
        {[['15:00','Quad, puis chameau'],['16:30','Chameau, puis dîner']].map(([h,l])=>(
          <div key={h} style={{display:'grid',gridTemplateColumns:'82px 1fr 30px',gap:8,alignItems:'center',marginBottom:8}}>
            <div style={{border:'1px solid var(--line)',borderRadius:8,padding:'7px 10px',fontFamily:'var(--mono)',fontSize:13}}>{h}</div>
            <div style={{border:'1px solid var(--line)',borderRadius:8,padding:'7px 10px',fontSize:12.5,color:'var(--ink2)'}}>{l}</div>
            <span style={{color:'var(--ink4)',display:'grid',placeItems:'center'}}><Ic n="x" s={14}/></span></div>))}
        <button style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:999,fontSize:12.5,
          fontWeight:600,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--ink)'}}>+ Ajouter un créneau</button></div>}
      {mode==='fixed'&&<div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
        {fld('DÉPART','05:30','110px')}{fld('MENTION AFFICHÉE','Lever du soleil','1fr')}</div>}
    </div>
    {/* jours de la semaine */}
    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--line2)'}}>
      <div className="lbl" style={{marginBottom:9,fontSize:9}}>Jours d’activité</div>
      <div style={{display:'flex',gap:6}}>
        {D.map(([v,l])=>{const on=days.includes(+v);
          return (<button key={v} onClick={()=>setDays(d=>on?d.filter(x=>x!==+v):[...d,+v])}
            style={{width:36,height:36,borderRadius:9,fontSize:13,fontWeight:700,transition:'all .13s ease',
              border:'1px solid '+(on?'var(--gold)':'var(--line)'),
              background:on?'var(--gold)':'var(--surface)',color:on?'#2C2005':'var(--ink3)'}}>{l}</button>);})}
      </div>
      <div style={{fontSize:11.5,color:'var(--ink2)',marginTop:9,lineHeight:1.45}}>
        {days.length===7?'Tous les jours.':days.length===0?'Aucun jour sélectionné — l’activité ne sera jamais proposée.'
          :`${days.length} jours sur 7. Les jours non cochés ne sont jamais proposés au client.`}</div>
    </div>
    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--line2)',display:'flex',gap:10}}>
      {fld('RÉSERVER AU MOINS','24 h avant','1fr')}{fld('VISIBLE JUSQU’À','30 jours','1fr')}</div>
  </div>);
}

Object.assign(window,{S_WhenSlots,S_WhenWindow,S_WhenFixed,S_WhenWeekdays,S_WhenNone,S_ConfirmWhen,AvailEditor});
