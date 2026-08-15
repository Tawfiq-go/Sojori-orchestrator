import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildRoomTypesForListing,
  buildSingleUnitResaRows,
  flattenInventoryReservationsForOverlay,
  isMultiHotelListing,
  mergeOverlayReservationLists,
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
})
