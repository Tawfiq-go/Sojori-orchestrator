import type { Thread } from '../../types/unifiedInbox.types';

export type WaListGroupId = 'unread' | 'now' | 'future' | 'done' | 'other';

export interface WaListGroup {
  id: WaListGroupId;
  label: string;
  icon: string;
  threads: Thread[];
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Statut séjour aligné Plans (En cours / À venir / Terminé). */
export function waStayBucket(thread: Thread): 'now' | 'future' | 'done' | 'other' {
  const now = dayStart(new Date());
  const inRaw = thread.checkInDate ? new Date(thread.checkInDate) : null;
  const outRaw = thread.checkOutDate ? new Date(thread.checkOutDate) : null;
  const checkIn = inRaw && !Number.isNaN(inRaw.getTime()) ? dayStart(inRaw) : null;
  const checkOut = outRaw && !Number.isNaN(outRaw.getTime()) ? dayStart(outRaw) : null;

  if (checkOut != null && now > checkOut) return 'done';
  if (checkIn != null && now >= checkIn && (checkOut == null || now <= checkOut)) return 'now';
  if (checkIn != null && now < checkIn) return 'future';
  return 'other';
}

export function groupWaThreadsForPlansList(
  threads: Thread[],
  opts?: { flatRecent?: boolean; flatLabel?: string; flatIcon?: string },
): WaListGroup[] {
  if (opts?.flatRecent) {
    return threads.length
      ? [
          {
            id: 'other',
            label: opts.flatLabel || 'Récents',
            icon: opts.flatIcon || '💬',
            threads,
          },
        ]
      : [];
  }

  const unread = threads.filter((t) => (t.unread || 0) > 0);
  const rest = threads.filter((t) => (t.unread || 0) <= 0);

  const buckets: Record<'now' | 'future' | 'done' | 'other', Thread[]> = {
    now: [],
    future: [],
    done: [],
    other: [],
  };
  for (const t of rest) {
    buckets[waStayBucket(t)].push(t);
  }
  const groups: WaListGroup[] = [
    { id: 'unread', label: 'Non lus', icon: '💬', threads: unread },
    { id: 'now', label: 'En cours', icon: '⚡', threads: buckets.now },
    { id: 'future', label: 'À venir', icon: '📅', threads: buckets.future },
    { id: 'done', label: 'Terminées récemment', icon: '✓', threads: buckets.done },
    { id: 'other', label: 'Autres', icon: '◎', threads: buckets.other },
  ];
  return groups.filter((g) => g.threads.length > 0);
}

export function shortStayDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function sourceChipFromThread(thread: Thread): {
  label: string;
  tone: 'airbnb' | 'booking' | 'sojori' | 'other';
} {
  if (
    thread.channel === 'ab' ||
    thread.bookingPlatform === 'ab' ||
    thread.bookingSourceKind === 'airbnb'
  ) {
    return { label: 'Airbnb', tone: 'airbnb' };
  }
  if (
    thread.channel === 'bk' ||
    thread.bookingPlatform === 'bk' ||
    thread.bookingSourceKind === 'booking'
  ) {
    return { label: 'Booking', tone: 'booking' };
  }
  if (thread.bookingSourceKind === 'whatsapp' || thread.bookingSourceKind === 'admin') {
    return { label: 'Sojori', tone: 'sojori' };
  }
  if (thread.bookingPlatform === 'direct') {
    return { label: 'Direct', tone: 'other' };
  }
  if (thread.channel === 'wa') {
    return { label: 'WhatsApp', tone: 'other' };
  }
  return { label: 'OTA', tone: 'other' };
}

export function stayBadgeFromBucket(
  bucket: 'now' | 'future' | 'done' | 'other',
  unread: boolean,
): { label: string; tone: 'now' | 'future' | 'done' | 'unread' | 'other' } {
  if (unread) return { label: 'NL', tone: 'unread' };
  switch (bucket) {
    case 'now':
      return { label: 'EN COURS', tone: 'now' };
    case 'future':
      return { label: 'À VENIR', tone: 'future' };
    case 'done':
      return { label: 'OK', tone: 'done' };
    default:
      return { label: '—', tone: 'other' };
  }
}

export function avatarColorIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 5;
  return (h % 5) + 1;
}
