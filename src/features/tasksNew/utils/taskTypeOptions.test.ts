import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTaskTypeOptions } from './taskTypeOptions';

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
