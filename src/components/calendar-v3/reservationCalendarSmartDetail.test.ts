import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  collectReservationExtraItems,
  mapLedgerExtrasToItems,
  mergeExtraItems,
  guestFacingNotes,
  moneyMad,
  rateLinesFromReservation,
  stayTotalsFromReservation,
} from './reservationCalendarSmartDetail.js'

describe('reservationCalendarSmartDetail', () => {
  it('formats MAD', () => {
    assert.match(moneyMad(1200), /1.?200 MAD/)
  })

  it('ignores listing catalog services without consumption', () => {
    const items = collectReservationExtraItems({
      services: [
        {
          type: 'Transport at Arrival',
          options: [{ pickup: 'Aéroport', price: 300, city: 'Marrakech' }],
        },
      ],
    })
    assert.equal(items.length, 0)
  })

  it('collects consumed extras only', () => {
    const items = collectReservationExtraItems({
      extras: [{ name: 'Mini-bar Coca', amount: 60, qty: 2 }],
      services: [{ name: 'Late checkout', price: 200, selected: true }],
    })
    assert.equal(items.length, 2)
    assert.equal(items[0]!.name, 'Mini-bar Coca')
  })

  it('hides cancelled ledger extras and merges without dupes', () => {
    const ledger = mapLedgerExtrasToItems([
      { type: 'extra', name: 'Mini-bar Coca', amount: 60, status: 'confirmed' },
      { type: 'extra', name: 'X', amount: 10, status: 'cancelled' },
      { type: 'expense', name: 'Salaire', amount: 900 },
    ])
    assert.equal(ledger.length, 1)
    const merged = mergeExtraItems([{ name: 'Mini-bar Coca', amount: 60, qty: 1 }], ledger)
    assert.equal(merged.length, 1)
  })

  it('builds rate lines and stay due', () => {
    const lines = rateLinesFromReservation({
      reservationBreakdown: {
        normalizedBreakdown: {
          accommodation: { amount: 2000 },
          fees: [{ name: 'Cleaning fee', amount: 250 }],
        },
      },
    })
    assert.equal(lines[0]!.name, 'Séjour')
    assert.equal(lines[1]!.name, 'Ménage')
    const tot = stayTotalsFromReservation(
      { alreadyPaid: 500, totalPrice: 2250, paymentStatus: 'Unpaid' },
      2250,
    )
    assert.equal(tot.stayDue, 1750)
  })

  it('reads totalEst from overlay notes and hides technical dumps', () => {
    const notes =
      'source:mews | origin:CommanderPhone | channel:Nommos | room:Villa executive 09 | roomType:villa signature | roomId:6a763507fc05d00aba524a3b | totalEst:16168'
    const tot = stayTotalsFromReservation({ notes }, null)
    assert.equal(tot.stayTotal, 16168)
    assert.equal(guestFacingNotes(notes), '')
    assert.equal(guestFacingNotes('Allergie arachides'), 'Allergie arachides')
  })
})
