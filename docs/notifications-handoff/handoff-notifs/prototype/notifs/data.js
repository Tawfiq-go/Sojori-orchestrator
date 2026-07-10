// ═══════════════════════════════════════════════════════════════════
// Sojori · Centre de notifications — données mock
// Miroir du contrat API réel : /api/v1/admin/fulltask/notification/*
// ═══════════════════════════════════════════════════════════════════

// ── Facettes (alignées sidebar Owner) ──────────────────────────────
window.NOTIF_FACETS = {
  reservation:   { label: 'Réservations',  icon: '🗓', sidebar: 'Réservations', color: '#0673b3' },
  guest_journey: { label: 'Parcours guest',icon: '🧭', sidebar: 'Orchestration', color: '#0a8f5e' },
  orchestration: { label: 'Orchestration', icon: '⚙️', sidebar: 'Orchestration', color: '#B8881A' },
  message:       { label: 'Messages',      icon: '💬', sidebar: 'Inbox Guest',   color: '#8B5CF6' },
  task:          { label: 'Tâches',        icon: '✅', sidebar: 'Task',          color: '#c46506' },
  concierge:     { label: 'Conciergerie',  icon: '🛎', sidebar: 'Task',          color: '#0e7490' },
  finance:       { label: 'Finances',      icon: '💰', sidebar: 'Finances',      color: '#0a8f5e' },
  review:        { label: 'Avis',          icon: '⭐', sidebar: 'Inbox Guest',   color: '#d97706' },
  lead:          { label: 'Leads',         icon: '🎯', sidebar: 'Inbox Guest',   color: '#db2777' },
};
window.FACET_ORDER = ['reservation','guest_journey','orchestration','message','task','concierge','finance','review','lead'];

// ── Priorités → tokens ─────────────────────────────────────────────
window.NOTIF_PRIORITY = {
  critical: { label: 'Critique', color: '#c81e1e', tint: 'rgba(200,30,30,0.10)' },
  high:     { label: 'Urgent',   color: '#c46506', tint: 'rgba(196,101,6,0.10)' },
  normal:   { label: 'Normal',   color: '#0673b3', tint: 'rgba(6,115,179,0.10)' },
  low:      { label: 'Info',     color: '#7a756c', tint: 'rgba(122,117,108,0.10)' },
};

// ── Catalogue d'événements (GET /event-catalog) ────────────────────
// lockedDashboard: critical → dashboard non désactivable
window.EVENT_CATALOG = [
  { facet:'reservation', events:[
    { key:'reservation:new',       label:'Nouvelle réservation',     priority:'normal',   dashboard:true, whatsapp:true },
    { key:'reservation:modified',  label:'Modification de séjour',   priority:'normal',   dashboard:true, whatsapp:true },
    { key:'reservation:cancelled', label:'Annulation',               priority:'high',     dashboard:true, whatsapp:true },
  ]},
  { facet:'guest_journey', events:[
    { key:'guest:checkin_ready',   label:'Check-in prêt',            priority:'normal',   dashboard:true, whatsapp:false },
    { key:'guest:checkin_done',    label:'Arrivée déclarée',         priority:'normal',   dashboard:true, whatsapp:true },
    { key:'guest:precheckin_late', label:'Enregistrement en retard', priority:'high',     dashboard:true, whatsapp:true },
  ]},
  { facet:'orchestration', events:[
    { key:'orch:plan_generated',   label:'Plan d’orchestration créé',priority:'normal',   dashboard:true, whatsapp:false },
    { key:'orch:escalation',       label:'Escalade orchestration',   priority:'critical', dashboard:true, whatsapp:true, lockedDashboard:true },
    { key:'orch:deadline_missed',  label:'Deadline dépassée',        priority:'critical', dashboard:true, whatsapp:true, lockedDashboard:true },
  ]},
  { facet:'message', events:[
    { key:'message:ota_received',  label:'Message OTA reçu',         priority:'high',     dashboard:true, whatsapp:true },
    { key:'message:wa_received',   label:'WhatsApp guest reçu',      priority:'high',     dashboard:true, whatsapp:true },
  ]},
  { facet:'task', events:[
    { key:'task:assigned',         label:'Tâche assignée',           priority:'normal',   dashboard:true, whatsapp:true },
    { key:'task:refused',          label:'Tâche refusée par staff',  priority:'high',     dashboard:true, whatsapp:true },
    { key:'task:overdue',          label:'Tâche en retard',          priority:'critical', dashboard:true, whatsapp:true, lockedDashboard:true },
  ]},
  { facet:'concierge', events:[
    { key:'concierge:new_request', label:'Nouvelle demande conciergerie', priority:'normal', dashboard:true, whatsapp:true },
  ]},
  { facet:'finance', events:[
    { key:'finance:report_ready',  label:'Rapport P&L prêt',         priority:'low',      dashboard:true, whatsapp:false },
    { key:'finance:payout',        label:'Versement propriétaire',   priority:'normal',   dashboard:true, whatsapp:false },
  ]},
  { facet:'review', events:[
    { key:'review:new',            label:'Nouvel avis',              priority:'normal',   dashboard:true, whatsapp:false },
    { key:'review:low',            label:'Avis négatif (≤3★)',       priority:'high',     dashboard:true, whatsapp:true },
  ]},
  { facet:'lead', events:[
    { key:'lead:new',              label:'Nouveau lead',             priority:'low',      dashboard:true, whatsapp:false },
  ]},
];

// ── Notifications (GET /notification/?…) — les + récentes d'abord ──
// status: created | pending | handled | done | dismissed | expired
// minAgo = âge en minutes (pour temps relatif)
window.NOTIFICATIONS = [
  { _id:'n01', eventKey:'orch:escalation', facet:'orchestration', priority:'critical', status:'created', readAt:null, minAgo:2,
    title:'Escalade · ménage non assigné', body:'Aucun staff n’a accepté le ménage — check-in dans 1 h.',
    ctx:{ res:'SJ-3391', listing:'Villa Majorelle', who:'—' }, linkPath:'/orch/plans?res=SJ-3391', aggregatedCount:1 },
  { _id:'n02', eventKey:'task:refused', facet:'task', priority:'high', status:'pending', readAt:null, minAgo:6,
    title:'Tâche refusée par Youssef', body:'Ménage Riad Yasmina 11:30 — refusé, à réassigner.',
    ctx:{ res:'SJ-3384', listing:'Riad Yasmina', who:'Youssef A.' }, linkPath:'/tasks/list?status=refused', aggregatedCount:1 },
  { _id:'n03', eventKey:'message:wa_received', facet:'message', priority:'high', status:'created', readAt:null, minAgo:9,
    title:'WhatsApp · Imane B.', body:'« On atterrit à 22h finalement, le check-in est possible ? »',
    ctx:{ res:'SJ-3391', listing:'Villa Majorelle', who:'Imane B.' }, linkPath:'/comms/guests?phone=212661', aggregatedCount:1 },
  { _id:'n04', eventKey:'reservation:cancelled', facet:'reservation', priority:'high', status:'pending', readAt:null, minAgo:24,
    title:'Annulation · Appt Guéliz 2', body:'Booking.com · arrivée demain — libère 3 nuits.',
    ctx:{ res:'SJ-3360', listing:'Appt Guéliz 2', who:'Sara E.' }, linkPath:'/reservations?search=SJ-3360', aggregatedCount:1 },
  { _id:'n05', eventKey:'message:ota_received', facet:'message', priority:'high', status:'created', readAt:null, minAgo:38,
    title:'Message OTA · SJ-3372', body:'Airbnb · « Bonjour, un parking est-il disponible ? »',
    ctx:{ res:'SJ-3372', listing:'Dar Essaouira', who:'Thomas & Julie' }, linkPath:'/comms/ota?thread=3372', aggregatedCount:2 },
  { _id:'n06', eventKey:'reservation:new', facet:'reservation', priority:'normal', status:'created', readAt:null, minAgo:52,
    title:'Nouvelle réservation · SJ-3399', body:'Direct · Villa Palmeraie · 4 nuits · 2 voyageurs.',
    ctx:{ res:'SJ-3399', listing:'Villa Palmeraie', who:'Marco R.' }, linkPath:'/reservations?search=SJ-3399', aggregatedCount:1 },
  { _id:'n07', eventKey:'guest:precheckin_late', facet:'guest_journey', priority:'high', status:'pending', readAt:'2026-07-09T08:00:00Z', minAgo:70,
    title:'Enregistrement en retard', body:'Thomas & Julie — arrivée J-1, enregistrement non complété.',
    ctx:{ res:'SJ-3372', listing:'Dar Essaouira', who:'Thomas & Julie' }, linkPath:'/orch/plans?res=SJ-3372', aggregatedCount:1 },
  { _id:'n08', eventKey:'guest:checkin_done', facet:'guest_journey', priority:'normal', status:'done', readAt:'2026-07-09T07:30:00Z', minAgo:95,
    title:'Arrivée déclarée · Imane B.', body:'Check-in autonome validé à 22:14.',
    ctx:{ res:'SJ-3391', listing:'Villa Majorelle', who:'Imane B.' }, linkPath:'/orch/plans?res=SJ-3391', aggregatedCount:1 },
  { _id:'n09', eventKey:'task:assigned', facet:'task', priority:'normal', status:'handled', readAt:'2026-07-09T06:40:00Z', minAgo:130,
    title:'Ménage assigné · Fatima Z.', body:'Villa Palmeraie · 11:30 → 13:30 · accepté.',
    ctx:{ res:'SJ-3399', listing:'Villa Palmeraie', who:'Fatima Z.' }, linkPath:'/tasks/list', aggregatedCount:1 },
  { _id:'n10', eventKey:'concierge:new_request', facet:'concierge', priority:'normal', status:'created', readAt:null, minAgo:165,
    title:'Demande conciergerie · navette', body:'Transfert aéroport demandé pour SJ-3391.',
    ctx:{ res:'SJ-3391', listing:'Villa Majorelle', who:'Imane B.' }, linkPath:'/tasks/list?type=concierge', aggregatedCount:1 },
  { _id:'n11', eventKey:'review:low', facet:'review', priority:'high', status:'pending', readAt:null, minAgo:210,
    title:'Avis négatif (2★) · Dar Essaouira', body:'« Accueil parfait mais ménage moyen… » — à traiter.',
    ctx:{ res:'SJ-3320', listing:'Dar Essaouira', who:'Léa M.' }, linkPath:'/comms/reviews?id=3320', aggregatedCount:1 },
  { _id:'n12', eventKey:'finance:report_ready', facet:'finance', priority:'low', status:'created', readAt:'2026-07-09T05:00:00Z', minAgo:280,
    title:'Rapport P&L prêt · Juin', body:'Villa Majorelle · net propriétaire 18 240 MAD.',
    ctx:{ res:'—', listing:'Villa Majorelle', who:'Mehdi Alaoui' }, linkPath:'/finances/ledger', aggregatedCount:1 },
  { _id:'n13', eventKey:'lead:new', facet:'lead', priority:'low', status:'created', readAt:null, minAgo:320,
    title:'Relances leads', body:'3 nouveaux leads en attente de qualification.',
    ctx:{ res:'—', listing:'—', who:'—' }, linkPath:'/comms/leads', aggregatedCount:3 },
  { _id:'n14', eventKey:'finance:payout', facet:'finance', priority:'normal', status:'done', readAt:'2026-07-08T18:00:00Z', minAgo:1000,
    title:'Versement propriétaire envoyé', body:'Mehdi Alaoui · 18 240 MAD · virement initié.',
    ctx:{ res:'—', listing:'Villa Majorelle', who:'Mehdi Alaoui' }, linkPath:'/finances/ledger', aggregatedCount:1 },
];

// ── Incoming socket events (simulateur "nouvelle notif") ───────────
window.INCOMING_FEED = [
  { _id:'live1', eventKey:'reservation:new', facet:'reservation', priority:'normal', status:'created', readAt:null, minAgo:0,
    title:'Nouvelle réservation · SJ-3410', body:'Airbnb · Riad Yasmina · 3 nuits · 2 voyageurs.',
    ctx:{ res:'SJ-3410', listing:'Riad Yasmina', who:'Nadia K.' }, linkPath:'/reservations?search=SJ-3410', aggregatedCount:1 },
  { _id:'live2', eventKey:'message:wa_received', facet:'message', priority:'high', status:'created', readAt:null, minAgo:0,
    title:'WhatsApp · Marco R.', body:'« Merci ! Peut-on avoir un late checkout dimanche ? »',
    ctx:{ res:'SJ-3399', listing:'Villa Palmeraie', who:'Marco R.' }, linkPath:'/comms/guests?phone=212662', aggregatedCount:1 },
  { _id:'live3', eventKey:'orch:deadline_missed', facet:'orchestration', priority:'critical', status:'created', readAt:null, minAgo:0,
    title:'Deadline dépassée · codes non envoyés', body:'SJ-3372 — arrivée dans 45 min, codes d’accès non transmis.',
    ctx:{ res:'SJ-3372', listing:'Dar Essaouira', who:'Thomas & Julie' }, linkPath:'/orch/plans?res=SJ-3372', aggregatedCount:1 },
];

// pages du shell (pour montrer la cloche persistante)
window.DASH_PAGES = [
  { id:'overview',     label:'Vue d’ensemble', icon:'📊', group:'Pilotage' },
  { id:'reservations', label:'Réservations',   icon:'🗓', group:'Réservations' },
  { id:'orchestration',label:'Orchestration',  icon:'⚙️', group:'Orchestration' },
  { id:'inbox',        label:'Inbox Guest',    icon:'💬', group:'Communication' },
  { id:'tasks',        label:'Tâches',         icon:'✅', group:'Opérations' },
  { id:'finances',     label:'Finances',       icon:'💰', group:'Finances' },
  { id:'settings',     label:'Préférences notifs', icon:'🔔', group:'Système' },
];
