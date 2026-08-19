import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isReservationCancelledOnCalendar,
  isReservationVisibleOnCalendar,
} from './reservationCalendarUtils.js'

describe('isReservationVisibleOnCalendar', () => {
  it('hides Cancelled even if not acknowledged and unpaid', () => {
    const res = {
      status: 'Cancelled',
      cancellationAcknowledged: false,
      paymentStatus: 'UnPaid',
    }
    assert.equal(isReservationCancelledOnCalendar(res), true)
    assert.equal(isReservationVisibleOnCalendar(res), false)
  })

  it('hides CancelledByOta with cancellationDate', () => {
    assert.equal(
      isReservationVisibleOnCalendar({
        status: 'CancelledByOta',
        cancellationDate: '2026-08-19T10:00:00.000Z',
        cancellationAcknowledged: false,
      }),
      false,
    )
  })

  it('keeps Confirmed occupying stays', () => {
    assert.equal(isReservationVisibleOnCalendar({ status: 'Confirmed' }), true)
  })
})
