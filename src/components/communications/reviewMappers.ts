export interface ReviewRow {
  id: string;
  threadId: string;
  guestName: string;
  listingName: string;
  channel: string;
  reservationNumber: string;
  lastMessageTime?: string;
  rating: number;
  reviewText: string;
  response?: string;
  replied: boolean;
  checkInDate?: string;
  checkOutDate?: string;
  reservationStatus?: string;
  reservationCreatedAt?: string;
  nightsCount?: number;
  guestsCount?: number;
  totalPrice?: number;
  currency?: string;
}

interface ReviewSummary {
  rating?: number;
  customerComment?: string;
  publicResponse?: string;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function bookingScore(value: string): number | undefined {
  const match = value.match(/overall(?:\s+score)?\s*:?\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) return undefined;
  const score = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(score) || score < 0) return undefined;
  return Math.min(5, score > 5 ? score / 2 : score);
}

export function parseReview(messages: any[], summary?: ReviewSummary) {
  let rating: number | undefined;
  let message = '';
  let response = '';

  for (const msg of messages || []) {
    const body = msg?.body;
    if (!body) continue;

    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    if (msg?.isIncoming !== false) {
      const parsedBookingScore = bookingScore(raw);
      if (parsedBookingScore != null) rating = parsedBookingScore;
    }

    try {
      const data = msg?.parsedReview || (typeof body === 'string' ? JSON.parse(body) : body);
      if (msg?.isIncoming !== false && data.Rating != null && data.Rating !== '') {
        const parsedRating = Number(data.Rating);
        if (Number.isFinite(parsedRating) && parsedRating >= 0) {
          rating = Math.min(5, parsedRating > 5 ? parsedRating / 2 : parsedRating);
        }
      }
      const candidate = data.Message ? String(data.Message) : '';
      if (msg?.isIncoming === false) response = response || candidate;
      else if (candidate) message = message || candidate;
      if (data.Response) response = String(data.Response);
    } catch {
      const plain = stripHtml(raw);
      if (plain.length > 12) {
        if (msg?.isIncoming === false) response = response || plain;
        else message = message || plain;
      }
    }
  }

  return {
    rating: summary?.rating ?? rating ?? 5,
    message: summary?.customerComment || message,
    response: summary?.publicResponse || response,
  };
}

function resolveListingName(reservation: any, threadData: any): string {
  const listing = reservation?.sojoriId;
  if (listing && typeof listing === 'object' && listing.name) return String(listing.name);
  return String(
    reservation?.listingName ||
      reservation?.listingTitle ||
      reservation?.propertyName ||
      threadData?.listingName ||
      'Listing',
  );
}

export function normalizeReviewChannel(rawChannel: unknown, messages: any[]): string {
  const channel = String(rawChannel || '').trim().toLowerCase();
  if (channel.includes('airbnb')) return 'Airbnb';
  if (channel === 'guestreview' || channel.includes('booking')) return 'Booking.com';

  const bodies = (messages || []).map((msg) => String(msg?.body || '')).join(' ');
  if (/overall(?:\s+score)?\s*:|\bi liked\s*:|\bi did not like\s*:/i.test(bodies)) {
    return 'Booking.com';
  }

  return 'Airbnb';
}

export function mapReviewApiRows(threadsData: any[]): ReviewRow[] {
  return threadsData.map((item: any) => {
    const threadData = item.thread || item;
    const reservation = item.reservation || {};
    const messages = item.messages || [];
    const review = parseReview(messages, item.reviewSummary);
    const channel = normalizeReviewChannel(
      threadData.communicationChannel || reservation.channelName,
      messages,
    );

    return {
      id: String(threadData._id),
      threadId: String(threadData.threadId),
      guestName: reservation.guestName || threadData.recipientName || 'Guest',
      listingName: resolveListingName(reservation, threadData),
      channel,
      reservationNumber: reservation.reservationNumber || '-',
      lastMessageTime: threadData.lastMessageAt,
      rating: review.rating,
      reviewText: review.message || threadData.preview || '',
      response: review.response,
      replied: Boolean(review.response || threadData.reviewStatus === 'responded'),
      checkInDate: reservation.arrivalDate,
      checkOutDate: reservation.departureDate,
      reservationStatus: reservation.status,
      reservationCreatedAt: reservation.createdAt,
      nightsCount: reservation.nights,
      guestsCount: reservation.numberOfGuests,
      totalPrice: reservation.totalPrice,
      currency: reservation.currency,
    };
  });
}
