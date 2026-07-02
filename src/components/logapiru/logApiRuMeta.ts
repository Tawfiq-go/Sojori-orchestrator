/**
 * LogApiRU — métadonnées design (catégories, codes RU, libellés FR des actions).
 * Port fidèle de Claude Design « Sojori LogApiRU.html » (logapiru/data.js).
 */
import type { LogApiRuCategory } from '../../services/logApiRuApi';

export const RU_CATEGORIES: Record<
  LogApiRuCategory,
  { label: string; color: string; tint: string; icon: string }
> = {
  calendar: { label: 'Calendrier', color: '#B8881A', tint: 'rgba(184,136,26,0.12)', icon: '📅' },
  reservation: { label: 'Réservations', color: '#0a8f5e', tint: 'rgba(10,143,94,0.12)', icon: '🗓' },
  listing: { label: 'Annonces', color: '#8B5CF6', tint: 'rgba(139,92,246,0.12)', icon: '🏠' },
  owner: { label: 'Owners', color: '#0673b3', tint: 'rgba(6,115,179,0.12)', icon: '👤' },
  lead: { label: 'Leads', color: '#c46506', tint: 'rgba(196,101,6,0.12)', icon: '💬' },
  messaging: { label: 'Messagerie', color: '#06B6D4', tint: 'rgba(6,182,212,0.12)', icon: '✉️' },
  distribution: { label: 'Distribution', color: '#64748b', tint: 'rgba(100,116,139,0.12)', icon: '📡' },
  dictionary: { label: 'Dictionnaires', color: '#7a756c', tint: 'rgba(122,117,108,0.12)', icon: '📖' },
  other: { label: 'Autres', color: '#a8a299', tint: 'rgba(168,162,153,0.12)', icon: '⚙️' },
};

export const CATEGORY_ORDER: LogApiRuCategory[] = [
  'calendar',
  'reservation',
  'listing',
  'owner',
  'lead',
  'messaging',
  'distribution',
  'dictionary',
  'other',
];

export const RU_CODES: Record<string, { label: string; tone: 'success' | 'warning' | 'error'; hint?: string }> = {
  '0': { label: 'Succès', tone: 'success' },
  '-5': {
    label: 'Conflit de concurrence',
    tone: 'warning',
    hint: 'Modification simultanée détectée côté RU — l’appel sera rejoué.',
  },
  '-6': {
    label: 'Limite de débit atteinte',
    tone: 'warning',
    hint: 'Trop d’appels sur la fenêtre RU (rate limit). Backoff automatique appliqué.',
  },
  ERROR: {
    label: 'Erreur RU',
    tone: 'error',
    hint: 'Rejet côté Rental United — voir le message et le XML de réponse.',
  },
};

/** Libellés FR des actions RU (displayName design). Action inconnue → action brute. */
export const ACTION_LABELS: Record<string, string> = {
  // Calendrier
  Push_PutAvbUnits_RQ: 'Mise à jour des disponibilités',
  Push_PutPrices_RQ: 'Mise à jour des prix',
  Push_PutLongStayDiscounts_RQ: 'Remises longue durée',
  Push_PutLastMinuteDiscounts_RQ: 'Remises dernière minute',
  Push_PutSeasons_RQ: 'Saisons tarifaires',
  Pull_ListPropertyAvailabilityCalendar_RQ: 'Calendrier de disponibilité',
  Pull_ListPropertyPrices_RQ: 'Grille tarifaire',
  // Réservations
  Pull_ListReservations_RQ: 'Liste des réservations',
  Pull_GetReservationDetails_RQ: 'Détail de réservation',
  Push_ConfirmReservation_RQ: 'Confirmation de réservation',
  Push_PutConfirmedReservationMulti_RQ: 'Confirmation multi-réservations',
  Push_RejectRequest_RQ: 'Rejet de demande',
  Push_ModifyStay_RQ: 'Modification de séjour',
  Push_CancelReservation_RQ: 'Annulation de réservation',
  // Annonces
  Push_PutProperty_RQ: 'Publication d’annonce',
  Push_PutBuilding_RQ: 'Mise à jour de bâtiment',
  Push_PutComposition_RQ: 'Composition du logement',
  Push_PutDescription_RQ: 'Description d’annonce',
  Push_PutImage_RQ: 'Photos d’annonce',
  Push_PutLocation_RQ: 'Localisation d’annonce',
  Push_PutPaymentMethods_RQ: 'Moyens de paiement',
  Push_PutMinStay_RQ: 'Durée min. de séjour',
  Push_PutChangeOver_RQ: 'Jours d’arrivée / départ',
  Pull_ListProperties_RQ: 'Liste des annonces',
  Pull_ListSpecProp_RQ: 'Détail d’annonce',
  Pull_GetMinStay_RQ: 'Durée min. (lecture)',
  Pull_GetPropertyExternalListing_RQ: 'Annonce externe (OTA)',
  ListingOtaSync_From_Channels: 'Sync OTA annonce',
  // Owners
  Push_FillCompanyDetails_RQ: 'Détails société',
  Push_CreateUser_RQ: 'Création de compte owner',
  Push_ArchiveUser_RQ: 'Archivage de compte',
  Pull_ListMyUsers_RQ: 'Liste des comptes',
  LNM_PutHandlerUrl_RQ: 'Configuration webhook LNM',
  subscribeJsonWebhook: 'Abonnement webhook JSON',
  // Leads / Messagerie
  Pull_GetLeads_RQ: 'Récupération des leads',
  RU_REST_GET_api_messaging_threads: 'Threads messagerie (REST)',
  RU_REST_GET_api_messaging_threads_x_messages: 'Messages d’un thread (REST)',
  // Distribution
  Pull_ListSalesChannels_RQ: 'Canaux de vente',
  CM_Pull_PropertiesStatus_RQ: 'Statut des propriétés (CM)',
  CM_Pull_PropertySalesChannels_RQ: 'Canaux par propriété (CM)',
  CM_ChangePropertySalesChannel_RQ: 'Activation canal (CM)',
  // Dictionnaires
  Pull_ListAmenities_RQ: 'Équipements',
  Pull_ListLanguages_RQ: 'Langues',
  Pull_ListLocations_RQ: 'Localisations',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export type UiStatus = 'success' | 'warning' | 'error';

/** success | warning (retry -5/-6) | error — même sémantique que le backend ru-log-stats. */
export function uiStatus(status: string, statusCode: string): UiStatus {
  if (statusCode === '-5' || statusCode === '-6') return 'warning';
  return status === 'success' ? 'success' : 'error';
}

export type UiDir = 'push' | 'pull';

export function actionDir(action: string): UiDir {
  return /^(Pull_|RU_REST_|CM_Pull)/.test(action) ? 'pull' : 'push';
}

export const RU_PERIODS: Array<{ id: string; label: string; hours: number }> = [
  { id: '1h', label: '1 h', hours: 1 },
  { id: '6h', label: '6 h', hours: 6 },
  { id: '24h', label: '24 h', hours: 24 },
  { id: '7d', label: '7 j', hours: 168 },
  { id: '30d', label: '30 j', hours: 720 },
];

export function relTime(iso: string, now: Date = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diff)) return '—';
  if (diff < 60) return `il y a ${Math.max(1, Math.round(diff))} s`;
  if (diff < 3600) return `il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.round(diff / 3600)} h`;
  return `il y a ${Math.round(diff / 86400)} j`;
}

export function absTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const fmtN = (n: number): string => Number(n || 0).toLocaleString('fr-FR');

const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escHtml = (s: string): string => String(s).replace(/[&<>"]/g, (c) => ESC_MAP[c]);

/** Coloration syntaxique XML (port design — entrée échappée avant enrichissement). */
export function highlightXml(xml: string): string {
  let s = escHtml(xml);
  s = s.replace(/(&lt;\?[\s\S]*?\?&gt;)/g, '<span class="xdecl">$1</span>');
  s = s.replace(
    /(&lt;\/?)([\w:.-]+)((?:\s+[\w:.-]+=&quot;[^&]*&quot;)*)(\s*\/?&gt;)/g,
    (_m, o: string, tag: string, attrs: string, close: string) => {
      const a = attrs.replace(
        /([\w:.-]+)(=)(&quot;[^&]*&quot;)/g,
        '<span class="xattr">$1</span>$2<span class="xval">$3</span>',
      );
      return `<span class="xtag">${o}${tag}</span>${a}<span class="xtag">${close}</span>`;
    },
  );
  return s;
}

/** Coloration syntaxique JSON (port design). */
export function highlightJson(json: string): string {
  let s = escHtml(json);
  s = s.replace(/(&quot;[\w-]+&quot;)(\s*:)/g, '<span class="jkey">$1</span>$2');
  s = s.replace(/:(\s*)(&quot;[^&]*&quot;)/g, ':$1<span class="jstr">$2</span>');
  s = s.replace(/:(\s*)(-?\d+\.?\d*)/g, ':$1<span class="jnum">$2</span>');
  s = s.replace(/:(\s*)(true|false|null)/g, ':$1<span class="jbool">$2</span>');
  return s;
}
