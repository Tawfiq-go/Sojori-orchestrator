/**
 * Répartition ménage — tests node:test de la logique pure (npx tsx --test).
 * Jauges %, formats min→h, tri colonnes/tâches, fusion multi-listings,
 * et les 3 chemins réseau (nominal / vide / 404).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  creditsLabel,
  gaugePct,
  mergeRepartitionData,
  minutesLabel,
  resolveRepartitionFetch,
  sortColumnTasks,
  sortRepartitionColumns,
  type RepartitionColumn,
  type RepartitionData,
  type RepartitionTask,
} from './repartitionLogic';

function col(partial: Partial<RepartitionColumn> & Pick<RepartitionColumn, 'id' | 'name'>): RepartitionColumn {
  return {
    worksToday: true,
    capacityMin: 300,
    assignedMin: 0,
    remainingMin: 300,
    overCapacity: false,
    tasks: [],
    ...partial,
  };
}

function data(partial: Partial<RepartitionData>): RepartitionData {
  return {
    date: '2026-08-29',
    capacityMin: 300,
    columns: [],
    unassigned: [],
    totals: { assignedMin: 0, unassignedMin: 0, doneMin: 0 },
    ...partial,
  };
}

describe('jauges & formats', () => {
  it('gaugePct : proportion bornée 0..100', () => {
    assert.equal(gaugePct(195, 300), 65);
    assert.equal(gaugePct(0, 300), 0);
    assert.equal(gaugePct(360, 300), 100); // dépassement → borné, lu via overCapacity
    assert.equal(gaugePct(-5, 300), 0);
    assert.equal(gaugePct(50, 0), 100); // capacité nulle mais chargé
    assert.equal(gaugePct(0, 0), 0);
  });

  it('minutesLabel : min → heures', () => {
    assert.equal(minutesLabel(195), '3h15');
    assert.equal(minutesLabel(45), '45 min');
    assert.equal(minutesLabel(120), '2h');
    assert.equal(minutesLabel(0), '0 min');
    assert.equal(minutesLabel(-10), '0 min');
  });

  it('creditsLabel : « 195 / 300 »', () => {
    assert.equal(creditsLabel(195, 300), '195 / 300');
    assert.equal(creditsLabel(195.4, 300), '195 / 300');
  });
});

describe('tri', () => {
  it('colonnes : travaille aujourd’hui d’abord, dépassements en tête, (repos) à la fin', () => {
    const sorted = sortRepartitionColumns([
      col({ id: 'c', name: 'Chaima', worksToday: false }),
      col({ id: 'a', name: 'Amina' }),
      col({ id: 'f', name: 'Fatima', assignedMin: 350, overCapacity: true }),
    ]);
    assert.deepEqual(sorted.map((c) => c.id), ['f', 'a', 'c']);
  });

  it('tâches : heure croissante, heures inconnues après, terminés en bas', () => {
    const tasks: RepartitionTask[] = [
      { roomName: 'V3', label: 'Recouche', status: 'todo', hm: null, durationMin: 15 },
      { roomName: 'V1', label: 'À blanc', status: 'done', hm: '09:00', durationMin: 60 },
      { roomName: 'V2', label: 'À blanc', status: 'todo', hm: '11:00', durationMin: 60 },
      { roomName: 'V4', label: 'Recouche', status: 'doing', hm: '10:00', durationMin: 15 },
    ];
    assert.deepEqual(
      sortColumnTasks(tasks).map((t) => t.roomName),
      ['V4', 'V2', 'V3', 'V1'],
    );
  });
});

describe('fusion multi-listings', () => {
  it('réunit les colonnes par personne : minutes sommées, capacité = max', () => {
    const merged = mergeRepartitionData([
      data({
        columns: [col({ id: 'f1', name: 'Amina', assignedMin: 100, remainingMin: 200,
          tasks: [{ roomName: 'V1', label: 'À blanc', status: 'todo', hm: '10:00', durationMin: 60 }] })],
        totals: { assignedMin: 100, unassignedMin: 30, doneMin: 0 },
        unassigned: [{ id: 'u1', roomName: 'V7', label: 'À blanc', durationMin: 30 }],
      }),
      data({
        columns: [col({ id: 'f1', name: 'Amina', assignedMin: 250, capacityMin: 300,
          tasks: [{ roomName: 'R2', label: 'Recouche', status: 'done', hm: '09:00', durationMin: 15 }] })],
        totals: { assignedMin: 250, unassignedMin: 0, doneMin: 15 },
      }),
    ]);
    assert.ok(merged);
    assert.equal(merged?.columns.length, 1);
    const amina = merged?.columns[0];
    assert.equal(amina?.assignedMin, 350);
    assert.equal(amina?.capacityMin, 300);
    assert.equal(amina?.overCapacity, true);
    assert.equal(amina?.remainingMin, -50);
    assert.equal(amina?.tasks.length, 2);
    assert.equal(merged?.totals.assignedMin, 350);
    assert.equal(merged?.totals.doneMin, 15);
    assert.equal(merged?.unassigned.length, 1);
  });

  it('un seul listing → données inchangées', () => {
    const d = data({ columns: [col({ id: 'x', name: 'X' })] });
    assert.equal(mergeRepartitionData([d]), d);
  });
});

describe('les 3 chemins réseau', () => {
  it('nominal : au moins un succès avec contenu → ok', () => {
    const r = resolveRepartitionFetch([
      { ok: true, data: data({ columns: [col({ id: 'a', name: 'Amina' })] }) },
      { ok: false, notFound: false },
    ]);
    assert.equal(r.state, 'ok');
  });

  it('vide : succès sans colonnes ni non-assignés → empty', () => {
    const r = resolveRepartitionFetch([{ ok: true, data: data({}) }]);
    assert.equal(r.state, 'empty');
  });

  it('404 partout : backend pas déployé → unavailable', () => {
    const r = resolveRepartitionFetch([
      { ok: false, notFound: true },
      { ok: false, notFound: true },
    ]);
    assert.equal(r.state, 'unavailable');
  });

  it('échec non-404 → error ; aucun résultat → error', () => {
    assert.equal(resolveRepartitionFetch([{ ok: false, notFound: false }]).state, 'error');
    assert.equal(resolveRepartitionFetch([]).state, 'error');
  });
});
