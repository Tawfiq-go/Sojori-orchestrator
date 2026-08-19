import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildRoomTypesForListing,
  buildSingleUnitResaRows,
  flattenInventoryReservationsForOverlay,
  isMultiHotelListing,
  mergeOverlayReservationLists,
  normalizeMultiOverlayReservation,
} from './multiCalendarReservations.js'

describe('isMultiHotelListing', () => {
  it('uses catalog types before inventory so Multi is never painted as Single', () => {
    const listing = {
      propertyUnit: 'Multi',
      roomTypes: [{ _id: 'rt1' }, { _id: 'rt2' }],
    }
    assert.equal(isMultiHotelListing(listing, []), true)
    assert.equal(isMultiHotelListing({ propertyUnit: 'Single', roomTypes: listing.roomTypes }, []), false)
  })
})

describe('buildRoomTypesForListing', () => {
  it('builds types+rooms from catalog when inventory is empty', () => {
    const listing = {
      roomTypes: [
        {
          _id: 'rt1',
          roomTypeName: 'Villa',
          rooms: [{ _id: 'room-a', roomName: 'Villa A' }],
        },
        {
          _id: 'rt2',
          roomTypeName: 'Suite',
          rooms: [{ _id: 'room-b', roomName: 'Suite 1' }],
        },
      ],
    }
    const tree = buildRoomTypesForListing({ listing, inventoryBlock: {} })
    assert.equal(tree.length, 2)
    assert.equal(tree[0]!.name, 'Villa')
    assert.equal(tree[0]!.rooms[0]!.name, 'Villa A')
    assert.equal(tree[1]!.name, 'Suite')
  })

  it('keeps catalog rooms when inventory arrives (same ids)', () => {
    const listing = {
      roomTypes: [
        {
          _id: 'rt1',
          roomTypeName: 'Villa',
          rooms: [{ _id: 'room-a', roomName: 'Villa A' }],
        },
      ],
    }
    const tree = buildRoomTypesForListing({
      listing,
      inventoryBlock: {
        rt1: { name: 'Villa', availability: { '2026-08-14': { rate: 100 } } },
      },
    })
    assert.equal(tree.length, 1)
    assert.equal(tree[0]!.id, 'rt1')
    assert.equal(tree[0]!.availability['2026-08-14']!.rate, 100)
    assert.equal(tree[0]!.rooms[0]!.id, 'room-a')
  })
})

describe('buildSingleUnitResaRows', () => {
  it('is always one Resa row — never room types', () => {
    const rows = buildSingleUnitResaRows({
      listingId: 'lid1',
      listingResas: [
        { _id: 'a' },
        { _id: 'b', roomTypeId: 'rt1', roomId: 'room-1' },
      ],
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0]!.room.name, 'Resa')
    assert.equal(rows[0]!.roomResas.length, 2)
  })
})

describe('flattenInventoryReservationsForOverlay', () => {
  it('dedupes day copies and tags listingId for instant paint', () => {
    const rows = flattenInventoryReservationsForOverlay({
      lid1: {
        rt1: {
          name: 'Villa',
          availability: {
            '2026-08-14': {
              reservations: [
                {
                  _id: 'r1',
                  guestFirstName: 'Ada',
                  arrivalDate: '2026-08-14',
                  departureDate: '2026-08-16',
                },
              ],
            },
            '2026-08-15': {
              reservations: [
                {
                  _id: 'r1',
                  guestFirstName: 'Ada',
                  arrivalDate: '2026-08-14',
                  departureDate: '2026-08-16',
                },
              ],
            },
          },
        },
      },
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0]!._id, 'r1')
    assert.equal(rows[0]!.listingId, 'lid1')
    assert.equal(rows[0]!.roomTypeId, 'rt1')
  })

  it('dedupes the same stay copied on every day without _id', () => {
    const rows = flattenInventoryReservationsForOverlay({
      lid1: {
        rt1: {
          name: 'Villa',
          availability: {
            '2026-08-14': {
              reservations: [
                {
                  guestName: 'Mr ILYAS',
                  roomName: 'Villa signature 08',
                  arrivalDate: '2026-08-14',
                  departureDate: '2026-08-18',
                },
              ],
            },
            '2026-08-15': {
              reservations: [
                {
                  guestName: 'Mr ILYAS',
                  roomName: 'Villa signature 08',
                  arrivalDate: '2026-08-14',
                  departureDate: '2026-08-18',
                },
              ],
            },
          },
        },
      },
    })
    assert.equal(rows.length, 1)
  })

  it('skips cancelled inventory copies', () => {
    const rows = flattenInventoryReservationsForOverlay({
      lid1: {
        rt1: {
          name: 'Villa',
          availability: {
            '2026-08-25': {
              reservations: [
                {
                  _id: 'c1',
                  guestName: 'amar mamoune',
                  status: 'Cancelled',
                  cancellationAcknowledged: false,
                  arrivalDate: '2026-08-25',
                  departureDate: '2026-09-01',
                },
                {
                  _id: 'ok1',
                  guestName: 'Ada',
                  status: 'Confirmed',
                  arrivalDate: '2026-08-25',
                  departureDate: '2026-08-27',
                },
              ],
            },
          },
        },
      },
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0]!._id, 'ok1')
  })
})

describe('mergeOverlayReservationLists', () => {
  it('keeps inventory seed until fetch arrives, then prefers fetch', () => {
    const seed = [{ _id: 'r1', guestFirstName: 'Ada' }]
    const fetched = [{ _id: 'r1', guestFirstName: 'Ada Lovelace' }, { _id: 'r2' }]
    assert.equal(mergeOverlayReservationLists(seed, []).length, 1)
    const merged = mergeOverlayReservationLists(seed, fetched)
    assert.equal(merged.length, 2)
    assert.equal(merged.find((r) => r._id === 'r1')?.guestFirstName, 'Ada Lovelace')
  })

  it('collapses seed+fetch of the same stay with different ids', () => {
    const merged = mergeOverlayReservationLists(
      [
        {
          _id: 'inv-1',
          listingId: 'lid',
          roomName: 'Villa 08',
          arrivalDate: '2026-08-14',
          departureDate: '2026-08-18',
          guestName: 'Mr ILYAS',
        },
      ],
      [
        {
          _id: 'mongo-1',
          listingId: 'lid',
          roomName: 'Villa 08',
          arrivalDate: '2026-08-14',
          departureDate: '2026-08-18',
          guestName: 'MR ILYASS',
        },
      ],
    )
    assert.equal(merged.length, 1)
    assert.equal(merged[0]!._id, 'mongo-1')
  })

  it('drops cancelled overlay even if unpaid and not acknowledged', () => {
    const merged = mergeOverlayReservationLists(
      [
        {
          _id: 'r1',
          listingId: 'lid',
          roomName: 'Villa 03',
          arrivalDate: '2026-08-25',
          departureDate: '2026-09-01',
          guestName: 'amar mamoune',
          status: 'Confirmed',
        },
      ],
      [
        {
          _id: 'r1',
          reservationNumber: 'SJ-2OW6O0E0',
          listingId: 'lid',
          arrivalDate: '2026-08-25',
          departureDate: '2026-09-01',
          guestName: 'amar mamoune',
          status: 'Cancelled',
          cancellationAcknowledged: false,
          paymentStatus: 'UnPaid',
        },
      ],
    )
    assert.equal(merged.length, 0)
  })

  it('evicts inventory seed when live copy is cancelled without the same room', () => {
    const merged = mergeOverlayReservationLists(
      [
        {
          _id: 'inv-1',
          listingId: 'lid',
          roomName: 'Villa 03',
          arrivalDate: '2026-08-25',
          departureDate: '2026-09-01',
          guestName: 'amar mamoune',
          status: 'Confirmed',
        },
      ],
      [
        {
          _id: 'mongo-1',
          reservationNumber: 'SJ-2OW6O0E0',
          listingId: 'lid',
          arrivalDate: '2026-08-25',
          departureDate: '2026-09-01',
          guestName: 'amar mamoune',
          status: 'Cancelled',
          cancellationAcknowledged: false,
        },
      ],
    )
    assert.equal(merged.length, 0)
  })
})

describe('normalizeMultiOverlayReservation', () => {
  it('hides Cancelled even when inventory shell is still Confirmed', () => {
    const hidden = normalizeMultiOverlayReservation({
      _id: 'r1',
      status: 'Cancelled',
      cancellationAcknowledged: false,
      paymentStatus: 'UnPaid',
      arrivalDate: '2026-08-25',
      departureDate: '2026-09-01',
      guestName: 'amar mamoune',
    })
    assert.equal(hidden, null)
  })
})
