import type { ContractSignatureConfigValue } from '../serviceMatrix/contractSignatureDefaults';
import {
  type GuestDocument,
  type GuestDocumentClause,
  type GuestDocumentSignerPolicy,
  DEFAULT_DISCLAIMER_DOCUMENT_ID,
  DOCUMENT_FIELD_KEYS,
  MAX_GUEST_DOCUMENTS,
  assembleContent,
  defaultGuestDocuments,
} from './catalog';

const MAX_CLAUSES = 12;

function parseClauses(raw: unknown, fallbackContent: string): GuestDocumentClause[] {
  if (Array.isArray(raw)) {
    const out: GuestDocumentClause[] = [];
    for (const item of raw.slice(0, MAX_CLAUSES)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const rec = item as Record<string, unknown>;
      const id = clip(rec.id, 80) || `cl_${out.length}`;
      out.push({
        id,
        title: clip(rec.title, 160),
        bodyFr: clip(rec.bodyFr, 4000),
        bodyEn: clip(rec.bodyEn, 4000),
      });
    }
    return out;
  }
  if (fallbackContent.trim()) {
    return [{ id: 'cl_legacy', title: '', bodyFr: fallbackContent.trim(), bodyEn: '' }];
  }
  return [];
}

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function parseFieldKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const key = item.trim();
    if (!DOCUMENT_FIELD_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export function parseGuestDocument(raw: unknown): GuestDocument | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const id = clip(rec.id, 80);
  const name = clip(rec.name, 120);
  const title = clip(rec.title, 200);
  if (!id || !name || !title) return null;
  const signerPolicy: GuestDocumentSignerPolicy =
    rec.signerPolicy === 'each_traveler' ? 'each_traveler' : 'primary_guest';
  const content = clip(rec.content, 20_000);
  const clauses = parseClauses(rec.clauses, content);
  const closing = clip(rec.closing, 2000);
  const notice = clip(rec.notice, 400);
  const fieldKeys = parseFieldKeys(rec.fieldKeys);
  const doc: GuestDocument = {
    id,
    kind: rec.kind === 'police_form' ? 'police_form' : 'contract',
    name,
    title,
    content,
    clauses,
    closing,
    notice,
    enabled: rec.enabled === true,
    requiresSignature: rec.requiresSignature === true,
    autoSendAfterRegistration: rec.autoSendAfterRegistration === true,
    signerPolicy,
    fieldKeys,
  };
  if (!doc.content) doc.content = assembleContent(doc);
  return doc;
}

export function parseGuestDocuments(raw: unknown): GuestDocument[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_GUEST_DOCUMENTS) return null;
  const out: GuestDocument[] = [];
  const ids = new Set<string>();
  let policeCount = 0;
  for (const item of raw) {
    const doc = parseGuestDocument(item);
    if (!doc) return null;
    if (ids.has(doc.id)) return null;
    ids.add(doc.id);
    if (doc.kind === 'police_form') {
      policeCount += 1;
      if (policeCount > 1) return null;
    }
    out.push(doc);
  }
  return out;
}

/** Any enabled document with web signature (police or disclaimer). */
export function signableDocuments(docs: GuestDocument[]): GuestDocument[] {
  return docs.filter((d) => d.enabled && d.requiresSignature);
}

/** Prefer disclaimer, else first signable (legacy sync → single contractSignature). */
export function firstSignedContract(docs: GuestDocument[]): GuestDocument | undefined {
  return (
    docs.find((d) => d.kind === 'contract' && d.enabled && d.requiresSignature) ??
    docs.find((d) => d.enabled && d.requiresSignature)
  );
}

/** Hydrate UI from stored guestDocuments, or seed from legacy contractSignature. */
export function documentsFromGestion(
  gestion: Record<string, unknown>,
  contractSignature?: ContractSignatureConfigValue | null,
): GuestDocument[] {
  const parsed = parseGuestDocuments(gestion.guestDocuments);
  if (parsed) return parsed;
  const defaults = defaultGuestDocuments();
  const cs = contractSignature;
  if (!cs?.enabled) return defaults;
  return defaults.map((d) => {
    if (d.id === DEFAULT_DISCLAIMER_DOCUMENT_ID) {
      return {
        ...d,
        enabled: true,
        requiresSignature: true,
        autoSendAfterRegistration: cs.autoSendAfterRegistration,
        signerPolicy: cs.signerPolicy,
      };
    }
    if (d.kind === 'police_form' && cs.establishmentNotice?.trim()) {
      return { ...d, notice: cs.establishmentNotice.trim() };
    }
    return d;
  });
}

export function syncContractSignatureFromDocuments(
  documents: GuestDocument[],
  existing: ContractSignatureConfigValue,
): ContractSignatureConfigValue {
  const signable = signableDocuments(documents);
  const signed = firstSignedContract(documents);
  const police = documents.find((d) => d.kind === 'police_form');
  const rawNotice = police?.notice?.trim() || police?.content?.trim() || '';
  const establishmentNotice =
    police?.notice?.trim() ||
    (!rawNotice || rawNotice.length > 280 || rawNotice.includes('{{')
      ? existing.establishmentNotice
      : rawNotice);
  return {
    ...existing,
    enabled: signable.length > 0,
    autoSendAfterRegistration: signed?.autoSendAfterRegistration === true,
    signerPolicy: signed?.signerPolicy ?? existing.signerPolicy,
    documentType:
      signed?.kind === 'police_form' ? 'moroccan_police_form' : existing.documentType || 'stay_contract',
    establishmentNotice,
  };
}
