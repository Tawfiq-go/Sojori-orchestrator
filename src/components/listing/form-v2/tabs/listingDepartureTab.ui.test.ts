import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tab = fs.readFileSync(path.join(here, 'ListingDepartureTab.tsx'), 'utf8');
const catalog = fs.readFileSync(path.join(here, 'departureGuestCatalog.ts'), 'utf8');
const shell = fs.readFileSync(path.join(here, '..', 'ListingFormShell.jsx'), 'utf8');

describe('Listing Instructions départ', () => {
  it('adds a sidebar tab next to Documents', () => {
    assert.match(shell, /id: 'departure'/);
    assert.match(shell, /label: 'Instructions départ'/);
    assert.match(tab, /departureGuestCatalog/);
    assert.match(catalog, /Sortir les poubelles/);
    assert.match(catalog, /Taxe de promotion touristique/);
  });

  it('defaults trash on and hotel taxes off until checked', () => {
    assert.match(catalog, /id: 'trash'/);
    assert.match(catalog, /enabled: true/);
    assert.match(catalog, /id: 'city_tax'/);
    assert.match(catalog, /id: 'tourism_promotion'/);
    assert.match(catalog, /amount: 15/);
    assert.match(catalog, /amount: 11/);
    assert.match(catalog, /enabled: false/);
  });
});
