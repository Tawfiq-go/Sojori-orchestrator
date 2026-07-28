/* ===== Document : parcours + conformité Cloud API + spec Flow JSON ===== */

const FLOW_JSON=`{
  "version": "3.1",
  "data_api_version": "3.0",
  "routing_model": {
    "CATALOGUE":      ["DETAIL"],
    "DETAIL":         ["FORMULE", "CATALOGUE"],
    "FORMULE":        ["QUAND_PLAGE", "QUAND_CRENEAUX", "QUAND_FIXE", "COMPLET"],
    "QUAND_PLAGE":    ["CONFIRMATION", "INDISPO"],
    "QUAND_CRENEAUX": ["CONFIRMATION", "INDISPO"],
    "QUAND_FIXE":     ["CONFIRMATION", "INDISPO"],
    "COMPLET":        ["CATALOGUE"],
    "INDISPO":        ["CATALOGUE"],
    "CONFIRMATION":   []
  },
  "screens": [
    {
      "id": "CATALOGUE",
      "title": "Expériences",
      "data": {
        "heading": { "type": "string", "__example__": "Expériences à Marrakech" },
        "cats":  { "type": "array",  "__example__": [{"id":"all","title":"Toutes les catégories"}] },
        "items": { "type": "array",  "__example__": [
          { "id": "s1", "title": "Quad à Agafay",
            "description": "Aventure · 3 photos", "metadata": "dès 450 MAD" }
        ]},
        "has_more":  { "type": "boolean", "__example__": true },
        "more_label":{ "type": "string",  "__example__": "Voir les 3 autres expériences" }
      },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "Form", "name": "form_catalogue", "children": [
          { "type": "TextHeading", "text": "\${data.heading}" },
          { "type": "Dropdown", "name": "cat", "label": "Catégorie",
            "data-source": "\${data.cats}", "required": false },
          { "type": "TextSubheading", "text": "Choisissez une expérience" },
          { "type": "RadioButtonsGroup", "name": "service_id",
            "data-source": "\${data.items}", "required": true },
          { "type": "EmbeddedLink", "text": "\${data.more_label}",
            "visible": "\${data.has_more}",
            "on-click-action": { "name": "data_exchange",
              "payload": { "op": "page_next", "cat": "\${form.cat}" } } },
          { "type": "Footer", "label": "Voir cette expérience",
            "on-click-action": { "name": "data_exchange",
              "payload": { "op": "open_service", "service_id": "\${form.service_id}" } } }
        ]}
      ]}
    },
    {
      "id": "DETAIL",
      "title": "\${data.short_title}",
      "data": {
        "short_title": { "type": "string", "__example__": "Quad à Agafay" },
        "name":        { "type": "string", "__example__": "Quad dans le désert d’Agafay" },
        "sub":         { "type": "string", "__example__": "Aventure · dès 450 MAD" },
        "description": { "type": "string", "__example__": "Sortie quad sur les pistes…" },
        "caption":     { "type": "string", "__example__": "Quatre formules disponibles…" },
        "service_id":  { "type": "string", "__example__": "s1" }
      },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "TextHeading",    "text": "\${data.name}" },
        { "type": "TextSubheading", "text": "\${data.sub}" },
        { "type": "TextBody",       "text": "\${data.description}" },
        { "type": "TextCaption",    "text": "\${data.caption}" },
        { "type": "Footer", "label": "Choisir une formule",
          "on-click-action": { "name": "data_exchange",
            "payload": { "op": "open_plans", "service_id": "\${data.service_id}" } } }
      ]}
    },
    {
      "id": "FORMULE",
      "title": "\${data.short_title}",
      "data": {
        "short_title": { "type": "string", "__example__": "Quad à Agafay" },
        "service_id":  { "type": "string", "__example__": "s1" },
        "plans": { "type": "array", "__example__": [
          { "id": "p1", "title": "Quad solo · 1 h", "metadata": "450 MAD" }
        ]}
      },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "Form", "name": "form_plan", "children": [
          { "type": "TextHeading",    "text": "Choisissez votre formule" },
          { "type": "TextSubheading", "text": "Formules disponibles" },
          { "type": "RadioButtonsGroup", "name": "plan_id",
            "data-source": "\${data.plans}", "required": true },
          { "type": "TextArea", "name": "note", "label": "Une précision ?",
            "required": false, "max-length": 300 },
          { "type": "Footer", "label": "Choisir la date",
            "on-click-action": { "name": "data_exchange",
              "payload": { "op": "open_when", "service_id": "\${data.service_id}",
                           "plan_id": "\${form.plan_id}", "note": "\${form.note}" } } }
        ]}
      ]}
    },
    {
      "id": "QUAND_PLAGE",
      "title": "\${data.short_title}",
      "data": {
        "short_title": { "type": "string", "__example__": "Quad à Agafay" },
        "service_id":  { "type": "string", "__example__": "s1" },
        "plan_id":     { "type": "string", "__example__": "p1" },
        "heading":     { "type": "string", "__example__": "Quand souhaitez-vous partir ?" },
        "dates": { "type": "array", "__example__": [
          { "id": "2026-07-30", "title": "Jeudi 30 juillet" }
        ]},
        "times": { "type": "array", "__example__": [
          { "id": "10:00", "title": "10:00" }
        ]},
        "rule_caption": { "type": "string", "__example__": "Ouvert tous les jours, de 9 h à 18 h." }
      },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "Form", "name": "form_when", "children": [
          { "type": "TextHeading", "text": "\${data.heading}" },
          { "type": "Dropdown", "name": "date", "label": "Date",
            "data-source": "\${data.dates}", "required": true },
          { "type": "Dropdown", "name": "time", "label": "Heure de départ",
            "data-source": "\${data.times}", "required": true },
          { "type": "TextCaption", "text": "\${data.rule_caption}" },
          { "type": "Footer", "label": "Envoyer ma demande",
            "caption": "Tarif indicatif · confirmation sous 2 h",
            "on-click-action": { "name": "data_exchange",
              "payload": { "op": "submit", "service_id": "\${data.service_id}",
                           "plan_id": "\${data.plan_id}", "date": "\${form.date}",
                           "time": "\${form.time}" } } }
        ]}
      ]}
    },
    {
      "id": "QUAND_CRENEAUX",
      "title": "\${data.short_title}",
      "data": {
        "short_title": { "type": "string", "__example__": "Soirée camp Agafay" },
        "service_id":  { "type": "string", "__example__": "s4" },
        "plan_id":     { "type": "string", "__example__": "p1" },
        "heading":     { "type": "string", "__example__": "Quand souhaitez-vous venir ?" },
        "slot_label":  { "type": "string", "__example__": "Heure d’arrivée au camp" },
        "dates": { "type": "array", "__example__": [
          { "id": "2026-08-01", "title": "Samedi 1 août" }
        ]},
        "slots": { "type": "array", "__example__": [
          { "id": "15:00", "title": "15:00", "description": "Quad, puis chameau au coucher du soleil" },
          { "id": "16:30", "title": "16:30", "description": "Chameau au coucher du soleil, puis dîner" }
        ]},
        "rule_caption": { "type": "string", "__example__": "Départs à heures fixes, tous les jours." }
      },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "Form", "name": "form_when", "children": [
          { "type": "TextHeading", "text": "\${data.heading}" },
          { "type": "Dropdown", "name": "date", "label": "Date",
            "data-source": "\${data.dates}", "required": true },
          { "type": "RadioButtonsGroup", "name": "slot", "label": "\${data.slot_label}",
            "data-source": "\${data.slots}", "required": true },
          { "type": "TextCaption", "text": "\${data.rule_caption}" },
          { "type": "Footer", "label": "Envoyer ma demande",
            "caption": "Tarif indicatif · confirmation sous 2 h",
            "on-click-action": { "name": "data_exchange",
              "payload": { "op": "submit", "service_id": "\${data.service_id}",
                           "plan_id": "\${data.plan_id}", "date": "\${form.date}",
                           "time": "\${form.slot}" } } }
        ]}
      ]}
    },
    {
      "id": "QUAND_FIXE",
      "title": "\${data.short_title}",
      "data": {
        "short_title": { "type": "string", "__example__": "Montgolfière" },
        "service_id":  { "type": "string", "__example__": "s5" },
        "plan_id":     { "type": "string", "__example__": "p1" },
        "fixed_time":  { "type": "string", "__example__": "05:30" },
        "fixed_label": { "type": "string", "__example__": "Départ à 05:30" },
        "dates": { "type": "array", "__example__": [
          { "id": "2026-07-31", "title": "Vendredi 31 juillet" }
        ]},
        "rule_caption": { "type": "string", "__example__": "Un seul départ par jour, au lever du soleil." }
      },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "Form", "name": "form_when", "children": [
          { "type": "TextHeading", "text": "Choisissez votre date" },
          { "type": "Dropdown", "name": "date", "label": "Date",
            "data-source": "\${data.dates}", "required": true },
          { "type": "TextSubheading", "text": "\${data.fixed_label}" },
          { "type": "TextCaption", "text": "\${data.rule_caption}" },
          { "type": "Footer", "label": "Envoyer ma demande",
            "caption": "Tarif indicatif · confirmation sous 2 h",
            "on-click-action": { "name": "data_exchange",
              "payload": { "op": "submit", "service_id": "\${data.service_id}",
                           "plan_id": "\${data.plan_id}", "date": "\${form.date}",
                           "time": "\${data.fixed_time}" } } }
        ]}
      ]}
    },
    {
      "id": "COMPLET",
      "title": "\${data.short_title}",
      "data": {
        "short_title": { "type": "string", "__example__": "Vallée de l’Ourika" },
        "horizon":     { "type": "string", "__example__": "30 prochains jours" }
      },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "TextHeading", "text": "Complet pour le moment" },
        { "type": "TextBody",    "text": "Plus aucune place sur les \${data.horizon} pour cette expérience." },
        { "type": "TextCaption", "text": "Écrivez au concierge : il vous prévient dès qu’une place se libère, ou vous propose une alternative équivalente." },
        { "type": "Footer", "label": "Revoir le catalogue",
          "on-click-action": { "name": "data_exchange", "payload": { "op": "back_to_list" } } }
      ]}
    },
    {
      "id": "INDISPO",
      "title": "Expériences",
      "data": { "msg": { "type": "string", "__example__": "Elle vient d’être retirée…" } },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "TextHeading", "text": "Cette expérience n’est plus disponible" },
        { "type": "TextBody",    "text": "\${data.msg}" },
        { "type": "Footer", "label": "Revoir le catalogue",
          "on-click-action": { "name": "data_exchange", "payload": { "op": "back_to_list" } } }
      ]}
    },
    {
      "id": "CONFIRMATION",
      "title": "Demande envoyée",
      "terminal": true,
      "success": true,
      "data": {
        "line_service": { "type": "string", "__example__": "Quad dans le désert d’Agafay" },
        "line_plan":    { "type": "string", "__example__": "Quad solo · 1 h — 450 MAD" },
        "line_when":    { "type": "string", "__example__": "Jeudi 30 juillet · 10:00" },
        "delay":        { "type": "string", "__example__": "sous 2 h" }
      },
      "layout": { "type": "SingleColumnLayout", "children": [
        { "type": "TextHeading", "text": "Votre demande est partie" },
        { "type": "TextBody",    "text": "\${data.line_service}" },
        { "type": "TextBody",    "text": "\${data.line_plan}" },
        { "type": "TextBody",    "text": "\${data.line_when}" },
        { "type": "TextCaption", "text": "Nous vérifions la disponibilité à cette heure et vous confirmons \${data.delay}, dans cette conversation. Le créneau n’est pas encore réservé." },
        { "type": "Footer", "label": "Terminer",
          "on-click-action": { "name": "complete", "payload": {} } }
      ]}
    }
  ]
}`;

const HANDOFF=`<span class="c">// Orchestrator — à ajouter au modèle de service</span>
availability: {
  mode: 'window' | 'slots' | 'fixed',   <span class="c">// route l'écran QUAND</span>

  weekdays: number[] | 'all',           <span class="c">// 1 = lundi … 7 = dimanche</span>

  window?: {                            <span class="c">// mode 'window'</span>
    start: '09:00',
    end:   '18:00',
    stepMin: 30
  },

  slots?: [                             <span class="c">// mode 'slots'</span>
    { start: '15:00', label: 'Quad, puis chameau' },
    { start: '16:30', label: 'Chameau, puis dîner' }
  ],

  fixed?: {                             <span class="c">// mode 'fixed'</span>
    start: '05:30',
    label: 'Lever du soleil'
  },

  leadTimeHours: 24,                    <span class="c">// délai minimum avant début</span>
  horizonDays:   30,                    <span class="c">// dates proposées au-delà d'aujourd'hui</span>
  blackoutDates: ['2026-08-14'],        <span class="c">// fermé ponctuellement</span>
  timezone:      'Africa/Casablanca',   <span class="c">// fuseau du LOGEMENT</span>
  ruleCaption: {                        <span class="c">// affiché en TextCaption</span>
    fr: 'Ouvert tous les jours, de 9 h à 18 h.',
    en: '…', ar: '…'
  }
}

<span class="c">// durée par formule — sert à retirer les heures trop tardives</span>
formules[]: { label, priceMad, durationMin? }

<span class="c">// endpoint data_exchange — nouvelle opération</span>
op: 'open_when'
  in  → { service_id, plan_id, note }
  out → {
    screen: 'QUAND_PLAGE' | 'QUAND_CRENEAUX'
          | 'QUAND_FIXE'  | 'COMPLET',
    data: { dates[], times[] | slots[] | fixed_label,
            heading, rule_caption, … }
  }

<span class="c">// calcul des dates éligibles, dans l'ordre</span>
1. horizon      → J+0 … J+horizonDays
2. weekdays     → retirer les jours non ouvrés
3. blackout     → retirer les dates bloquées
4. leadTime     → retirer ce qui est trop proche
5. si vide      → écran COMPLET

<span class="c">// calcul des heures (mode window)</span>
1. start → end par pas de stepMin
2. retirer h + durationMin > end
3. si date = aujourd'hui → retirer h < maintenant + leadTime`;

function Code({children}){
  return <pre className="scr" dangerouslySetInnerHTML={{__html:children}}/>;
}

function App(){
  /* --- règles dures, celles qui ont déjà coûté des reprises --- */
  const hard=[
    ['Footer','<b>Un seul par écran</b>, toujours ancré en bas','Aucun écran de ce parcours n’a deux boutons. L’action secondaire est un <code>EmbeddedLink</code> placé au-dessus du Footer, jamais à côté.'],
    ['Style du Flow','<b>Non modifiable</b>','Meta rend les écrans avec sa charte. Pas d’or Sojori, pas d’Instrument Serif, pas de mise en page libre <b>à l’intérieur du Flow</b>. La marque ne vit que dans les messages autour.'],
    ['Images dans le Flow','<b>Exclues de ce design</b>','Le composant <code>Image</code> attend du base64 embarqué dans le Flow JSON — incompatible avec un catalogue dynamique. Les photos partent donc en messages image <b>avant</b> l’ouverture du Flow.'],
    ['Album photo','<b>N’existe pas</b> en Cloud API','Trois photos = <b>trois messages</b>, donc trois appels API et trois bulles. Seule la dernière porte la légende, sinon le client lit trois fois le même texte.'],
    ['Fenêtre de service','<b>24 h</b> après le dernier message du client','Hors fenêtre, impossible d’envoyer teasers + Flow spontanément : il faut un <b>template approuvé</b>. Le parcours ci-dessous suppose une conversation déjà ouverte par le client.'],
    ['Contenu dynamique','<b>Impossible dans un template</b>','Un template n’accepte que des variables numérotées, pas une liste d’expériences. Le catalogue vit donc dans le Flow via <code>data_exchange</code>, jamais dans le message d’entrée.'],
    ['Un seul Flow','<b>Générique, piloté par la donnée</b>','<b>9 écrans déclarés, 5 traversés</b> par le client — les trois variantes QUAND sont mutuellement exclusives, comme les deux écrans d’erreur. Aucun identifiant d’activité en dur&nbsp;: ajouter une expérience en base ne demande <b>aucune republication</b>.'],
    ['Écran terminal','<b>Obligatoire</b>','<code>CONFIRMATION</code> porte <code>terminal: true</code> et son Footer appelle <code>complete</code>. Sans ça, la session ne se ferme pas proprement.'],
  ];
  /* --- enveloppe de sécurité : on reste volontairement sous les plafonds --- */
  const safe=[
    ['Composants par écran','≤ 6','Le plafond réel dépend de la version de Flow JSON. À 6, le parcours passe sur toutes les versions courantes sans arbitrage.'],
    ['Options par liste radio','≤ 5 + pagination','Le plafond est bien plus haut, mais un catalogue qui grandit finirait par le heurter. La pagination <code>Voir les N autres</code> rend la limite <b>indolore</b>.'],
    ['Titre d’option','≤ 24 caractères','« Quad à Agafay » = 14. WhatsApp tronque visuellement bien avant le plafond technique — c’est la lisibilité qui commande, pas l’API.'],
    ['Description d’option','≤ 40 caractères','« Aventure · 3 photos » = 20. Une seule ligne, jamais de retour à la ligne.'],
    ['Métadonnée d’option','≤ 16 caractères','« dès 450 MAD » = 12. C’est le prix : il ne doit jamais être coupé.'],
    ['Libellé de Footer','≤ 22 caractères','« Envoyer ma demande » = 19. Un libellé long se tronque au centre et devient illisible.'],
    ['Titre d’écran','≤ 20 caractères','Affiché dans la barre du Flow, à côté de la croix. « Quad à Agafay » tient ; le nom long va dans le <code>TextHeading</code>.'],
    ['Légende d’image','≤ 600 caractères','Le plafond Cloud API est à 1 024. On reste largement en dessous : au-delà de ~4 lignes, WhatsApp replie le texte derrière « Lire la suite ».'],
    ['Photos','1200 × 628, JPEG, &lt; 1,5 Mo','Le plafond média est à 5 Mo. À 1,5 Mo, l’envoi reste rapide en 4G marocaine.'],
    ['Champ libre','≤ 300 caractères','<code>TextArea</code> avec <code>max-length</code> explicite : sans lui, un client colle un paragraphe et le webhook le reçoit entier.'],
  ];
  /* --- à vérifier chez vous, je ne l'invente pas --- */
  const verify=[
    ['Version de Flow JSON','La liste des composants et les plafonds exacts varient d’une version à l’autre.','Fixez <code>version</code> dans le Flow Builder, puis relisez la référence de <b>cette</b> version avant d’ajouter un composant hors du sous-ensemble utilisé ici.'],
    ['Plafond de composants par écran','Il a évolué selon les versions.','Le Flow Builder refuse la publication si vous dépassez. Nos 6 composants max donnent une marge sur toutes les versions courantes.'],
    ['Longueurs exactes','Titres, descriptions, libellés de Footer.','L’enveloppe ci-dessus est volontairement plus stricte que l’API. Si le Builder accepte plus, tant mieux — ne descendez pas en dessous pour autant, à cause du darija à venir.'],
    ['Endpoint <code>data_exchange</code>','Chiffrement, signature et temps de réponse.','Clé publique RSA déclarée, réponses chiffrées AES, vérification de <code>X-Hub-Signature-256</code>, et un health check qui passe. Sans ça le Flow reste en brouillon.'],
    ['Délai de réponse','Chaque <code>data_exchange</code> est un aller-retour serveur.','Visez moins d’une seconde. Le catalogue doit venir d’un cache ou d’un snapshot, jamais d’un appel partenaire en direct.'],
    ['Expiration de session','Une session de Flow ne vit pas indéfiniment.','Un parcours de <b>5 écrans</b> se traverse en moins d’une minute. Rechargez la donnée à chaque <code>data_exchange</code> plutôt que de faire confiance à l’état client.'],
  ];
  const micro=[
    ['Voir les expériences','Bouton du message d’entrée','Ouvre le Flow. Nomme le contenu, pas le mécanisme — jamais « Ouvrir le formulaire ».'],
    ['Voir cette expérience','Footer du catalogue','Neutre : consulter n’engage à rien.'],
    ['Voir les 3 autres expériences','Lien de pagination','Le nombre est dans le libellé : il annonce ce qui reste.'],
    ['Choisir une formule','Footer du détail','Annonce l’étape suivante, sans promettre de réserver.'],
    ['Choisir la date','Footer de l’écran des formules','Mène à l’écran QUAND. Aucune mention de tarif ici&nbsp;: rien n’est encore envoyé.'],
    ['Date','Libellé de Dropdown, écrans QUAND','Un seul mot. La liste ne contient que des dates réellement possibles.'],
    ['Heure de départ','Dropdown, mode plage libre','« Départ » et non « début »&nbsp;: c’est l’heure de prise en charge.'],
    ['Heure d’arrivée au camp','Libellé du groupe radio, mode créneaux','Nomme le lieu, pas l’activité — le client sait à quoi correspond l’heure.'],
    ['Départ à 05:30','TextSubheading, mode heure imposée','Affirmatif, pas interrogatif&nbsp;: il n’y a rien à choisir.'],
    ['Envoyer ma demande','Footer des trois écrans QUAND','« Demande », pas « Réserver »&nbsp;: rien n’est confirmé tant que la dispo n’est pas vérifiée.'],
    ['Tarif indicatif · confirmation sous 2 h','Légende de Footer, écrans QUAND','Sous le bouton qui envoie réellement — pas un écran plus tôt.'],
    ['Complet pour le moment','Titre, aucune disponibilité','« Pour le moment » laisse la porte ouverte. Ni « indisponible » ni « épuisé ».'],
    ['Votre demande est partie','Titre de confirmation','Factuel. Ni « Merci ! » ni « Félicitations ».'],
    ['Écrire au concierge','Bouton des états vides','Toujours une issue humaine. Jamais un cul-de-sac.'],
    ['Votre hôte prépare encore sa sélection','Vide, mode « Ma conciergerie »','Ne mentionne aucun partenaire : on n’injecte pas NOMMOS en silence.'],
    ['Nous n’avons pas encore d’expériences à Essaouira','Vide, aucun partenaire en ville','Nomme la ville pour que le client comprenne que ce n’est pas une panne.'],
  ];
  return (<div className="wrap">
    {/* en-tête */}
    <div style={{maxWidth:740}}>
      <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:16}}>
        <Mark s={26}/><span style={{fontWeight:700,fontSize:15,letterSpacing:'-.03em'}}>Sojori</span>
        <span className="mono" style={{fontSize:10,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--ink3)',
          background:'var(--sunk)',padding:'3px 8px',borderRadius:5}}>WhatsApp Cloud API</span>
      </div>
      <h1 className="d" style={{fontSize:36,marginBottom:14}}>Conciergerie · expériences partenaires</h1>
      <p style={{fontSize:14.5,color:'var(--ink2)',lineHeight:1.6}}>
        Parcours client complet quand un logement est en mode <b style={{color:'var(--ink)'}}>Partenaires Sojori</b>.
        Un seul Flow générique, piloté par la base — ajouter une expérience ne demande aucune republication.
        Chaque écran affiche <b style={{color:'var(--ink)'}}>l’inventaire de ses composants</b> pour être vérifiable ligne à ligne avant le développement.</p>
      <div style={{display:'flex',gap:8,marginTop:20,flexWrap:'wrap'}}>
        <span className="note">6 composants max par écran</span>
        <span className="note">1 Footer par écran</span>
        <span className="note">Aucune image dans le Flow</span>
        <span className="note">Catalogue dynamique</span>
      </div>
    </div>

    <div className="ban r" style={{marginTop:26,maxWidth:900}}>
      <b>Le piège qui coûte le plus de reprises&nbsp;:</b> on ne contrôle <b>pas</b> l’apparence des écrans Flow.
      Meta les rend avec sa propre charte — vert WhatsApp, typo système, un bouton en bas.
      L’or Sojori, Instrument Serif et toute mise en page sur mesure ne peuvent vivre que dans les
      <b> messages autour</b> du Flow (texte, images, boutons de liste). Concevoir un écran Flow « à la marque » est perdu d’avance.
    </div>
    <div className="ban k" style={{marginTop:12,maxWidth:900}}>
      <b>Deuxième piège&nbsp;:</b> le composant <code>Image</code> attend du base64 <b>dans le Flow JSON</b>.
      Avec un catalogue en base, c’est inutilisable — il faudrait republier le Flow à chaque photo.
      D’où le parti pris&nbsp;: <b>les photos partent en messages image avant l’ouverture du Flow</b>, et le Flow ne contient que du texte et des listes.
    </div>

    <Sec n="01" title="Le parcours, de bout en bout"
      desc="Deux messages hors Flow pour donner envie, puis un Flow de neuf écrans déclarés dont cinq traversés par le client."/>
    <div className="row">
      <Frame cap="1 · Entrée par le menu"
        sub="Liste interactive Cloud API, hors Flow. C’est le client qui ouvre la conversation — la fenêtre de 24 h est donc active."><S1_Menu/></Frame>
      <Frame cap="2 · Teasers photo"
        sub="Trois messages image successifs — il n’y a pas d’album en Cloud API. Seule la dernière porte la légende, puis un message texte ouvre le Flow."><S2_Teasers/></Frame>
      <Frame cap="3 · Catalogue" screen="CATALOGUE"
        audit={['<b>TextHeading</b> — « Expériences à Marrakech »','<b>Dropdown</b> — catégorie, facultatif','<b>TextSubheading</b> — consigne','<b>RadioButtonsGroup</b> — 5 items max, paginé','<b>EmbeddedLink</b> — pagination, conditionnel','<b>Footer</b> — data_exchange']}
        sub="Cadre plus haut : sur l’appareil, l’écran défile nativement. Le prix « dès X MAD » va dans la métadonnée de l’option — la seule information qui ne doit jamais être tronquée."><S3_Catalogue/></Frame>
      <Frame cap="4 · Détail" screen="DETAIL"
        audit={['<b>TextHeading</b> — nom complet','<b>TextSubheading</b> — catégorie · prix d’appel','<b>TextBody</b> — description courte','<b>TextCaption</b> — mention tarifs indicatifs','<b>Footer</b> — data_exchange']}
        sub="Le titre de la barre reste court (« Quad à Agafay ») ; le nom complet vit dans le TextHeading, qui n’est pas contraint par la barre."><S4_Detail/></Frame>
    </div>

    <div className="row" style={{marginTop:26}}>
      <Frame cap="5 · Choix de la formule" screen="FORMULE"
        audit={['<b>TextHeading</b> — consigne','<b>TextSubheading</b> — « Formules disponibles »','<b>RadioButtonsGroup</b> — une ligne par formule','<b>TextArea</b> — précision, max-length 300','<b>Footer</b> — data_exchange vers l’écran QUAND']}
        sub="Une ligne = une formule, prix en métadonnée. Le bouton mène à la date, il n’envoie rien encore — la demande part depuis l’écran QUAND, en section 02."><S5_Formule/></Frame>
      <Frame cap="6a · Aucun partenaire en ville"
        sub="Hors Flow : inutile d’ouvrir un Flow vide. Le message nomme la ville et propose une issue humaine."><S7_NoPartner/></Frame>
      <Frame cap="6b · Mode « Ma conciergerie » vide"
        sub="Message différent, volontairement : on ne substitue jamais les expériences d’un partenaire à celles de l’hôte."><S7_OwnEmpty/></Frame>
    </div>

    <div className="row" style={{marginTop:26}}>
      <Frame cap="7 · Expérience retirée" screen="INDISPO"
        audit={['<b>TextHeading</b> — titre d’erreur','<b>TextBody</b> — explication','<b>Footer</b> — retour au catalogue']}
        sub="Le catalogue est revalidé côté serveur à chaque data_exchange : un service masqué entre deux écrans mène ici, jamais à une erreur technique."><S8_Gone/></Frame>
      <div style={{flex:1,minWidth:330}}>
        <div className="cap mono" style={{fontSize:10,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',
          color:'var(--ink2)',marginBottom:9}}>Owner UI · le réglage unique</div>
        <OwnerToggle/>
      </div>
    </div>

    <Sec n="02" title="Date & heure — trois variantes selon la config partenaire"
      desc="Aucun DatePicker ni TimePicker : dépendants de version. Les dates éligibles sont calculées côté serveur et servies en Dropdown — un jour non ouvré n’est simplement jamais listé."/>
    <div className="ban k" style={{maxWidth:900,marginBottom:20}}>
      <b>Pourquoi pas de sélecteur de date natif&nbsp;?</b> <code>DatePicker</code>, <code>CalendarPicker</code> et <code>TimePicker</code> n’existent pas dans toutes les versions de Flow JSON,
      et <code>unavailable-dates</code> ne se comporte pas partout pareil. En calculant les dates côté serveur, les règles de jours ouvrés, le délai minimum,
      l’horizon et les dates bloquées deviennent <b>invisibles pour le client</b>&nbsp;: il ne voit que des dates réellement possibles. Aucune règle à encoder dans le Flow.
    </div>
    <div className="ban r" style={{maxWidth:900,marginBottom:20}}>
      <b>Trois écrans, pas un écran conditionnel.</b> Mettre les trois modes dans un seul écran avec <code>visible</code> obligerait à déclarer
      sept enfants dont quatre masqués — et <code>visible</code> dépend lui aussi de la version. Le serveur route donc vers
      <code>QUAND_PLAGE</code>, <code>QUAND_CRENEAUX</code> ou <code>QUAND_FIXE</code> selon la config&nbsp;: <b>5 composants chacun</b>, aucune condition côté client.
    </div>
    <div className="row">
      <Frame cap="A · Plage libre" screen="QUAND_PLAGE"
        audit={['<b>TextHeading</b> — consigne','<b>Dropdown</b> — date, dates éligibles seulement','<b>Dropdown</b> — heure, pas de 30 min dans la plage','<b>TextCaption</b> — la règle en clair','<b>Footer</b> — data_exchange']}
        sub="Config « ouvert de 9 h à 18 h ». Le serveur génère les heures par pas de 30 min et retire celles qui ne laissent pas le temps de finir — d’où la mention du dernier départ."><S_WhenWindow/></Frame>
      <Frame cap="B · Créneaux fixes" screen="QUAND_CRENEAUX"
        audit={['<b>TextHeading</b> — consigne','<b>Dropdown</b> — date','<b>RadioButtonsGroup</b> — un créneau par ligne','<b>TextCaption</b> — la règle en clair','<b>Footer</b> — data_exchange']}
        sub="La description de chaque créneau dit ce qui change entre les deux — pas seulement l’heure. C’est ce qui permet de choisir sans poser de question."><S_WhenSlots/></Frame>
      <Frame cap="C · Heure imposée" screen="QUAND_FIXE"
        audit={['<b>TextHeading</b> — « Choisissez votre date »','<b>Dropdown</b> — date','<b>TextSubheading</b> — heure affichée, non modifiable','<b>TextCaption</b> — prise en charge et météo','<b>Footer</b> — data_exchange']}
        sub="Montgolfière : un seul départ au lever du soleil. Pas de faux choix — l’heure est affichée, pas proposée."><S_WhenFixed/></Frame>
      <Frame cap="D · Jours restreints" screen="QUAND_CRENEAUX"
        audit={['<b>TextHeading</b> — consigne','<b>Dropdown</b> — lundis absents de la liste','<b>RadioButtonsGroup</b> — deux départs','<b>TextCaption</b> — explique l’absence','<b>Footer</b> — data_exchange']}
        sub="Même écran que B. La légende explique pourquoi certains jours manquent : sans elle, le client croit à un bug."><S_WhenWeekdays/></Frame>
    </div>
    <div className="row" style={{marginTop:26}}>
      <Frame cap="E · Aucune disponibilité" screen="COMPLET"
        audit={['<b>TextHeading</b> — « Complet pour le moment »','<b>TextBody</b> — horizon annoncé','<b>TextCaption</b> — issue humaine','<b>Footer</b> — retour catalogue']}
        sub="Atteint quand le serveur ne trouve aucune date sur l’horizon. On l’annonce avant de faire choisir, jamais après."><S_WhenNone/></Frame>
      <Frame cap="F · Confirmation avec la date" screen="CONFIRMATION · terminal"
        audit={['<b>TextHeading</b> — « Votre demande est partie »','<b>TextBody</b> — activité','<b>TextBody</b> — formule + prix fusionnés','<b>TextBody</b> — date et heure','<b>TextCaption</b> — « pas encore réservé »','<b>Footer</b> — complete']}
        sub="Formule et prix sont fusionnés sur une ligne pour rester à 6 composants malgré l’ajout de la date. La légende dit explicitement que le créneau n’est pas bloqué."><S_ConfirmWhen/></Frame>
      <div style={{flex:1,minWidth:330}}>
        <div className="mono" style={{fontSize:10,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',
          color:'var(--ink2)',marginBottom:9}}>Admin · à implémenter par l’autre agent</div>
        <AvailEditor/>
      </div>
    </div>

    <Sec n="03" title="Règles dures — non négociables"
      desc="Ce qui est imposé par la plateforme. Chacune de ces lignes a une conséquence visible dans les écrans ci-dessus."/>
    <Table head={['Sujet','Règle','Conséquence sur ce design']} widths={['16%','22%','62%']} rows={hard}/>

    <Sec n="04" title="Enveloppe de sécurité — nos plafonds, plus stricts que l’API"
      desc="Les plafonds réels sont plus hauts. On reste en dessous pour tenir toutes les versions de Flow JSON, absorber le darija à venir, et rester lisible sur un petit écran."/>
    <Table head={['Élément','Notre plafond','Pourquoi ce choix']} widths={['20%','18%','62%']} rows={safe}/>

    <Sec n="05" title="À vérifier chez vous avant de coder"
      desc="Les points dont la valeur exacte dépend de votre configuration. Je ne les invente pas : voici où les confirmer."/>
    <Table head={['Point','Ce qui varie','Où le confirmer']} widths={['20%','26%','54%']} rows={verify}/>
    <div className="ban g" style={{marginTop:14}}>
      <b>Méthode qui évite les reprises&nbsp;:</b> créez le Flow dans le Flow Builder avec le JSON de la section 06,
      lancez l’aperçu, et laissez le validateur signaler ce qui dépasse. Notre enveloppe est assez large pour qu’il n’ait rien à dire —
      et s’il refuse quelque chose, c’est un plafond de version, pas une erreur de conception.
    </div>

    <Sec n="06" title="Microcopy"
      desc="Ton concierge, jamais commercial. Chaque libellé dit ce qui va se passer, et rien de plus."/>
    <Table head={['Libellé','Emplacement','Parti pris']} widths={['24%','22%','54%']} rows={micro}/>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:16,maxWidth:900}}>
      <div style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:'var(--r-lg)',padding:'16px 18px'}}>
        <div className="lbl" style={{color:'var(--gold-deep)',marginBottom:11}}>On dit</div>
        {['Expérience','Formule','dès 450 MAD','Tarif indicatif','Envoyer ma demande','Écrire au concierge','Votre demande est partie']
          .map(t=><div key={t} style={{fontSize:12.5,padding:'5px 0',borderBottom:'1px solid var(--line2)',fontWeight:550}}>{t}</div>)}
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:'var(--r-lg)',padding:'16px 18px'}}>
        <div className="lbl" style={{marginBottom:11}}>On ne dit jamais</div>
        {['Service / Item / SKU','Variant / Option','Price from €45','Prix ferme','Réserver maintenant','Support / Ticket','Félicitations !']
          .map(t=><div key={t} style={{fontSize:12.5,padding:'5px 0',borderBottom:'1px solid var(--line2)',
            color:'var(--ink3)',textDecoration:'line-through'}}>{t}</div>)}
      </div>
    </div>

    <Sec n="07" title="Flow JSON — squelette complet"
      desc="Neuf écrans, aucun identifiant d’activité en dur. Les clés data correspondent au snapshot concierge.customServices étendu de availability."/>
    <Code>{FLOW_JSON}</Code>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:16,maxWidth:1080}}>
      <div className="ban"><b>Résolution du catalogue.</b> À l’ouverture, le serveur lit <code>concierge.conciergeSource</code>.
        En <code>partner</code>, il sélectionne les partenaires actifs avec <code>ownerId = null</code> dont <code>cityIds</code> contient
        <code>listing.cityId</code> — ou vaut <code>all</code> — puis <b>fusionne leurs services en une seule liste</b>.
        Le client ne voit jamais de quel partenaire vient une expérience, et n’a aucun choix de partenaire à faire.</div>
      <div className="ban"><b>Destinataire de la demande.</b> À la soumission, le serveur prend le <code>whatsapp</code> de l’activité
        s’il existe, sinon celui du partenaire. Pour le MVP la notification est manuelle&nbsp;: le message part dans la file de l’équipe Sojori,
        qui relaie. Le client, lui, reçoit toujours la même promesse — <b>confirmation sous 2 h dans cette conversation</b>.</div>
    </div>
    <div className="ban" style={{marginTop:12,maxWidth:1080}}>
      <b>Multilingue.</b> Les libellés d’écran viennent de la base, pas du Flow JSON — <code>name.fr</code>, <code>name.en</code>, <code>name.ar</code>
      sont résolus côté serveur selon la langue du client, <code>availability.ruleCaption</code> comprise. Seuls les textes fixes
      (« Choisissez une formule », libellés de Footer) sont dans le JSON&nbsp;: pour l’arabe, prévoyez que Meta bascule l’écran en RTL —
      ne codez jamais une position d’élément en dur. C’est aussi pourquoi nos libellés restent courts&nbsp;: la traduction allonge.
    </div>
    <div className="ban" style={{marginTop:12,maxWidth:1080}}>
      <b>Fuseau horaire.</b> Les dates et heures sont calculées dans le fuseau du <b>logement</b> (<code>Africa/Casablanca</code>),
      jamais celui de l’appareil du client. Un client qui ouvre WhatsApp depuis Paris doit voir les mêmes créneaux qu’un client sur place —
      c’est une source de bug classique, à trancher côté serveur une fois pour toutes.
    </div>

    <Sec n="08" title="Handoff — à faire côté Orchestrator"
      desc="Ce que l’autre agent doit ajouter au modèle de service et à l’UI admin pour que ce parcours fonctionne. À coller tel quel."/>
    <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:18,alignItems:'start'}}>
      <Code>{HANDOFF}</Code>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div className="ban g"><b>Une seule chose à retenir&nbsp;:</b> le Flow ne contient <b>aucune règle</b> de disponibilité.
          Il affiche une liste de dates et une liste d’heures que le serveur lui donne déjà filtrées. Toute la logique
          — jours ouvrés, délai minimum, horizon, dates bloquées, dernier départ compatible avec la durée — vit dans Orchestrator.</div>
        <div className="ban"><b>Trois modes, un seul champ.</b> <code>availability.mode</code> vaut <code>window</code>, <code>slots</code> ou <code>fixed</code>.
          C’est lui qui décide vers quel écran le serveur route. Un quatrième mode demanderait un quatrième écran — à éviter.</div>
        <div className="ban"><b>Migration du seed NOMMOS.</b> Les 8 activités existantes n’ont pas de disponibilité.
          Valeur par défaut proposée&nbsp;: <code>window 09:00–18:00</code>, tous les jours, délai 24 h, horizon 30 jours.
          Deux exceptions à saisir à la main&nbsp;: la <b>montgolfière</b> en <code>fixed 05:30</code>, et la <b>soirée camp</b> en <code>slots 15:00 / 16:30</code>.</div>
        <div className="ban r"><b>À ne pas faire&nbsp;:</b> exposer un calendrier de réservation ferme.
          <b>Ce parcours produit une <b>demande</b>, pas une réservation</b> — le créneau n’est pas bloqué, et la confirmation reste humaine.
          Tant que la notification partenaire est manuelle, promettre un créneau garanti créerait des doubles réservations.</div>
      </div>
    </div>
    <div className="ban" style={{marginTop:12,maxWidth:1080}}>
      <b>Ordre de travail suggéré.</b> D’abord le champ <code>availability</code> et sa valeur par défaut sur les 8 activités du seed —
      sans lui, l’écran QUAND n’a rien à afficher. Ensuite l’éditeur admin ci-dessus. Enfin l’endpoint <code>open_when</code>,
      qui est le seul vrai travail de logique&nbsp;: calculer les dates éligibles pour une activité et une formule données.
    </div>
  </div>);
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
