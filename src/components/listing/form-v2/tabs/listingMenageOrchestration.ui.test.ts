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
    assert.match(card, /<ListingMenageTab listingId=\{String\(listingId\)\} embedded focus=\{focus\} \/>/);
    assert.match(card, /if \(canNavigate\)/);
    assert.doesNotMatch(card, /tab=menage/);
  });
  it('focuses each cleaning capability on its own type card', () => {
    const panels = read('../../../../features/serviceMatrix/CapabilityMatrixConfigPanels.tsx');
    assert.match(panels, /focus="stay"/);
    assert.match(panels, /focus="paid"/);
    assert.match(panels, /focus="checkout"/);
    assert.match(panels, /Ménage journalier \(hôtel \/ Multi\)/);
    assert.match(panels, /Contrôle mini-bar/);
    assert.match(cards, /focus\?: 'all' \| 'stay' \| 'paid' \| 'checkout'/);
    assert.match(cards, /showRecouche/);
    assert.match(cards, /showPaid/);
    assert.match(cards, /showCheckout/);
    assert.match(tab, /MenageEditorFocus/);
  });
  it('points journalier and mini-bar Contenu to the real editors', () => {
    const overview = read('../../../../features/orchestrationListingV3/OrchestrationOverviewPanel.tsx');
    assert.match(overview, /→ Ménage séjour/);
    assert.match(overview, /→ Extras mini-bar/);
  });
  it('keeps Contenu read-only and Éditer as the sole config opener', () => {
    const overview = read('../../../../features/orchestrationListingV3/OrchestrationOverviewPanel.tsx');
    assert.match(overview, /Suivi du vol/);
    assert.doesNotMatch(overview, /→ Expériences \(navette\)/);
    assert.match(overview, /Résumé du contenu — ouvrir Éditer pour configurer/);
    assert.match(overview, /ouvrir Éditer pour configurer/);
    // Éditer still opens the modal.
    assert.match(
      overview,
      /startIcon=\{<SettingsOutlinedIcon[\s\S]*?setConfigModal\(\{ capKey: r\.key, tab: 'gestion' \}\)/,
    );
    // Contenu cell is no longer clickable (no onClick next to the Contenu title).
    assert.doesNotMatch(
      overview,
      /Résumé du contenu[\s\S]{0,200}onClick=\{/,
    );
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
