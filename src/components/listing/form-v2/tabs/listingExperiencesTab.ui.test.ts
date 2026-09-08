import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf8');
const tab = read('ListingExperiencesTab.tsx');
const ambiances = read('ListingAmbiancesTab.tsx');

describe('Listing Expériences — same recipe as Options séjour', () => {
  it('folds payment, my experiences, shared catalogue and guest menus into sections', () => {
    for (const id of ['payment', 'mine', 'market', 'menus']) {
      assert.match(tab, new RegExp(`id="${id}"`), `section ${id}`);
    }
    assert.match(tab, /import \{ TabSection \} from '.\/tabSection'/);
    assert.match(ambiances, /import \{ TabSection \} from '.\/tabSection'/);
  });
  it('edits my experiences in place and creates one with a provider sheet', () => {
    assert.match(tab, /mode="ambiance"/);
    assert.match(tab, /kinds: \['experience'\]/);
    assert.match(tab, /formulesEditable: true/);
    assert.match(tab, /partnersApi\.list\(\{ ownerId: String\(listingOwnerId\), active: true \}\)/);
    assert.match(tab, /Fiche provider \(qui réalise l’expérience\)/);
    assert.match(tab, /partnerId: String\(partner\.id\)/);
    assert.match(tab, /kind: 'experience',/);
    assert.match(tab, /retireFormulaPatch\(exp\)/);
  });
  it('keeps the shared catalogue picker for market experiences and shuttles', () => {
    assert.match(tab, /<ListingExperiencesPicker/);
    assert.match(tab, /hideIntro/);
  });
  it('only rewrites my experience ids in enabledExperienceIds', () => {
    assert.match(tab, /filter\(\(id\) => !catalogIds\.has\(id\)\)/);
    assert.match(tab, /new Set\(\[\.\.\.keptOther, \.\.\.Array\.from\(enabledMine\)\]\)/);
  });
});
