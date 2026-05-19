/** Récap appels RU listing (Business → api=l) — Pull/Push propriété, sync, import. */

import { listingIdFromChannelOtaRow } from './businessTabHelpers';

export type ListingRuRecapRow = Record<string, unknown> & {
  action?: string;
  auditContext?: Record<string, unknown>;
  requestPayload?: unknown;
  responseMsg?: string;
};

const ACTION_LABELS: Record<string, string> = {
  ListingOtaSync_From_Channels: 'Sync canaux OTA (snapshot)',
  Pull_ListProperties_RQ: 'Liste propriétés RU (owner)',
  Pull_ListSpecProp_RQ: 'Détail propriété RU (import)',
  Pull_GetMinStay_RQ: 'Séjour minimum RU',
  Pull_ListPropertyPrices_RQ: 'Prix propriété (pull)',
  Pull_ListPropertyAvailabilityCalendar_RQ: 'Calendrier dispo (pull)',
  Push_PutProperty_RQ: 'Push propriété RU',
  Push_PutBuilding_RQ: 'Push bâtiment (Multi)',
  Push_PutComposition_RQ: 'Push composition chambres',
  Push_PutDescription_RQ: 'Push descriptions',
  Push_PutImage_RQ: 'Push images',
  Push_PutLocation_RQ: 'Push localisation',
  Push_PutPaymentMethods_RQ: 'Push moyens de paiement',
  Push_PutMinStay_RQ: 'Push min stay',
  Push_PutChangeOver_RQ: 'Push changeover',
};

function extractPropertyId(payload: unknown): string | undefined {
  const walk = (obj: unknown, depth: number): string | undefined => {
    if (depth > 14 || obj == null || typeof obj !== 'object') return undefined;
    if (Array.isArray(obj)) {
      for (const el of obj) {
        const f = walk(el, depth + 1);
        if (f) return f;
      }
      return undefined;
    }
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (
        (k === '@_PropertyID' || k === 'PropertyID' || k === 'propertyId') &&
        v != null &&
        String(v).trim() !== ''
      ) {
        return String(v).trim();
      }
      const inner = walk(v, depth + 1);
      if (inner) return inner;
    }
    return undefined;
  };
  return walk(payload, 0);
}

export function listingActionLabelFr(action: unknown): string {
  const a = String(action || '').trim();
  if (!a) return 'Appel listing';
  return ACTION_LABELS[a] || a.replace(/_RQ$/, '').replace(/_/g, ' ');
}

export function buildListingRuRecap(row: ListingRuRecapRow) {
  const audit =
    row.auditContext && typeof row.auditContext === 'object' ? row.auditContext : {};
  const action = String(row.action || '');
  const detailLines: string[] = [];

  detailLines.push(listingActionLabelFr(action));

  const lid = listingIdFromChannelOtaRow(row as Parameters<typeof listingIdFromChannelOtaRow>[0]);
  if (lid !== '—') detailLines.push(`Listing Sojori · ${lid}`);

  const pid = extractPropertyId(row.requestPayload) || audit.propertyId;
  if (pid != null && String(pid).trim() !== '') {
    detailLines.push(`Property RU · ${String(pid)}`);
  }

  if (audit.route) detailLines.push(`Route · ${String(audit.route)}`);
  if (audit.trigger && audit.trigger !== audit.route) {
    detailLines.push(`Trigger · ${String(audit.trigger)}`);
  }
  if (audit.correlationId) {
    detailLines.push(`Correlation · ${String(audit.correlationId).slice(0, 24)}…`);
  }

  const roomTypes = audit.roomTypeIds;
  if (Array.isArray(roomTypes) && roomTypes.length) {
    detailLines.push(`${roomTypes.length} room type(s)`);
  }

  const msg = String(row.responseMsg || '').trim();
  if (msg) detailLines.push(msg.slice(0, 160));

  const shortLine = detailLines.slice(0, 2).join(' · ') || listingActionLabelFr(action);

  return {
    shortLine,
    detailLines,
    hasDetail: detailLines.length > 0,
  };
}
