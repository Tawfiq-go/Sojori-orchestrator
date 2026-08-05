/**
 * Horaires — liste staff × jours (L→D).
 * Colonnes Tâches / Accès listing / Ville + filtres (comme Config Équipe).
 * Édition via panneau flottant (portal) pour ne pas être coupé par le scroll du tableau.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import type { Staff, StaffAbsence } from './types';
import {
  DAY_DISPLAY_ORDER,
  DAY_FULL_LABELS,
  DAY_LABELS,
  initials,
  pillLabelForType,
  sanitizeStaffAllowedTaskTypes,
  STAFF_TASK_PILLS,
} from './staffDesignConstants';
import './staffScheduleList.css';

function formatAbsenceRange(a: StaffAbsence): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '?';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };
  const s = fmt(a.startDate);
  const e = fmt(a.endDate);
  return s === e ? s : `${s}→${e}`;
}

type DayWindow = { start: string; end: string };
type ListingOpt = { id: string; name: string; cityId?: string; city?: string };
type CityOpt = { id: string; name: string };
type AccessTypeFilter = '' | 'all' | 'city' | 'listing';

const PRESETS: { label: string; windows: DayWindow[] }[] = [
  { label: '8–17', windows: [{ start: '08:00', end: '17:00' }] },
  { label: '8–12', windows: [{ start: '08:00', end: '12:00' }] },
  { label: '14–18', windows: [{ start: '14:00', end: '18:00' }] },
  {
    label: '8–12+14–18',
    windows: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  },
  { label: '24/24', windows: [{ start: '00:00', end: '23:59' }] },
];

function normalizeHm(raw: string, fallback: string): string {
  const m = String(raw || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function sanitizeWindows(windows: DayWindow[]): DayWindow[] {
  const out: DayWindow[] = [];
  for (const w of windows || []) {
    const start = normalizeHm(w.start, '08:00');
    let end = normalizeHm(w.end, '17:00');
    if (end <= start && !(start === '00:00' && end === '23:59')) {
      end = '17:00';
      if (end <= start) end = '23:59';
    }
    out.push({ start, end });
  }
  return out;
}

function staffDayWindows(s: Staff): Partial<Record<number, DayWindow[]>> {
  const dw = s.schedule?.dayWindows;
  if (dw && Object.keys(dw).length) {
    const cleaned: Partial<Record<number, DayWindow[]>> = {};
    for (const [k, windows] of Object.entries(dw)) {
      const list = sanitizeWindows(windows || []);
      if (list.length) cleaned[Number(k)] = list;
    }
    return cleaned;
  }
  const out: Partial<Record<number, DayWindow[]>> = {};
  const tw = sanitizeWindows(s.schedule?.timeWindows || [{ start: '08:00', end: '17:00' }]);
  for (const d of s.schedule?.daysOfWeek || []) {
    out[d] = tw.map((w) => ({ ...w }));
  }
  return out;
}

function labelWindows(windows: DayWindow[] | undefined): string {
  if (!windows?.length) return 'Off';
  if (windows.length === 1) {
    const w = windows[0];
    if (w.start === '00:00' && (w.end === '23:59' || w.end === '24:00')) return '24/24';
    return `${w.start.slice(0, 5)}–${w.end.slice(0, 5)}`;
  }
  return windows.map((w) => `${w.start.slice(0, 2)}h`).join('+');
}

function scheduleFromDayWindows(dayWindows: Partial<Record<number, DayWindow[]>>): Staff['schedule'] {
  const cleaned: Partial<Record<number, DayWindow[]>> = {};
  for (const [k, windows] of Object.entries(dayWindows)) {
    const list = sanitizeWindows(windows || []);
    if (list.length) cleaned[Number(k)] = list;
  }
  const daysOfWeek = Object.keys(cleaned)
    .map(Number)
    .sort((a, b) => a - b);
  const timeWindows = [
    ...new Map(
      daysOfWeek
        .flatMap((d) => cleaned[d] || [])
        .map((w) => [`${w.start}:${w.end}`, w] as const),
    ).values(),
  ];
  return { daysOfWeek, timeWindows, dayWindows: cleaned };
}

function hasAllAccess(ids: string[] | undefined): boolean {
  if (!ids?.length) return false;
  return ids.some((id) => {
    const s = String(id).trim();
    return s === 'All' || s === 'ALL';
  });
}

function concreteIds(ids: string[] | undefined): string[] {
  return (ids || []).filter((id) => {
    const s = String(id).trim();
    return s && s !== 'All' && s !== 'ALL';
  });
}

function accessTypeOf(s: Staff): AccessTypeFilter {
  if (hasAllAccess(s.allowedListingIds)) return 'all';
  if (!s.allowedListingIds?.length && !s.allowedCityIds?.length) return 'all';
  const listings = concreteIds(s.allowedListingIds);
  if (listings.length) return 'listing';
  if (concreteIds(s.allowedCityIds).length || hasAllAccess(s.allowedCityIds)) return 'city';
  return 'all';
}

function listingAccessLabel(s: Staff, listings: ListingOpt[]): string {
  if (hasAllAccess(s.allowedListingIds)) return 'Tous';
  if (!s.allowedListingIds?.length && !s.allowedCityIds?.length) return 'Tous';
  const ids = concreteIds(s.allowedListingIds);
  if (!ids.length) return '—';
  const names = ids
    .map((id) => listings.find((l) => String(l.id) === String(id))?.name || '')
    .filter(Boolean);
  if (!names.length) return `${ids.length} listing(s)`;
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

/** Villes d’accès : cityIds explicites, sinon dérivées des listings autorisés. */
function resolveStaffCityNames(
  s: Staff,
  cities: CityOpt[],
  listings: ListingOpt[],
): string[] {
  if (hasAllAccess(s.allowedListingIds)) return ['Toutes'];
  if (!s.allowedListingIds?.length && !s.allowedCityIds?.length) return ['Toutes'];
  if (hasAllAccess(s.allowedCityIds)) return ['Toutes'];

  const names = new Set<string>();
  for (const id of concreteIds(s.allowedCityIds)) {
    const n = cities.find((c) => String(c.id) === String(id))?.name;
    if (n) names.add(n);
  }

  const listingIds = concreteIds(s.allowedListingIds);
  if (listingIds.length) {
    for (const lid of listingIds) {
      const listing = listings.find((l) => String(l.id) === String(lid));
      if (!listing) continue;
      if (listing.city?.trim()) {
        names.add(listing.city.trim());
        continue;
      }
      if (listing.cityId) {
        const n = cities.find((c) => String(c.id) === String(listing.cityId))?.name;
        if (n) names.add(n);
      }
    }
  }

  return [...names];
}

function cityAccessLabel(s: Staff, cities: CityOpt[], listings: ListingOpt[]): string {
  const names = resolveStaffCityNames(s, cities, listings);
  if (!names.length) return '—';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function staffMatchesListingAccess(
  s: Staff,
  listingId: string,
  listingCityId?: string | null,
): boolean {
  const listingIds = s.allowedListingIds || [];
  const cityIds = s.allowedCityIds || [];
  if (!listingIds.length && !cityIds.length) return true;
  if (hasAllAccess(listingIds)) return true;
  const listingKey = String(listingId || '').trim();
  if (listingKey && listingIds.some((id) => String(id) === listingKey)) return true;
  if (hasAllAccess(cityIds)) return true;
  const cityKey = String(listingCityId || '').trim();
  if (cityKey && cityIds.some((id) => String(id) === cityKey)) return true;
  return false;
}

function staffMatchesCityAccess(s: Staff, cityId: string, listingsInCity: ListingOpt[]): boolean {
  const listingIds = s.allowedListingIds || [];
  const cityIds = s.allowedCityIds || [];
  if (!listingIds.length && !cityIds.length) return true;
  if (hasAllAccess(listingIds) || hasAllAccess(cityIds)) return true;
  const key = String(cityId || '').trim();
  if (key && !key.startsWith('name:') && cityIds.some((id) => String(id) === key)) return true;
  // Accès par listing : match si au moins un listing de cette ville
  return listingsInCity.some((l) => listingIds.some((id) => String(id) === String(l.id)));
}

type OpenEditor = {
  staffId: string;
  day: number;
  top: number;
  left: number;
};

type Props = {
  staff: Staff[];
  listings?: ListingOpt[];
  cities?: CityOpt[];
  loading?: boolean;
  onSaveSchedule: (
    staffId: string,
    schedule: Staff['schedule'],
    alwaysAvailable: boolean,
  ) => Promise<void>;
  onToggleAutoAccept: (staffId: string, autoAccept: boolean) => Promise<void>;
  onToggleReadyToFinish: (staffId: string, readyToFinish: boolean) => Promise<void>;
  onAddAbsence: (
    staffId: string,
    body: { startDate: string; endDate: string; reason?: string },
  ) => Promise<void>;
  onRemoveAbsence: (staffId: string, absenceId: string) => Promise<void>;
  onOpenConfig?: () => void;
};

type AbsenceModal = {
  staffId: string;
  staffName: string;
};

const ALWAYS_WINDOW: DayWindow = { start: '00:00', end: '23:59' };

function fullWeekAlwaysWindows(): Partial<Record<number, DayWindow[]>> {
  const out: Partial<Record<number, DayWindow[]>> = {};
  for (let d = 0; d <= 6; d += 1) out[d] = [{ ...ALWAYS_WINDOW }];
  return out;
}

export default function StaffScheduleListView({
  staff,
  listings = [],
  cities = [],
  loading,
  onSaveSchedule,
  onToggleAutoAccept,
  onToggleReadyToFinish,
  onAddAbsence,
  onRemoveAbsence,
  onOpenConfig,
}: Props) {
  const [q, setQ] = useState('');
  const [filterListingId, setFilterListingId] = useState('');
  const [filterCityId, setFilterCityId] = useState('');
  const [filterAccessType, setFilterAccessType] = useState<AccessTypeFilter>('');
  const [filterTaskType, setFilterTaskType] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<number, DayWindow[]>>>>({});
  const [alwaysDrafts, setAlwaysDrafts] = useState<Record<string, boolean>>({});
  const [autoAcceptBusyId, setAutoAcceptBusyId] = useState<string | null>(null);
  const [readyToFinishBusyId, setReadyToFinishBusyId] = useState<string | null>(null);
  const [openCell, setOpenCell] = useState<OpenEditor | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [absenceModal, setAbsenceModal] = useState<AbsenceModal | null>(null);
  const [absenceStart, setAbsenceStart] = useState('');
  const [absenceEnd, setAbsenceEnd] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceBusy, setAbsenceBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /** Villes API + villes présentes sur les listings (évite filtre vide). */
  const cityOptions = useMemo(() => {
    const byId = new Map<string, CityOpt>();
    for (const c of cities) {
      if (c.id) byId.set(String(c.id), c);
    }
    for (const l of listings) {
      const name = String(l.city || '').trim();
      const id = String(l.cityId || '').trim();
      if (id && !byId.has(id)) {
        byId.set(id, { id, name: name || id });
      } else if (!id && name) {
        const key = `name:${name.toLowerCase()}`;
        if (![...byId.values()].some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          byId.set(key, { id: key, name });
        }
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [cities, listings]);

  const listingsInCity = useMemo(() => {
    if (!filterCityId) return listings;
    const opt = cityOptions.find((c) => c.id === filterCityId);
    const cityName = (opt?.name || '').trim().toLowerCase();
    return listings.filter((l) => {
      if (filterCityId.startsWith('name:')) {
        return String(l.city || '').trim().toLowerCase() === cityName;
      }
      if (String(l.cityId || '') === filterCityId) return true;
      if (cityName && String(l.city || '').trim().toLowerCase() === cityName) return true;
      return false;
    });
  }, [listings, filterCityId, cityOptions]);

  const listingOptions = useMemo(() => {
    const src = filterCityId ? listingsInCity : listings;
    return [...src].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [listings, listingsInCity, filterCityId]);

  useEffect(() => {
    if (!filterListingId || !filterCityId) return;
    const ok = listingsInCity.some((l) => String(l.id) === filterListingId);
    if (!ok) setFilterListingId('');
  }, [filterListingId, filterCityId, listingsInCity]);

  const selectedListing = useMemo(
    () => listings.find((l) => String(l.id) === filterListingId),
    [listings, filterListingId],
  );

  const filtersActive = Boolean(
    q.trim() || filterListingId || filterCityId || filterAccessType || filterTaskType,
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = staff.filter((s) => s.status !== 'off');

    if (needle) {
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(needle) ||
          (s.whatsappE164 || s.phoneE164 || '').includes(needle),
      );
    }

    if (filterAccessType) {
      list = list.filter((s) => accessTypeOf(s) === filterAccessType);
    }

    if (filterTaskType) {
      list = list.filter((s) =>
        sanitizeStaffAllowedTaskTypes(s.allowedTaskTypes as string[]).includes(
          filterTaskType as never,
        ),
      );
    }

    if (filterListingId && selectedListing) {
      list = list.filter((s) =>
        staffMatchesListingAccess(s, selectedListing.id, selectedListing.cityId),
      );
    } else if (filterCityId) {
      list = list.filter((s) => staffMatchesCityAccess(s, filterCityId, listingsInCity));
    }

    return list;
  }, [
    staff,
    q,
    filterAccessType,
    filterTaskType,
    filterListingId,
    selectedListing,
    filterCityId,
    listingsInCity,
  ]);

  const dayWindowsFor = (s: Staff): Partial<Record<number, DayWindow[]>> => {
    return drafts[s._id] ?? staffDayWindows(s);
  };

  const alwaysFor = (s: Staff): boolean => {
    if (Object.prototype.hasOwnProperty.call(alwaysDrafts, s._id)) return alwaysDrafts[s._id];
    return s.alwaysAvailable === true;
  };

  const setDayWindows = (staffId: string, base: Staff, day: number, windows: DayWindow[]) => {
    const current = { ...dayWindowsFor(base) };
    if (!windows.length) delete current[day];
    else current[day] = sanitizeWindows(windows);
    setDrafts((d) => ({ ...d, [staffId]: current }));
    // Modifier un jour ⇒ plus en mode « toujours »
    setAlwaysDrafts((d) => ({ ...d, [staffId]: false }));
  };

  const setAlwaysAvailable = (s: Staff, on: boolean) => {
    setAlwaysDrafts((d) => ({ ...d, [s._id]: on }));
    if (on) {
      setDrafts((d) => ({ ...d, [s._id]: fullWeekAlwaysWindows() }));
    }
  };

  const dirtyIds = useMemo(() => {
    const ids = new Set([...Object.keys(drafts), ...Object.keys(alwaysDrafts)]);
    for (const id of [...ids]) {
      const s = staff.find((row) => row._id === id);
      if (!s) continue;
      const alwaysDirty =
        Object.prototype.hasOwnProperty.call(alwaysDrafts, id) &&
        alwaysDrafts[id] !== (s.alwaysAvailable === true);
      const scheduleDirty = Object.prototype.hasOwnProperty.call(drafts, id);
      if (!alwaysDirty && !scheduleDirty) ids.delete(id);
    }
    return ids;
  }, [drafts, alwaysDrafts, staff]);

  const openStaff = openCell ? staff.find((s) => s._id === openCell.staffId) : null;
  const openAlways = openStaff ? alwaysFor(openStaff) : false;
  const openWindows = openStaff ? dayWindowsFor(openStaff)[openCell!.day] : undefined;
  const openOn = openAlways || Boolean(openWindows?.length);

  useEffect(() => {
    if (!openCell) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCell(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCell]);

  const openDayEditor = (s: Staff, day: number, el: HTMLElement) => {
    if (openCell?.staffId === s._id && openCell.day === day) {
      setOpenCell(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const panelW = 280;
    const panelH = 320;
    let left = rect.left + rect.width / 2 - panelW / 2;
    let top = rect.bottom + 8;
    left = Math.max(12, Math.min(left, window.innerWidth - panelW - 12));
    if (top + panelH > window.innerHeight - 12) {
      top = Math.max(12, rect.top - panelH - 8);
    }
    setOpenCell({ staffId: s._id, day, top, left });
  };

  const handleSaveRow = async (s: Staff) => {
    const always = alwaysFor(s);
    const dayWindows = always ? fullWeekAlwaysWindows() : dayWindowsFor(s);
    const schedule = scheduleFromDayWindows(dayWindows);
    setSavingId(s._id);
    try {
      await onSaveSchedule(s._id, schedule, always);
      setDrafts((d) => {
        const next = { ...d };
        delete next[s._id];
        return next;
      });
      setAlwaysDrafts((d) => {
        const next = { ...d };
        delete next[s._id];
        return next;
      });
      setOpenCell(null);
      toast.success(
        always ? `Toujours disponible · ${s.fullName}` : `Horaires · ${s.fullName}`,
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur enregistrement');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleAutoAccept = async (s: Staff) => {
    if (autoAcceptBusyId) return;
    const next = !(s.autoAccept === true);
    setAutoAcceptBusyId(s._id);
    try {
      await onToggleAutoAccept(s._id, next);
      toast.success(
        next
          ? `Auto-accepte · ${s.fullName}`
          : `Acceptation manuelle · ${s.fullName}`,
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Impossible de mettre à jour auto-accepte');
    } finally {
      setAutoAcceptBusyId(null);
    }
  };

  const handleToggleReadyToFinish = async (s: Staff) => {
    if (readyToFinishBusyId) return;
    const next = !(s.readyToFinish === true);
    setReadyToFinishBusyId(s._id);
    try {
      await onToggleReadyToFinish(s._id, next);
      toast.success(
        next
          ? `Fin seule · ${s.fullName} (assignation → à terminer)`
          : `Fin seule off · ${s.fullName}`,
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Impossible de mettre à jour Fin seule');
    } finally {
      setReadyToFinishBusyId(null);
    }
  };

  const openAbsenceModal = (s: Staff) => {
    setOpenCell(null);
    setAbsenceModal({ staffId: s._id, staffName: s.fullName });
    setAbsenceStart('');
    setAbsenceEnd('');
    setAbsenceReason('');
  };

  const closeAbsenceModal = () => {
    if (absenceBusy) return;
    setAbsenceModal(null);
  };

  const handleSubmitAbsence = async () => {
    if (!absenceModal) return;
    if (!absenceStart || !absenceEnd) {
      toast.error('Choisissez jour 1 et jour 2');
      return;
    }
    if (absenceEnd < absenceStart) {
      toast.error('Le jour 2 doit être ≥ jour 1');
      return;
    }
    setAbsenceBusy(true);
    try {
      await onAddAbsence(absenceModal.staffId, {
        startDate: absenceStart,
        endDate: absenceEnd,
        reason: absenceReason.trim() || undefined,
      });
      toast.success(`Absence · ${absenceModal.staffName}`);
      setAbsenceStart('');
      setAbsenceEnd('');
      setAbsenceReason('');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur absence');
    } finally {
      setAbsenceBusy(false);
    }
  };

  const handleDeleteAbsence = async (staffId: string, absenceId: string) => {
    setAbsenceBusy(true);
    try {
      await onRemoveAbsence(staffId, absenceId);
      toast.success('Absence supprimée');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur suppression');
    } finally {
      setAbsenceBusy(false);
    }
  };

  const absenceStaff = absenceModal
    ? staff.find((s) => s._id === absenceModal.staffId)
    : null;
  const absenceList = [...(absenceStaff?.absences || [])].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  useEffect(() => {
    if (!absenceModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !absenceBusy) setAbsenceModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [absenceModal, absenceBusy]);

  const applyPresetAllActive = (s: Staff, windows: DayWindow[]) => {
    const current = { ...dayWindowsFor(s) };
    const days = Object.keys(current).map(Number);
    const targets = days.length ? days : [...DAY_DISPLAY_ORDER].slice(0, 5);
    for (const d of targets) {
      current[d] = windows.map((w) => ({ ...w }));
    }
    setDrafts((d) => ({ ...d, [s._id]: current }));
    setAlwaysDrafts((d) => ({ ...d, [s._id]: false }));
  };

  const resetFilters = () => {
    setQ('');
    setFilterListingId('');
    setFilterCityId('');
    setFilterAccessType('');
    setFilterTaskType('');
  };

  const editorPortal =
    openCell && openStaff
      ? createPortal(
          <>
            <button
              type="button"
              className="staff-sched-backdrop"
              aria-label="Fermer"
              onClick={() => setOpenCell(null)}
            />
            <div
              ref={panelRef}
              className="staff-sched-float"
              style={{ top: openCell.top, left: openCell.left }}
              role="dialog"
              aria-label={`Horaires ${DAY_FULL_LABELS[openCell.day]}`}
            >
              <div className="staff-sched-pop-h">
                <div>
                  <strong>{DAY_FULL_LABELS[openCell.day]}</strong>
                  <div className="staff-sched-float-sub">{openStaff.fullName}</div>
                </div>
                {!openAlways ? (
                  <div className="planning-onoff">
                    <span className={!openOn ? 'on' : ''}>Off</span>
                    <div
                      className={`toggle${openOn ? ' on' : ''}`}
                      onClick={() =>
                        setDayWindows(
                          openStaff._id,
                          openStaff,
                          openCell.day,
                          openOn ? [] : [{ start: '08:00', end: '17:00' }],
                        )
                      }
                      role="switch"
                      aria-checked={openOn}
                      onKeyDown={() => {}}
                    />
                    <span className={openOn ? 'on' : ''}>On</span>
                  </div>
                ) : null}
              </div>

              <div className="staff-sched-always-row">
                <div>
                  <div className="nm">Toujours disponible</div>
                  <div className="ds">7j/7 · 24h/24 — ignore les créneaux à l’assignation</div>
                </div>
                <div
                  className={`toggle${openAlways ? ' on' : ''}`}
                  onClick={() => setAlwaysAvailable(openStaff, !openAlways)}
                  role="switch"
                  aria-checked={openAlways}
                  onKeyDown={() => {}}
                />
              </div>

              {openAlways ? (
                <p className="staff-sched-off-hint">
                  Mode actif — ce membre est éligible à toute heure (hors congés).
                </p>
              ) : openOn ? (
                <>
                  <div className="staff-sched-presets">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          setDayWindows(openStaff._id, openStaff, openCell.day, p.windows)
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="staff-sched-always-preset"
                      onClick={() => setAlwaysAvailable(openStaff, true)}
                      title="Activer toujours disponible"
                    >
                      Toujours
                    </button>
                  </div>
                  {(openWindows || []).map((w, idx) => (
                    <div key={idx} className="staff-sched-slot">
                      <input
                        type="time"
                        value={w.start}
                        onChange={(e) => {
                          const next = [...(openWindows || [])];
                          next[idx] = { ...next[idx], start: e.target.value };
                          setDayWindows(openStaff._id, openStaff, openCell.day, next);
                        }}
                      />
                      <span>→</span>
                      <input
                        type="time"
                        value={w.end}
                        onChange={(e) => {
                          const next = [...(openWindows || [])];
                          next[idx] = { ...next[idx], end: e.target.value };
                          setDayWindows(openStaff._id, openStaff, openCell.day, next);
                        }}
                      />
                      <button
                        type="button"
                        className="x"
                        onClick={() => {
                          const next = (openWindows || []).filter((_, i) => i !== idx);
                          setDayWindows(openStaff._id, openStaff, openCell.day, next);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="staff-sched-float-actions">
                    <button
                      type="button"
                      className="staff-sched-add"
                      onClick={() =>
                        setDayWindows(openStaff._id, openStaff, openCell.day, [
                          ...(openWindows || []),
                          { start: '14:00', end: '18:00' },
                        ])
                      }
                    >
                      + Créneau
                    </button>
                    <button
                      type="button"
                      className="staff-sched-add"
                      onClick={() =>
                        applyPresetAllActive(
                          openStaff,
                          openWindows || [{ start: '08:00', end: '17:00' }],
                        )
                      }
                    >
                      → Jours actifs
                    </button>
                  </div>
                </>
              ) : (
                <p className="staff-sched-off-hint">
                  Jour off — activez On, ou « Toujours disponible » pour 7j/7.
                </p>
              )}

              <div className="staff-sched-float-foot">
                <button type="button" className="ghost" onClick={() => setOpenCell(null)}>
                  Fermer
                </button>
                <button
                  type="button"
                  className="prim"
                  disabled={!dirtyIds.has(openStaff._id) || savingId === openStaff._id}
                  onClick={() => void handleSaveRow(openStaff)}
                >
                  {savingId === openStaff._id ? '…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="staff-sched-root">
      <div className="staff-sched-hero">
        <div>
          <h1>
            Horaires <span className="badge">{rows.length} membres</span>
          </h1>
          <p className="sub">
            Cliquez une case jour · Off/On + créneaux · Auto-accepte = tâche acceptée dès
            l’assignation. Colonnes = tâches & accès.
          </p>
        </div>
        {onOpenConfig ? (
          <button type="button" className="staff-sched-link" onClick={onOpenConfig}>
            Config Équipe →
          </button>
        ) : null}
      </div>

      <div className="staff-sched-filters" role="toolbar" aria-label="Filtres horaires">
        <input
          className="staff-sched-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, téléphone…"
        />
        <label className="staff-sched-field">
          <span className="lbl">Ville</span>
          <select value={filterCityId} onChange={(e) => setFilterCityId(e.target.value)}>
            <option value="">Toutes</option>
            {cityOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="staff-sched-field">
          <span className="lbl">Listing</span>
          <select value={filterListingId} onChange={(e) => setFilterListingId(e.target.value)}>
            <option value="">Tous</option>
            {listingOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="staff-sched-field">
          <span className="lbl">Accès</span>
          <select
            value={filterAccessType}
            onChange={(e) => setFilterAccessType(e.target.value as AccessTypeFilter)}
          >
            <option value="">Tous types</option>
            <option value="all">Tous listings</option>
            <option value="city">Par ville</option>
            <option value="listing">Par listing</option>
          </select>
        </label>
        <label className="staff-sched-field">
          <span className="lbl">Tâche</span>
          <select value={filterTaskType} onChange={(e) => setFilterTaskType(e.target.value)}>
            <option value="">Toutes</option>
            {STAFF_TASK_PILLS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        </label>
        {filtersActive ? (
          <button type="button" className="staff-sched-reset" onClick={resetFilters}>
            ✕ Reset
          </button>
        ) : null}
      </div>

      {loading && staff.length === 0 ? (
        <p className="staff-sched-empty">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="staff-sched-empty">Aucun membre pour ces filtres.</p>
      ) : (
        <div className="staff-sched-table-wrap">
          <table className="staff-sched-table">
            <thead>
              <tr>
                <th className="staff-sched-col-name">Membre</th>
                <th className="staff-sched-col-meta">Tâches</th>
                <th className="staff-sched-col-meta">Accès listing</th>
                <th className="staff-sched-col-meta">Ville</th>
                <th
                  className="staff-sched-col-auto"
                  title="Mode par activité (Normal / Auto-accepte / Fin seule) — modifier dans la fiche staff"
                >
                  Modes
                </th>
                <th className="staff-sched-col-absence">Absence</th>
                {DAY_DISPLAY_ORDER.map((d) => (
                  <th key={d} title={DAY_FULL_LABELS[d]}>
                    {DAY_LABELS[d]}
                  </th>
                ))}
                <th className="staff-sched-col-action"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const dw = dayWindowsFor(s);
                const always = alwaysFor(s);
                const modes = s.taskTypeModes || {};
                const modeValues = sanitizeStaffAllowedTaskTypes(s.allowedTaskTypes as string[]).map(
                  (t) => {
                    const cfg = modes[t];
                    if (!cfg) return 'normal';
                    if (cfg.readyToFinish) return 'ready_to_finish';
                    if (cfg.autoAccept) return 'auto_accept';
                    return 'normal';
                  },
                );
                const nFin = modeValues.filter((m) => m === 'ready_to_finish').length;
                const nAuto = modeValues.filter((m) => m === 'auto_accept').length;
                const nNorm = modeValues.filter((m) => m === 'normal').length;
                const dirty = dirtyIds.has(s._id);
                const saving = savingId === s._id;
                const chipTypes = sanitizeStaffAllowedTaskTypes(s.allowedTaskTypes as string[]).slice(
                  0,
                  4,
                );
                const moreTasks =
                  sanitizeStaffAllowedTaskTypes(s.allowedTaskTypes as string[]).length -
                  chipTypes.length;
                return (
                  <tr key={s._id} className={dirty ? 'dirty' : ''}>
                    <td className="staff-sched-col-name">
                      <div className="staff-sched-identity">
                        <span className="staff-sched-av">{initials(s.fullName)}</span>
                        <div>
                          <div className="nm">
                            {s.fullName}
                            {always ? <span className="staff-sched-always-badge">24/7</span> : null}
                            {nAuto > 0 ? (
                              <span
                                className="staff-sched-auto-badge"
                                title={`${nAuto} activité(s) en auto-accepte`}
                              >
                                Auto {nAuto}
                              </span>
                            ) : null}
                            {nFin > 0 ? (
                              <span
                                className="staff-sched-auto-badge"
                                title={`${nFin} activité(s) en fin seule`}
                              >
                                Fin {nFin}
                              </span>
                            ) : null}
                            {nNorm > 0 && nAuto === 0 && nFin === 0 ? null : null}
                          </div>
                          <div className="ph">{s.whatsappE164 || s.phoneE164}</div>
                        </div>
                      </div>
                    </td>
                    <td className="staff-sched-col-meta">
                      <div className="staff-sched-task-chips">
                        {chipTypes.length === 0 ? (
                          <span className="staff-sched-meta-muted">—</span>
                        ) : (
                          chipTypes.map((t) => {
                            const meta = pillLabelForType(t);
                            if (!meta) return null;
                            return (
                              <span key={t} className="staff-sched-task-chip" title={meta.label}>
                                {meta.emoji} {meta.label.split(' ')[0]}
                              </span>
                            );
                          })
                        )}
                        {moreTasks > 0 ? (
                          <span className="staff-sched-meta-muted">+{moreTasks}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="staff-sched-col-meta">
                      <span className="staff-sched-meta-txt" title={listingAccessLabel(s, listings)}>
                        {listingAccessLabel(s, listings)}
                      </span>
                    </td>
                    <td className="staff-sched-col-meta">
                      <span
                        className="staff-sched-meta-txt"
                        title={cityAccessLabel(s, cityOptions, listings)}
                      >
                        {cityAccessLabel(s, cityOptions, listings)}
                      </span>
                    </td>
                    <td className="staff-sched-col-auto">
                      <div className="staff-sched-task-chips" title="Configurer dans Modifier → Tâches autorisées">
                        {modeValues.length === 0 ? (
                          <span className="staff-sched-meta-muted">—</span>
                        ) : (
                          <>
                            {nNorm > 0 ? (
                              <span className="staff-sched-meta-muted">N·{nNorm}</span>
                            ) : null}
                            {nAuto > 0 ? (
                              <span className="staff-sched-auto-badge">A·{nAuto}</span>
                            ) : null}
                            {nFin > 0 ? (
                              <span className="staff-sched-auto-badge">F·{nFin}</span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="staff-sched-col-absence">
                      <div className="staff-sched-abs-cell">
                        {(s.absences || []).length === 0 ? (
                          <span className="staff-sched-meta-muted">—</span>
                        ) : (
                          [...(s.absences || [])]
                            .sort(
                              (a, b) =>
                                new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
                            )
                            .slice(0, 3)
                            .map((a) => {
                              const label = formatAbsenceRange(a);
                              const reason = String(a.reason || '').trim();
                              const full = reason ? `${label} · ${reason}` : label;
                              return (
                                <span key={a._id} className="staff-sched-abs-chip" title={full}>
                                  {label}
                                  {reason ? (
                                    <span className="staff-sched-abs-reason"> · {reason}</span>
                                  ) : null}
                                </span>
                              );
                            })
                        )}
                        {(s.absences || []).length > 3 ? (
                          <span className="staff-sched-meta-muted">
                            +{(s.absences || []).length - 3}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="staff-sched-abs-add"
                          onClick={() => openAbsenceModal(s)}
                        >
                          + Absence
                        </button>
                      </div>
                    </td>
                    {DAY_DISPLAY_ORDER.map((day) => {
                      const windows = dw[day];
                      const on = always || Boolean(windows?.length);
                      const open = openCell?.staffId === s._id && openCell.day === day;
                      return (
                        <td key={day} className="staff-sched-day-td">
                          <button
                            type="button"
                            className={`staff-sched-day-cell${on ? ' on' : ''}${always ? ' always' : ''}${open ? ' open' : ''}`}
                            onClick={(e) => openDayEditor(s, day, e.currentTarget)}
                          >
                            {always ? '24/7' : labelWindows(windows)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="staff-sched-col-action">
                      <button
                        type="button"
                        className="staff-sched-save"
                        disabled={!dirty || saving}
                        onClick={() => void handleSaveRow(s)}
                      >
                        {saving ? '…' : dirty ? 'Enregistrer' : 'OK'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editorPortal}

      {absenceModal &&
        createPortal(
          <div
            className="staff-sched-abs-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeAbsenceModal();
            }}
          >
            <div className="staff-sched-abs-modal" role="dialog" aria-modal="true">
              <div className="staff-sched-abs-modal-head">
                <h3>Absence · {absenceModal.staffName}</h3>
                <button
                  type="button"
                  className="staff-sched-abs-modal-close"
                  onClick={closeAbsenceModal}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <p className="staff-sched-abs-modal-hint">
                Choisissez le jour 1 et le jour 2 (inclus). Sur ces jours, le staff ne pourra pas
                être assigné.
              </p>
              <div className="staff-sched-abs-form">
                <label>
                  Jour 1
                  <input
                    type="date"
                    value={absenceStart}
                    onChange={(e) => {
                      setAbsenceStart(e.target.value);
                      if (!absenceEnd || absenceEnd < e.target.value) {
                        setAbsenceEnd(e.target.value);
                      }
                    }}
                    disabled={absenceBusy}
                  />
                </label>
                <label>
                  Jour 2
                  <input
                    type="date"
                    value={absenceEnd}
                    min={absenceStart || undefined}
                    onChange={(e) => setAbsenceEnd(e.target.value)}
                    disabled={absenceBusy}
                  />
                </label>
                <label className="staff-sched-abs-reason-field">
                  Motif
                  <input
                    type="text"
                    value={absenceReason}
                    maxLength={200}
                    placeholder="Congé, maladie…"
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    disabled={absenceBusy}
                  />
                </label>
              </div>
              <button
                type="button"
                className="staff-sched-abs-submit"
                disabled={absenceBusy || !absenceStart || !absenceEnd}
                onClick={() => void handleSubmitAbsence()}
              >
                {absenceBusy ? '…' : 'Ajouter l’absence'}
              </button>
              <div className="staff-sched-abs-list">
                <div className="staff-sched-abs-list-title">Absences enregistrées</div>
                {absenceList.length === 0 ? (
                  <p className="staff-sched-meta-muted">Aucune absence.</p>
                ) : (
                  <ul>
                    {absenceList.map((a) => (
                      <li key={a._id}>
                        <span>
                          {formatAbsenceRange(a)}
                          {a.reason ? ` · ${a.reason}` : ''}
                        </span>
                        <button
                          type="button"
                          className="staff-sched-abs-del"
                          disabled={absenceBusy}
                          onClick={() => void handleDeleteAbsence(absenceModal.staffId, a._id)}
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
