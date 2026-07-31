/**
 * Liens externes OTA (Airbnb / Booking / Vrbo) pour « Ouvrir sur … ».
 * Airbnb : code HM… → fiche réservation host (fiable ; pas d’ID message Airbnb en base).
 */

export type OtaPlatformLinkInput = {
  platform?: string | null;
  /** Code confirmation Airbnb (ex. HMW93CCS2Z) ou id Booking si connu */
  otaCode?: string | null;
  reservationNumber?: string | null;
  threadId?: string | number | null;
};

function normPlatform(raw?: string | null): 'airbnb' | 'booking' | 'vrbo' | 'other' {
  const s = String(raw || '').toLowerCase();
  if (s.includes('airbnb') || s === 'ab' || s === 'airbnb') return 'airbnb';
  if (s.includes('booking') || s === 'bk') return 'booking';
  if (s.includes('vrbo') || s.includes('homeaway')) return 'vrbo';
  return 'other';
}

/** Code Airbnb confirmation : HM + alphanum. */
export function isAirbnbConfirmationCode(code?: string | null): boolean {
  const c = String(code || '').trim().toUpperCase();
  return /^HM[A-Z0-9]{6,}$/.test(c);
}

/**
 * URL externe à ouvrir dans un nouvel onglet.
 * Retourne null si aucune cible raisonnable.
 */
export function buildOtaPlatformExternalUrl(input: OtaPlatformLinkInput): string | null {
  const platform = normPlatform(input.platform);
  const code = String(input.otaCode || '').trim();

  if (platform === 'airbnb') {
    if (isAirbnbConfirmationCode(code)) {
      return `https://www.airbnb.com/hosting/reservations/details/${encodeURIComponent(code.toUpperCase())}`;
    }
    return 'https://www.airbnb.com/hosting/inbox';
  }

  if (platform === 'booking') {
    if (code) {
      // Recherche extranet par numéro — pas de deep-link universel sans hotel_id.
      return `https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/search_reservations.html?res_id=${encodeURIComponent(code)}`;
    }
    return 'https://admin.booking.com/';
  }

  if (platform === 'vrbo') {
    return 'https://www.vrbo.com/ha/?account/inbox';
  }

  return null;
}

/** Ouvre l’URL OTA ; retourne false si aucune URL. */
export function openOtaPlatformExternal(input: OtaPlatformLinkInput): boolean {
  const url = buildOtaPlatformExternalUrl(input);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
