import type { LandlordContract, LedgerEntry } from '../types';
import { contractBaseShortLabel } from './contractCommissionBase';

export function formatMoney(amount: number, currency = 'MAD'): string {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency}`;
}

export function formatShortDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function formatPeriod(start?: string, end?: string): string {
  if (!start || !end) return '—';
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${String(s.getDate()).padStart(2, '0')}–${String(e.getDate()).padStart(2, '0')} ${e.toLocaleDateString('fr-FR', { month: 'short' })}`;
  }
  return `${formatShortDate(s)} → ${formatShortDate(e)}`;
}

export function personName(first?: string, last?: string, fallback = '—'): string {
  const n = [first, last].filter(Boolean).join(' ').trim();
  return n || fallback;
}

export function initials(first?: string, last?: string): string {
  const a = (first || '').charAt(0);
  const b = (last || '').charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

export function contractBadge(contract?: LandlordContract): { label: string; tone: 'gold' | 'info' | 'gray' } {
  if (!contract?.type) return { label: '— à définir', tone: 'gray' };
  if (contract.type === 'fixed') {
    const amt = contract.fixedAmount != null ? `${contract.fixedAmount.toLocaleString('fr-FR')} ${contract.currency || 'MAD'}` : '';
    const period =
      contract.fixedPeriod === 'per_booking'
        ? '/résa'
        : contract.fixedPeriod === 'per_year'
          ? '/an'
          : '/mois';
    return { label: `Forfait fixe · ${amt}${period}`, tone: 'info' };
  }
  const pct = contract.commissionPercent ?? 0;
  const base = contractBaseShortLabel(contract);
  return { label: `% ${base} · ${pct}%`, tone: 'gold' };
}

export function paidByLabel(paidBy?: string): string {
  if (paidBy === 'landlord') return 'Propriétaire';
  if (paidBy === 'guest') return 'Voyageur';
  return 'PM';
}

/** Libellé + ton badge pour la colonne Source du journal. */
export function ledgerSourceBadge(entry: Pick<LedgerEntry, 'source' | 'recurringTemplateId'>): {
  label: string;
  tone: 'info' | 'gray' | 'gold' | 'rose';
  title: string;
} {
  if (entry.source === 'whatsapp') {
    return { label: '📱 WhatsApp', tone: 'info', title: 'Saisie via Flow E staff WhatsApp' };
  }
  if (entry.source === 'recurring' || entry.recurringTemplateId) {
    return { label: '🔁 Récurrent', tone: 'gray', title: 'Ligne générée depuis une récurrence' };
  }
  if (entry.source === 'import') {
    return { label: '📥 Import', tone: 'gold', title: 'Import externe' };
  }
  if (entry.source === 'task') {
    return { label: '⚙️ Tâche', tone: 'rose', title: 'Créée automatiquement (tâche)' };
  }
  return { label: '✏️ Manuel', tone: 'gray', title: 'Saisie manuelle dashboard' };
}
