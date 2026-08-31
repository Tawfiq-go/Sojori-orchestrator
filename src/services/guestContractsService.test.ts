// @ts-nocheck — node:test modules are excluded from the Vite client TS project, like other *.test.ts files.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_CONTRACT_SIGNATURE,
  parseContractSignature,
} from '../features/serviceMatrix/contractSignatureDefaults';
import { missingSigners, needsNewSigningVersion, pickContractForType } from './guestContractUi';

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

test('signed and finalizing contracts need a new signing version', () => {
  assert.equal(needsNewSigningVersion('signed'), true);
  assert.equal(needsNewSigningVersion('finalizing'), true);
  assert.equal(needsNewSigningVersion('ready'), false);
  assert.equal(needsNewSigningVersion('partially_signed'), false);
});

test('pickContractForType prefers the matching document in contracts[]', () => {
  const police = {
    id: 'p1',
    reservationId: 'r1',
    status: 'ready' as const,
    version: 2,
    documentType: 'moroccan_police_form',
    signerPolicy: 'each_traveler',
  };
  const stay = {
    id: 's1',
    reservationId: 'r1',
    status: 'signed' as const,
    version: 1,
    documentType: 'stay_contract',
    signerPolicy: 'primary_guest',
  };
  assert.equal(pickContractForType({ contract: stay, contracts: [stay, police] }, 'moroccan_police_form')?.id, 'p1');
  assert.equal(pickContractForType({ contract: stay }, 'stay_contract')?.id, 's1');
  assert.equal(pickContractForType(undefined, 'stay_contract'), null);
});
