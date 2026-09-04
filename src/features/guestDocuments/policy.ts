import type { GuestDocument, GuestDocumentKind } from './catalog';

/** Kind-specific defaults when policy fields are missing on an activated / persisted doc. */
export function defaultDocumentPolicies(kind: GuestDocumentKind): {
  requiredBeforeArrival: boolean;
  blocksAccess: boolean;
} {
  if (kind === 'contract') {
    return { requiredBeforeArrival: true, blocksAccess: false };
  }
  // police_form + short_term_rental (contracts that block access by default)
  return { requiredBeforeArrival: true, blocksAccess: true };
}

/** Identity registration capability defaults. */
export const DEFAULT_REGISTRATION_POLICIES = {
  requiredBeforeArrival: true,
  blocksAccess: true,
} as const;

/**
 * Resolve listing → owner → kind/capability default without `||`, so explicit
 * `false` survives.
 */
export function resolvePolicyFlag(
  listingExplicit: boolean | undefined | null,
  ownerExplicit: boolean | undefined | null,
  fallback: boolean,
): boolean {
  if (typeof listingExplicit === 'boolean') return listingExplicit;
  if (typeof ownerExplicit === 'boolean') return ownerExplicit;
  return fallback;
}

export function readOptionalBoolean(raw: unknown): boolean | undefined {
  return typeof raw === 'boolean' ? raw : undefined;
}

/**
 * Invariants:
 * - blocksAccess ⇒ enabled + requiredBeforeArrival + requiresSignature
 * - turning off enabled / requiredBeforeArrival / requiresSignature clears blocksAccess
 */
export function normalizeDocumentPolicies(doc: GuestDocument): GuestDocument {
  let { enabled, requiredBeforeArrival, requiresSignature, blocksAccess } = doc;
  if (!enabled || !requiredBeforeArrival || !requiresSignature) {
    blocksAccess = false;
  }
  if (blocksAccess) {
    enabled = true;
    requiredBeforeArrival = true;
    requiresSignature = true;
  }
  return {
    ...doc,
    enabled,
    requiredBeforeArrival,
    requiresSignature,
    blocksAccess,
  };
}

/** Apply a UI patch then re-normalize invariants (turning on blocksAccess enables prereqs). */
export function applyDocumentPolicyPatch(
  doc: GuestDocument,
  patch: Partial<
    Pick<
      GuestDocument,
      'enabled' | 'requiredBeforeArrival' | 'requiresSignature' | 'blocksAccess' | 'autoSendAfterRegistration' | 'signerPolicy'
    >
  >,
): GuestDocument {
  const next: GuestDocument = { ...doc, ...patch };
  if (patch.enabled === true && doc.enabled === false) {
    const defaults = defaultDocumentPolicies(doc.kind);
    if (typeof patch.requiredBeforeArrival !== 'boolean') {
      next.requiredBeforeArrival = defaults.requiredBeforeArrival;
    }
    if (typeof patch.blocksAccess !== 'boolean') {
      next.blocksAccess = defaults.blocksAccess;
    }
    if (typeof patch.requiresSignature !== 'boolean') {
      next.requiresSignature = true;
    }
  }
  if (patch.blocksAccess === true) {
    next.enabled = true;
    next.requiredBeforeArrival = true;
    next.requiresSignature = true;
  }
  if (patch.enabled === false || patch.requiredBeforeArrival === false || patch.requiresSignature === false) {
    next.blocksAccess = false;
  }
  return normalizeDocumentPolicies(next);
}

export function canBlockAccess(doc: Pick<GuestDocument, 'enabled' | 'requiredBeforeArrival' | 'requiresSignature'>): boolean {
  return doc.enabled === true && doc.requiredBeforeArrival === true && doc.requiresSignature === true;
}

export type DocumentPolicySummary = {
  requiredCount: number;
  blockingCount: number;
};

export function summarizeDocumentPolicies(docs: GuestDocument[]): DocumentPolicySummary {
  let requiredCount = 0;
  let blockingCount = 0;
  for (const d of docs) {
    if (!d.enabled) continue;
    if (d.requiredBeforeArrival) requiredCount += 1;
    if (d.blocksAccess) blockingCount += 1;
  }
  return { requiredCount, blockingCount };
}

