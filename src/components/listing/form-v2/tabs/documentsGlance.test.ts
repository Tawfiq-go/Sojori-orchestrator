import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GuestDocument } from '../../../../features/guestDocuments';
import { documentGlanceRow, documentsGlance } from './documentsGlance';

function doc(over: Partial<GuestDocument>): GuestDocument {
  return {
    id: 'd',
    kind: 'contract',
    name: 'Disclaimer séjour',
    title: '',
    content: '',
    clauses: [],
    closing: '',
    notice: '',
    enabled: true,
    requiresSignature: true,
    requiredBeforeArrival: false,
    blocksAccess: false,
    includeFormulaire: false,
    autoSendAfterRegistration: false,
    signerPolicy: 'primary_guest',
    fieldKeys: [],
    ...over,
  } as GuestDocument;
}

describe('documents glance rail', () => {
  it('describes an active police form by its fields and sending mode', () => {
    const row = documentGlanceRow(
      doc({ kind: 'police_form', name: 'Fiche de police', fieldKeys: ['a', 'b', 'c'], autoSendAfterRegistration: true, requiresSignature: true }),
    );
    assert.equal(row.tone, 'ok');
    assert.equal(row.status, 'active · 3 champs · envoi après enregistrement');
  });

  it('flags an enabled document with nothing configured as incomplete', () => {
    const police = documentGlanceRow(doc({ kind: 'police_form', fieldKeys: [] }));
    assert.equal(police.tone, 'warn');
    assert.deepEqual(police.missing, ['aucun champ']);
    const contract = documentGlanceRow(doc({ clauses: [] }));
    assert.equal(contract.tone, 'warn');
    assert.deepEqual(contract.missing, ['aucune clause'].map((m) => m.replace('aucune', 'aucun')));
  });

  it('describes a contract by clauses, signer and timing', () => {
    const row = documentGlanceRow(
      doc({
        kind: 'short_term_rental',
        name: 'Contrat LCD',
        clauses: Array.from({ length: 16 }, (_, i) => ({ id: `c${i}`, title: `Art ${i}`, bodyFr: 'x', bodyEn: 'x' })) as GuestDocument['clauses'],
        requiredBeforeArrival: true,
        signerPolicy: 'primary_guest',
      }),
    );
    assert.equal(row.tone, 'ok');
    assert.equal(row.status, '16 articles · signature voyageur principal · avant l’arrivée');
  });

  it('greys out a disabled document and counts what is left to sign', () => {
    const g = documentsGlance([
      doc({ id: 'a', enabled: false }),
      doc({ id: 'b', clauses: [{ id: 'c', title: 't', bodyFr: 'x', bodyEn: 'x' }] as GuestDocument['clauses'] }),
      doc({ id: 'c', kind: 'police_form', fieldKeys: ['x'], requiresSignature: true }),
    ]);
    assert.equal(g.rows[0].tone, 'off');
    assert.equal(g.rows[0].status, 'désactivé');
    assert.equal(g.toSign, 2);
    assert.equal(g.incomplete, 0);
  });
});
