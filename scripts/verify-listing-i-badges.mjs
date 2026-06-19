#!/usr/bin/env node
/**
 * Vérifie badge I (resolveRuImportedFields) vs données API listing.
 * Usage: node scripts/verify-listing-i-badges.mjs <listingId> [apiBase]
 */
import { readFileSync } from 'fs';
import { resolveRuImportedFields } from '../src/utils/resolveRuImportedFields.ts';
import { mapApiToFormV2Values } from '../src/utils/listingFormV2ApiAdapter.ts';

const listingId = process.argv[2];
const apiBase = process.argv[3] || 'https://dev.sojori.com';

if (!listingId) {
  console.error('Usage: node scripts/verify-listing-i-badges.mjs <listingId>');
  process.exit(1);
}

const FIELDS = [
  'pickupService',
  'transport',
  'zoneDescription',
  'center',
  'howToArrive',
  'ruLateArrivalFees',
  'ruEarlyDepartureFees',
  'paymentMethods',
  'longStayDiscounts',
  'lastMinuteDiscount',
];

const res = await fetch(`${apiBase}/api/v1/listing/listings/by-id/${listingId}`);
const payload = await res.json();
const raw = payload?.listing;
if (!raw) {
  console.error('Listing not found or API error', res.status);
  process.exit(1);
}

const form = mapApiToFormV2Values(raw);
const badges = resolveRuImportedFields(form);

console.log(`Listing: ${raw.name} (${listingId})`);
console.log(`rentalUnitedIds: ${JSON.stringify(raw.rentalUnitedIds)}`);
console.log(`ruImportedFields snapshot: ${(raw.ruImportedFields || []).length} keys\n`);

for (const f of FIELDS) {
  console.log(`${f.padEnd(22)} ${badges.has(f) ? 'I' : '-'}`);
}

console.log('\nHydrated samples:');
console.log('  pickup:', form.pickupService?.[0]?.value?.slice(0, 80) || '(empty)');
console.log('  transport:', form.transport?.descriptions?.[0]?.en?.slice(0, 80) || '(empty)');
console.log('  late fees:', (form.ruLateArrivalFees || []).length, 'rows');
console.log('  early fees:', (form.ruEarlyDepartureFees || []).length, 'rows');
