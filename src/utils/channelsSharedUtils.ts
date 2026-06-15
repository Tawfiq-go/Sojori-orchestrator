/** Helpers partagés — portés depuis ChannelsHubPage.jsx */

export function parseMrSeg(q: string | null) {
  const v = String(q || '').trim().toLowerCase();
  if (v === 'r' || v === 'resa' || v === 'res' || v === 'reservations') return 'r';
  if (v === 'c' || v === 'cal' || v === 'calendar' || v === 'calendrier') return 'c';
  if (v === 'l' || v === 'listing' || v === 'annonce' || v === 'ota-listing') return 'l';
  if (v === 'o' || v === 'oauth' || v === 'pms' || v === 'white' || v === 'token') return 'o';
  if (v === 'owner' || v === 'u' || v === 'user' || v === 'compte' || v === 'account') return 'owner';
  if (v === 'g' || v === 'http' || v === 'access' || v === 'logapi' || v === 'logapis') return 'g';
  if (v === 'lead' || v === 'leads') return 'lead';
  if (v === 'rev' || v === 'review' || v === 'reviews' || v === 'avis') return 'rev';
  if (v === 'd' || v === 'dist' || v === 'distribution' || v === 'cm') return 'd';
  return 'm';
}

export function overviewViewFromApiSeg(seg: string): 'reservations' | 'messaging' | 'leads' {
  if (seg === 'r') return 'reservations';
  if (seg === 'lead') return 'leads';
  return 'messaging';
}

export function actionToApiSeg(action: string | undefined) {
  if (!action) return 'm';
  const a = action.toLowerCase();
  if (a.includes('putavbunits') || a.includes('putprices') || a.includes('calendar') || a.includes('avb') || a.includes('price')) return 'c';
  if (a.includes('putproperty') || a.includes('putbuilding') || a.includes('listing') || a.includes('putownerlisting')) return 'l';
  if (a.includes('createuser') || a.includes('archiveuser') || a.includes('fillcompany') || a.includes('owner') || a.includes('user')) return 'owner';
  if (a.includes('reservation') || a.includes('listreservation')) return 'r';
  if (a.includes('lead')) return 'lead';
  if (a.includes('review') || a.includes('avis')) return 'rev';
  if (a.includes('oauth') || a.includes('token') || a.includes('mastertoken') || a.includes('usertoken')) return 'o';
  if (a.includes('message') || a.includes('thread') || a.includes('messaging')) return 'm';
  return 'm';
}

export function ingressKindFromHookSeg(seg: string) {
  return overviewViewFromHookSeg(seg);
}

/** Vue overview / hooks : messages, leads, réservations, avis webhooks. */
export function overviewViewFromHookSeg(seg: string): 'reservations' | 'messaging' | 'leads' | 'reviews' {
  if (seg === 'r') return 'reservations';
  if (seg === 'lead') return 'leads';
  if (seg === 'rev') return 'reviews';
  return 'messaging';
}

const RU_EVENT_LABELS: Record<string, string> = {
  NewMessage: 'Nouveau message',
  ModifiedMessage: 'Message modifié',
  ReadMessage: 'Message lu',
  NewThread: 'Nouveau fil',
  NewReservation: 'Nouvelle réservation',
  ModifiedReservation: 'Réservation modifiée',
  CancelledReservation: 'Réservation annulée',
  NewLead: 'Nouveau lead',
};

export function prettyRuEventKey(key: string | undefined) {
  if (!key) return '—';
  const k = String(key).trim();
  return RU_EVENT_LABELS[k] || k;
}

export function pctChange(cur: number, prev: number) {
  if (!prev) return cur > 0 ? '+100%' : '—';
  const d = Math.round(((cur - prev) / prev) * 100);
  return d > 0 ? `+${d}%` : d < 0 ? `${d}%` : '0%';
}

export function changeColorClass(cur: number, prev: number, invert = false) {
  if (!prev || cur === prev) return '#64748b';
  const up = cur > prev;
  const good = (up && !invert) || (!up && invert);
  return good ? '#059669' : '#dc2626';
}
