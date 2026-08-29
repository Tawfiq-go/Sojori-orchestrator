/**
 * Rack ménage — tests node:test de la logique pure (npx tsx --test).
 * Cas couverts : fenêtre normale, retard géométrique (le bloc dépasse la
 * fenêtre / pas commencé), villa sans fenêtre, tri par urgence, axe, position %.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DayPlanChain, DayPlanStep } from '../../services/fulltaskApi';
import {
  AXIS_DEFAULT_END_MIN,
  AXIS_DEFAULT_START_MIN,
  DEFAULT_CLEANING_MINUTES,
  buildRackModel,
  buildRackModelFromEndpoint,
  durationLabel,
  hmLabel,
  hoursOf,
  parseHm,
  pctOf,
  primaryBlock,
  RAIL_LABEL_PX,
  RAIL_PX_PER_HOUR,
  railMinWidthPx,
  rowBadge,
  type RackEndpointRow,
  type RackEndpointTask,
} from './rackLogic';

/* ── Fabriques ─────────────────────────────────────────────────────────── */

function step(partial: Partial<DayPlanStep> & Pick<DayPlanStep, 'kind' | 'listingId'>): DayPlanStep {
  return {
    id: partial.id ?? `${partial.kind}:${partial.listingId}:${partial.time ?? 'x'}`,
    time: null,
    title: partial.title ?? `Ménage · ${partial.listingName ?? partial.listingId}`,
    listingName: partial.listingName ?? partial.listingId,
    reservationId: partial.reservationId ?? `res-${partial.listingId}`,
    state: 'pending',
    auto: true,
    ...partial,
  } as DayPlanStep;
}

function chain(partial: Partial<DayPlanChain> & Pick<DayPlanChain, 'listingId'>): DayPlanChain {
  return {
    id: partial.id ?? `chain-${partial.listingId}`,
    listingName: partial.listingName ?? partial.listingId,
    departingReservationId: 'res-dep',
    arrivingReservationId: 'res-arr',
    slackMinutes: 60,
    status: 'ok',
    cleaningDurationMinutes: 120,
    expectedCleaningEnd: new Date().toISOString(),
    ...partial,
  } as DayPlanChain;
}

const NOON = 12 * 60;

/* ── Helpers temps ─────────────────────────────────────────────────────── */

describe('helpers temps', () => {
  it('parseHm : HH:mm valide, invalide, null', () => {
    assert.equal(parseHm('11:00'), 660);
    assert.equal(parseHm('8:30'), 510);
    assert.equal(parseHm('25:00'), null);
    assert.equal(parseHm(''), null);
    assert.equal(parseHm(null), null);
  });

  it('hmLabel / durationLabel : affichage ops maison', () => {
    assert.equal(hmLabel(600), '10h');
    assert.equal(hmLabel(635), '10h35');
    assert.equal(durationLabel(240), '4h');
    assert.equal(durationLabel(90), '1h30');
    assert.equal(durationLabel(45), '45 min');
  });

  it('pctOf : position bornée 0..100 sur l’axe', () => {
    const axis = { startMin: 480, endMin: 1020 }; // 8h → 17h
    assert.equal(pctOf(480, axis), 0);
    assert.equal(pctOf(1020, axis), 100);
    assert.equal(pctOf(750, axis), 50); // 12h30 = milieu
    assert.equal(pctOf(300, axis), 0); // avant l'axe → clampé
    assert.equal(pctOf(1400, axis), 100); // après l'axe → clampé
  });

  it('hoursOf : graduations heures rondes', () => {
    const ticks = hoursOf({ startMin: 480, endMin: 660 });
    assert.deepEqual(
      ticks.map((t) => t.label),
      ['8h', '9h', '10h', '11h'],
    );
  });
});

/* ── Fenêtre normale ───────────────────────────────────────────────────── */

describe('fenêtre normale (départ → arrivée, ménage dedans)', () => {
  const plan = {
    steps: [
      step({ kind: 'departure', listingId: 'v8', time: '11:00' }),
      step({ kind: 'arrival', listingId: 'v8', time: '15:00' }),
      step({
        kind: 'cleaning',
        listingId: 'v8',
        time: '11:00',
        taskStatus: 'confirmed',
        staffName: 'Fatima',
        chainId: 'chain-v8',
      }),
    ],
    chains: [chain({ listingId: 'v8', cleaningDurationMinutes: 120, slackMinutes: 120, status: 'ok' })],
  };

  it('construit la fenêtre 11h→15h, non serrée, bloc "plan" posé dedans', () => {
    const { rows } = buildRackModel(plan, 10 * 60); // 10h : rien ne presse
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row.window);
    assert.equal(row.window?.startMin, 660);
    assert.equal(row.window?.endMin, 900);
    assert.equal(row.window?.tight, false);
    assert.equal(row.blocks[0]?.status, 'plan');
    assert.equal(row.blocks[0]?.startMin, 660);
    assert.equal(row.blocks[0]?.endMin, 660 + 120);
    assert.equal(row.critical, false);
    assert.equal(row.subtitle, '11h → 15h · 4h');
  });

  it('taskStatus done → bloc terminé, compteur terminés', () => {
    const donePlan = {
      ...plan,
      steps: plan.steps.map((s) =>
        s.kind === 'cleaning' ? { ...s, taskStatus: 'done', state: 'done' as const } : s,
      ),
    };
    const { rows, counters } = buildRackModel(donePlan, 16 * 60);
    assert.equal(rows[0].blocks[0]?.status, 'done');
    assert.equal(counters.termines, 1);
    assert.equal(counters.enRetard, 0);
  });

  it('chain tight → fenêtre marquée serrée', () => {
    const tightPlan = {
      ...plan,
      chains: [chain({ listingId: 'v8', slackMinutes: 10, status: 'tight' as const })],
    };
    const { rows } = buildRackModel(tightPlan, 10 * 60);
    assert.equal(rows[0].window?.tight, true);
  });
});

/* ── Retard géométrique ────────────────────────────────────────────────── */

describe('retard géométrique', () => {
  it('pas commencé après le départ → bloc "late", repoussé, ligne critique', () => {
    const plan = {
      steps: [
        step({ kind: 'departure', listingId: 'v8', time: '11:00' }),
        step({ kind: 'arrival', listingId: 'v8', time: '15:00' }),
        step({
          kind: 'cleaning',
          listingId: 'v8',
          time: '11:00',
          taskStatus: 'confirmed',
          staffName: 'Fatima',
        }),
      ],
      chains: [chain({ listingId: 'v8', cleaningDurationMinutes: 120 })],
    };
    const now = 11 * 60 + 40; // 11h40 — 40 min après le départ, rien n'a commencé
    const { rows, counters } = buildRackModel(plan, now);
    const block = rows[0].blocks[0];
    assert.equal(block?.status, 'late');
    assert.equal(block?.statusLabel, 'pas commencé');
    // Géométrie : ancré au départ, fin projetée = maintenant + durée.
    assert.equal(block?.startMin, 660);
    assert.equal(block?.endMin, now + 120);
    assert.equal(rows[0].critical, true);
    assert.equal(counters.enRetard, 1);
    assert.equal(counters.aFaire, 0);
  });

  it('ménage planifié trop tard : la fin projetée DÉPASSE la fenêtre → late (même sans heure passée)', () => {
    const plan = {
      steps: [
        step({ kind: 'departure', listingId: 'v3', time: '13:00' }),
        step({ kind: 'arrival', listingId: 'v3', time: '14:00' }),
        step({
          kind: 'cleaning',
          listingId: 'v3',
          time: '13:00',
          taskStatus: 'confirmed',
          staffName: 'Amina',
        }),
      ],
      chains: [chain({ listingId: 'v3', cleaningDurationMinutes: 120, slackMinutes: -60, status: 'broken' as const })],
    };
    const { rows } = buildRackModel(plan, 9 * 60); // 9h : futur, mais impossible géométriquement
    const block = rows[0].blocks[0];
    assert.equal(block?.status, 'late');
    assert.equal(block?.statusLabel, 'déborde la fenêtre');
    assert.ok(block && rows[0].window && block.endMin > rows[0].window.endMin);
  });

  it('en cours qui s’éternise : le bloc s’étire jusqu’à maintenant et déborde → late', () => {
    const plan = {
      steps: [
        step({ kind: 'departure', listingId: 'v5', time: '10:00' }),
        step({ kind: 'arrival', listingId: 'v5', time: '13:00' }),
        step({
          kind: 'cleaning',
          listingId: 'v5',
          time: '10:00',
          taskStatus: 'doing',
          staffName: 'Khadija',
        }),
      ],
      chains: [chain({ listingId: 'v5', cleaningDurationMinutes: 120 })],
    };
    const now = 13 * 60 + 30; // 13h30 — l'arrivée était à 13h
    const { rows } = buildRackModel(plan, now);
    assert.equal(rows[0].blocks[0]?.status, 'late');
    assert.equal(rows[0].blocks[0]?.endMin, now);
  });

  it('autre jour (nowMin=null) : aucun retard projeté', () => {
    const plan = {
      steps: [
        step({ kind: 'departure', listingId: 'v8', time: '11:00' }),
        step({ kind: 'arrival', listingId: 'v8', time: '15:00' }),
        step({ kind: 'cleaning', listingId: 'v8', time: '11:00', taskStatus: 'confirmed', staffName: 'F' }),
      ],
      chains: [chain({ listingId: 'v8' })],
    };
    const { rows } = buildRackModel(plan, null);
    assert.equal(rows[0].blocks[0]?.status, 'plan');
  });
});

/* ── Villa sans fenêtre ────────────────────────────────────────────────── */

describe('villa sans fenêtre', () => {
  it('client sur place : pas de hachure, bloc recouche affiché', () => {
    const plan = {
      steps: [
        step({
          kind: 'cleaning',
          listingId: 'v2',
          time: '12:00',
          taskStatus: 'confirmed',
          staffName: 'Amina',
          listingOccupancy: 'occupied' as const,
        }),
      ],
      chains: [],
    };
    const { rows } = buildRackModel(plan, 10 * 60);
    assert.equal(rows[0].window, null);
    assert.equal(rows[0].blocks[0]?.status, 'plan');
    assert.equal(rows[0].blocks[0]?.endMin, 12 * 60 + DEFAULT_CLEANING_MINUTES);
    assert.equal(rows[0].subtitle, 'client sur place');
    assert.equal(rows[0].critical, false);
  });

  it('départ sans arrivée : ligne sans hachure, sous-titre « départ → libre »', () => {
    const plan = {
      steps: [
        step({ kind: 'departure', listingId: 'v12', time: '10:00' }),
        step({ kind: 'cleaning', listingId: 'v12', time: '10:00', taskStatus: 'done', state: 'done' as const, staffName: 'Amina' }),
      ],
      chains: [],
    };
    const { rows } = buildRackModel(plan, 14 * 60);
    assert.equal(rows[0].window, null);
    assert.equal(rows[0].subtitle, 'départ 10h → libre');
    assert.equal(rows[0].blocks[0]?.status, 'done');
  });

  it('heure estimée (hourUnknown) : marqueur ≈ dans le sous-titre', () => {
    const plan = {
      steps: [
        step({ kind: 'departure', listingId: 'v9', time: null, hourUnknown: true, estimatedTime: '11:00' }),
      ],
      chains: [],
    };
    const { rows } = buildRackModel(plan, 9 * 60);
    assert.equal(rows[0].subtitle, '≈ départ 11h → libre');
    assert.equal(rows[0].departure?.estimated, true);
  });
});

/* ── Tri par urgence ───────────────────────────────────────────────────── */

describe('tri par urgence (fenêtre la plus serrée d’abord, jamais par numéro)', () => {
  it('serré < large < sans fenêtre < sans ménage < terminé', () => {
    const plan = {
      steps: [
        // v01 : terminé (nom qui trierait premier alphabétiquement)
        step({ kind: 'departure', listingId: 'v01', time: '09:00' }),
        step({ kind: 'cleaning', listingId: 'v01', time: '09:00', taskStatus: 'done', state: 'done' as const, staffName: 'A' }),
        // v10 : fenêtre LARGE 10h→17h
        step({ kind: 'departure', listingId: 'v10', time: '10:00' }),
        step({ kind: 'arrival', listingId: 'v10', time: '17:00' }),
        step({ kind: 'cleaning', listingId: 'v10', time: '10:00', taskStatus: 'confirmed', staffName: 'B' }),
        // v20 : fenêtre SERRÉE 11h→14h
        step({ kind: 'departure', listingId: 'v20', time: '11:00' }),
        step({ kind: 'arrival', listingId: 'v20', time: '14:00' }),
        step({ kind: 'cleaning', listingId: 'v20', time: '11:00', taskStatus: 'confirmed', staffName: 'C' }),
        // v30 : recouche sans fenêtre
        step({ kind: 'cleaning', listingId: 'v30', time: '12:00', taskStatus: 'confirmed', staffName: 'D', listingOccupancy: 'occupied' as const }),
        // v40 : départ seul, pas de ménage
        step({ kind: 'departure', listingId: 'v40', time: '12:00' }),
      ],
      chains: [
        chain({ listingId: 'v10', cleaningDurationMinutes: 120, slackMinutes: 300, status: 'ok' as const }),
        chain({ listingId: 'v20', cleaningDurationMinutes: 120, slackMinutes: 60, status: 'ok' as const }),
      ],
    };
    const { rows } = buildRackModel(plan, 8 * 60); // 8h — rien n'est en retard
    assert.deepEqual(
      rows.map((r) => r.listingId),
      ['v20', 'v10', 'v30', 'v40', 'v01'],
    );
  });

  it('un retard remonte au-dessus des fenêtres saines', () => {
    const plan = {
      steps: [
        // vA : fenêtre serrée mais saine (pas encore l'heure)
        step({ kind: 'departure', listingId: 'vA', time: '14:00' }),
        step({ kind: 'arrival', listingId: 'vA', time: '16:30' }),
        step({ kind: 'cleaning', listingId: 'vA', time: '14:00', taskStatus: 'confirmed', staffName: 'A' }),
        // vB : fenêtre large mais EN RETARD (pas commencé, départ passé)
        step({ kind: 'departure', listingId: 'vB', time: '09:00' }),
        step({ kind: 'arrival', listingId: 'vB', time: '16:00' }),
        step({ kind: 'cleaning', listingId: 'vB', time: '09:00', taskStatus: 'confirmed', staffName: 'B' }),
      ],
      chains: [
        chain({ listingId: 'vA', cleaningDurationMinutes: 120 }),
        chain({ listingId: 'vB', cleaningDurationMinutes: 120 }),
      ],
    };
    const { rows } = buildRackModel(plan, 12 * 60); // midi
    assert.equal(rows[0].listingId, 'vB');
    assert.equal(rows[0].blocks[0]?.status, 'late');
  });
});

/* ── Axe & compteurs ───────────────────────────────────────────────────── */

describe('axe horaire', () => {
  it('8h→17h par défaut', () => {
    const { axis } = buildRackModel({ steps: [], chains: [] }, NOON);
    assert.equal(axis.startMin, AXIS_DEFAULT_START_MIN);
    assert.equal(axis.endMin, AXIS_DEFAULT_END_MIN);
  });

  it('railMinWidthPx : colonne biens + ~72px/heure, jamais moins d’une heure', () => {
    // Axe par défaut 8h→17h = 9 heures.
    assert.equal(
      railMinWidthPx({ startMin: AXIS_DEFAULT_START_MIN, endMin: AXIS_DEFAULT_END_MIN }),
      RAIL_LABEL_PX + 9 * RAIL_PX_PER_HOUR,
    );
    // Axe étendu 8h→20h = 12 heures.
    assert.equal(railMinWidthPx({ startMin: 480, endMin: 1200 }), RAIL_LABEL_PX + 12 * RAIL_PX_PER_HOUR);
    // Heure partielle arrondie au-dessus ; axe dégénéré → 1 heure minimum.
    assert.equal(railMinWidthPx({ startMin: 480, endMin: 510 }), RAIL_LABEL_PX + RAIL_PX_PER_HOUR);
    assert.equal(railMinWidthPx({ startMin: 480, endMin: 480 }), RAIL_LABEL_PX + RAIL_PX_PER_HOUR);
  });

  it('étendu (vers 20h) si les données le justifient', () => {
    const plan = {
      steps: [
        step({ kind: 'departure', listingId: 'v1', time: '15:00' }),
        step({ kind: 'arrival', listingId: 'v1', time: '19:30' }),
        step({ kind: 'cleaning', listingId: 'v1', time: '15:00', taskStatus: 'confirmed', staffName: 'A' }),
      ],
      chains: [chain({ listingId: 'v1' })],
    };
    const { axis } = buildRackModel(plan, NOON);
    assert.equal(axis.endMin, 20 * 60);
    assert.equal(axis.startMin, AXIS_DEFAULT_START_MIN);
  });
});

describe('compteurs & sans personne', () => {
  it('à faire / en cours / terminés / en retard + départs / arrivées', () => {
    const plan = {
      steps: [
        step({ kind: 'departure', listingId: 'a', time: '09:00' }),
        step({ kind: 'cleaning', listingId: 'a', time: '09:00', taskStatus: 'done', state: 'done' as const, staffName: 'A' }),
        step({ kind: 'cleaning', listingId: 'b', time: '13:00', taskStatus: 'doing', staffName: 'B' }),
        step({ kind: 'cleaning', listingId: 'c', time: '15:00', taskStatus: 'confirmed', staffName: 'C' }),
        step({ kind: 'departure', listingId: 'd', time: '10:00' }),
        step({ kind: 'arrival', listingId: 'd', time: '15:00' }),
        step({ kind: 'cleaning', listingId: 'd', time: '10:00', taskStatus: 'confirmed', staffName: null }),
      ],
      chains: [chain({ listingId: 'd' })],
      stats: { steps: 0, done: 0, attention: 0, arrivals: 1, departures: 2, turnovers: 1, hourUnknown: 0 },
    };
    const { rows, counters } = buildRackModel(plan, 12 * 60);
    assert.equal(counters.termines, 1);
    assert.equal(counters.enCours, 1);
    assert.equal(counters.aFaire, 1);
    assert.equal(counters.enRetard, 1); // d : pas commencé, départ 10h passé
    assert.equal(counters.departs, 2);
    assert.equal(counters.arrivees, 1);
    const rowD = rows.find((r) => r.listingId === 'd');
    assert.equal(rowD?.blocks[0]?.unassigned, true);
    assert.equal(rowD?.critical, true);
  });
});

/* ── Source endpoint rack (GET /tasks/menage/rack) ─────────────────────── */

describe('endpoint rack : fenêtres et kinds', () => {
  it('turnover : fenêtre fermée [checkOut, checkIn], marqueurs départ/arrivée', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'l1:r1',
        roomName: 'Villa 01',
        kind: 'turnover',
        window: { startHm: '11:00', endHm: '15:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '11:00', durationMin: 90, staffName: 'Amina' }],
      },
    ];
    const { rows: out } = buildRackModelFromEndpoint(rows, 9 * 60);
    const row = out[0];
    assert.deepEqual(row.window, { startMin: 660, endMin: 900, tight: false });
    assert.equal(row.departure?.min, 660);
    assert.equal(row.arrival?.min, 900);
    assert.equal(row.blocks[0]?.status, 'plan');
    assert.equal(row.blocks[0]?.taskLabel, 'À blanc');
    assert.equal(row.subtitle, '11h → 15h · 4h');
  });

  it('départ seul : fenêtre OUVERTE à droite — jamais de retard géométrique par la fenêtre', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'l1:r2',
        roomName: 'Villa 02',
        kind: 'departure',
        window: { startHm: '11:00', endHm: null },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '14:00', durationMin: 60, staffName: 'Fatima' }],
      },
    ];
    const { rows: out, axis } = buildRackModelFromEndpoint(rows, 12 * 60);
    const row = out[0];
    assert.equal(row.window?.openEnd, true);
    assert.equal(row.window?.startMin, 660);
    assert.equal(row.departure?.min, 660);
    assert.equal(row.arrival, null);
    // Ménage prévu 14h, il est midi : pas en retard (fenêtre ouverte, heure pas passée).
    assert.equal(row.blocks[0]?.status, 'plan');
    assert.equal(row.subtitle, 'départ 11h → libre');
    // Le bord ouvert n'étend PAS l'axe.
    assert.equal(axis.endMin, AXIS_DEFAULT_END_MIN);
    assert.equal(row.critical, false);
  });

  it('arrivée seule : fenêtre OUVERTE à gauche, le retard reste possible côté arrivée', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'l1:r3',
        roomName: 'Villa 03',
        kind: 'arrival',
        window: { startHm: null, endHm: '15:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '14:30', durationMin: 120, staffName: 'Amina' }],
      },
    ];
    const { rows: out } = buildRackModelFromEndpoint(rows, 9 * 60);
    const row = out[0];
    assert.equal(row.window?.openStart, true);
    assert.equal(row.window?.endMin, 900);
    assert.equal(row.departure, null);
    assert.equal(row.arrival?.min, 900);
    // 14h30 + 2h = 16h30 > arrivée 15h → déborde la fenêtre, même à 9h du matin.
    assert.equal(row.blocks[0]?.status, 'late');
    assert.equal(row.blocks[0]?.statusLabel, 'déborde la fenêtre');
    assert.equal(row.subtitle, 'arrivée 15h');
  });

  it('stay / empty : window null, ligne sans hachure, occLabel en sous-titre', () => {
    const rows: RackEndpointRow[] = [
      { id: 'l1:r4', roomName: 'Villa 04', kind: 'stay', occLabel: 'Séjour · du 27 au 31', tasks: [] },
      { id: 'l1:r5', roomName: 'Villa 05', kind: 'empty', tasks: [] },
    ];
    const { rows: out, counters } = buildRackModelFromEndpoint(rows, 12 * 60);
    const stay = out.find((r) => r.listingId === 'l1:r4');
    const empty = out.find((r) => r.listingId === 'l1:r5');
    assert.equal(stay?.window, null);
    assert.equal(stay?.subtitle, 'Séjour · du 27 au 31');
    assert.equal(empty?.window, null);
    assert.equal(empty?.subtitle, 'libre');
    assert.equal(counters.aFaire + counters.enCours + counters.termines + counters.enRetard, 0);
  });
});

describe('endpoint rack : chrono réel vs prévu', () => {
  it('done avec startedHm/completedHm : le bloc dessine le réel', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'r',
        roomName: 'Villa 06',
        kind: 'turnover',
        window: { startHm: '11:00', endHm: '16:00' },
        tasks: [
          {
            label: 'À blanc',
            status: 'done',
            hm: '11:00',
            durationMin: 120,
            staffName: 'Amina',
            startedHm: '11:40',
            completedHm: '13:05',
          },
        ],
      },
    ];
    const { rows: out } = buildRackModelFromEndpoint(rows, 14 * 60);
    const b = out[0].blocks[0];
    assert.equal(b?.status, 'done');
    assert.equal(b?.startMin, 700); // 11h40 réel, pas 11h prévu
    assert.equal(b?.endMin, 785); // 13h05 réel, pas 11h + 2h
  });

  it('doing avec startedHm : démarre au réel et s’étire jusqu’à maintenant', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'r',
        roomName: 'Villa 07',
        kind: 'turnover',
        window: { startHm: '11:00', endHm: '17:00' },
        tasks: [
          { label: 'Recouche', status: 'doing', hm: '11:00', durationMin: 60, staffName: 'Khadija', startedHm: '12:15' },
        ],
      },
    ];
    const now = 14 * 60; // 14h — 60 min prévues, démarré 12h15
    const { rows: out } = buildRackModelFromEndpoint(rows, now);
    const b = out[0].blocks[0];
    assert.equal(b?.status, 'doing');
    assert.equal(b?.startMin, 735); // 12h15 réel
    assert.equal(b?.endMin, now); // s'étire jusqu'à maintenant
  });

  it('todo sans chrono : heure prévue hm + durationMin (repli 120)', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'r',
        roomName: 'Villa 08',
        kind: 'stay',
        tasks: [{ label: 'Recouche', status: 'todo', hm: '12:00', durationMin: null, staffName: 'Amina' }],
      },
    ];
    const { rows: out } = buildRackModelFromEndpoint(rows, 10 * 60);
    assert.equal(out[0].blocks[0]?.startMin, 720);
    assert.equal(out[0].blocks[0]?.endMin, 720 + DEFAULT_CLEANING_MINUTES);
  });
});

describe('endpoint rack : unassigned, retard, tri, multi-tâches', () => {
  it('unassigned dans une fenêtre fermée → ligne critique « personne »', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'r',
        roomName: 'Villa 09',
        kind: 'turnover',
        window: { startHm: '11:00', endHm: '16:00' },
        tasks: [{ label: 'À blanc', status: 'unassigned', hm: '11:00', durationMin: 120, staffName: null }],
      },
    ];
    const { rows: out } = buildRackModelFromEndpoint(rows, 9 * 60);
    assert.equal(out[0].blocks[0]?.unassigned, true);
    assert.equal(out[0].critical, true);
  });

  it('pas commencé après le départ (fenêtre fermée) → late géométrique, compté en retard', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'r',
        roomName: 'Villa 10',
        kind: 'turnover',
        window: { startHm: '11:00', endHm: '15:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '11:00', durationMin: 120, staffName: 'Fatima' }],
      },
    ];
    const now = 11 * 60 + 40;
    const { rows: out, counters } = buildRackModelFromEndpoint(rows, now);
    const b = out[0].blocks[0];
    assert.equal(b?.status, 'late');
    assert.equal(b?.statusLabel, 'pas commencé');
    assert.equal(b?.endMin, now + 120);
    assert.equal(counters.enRetard, 1);
  });

  it('tri : turnover serré < turnover large < départ seul (fenêtre ouverte) < stay done', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'done',
        roomName: 'A-done',
        kind: 'stay',
        tasks: [{ label: 'Recouche', status: 'done', hm: '09:00', durationMin: 60, staffName: 'A' }],
      },
      {
        id: 'open',
        roomName: 'B-open',
        kind: 'departure',
        window: { startHm: '10:00', endHm: null },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '10:00', durationMin: 60, staffName: 'B' }],
      },
      {
        id: 'large',
        roomName: 'C-large',
        kind: 'turnover',
        window: { startHm: '10:00', endHm: '17:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '10:00', durationMin: 120, staffName: 'C' }],
      },
      {
        id: 'serre',
        roomName: 'D-serre',
        kind: 'turnover',
        window: { startHm: '11:00', endHm: '14:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '11:00', durationMin: 160, staffName: 'D' }],
      },
    ];
    const { rows: out } = buildRackModelFromEndpoint(rows, 8 * 60);
    assert.deepEqual(
      out.map((r) => r.listingId),
      ['serre', 'large', 'open', 'done'],
    );
    // Fenêtre serrée : 3h de fenêtre pour 2h40 de ménage (marge 20 < 30) → tight.
    assert.equal(out[0].window?.tight, true);
  });

  it('plusieurs tâches sur une ligne : primaryBlock prend la plus urgente', () => {
    const rows: RackEndpointRow[] = [
      {
        id: 'r',
        roomName: 'Villa 11',
        kind: 'turnover',
        window: { startHm: '10:00', endHm: '16:00' },
        tasks: [
          { label: 'À blanc', status: 'done', hm: '10:00', durationMin: 60, staffName: 'A', completedHm: '11:00' },
          { label: 'Inspection', status: 'todo', hm: '11:30', durationMin: 30, staffName: 'B' },
        ],
      },
    ];
    const { rows: out, counters } = buildRackModelFromEndpoint(rows, 10 * 60);
    assert.equal(out[0].blocks.length, 2);
    assert.equal(primaryBlock(out[0])?.taskLabel, 'Inspection');
    assert.equal(counters.termines, 1);
    assert.equal(counters.aFaire, 1);
  });
});

/* ── Badges de ligne & compteurs enrichis (revue doc de conception) ────── */

describe('rowBadge : typographie du doc (✓ ● ⚠ ＋ ○)', () => {
  function endpointRow(task: Partial<RackEndpointTask>, kind: RackEndpointRow['kind'] = 'turnover'): RackEndpointRow {
    return {
      id: 'r',
      roomName: 'Villa X',
      kind,
      window: kind === 'turnover' ? { startHm: '11:00', endHm: '16:00' } : null,
      tasks: [
        {
          label: 'À blanc',
          status: 'todo',
          hm: '11:00',
          durationMin: 60,
          staffName: 'Amina',
          ...task,
        } as RackEndpointTask,
      ],
    };
  }

  it('done → « ✓ Amina · à blanc »', () => {
    const { rows } = buildRackModelFromEndpoint([endpointRow({ status: 'done' })], 9 * 60);
    assert.deepEqual(rowBadge(rows[0]), { icon: '✓', who: 'Amina', detail: 'à blanc' });
  });

  it('doing → « ● Amina · à blanc · en cours »', () => {
    const { rows } = buildRackModelFromEndpoint([endpointRow({ status: 'doing' })], 11 * 60);
    assert.deepEqual(rowBadge(rows[0]), { icon: '●', who: 'Amina', detail: 'à blanc · en cours' });
  });

  it('todo en retard de départ → « ⚠ Fatima · pas commencé »', () => {
    const { rows } = buildRackModelFromEndpoint(
      [endpointRow({ staffName: 'Fatima' })],
      11 * 60 + 40,
    );
    assert.deepEqual(rowBadge(rows[0]), { icon: '⚠', who: 'Fatima', detail: 'pas commencé' });
  });

  it('unassigned → « ＋ à assigner · à blanc » (avant l’heure)', () => {
    const { rows } = buildRackModelFromEndpoint(
      [endpointRow({ status: 'unassigned', staffName: null })],
      9 * 60,
    );
    assert.deepEqual(rowBadge(rows[0]), { icon: '＋', who: 'à assigner', detail: 'à blanc' });
  });

  it('prévu assigné → « ○ Amina · recouche 12h » (heure prévue)', () => {
    const { rows } = buildRackModelFromEndpoint(
      [endpointRow({ label: 'Recouche', hm: '12:00' }, 'stay')],
      9 * 60,
    );
    assert.deepEqual(rowBadge(rows[0]), { icon: '○', who: 'Amina', detail: 'recouche 12h' });
  });

  it('ligne sans tâche → pas de badge', () => {
    const { rows } = buildRackModelFromEndpoint(
      [{ id: 'r', roomName: 'V', kind: 'empty', tasks: [] }],
      9 * 60,
    );
    assert.equal(rowBadge(rows[0]), null);
  });
});

describe('compteurs enrichis : sans personne & fenêtres en danger', () => {
  it('sans personne = unassigned OU fenêtre sans aucune tâche', () => {
    const rows: RackEndpointRow[] = [
      // Fenêtre avec tâche non assignée.
      { id: 'a', roomName: 'A', kind: 'turnover', window: { startHm: '11:00', endHm: '16:00' },
        tasks: [{ label: 'À blanc', status: 'unassigned', hm: '11:00', durationMin: 60, staffName: null }] },
      // Fenêtre SANS aucune tâche.
      { id: 'b', roomName: 'B', kind: 'turnover', window: { startHm: '12:00', endHm: '17:00' }, tasks: [] },
      // Fenêtre normale assignée — pas comptée.
      { id: 'c', roomName: 'C', kind: 'turnover', window: { startHm: '10:00', endHm: '17:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '10:00', durationMin: 60, staffName: 'Amina' }] },
    ];
    const { counters } = buildRackModelFromEndpoint(rows, 9 * 60);
    assert.equal(counters.sansPersonne, 2);
  });

  it('fenêtres en danger = serrées (marge < 30 min) + retards', () => {
    const rows: RackEndpointRow[] = [
      // Serrée : 3h de fenêtre pour 2h40 de ménage.
      { id: 'tight', roomName: 'T', kind: 'turnover', window: { startHm: '11:00', endHm: '14:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '11:00', durationMin: 160, staffName: 'A' }] },
      // En retard : pas commencé après le départ.
      { id: 'late', roomName: 'L', kind: 'turnover', window: { startHm: '09:00', endHm: '16:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '09:00', durationMin: 60, staffName: 'B' }] },
      // Large et saine — pas comptée.
      { id: 'okr', roomName: 'O', kind: 'turnover', window: { startHm: '13:00', endHm: '18:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '13:00', durationMin: 60, staffName: 'C' }] },
      // Serrée mais TERMINÉE — plus en danger.
      { id: 'done', roomName: 'D', kind: 'turnover', window: { startHm: '11:00', endHm: '13:00' },
        tasks: [{ label: 'À blanc', status: 'done', hm: '11:00', durationMin: 110, staffName: 'E', completedHm: '12:50' }] },
    ];
    // 10h : la serrée n'a pas encore atteint son heure (sinon elle serait AUSSI en retard).
    const { counters } = buildRackModelFromEndpoint(rows, 10 * 60);
    assert.equal(counters.fenetresEnDanger, 2);
    assert.equal(counters.enRetard, 1);
  });

  it('tri du doc : retard < sans personne < serré < large', () => {
    const rows: RackEndpointRow[] = [
      { id: 'large', roomName: 'A-large', kind: 'turnover', window: { startHm: '10:00', endHm: '17:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '15:00', durationMin: 60, staffName: 'A' }] },
      { id: 'tight', roomName: 'B-tight', kind: 'turnover', window: { startHm: '13:00', endHm: '15:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '13:00', durationMin: 100, staffName: 'B' }] },
      { id: 'perso', roomName: 'C-perso', kind: 'turnover', window: { startHm: '12:00', endHm: '18:00' },
        tasks: [{ label: 'À blanc', status: 'unassigned', hm: '12:00', durationMin: 60, staffName: null }] },
      { id: 'late', roomName: 'D-late', kind: 'turnover', window: { startHm: '09:00', endHm: '17:00' },
        tasks: [{ label: 'À blanc', status: 'todo', hm: '09:00', durationMin: 60, staffName: 'D' }] },
    ];
    const { rows: out } = buildRackModelFromEndpoint(rows, 11 * 60);
    assert.deepEqual(
      out.map((r) => r.listingId),
      ['late', 'perso', 'tight', 'large'],
    );
  });
});
