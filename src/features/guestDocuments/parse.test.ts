import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_DISCLAIMER_DOCUMENT_ID,
  DEFAULT_SHORT_TERM_RENTAL_DOCUMENT_ID,
  POLICE_FORM_DOCUMENT_ID,
  defaultGuestDocuments,
  documentTypeForGuestDocument,
} from './catalog';
import {
  documentsFromGestion,
  firstSignedContract,
  mergeGuestDocumentsInheritance,
  parseGuestDocument,
  signableDocuments,
} from './parse';
import {
  applyDocumentPolicyPatch,
  defaultDocumentPolicies,
  normalizeDocumentPolicies,
  resolvePolicyFlag,
} from './policy';

describe('guestDocuments hydration & policies', () => {
  it('missing guestDocuments + disabled legacy → all templates inactive', () => {
    const docs = documentsFromGestion({}, { enabled: false } as never);
    assert.equal(docs.length, 3);
    assert.ok(docs.every((d) => d.enabled === false));
    assert.equal(signableDocuments(docs).length, 0);
  });

  it('legacy enabled config → only matching document active', () => {
    const docs = documentsFromGestion(
      {},
      {
        enabled: true,
        documentType: 'moroccan_police_form',
        autoSendAfterRegistration: true,
        signerPolicy: 'each_traveler',
        establishmentNotice: '',
        logoUrl: '',
      } as never,
    );
    const police = docs.find((d) => d.id === POLICE_FORM_DOCUMENT_ID)!;
    const disclaimer = docs.find((d) => d.id === DEFAULT_DISCLAIMER_DOCUMENT_ID)!;
    const rental = docs.find((d) => d.id === DEFAULT_SHORT_TERM_RENTAL_DOCUMENT_ID)!;
    assert.equal(police.enabled, true);
    assert.equal(police.requiresSignature, true);
    assert.equal(disclaimer.enabled, false);
    assert.equal(rental.enabled, false);
    assert.equal(signableDocuments(docs).length, 1);
  });

  it('persisted enabled=false remains false', () => {
    const doc = parseGuestDocument({
      id: 'doc_police_form',
      kind: 'police_form',
      name: 'Fiche',
      title: 'Fiche',
      enabled: false,
      requiresSignature: true,
      requiredBeforeArrival: true,
      blocksAccess: true,
    });
    assert.ok(doc);
    assert.equal(doc.enabled, false);
    assert.equal(doc.blocksAccess, false);
  });

  it('missing policy fields receive kind-specific defaults', () => {
    const police = parseGuestDocument({
      id: 'doc_police_form',
      kind: 'police_form',
      name: 'Fiche',
      title: 'Fiche',
      enabled: true,
      requiresSignature: true,
    });
    const disclaimer = parseGuestDocument({
      id: 'doc_stay_disclaimer',
      kind: 'contract',
      name: 'Disclaimer',
      title: 'Disclaimer',
      enabled: true,
      requiresSignature: true,
    });
    assert.ok(police && disclaimer);
    assert.deepEqual(
      { requiredBeforeArrival: police.requiredBeforeArrival, blocksAccess: police.blocksAccess },
      defaultDocumentPolicies('police_form'),
    );
    assert.deepEqual(
      {
        requiredBeforeArrival: disclaimer.requiredBeforeArrival,
        blocksAccess: disclaimer.blocksAccess,
      },
      defaultDocumentPolicies('contract'),
    );
  });

  it('explicit false policy values survive parsing and inheritance', () => {
    assert.equal(resolvePolicyFlag(false, true, true), false);
    assert.equal(resolvePolicyFlag(undefined, false, true), false);
    assert.equal(resolvePolicyFlag(undefined, undefined, true), true);

    const merged = mergeGuestDocumentsInheritance(
      {
        guestDocuments: [
          {
            id: 'doc_police_form',
            kind: 'police_form',
            name: 'Fiche',
            title: 'Fiche',
            enabled: true,
            requiresSignature: true,
            requiredBeforeArrival: false,
            blocksAccess: false,
          },
        ],
      },
      {
        guestDocuments: [
          {
            id: 'doc_police_form',
            kind: 'police_form',
            name: 'Fiche',
            title: 'Fiche',
            enabled: true,
            requiresSignature: true,
            requiredBeforeArrival: true,
            blocksAccess: true,
          },
        ],
      },
    );
    assert.equal(merged[0].requiredBeforeArrival, false);
    assert.equal(merged[0].blocksAccess, false);
  });

  it('blocksAccess invariants', () => {
    const base = parseGuestDocument({
      id: 'doc_police_form',
      kind: 'police_form',
      name: 'Fiche',
      title: 'Fiche',
      enabled: true,
      requiresSignature: true,
      requiredBeforeArrival: true,
      blocksAccess: false,
    })!;
    const turnedOn = applyDocumentPolicyPatch(base, { blocksAccess: true });
    assert.equal(turnedOn.blocksAccess, true);
    assert.equal(turnedOn.enabled, true);
    assert.equal(turnedOn.requiredBeforeArrival, true);
    assert.equal(turnedOn.requiresSignature, true);

    const turnedOffRequired = applyDocumentPolicyPatch(turnedOn, { requiredBeforeArrival: false });
    assert.equal(turnedOffRequired.blocksAccess, false);

    const invalid = normalizeDocumentPolicies({
      ...base,
      enabled: false,
      blocksAccess: true,
    });
    assert.equal(invalid.blocksAccess, false);
  });

  it('inactive templates from defaultGuestDocuments are not signable', () => {
    const docs = defaultGuestDocuments();
    assert.equal(docs.length, 3);
    assert.ok(docs.every((d) => d.enabled === false));
    assert.equal(signableDocuments(docs).length, 0);
  });

  it('prefers disclaimer for legacy single contractSignature sync when active', () => {
    const docs = documentsFromGestion(
      {},
      {
        enabled: true,
        documentType: 'stay_contract',
        autoSendAfterRegistration: false,
        signerPolicy: 'primary_guest',
        establishmentNotice: '',
        logoUrl: '',
      } as never,
    );
    const signed = firstSignedContract(docs);
    assert.ok(signed);
    assert.equal(signed.kind, 'contract');
    assert.equal(documentTypeForGuestDocument(signed), 'stay_contract');
  });
});
