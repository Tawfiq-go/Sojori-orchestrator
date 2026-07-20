/** Prochaine occurrence UTC d’un créneau fixe (jours JS : 0=dim … 6=sam). */
export function nextUtcRun(
  hourUtc: number,
  minuteUtc: number,
  weekdaysUtc?: number[],
  from: Date = new Date(),
): Date {
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(
      Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth(),
        from.getUTCDate() + i,
        hourUtc,
        minuteUtc,
        0,
        0,
      ),
    );
    if (d.getTime() <= from.getTime()) continue;
    if (!weekdaysUtc?.length || weekdaysUtc.includes(d.getUTCDay())) return d;
  }
  return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/** Snapshot estimation : lun + jeu 03:30 UTC. */
export function nextMarketSnapshotRun(from?: Date): Date {
  return nextUtcRun(3, 30, [1, 4], from);
}

/** Comparables : lundi 04:00 UTC. */
export function nextCompsRun(from?: Date): Date {
  return nextUtcRun(4, 0, [1], from);
}

/** Propagation calendrier + canaux : tous les jours 04:30 UTC. */
export function nextNightlyPropagationRun(from?: Date): Date {
  return nextUtcRun(4, 30, undefined, from);
}
