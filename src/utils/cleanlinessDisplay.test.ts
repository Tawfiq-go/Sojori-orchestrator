import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveDisplayCleanliness } from './cleanlinessDisplay';

const TODAY = new Date('2025-06-23T12:00:00.000Z');

const activeStay = {
  arrivalDate: '2025-06-20',
  departureDate: '2025-06-26',
  status: 'confirmed',
};

describe('deriveDisplayCleanliness', () => {
  it('occupancyStatus occupied always → occupied', () => {
    assert.equal(
      deriveDisplayCleanliness(
        { occupancyStatus: 'occupied', cleanlinessStatus_v2: 'dirty' },
        [],
        TODAY,
      ),
      'occupied',
    );
  });

  it('active reservation + vacant + dirty → occupied', () => {
    assert.equal(
      deriveDisplayCleanliness(
        { occupancyStatus: 'vacant', cleanlinessStatus_v2: 'dirty' },
        [activeStay],
        TODAY,
      ),
      'occupied',
    );
  });

  it('active reservation + vacant + clean → occupied', () => {
    assert.equal(
      deriveDisplayCleanliness(
        { occupancyStatus: 'vacant', cleanlinessStatus_v2: 'clean' },
        [activeStay],
        TODAY,
      ),
      'occupied',
    );
  });

  it('no active reservation + vacant + dirty → dirty', () => {
    assert.equal(
      deriveDisplayCleanliness(
        { occupancyStatus: 'vacant', cleanlinessStatus_v2: 'dirty' },
        [],
        TODAY,
      ),
      'dirty',
    );
  });

  it('no active reservation + vacant + clean → clean', () => {
    assert.equal(
      deriveDisplayCleanliness(
        { occupancyStatus: 'vacant', cleanlinessStatus_v2: 'clean' },
        [],
        TODAY,
      ),
      'clean',
    );
  });

  it('no active reservation + vacant + in_progress → in_progress', () => {
    assert.equal(
      deriveDisplayCleanliness(
        { occupancyStatus: 'vacant', cleanlinessStatus_v2: 'in_progress' },
        [],
        TODAY,
      ),
      'in_progress',
    );
  });

  it('past reservation does not force occupied', () => {
    assert.equal(
      deriveDisplayCleanliness(
        { occupancyStatus: 'vacant', cleanlinessStatus_v2: 'dirty' },
        [{ arrivalDate: '2025-06-01', departureDate: '2025-06-10', status: 'confirmed' }],
        TODAY,
      ),
      'dirty',
    );
  });
});
