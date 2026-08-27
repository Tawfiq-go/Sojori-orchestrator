/** YYYY-MM-DD local (même convention que `genDays` / colonne Aujourd’hui). */
export function calendarTodayIso(now = new Date()) {
  const z = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}`
}

function isoDayOf(v) {
  if (v == null || v === '') return ''
  if (typeof v === 'string') {
    const s = v.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    const t = Date.parse(s)
    return Number.isFinite(t) ? calendarTodayIso(new Date(t)) : ''
  }
  if (v instanceof Date && Number.isFinite(v.getTime())) {
    return calendarTodayIso(v)
  }
  if (typeof v === 'object' && v.$date) return isoDayOf(v.$date)
  const t = Date.parse(String(v))
  return Number.isFinite(t) ? calendarTodayIso(new Date(t)) : ''
}

/** Statuts actifs affichés sur le calendrier (pas les listes /resa). */
const CALENDAR_VISIBLE_STATUSES = new Set([
  'confirmed',
  'started',
  'pending',
  'inside',
  'checkedin',
])

/**
 * Cycle séjour pour les pastilles du jour.
 * Started / Completed Sojori, avec filet mewsState si le mapping lag.
 */
export function calendarStayPhase(res) {
  const status = String(res?.status || '')
    .trim()
    .toLowerCase()
  const mews = String(res?.mewsState || '')
    .trim()
    .toLowerCase()
  const departed = status === 'completed' || mews === 'processed'
  const started =
    !departed &&
    (status === 'started' ||
      status === 'inside' ||
      status === 'checkedin' ||
      mews === 'started')
  return { status, mews, started, departed }
}

/**
 * Cercle nom (arrivée) / cercle départ — rouge = à faire, vert = fait.
 * Confirmé à partir du jour d’arrivée (J, J+1, J+2…) et pas Started = rouge.
 * Vert seulement le jour d’arrivée si déjà en maison.
 * Départ du jour encore en maison (Started) = rouge : pas encore parti.
 */
export function calendarTodayStayBadges(res, todayIso) {
  const today = todayIso || calendarTodayIso()
  const arr = isoDayOf(res?.arrivalDate)
  const dep = isoDayOf(res?.departureDate)
  const { started, departed } = calendarStayPhase(res)
  const duringStay = Boolean(arr) && arr <= today && (!dep || today < dep)
  let nameCircle = null
  if (duringStay) {
    if (started || departed) {
      if (arr === today) {
        nameCircle = { color: '#0a8f5e', title: 'Arrivée du jour · en maison' }
      }
    } else {
      nameCircle = {
        color: '#c81e1e',
        title:
          arr === today
            ? 'Arrivée du jour · pas encore arrivé'
            : 'Confirmé après le jour d’arrivée · pas de check-in',
      }
    }
  }
  let departureCircle = null
  if (dep === today) {
    departureCircle = departed
      ? { color: '#0a8f5e', title: 'Départ du jour · parti' }
      : { color: '#c81e1e', title: 'Départ du jour · pas encore parti' }
  }
  return { nameCircle, departureCircle }
}

/** Mews : Optional / Requested / Canceled / Processed n’occupent pas la chambre. */
const MEWS_NON_OCCUPYING = new Set([
  'optional',
  'inquired',
  'enquired',
  'requested',
  'canceled',
  'cancelled',
  'processed',
]);

function isMewsOccupyingOnCalendar(res) {
  const mews = String(res?.mewsState || '')
    .trim()
    .toLowerCase();
  if (!mews) return true;
  if (mews.includes('cancel')) return false;
  return !MEWS_NON_OCCUPYING.has(mews);
}

/** Annulée pour l’occupation (acquittée ou non, payée ou non). */
export function isReservationCancelledOnCalendar(res) {
  if (!res || typeof res !== 'object') return false;
  if (/cancel/i.test(String(res.status || ''))) return true;
  if (res.cancellationDate != null && String(res.cancellationDate).trim() !== '') {
    return true;
  }
  const mews = String(res.mewsState || '')
    .trim()
    .toLowerCase();
  return mews.includes('cancel');
}

/**
 * Calendrier : Confirmed / Started / Pending / Inside.
 * Completed / Processed seulement le jour du départ (pastille verte « parti »).
 * Jamais les annulées. Mews Optional / waitlist / no-show : pas de barre.
 */
export function isReservationVisibleOnCalendar(res, todayIso) {
  if (!res || typeof res === 'string') return false;
  if (isReservationCancelledOnCalendar(res)) return false;
  const today =
    typeof todayIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayIso)
      ? todayIso
      : calendarTodayIso();
  const { departed } = calendarStayPhase(res);
  if (departed && isoDayOf(res.departureDate) === today) return true;
  const status = String(res.status || '').trim();
  if (!status) return false;
  if (!isMewsOccupyingOnCalendar(res)) return false;
  return CALENDAR_VISIBLE_STATUSES.has(status.toLowerCase());
}

/** Normalise une résa inventaire (lookup srv-calendar) pour l’UI calendrier. */
export function normalizeCalendarReservation(res) {
  if (!res) return null;
  if (typeof res === 'string') {
    return { _id: res, reservationId: res, id: res };
  }
  const id = res._id || res.reservationId || res.id;
  return {
    ...res,
    _id: id,
    reservationId: id,
    guestName:
      res.guestName ||
      `${res.guestFirstName || ''} ${res.guestLastName || ''}`.trim() ||
      undefined,
  };
}

export function normalizeCalendarReservations(raw) {
  return (raw || [])
    .map(normalizeCalendarReservation)
    .filter(Boolean)
    .filter((r) => isReservationVisibleOnCalendar(r, calendarTodayIso()));
}

export function reservationRouteId(res) {
  if (!res) return '';
  return String(res.reservationNumber || res._id || res.id || res.reservationId || '');
}

/** Fetch détail : ObjectId d’abord (cache getById), pas le numéro SJ-… plus lent. */
export function reservationDetailFetchId(res) {
  if (!res) return '';
  for (const v of [res._id, res.id, res.reservationId]) {
    const s = String(v || '').trim();
    if (/^[a-f0-9]{24}$/i.test(s)) return s;
  }
  return reservationRouteId(res);
}
