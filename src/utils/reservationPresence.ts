/**
 * Présence ops — règles simples (clients PM) :
 *
 * Filtre liste (ailleurs) = date arrival/departure uniquement.
 * Ici, colonne Présence :
 * - Arrivé / Parti = uniquement déclaration (actualArrivalTime / actualDepartureTime)
 * - Jour check-in sans déclaration → Attendu
 * - Jour check-out sans déclaration, ≥ 11h locale → Retard
 * - Jour check-out sans déclaration, < 11h → Départ
 * - Ni check-in ni check-out → Séjour
 * - Avant check-in → À venir
 */
import type { Reservation } from '../types/reservations.types';

export type PresenceTone = 'muted' | 'info' | 'warning' | 'success' | 'error';

export type PresenceMeta = {
  label: string;
  tone: PresenceTone;
  /** true si Arrivé/Parti vient d’une déclaration guest. */
  declared: boolean;
};

/** Heure limite départ déclarée (heure murale locale navigateur / Casablanca). */
export const DEPARTURE_LATE_HOUR = 11;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayOf(v?: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDay(d);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

export function presenceMetaFromReservation(
  r: Reservation,
  nowInput: Date = new Date(),
): PresenceMeta {
  const status = String(r.status || '').toLowerCase();
  if (status.includes('cancel')) {
    return { label: 'Annulé', tone: 'muted', declared: false };
  }

  const arr = dayOf(r.arrivalDate);
  const dep = dayOf(r.departureDate);
  const today = startOfLocalDay(nowInput);
  const now = nowInput;

  const arrivalDeclared = Boolean(r.actualArrivalTime);
  const departureDeclared = Boolean(r.actualDepartureTime);

  if (departureDeclared) {
    return { label: 'Parti', tone: 'muted', declared: true };
  }

  if (arr && today < arr) {
    return { label: 'À venir', tone: 'info', declared: false };
  }

  if (dep && today > dep) {
    return { label: 'Terminé', tone: 'muted', declared: arrivalDeclared };
  }

  const isArrivalDay = Boolean(arr && sameDay(today, arr));
  const isDepartureDay = Boolean(dep && sameDay(today, dep));

  // Jour de départ (prioritaire sur le jour d’arrivée si même jour)
  if (isDepartureDay && !departureDeclared) {
    const past11 = now.getHours() >= DEPARTURE_LATE_HOUR;
    return past11
      ? { label: 'Retard', tone: 'error', declared: false }
      : { label: 'Départ', tone: 'warning', declared: false };
  }

  if (isArrivalDay) {
    if (arrivalDeclared) {
      return { label: 'Arrivé', tone: 'success', declared: true };
    }
    return { label: 'Attendu', tone: 'warning', declared: false };
  }

  // Ni check-in ni check-out aujourd’hui
  if (arr && dep && today > arr && today < dep) {
    if (arrivalDeclared) {
      return { label: 'Séjour', tone: 'success', declared: true };
    }
    return { label: 'Séjour', tone: 'info', declared: false };
  }

  return { label: 'Séjour', tone: 'info', declared: false };
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
