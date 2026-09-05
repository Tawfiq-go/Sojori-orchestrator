import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, 'ListingDocumentsTab.tsx'), 'utf8');

describe('ListingDocumentsTab formulaire police', () => {
  it('exposes Afficher and Obligatoire tags plus optional client text', () => {
    assert.match(source, /showRequired/);
    assert.match(source, /label="Afficher"/);
    assert.match(source, /label="Obligatoire"/);
    assert.match(source, /onPatchFormulaireField/);
    assert.match(source, /Ajouter le formulaire police au contrat/);
    assert.match(source, /optionnel/);
    assert.match(source, /DEFAULT_OPTIONAL_FIELD_HELPERS/);
  });
});
