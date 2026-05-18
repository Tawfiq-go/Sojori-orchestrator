/**
 * Données d'aperçu alignées sur srv-orchestrator (template-preview + interpolation).
 */
import { getReservation } from '../services/serverApi.adminConfig';
import { getListingById } from '../../listing/services/serverApi.listing';

export function joinListingMessageCheckout(messageCheckout) {
  if (messageCheckout == null || messageCheckout === '') return '';
  if (Array.isArray(messageCheckout)) {
    return messageCheckout
      .map((x) => (typeof x === 'string' ? x.trim() : String(x)))
      .filter(Boolean)
      .join('\n\n');
  }
  return String(messageCheckout).trim();
}

/** Comme formatCheckoutTimeDisplay côté orchestrateur */
export function formatCheckoutTimeDisplay(value) {
  if (value == null || value === '') return '11h';
  if (typeof value === 'number' && !Number.isNaN(value)) return `${value}h`;
  const s = String(value).trim();
  if (!s) return '11h';
  if (/^\d{1,2}h$/i.test(s)) return `${parseInt(s, 10)}h`;
  if (/^\d{1,2}$/.test(s)) return `${s}h`;
  return s;
}

export function buildCityTaxFromListingReservation(listing, reservation) {
  if (!listing || listing.cityTaxEnabled == null) {
    return 'Inclus';
  }
  if (!listing.cityTaxEnabled) {
    return 'Inclus';
  }
  const rate = Number(listing.cityTaxPerAdultPerNight) || 0;
  const adults = Number(reservation?.adults ?? reservation?.numberOfGuests) || 1;
  const nights = Number(reservation?.nights) || 1;
  return `${rate * adults * nights} MAD`;
}

export function buildWhatsappLinkFromReservationNumber(reservationNumber, language = 'fr') {
  const rn = reservationNumber || 'SJ-PREVIEW123';
  const text =
    language === 'en' || language === 'EN'
      ? `Hello, my reservation is ${rn}`
      : `Bonjour, ma réservation est ${rn}`;
  return `https://wa.me/212773745388?text=${encodeURIComponent(text)}`;
}

export function defaultMessageCheckoutPlaceholder(language) {
  return language === 'en' || language === 'EN'
    ? 'Please leave the property clean.'
    : 'Merci de laisser le logement propre.';
}

export function messageCheckoutForPreview(listing, reservation) {
  const joined = joinListingMessageCheckout(listing?.messageCheckout);
  if (joined) return joined;
  const lang = reservation?.language || reservation?.guestLanguage || 'fr';
  return defaultMessageCheckoutPlaceholder(lang);
}

/**
 * Première résa page + merge listing complet (messageCheckout[], city tax, etc.).
 */
export async function fetchEnrichedSampleReservation() {
  try {
    const response = await getReservation(1, 0);
    if (response.data.success && response.data.data?.length > 0) {
      const reservation = response.data.data[0];
      if (reservation.listingId || reservation.listing?._id) {
        try {
          const listingId = reservation.listingId || reservation.listing._id;
          const fullListing = await getListingById(listingId);
          if (fullListing) {
            reservation.listing = { ...reservation.listing, ...fullListing };
          }
        } catch {
          /* ignore */
        }
      }
      return reservation;
    }
  } catch {
    /* ignore */
  }
  return null;
}
