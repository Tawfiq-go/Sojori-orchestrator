/** Helpers Business tab — portés depuis ChannelsHubPage.jsx */

export function prettyJson(obj: unknown): string {
  try {
    return JSON.stringify(obj ?? null, null, 2);
  } catch {
    return String(obj);
  }
}

export function listingIdFromChannelOtaRow(row: {
  requestPayload?: { listingId?: unknown };
  auditContext?: { listingIds?: unknown[] };
  requestXml?: string;
}): string {
  const p = row?.requestPayload;
  if (p && typeof p === 'object' && p.listingId != null && String(p.listingId).trim() !== '') {
    return String(p.listingId);
  }
  const ac = row?.auditContext;
  if (Array.isArray(ac?.listingIds) && ac.listingIds[0] != null) return String(ac.listingIds[0]);
  const xml = row?.requestXml;
  const m = String(xml || '').match(/listingId="([^"]+)"/i);
  return m ? m[1] : '—';
}

export function ruCalendarStatusBadgeClass(status: string | undefined): string {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'channels-badge-success';
  if (s === 'failed' || s === 'error') return 'channels-badge-error';
  return 'channels-badge-neutral';
}

export function pickMessagingField(obj: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return undefined;
}

function extractPropertyIdFromPayloadLike(row: { requestPayload?: unknown }): string | undefined {
  const walk = (obj: unknown, depth: number): string | undefined => {
    if (depth > 12 || obj == null || typeof obj !== 'object') return undefined;
    if (Array.isArray(obj)) {
      for (const el of obj) {
        const f = walk(el, depth + 1);
        if (f) return f;
      }
      return undefined;
    }
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === '@_PropertyID' && (typeof v === 'string' || typeof v === 'number')) {
        const s = String(v).trim();
        if (s) return s;
      }
      const inner = walk(v, depth + 1);
      if (inner) return inner;
    }
    return undefined;
  };
  return row.requestPayload ? walk(row.requestPayload, 0) : undefined;
}

function extractCalendarPriceHint(row: { requestPayload?: unknown }): string {
  if (!row.requestPayload || typeof row.requestPayload !== 'object') return '—';
  const bits: string[] = [];
  const walk = (obj: unknown, depth: number) => {
    if (depth > 14 || bits.length >= 6 || obj == null || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (const el of obj) {
        walk(el, depth + 1);
        if (bits.length >= 6) return;
      }
      return;
    }
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const rawKey = String(k).replace(/^@_/, '');
      const kl = rawKey.toLowerCase();
      if (
        (kl === 'price' || kl === 'minlos' || kl === 'maxlos' || kl === 'currency') &&
        v != null &&
        String(v).trim() !== '' &&
        typeof v !== 'object'
      ) {
        bits.push(kl === 'price' ? String(v).trim() : `${rawKey}=${String(v).trim()}`);
      }
      if (typeof v === 'object' && v != null) walk(v, depth + 1);
    }
  };
  walk(row.requestPayload, 0);
  return bits.length ? bits.slice(0, 5).join(' · ') : '—';
}

export function summarizeCalendarRuRow(row: {
  auditContext?: Record<string, unknown>;
  action?: string;
  propertyId?: string | number;
  listing?: { name?: string; city?: string };
  owner?: { firstName?: string; lastName?: string };
  requestPayload?: unknown;
}) {
  const audit = row.auditContext && typeof row.auditContext === 'object' ? row.auditContext : {};
  const rawSchema = audit.publishPayloadSchemaVersion;
  let rabbitSchemaVersion: number | null = null;
  if (rawSchema != null && String(rawSchema).trim() !== '') {
    const n = Number(rawSchema);
    if (Number.isFinite(n)) rabbitSchemaVersion = n;
  }
  const rabbitSchemaDisplay = rabbitSchemaVersion != null ? `v${rabbitSchemaVersion}` : '—';

  const srcParts: string[] = [];
  if (audit.modificationSource) srcParts.push(String(audit.modificationSource));
  if (audit.trigger && String(audit.trigger) !== String(audit.modificationSource || '')) {
    srcParts.push(String(audit.trigger));
  }
  if (audit.route) srcParts.push(`route:${String(audit.route)}`);
  if (audit.userId != null && String(audit.userId).trim() !== '') {
    const u = String(audit.userId);
    srcParts.push(u.length > 14 ? `user:${u.slice(0, 12)}…` : `user:${u}`);
  }
  const source = srcParts.length ? srcParts.join(' · ') : '—';
  const sourceTitle =
    srcParts.length > 0
      ? srcParts.join('\n')
      : Object.keys(audit).length > 0
        ? JSON.stringify(audit)
        : '';
  const lu = Array.isArray(audit.lightUpdates) ? audit.lightUpdates : [];
  const kinds = [...new Set(lu.map((x: { type?: string }) => x?.type).filter(Boolean))];
  let kindsStr = kinds.join(', ');
  if (!kindsStr && row.action) {
    const a = String(row.action);
    if (/PutPrices/i.test(a)) kindsStr = 'prix';
    else if (/PutAvbUnits|Avb/i.test(a)) kindsStr = 'dispo';
    else kindsStr = '—';
  }
  let ranges = '—';
  if (lu.length) {
    const froms = lu.map((x: { from?: string }) => x?.from).filter(Boolean);
    const tos = lu.map((x: { to?: string }) => x?.to).filter(Boolean);
    try {
      if (froms.length && tos.length) {
        const min = froms.reduce((a, b) => (new Date(a!) <= new Date(b!) ? a : b));
        const max = tos.reduce((a, b) => (new Date(a!) >= new Date(b!) ? a : b));
        ranges = `${String(min).slice(0, 10)} → ${String(max).slice(0, 10)}`;
      }
    } catch {
      ranges = `${lu.length} plage(s)`;
    }
  }
  const pid = row.propertyId || extractPropertyIdFromPayloadLike(row);
  const listingLabel =
    row.listing && typeof row.listing === 'object'
      ? [row.listing.name, row.listing.city].filter((x) => x && String(x).trim()).join(' · ')
      : '';
  const ownerLabel =
    row.owner && typeof row.owner === 'object'
      ? `${row.owner.firstName || ''} ${row.owner.lastName || ''}`.trim()
      : '';
  return {
    source,
    sourceTitle: sourceTitle || source,
    ranges,
    kindsStr: kindsStr || '—',
    propertyId: pid,
    listingLabel,
    ownerLabel,
    priceHint: extractCalendarPriceHint(row),
    rabbitSchemaVersion,
    rabbitSchemaDisplay,
  };
}

export type BusinessViewTab = 'Api' | 'Hook' | 'BizOwner' | 'BizListing';

export function resolveBusinessViewTab(biz: string): BusinessViewTab {
  const b = (biz || 'api').toLowerCase();
  if (b === 'hooks') return 'Hook';
  if (b === 'owner') return 'BizOwner';
  if (b === 'listing') return 'BizListing';
  return 'Api';
}
