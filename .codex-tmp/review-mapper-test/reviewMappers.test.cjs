"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const reviewMappers_1 = require("./reviewMappers");
(0, node_test_1.default)('maps RU review channels to their OTA', () => {
    strict_1.default.equal((0, reviewMappers_1.normalizeReviewChannel)('GuestReview', []), 'Booking.com');
    strict_1.default.equal((0, reviewMappers_1.normalizeReviewChannel)('AirbnbGuestReview', []), 'Airbnb');
});
(0, node_test_1.default)('recognizes Booking review content when the channel is missing', () => {
    strict_1.default.equal((0, reviewMappers_1.normalizeReviewChannel)(undefined, [{ body: 'Summary: Nice stay. Overall score : 8' }]), 'Booking.com');
});
(0, node_test_1.default)('converts Booking ten-point overall score to five stars', () => {
    const parsed = (0, reviewMappers_1.parseReview)([{ body: '<p>Overall score : 8</p><p>I liked : Location</p>' }]);
    strict_1.default.equal(parsed.rating, 4);
    strict_1.default.match(parsed.message, /Overall score/);
});
(0, node_test_1.default)('uses backend review status when a response is not embedded in the body', () => {
    const [row] = (0, reviewMappers_1.mapReviewApiRows)([{
            thread: { _id: 'thread-db-id', threadId: 12, communicationChannel: 'GuestReview', reviewStatus: 'responded' },
            reservation: { reservationNumber: 'BOOK-1', guestName: 'Guest' },
            messages: [{ body: 'Overall score: 10' }],
        }]);
    strict_1.default.equal(row.channel, 'Booking.com');
    strict_1.default.equal(row.rating, 5);
    strict_1.default.equal(row.replied, true);
});
