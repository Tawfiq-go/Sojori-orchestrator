import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PARTNER_AUTO_ASSIGN_TYPES } from './fulltaskTaskTypes';

/**
 * Garde-fou : cette liste doit rester identique à `PARTNER_TASK_TYPES`
 * (apps/srv-fulltask/src/types/domain.ts, repo backend) — voir le
 * commentaire sur `PARTNER_AUTO_ASSIGN_TYPES`. Ce test ne peut pas lire le
 * backend (repo séparé) : il fige la valeur connue au 13/09/2026 pour que
 * toute modification silencieuse d'un seul côté fasse échouer la CI ici,
 * et rappelle dans le message d'échec de mettre à jour l'autre repo.
 */
describe('PARTNER_AUTO_ASSIGN_TYPES — doit rester synchronisé avec le backend', () => {
  it('matches PARTNER_TASK_TYPES from apps/srv-fulltask/src/types/domain.ts', () => {
    assert.deepEqual(
      [...PARTNER_AUTO_ASSIGN_TYPES].sort(),
      ['concierge', 'groceries', 'transport'],
      'Si ce test échoue après une modif de PARTNER_AUTO_ASSIGN_TYPES, ' +
        'mettre à jour PARTNER_TASK_TYPES dans le repo backend (My-Sojori/sojori-production, ' +
        'apps/srv-fulltask/src/types/domain.ts) dans la même livraison.',
    );
  });
});
