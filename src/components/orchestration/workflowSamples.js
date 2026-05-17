// ════════════════════════════════════════════════════════════════════
// Sample data — 3 patterns réels alignés sur les exemples métier :
//   1. Message bienvenue · 1 sub-step · COMPLETED
//   2. Registration · 1 sub-step + 3 relances · INFO/RETARD
//   3. Choisir arrivée · 4 sub-steps (choice / staff / deadline / notif) · INFO/RETARD
// À supprimer dès que les données viennent de l'API.
// ════════════════════════════════════════════════════════════════════
export const WORKFLOW_SAMPLES = [
  {
    id: 'GZCM1D4H',
    type: 'notification',
    icon: '📨',
    title: 'Message bienvenue',
    reservationNumber: '4OQHVT0P',
    createdAt: '07/05 14:52',
    globalStatus: { tone: 'success', label: 'COMPLETED' },
    strip: [{ icon: '✅', label: 'Email envoyé 07/05 17:00' }],
    subSteps: [{
      id: 'notification',
      icon: '📨',
      label: 'Notification',
      status: 'completed',
      sideBadge: { tone: 'success', label: 'ENVOYÉ' },
      primaryMetric: 'Email · 07/05 17:00',
      reminders: [
        { when: 'Jeu 07/05 14:52', firedAt: '17:00', status: 'sent', channel: 'email' },
      ],
      config: {
        Règle: '1h après réservation · 07/05 14:52',
        Condition: 'Toujours',
        Canal: 'Email · Email-OTA sojori',
        Template: 'Message bienvenue',
      },
      audit: [
        { at: '07/05 17:00', icon: '✅', label: 'Email envoyé · welcome_fr', source: 'cron', channel: 'email' },
      ],
      actions: [
        { id: 'resend', label: '⚡ Renvoyer manuellement', intent: 'ghost' },
      ],
    }],
    workflowConfig: { Déclencheur: 'Création réservation', Type: 'notification', 'Sub-steps': '1 · notification' },
    workflowAudit: [
      { at: '07/05 17:00', icon: '✅', label: 'Notification envoyée', source: 'cron' },
      { at: '07/05 14:52', icon: '⚙️', label: 'Workflow démarré', source: 'srv-task' },
    ],
  },

  {
    id: '1MMLPX6N',
    type: 'registration',
    icon: '🔐',
    title: 'Registration',
    reservationNumber: '4OQHVT0P',
    timeslotId: 'CM0MQ2LV',
    createdAt: '07/05 13:52',
    globalStatus: { tone: 'error', label: 'RETARD' },
    strip: [
      { icon: '📱', label: 'WhatsApp · fenêtre terminée' },
      { icon: '📤', label: '2 relances · 0V / 0D / 0N' },
    ],
    subSteps: [{
      id: 'registration',
      icon: '🔐',
      label: 'Registration',
      status: 'failed',
      sideBadge: { tone: 'error', label: 'RETARD' },
      primaryMetric: '0 validé · 0 brouillon · 0 non-enr.',
      reminders: [
        { when: 'Jeu 07/05 11:00', status: 'missed', channel: 'whatsapp', crossed: true },
        { when: 'Ven 08/05 11:00', firedAt: '16:00', status: 'sent', channel: 'whatsapp' },
        { when: 'Sam 09/05 11:00', firedAt: '17:00', status: 'sent', channel: 'whatsapp', lastMinute: true },
      ],
      config: {
        Début: '3 j avant enr. · 10/05 11:00',
        Fin: '1 j avant enr. · 10/05 11:00',
        Condition: 'Toujours',
        Template: 'Registration',
      },
      audit: [
        { at: '09/05 17:00', icon: '✅', label: 'Relance créneau 09/05 11:00 · MS-2YAN96PM', source: 'cron', channel: 'whatsapp' },
        { at: '08/05 16:00', icon: '✅', label: 'Relance créneau 08/05 11:00 · MS-4SB17RPP', source: 'cron', channel: 'whatsapp' },
        { at: '07/05 13:52', icon: '⚙️', label: 'Timeslot créé · SM-CM0MQ2LV', source: 'srv-task' },
      ],
      actions: [
        { id: 'force-send', label: '⚡ Envoyer hors date', intent: 'primary' },
        { id: 'view-messages', label: '📝 Voir messages', intent: 'ghost' },
      ],
    }],
    workflowConfig: { Déclencheur: 'Création réservation', Type: 'registration', 'Sub-steps': '1 · registration' },
    workflowAudit: [
      { at: '09/05 17:00', icon: '✅', label: '[Registration] relance 09/05', source: 'cron' },
      { at: '08/05 16:00', icon: '✅', label: '[Registration] relance 08/05', source: 'cron' },
      { at: '07/05 13:52', icon: '⚙️', label: 'Workflow démarré', source: 'srv-task' },
    ],
  },

  {
    id: 'YN3Y4ATB',
    type: 'arrival_choice',
    icon: '🎫',
    title: 'Choisir arrivée',
    reservationNumber: '4OQHVT0P',
    timeslotId: '0FQ2KZ0R',
    createdAt: '07/05 13:52',
    globalStatus: { tone: 'error', label: 'RETARD' },
    strip: [
      { icon: '📱', label: 'WhatsApp · fenêtre terminée' },
      { icon: '⏳', label: 'En attente choix client' },
    ],
    subSteps: [
      {
        id: 'choice', icon: '🎫', label: 'Arrivée', status: 'pending',
        sideBadge: { tone: 'error', label: 'RETARD' },
        primaryMetric: '📨 ⏳ 10/05 · 2 🔔',
        reminders: [
          { when: 'Mar 09/05 11:00', firedAt: '11:00', status: 'sent', channel: 'whatsapp' },
          { when: 'Mer 10/05 11:00', firedAt: '11:00', status: 'sent', channel: 'whatsapp' },
        ],
        config: { Canal: 'WhatsApp · OTA sojori', Template: 'arrival_slot_choice', Condition: 'Toujours' },
        audit: [
          { at: '10/05 11:00', icon: '✅', label: 'Relance · créneau 10/05', source: 'cron', channel: 'whatsapp' },
          { at: '09/05 11:00', icon: '✅', label: 'Relance · créneau 09/05', source: 'cron', channel: 'whatsapp' },
        ],
        actions: [{ id: 'force-send', label: '⚡ Envoyer hors date', intent: 'primary' }],
      },
      {
        id: 'staff', icon: '👤', label: 'Staff', status: 'completed',
        sideBadge: { tone: 'success', label: 'ASSIGNÉ' },
        primaryMetric: 'Tawfiq France · PRIORITY',
        assignments: [
          { slot: 'J1#1 08/05 08:00', status: 'assigned', staffName: 'Tawfiq F.' },
          { slot: 'J1#2 08/05 11:00', status: 'unused' },
          { slot: 'J2#1 09/05 08:00', status: 'unused' },
          { slot: 'J2#2 09/05 11:00', status: 'unused' },
        ],
        config: { Stratégie: 'PRIORITY · auto', 'Max tentatives': '3', Fenêtre: 'J1–J2 · 08–11h' },
        audit: [{ at: '08/05 08:00', icon: '✅', label: 'Tawfiq F. assigné', source: 'cron' }],
        actions: [
          { id: 'reassign-auto', label: '✨ Réassigner auto', intent: 'ai' },
          { id: 'reassign-manual', label: '👤 Manuel', intent: 'ghost' },
        ],
      },
      {
        id: 'deadline', icon: '⏰', label: 'Deadline', status: 'failed',
        sideBadge: { tone: 'error', label: 'EN RETARD' },
        primaryMetric: 'N/A · échue il y a 2j',
        config: { Échéance: '10/05 18:00', 'Action si échue': 'Notif admin + client', 'Retry auto': 'Aucun' },
        audit: [{ at: '10/05 18:00', icon: '⚠', label: 'Deadline manquée · notif envoyée', source: 'cron' }],
        actions: [{ id: 'extend', label: '⚡ Prolonger', intent: 'primary' }],
      },
      {
        id: 'notifications', icon: '🔔', label: 'Notifications', status: 'info',
        sideBadge: { tone: 'info', label: 'ACTIVE' },
        primaryMetric: 'Admin + Client',
        recipients: [
          { kind: 'admin',  label: 'Sofia C. · ops@sojori.com' },
          { kind: 'client', label: 'Jean Dupont · WhatsApp' },
        ],
        config: { 'Sur retard': 'Admin email + client WhatsApp' },
        audit: [
          { at: '10/05 18:01', icon: '✅', label: 'Notif admin · retard', source: 'cron', channel: 'email' },
          { at: '10/05 18:00', icon: '✅', label: 'Rappel client', source: 'cron', channel: 'whatsapp' },
        ],
      },
    ],
    workflowConfig: { Déclencheur: 'J-5 avant arrivée', Type: 'arrival_choice', 'Sub-steps': '4' },
    workflowAudit: [
      { at: '10/05 18:01', icon: '✅', label: '[Notif] admin · retard',     source: 'cron', channel: 'email' },
      { at: '10/05 18:00', icon: '✅', label: '[Notif] rappel client',      source: 'cron', channel: 'whatsapp' },
      { at: '10/05 18:00', icon: '⚠',  label: '[Deadline] échue · N/A',    source: 'cron' },
      { at: '10/05 11:00', icon: '✅', label: '[Arrivée] relance 10/05',    source: 'cron', channel: 'whatsapp' },
      { at: '09/05 11:00', icon: '✅', label: '[Arrivée] relance 09/05',    source: 'cron', channel: 'whatsapp' },
      { at: '08/05 08:00', icon: '✅', label: '[Staff] Tawfiq F. assigné',  source: 'cron' },
      { at: '07/05 13:52', icon: '⚙️', label: 'Workflow démarré',           source: 'srv-task' },
    ],
  },
];

// Données sample pour les cartes de réservation
export const RESERVATIONS_SAMPLE = [
  {
    id: 'res1',
    reservationNumber: '4OQHVT0P',
    listingName: 'Villa Marrakech',
    guestName: 'Sophie Martin',
    arrivalDate: '2026-05-10',
    departureDate: '2026-05-15',
    nights: 5,
    orchestrationStatus: 'active',
    eventCounts: { executed: 12, total: 18, pending: 6 },
  },
  {
    id: 'res2',
    reservationNumber: 'AB123XYZ',
    listingName: 'Riad Essaouira',
    guestName: 'Thomas Dubois',
    arrivalDate: '2026-05-12',
    departureDate: '2026-05-17',
    nights: 5,
    orchestrationStatus: 'processing',
    eventCounts: { executed: 8, total: 16, pending: 8 },
  },
  {
    id: 'res3',
    reservationNumber: 'CD789QWE',
    listingName: 'Dar Fès',
    guestName: 'Marie Laurent',
    arrivalDate: '2026-05-14',
    departureDate: '2026-05-20',
    nights: 6,
    orchestrationStatus: 'completed',
    eventCounts: { executed: 20, total: 20, pending: 0 },
  },
];
