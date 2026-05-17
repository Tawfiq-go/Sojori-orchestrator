// ════════════════════════════════════════════════════════════════════
// Sample data pour WorkflowTimeline · 3 patterns réels
// (Message bienvenue · Registration · Choisir arrivée — sans notif)
// ════════════════════════════════════════════════════════════════════
export const WORKFLOWS_SAMPLE = [
  {
    id: 'GZCM1D4H',
    type: 'notification',
    icon: '📨',
    title: 'Message bienvenue',
    createdAt: '07/05 14:52',
    globalStatus: { tone: 'success', label: 'COMPLETED' },
    subSteps: [
      {
        id: 'notification',
        icon: '📨',
        label: 'Notification',
        status: 'completed',
        primaryMetric: 'Email · envoyé 17:00',
        reminders: [{ when: 'Jeu 07/05 14:52', firedAt: '17:00', status: 'sent', channel: 'email' }],
        config: { Règle: '1h après réservation', Canal: 'Email · OTA sojori', Template: 'welcome_fr' },
        audit:  [{ at: '07/05 17:00', icon: '✅', label: 'Email envoyé', source: 'cron' }],
        actions: [{ id: 'resend', label: '⚡ Renvoyer manuellement', intent: 'ghost' }],
      },
    ],
  },

  {
    id: '1MMLPX6N',
    type: 'registration',
    icon: '🔐',
    title: 'Registration',
    createdAt: '07/05 13:52',
    timeslotId: 'CM0MQ2LV',
    globalStatus: { tone: 'info', label: 'INFO', animate: false },
    statusChips: [
      { tone: 'info', label: 'INFO', animate: false },
      { tone: 'error', label: 'RETARD' },
    ],
    subSteps: [
      {
        id: 'registration',
        icon: '🔐',
        label: 'Registration',
        status: 'failed',
        primaryMetric: '0V / 0D / 0N · 2 relances envoyées',
        sideBadge: { tone: 'error', label: 'RETARD' },
        reminders: [
          { when: 'Jeu 07/05 11:00', status: 'missed', channel: 'whatsapp', crossed: true },
          { when: 'Ven 08/05 11:00', firedAt: '16:00', status: 'sent', channel: 'whatsapp' },
          { when: 'Sam 09/05 11:00', firedAt: '17:00', status: 'sent', channel: 'whatsapp', lastMinute: true },
        ],
        config: { Début: '3 j avant enr.', Fin: '1 j avant enr.', Template: 'Registration' },
        audit: [
          { at: '09/05 17:00', icon: '✅', label: 'Relance · MS-2YAN96PM', source: 'cron' },
          { at: '08/05 16:00', icon: '✅', label: 'Relance · MS-4SB17RPP', source: 'cron' },
          { at: '07/05 13:52', icon: '⚙️', label: 'Timeslot créé · SM-CM0MQ2LV', source: 'srv-task' },
        ],
        actions: [
          { id: 'force-send', label: '⚡ Envoyer hors date', intent: 'primary' },
          { id: 'view-messages', label: '📝 Voir messages', intent: 'ghost' },
        ],
      },
    ],
  },

  {
    id: 'YN3Y4ATB',
    type: 'arrival_choice',
    icon: '🎫',
    title: 'Choisir arrivée',
    createdAt: '07/05 13:52',
    timeslotId: '0FQ2KZ0R',
    statusChips: [
      { tone: 'info', label: 'INFO', animate: false },
      { tone: 'error', label: 'RETARD' },
    ],
    subSteps: [
      {
        id: 'choice', icon: '🎫', label: 'Arrivée', status: 'pending',
        primaryMetric: '📨 ⏳ 10/05 · 2 relances envoyées',
        sideBadge: { tone: 'error', label: 'RETARD' },
        reminders: [
          { when: 'Mar 09/05 11:00', firedAt: '11:00', status: 'sent', channel: 'whatsapp' },
          { when: 'Mer 10/05 11:00', firedAt: '11:00', status: 'sent', channel: 'whatsapp' },
        ],
        config: { Canal: 'WhatsApp · OTA sojori', Template: 'arrival_slot_choice' },
        audit: [
          { at: '10/05 11:00', icon: '✅', label: 'Relance · créneau 10/05', source: 'cron' },
          { at: '09/05 11:00', icon: '✅', label: 'Relance · créneau 09/05', source: 'cron' },
        ],
        actions: [{ id: 'force-send', label: '⚡ Envoyer hors date', intent: 'primary' }],
      },
      {
        id: 'staff', icon: '👤', label: 'Staff', status: 'completed',
        primaryMetric: 'Tawfiq France · PRIORITY · 1/4 utilisé',
        sideBadge: { tone: 'success', label: 'ASSIGNÉ' },
        assignments: [
          { slot: 'J1#1 08/05 08:00', status: 'assigned', staffName: 'Tawfiq F.' },
          { slot: 'J1#2 08/05 11:00', status: 'unused' },
          { slot: 'J2#1 09/05 08:00', status: 'unused' },
          { slot: 'J2#2 09/05 11:00', status: 'unused' },
        ],
        config: { Stratégie: 'PRIORITY · auto', 'Max tentatives': '3', Fenêtre: 'J1–J2 · 08–11h' },
        audit:  [{ at: '08/05 08:00', icon: '✅', label: 'Tawfiq F. assigné', source: 'cron' }],
        actions: [
          { id: 'reassign-auto', label: '✨ Réassigner auto', intent: 'ai' },
          { id: 'reassign-manual', label: '👤 Manuel', intent: 'ghost' },
        ],
      },
      {
        id: 'deadline', icon: '⏰', label: 'Deadline', status: 'failed',
        primaryMetric: 'N/A · échue il y a 2j',
        sideBadge: { tone: 'error', label: 'EN RETARD' },
        config: { Échéance: '10/05 18:00', 'Action si échue': 'Notif admin + client', 'Retry auto': 'Aucun' },
        audit:  [{ at: '10/05 18:00', icon: '⚠', label: 'Deadline manquée', source: 'cron' }],
        actions: [{ id: 'extend', label: '⚡ Prolonger', intent: 'primary' }],
      },
    ],
  },
];

export const DAY_SEPARATORS = [
  { beforeId: 'GZCM1D4H', label: '07 mai · J-3' },
  { afterId:  '1MMLPX6N', label: '10 mai · J0' },
];
