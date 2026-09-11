import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf8');
const shell = read('../ListingFormShell.jsx');
const tab = read('ListingDocumentsTab.tsx');
const card = read('../../../../features/serviceMatrix/DocumentsContentRedirectCard.tsx');
const panels = read('../../../../features/serviceMatrix/CapabilityMatrixConfigPanels.tsx');
const toggles = read('../../../../features/serviceMatrix/RegistrationPolicyToggles.tsx');

describe('Documents live in Orchestration without bounce-out', () => {
  it('keeps a Documents tab that opens the same editor as Orchestration', () => {
    assert.equal((shell.match(/id: 'documents'/g) || []).length, 2);
  });

  it('edits documents inside the V3 orchestration page instead of redirecting', () => {
    assert.match(card, /<ListingDocumentsTab listingId=\{String\(listingId\)\} embedded \/>/);
    assert.match(card, /if \(canNavigate\)/);
    assert.doesNotMatch(card, /tab=documents/);
    assert.doesNotMatch(card, /Ouvrir l&apos;onglet Documents/);
  });

  it('embeds without the listing page title', () => {
    assert.match(tab, /embedded\?: boolean/);
    assert.match(tab, /!embedded &&/);
    assert.match(tab, /p: embedded \? 0/);
  });

  it('keeps global registration policy distinct from per-document flags', () => {
    assert.match(panels, /RegistrationPolicyToggles/);
    assert.match(panels, /DocumentsContentRedirectCard/);
    assert.match(toggles, /Politique d&apos;enregistrement \(globale\)/);
    assert.match(tab, /Interrupteurs de ce document seulement/);
  });
});
