import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, 'ListingDocumentsTab.tsx'), 'utf8');

describe('ListingDocumentsTab formulaire police', () => {
  it('exposes Obligatoire on Formulaire police fields', () => {
    assert.match(source, /showRequired/);
    assert.match(source, />Obligatoire</);
    assert.match(source, /onToggleFormulaireRequired/);
    assert.match(source, /Ajouter le formulaire police au contrat/);
  });
});
