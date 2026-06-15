/**
 * Ordre d’importance ops pour l’onglet Channels → Résumé.
 * Priorité métier (résa / webhooks) puis volume d’erreurs puis volume total.
 */

export type SummaryKpiCategory =
  | 'resa'
  | 'calendrier'
  | 'lead'
  | 'messagerie'
  | 'avis'
  | 'listing'
  | 'owner'
  | 'distribution'
  | 'autre';

const WEBHOOK_RANK: Record<string, number> = {
  NewReservation: 10,
  LNM_PutConfirmedReservation_RQ: 10,
  LNM_PutUnconfirmedReservation_RQ: 11,
  ModifiedReservation: 20,
  CancelledReservation: 30,
  LNM_CancelReservation_RQ: 30,
  NewLead: 40,
  LNM_PutLeadReservation_RQ: 40,
  NewMessage: 50,
  ModifiedMessage: 51,
  ReadMessage: 52,
  NewThread: 53,
};

const API_RANK: Record<string, number> = {
  Push_PutConfirmedReservationMulti_RQ: 10,
  Push_ConfirmReservation_RQ: 11,
  Push_ModifyStay_RQ: 12,
  Push_CancelReservation_RQ: 13,
  Push_RejectRequest_RQ: 14,
  Pull_GetReservationDetails_RQ: 15,
  Push_PutAvbUnits_RQ: 20,
  Push_PutPrices_RQ: 21,
  Push_PutLongStayDiscounts_RQ: 22,
  Push_PutSeasons_RQ: 23,
  Push_PutSeasonalPrices_RQ: 23,
  Pull_ListReservations_RQ: 30,
  Pull_GetLeads_RQ: 40,
  RU_REST_GET_api_messaging_threads: 50,
  RU_REST_GET_api_messaging_threads_x_messages: 51,
  RU_REST_GET_api_reviews_thread_x: 55,
  RU_REST_GET_api_reviews_thread_x_messages: 56,
  Pull_ListProperties_RQ: 70,
  Pull_ListSpecProp_RQ: 71,
  Push_PutProperty_RQ: 72,
  CM_Pull_PropertiesStatus_RQ: 73,
  Push_CreateUser_RQ: 80,
  Push_FillCompanyDetails_RQ: 81,
};

const CATEGORY_LABEL: Record<SummaryKpiCategory, string> = {
  resa: 'Résa',
  calendrier: 'Calendrier',
  lead: 'Lead',
  messagerie: 'Messagerie',
  avis: 'Avis',
  listing: 'Listing',
  owner: 'Compte owner',
  distribution: 'Distribution CM',
  autre: 'Autre',
};

/** Légende courte affichée au-dessus des tableaux Résumé. */
export const SUMMARY_IMPORTANCE_LEGEND =
  'Ordre ops : webhooks résa → push résa → calendrier (dispo/prix) → pull cron → messagerie / leads / listing. En cas d’égalité : plus d’erreurs en premier.';

function normalizeKey(key: string): string {
  return String(key || '').trim();
}

function webhookRank(key: string): number {
  const k = normalizeKey(key);
  if (WEBHOOK_RANK[k] != null) return WEBHOOK_RANK[k]!;
  const lower = k.toLowerCase();
  if (lower.includes('reservation') || (lower.startsWith('lnm_put') && lower.includes('reservation'))) return 15;
  if (lower.includes('cancel')) return 30;
  if (lower.includes('lead')) return 40;
  if (lower.includes('message') || lower.includes('thread')) return 50;
  if (lower.includes('review') || lower.includes('avis')) return 60;
  return 900;
}

function apiRank(action: string): number {
  const a = normalizeKey(action);
  if (API_RANK[a] != null) return API_RANK[a]!;
  const lower = a.toLowerCase();
  if (lower.includes('reservation') || lower.includes('modifystay') || lower.includes('confirmreservation')) return 12;
  if (lower.includes('putavb') || lower.includes('availability')) return 20;
  if (lower.includes('putprice') || lower.includes('season') || lower.includes('discount')) return 21;
  if (lower.includes('listreservation') || lower.includes('pull_getreservation')) return 30;
  if (lower.includes('lead')) return 40;
  if (lower.includes('messaging') || lower.includes('message')) return 50;
  if (lower.includes('review')) return 55;
  if (lower.includes('property') || lower.includes('listing') || lower.includes('putbuilding')) return 70;
  if (lower.includes('user') || lower.includes('owner') || lower.includes('company')) return 80;
  if (lower.startsWith('cm_') || lower.includes('distribution')) return 75;
  return 500;
}

export function summaryImportanceRank(key: string, kind: 'webhook' | 'api'): number {
  return kind === 'webhook' ? webhookRank(key) : apiRank(key);
}

export function summaryKpiCategory(key: string, kind: 'webhook' | 'api'): SummaryKpiCategory {
  const k = normalizeKey(key).toLowerCase();
  const rank = summaryImportanceRank(key, kind);

  if (kind === 'webhook') {
    if (rank <= 30 || k.includes('reservation') || k.includes('cancel')) return 'resa';
    if (rank <= 40 || k.includes('lead')) return 'lead';
    if (rank <= 53 || k.includes('message') || k.includes('thread')) return 'messagerie';
    if (k.includes('review') || k.includes('avis')) return 'avis';
    return 'autre';
  }

  if (rank <= 15) return 'resa';
  if (rank <= 25) return 'calendrier';
  if (rank <= 40 || k.includes('lead')) return 'lead';
  if (rank <= 51 || k.includes('messaging') || k.includes('message')) return 'messagerie';
  if (rank <= 56 || k.includes('review')) return 'avis';
  if (rank <= 73 || k.includes('property') || k.includes('listing')) return 'listing';
  if (k.startsWith('cm_')) return 'distribution';
  if (rank <= 81 || k.includes('user') || k.includes('owner')) return 'owner';
  return 'autre';
}

export function summaryCategoryLabel(key: string, kind: 'webhook' | 'api'): string {
  return CATEGORY_LABEL[summaryKpiCategory(key, kind)];
}

const EXTRA_EVENT_LABELS: Record<string, string> = {
  LNM_PutConfirmedReservation_RQ: 'Résa confirmée (webhook)',
  LNM_PutUnconfirmedReservation_RQ: 'Résa non confirmée (webhook)',
  LNM_CancelReservation_RQ: 'Annulation résa (webhook)',
  LNM_PutLeadReservation_RQ: 'Nouveau lead (webhook)',
  Pull_ListReservations_RQ: 'Pull réservations (cron)',
  Pull_GetLeads_RQ: 'Pull leads (cron)',
  Push_PutAvbUnits_RQ: 'Push dispo calendrier',
  Push_PutPrices_RQ: 'Push prix calendrier',
  Push_PutConfirmedReservationMulti_RQ: 'Push résa confirmée → RU',
  Push_ModifyStay_RQ: 'Modification séjour → RU',
  Push_CancelReservation_RQ: 'Annulation → RU',
};

export function summaryActionLabel(key: string): string {
  const k = normalizeKey(key);
  return EXTRA_EVENT_LABELS[k] || k;
}

type SortableRow = {
  count?: number;
  failed?: number;
  today?: number;
  todayFail?: number;
};

/** Tri stable : priorité métier → erreurs → volume. */
export function compareSummaryImportance(
  keyA: string,
  keyB: string,
  kind: 'webhook' | 'api',
  rowA: SortableRow,
  rowB: SortableRow,
  opts?: { useTodayMetrics?: boolean },
): number {
  const useToday = opts?.useTodayMetrics === true;
  const rankA = summaryImportanceRank(keyA, kind);
  const rankB = summaryImportanceRank(keyB, kind);
  if (rankA !== rankB) return rankA - rankB;

  const failA = useToday ? rowA.todayFail ?? 0 : rowA.failed ?? 0;
  const failB = useToday ? rowB.todayFail ?? 0 : rowB.failed ?? 0;
  if (failA !== failB) return failB - failA;

  const cntA = useToday ? rowA.today ?? 0 : rowA.count ?? 0;
  const cntB = useToday ? rowB.today ?? 0 : rowB.count ?? 0;
  if (cntA !== cntB) return cntB - cntA;

  return keyA.localeCompare(keyB);
}

export function sortWebhookSummaryRows<T extends SortableRow & { type: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    compareSummaryImportance(a.type, b.type, 'webhook', a, b, { useTodayMetrics: true }),
  );
}

export function sortApiSummaryRows<T extends SortableRow & { action: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => compareSummaryImportance(a.action, b.action, 'api', a, b));
}
