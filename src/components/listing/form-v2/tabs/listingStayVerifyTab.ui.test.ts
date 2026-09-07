import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { defaultStayVerify, normalizeStayVerify } from './stayVerifyCatalog';

const here = path.dirname(fileURLToPath(import.meta.url));
const tab = fs.readFileSync(path.join(here, 'ListingStayVerifyTab.tsx'), 'utf8');
const shell = fs.readFileSync(path.join(here, '..', 'ListingFormShell.jsx'), 'utf8');
const amenities = fs.readFileSync(path.join(here, 'DetailTabsAmenities.tsx'), 'utf8');

describe('Listing Vérifier logement', () => {
  it('adds a sidebar tab next to Documents', () => {
    assert.match(shell, /id: 'stay-verify'/);
    assert.match(shell, /label: 'Vérifier logement'/);
    assert.match(tab, /stayVerifyCatalog/);
    assert.match(tab, /Par personne/);
    assert.match(tab, /Sortie FDM/);
  });

  it('does not keep linen stock on the amenities tab', () => {
    assert.doesNotMatch(amenities, /physicalStock/);
    assert.doesNotMatch(amenities, /Stock à vérifier/);
  });

  it('defaults TV fixed and towels per person', () => {
    const cfg = defaultStayVerify();
    assert.equal(cfg.items.find((i) => i.id === 'tv')?.per, 'reservation');
    assert.equal(cfg.items.find((i) => i.id === 'towel_large')?.per, 'person');
    assert.equal(cfg.items.find((i) => i.id === 'bathrobe')?.per, 'adult');
    const next = normalizeStayVerify({ items: [{ id: 'tv', qty: 2 }] });
    assert.equal(next.items.find((i) => i.id === 'tv')?.qty, 2);
  });
});
