import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  expandPlanningListingRows,
  isPlanningMultiHotel,
  countReservationsOnDay,
} from './planningMultiExpand';
import type { ListingRow, ReservationRow } from '../components/calendar-views/_shared';

function resa(partial: Partial<ReservationRow> & { reservationId: string }): ReservationRow {
  return {
    guestName: 'G',
    arrivalDate: '2026-08-01',
    departureDate: '2026-08-03',
    checkIn: '2026-08-01',
    checkOut: '2026-08-03',
    status: 'confirmed',
    ...partial,
  } as ReservationRow;
}

function multiListing(over: Partial<ListingRow> = {}): ListingRow {
  return {
    listingId: 'hotel1',
    listingName: 'Hotel CFC',
    city: 'Casablanca',
    propertyUnit: 'Multi',
    roomTypes: [
      {
        id: 'rt-suite',
        name: 'Suite',
        rooms: [
          { id: 'r1', name: 'Suite 1' },
          { id: 'r2', name: 'Suite 2' },
        ],
      },
      {
        id: 'rt-std',
        name: 'Standard',
        rooms: [
          { id: 's1', name: 'Std 1' },
          { id: 's2', name: 'Std 2' },
        ],
      },
    ],
    reservations: [],
    ...over,
  };
}

describe('isPlanningMultiHotel', () => {
  it('true only for Multi with >1 roomTypes', () => {
    assert.equal(isPlanningMultiHotel(multiListing()), true);
    assert.equal(
      isPlanningMultiHotel({
        propertyUnit: 'Single',
        roomTypes: multiListing().roomTypes,
      }),
      false,
    );
  });
});

describe('countReservationsOnDay', () => {
  it('counts overlapping stays (checkout day free)', () => {
    const list = [
      resa({ reservationId: 'a', arrivalDate: '2026-08-01', departureDate: '2026-08-04' }),
      resa({ reservationId: 'b', arrivalDate: '2026-08-02', departureDate: '2026-08-03' }),
    ];
    assert.equal(countReservationsOnDay(list, '2026-08-01'), 1);
    assert.equal(countReservationsOnDay(list, '2026-08-02'), 2);
    assert.equal(countReservationsOnDay(list, '2026-08-03'), 1);
    assert.equal(countReservationsOnDay(list, '2026-08-04'), 0);
  });
});

describe('expandPlanningListingRows Multi', () => {
  it('Single unchanged', () => {
    const single: ListingRow = {
      listingId: 's1',
      listingName: 'Flat',
      city: 'Casa',
      propertyUnit: 'Single',
      reservations: [resa({ reservationId: 'a' })],
    };
    const out = expandPlanningListingRows(single, true, {});
    assert.equal(out.length, 1);
    assert.equal(out[0].reservations.length, 1);
    assert.equal(out[0].occupancyDayCounts, undefined);
  });

  it('building collapsed = hotel only with day counts', () => {
    const listing = multiListing({
      reservations: [
        resa({ reservationId: 'a', roomTypeId: 'rt-suite', roomId: 'r1' }),
      ],
    });
    const out = expandPlanningListingRows(listing, false, {});
    assert.equal(out.length, 1);
    assert.equal(out[0].occupancyDayCounts, true);
    assert.equal(out[0].reservations.length, 1);
    assert.equal(out[0].roomTypeCount, 1);
  });

  it('building + roomType: day counts; rooms hidden when RT collapsed', () => {
    const listing = multiListing({
      reservations: [
        resa({ reservationId: 'a', roomTypeId: 'rt-suite', roomTypeName: 'Suite', roomId: 'r1' }),
        resa({
          reservationId: 'b',
          roomTypeId: 'rt-suite',
          roomTypeName: 'Suite',
          roomId: 'r2',
          arrivalDate: '2026-08-02',
          departureDate: '2026-08-04',
        }),
      ],
    });
    const out = expandPlanningListingRows(listing, true, {});
    assert.equal(out[0].occupancyDayCounts, true);
    assert.equal(out[0].reservations.length, 2);
    const suite = out.find((r) => r.listingName === 'Suite');
    assert.ok(suite);
    assert.equal(suite!.occupancyDayCounts, true);
    assert.equal(suite!.reservations.length, 2);
    assert.ok(!out.some((r) => r.isRoomRow));
    assert.ok(!out.some((r) => r.listingName === 'Standard'));
  });

  it('roomType open: day counts on RT + bars on rooms', () => {
    const listing = multiListing({
      reservations: [
        resa({
          reservationId: 'a',
          roomTypeId: 'rt-suite',
          roomTypeName: 'Suite',
          roomId: 'r1',
          roomName: 'Suite 1',
        }),
      ],
    });
    const out = expandPlanningListingRows(listing, true, { 'hotel1:rt-suite': true });
    const suite = out.find((r) => r.listingName === 'Suite');
    assert.equal(suite!.occupancyDayCounts, true);
    assert.equal(suite!.reservations.length, 1);
    const rooms = out.filter((r) => r.isRoomRow);
    assert.equal(rooms.length, 1);
    assert.equal(rooms[0].listingName, 'Suite 1');
    assert.equal(rooms[0].occupancyDayCounts, false);
    assert.equal(rooms[0].reservations.length, 1);
  });

  it('unassigned on dedicated day-count row', () => {
    const listing = multiListing({
      reservations: [resa({ reservationId: 'x' })],
    });
    const out = expandPlanningListingRows(listing, true, {});
    const ua = out.find((r) => r.listingName === 'Non assigné');
    assert.ok(ua);
    assert.equal(ua!.occupancyDayCounts, true);
    assert.equal(out[0].occupancyDayCounts, true);
    assert.equal(out[0].reservations.length, 1);
  });
});
