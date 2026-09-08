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
});
