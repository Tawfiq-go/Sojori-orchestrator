import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, 'ListingAmbiancesTab.tsx'), 'utf8');
const rows = fs.readFileSync(path.join(here, 'ListingBreakfastFormulas.tsx'), 'utf8');
const catalog = fs.readFileSync(path.join(here, 'stayOptionCatalog.ts'), 'utf8');
const shell = fs.readFileSync(path.join(here, '..', 'ListingFormShell.jsx'), 'utf8');

describe('Listing Options séjour', () => {
  it('keeps PDJ, Room service and Options séjour as their own sidebar tabs', () => {
    assert.match(shell, /id: 'room-service'/);
    assert.match(shell, /label: 'PDJ Inclus'/);
    assert.match(shell, /id: 'room-service-card'/);
    assert.match(shell, /id: 'stay-options'/);
    assert.match(shell, /label: 'Options séjour'/);
  });

  it('folds payment, beds, pool and ambiances into four collapsible sections', () => {
    for (const id of ['payment', 'beds', 'pool', 'ambiances']) {
      assert.match(source, new RegExp(`id="${id}"`), `section ${id}`);
    }
    assert.match(source, /<TabSection/);
    assert.match(source, /STAY_OPTION_POOL/);
    assert.match(source, /STAY_OPTION_BEDS/);
    assert.match(source, /paidPrivatePool/);
    assert.match(source, /paidBeds/);
    assert.match(source, /GuestPaymentMethodsField/);
    assert.match(source, /toggleBuilding\('beds'/);
    assert.match(catalog, /Piscine privée/);
    assert.match(catalog, /Beds piscine/);
    assert.doesNotMatch(source, /ListingRoomServiceTab/);
  });

  it('lets the PM edit pool and beds prices inline, saved on blur', () => {
    assert.match(source, /label="DH \/ jour"/);
    assert.match(source, /onBlur=/);
    assert.match(source, /privatePoolPricePerDayMad: p/);
  });

  it('edits ambiances in place: named formulas, photos, options, WhatsApp switch, create, retire', () => {
    assert.match(source, /mode="ambiance"/);
    assert.match(source, /kinds: \['villa_experience'\]/);
    assert.match(source, /formulesEditable: true/);
    assert.match(source, /newPartnerServiceBody\(/);
    assert.match(source, /kind: 'villa_experience'/);
    assert.match(source, /Nouvelle ambiance/);
    assert.match(source, /retireFormulaPatch\(dish\)/);
    assert.match(rows, /Proposée dans WhatsApp/);
    assert.match(rows, /\+ Formule/);
  });

  it('only rewrites the ambiance ids in enabledExperienceIds (PDJ, card, experiences untouched)', () => {
    assert.match(source, /filter\(\(id\) => !catalogIds\.has\(id\)\)/);
    assert.match(source, /new Set\(\[\.\.\.keptOther, \.\.\.Array\.from\(enabledAmbianceIds\)\]\)/);
  });
});
