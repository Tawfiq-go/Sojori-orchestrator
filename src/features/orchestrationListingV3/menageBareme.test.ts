import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  baremeDeltaPct,
  baremeScaleMax,
  baremeVerdict,
  parseBaremeResponse,
  resolveBaremeView,
  type BaremeRow,
} from './menageBareme';

const row = (over: Partial<BaremeRow> = {}): BaremeRow => ({
  nature: 'cleaning_stay',
  level: 'normal',
  label: 'Recouche',
  count: 25,
  configuredMin: 15,
  avgRealMin: 14,
  minRealMin: 9,
  maxRealMin: 22,
  ...over,
});

describe('baremeVerdict', () => {
  it('écart ≤ 15 % → juste', () => {
    assert.deepEqual(baremeVerdict(row()), { kind: 'juste', deltaPct: -7 });
    assert.deepEqual(baremeVerdict(row({ avgRealMin: 17 })), { kind: 'juste', deltaPct: 13 });
  });

  it('écart > 15 % et count ≥ 20 → ecart signé', () => {
    assert.deepEqual(baremeVerdict(row({ avgRealMin: 20 })), { kind: 'ecart', deltaPct: 33 });
    assert.deepEqual(baremeVerdict(row({ avgRealMin: 10 })), { kind: 'ecart', deltaPct: -33 });
  });

  it('écart > 15 % mais 10 ≤ count < 20 → tendance', () => {
    assert.deepEqual(baremeVerdict(row({ avgRealMin: 20, count: 12 })), {
      kind: 'tendance',
      deltaPct: 33,
    });
  });

  it('count < 10 → insufficient, prioritaire sur tout', () => {
    assert.deepEqual(baremeVerdict(row({ count: 9, avgRealMin: 40 })), { kind: 'insufficient' });
  });

  it('configuré ou réel manquant → no_data', () => {
    assert.deepEqual(baremeVerdict(row({ configuredMin: null })), { kind: 'no_data' });
    assert.deepEqual(baremeVerdict(row({ avgRealMin: null })), { kind: 'no_data' });
    assert.deepEqual(baremeVerdict(row({ configuredMin: 0 })), { kind: 'no_data' });
  });
});

describe('baremeDeltaPct / baremeScaleMax', () => {
  it('delta arrondi signé', () => {
    assert.equal(baremeDeltaPct(15, 14), -7);
    assert.equal(baremeDeltaPct(15, 22), 47);
    assert.equal(baremeDeltaPct(0, 22), 0);
  });

  it('échelle = max des valeurs + 15 %', () => {
    assert.equal(baremeScaleMax(row()), 22 * 1.15);
    assert.equal(baremeScaleMax(row({ maxRealMin: null, avgRealMin: null })), 15 * 1.15);
    assert.equal(
      baremeScaleMax(row({ maxRealMin: null, avgRealMin: null, configuredMin: null })),
      1,
    );
  });
});

describe('parseBaremeResponse', () => {
  const nominal = {
    windowDays: 30,
    rows: [
      {
        nature: 'cleaning_checkout',
        level: 'grand',
        label: 'Checkout',
        count: 12,
        configuredMin: 45,
        avgRealMin: 51,
        minRealMin: 30,
        maxRealMin: 70,
      },
    ],
  };

  it('corps brut nominal', () => {
    const parsed = parseBaremeResponse(nominal);
    assert.equal(parsed?.windowDays, 30);
    assert.equal(parsed?.rows.length, 1);
    assert.equal(parsed?.rows[0].nature, 'cleaning_checkout');
    assert.equal(parsed?.rows[0].configuredMin, 45);
  });

  it('corps enveloppé { success, data }', () => {
    const parsed = parseBaremeResponse({ success: true, data: nominal });
    assert.equal(parsed?.rows.length, 1);
  });

  it('lignes invalides filtrées, valeurs hors-type nullées', () => {
    const parsed = parseBaremeResponse({
      windowDays: 30,
      rows: [
        { nature: 'cleaning_stay', level: 'normal', label: 'Recouche', count: 3, configuredMin: 'x' },
        { nature: 'autre_nature', level: 'normal' },
        null,
      ],
    });
    assert.equal(parsed?.rows.length, 1);
    assert.equal(parsed?.rows[0].configuredMin, null);
    assert.equal(parsed?.rows[0].avgRealMin, null);
  });

  it('corps invalide → null', () => {
    assert.equal(parseBaremeResponse(null), null);
    assert.equal(parseBaremeResponse({ success: true }), null);
    assert.equal(parseBaremeResponse('rows'), null);
  });
});

describe('resolveBaremeView (3 chemins réseau)', () => {
  it('nominal → rows', () => {
    const view = resolveBaremeView({
      ok: true,
      body: {
        windowDays: 30,
        rows: [
          {
            nature: 'cleaning_stay',
            level: 'normal',
            label: 'Recouche',
            count: 12,
            configuredMin: 15,
            avgRealMin: 14,
            minRealMin: 9,
            maxRealMin: 22,
          },
        ],
      },
    });
    assert.equal(view.kind, 'rows');
    if (view.kind === 'rows') assert.equal(view.rows.length, 1);
  });

  it('réponse vide → empty avec fenêtre', () => {
    const view = resolveBaremeView({ ok: true, body: { windowDays: 30, rows: [] } });
    assert.deepEqual(view, { kind: 'empty', windowDays: 30 });
  });

  it('404 backend pas déployé → unavailable', () => {
    assert.deepEqual(resolveBaremeView({ ok: false, status: 404 }), { kind: 'unavailable' });
  });

  it('autre erreur (500, réseau) → error', () => {
    assert.deepEqual(resolveBaremeView({ ok: false, status: 500 }), { kind: 'error' });
    assert.deepEqual(resolveBaremeView({ ok: false, status: null }), { kind: 'error' });
  });

  it('corps illisible → error', () => {
    assert.deepEqual(resolveBaremeView({ ok: true, body: { nope: true } }), { kind: 'error' });
  });
});
