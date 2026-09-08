import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activeBreakfastDishes,
  breakfastFormulaPatch,
  retireFormulaPatch,
  formulaPriceMad,
  newBreakfastFormulaBody,
  normalizeWhatsapp,
} from './breakfastFormulaHelpers';

const dish = {
  id: 'd1',
  ownerId: 'o1',
  partnerId: null,
  category: 'Food',
  kind: 'room_service' as const,
  title: 'Beldi',
  description: 'Msemen, amlou',
  photos: [],
  formules: [{ label: 'Beldi', priceMad: 320 }],
  optionGroups: [],
  keywords: [],
  active: true,
  sortOrder: 0,
};

describe('PDJ Inclus — formules', () => {
  it('builds a valid create body and refuses missing title or bad whatsapp', () => {
    const ok = newBreakfastFormulaBody({ ownerId: 'o1', title: ' Fassi ', priceMad: 250.4, whatsapp: '00212 6 62 11 31 93' });
    assert.ok(!('error' in ok));
    if ('error' in ok) return;
    assert.equal(ok.title, 'Fassi');
    assert.equal(ok.kind, 'room_service');
    assert.equal(ok.category, 'Food');
    assert.equal(ok.whatsapp, '+212662113193');
    assert.deepEqual(ok.formules, [{ label: 'Fassi', priceMad: 250 }]);
    assert.equal(ok.active, true);
    assert.ok('error' in newBreakfastFormulaBody({ ownerId: 'o1', title: ' ', priceMad: 1, whatsapp: '+212662113193' }));
    assert.ok('error' in newBreakfastFormulaBody({ ownerId: 'o1', title: 'X', priceMad: 1, whatsapp: '06' }));
    assert.ok('error' in newBreakfastFormulaBody({ ownerId: 'o1', title: 'X', priceMad: -5, whatsapp: '+212662113193' }));
  });

  it('normalizes whatsapp to E.164-like digits', () => {
    assert.equal(normalizeWhatsapp('+212 662-113193'), '+212662113193');
    assert.equal(normalizeWhatsapp('212662113193'), '+212662113193');
    assert.equal(normalizeWhatsapp(''), '');
  });

  it('computes a patch only for what changed (title follows the first formula label)', () => {
    const same = breakfastFormulaPatch(dish, { id: 'd1', title: 'Beldi', description: 'Msemen, amlou', priceMad: 320, photos: [], optionGroups: [] }, (g) => g);
    assert.equal(same, null);
    const renamed = breakfastFormulaPatch(dish, { id: 'd1', title: 'Beldi royal', description: 'Msemen, amlou', priceMad: 350, photos: ['https://x/1.jpg'], optionGroups: [] }, (g) => g);
    assert.deepEqual(renamed, {
      title: 'Beldi royal',
      formules: [{ label: 'Beldi royal', priceMad: 350 }],
      photos: ['https://x/1.jpg'],
    });
    assert.equal(formulaPriceMad(dish), 320);
  });

  it('hides retired formulas from the catalog', () => {
    const rows = [dish, { ...dish, id: 'd2', active: false }, { ...dish, id: 'd3', kind: 'experience' as const }];
    assert.deepEqual(activeBreakfastDishes(rows).map((r) => r.id), ['d1']);
  });

  it('strips seeded extra keys (title…) from formules so the PUT passes Joi', () => {
    const dish = {
      id: 'd1',
      title: 'Fassi',
      description: '',
      kind: 'room_service',
      formules: [{ label: 'Fassi', priceMad: 0, title: 'Fassi', extra: 1 }],
      optionGroups: [],
      photos: [],
    } as unknown as PartnerService;
    const patch = breakfastFormulaPatch(
      dish,
      { id: 'd1', title: 'Fassi (test)', description: '', priceMad: 0, photos: [], optionGroups: [] },
      (g) => g,
    );
    assert.deepEqual(patch?.formules, [{ label: 'Fassi (test)', priceMad: 0 }]);
  });

  it('backfills the category on seeded formulas that have none (Mongoose requires it)', () => {
    const dish = {
      id: 'd2',
      title: 'Beldi',
      description: 'x',
      kind: 'room_service',
      formules: [{ label: 'Beldi', priceMad: 0 }],
      optionGroups: [],
      photos: [],
    } as unknown as PartnerService;
    const unchanged = breakfastFormulaPatch(
      dish,
      { id: 'd2', title: 'Beldi', description: 'x', priceMad: 0, photos: [], optionGroups: [] },
      (g) => g,
    );
    assert.equal(unchanged, null);
    const renamed = breakfastFormulaPatch(
      dish,
      { id: 'd2', title: 'Beldi +', description: 'x', priceMad: 0, photos: [], optionGroups: [] },
      (g) => g,
    );
    assert.equal(renamed?.category, 'Food');
  });

  it('retires with active=false and backfills category when missing', () => {
    assert.deepEqual(retireFormulaPatch({ category: 'Food' }), { active: false });
    assert.deepEqual(retireFormulaPatch({ category: '' }), { active: false, category: 'Food' });
  });
});
