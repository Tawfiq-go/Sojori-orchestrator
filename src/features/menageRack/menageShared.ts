/**
 * Helpers partagés Rack / Répartition ménage : dates ops, pool de requêtes,
 * détection 404. Sans état — utilisables des deux composants.
 */

export function toIsoDay(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function shiftDay(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toIsoDay(d);
}

export function dayTitle(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Exécution en parallèle bornée (max `limit` promesses à la fois). */
export async function pooled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function is404(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 404;
}

export type ListingOption = { id: string; name: string };
