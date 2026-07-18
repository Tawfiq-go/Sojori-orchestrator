import assert from 'node:assert/strict';
import test from 'node:test';
import { mapSearchTaskToReservationTask } from './inboxTaskMappers';

test('maps every production task type to an understandable title', () => {
  const cases: Record<string, string> = {
    arrival_choose: "Choix de l'heure d'arrivée",
    departure_declare: "Heure de départ déclarée",
    cleaning_free: 'Ménage inclus',
    registration: 'Enregistrement des voyageurs',
    groceries: 'Courses et livraison',
    support: 'Assistance voyageur',
  };

  for (const [type, title] of Object.entries(cases)) {
    assert.equal(mapSearchTaskToReservationTask({ _id: type, type }).title, title);
  }
});

test('prefers production payload context and preserves a useful description', () => {
  const task = mapSearchTaskToReservationTask({
    _id: 'task-1',
    taskCode: 'TU-123',
    type: 'service_client',
    status: 'doing',
    payload: {
      categoryTitle: 'Location de voiture',
      routeLabel: 'Aéroport → logement',
    },
  });

  assert.equal(task.title, 'Location de voiture');
  assert.equal(task.description, 'Aéroport → logement');
  assert.equal(task.status, 'IN_PROGRESS');
});

test('maps backend lifecycle statuses to inbox statuses', () => {
  assert.equal(mapSearchTaskToReservationTask({ status: 'new' }).status, 'CREATED');
  assert.equal(mapSearchTaskToReservationTask({ status: 'confirmed' }).status, 'ASSIGNED');
  assert.equal(mapSearchTaskToReservationTask({ status: 'done' }).status, 'COMPLETED');
  assert.equal(mapSearchTaskToReservationTask({ status: 'rejected' }).status, 'CANCELLED');
});
