import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tab = fs.readFileSync(path.join(here, 'ListingRoomServiceTab.tsx'), 'utf8');
const rows = fs.readFileSync(path.join(here, 'ListingBreakfastFormulas.tsx'), 'utf8');

describe('Listing PDJ Inclus — formules éditables depuis l’onglet', () => {
  it('lets the PM create a formula inline (title, price, kitchen WhatsApp, description)', () => {
    assert.match(tab, /Nouvelle formule/);
    assert.match(tab, /newBreakfastFormulaBody\(/);
    assert.match(tab, /partnersApi\.createExperience\(/);
    assert.match(tab, /WhatsApp cuisine/);
  });
  it('lets the PM rename, price, illustrate and retire a formula', () => {
    assert.match(rows, /Nom de la formule/);
    assert.match(rows, /Prix MAD/);
    assert.match(rows, /uploadPartnerPhotos\(/);
    assert.match(rows, /MAX_FORMULA_PHOTOS/);
    assert.match(rows, /Retirer/);
    assert.match(tab, /updateExperience\(id, retireFormulaPatch\(dish\)\)/);
  });
  it('saves only what changed through one patch per formula', () => {
    assert.match(tab, /breakfastFormulaPatch\(dish, draft, sanitizeOptionGroups\)/);
    assert.doesNotMatch(tab, /sameDesc && sameOpts/);
  });
  it('splits PDJ Inclus and the paid Room service card into two tabs, like WhatsApp', () => {
    const shell = fs.readFileSync(path.join(here, '..', 'ListingFormShell.jsx'), 'utf8');
    const v2 = fs.readFileSync(path.join(here, '..', 'ListingFormV2.jsx'), 'utf8');
    assert.equal((shell.match(/id: 'room-service-card'/g) || []).length, 2);
    assert.match(v2, /mode=\{tabKey === 'room-service-card' \? 'card' : 'breakfast'\}/);
    assert.match(tab, /mode\?: 'breakfast' \| 'card'/);
    assert.match(tab, /Room service — carte payante/);
    assert.match(rows, /Inclus au petit déjeuner/);
  });
  it('keeps the paid card enabled on the listing when saving (WhatsApp Room service door)', () => {
    assert.match(tab, /const paidIds = isCard/);
    assert.match(tab, /new Set\(\[\.\.\.keptOther, \.\.\.included, \.\.\.paidIds\]\)/);
    assert.doesNotMatch(tab, /enabledExperienceIds: \[\.\.\.keptOther, \.\.\.included\]/);
  });
});
