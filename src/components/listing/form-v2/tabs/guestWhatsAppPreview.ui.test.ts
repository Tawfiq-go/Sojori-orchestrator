import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { GuestPreview } from '../../../../services/guestPreviewApi';
import { FOCUS_CODES, doorSummary } from './guestPreviewText';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf8');

function preview(over: Partial<GuestPreview['doors']> = {}): GuestPreview {
  return {
    listingId: 'l',
    listingName: 'L',
    lang: 'fr',
    phase: 'pre_arrival',
    menu: { lang: 'fr', header: '', body: '', button: '', footer: '', rows: [] },
    doors: {
      breakfast: { on: true, formulas: 6 },
      paidCard: { on: true, dishes: 11 },
      stayOptions: { ambiances: 4, privatePool: true, beds: true },
      experiences: { on: true, count: 10 },
      transport: { on: false, count: 0 },
      cleaning: { cadence: { always: true, everyNDays: 1 }, recouche: true, intro: 'Décidez…', flow: 'timeslots' },
      ...over,
    },
  };
}

describe('Ce que le voyageur voit (aperçu WhatsApp)', () => {
  it('describes each door in the guest’s words', () => {
    const p = preview();
    assert.match(doorSummary(p, 'breakfast')[0], /6 formules/);
    assert.match(doorSummary(p, 'card')[0], /11 plats/);
    assert.match(doorSummary(p, 'stay')[0], /4 ambiances · piscine privée · beds piscine/);
    assert.match(doorSummary(p, 'experiences').join(' '), /10 proposées.*Pas de bouton « Navette »/);
    assert.match(doorSummary(p, 'cleaning').join(' '), /tous les jours.*Décidez.*créneaux/);
    assert.match(doorSummary(preview({ breakfast: { on: false, formulas: 0 } }), 'breakfast')[0], /Aucune porte/);
  });
  it('highlights the menu rows of the rubric', () => {
    assert.deepEqual(FOCUS_CODES.stay, ['O']);
    assert.deepEqual(FOCUS_CODES.experiences, ['J', 'J1']);
  });
  it('is wired into PDJ / Room service, Options séjour, Expériences and Ménage', () => {
    assert.match(read('ListingRoomServiceTab.tsx'), /focus=\{isCard \? 'card' : 'breakfast'\}/);
    assert.match(read('ListingAmbiancesTab.tsx'), /focus="stay"/);
    assert.match(read('ListingExperiencesTab.tsx'), /focus="experiences"/);
    assert.match(read('ListingMenageTab.tsx'), /focus="cleaning"/);
    assert.match(read('../../../../services/guestPreviewApi.ts'), /\/debug\/listings\/\$\{encodeURIComponent\(listingId\)\}\/guest-preview/);
  });
});
