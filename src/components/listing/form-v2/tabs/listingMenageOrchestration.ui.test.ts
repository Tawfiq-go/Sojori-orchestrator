import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf8');
const shell = read('../ListingFormShell.jsx');
const hub = read('../../../../features/listing/components/ConfigOrchestration/CleaningHubTab.tsx');
const cards = read('../../../../features/orchestrationListingV3/V3MenageTypeCards.tsx');
const types = read('../../../../features/listing/components/ConfigOrchestration/menageOpsTypes.ts');
const tab = read('ListingMenageTab.tsx');

describe('Ménage lives in Orchestration only', () => {
  it('keeps a Ménage and an Instructions départ tab that open the same editors as Orchestration', () => {
    assert.equal((shell.match(/id: 'menage'/g) || []).length, 2);
    assert.equal((shell.match(/id: 'departure'/g) || []).length, 2);
    assert.match(shell, /id: 'cleaning-config'/);
    assert.match(shell, /id: 'messages-config'/);
  });
  it('edits the cleaning content inside the V3 orchestration page instead of redirecting', () => {
    const card = read('../../../../features/serviceMatrix/MenageContentRedirectCard.tsx');
    assert.match(card, /<ListingMenageTab listingId=\{String\(listingId\)\} embedded \/>/);
    assert.match(card, /if \(canNavigate\)/);
  });
  it('opens Orchestration → Ménage on types, team and scale', () => {
    assert.match(hub, /id: 'types', label: 'Types, équipe & barème'/);
    assert.match(hub, /<ListingMenageTab listingId=\{listingId\} embedded \/>/);
    assert.match(hub, /useState<HubTab>\('types'\)/);
  });
  it('lets a hotel set the included cadence per room type', () => {
    assert.match(cards, /Par type de chambre \(hôtel\)/);
    assert.match(cards, /Comme l’hôtel/);
    assert.match(cards, /byRoomType/);
    assert.match(types, /byRoomType\?: Record<string, CleaningCadence>/);
    assert.match(types, /normalizeCadenceByRoomType\(t\.byRoomType \?\? fbTrack\.byRoomType\) \?\? null/);
  });
  it('tells the PM what the guest sees', () => {
    assert.match(tab, /Ce que le voyageur voit/);
    assert.match(read('cleaningGuestPreview.ts'), /export function cleaningGuestPreview/);
  });
});
