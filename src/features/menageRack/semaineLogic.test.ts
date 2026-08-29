/**
 * Semaine ménage — tests node:test de la logique pure (npx tsx --test).
 * Formats d'en-tête, ratio %, mapping cellules, ligne bloquée 7 jours,
 * fusion multi-listings, et les 3 chemins réseau.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSemaineGrid,
  dayHeaderLabel,
  dayLoadLabel,
  dayLoadMin,
  dayLoadPct,
  formatCredits,
  mergeSemaineData,
  resolveSemaineFetch,
  weekTitle,
  type SemaineCell,
  type SemaineData,
  type SemaineDay,
} from './semaineLogic';

function cell(partial: Partial<SemaineCell> & Pick<SemaineCell, 'villaId'>): SemaineCell {
  return { kind: 'stay', menage: null, blocked: false, ...partial };
}

function day(partial: Partial<SemaineDay> & Pick<SemaineDay, 'ymd'>): SemaineDay {
  return {
    capacityMin: 900,
    fdmCount: 3,
    chargeMin: 0,
    assignedMin: 0,
    doneMin: 0,
    loadRatio: null,
    tension: false,
    cells: [],
    ...partial,
  };
}

function data(partial: Partial<SemaineData>): SemaineData {
  return {
    start: '2026-08-29',
    villas: [],
    days: [],
    totals: { chargeMin: 0, capacityMin: 0, tensionDays: 0 },
    ...partial,
  };
}

describe('formats d’en-tête', () => {
  it('dayHeaderLabel : « Sam 29 » (jour fr abrégé)', () => {
    assert.equal(dayHeaderLabel('2026-08-29'), 'Sam 29');
    assert.equal(dayHeaderLabel('2026-08-31'), 'Lun 31');
    assert.equal(dayHeaderLabel('2026-09-01'), 'Mar 1');
  });

  it('formatCredits : milliers séparés (« 1 020 »)', () => {
    assert.equal(formatCredits(1020), '1 020');
    assert.equal(formatCredits(900), '900');
    assert.equal(formatCredits(0), '0');
    assert.equal(formatCredits(285.4), '285');
  });

  it('dayLoadLabel : charge totale (à faire + assigné) / capacité', () => {
    assert.equal(dayLoadLabel(day({ ymd: 'x', chargeMin: 120, assignedMin: 45, capacityMin: 900 })), '165 / 900');
    assert.equal(dayLoadLabel(day({ ymd: 'x', chargeMin: 800, assignedMin: 220, capacityMin: 900 })), '1 020 / 900');
  });

  it('dayLoadPct : borné 0..100, capacité nulle gérée', () => {
    assert.equal(dayLoadPct(day({ ymd: 'x', chargeMin: 450, capacityMin: 900 })), 50);
    assert.equal(dayLoadPct(day({ ymd: 'x', chargeMin: 1200, capacityMin: 900 })), 100);
    assert.equal(dayLoadPct(day({ ymd: 'x', chargeMin: 50, capacityMin: 0 })), 100);
    assert.equal(dayLoadPct(day({ ymd: 'x', capacityMin: 0 })), 0);
    assert.equal(dayLoadMin(day({ ymd: 'x', chargeMin: 30, assignedMin: 15 })), 45);
  });

  it('weekTitle : « 27 août au 2 septembre » (mois omis s’il ne change pas)', () => {
    assert.equal(
      weekTitle([{ ymd: '2026-08-27' }, { ymd: '2026-09-02' }]),
      '27 août au 2 septembre',
    );
    assert.equal(weekTitle([{ ymd: '2026-09-01' }, { ymd: '2026-09-07' }]), '1 au 7 septembre');
    assert.equal(weekTitle([{ ymd: '2026-08-29' }]), '29 août');
    assert.equal(weekTitle([]), '');
  });
});

describe('mapping grille', () => {
  it('villas × jours : cases retrouvées par villaId, absentes → null', () => {
    const grid = buildSemaineGrid({
      villas: [
        { id: 'v1', title: 'Villa 01' },
        { id: 'v2', title: 'Villa 02' },
      ],
      days: [
        day({ ymd: '2026-08-29', cells: [
          cell({ villaId: 'v1', kind: 'turnover', menage: { label: 'À blanc', creditsMin: 60, state: 'a_assigner' } }),
          cell({ villaId: 'v2' }),
        ] }),
        day({ ymd: '2026-08-30', cells: [cell({ villaId: 'v2', menage: { label: 'Recouche', creditsMin: 30, state: 'assigne' } })] }),
      ],
    });
    assert.equal(grid.length, 2);
    assert.equal(grid[0].cells[0]?.menage?.label, 'À blanc');
    assert.equal(grid[0].cells[1], null); // v1 absent du jour 2
    assert.equal(grid[1].cells[1]?.menage?.state, 'assigne');
    assert.equal(grid[0].blockedAll, false);
  });

  it('villa bloquée 7 jours sans ménage → une seule case (blockedAll)', () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      day({ ymd: `2026-09-0${i + 1}`, cells: [cell({ villaId: 'hs', blocked: true })] }),
    );
    const grid = buildSemaineGrid({ villas: [{ id: 'hs', title: 'Villa 04' }], days });
    assert.equal(grid[0].blockedAll, true);
  });

  it('bloquée un seul jour → pas blockedAll', () => {
    const grid = buildSemaineGrid({
      villas: [{ id: 'v', title: 'V' }],
      days: [
        day({ ymd: '2026-09-01', cells: [cell({ villaId: 'v', blocked: true })] }),
        day({ ymd: '2026-09-02', cells: [cell({ villaId: 'v' })] }),
      ],
    });
    assert.equal(grid[0].blockedAll, false);
  });
});

describe('fusion multi-listings', () => {
  it('jours réunis par ymd : charges sommées, capacité = max, tension recalculée', () => {
    const merged = mergeSemaineData([
      data({
        villas: [{ id: 'a:1', title: 'A1' }],
        days: [day({ ymd: '2026-08-29', chargeMin: 500, capacityMin: 900, cells: [cell({ villaId: 'a:1' })] })],
      }),
      data({
        villas: [{ id: 'b:1', title: 'B1' }],
        days: [day({ ymd: '2026-08-29', chargeMin: 450, assignedMin: 60, capacityMin: 900, cells: [cell({ villaId: 'b:1' })] })],
      }),
    ]);
    assert.ok(merged);
    assert.equal(merged?.villas.length, 2);
    assert.equal(merged?.days.length, 1);
    const d0 = merged?.days[0];
    assert.equal(d0?.chargeMin, 950);
    assert.equal(d0?.assignedMin, 60);
    assert.equal(d0?.capacityMin, 900); // max, pas la somme — même équipe
    assert.equal(d0?.tension, true); // 1010 > 900
    assert.equal(d0?.cells.length, 2);
    assert.equal(merged?.totals.tensionDays, 1);
    assert.equal(merged?.totals.chargeMin, 1010);
  });

  it('un seul listing → données inchangées', () => {
    const d = data({ villas: [{ id: 'x', title: 'X' }] });
    assert.equal(mergeSemaineData([d]), d);
  });
});

describe('les 3 chemins réseau', () => {
  const okData = data({
    villas: [{ id: 'v', title: 'V' }],
    days: [day({ ymd: '2026-08-29' })],
  });

  it('nominal → ok', () => {
    const r = resolveSemaineFetch([
      { ok: true, data: okData },
      { ok: false, notFound: false },
    ]);
    assert.equal(r.state, 'ok');
  });

  it('vide : succès sans villas → empty', () => {
    assert.equal(resolveSemaineFetch([{ ok: true, data: data({}) }]).state, 'empty');
  });

  it('404 partout → unavailable ; échec non-404 / aucun résultat → error', () => {
    assert.equal(
      resolveSemaineFetch([
        { ok: false, notFound: true },
        { ok: false, notFound: true },
      ]).state,
      'unavailable',
    );
    assert.equal(resolveSemaineFetch([{ ok: false, notFound: false }]).state, 'error');
    assert.equal(resolveSemaineFetch([]).state, 'error');
  });
});
