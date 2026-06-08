export type PlanDispatchLogEntryView = {
  at: string;
  ok: boolean;
  channel?: string;
  source?: 'manual' | 'scheduler';
  error?: string;
};

export type PlanLastDispatchView = {
  atDisplay: string;
  ok: boolean;
  label: string;
  error?: string;
  channel?: string;
};

const MONTHS_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

export function formatDispatchWhen(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const mon = MONTHS_FR[d.getMonth()] ?? '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} · ${h}:${m}`;
}

function entryToLastView(entry: PlanDispatchLogEntryView): PlanLastDispatchView {
  const atDisplay = formatDispatchWhen(entry.at);
  const channelSuffix = entry.channel ? ` · ${entry.channel.toUpperCase()}` : '';
  const sourceSuffix =
    entry.source === 'manual' ? ' · Manuel' : entry.source === 'scheduler' ? ' · Auto' : '';
  const label = entry.ok
    ? `Envoyé le ${atDisplay}${channelSuffix}${sourceSuffix}`
    : `Échec le ${atDisplay}${channelSuffix}${sourceSuffix}`;
  return {
    atDisplay,
    ok: entry.ok,
    label,
    error: entry.error,
    channel: entry.channel,
  };
}

export function isStaleAlreadySentError(error?: string): boolean {
  return Boolean(error && /déjà envoy/i.test(error));
}

/** Masque les erreurs « déjà envoyé » dans l’historique quand l’item est bien livré. */
export function formatDispatchHistoryError(error: string, itemDelivered?: boolean): string {
  if (itemDelivered && isStaleAlreadySentError(error)) {
    return 'Tentative ignorée (message déjà envoyé)';
  }
  return error;
}

export type PlanDispatchDisplay = {
  lastDispatch?: PlanLastDispatchView;
  /** Dernière tentative si différente du succès affiché (ex. renvoi manuel refusé). */
  lastAttempt?: PlanLastDispatchView;
};

/**
 * Historique d’envoi : si l’item est déjà livré, on affiche le dernier succès
 * (pas un échec « déjà envoyé » obsolète après un renvoi manuel).
 */
export function mapDispatchDisplay(
  log?: PlanDispatchLogEntryView[] | null,
  options?: { itemDelivered?: boolean },
): PlanDispatchDisplay {
  if (!log?.length) return {};
  const last = log[log.length - 1];
  if (!last) return {};

  const lastSuccess = [...log].reverse().find((e) => e.ok);

  if (options?.itemDelivered && lastSuccess) {
    const primary = entryToLastView(lastSuccess);
    if (last.ok || last === lastSuccess) {
      return { lastDispatch: primary };
    }
    if (isStaleAlreadySentError(last.error)) {
      return { lastDispatch: primary };
    }
    return { lastDispatch: primary, lastAttempt: entryToLastView(last) };
  }

  return { lastDispatch: entryToLastView(last) };
}

/** @deprecated Préférer mapDispatchDisplay */
export function mapLastDispatch(
  log?: PlanDispatchLogEntryView[] | null,
): PlanLastDispatchView | undefined {
  return mapDispatchDisplay(log).lastDispatch;
}
