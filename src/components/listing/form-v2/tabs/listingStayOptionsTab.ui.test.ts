import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, 'ListingAmbiancesTab.tsx'), 'utf8');
const catalog = fs.readFileSync(path.join(here, 'stayOptionCatalog.ts'), 'utf8');
const shell = fs.readFileSync(path.join(here, '..', 'ListingFormShell.jsx'), 'utf8');

describe('Listing Options séjour', () => {
  it('keeps PDJ as its own sidebar tab', () => {
    assert.match(shell, /id: 'room-service'/);
    assert.match(shell, /label: 'PDJ Inclus'/);
    assert.match(shell, /id: 'stay-options'/);
    assert.match(shell, /label: 'Options séjour'/);
  });

  it('manages ambiances, pool and beds on the same Options séjour tab', () => {
    assert.match(source, /kindFilter="villa_experience"/);
    assert.match(source, /STAY_OPTION_POOL/);
    assert.match(source, /STAY_OPTION_BEDS/);
    assert.match(source, /paidPrivatePool/);
    assert.match(source, /paidBeds/);
    assert.match(catalog, /Piscine privée/);
    assert.match(catalog, /Beds piscine/);
    assert.doesNotMatch(source, /ListingRoomServiceTab/);
  });
});
