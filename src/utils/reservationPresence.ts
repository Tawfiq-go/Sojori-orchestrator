/**
 * Présence ops (liste réservations / inbox) — pas le statut OTA legacy.
 *
 * Source de vérité :
 * - calendrier arrivalDate / departureDate
 * - déclaration guest WhatsApp → actualArrivalTime / actualDepartureTime (fulltask)
 * - repli customerStatus (arrived / on_site / departed)
 */
import type { Reservation } from '../types/reservations.types';

export type PresenceTone = 'muted' | 'info' | 'warning' | 'success' | 'error';

export type PresenceMeta = {
  label: string;
  tone: PresenceTone;
  /** Déclaré via flow arrivée/départ (pas seulement le calendrier). */
  declared: boolean;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayOf(v?: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDay(d);
}

export function presenceMetaFromReservation(r: Reservation): PresenceMeta {
  const status = String(r.status || '').toLowerCase();
  if (status.includes('cancel')) {
    return { label: 'Annulé', tone: 'muted', declared: false };
  }
  if (status === 'completed') {
    return { label: 'Complété', tone: 'success', declared: Boolean(r.actualDepartureTime) };
  }

  const arr = dayOf(r.arrivalDate);
  const dep = dayOf(r.departureDate);
  const today = startOfLocalDay(new Date());
  const cs = String(r.customerStatus || '').toLowerCase();
  const arrived = Boolean(r.actualArrivalTime) || cs === 'arrived' || cs === 'on_site';
  const departed = Boolean(r.actualDepartureTime) || cs === 'departed';

  if (departed || (dep && today > dep)) {
    return { label: 'Parti', tone: 'muted', declared: Boolean(r.actualDepartureTime) };
  }
  if (arr && today < arr) {
    return { label: 'Attendu', tone: 'info', declared: false };
  }
  if (arr && today.getTime() === arr.getTime() && !arrived) {
    return { label: "Aujourd'hui", tone: 'warning', declared: false };
  }
  if (arrived && dep && today.getTime() === dep.getTime()) {
    return { label: 'Départ auj.', tone: 'warning', declared: true };
  }
  if (arrived && dep && today < dep) {
    return { label: 'Présent', tone: 'success', declared: true };
  }
  if (arrived) {
    return { label: 'Présent', tone: 'success', declared: true };
  }
  // Calendrier dit « sur place » mais pas encore déclaré (WhatsApp / customerStatus)
  if (arr && dep && today >= arr && today <= dep) {
    return { label: 'En séjour', tone: 'info', declared: false };
  }
  return { label: 'Attendu', tone: 'info', declared: false };
}

export function presenceStyles(tone: PresenceTone): { bg: string; color: string } {
  switch (tone) {
    case 'success':
      return { bg: 'rgba(10,143,94,0.10)', color: '#0A8F5E' };
    case 'warning':
      return { bg: 'rgba(196,101,6,0.12)', color: '#C46506' };
    case 'error':
      return { bg: 'rgba(200,30,30,0.10)', color: '#C81E1E' };
    case 'info':
      return { bg: 'rgba(6,115,179,0.10)', color: '#0673B3' };
    default:
      return { bg: 'rgba(20,17,10,0.05)', color: '#8A8478' };
  }
}
