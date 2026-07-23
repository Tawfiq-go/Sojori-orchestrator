export type TextDispatchChannel = 'email' | 'ota';

export interface PlanDispatchContext {
  atSojori: boolean;
  channelName?: string;
  textFallback: TextDispatchChannel;
}

export interface MessageDispatchPreview {
  configCanal: 'whatsapp' | 'OTA' | 'email';
  textChannel: TextDispatchChannel;
  primaryMode: 'whatsapp' | 'text';
  whatsappUsesMetaTemplate?: boolean;
  label: string;
  shortLabel?: string;
  fallbackLabel?: string;
}

export function dispatchPreviewToChannel(preview?: MessageDispatchPreview): 'wa' | 'email' | 'ota' | undefined {
  if (!preview) return undefined;
  if (preview.primaryMode === 'whatsapp') return 'wa';
  return preview.textChannel === 'email' ? 'email' : 'ota';
}

export function formatReservationSourceLabel(ctx?: PlanDispatchContext): string {
  if (!ctx) return '';
  if (ctx.atSojori) return 'Sojori';
  return normalizeReservationSourceLabel(ctx.channelName) || 'OTA';
}

/** Labels courts sidebar / hero : Airbnb · Booking · Sojori. */
export function normalizeReservationSourceLabel(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const low = s.toLowerCase();
  if (
    low.includes('sojori') ||
    low === 'direct' ||
    low.includes('direct sojori') ||
    low === 'website' ||
    low === 'web'
  ) {
    return 'Sojori';
  }
  if (low.includes('airbnb') || low === 'abnb' || low === 'air bnb') return 'Airbnb';
  if (low.includes('booking') || low === 'bcom' || low.includes('booking.com')) return 'Booking';
  if (low.includes('expedia')) return 'Expedia';
  if (low.includes('vrbo') || low.includes('homeaway')) return 'Vrbo';
  // Capitalize known short codes
  if (s.length <= 12) return s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

export function sourceLabelFromSummary(summary: {
  atSojori?: boolean;
  channelName?: string;
  reservationCode?: string;
}): string {
  if (summary.atSojori === true) return 'Sojori';
  if (summary.atSojori === false) {
    return normalizeReservationSourceLabel(summary.channelName) || 'OTA';
  }
  if (summary.channelName?.trim()) {
    return normalizeReservationSourceLabel(summary.channelName);
  }
  return 'Sojori';
}

export function sourceChipClass(source?: string): string {
  const n = normalizeReservationSourceLabel(source).toLowerCase();
  if (n === 'airbnb') return 'src-airbnb';
  if (n === 'booking') return 'src-booking';
  if (n === 'sojori') return 'src-sojori';
  return 'src-other';
}

export function dispatchPreviewShort(preview?: MessageDispatchPreview): string | undefined {
  if (!preview) return undefined;
  if (preview.shortLabel) return preview.shortLabel;
  if (preview.primaryMode === 'whatsapp') {
    return preview.fallbackLabel ? `WA · ${preview.fallbackLabel.replace(/^Message /i, 'msg ')}` : preview.label;
  }
  return preview.label;
}
