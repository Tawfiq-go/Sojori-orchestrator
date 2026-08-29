import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeHousekeepingPolicy, normalizeHousekeepingPolicy } from './housekeepingPolicy';

describe('describeHousekeepingPolicy', () => {
  it('non configurée → défauts système marqués', () => {
    assert.deepEqual(describeHousekeepingPolicy(null), [
      'Création manuelle (défaut hôtel)',
      'Assignation superviseur (défaut)',
      'Digest 17:00 (défaut)',
    ]);
  });

  it('configurée en toutes lettres', () => {
    assert.deepEqual(
      describeHousekeepingPolicy({
        creation: 'auto',
        assignment: 'supervisor',
        notification: 'digest',
        digestTime: '08:30',
      }),
      ['Création automatique', 'Assignation superviseur', 'Digest 08:30'],
    );
  });

  it('partielle : configuré + défauts mélangés', () => {
    assert.deepEqual(describeHousekeepingPolicy({ notification: 'immediate' }), [
      'Création manuelle (défaut hôtel)',
      'Assignation superviseur (défaut)',
      'Notification immédiate',
    ]);
  });
});

describe('normalizeHousekeepingPolicy', () => {
  it('policy nominale conservée', () => {
    assert.deepEqual(
      normalizeHousekeepingPolicy({
        creation: 'auto',
        assignment: 'supervisor',
        notification: 'digest',
        digestTime: '08:30',
      }),
      { creation: 'auto', assignment: 'supervisor', notification: 'digest', digestTime: '08:30' },
    );
  });

  it('partielle conservée telle quelle', () => {
    assert.deepEqual(normalizeHousekeepingPolicy({ creation: 'manual' }), { creation: 'manual' });
  });

  it('valeurs invalides éliminées (miroir backend)', () => {
    assert.deepEqual(
      normalizeHousekeepingPolicy({
        creation: 'x',
        assignment: 'boss',
        notification: 'digest',
        digestTime: '25:99',
      }),
      { notification: 'digest' },
    );
  });

  it('vide / non-objet / que de l’invalide → null (état non configuré)', () => {
    assert.equal(normalizeHousekeepingPolicy(undefined), null);
    assert.equal(normalizeHousekeepingPolicy(null), null);
    assert.equal(normalizeHousekeepingPolicy({}), null);
    assert.equal(normalizeHousekeepingPolicy({ creation: 'x' }), null);
    assert.equal(normalizeHousekeepingPolicy('auto'), null);
  });

  it('digestTime strictement HH:mm', () => {
    assert.deepEqual(normalizeHousekeepingPolicy({ digestTime: '23:59' }), { digestTime: '23:59' });
    assert.equal(normalizeHousekeepingPolicy({ digestTime: '8:00' }), null);
    assert.equal(normalizeHousekeepingPolicy({ digestTime: '24:00' }), null);
  });
});
