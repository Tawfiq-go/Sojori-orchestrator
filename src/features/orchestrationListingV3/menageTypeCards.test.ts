import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatTierRange,
  levelDurationsSubtitle,
  parseFrequencyTiers,
  real30j,
} from './menageTypeCards';
import type { BaremeViewState } from './menageBareme';

describe('parseFrequencyTiers', () => {
  it('paliers valides conservés', () => {
    assert.deepEqual(
      parseFrequencyTiers([
        { startDay: 1, endDay: 7, numberOfCleaning: 2 },
        { startDay: 8, endDay: 14, numberOfCleaning: 4 },
      ]),
      [
        { startDay: 1, endDay: 7, numberOfCleaning: 2 },
        { startDay: 8, endDay: 14, numberOfCleaning: 4 },
      ],
    );
  });

  it('entrées invalides filtrées, non-tableau → vide', () => {
    assert.deepEqual(
      parseFrequencyTiers([
        { startDay: 7, endDay: 1, numberOfCleaning: 2 },
        { startDay: 'x', endDay: 7, numberOfCleaning: 1 },
        null,
        { startDay: 1, endDay: 7, numberOfCleaning: 1 },
      ]),
      [{ startDay: 1, endDay: 7, numberOfCleaning: 1 }],
    );
    assert.deepEqual(parseFrequencyTiers(undefined), []);
    assert.deepEqual(parseFrequencyTiers({}), []);
  });
});

describe('formatTierRange', () => {
  it('plage et palier unique', () => {
    assert.equal(formatTierRange({ startDay: 1, endDay: 7, numberOfCleaning: 2 }), '1–7 nuits');
    assert.equal(formatTierRange({ startDay: 7, endDay: 7, numberOfCleaning: 2 }), '7 nuits');
  });
});

describe('real30j', () => {
  const rows: BaremeViewState = {
    kind: 'rows',
    windowDays: 30,
    rows: [
      {
        nature: 'cleaning_stay',
        level: 'normal',
        label: 'Recouche',
        count: 25,
        configuredMin: 15,
        avgRealMin: 14,
        minRealMin: 9,
        maxRealMin: 22,
      },
      {
        nature: 'cleaning_stay',
        level: 'grand',
        label: 'Recouche',
        count: 25,
        configuredMin: 30,
        avgRealMin: 45,
        minRealMin: 30,
        maxRealMin: 60,
      },
      {
        nature: 'cleaning_checkout',
        level: 'normal',
        label: 'Checkout',
        count: 4,
        configuredMin: 45,
        avgRealMin: 50,
        minRealMin: 40,
        maxRealMin: 60,
      },
    ],
  };

  it('écart ≤ 15 % → tone ok (✓)', () => {
    assert.deepEqual(real30j(rows, 'cleaning_stay', 'normal'), { avgMin: 14, tone: 'ok' });
  });

  it('écart > 15 % → tone ecart (valeur en or)', () => {
    assert.deepEqual(real30j(rows, 'cleaning_stay', 'grand'), { avgMin: 45, tone: 'ecart' });
  });

  it('trop peu de données → tone neutral', () => {
    assert.deepEqual(real30j(rows, 'cleaning_checkout', 'normal'), { avgMin: 50, tone: 'neutral' });
  });

  it('pas de ligne / pas de rows / chargement → null', () => {
    assert.equal(real30j(rows, 'cleaning_deep', 'normal'), null);
    assert.equal(real30j({ kind: 'empty', windowDays: 30 }, 'cleaning_stay', 'normal'), null);
    assert.equal(real30j(null, 'cleaning_stay', 'normal'), null);
  });
});

describe('levelDurationsSubtitle', () => {
  it('formate Normal · Grand', () => {
    assert.equal(
      levelDurationsSubtitle({ normal: { durationMinutes: 45 }, grand: { durationMinutes: 70 } }),
      'Normal 45 min · Grand 70 min',
    );
  });
});
