/**
 * Formatters for WhatsApp guest memory — aligned with srv-fullchatbot conversationalContextBuilder.
 */

export type GuestWhatsappFlowEntry = {
  flowKind: string;
  sentAt: string;
  completed?: boolean;
  completedAt?: string | null;
  abandoned?: boolean;
};

export type GuestWhatsappRequestEntry = {
  kind: string;
  requestedAt: string;
  relativeDate?: string | null;
  exactDate?: string | null;
  exactTime?: string | null;
  summary?: string;
  resolved?: boolean;
  taskCode?: string;
};

export type GuestWhatsappIntentEntry = {
  type?: string;
  detectedAt: string;
  userMessagePreview?: string;
};

export type GuestContextWhatsappLike = {
  registrationSentFlow?: boolean;
  flowsSent?: GuestWhatsappFlowEntry[];
  requests?: GuestWhatsappRequestEntry[];
  lastUserNeed?: string | null;
  lastUnresolvedRequest?: string | null;
  lastSuccessfulAction?: string | null;
  lastFailedAction?: string | null;
  recentIntents?: GuestWhatsappIntentEntry[];
  updatedAt?: string;
};

export type ConversationExchangeLike = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ConversationPreviewLike = {
  totalMessages: number;
  exchangePairCount: number;
  recentExchanges: ConversationExchangeLike[];
};

export type FlowOutcome = 'completed' | 'abandoned' | 'pending' | 'likely_ignored';

const FLOW_LABELS: Record<string, string> = {
  registration: 'Enregistrement voyageurs',
  registration_pilote: 'Enregistrement voyageurs',
  support: 'Support',
  cleaning: 'Ménage',
  service_client: 'Service client',
  language: 'Langue',
  transport: 'Transport',
  grocery: 'Courses',
  concierge_custom: 'Conciergerie',
  D1: "Heure d'arrivée",
  D2: 'Déclaration arrivée',
  D3: 'Heure de départ',
  D4: 'Déclaration départ',
};

const REQUEST_LABELS: Record<string, string> = {
  cleaning: 'Ménage',
  groceries: 'Courses',
  towels: 'Serviettes',
  maintenance: 'Maintenance',
  support: 'Support',
  check_in: 'Arrivée',
  check_out: 'Départ',
  registration: 'Enregistrement',
  transport: 'Transport',
  concierge_custom: 'Conciergerie',
  service_client: 'Service client',
  wifi: 'Wi-Fi',
  access: 'Accès',
  rules: 'Règlement',
  language: 'Langue',
  other: 'Autre',
};

export function flowDisplayLabel(kind: string): string {
  const key = kind.trim();
  return FLOW_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function requestDisplayLabel(kind: string): string {
  return REQUEST_LABELS[kind] ?? kind.replace(/_/g, ' ');
}

/** Relative time in French (dashboard default). */
export function formatRelativeTimeFr(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 2) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;

  const startOf = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86_400_000);

  if (dayDiff === 0) return "aujourd'hui";
  if (dayDiff === 1) return 'hier';
  if (dayDiff < 7) return `il y a ${dayDiff} j`;

  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function deriveFlowOutcome(entry: GuestWhatsappFlowEntry, now = new Date()): FlowOutcome {
  if (entry.completed) return 'completed';
  if (entry.abandoned) return 'abandoned';
  const ageH = (now.getTime() - new Date(entry.sentAt).getTime()) / 3_600_000;
  if (ageH > 24) return 'likely_ignored';
  return 'pending';
}

export type FlowStatusUi = {
  outcome: FlowOutcome;
  label: string;
  hint?: string;
};

export function flowStatusUi(entry: GuestWhatsappFlowEntry, now = new Date()): FlowStatusUi {
  const outcome = deriveFlowOutcome(entry, now);
  if (outcome === 'completed') {
    const when = entry.completedAt ? formatRelativeTimeFr(entry.completedAt, now) : undefined;
    return {
      outcome,
      label: 'Complété',
      hint: when ? `répondu ${when}` : 'le voyageur a terminé le formulaire',
    };
  }
  if (outcome === 'abandoned') {
    return { outcome, label: 'Abandonné', hint: 'envoyé mais non complété (ignoré)' };
  }
  if (outcome === 'likely_ignored') {
    return {
      outcome,
      label: 'Probablement ignoré',
      hint: 'envoyé il y a plus de 24 h sans réponse',
    };
  }
  return { outcome, label: 'En attente', hint: 'formulaire envoyé, réponse voyageur attendue' };
}
