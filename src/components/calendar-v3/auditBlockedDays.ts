// ════════════════════════════════════════════════════════════════════
// auditBlockedDays.ts — libellés FR + formatage des plages pour l'audit
// ════════════════════════════════════════════════════════════════════
import { parseIsoLocal } from './_shared';

export type BlockedDayClassification = 'cancelled_reservation' | 'ota_stop_sell' | 'unknown';

export interface BlockedDayRange {
  from: string;
  to: string;
  classification: BlockedDayClassification;
  dayCount: number;
}

export const CLASSIFICATION_LABEL: Record<BlockedDayClassification, string> = {
  cancelled_reservation: 'Réservation annulée a laissé le calendrier bloqué',
  ota_stop_sell: 'Stop-sell manuel OTA',
  unknown: 'Inconnu — vérification manuelle requise',
};

export const CLASSIFICATION_TONE: Record<BlockedDayClassification, 'error' | 'warning' | 'text3'> = {
  cancelled_reservation: 'error',
  ota_stop_sell: 'warning',
  unknown: 'text3',
};

const MONTH_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function formatShortDate(iso: string): string {
  const d = parseIsoLocal(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Formate une plage `{ from, to }` en "12 → 18 juil. 2026 (7 j.)" (jour unique: pas de flèche). */
export function formatBlockedDayRange(range: BlockedDayRange): string {
  const fromLabel = formatShortDate(range.from);
  if (range.from === range.to) {
    return `${fromLabel} (1 j.)`;
  }
  const toLabel = formatShortDate(range.to);
  return `${fromLabel} → ${toLabel} (${range.dayCount} j.)`;
}
