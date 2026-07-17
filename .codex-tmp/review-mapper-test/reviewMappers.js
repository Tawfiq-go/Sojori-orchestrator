"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReview = parseReview;
exports.normalizeReviewChannel = normalizeReviewChannel;
exports.mapReviewApiRows = mapReviewApiRows;
function stripHtml(value) {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function bookingScore(value) {
    const match = value.match(/overall(?:\s+score)?\s*:?\s*(\d+(?:[.,]\d+)?)/i);
    if (!match)
        return undefined;
    const score = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(score) || score < 0)
        return undefined;
    return Math.min(5, score > 5 ? score / 2 : score);
}
function parseReview(messages) {
    let rating;
    let message = '';
    let response = '';
    for (const msg of messages || []) {
        const body = msg?.body;
        if (!body)
            continue;
        const raw = typeof body === 'string' ? body : JSON.stringify(body);
        const parsedBookingScore = bookingScore(raw);
        if (parsedBookingScore != null)
            rating = parsedBookingScore;
        try {
            const data = typeof body === 'string' ? JSON.parse(body) : body;
            if (data.Rating != null && data.Rating !== '') {
                const parsedRating = Number(data.Rating);
                if (Number.isFinite(parsedRating) && parsedRating >= 0)
                    rating = parsedRating;
            }
            if (data.Message)
                message = message || String(data.Message);
            if (data.Response)
                response = String(data.Response);
        }
        catch {
            const plain = stripHtml(raw);
            if (plain.length > 12)
                message = message || plain;
        }
    }
    return { rating: rating ?? 5, message, response };
}
function normalizeReviewChannel(rawChannel, messages) {
    const channel = String(rawChannel || '').trim().toLowerCase();
    if (channel.includes('airbnb'))
        return 'Airbnb';
    if (channel === 'guestreview' || channel.includes('booking'))
        return 'Booking.com';
    const bodies = (messages || []).map((msg) => String(msg?.body || '')).join(' ');
    if (/overall(?:\s+score)?\s*:|\bi liked\s*:|\bi did not like\s*:/i.test(bodies)) {
        return 'Booking.com';
    }
    return 'Airbnb';
}
function mapReviewApiRows(threadsData) {
    return threadsData.map((item) => {
        const threadData = item.thread || item;
        const reservation = item.reservation || {};
        const messages = item.messages || [];
        const review = parseReview(messages);
        const channel = normalizeReviewChannel(threadData.communicationChannel || reservation.channelName, messages);
        return {
            id: String(threadData._id),
            threadId: String(threadData.threadId),
            guestName: reservation.guestName || threadData.recipientName || 'Guest',
            listingName: reservation.listingName || 'Listing',
            channel,
            reservationNumber: reservation.reservationNumber || '-',
            lastMessageTime: threadData.lastMessageAt,
            rating: review.rating,
            reviewText: review.message || threadData.preview || '',
            response: review.response,
            replied: Boolean(review.response || threadData.reviewStatus === 'responded'),
            checkInDate: reservation.arrivalDate,
            checkOutDate: reservation.departureDate,
        };
    });
}
