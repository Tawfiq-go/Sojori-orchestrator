import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STAY_OPTION_FAMILY_ID, buildTaskTypeOptions, expandTaskTypeFilterIds } from './taskTypeOptions';

describe('buildTaskTypeOptions — filtre Type sur les types présents', () => {
  it('lists only the types of the loaded tasks, most frequent first, with counts', () => {
    const opts = buildTaskTypeOptions([
      { type: 'room_service' },
      { type: 'room_service' },
      { type: 'transport' },
      { type: 'concierge' },
      { type: 'welcome_package' },
    ]);
    assert.deepEqual(
      opts.map((o) => o.id),
      ['room_service', 'concierge', 'transport', 'welcome_package'],
    );
    assert.equal(opts[0].label, '🍳 Room service (2)');
    assert.equal(opts[1].label, '🛎 Expérience (1)');
    assert.equal(opts[2].label, '🚗 Navette (1)');
  });
  it('keeps a selected type that has no task any more, at zero', () => {
    const opts = buildTaskTypeOptions([{ type: 'transport' }], ['cleaning_free']);
    assert.ok(opts.some((o) => o.id === 'cleaning_free' && o.count === 0));
    assert.ok(!opts.find((o) => o.id === 'cleaning_free')?.label.includes('('));
  });
  it('returns nothing for no tasks (the page falls back to the full list)', () => {
    assert.deepEqual(buildTaskTypeOptions([]), []);
  });
});

describe('famille Option séjour — ambiance, piscine, beds fusionnés (13/09)', () => {
  it('regroupe villa_experience, stay_option et les anciens tickets support sous un seul id', () => {
    const opts = buildTaskTypeOptions([
      { type: 'villa_experience' },
      { type: 'stay_option' },
      { type: 'support', stayOptionSubLabel: 'Beds piscine' },
      { type: 'support' },
      { type: 'room_service' },
    ]);
    const family = opts.find((o) => o.id === STAY_OPTION_FAMILY_ID);
    assert.ok(family, 'la famille Option séjour doit apparaître');
    assert.equal(family?.count, 3);
    assert.equal(family?.label, '🏖️ Option séjour (3)');
    // Le vrai ticket support (SAV, sans stayOptionSubLabel) reste un type à part.
    assert.ok(opts.some((o) => o.id === 'support' && o.count === 1));
  });

  it('expandTaskTypeFilterIds traduit la famille en types réels pour le backend', () => {
    assert.deepEqual(
      expandTaskTypeFilterIds([STAY_OPTION_FAMILY_ID, 'room_service']),
      ['villa_experience', 'stay_option', 'support', 'room_service'],
    );
    assert.deepEqual(expandTaskTypeFilterIds(['transport']), ['transport']);
  });
});
