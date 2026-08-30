import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultGuestDocuments, documentTypeForGuestDocument } from './catalog';
import { firstSignedContract, parseGuestDocument, signableDocuments } from './parse';

describe('guestDocuments dual web signature', () => {
  it('defaults both police and disclaimer to Actif + Signature web', () => {
    const docs = defaultGuestDocuments();
    assert.equal(docs.length, 2);
    assert.equal(docs[0].kind, 'police_form');
    assert.equal(docs[0].enabled, true);
    assert.equal(docs[0].requiresSignature, true);
    assert.equal(docs[1].kind, 'contract');
    assert.equal(docs[1].enabled, true);
    assert.equal(docs[1].requiresSignature, true);
    assert.deepEqual(
      signableDocuments(docs).map((d) => documentTypeForGuestDocument(d)),
      ['moroccan_police_form', 'stay_contract'],
    );
  });

  it('prefers disclaimer for legacy single contractSignature sync', () => {
    const docs = defaultGuestDocuments();
    const signed = firstSignedContract(docs);
    assert.ok(signed);
    assert.equal(signed.kind, 'contract');
  });

  it('parses a stored police form with signature web', () => {
    const doc = parseGuestDocument({
      id: 'doc_police_form',
      kind: 'police_form',
      name: 'Fiche',
      title: 'Fiche',
      enabled: true,
      requiresSignature: true,
      fieldKeys: ['first_name', 'profession'],
    });
    assert.ok(doc);
    assert.equal(doc.requiresSignature, true);
    assert.equal(documentTypeForGuestDocument(doc), 'moroccan_police_form');
  });
});
