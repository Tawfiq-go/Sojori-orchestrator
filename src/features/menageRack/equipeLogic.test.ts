/**
 * Équipe ménage — tests node:test de la logique pure (npx tsx --test).
 * Capacité (clamp, semaine, patch optimiste), jours travaillés, salaires,
 * « le trou » depuis la Semaine, fusion multi-listings, 3 chemins réseau.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAPACITY_DEFAULT,
  applyCapacityPatch,
  clampCapacity,
  dayFullName,
  holeFromSemaine,
  hoursLabel,
  mergeEquipeData,
  payLabel,
  resolveEquipeFetch,
  waLink,
  weekCapacityMin,
  workDayFlags,
  type EquipeData,
  type EquipeRow,
} from './equipeLogic';

function row(partial: Partial<EquipeRow> & Pick<EquipeRow, 'id' | 'name'>): EquipeRow {
  return {
    phone: '+212600000000',
    lang: 'darija',
    taskTypes: ['cleaning_free'],
    workDays: [1, 2, 3, 4, 5],
    hourStart: '09:00',
    hourEnd: '18:00',
    payMode: 'unknown',
    amount: 0,
    capacityMin: 300,
    presence: [true, true, true, true, true, false, false],
    ...partial,
  };
}

function data(partial: Partial<EquipeData>): EquipeData {
  return { ymds: [], rows: [], days: [], ...partial };
}

describe('capacité', () => {
  it('clampCapacity : borné 30–720 comme le serveur, entier, défaut si invalide', () => {
    assert.equal(clampCapacity(240), 240);
    assert.equal(clampCapacity(10), 30);
    assert.equal(clampCapacity(9000), 720);
    assert.equal(clampCapacity(240.6), 241);
    assert.equal(clampCapacity(Number.NaN), CAPACITY_DEFAULT);
  });

  it('weekCapacityMin : somme des capacités jour', () => {
    assert.equal(
      weekCapacityMin([{ capacityMin: 900 }, { capacityMin: 600 }, { capacityMin: 0 }]),
      1500,
    );
    assert.equal(weekCapacityMin([]), 0);
  });

  it('applyCapacityPatch : optimiste — nouveau tableau, seule la personne visée change', () => {
    const rows = [row({ id: 'a', name: 'Amina' }), row({ id: 'b', name: 'Fatima' })];
    const next = applyCapacityPatch(rows, 'b', 240);
    assert.notEqual(next, rows); // nouveau tableau → l'ancien sert de rollback
    assert.equal(rows[1].capacityMin, 300); // l'original est intact
    assert.equal(next[1].capacityMin, 240);
    assert.equal(next[0].capacityMin, 300);
    // Le clamp s'applique aussi à l'optimiste (cohérent avec le serveur).
    assert.equal(applyCapacityPatch(rows, 'a', 9999)[0].capacityMin, 720);
  });
});

describe('jours travaillés & formats', () => {
  it('workDayFlags : ISO 1..7 → L·M·M·J·V·S·D, 0 toléré = dimanche', () => {
    assert.deepEqual(workDayFlags([1, 2, 3, 4, 5]), [true, true, true, true, true, false, false]);
    assert.deepEqual(workDayFlags([6, 7]), [false, false, false, false, false, true, true]);
    assert.deepEqual(workDayFlags([0]), [false, false, false, false, false, false, true]);
    assert.deepEqual(workDayFlags([]), new Array(7).fill(false));
  });

  it('payLabel : affiché tel quel, « Non connu » sans calcul', () => {
    assert.equal(payLabel('per_task', 50), '50 MAD / ménage');
    assert.equal(payLabel('hourly', 25), '25 MAD / h');
    assert.equal(payLabel('monthly', 3000), '3000 MAD / mois');
    assert.equal(payLabel('unknown', 3000), 'Non connu');
    assert.equal(payLabel('monthly', 0), 'Non connu');
  });

  it('hoursLabel / dayFullName / waLink', () => {
    assert.equal(hoursLabel('09:00', '18:00'), '9h – 18h');
    assert.equal(hoursLabel('09:30', '17:45'), '9h30 – 17h45');
    assert.equal(hoursLabel('', '18:00'), '—');
    assert.equal(dayFullName('2026-08-29'), 'samedi');
    assert.equal(waLink('+212 6 61 22 33 44'), 'https://wa.me/212661223344');
    assert.equal(waLink('12'), null);
  });
});

describe('le trou (depuis la Semaine)', () => {
  const day = (ymd: string, charge: number, cap: number, tension = charge > cap) => ({
    ymd,
    chargeMin: charge,
    assignedMin: 0,
    capacityMin: cap,
    tension,
  });

  it('pire jour en tension : charge − capacité maximum', () => {
    const hole = holeFromSemaine([
      day('2026-08-28', 340, 900),
      day('2026-08-29', 1020, 900), // +120
      day('2026-08-30', 700, 600), // +100
    ]);
    assert.deepEqual(hole, { ymd: '2026-08-29', missingMin: 120 });
  });

  it('aucun débordement → null', () => {
    assert.equal(holeFromSemaine([day('2026-08-28', 340, 900)]), null);
    assert.equal(holeFromSemaine([]), null);
  });
});

describe('fusion multi-listings', () => {
  it('personnes dédupliquées par id, jours réunis par ymd (max)', () => {
    const merged = mergeEquipeData([
      data({
        ymds: ['2026-08-29'],
        rows: [row({ id: 'a', name: 'Amina' })],
        days: [{ ymd: '2026-08-29', fdmCount: 2, capacityMin: 600 }],
      }),
      data({
        ymds: ['2026-08-29'],
        rows: [row({ id: 'a', name: 'Amina' }), row({ id: 'b', name: 'Fatima' })],
        days: [{ ymd: '2026-08-29', fdmCount: 3, capacityMin: 900 }],
      }),
    ]);
    assert.equal(merged?.rows.length, 2);
    assert.equal(merged?.days.length, 1);
    assert.equal(merged?.days[0].capacityMin, 900);
    assert.equal(merged?.days[0].fdmCount, 3);
  });
});

describe('les 3 chemins réseau', () => {
  const okData = data({ rows: [row({ id: 'a', name: 'Amina' })] });

  it('nominal → ok ; vide → empty', () => {
    assert.equal(
      resolveEquipeFetch([
        { ok: true, data: okData },
        { ok: false, notFound: false },
      ]).state,
      'ok',
    );
    assert.equal(resolveEquipeFetch([{ ok: true, data: data({}) }]).state, 'empty');
  });

  it('404 partout → unavailable ; échec non-404 / rien → error', () => {
    assert.equal(
      resolveEquipeFetch([
        { ok: false, notFound: true },
        { ok: false, notFound: true },
      ]).state,
      'unavailable',
    );
    assert.equal(resolveEquipeFetch([{ ok: false, notFound: false }]).state, 'error');
    assert.equal(resolveEquipeFetch([]).state, 'error');
  });
});
