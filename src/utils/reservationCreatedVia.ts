/**
 * Méthode de création Sojori (sous le logo source).
 * Aligné backend `createdVia` + fallback legacy `source` / `channelName`.
 */

export type CreatedVia =
  | 'admin'
  | 'whatsapp_staff'
  | 'whatsapp_resa'
  | 'site_sojori'
  | 'whatsapp_owner';

const LABELS: Record<CreatedVia, string> = {
  admin: 'Admin',
  whatsapp_staff: 'WhatsApp staff',
  whatsapp_resa: 'WhatsApp resa',
  site_sojori: 'Site Sojori',
  whatsapp_owner: 'WhatsApp owner',
};

export function createdViaLabel(via?: string | null): string | null {
  if (!via) return null;
  const key = String(via).toLowerCase() as CreatedVia;
  return LABELS[key] || null;
}

/** Infère createdVia depuis le champ persistant ou les anciennes valeurs source. */
export function resolveCreatedVia(reservation: {
  createdVia?: string | null;
  source?: string | null;
  channelName?: string | null;
}): CreatedVia | null {
  const direct = String(reservation.createdVia || '').toLowerCase().trim();
  if (
    direct === 'admin' ||
    direct === 'whatsapp_staff' ||
    direct === 'whatsapp_resa' ||
    direct === 'site_sojori' ||
    direct === 'whatsapp_owner'
  ) {
    return direct;
  }

  const src = String(reservation.source || '').toLowerCase().trim();
  const ch = String(reservation.channelName || '').toLowerCase().trim();

  if (src === 'dashboard' || src === 'admin') return 'admin';
  if (src === 'whatsapp admin' || ch === 'whatsapp admin') return 'whatsapp_staff';
  if (src === 'whatsapp-booking' || ch.includes('whatsapp booking')) return 'whatsapp_resa';
  if (src === 'whatsapp-owner') return 'whatsapp_owner';
  if (src === 'whatsapp' && (ch === 'whatsapp' || ch === '')) return 'whatsapp_staff';
  if (
    src === 'sojori-vente' ||
    src === 'direct-booking' ||
    src === 'website' ||
    ch.includes('marketplace') ||
    ch === 'direct booking'
  ) {
    return 'site_sojori';
  }
  // Nouveau format : source Sojori sans createdVia → site par défaut si pas d’autre signal
  if (src === 'sojori' && (ch === 'sojori' || ch === '' || ch === 'sojori')) {
    return null;
  }
  return null;
}

export function isSojoriCommercialSource(reservation: {
  createdVia?: string | null;
  source?: string | null;
  channelName?: string | null;
}): boolean {
  if (resolveCreatedVia(reservation)) return true;
  const src = String(reservation.source || '').toLowerCase().trim();
  const ch = String(reservation.channelName || '').toLowerCase().trim();
  return src === 'sojori' || ch === 'sojori';
}
