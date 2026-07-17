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
