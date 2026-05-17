export function flagFromPhone(phone?: string): string {
  if (!phone) return '';
  if (phone.startsWith('+1')) return '🇺🇸';
  if (phone.startsWith('+33')) return '🇫🇷';
  if (phone.startsWith('+212')) return '🇲🇦';
  if (phone.startsWith('+44')) return '🇬🇧';
  return '';
}

export function nightsBetween(checkIn?: string, checkOut?: string): number | undefined {
  if (!checkIn || !checkOut) return undefined;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return undefined;
  const days = Math.round((b.getTime() - a.getTime()) / 86400000);
  return days > 0 ? days : undefined;
}

export function formatStayDateShort(dateStr?: string, withTime?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return withTime ? `${day} · ${withTime}` : day;
}

export function checkInDaysLabel(checkIn?: string): string | undefined {
  if (!checkIn) return undefined;
  const d = new Date(checkIn);
  if (Number.isNaN(d.getTime())) return undefined;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff > 0) return `J-${diff}`;
  return `J+${Math.abs(diff)}`;
}

/** Statut séjour pour badges liste (Présent / Parti / Stay). */
export function stayStatusLabel(
  checkIn?: string,
  checkOut?: string,
  mode: 'whatsapp' | 'ota' = 'whatsapp',
): string | undefined {
  if (!checkIn && !checkOut) return undefined;
  const now = Date.now();
  const start = checkIn ? new Date(checkIn).getTime() : 0;
  const end = checkOut ? new Date(checkOut).getTime() : 0;
  if (end && now > end) return 'Parti';
  if (start && now >= start && (!end || now <= end)) return mode === 'ota' ? 'Stay' : 'Présent';
  return undefined;
}

/** Heure liste threads (design: 14:32, Hier, 2j). */
export function formatThreadWhen(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatInboxDaySeparator(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayPart = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  if (date.toDateString() === today.toDateString()) return `Aujourd'hui · ${dayPart}`;
  if (date.toDateString() === yesterday.toDateString()) return `Hier · ${dayPart}`;
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function normalizeBookingSource(channelName?: string): string {
  const ch = (channelName || '').toLowerCase();
  if (ch.includes('airbnb') || ch === 'ab') return 'Airbnb';
  if (ch.includes('booking') || ch === 'bk') return 'Booking.com';
  if (ch.includes('vrbo')) return 'Vrbo';
  return channelName || 'Direct';
}

export function bookingSourceTone(
  source?: string,
): 'wa' | 'airbnb' | 'booking' | 'default' {
  const s = (source || '').toLowerCase();
  if (s.includes('airbnb')) return 'airbnb';
  if (s.includes('booking')) return 'booking';
  return 'default';
}
