import type { PlanListQuery, Reservation } from './types';

/** Filtre + tri sidebar plans (même règles métier que l’API srv-fulltask). */
export function applyPlanListQuery(
  reservations: Reservation[],
  query: PlanListQuery,
  activeId?: string | null,
): Reservation[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const in7 = new Date(now.getTime() + 7 * 86400000);

  const filtered = reservations.filter((r) => {
    if (activeId && r.id === activeId) return true;

    if (query.search) {
      const q = query.search.toLowerCase();
      if (
        !r.guest.name.toLowerCase().includes(q) &&
        !r.listing.name.toLowerCase().includes(q) &&
        !r.planCode.toLowerCase().includes(q) &&
        !r.reference.toLowerCase().includes(q) &&
        !r.id.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    if (query.filters.length === 0) return true;

    const checkIn = new Date(r.checkIn);
    const checkOut = new Date(r.checkOut);
    let ok = false;
    if (query.filters.includes('in_progress') && (r.status === 'now' || r.status === 'pending')) {
      ok = true;
    }
    if (query.filters.includes('blocked') && r.status === 'blocked') ok = true;
    if (query.filters.includes('today') && checkIn < todayEnd && checkOut >= todayStart) ok = true;
    if (query.filters.includes('next7d') && checkIn > now && checkIn <= in7) ok = true;
    if (query.filters.includes('done') && r.status === 'done') ok = true;
    return ok;
  });

  const list = [...filtered];
  if (query.sort === 'urgency') {
    const rank = (s: Reservation['status']) =>
      ({ blocked: 0, now: 1, pending: 2, future: 3, done: 4 })[s] ?? 5;
    list.sort(
      (a, b) =>
        rank(a.status) - rank(b.status) ||
        new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
    );
  } else if (query.sort === 'recent' || query.sort === 'checkin_desc') {
    list.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  } else if (query.sort === 'checkout_asc') {
    list.sort((a, b) => new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime());
  } else if (query.sort === 'checkout_desc') {
    list.sort((a, b) => new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime());
  } else if (query.sort === 'by_listing') {
    list.sort(
      (a, b) =>
        a.listing.name.localeCompare(b.listing.name) || a.guest.name.localeCompare(b.guest.name),
    );
  } else {
    list.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
  }

  return list;
}
