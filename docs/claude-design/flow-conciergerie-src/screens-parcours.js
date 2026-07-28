/* ===== Écrans du parcours ===== */

/* ---- 1. Entrée menu (hors Flow — liste interactive Cloud API) ---- */
function S1_Menu(){
  return (<Chat h={PH}>
    <DayTag/>
    <Out at="14:01">bonjour</Out>
    <ListMsg at="14:01" title="Bienvenue à Marrakech"
      body={<>Comment puis-je vous aider aujourd’hui&nbsp;?</>} btn="Voir le menu"/>
    <Out at="14:02">Expériences &amp; activités</Out>
    <In at="14:02">
      Avec plaisir. Voici une sélection d’expériences autour de votre riad, à <b>Marrakech</b>.
    </In>
  </Chat>);
}

/* ---- 2. Teasers images (hors Flow) ---- */
function S2_Teasers(){
  return (<Chat h={718}>
    <ImgMsg tint={0} n={1} total={3} at="14:02"/>
    <ImgMsg tint={1} n={2} total={3} at="14:02"/>
    <ImgMsg tint={2} n={3} total={3} at="14:02"
      caption={<><b>Désert d’Agafay, montgolfière, vallées de l’Atlas.</b> Huit expériences sélectionnées, réservables depuis cette conversation. Tarifs indicatifs en MAD.</>}/>
    <In at="14:02" btn="Voir les expériences">
      Ouvrez le catalogue pour voir les formules et faire une demande.
    </In>
  </Chat>);
}

/* ---- 3. Catalogue (Flow · écran 1) ---- */
function S3_Catalogue(){
  return (<div className="phone" style={{height:712}}>
    <FHead title="Expériences"/>
    <FBody gap={12}>
      <TH>Expériences à Marrakech</TH>
      <Drop label="Catégorie" value="Toutes les catégories"/>
      <div>
        <TSH>Choisissez une expérience</TSH>
        <div style={{marginTop:5}}>
          <Radio on title="Quad à Agafay" desc="Aventure · 3 photos" meta="dès 450 MAD"/>
          <Radio title="Buggy à Agafay" desc="Aventure · 3 photos" meta="dès 1 200 MAD"/>
          <Radio title="Quad en Palmeraie" desc="Aventure · 2 photos" meta="dès 350 MAD"/>
          <Radio title="Soirée camp Agafay" desc="Soirée · 3 photos" meta="dès 600 MAD"/>
          <Radio title="Montgolfière" desc="Vue d’en haut · 2 photos" meta="dès 2 400 MAD"/>
        </div>
      </div>
    </FBody>
    <Footer label="Voir cette expérience" link="Voir les 3 autres expériences"/>
  </div>);
}

/* ---- 4. Détail activité (Flow · écran 2) ---- */
function S4_Detail(){
  return (<div className="phone" style={{height:PH}}>
    <FHead title="Quad à Agafay"/>
    <FBody gap={11}>
      <TH>Quad dans le désert d’Agafay</TH>
      <TSH>Aventure · dès 450 MAD</TSH>
      <TB>Sortie quad sur les pistes pierreuses d’Agafay, face à l’Atlas. Transport depuis votre logement inclus. Briefing et casque fournis.</TB>
      <TC>Quatre formules disponibles, de 1 h à 2 h, en solo ou à deux. Tarifs indicatifs en MAD, soumis à disponibilité.</TC>
    </FBody>
    <Footer label="Choisir une formule"/>
  </div>);
}

/* ---- 5. Choix de la formule (Flow · écran 3) ---- */
function S5_Formule(){
  return (<div className="phone" style={{height:PH+14}}>
    <FHead title="Quad à Agafay"/>
    <FBody gap={12}>
      <TH>Choisissez votre formule</TH>
      <div>
        <TSH>Formules disponibles</TSH>
        <div style={{marginTop:5}}>
          <Radio on title="Quad solo · 1 h" meta="450 MAD"/>
          <Radio title="Quad solo · 2 h" meta="600 MAD"/>
          <Radio title="Quad double · 1 h" meta="600 MAD"/>
          <Radio title="Quad double · 2 h" meta="900 MAD"/>
        </div>
      </div>
      <TArea label="Une précision ? (facultatif)" ph="Nombre de personnes, niveau, demande particulière…" rows={2}/>
    </FBody>
    <Footer label="Choisir la date"/>
  </div>);
}

/* ---- 6. Confirmation (Flow · écran terminal) ---- */
function S6_Confirm(){
  return (<div className="phone" style={{height:PH}}>
    <FHead title="Demande envoyée"/>
    <FBody gap={12}>
      <div style={{margin:'auto 0',textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:12}}>✅</div>
        <TH>Votre demande est partie</TH>
        <div style={{marginTop:10,textAlign:'left',border:'1px solid var(--wa-div)',borderRadius:8,padding:'12px 13px'}}>
          <TB style={{marginBottom:5}}><b>Quad dans le désert d’Agafay</b></TB>
          <TB style={{marginBottom:5}}>Quad solo · 1 h</TB>
          <TB><b>450 MAD</b> · tarif indicatif</TB>
        </div>
        <div style={{marginTop:11}}>
          <TC>Nous vérifions la disponibilité et vous confirmons l’horaire et le prix définitif sous 2 h, dans cette conversation.</TC></div>
      </div>
    </FBody>
    <Footer label="Terminer"/>
  </div>);
}

/* ---- 7a. Vide — aucun partenaire pour la ville ---- */
function S7_NoPartner(){
  return (<Chat h={470}>
    <DayTag/>
    <Out at="14:02">Expériences &amp; activités</Out>
    <In at="14:02" btn="Écrire au concierge">
      Nous n’avons pas encore d’expériences à réserver directement à <b>Essaouira</b>.<br/><br/>
      Dites-moi ce qui vous ferait plaisir — notre concierge vous répond et organise sur mesure.
    </In>
  </Chat>);
}

/* ---- 7b. Vide — mode own, catalogue vide ---- */
function S7_OwnEmpty(){
  return (<Chat h={470}>
    <DayTag/>
    <Out at="14:02">Expériences &amp; activités</Out>
    <In at="14:02" btn="Écrire au concierge">
      Votre hôte prépare encore sa sélection d’expériences.<br/><br/>
      En attendant, écrivez-moi&nbsp;: je transmets votre envie directement à l’équipe sur place.
    </In>
  </Chat>);
}

/* ---- 8. Erreur — service devenu indisponible ---- */
function S8_Gone(){
  return (<div className="phone" style={{height:470}}>
    <FHead title="Expériences"/>
    <FBody gap={12}>
      <div style={{margin:'auto 0',textAlign:'center'}}>
        <div style={{fontSize:34,marginBottom:12}}>⚠️</div>
        <TH>Cette expérience n’est plus disponible</TH>
        <div style={{marginTop:9}}>
          <TB>Elle vient d’être retirée du catalogue. Les autres expériences restent réservables.</TB></div>
      </div>
    </FBody>
    <Footer label="Revoir le catalogue" link="Écrire au concierge"/>
  </div>);
}

/* ---- Owner UI — le toggle unique ---- */
function OwnerToggle(){
  const [mode,setMode]=useState('partner');
  const opt=(v,l,d)=>{
    const on=mode===v;
    return (<button key={v} onClick={()=>setMode(v)} style={{display:'flex',gap:12,alignItems:'flex-start',width:'100%',
      textAlign:'left',padding:'14px 15px',borderRadius:'var(--r)',transition:'all .14s ease',
      border:'1.5px solid '+(on?'var(--gold)':'var(--line)'),background:on?'var(--gold-wash)':'var(--surface)'}}>
      <span style={{width:19,height:19,borderRadius:19,flexShrink:0,marginTop:1,display:'grid',placeItems:'center',
        border:'2px solid '+(on?'var(--gold-deep)':'var(--ink4)')}}>
        {on&&<span style={{width:9,height:9,borderRadius:9,background:'var(--gold-deep)'}}/>}</span>
      <span>
        <span style={{display:'block',fontSize:14,fontWeight:650,marginBottom:3}}>{l}</span>
        <span style={{display:'block',fontSize:12,color:'var(--ink2)',lineHeight:1.5}}>{d}</span></span>
    </button>);
  };
  return (<div style={{maxWidth:430,background:'var(--surface)',border:'1px solid var(--line)',
    borderRadius:'var(--r-lg)',padding:'20px 22px'}}>
    <div className="lbl" style={{marginBottom:6}}>Expériences & services</div>
    <h3 className="d" style={{fontSize:20,marginBottom:5}}>Qui propose les expériences&nbsp;?</h3>
    <p style={{fontSize:12.5,color:'var(--ink2)',lineHeight:1.5,marginBottom:16}}>
      Un seul réglage par logement. Vos clients voient l’un ou l’autre, jamais les deux mélangés.</p>
    <div style={{display:'flex',flexDirection:'column',gap:9}}>
      {opt('own','Ma conciergerie','Votre propre catalogue d’expériences, que vous gérez dans l’onglet Services.')}
      {opt('partner','Partenaires Sojori','Les partenaires actifs de la ville du logement. Sojori les sélectionne pour vous.')}
    </div>
    {mode==='partner'&&<div className="ban g" style={{marginTop:14,fontSize:12}}>
      <b>Marrakech</b> — 1 partenaire actif, 8 expériences. Aucun choix à faire&nbsp;: si un partenaire s’ajoute dans votre ville, ses expériences apparaissent automatiquement.
    </div>}
    {mode==='own'&&<div className="ban" style={{marginTop:14,fontSize:12}}>
      Si votre catalogue est vide, le client reçoit une invitation à écrire au concierge — <b>jamais</b> les expériences d’un partenaire à votre place.
    </div>}
    <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--line2)',fontSize:11.5,color:'var(--ink3)',lineHeight:1.5}}>
      Transport et courses restent sur votre catalogue propre, quel que soit ce réglage.</div>
  </div>);
}

Object.assign(window,{S1_Menu,S2_Teasers,S3_Catalogue,S4_Detail,S5_Formule,
  S7_NoPartner,S7_OwnEmpty,S8_Gone,OwnerToggle});
