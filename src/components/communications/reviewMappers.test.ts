import assert from 'node:assert/strict';
import test from 'node:test';
import { mapReviewApiRows, normalizeReviewChannel, parseReview } from './reviewMappers';

test('maps RU review channels to their OTA', () => {
  assert.equal(normalizeReviewChannel('GuestReview', []), 'Booking.com');
  assert.equal(normalizeReviewChannel('AirbnbGuestReview', []), 'Airbnb');
});

test('recognizes Booking review content when the channel is missing', () => {
  assert.equal(
    normalizeReviewChannel(undefined, [{ body: 'Summary: Nice stay. Overall score : 8' }]),
    'Booking.com',
  );
});

test('converts Booking ten-point overall score to five stars', () => {
  const parsed = parseReview([{ body: '<p>Overall score : 8</p><p>I liked : Location</p>' }]);
  assert.equal(parsed.rating, 4);
  assert.match(parsed.message, /Overall score/);
});

test('uses backend review status when a response is not embedded in the body', () => {
  const [row] = mapReviewApiRows([{
    thread: { _id: 'thread-db-id', threadId: 12, communicationChannel: 'GuestReview', reviewStatus: 'responded' },
    reservation: { reservationNumber: 'BOOK-1', guestName: 'Guest' },
    messages: [{ body: 'Overall score: 10' }],
  }]);

  assert.equal(row.channel, 'Booking.com');
  assert.equal(row.rating, 5);
  assert.equal(row.replied, true);
});

test('keeps the incoming customer comment separate from the outgoing public response', () => {
  const parsed = parseReview([
    { body: 'Merci infiniment pour ce magnifique retour.', isIncoming: false },
    { body: JSON.stringify({ Rating: 5, Message: 'Séjour exceptionnel.' }), isIncoming: true },
  ]);

  assert.equal(parsed.message, 'Séjour exceptionnel.');
  assert.equal(parsed.response, 'Merci infiniment pour ce magnifique retour.');
});

test('prefers the explicit backend review summary and maps reservation context', () => {
  const [row] = mapReviewApiRows([{
    thread: { _id: 'db-id', threadId: 42, communicationChannel: 'GuestReview', reviewStatus: 'responded' },
    reservation: {
      reservationNumber: 'SJ-KBMGARWF',
      guestName: 'Hesham',
      sojoriId: { name: 'Riad Sojori' },
      status: 'Confirmed',
      createdAt: '2026-07-01T12:00:00Z',
      arrivalDate: '2026-07-10T00:00:00Z',
      departureDate: '2026-07-13T00:00:00Z',
      nights: 3,
      numberOfGuests: 2,
      totalPrice: 450,
      currency: 'EUR',
    },
    messages: [{ body: 'wrong fallback', isIncoming: true }],
    reviewSummary: {
      rating: 5,
      customerComment: 'Parfait.',
      publicResponse: 'Merci Hesham.',
    },
  }]);

  assert.equal(row.reviewText, 'Parfait.');
  assert.equal(row.response, 'Merci Hesham.');
  assert.equal(row.listingName, 'Riad Sojori');
  assert.equal(row.reservationStatus, 'Confirmed');
  assert.equal(row.nightsCount, 3);
  assert.equal(row.guestsCount, 2);
});
