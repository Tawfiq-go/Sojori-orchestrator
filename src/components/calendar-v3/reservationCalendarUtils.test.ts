import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isReservationCancelledOnCalendar,
  isReservationVisibleOnCalendar,
  calendarTodayStayBadges,
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

  it('shows Completed only on departure day', () => {
    assert.equal(
      isReservationVisibleOnCalendar(
        { status: 'Completed', departureDate: '2026-08-26' },
        '2026-08-26',
      ),
      true,
    )
    assert.equal(
      isReservationVisibleOnCalendar(
        { status: 'Completed', departureDate: '2026-08-25' },
        '2026-08-26',
      ),
      false,
    )
  })
})

describe('calendarTodayStayBadges', () => {
  it('arrivée Confirmé = rouge, Started = vert', () => {
    const red = calendarTodayStayBadges(
      { arrivalDate: '2026-08-26', departureDate: '2026-08-30', status: 'Confirmed' },
      '2026-08-26',
    )
    assert.equal(red.nameCircle?.color, '#c81e1e')
    const green = calendarTodayStayBadges(
      { arrivalDate: '2026-08-26', departureDate: '2026-08-30', status: 'Started' },
      '2026-08-26',
    )
    assert.equal(green.nameCircle?.color, '#0a8f5e')
  })

  it('départ encore en maison = rouge, Completed = vert', () => {
    const redStarted = calendarTodayStayBadges(
      { arrivalDate: '2026-08-22', departureDate: '2026-08-26', status: 'Started' },
      '2026-08-26',
    )
    assert.equal(redStarted.departureCircle?.color, '#c81e1e')
    const redConfirmed = calendarTodayStayBadges(
      { arrivalDate: '2026-08-22', departureDate: '2026-08-26', status: 'Confirmed' },
      '2026-08-26',
    )
    assert.equal(redConfirmed.departureCircle?.color, '#c81e1e')
    const green = calendarTodayStayBadges(
      { arrivalDate: '2026-08-22', departureDate: '2026-08-26', status: 'Completed' },
      '2026-08-26',
    )
    assert.equal(green.departureCircle?.color, '#0a8f5e')
  })

  it('arrivée Confirmé + mewsState Started = vert', () => {
    const green = calendarTodayStayBadges(
      {
        arrivalDate: '2026-08-26',
        departureDate: '2026-08-30',
        status: 'Confirmed',
        mewsState: 'Started',
      },
      '2026-08-26',
    )
    assert.equal(green.nameCircle?.color, '#0a8f5e')
  })

  it('arrivée Inside = vert (déjà en maison)', () => {
    const green = calendarTodayStayBadges(
      { arrivalDate: '2026-08-27', departureDate: '2026-08-30', status: 'Inside' },
      '2026-08-27',
    )
    assert.equal(green.nameCircle?.color, '#0a8f5e')
  })

  it('Confirmé J+2 après arrivée = rouge (pas encore Started)', () => {
    const late = calendarTodayStayBadges(
      {
        arrivalDate: '2026-08-25',
        departureDate: '2026-09-01',
        status: 'Confirmed',
        guestName: 'BATESMI COMSTANT',
      },
      '2026-08-27',
    )
    assert.equal(late.nameCircle?.color, '#c81e1e')
  })

  it('Started J+2 = plus de cercle rouge (check-in déjà fait)', () => {
    const inHouse = calendarTodayStayBadges(
      { arrivalDate: '2026-08-25', departureDate: '2026-09-01', status: 'Started' },
      '2026-08-27',
    )
    assert.equal(inHouse.nameCircle, null)
  })

  it('arrivée future Confirmé = pas de cercle', () => {
    const future = calendarTodayStayBadges(
      { arrivalDate: '2026-08-29', departureDate: '2026-09-01', status: 'Confirmed' },
      '2026-08-27',
    )
    assert.equal(future.nameCircle, null)
  })
})

describe('isReservationVisibleOnCalendar todayIso', () => {
  it('ignores Array.filter index as todayIso', () => {
    const res = { status: 'Completed', departureDate: '1999-01-01' }
    assert.equal(isReservationVisibleOnCalendar(res, 1), false)
    assert.equal(isReservationVisibleOnCalendar(res, '1999-01-01'), true)
  })
})
