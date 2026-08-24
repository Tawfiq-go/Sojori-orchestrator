// @ts-nocheck — node:test modules are excluded from the Vite client TS project, like other *.test.ts files.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_CONTRACT_SIGNATURE,
  parseContractSignature,
} from '../features/serviceMatrix/contractSignatureDefaults';
import { missingSigners } from './guestContractUi';

test('contract signature config is disabled by default', () => {
  assert.equal(DEFAULT_CONTRACT_SIGNATURE.enabled, false);
  assert.equal(DEFAULT_CONTRACT_SIGNATURE.autoSendAfterRegistration, false);
  assert.equal(parseContractSignature(undefined).enabled, false);
  assert.equal(parseContractSignature(undefined).autoSendAfterRegistration, false);
  assert.equal(parseContractSignature({ enabled: true }).enabled, true);
  assert.equal(parseContractSignature({ enabled: true }).autoSendAfterRegistration, false);
  assert.equal(parseContractSignature({ autoSendAfterRegistration: true }).autoSendAfterRegistration, true);
  assert.equal(parseContractSignature({ signerPolicy: 'each_traveler' }).signerPolicy, 'each_traveler');
  assert.ok(parseContractSignature(undefined).establishmentNotice.length > 10);
  assert.equal(
    parseContractSignature({ establishmentNotice: '  Avis maison  ' }).establishmentNotice,
    'Avis maison',
  );
});

test('missingSigners returns every remaining traveler for dashboard link creation', () => {
  const missing = missingSigners({
    id: 'c1',
    reservationId: 'r1',
    status: 'partially_signed',
    version: 1,
    documentType: 'stay_contract',
    signerPolicy: 'each_traveler',
    missingSignerIds: ['traveler:1', 'traveler:2'],
    travelers: [
      { travelerIndex: 0, firstName: 'Ada', lastName: 'L', signerId: 'traveler:0' },
      { travelerIndex: 1, firstName: 'Bob', lastName: 'M', signerId: 'traveler:1' },
      { travelerIndex: 2, firstName: 'Cara', lastName: 'N', signerId: 'traveler:2' },
    ],
  });
  assert.equal(missing.length, 2);
  assert.deepEqual(
    missing.map(s => s.signerId),
    ['traveler:1', 'traveler:2'],
  );
});

test('missingSigners returns each remaining traveler', () => {
  const missing = missingSigners({
    id: 'c1',
    reservationId: 'r1',
    status: 'partially_signed',
    version: 1,
    documentType: 'stay_contract',
    signerPolicy: 'each_traveler',
    missingSignerIds: ['traveler:1'],
    travelers: [
      { travelerIndex: 0, firstName: 'Ada', lastName: 'L', signerId: 'traveler:0' },
      { travelerIndex: 1, firstName: 'Bob', lastName: 'M', signerId: 'traveler:1' },
    ],
  });
  assert.equal(missing.length, 1);
  assert.equal(missing[0].signerId, 'traveler:1');
});
