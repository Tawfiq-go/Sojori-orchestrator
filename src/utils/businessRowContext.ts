/**
 * Contexte métier commun — colonnes Owner · Listing Sojori · Sojori # (SJ-…)
 */
import {
  extractListingOwner,
  extractSojoriReservationNumber,
  type IngressOverviewRow,
} from './ingressRowHelpers';

export type BusinessRowContext = {
  ownerLabel: string;
  listingLabel: string;
  sojoriReservationNumber: string;
};

export const BUSINESS_CONTEXT_HEADERS = ['Owner', 'Listing Sojori', 'Sojori #'] as const;
export const BUSINESS_CONTEXT_COL_COUNT = BUSINESS_CONTEXT_HEADERS.length;

type RuApiRow = Record<string, unknown> & {
  ownerName?: string;
  listingName?: string;
  sojoriReservationNumber?: string;
  owner?: { firstName?: string; lastName?: string };
  listing?: { name?: string; city?: string };
  auditContext?: Record<string, unknown>;
};

function labelFromAudit(audit: Record<string, unknown> | undefined, key: 'owner' | 'listing' | 'sojori'): string {
  if (!audit || typeof audit !== 'object') return '—';
  if (key === 'owner') {
    const id = audit.ownerId ?? (Array.isArray(audit.ownerIds) ? audit.ownerIds[0] : audit.accountId);
    return id != null && String(id).trim() ? String(id).slice(-8) : '—';
  }
  if (key === 'listing') {
    const id = audit.listingId ?? (Array.isArray(audit.listingIds) ? audit.listingIds[0] : '');
    return id != null && String(id).trim() ? String(id).slice(-8) : '—';
  }
  const pc =
    audit.publishContext && typeof audit.publishContext === 'object'
      ? (audit.publishContext as Record<string, unknown>)
      : null;
  const otm =
    pc?.occupancyTriggerMeta && typeof pc.occupancyTriggerMeta === 'object'
      ? (pc.occupancyTriggerMeta as Record<string, unknown>)
      : null;
  for (const c of [
    audit.sojoriReservationNumber,
    audit.reservationNumber,
    audit.sojoriReservationId,
    pc?.primaryReservationNumber,
    pc?.reservationNumber,
    otm?.primaryReservationNumber,
    otm && typeof otm.reservationNumberById === 'object'
      ? Object.values(otm.reservationNumberById as Record<string, unknown>)[0]
      : undefined,
  ]) {
    const s = c != null ? String(c).trim() : '';
    if (s) return s;
  }
  return '—';
}

/** Appels API sortants (ChannelRuApiCall) — champs enrichis backend ou auditContext. */
export function extractRuApiCallBusinessContext(row: RuApiRow): BusinessRowContext {
  const audit = row.auditContext;
  const ownerFromObj =
    row.owner && typeof row.owner === 'object'
      ? `${row.owner.firstName || ''} ${row.owner.lastName || ''}`.trim()
      : '';
  const listingFromObj =
    row.listing && typeof row.listing === 'object'
      ? [row.listing.name, row.listing.city].filter((x) => x && String(x).trim()).join(' · ')
      : '';

  const ownerLabel =
    (typeof row.ownerName === 'string' && row.ownerName.trim()) ||
    ownerFromObj ||
    labelFromAudit(audit, 'owner');
  const listingLabel =
    (typeof row.listingName === 'string' && row.listingName.trim()) ||
    listingFromObj ||
    labelFromAudit(audit, 'listing');
  const sojoriReservationNumber =
    (typeof row.sojoriReservationNumber === 'string' && row.sojoriReservationNumber.trim()) ||
    labelFromAudit(audit, 'sojori');

  return {
    ownerLabel: ownerLabel || '—',
    listingLabel: listingLabel || '—',
    sojoriReservationNumber: sojoriReservationNumber === '—' ? '—' : sojoriReservationNumber,
  };
}

/** Webhooks ingress (overview). */
export function extractIngressBusinessContext(row: IngressOverviewRow): BusinessRowContext {
  const lo = extractListingOwner(row);
  const sj = extractSojoriReservationNumber(row);
  return {
    ownerLabel: lo.ownerName,
    listingLabel: lo.listingName,
    sojoriReservationNumber: sj,
  };
}
