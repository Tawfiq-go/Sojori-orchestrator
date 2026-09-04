import type { ContractSignatureConfigValue } from '../serviceMatrix/contractSignatureDefaults';
import {
  type GuestDocument,
  type GuestDocumentClause,
  type GuestDocumentKind,
  type GuestDocumentSignerPolicy,
  DEFAULT_DISCLAIMER_DOCUMENT_ID,
  DEFAULT_SHORT_TERM_RENTAL_DOCUMENT_ID,
  DOCUMENT_FIELD_KEYS,
  MAX_GUEST_DOCUMENTS,
  POLICE_FORM_DOCUMENT_ID,
  assembleContent,
  defaultGuestDocuments,
  documentTypeForGuestDocument,
} from './catalog';
import {
  defaultDocumentPolicies,
  normalizeDocumentPolicies,
  readOptionalBoolean,
  resolvePolicyFlag,
} from './policy';

const MAX_CLAUSES = 12;

/** Parsed document before kind-default policy fill / inheritance. */
export type ParsedGuestDocument = Omit<GuestDocument, 'requiredBeforeArrival' | 'blocksAccess'> & {
  requiredBeforeArrival?: boolean;
  blocksAccess?: boolean;
};

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

function parseKind(raw: unknown): GuestDocumentKind {
  if (raw === 'police_form') return 'police_form';
  if (raw === 'short_term_rental') return 'short_term_rental';
  return 'contract';
}

export function finalizeGuestDocument(doc: ParsedGuestDocument): GuestDocument {
  const defaults = defaultDocumentPolicies(doc.kind);
  return normalizeDocumentPolicies({
    ...doc,
    requiredBeforeArrival: resolvePolicyFlag(doc.requiredBeforeArrival, undefined, defaults.requiredBeforeArrival),
    blocksAccess: resolvePolicyFlag(doc.blocksAccess, undefined, defaults.blocksAccess),
  });
}

export function parseGuestDocument(raw: unknown): GuestDocument | null {
  const parsed = parseGuestDocumentLoose(raw);
  return parsed ? finalizeGuestDocument(parsed) : null;
}

export function parseGuestDocumentLoose(raw: unknown): ParsedGuestDocument | null {
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
  const kind = parseKind(rec.kind);
  const doc: ParsedGuestDocument = {
    id,
    kind,
    name,
    title,
    content,
    clauses,
    closing,
    notice,
    enabled: rec.enabled === true,
    requiresSignature: rec.requiresSignature === true,
    requiredBeforeArrival: readOptionalBoolean(rec.requiredBeforeArrival),
    blocksAccess: readOptionalBoolean(rec.blocksAccess),
    autoSendAfterRegistration: rec.autoSendAfterRegistration === true,
    signerPolicy,
    fieldKeys,
  };
  if (!doc.content) doc.content = assembleContent(doc);
  return doc;
}

export function parseGuestDocumentsLoose(raw: unknown): ParsedGuestDocument[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_GUEST_DOCUMENTS) return null;
  const out: ParsedGuestDocument[] = [];
  const ids = new Set<string>();
  let policeCount = 0;
  let disclaimerCount = 0;
  let rentalCount = 0;
  for (const item of raw) {
    const doc = parseGuestDocumentLoose(item);
    if (!doc) return null;
    if (ids.has(doc.id)) return null;
    ids.add(doc.id);
    if (doc.kind === 'police_form') {
      policeCount += 1;
      if (policeCount > 1) return null;
    } else if (doc.kind === 'short_term_rental') {
      rentalCount += 1;
      if (rentalCount > 1) return null;
    } else {
      disclaimerCount += 1;
      if (disclaimerCount > 1) return null;
    }
    out.push(doc);
  }
  return out;
}

export function parseGuestDocuments(raw: unknown): GuestDocument[] | null {
  const loose = parseGuestDocumentsLoose(raw);
  return loose ? loose.map(finalizeGuestDocument) : null;
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

function activateLegacyDocument(
  template: GuestDocument,
  cs: ContractSignatureConfigValue,
): GuestDocument {
  const defaults = defaultDocumentPolicies(template.kind);
  return normalizeDocumentPolicies({
    ...template,
    enabled: true,
    requiresSignature: true,
    requiredBeforeArrival: defaults.requiredBeforeArrival,
    blocksAccess: defaults.blocksAccess,
    autoSendAfterRegistration: cs.autoSendAfterRegistration === true,
    signerPolicy: cs.signerPolicy === 'each_traveler' ? 'each_traveler' : 'primary_guest',
  });
}

/**
 * Hydrate UI from stored guestDocuments, or seed inactive templates / legacy CS.
 * Never silently treats missing config as “all documents active”.
 */
export function documentsFromGestion(
  gestion: Record<string, unknown>,
  contractSignature?: ContractSignatureConfigValue | null,
): GuestDocument[] {
  const parsed = parseGuestDocuments(gestion.guestDocuments);
  if (parsed) return parsed;

  const templates = defaultGuestDocuments();
  const cs = contractSignature;
  if (!cs?.enabled) return templates;

  const targetType = cs.documentType || 'stay_contract';
  return templates.map((d) => {
    const match = documentTypeForGuestDocument(d) === targetType;
    if (!match) {
      if (d.kind === 'police_form' && cs.establishmentNotice?.trim()) {
        return { ...d, notice: cs.establishmentNotice.trim() };
      }
      return d;
    }
    const activated = activateLegacyDocument(d, cs);
    if (d.kind === 'police_form' && cs.establishmentNotice?.trim()) {
      return { ...activated, notice: cs.establishmentNotice.trim() };
    }
    return activated;
  });
}

/**
 * Merge listing documents over owner templates by kind.
 * Listing explicit values win; missing listing array falls back to owner.
 */
export function mergeGuestDocumentsInheritance(
  listingGestion: Record<string, unknown> | null | undefined,
  ownerGestion: Record<string, unknown> | null | undefined,
  listingCs?: ContractSignatureConfigValue | null,
  ownerCs?: ContractSignatureConfigValue | null,
): GuestDocument[] {
  const listingLoose = parseGuestDocumentsLoose(listingGestion?.guestDocuments);
  const ownerLoose = parseGuestDocumentsLoose(ownerGestion?.guestDocuments);

  if (listingLoose) {
    return listingLoose.map((listingDoc) => {
      const ownerDoc = ownerLoose?.find((o) => o.kind === listingDoc.kind);
      const defaults = defaultDocumentPolicies(listingDoc.kind);
      return normalizeDocumentPolicies({
        ...listingDoc,
        requiredBeforeArrival: resolvePolicyFlag(
          listingDoc.requiredBeforeArrival,
          ownerDoc?.requiredBeforeArrival,
          defaults.requiredBeforeArrival,
        ),
        blocksAccess: resolvePolicyFlag(
          listingDoc.blocksAccess,
          ownerDoc?.blocksAccess,
          defaults.blocksAccess,
        ),
      });
    });
  }

  if (ownerLoose) return ownerLoose.map(finalizeGuestDocument);
  return documentsFromGestion(listingGestion ?? {}, listingCs ?? ownerCs ?? null);
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
      signed?.kind === 'police_form'
        ? 'moroccan_police_form'
        : signed?.kind === 'short_term_rental'
          ? 'short_term_rental'
          : existing.documentType || 'stay_contract',
  };
}

/** @deprecated ids kept for call sites that still key off template ids */
export const GUEST_DOCUMENT_TEMPLATE_IDS = [
  POLICE_FORM_DOCUMENT_ID,
  DEFAULT_DISCLAIMER_DOCUMENT_ID,
  DEFAULT_SHORT_TERM_RENTAL_DOCUMENT_ID,
] as const;
