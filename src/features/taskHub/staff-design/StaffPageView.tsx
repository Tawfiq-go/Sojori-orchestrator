import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import './staffDesign.css';
import type { Staff, ContractType } from './types';
import {
  STAFF_TASK_PILLS,
  DAY_LABELS,
  DAY_FULL_LABELS,
  DAY_DISPLAY_ORDER,
  LANG_OPTIONS,
  initials,
  pillLabelForType,
  sanitizeStaffAllowedTaskTypes,
  type WorkLang,
} from './staffDesignConstants';
import { MOCK_STAFF_DESIGN, MOCK_LISTINGS_DESIGN } from './mockStaffDesign';

type FilterKey = 'all' | 'active' | 'freelance';
/** Panneau d’édition accès — un seul contenu visible à la fois. */
type AccessPanel = 'all' | 'city' | 'listing' | null;
type ListingOpt = { id: string; name: string; ownerId?: string; cityId?: string; city?: string };
type CityOpt = { id: string; name: string };

function deriveAccessPanel(s: Pick<Staff, 'allowedListingIds' | 'allowedCityIds'>): AccessPanel {
  if (hasAllAccess(s.allowedListingIds)) return 'all';
  const listings = (s.allowedListingIds || []).filter((id) => id !== 'All' && id !== 'ALL');
  const cities = (s.allowedCityIds || []).filter((id) => id !== 'All' && id !== 'ALL');
  if (listings.length) return 'listing';
  if (cities.length || hasAllAccess(s.allowedCityIds)) return 'city';
  return null;
}

function hasAllAccess(ids: string[] | undefined): boolean {
  if (!ids?.length) return false;
  return ids.some((id) => id === 'All' || id === 'ALL');
}

function accessSummary(s: Staff, cities: CityOpt[]): string {
  if (hasAllAccess(s.allowedListingIds)) return 'Tous les listings';
  if (!s.allowedListingIds?.length && !s.allowedCityIds?.length) return 'Tous les listings';
  const parts: string[] = [];
  if (hasAllAccess(s.allowedCityIds)) {
    parts.push('Toutes les villes');
  } else if (s.allowedCityIds?.length) {
    const names = s.allowedCityIds
      .map((id) => cities.find((c) => c.id === id)?.name || '')
      .filter(Boolean)
      .slice(0, 2);
    if (names.length) {
      parts.push(
        names.join(', ') +
          (s.allowedCityIds.length > 2 ? ` +${s.allowedCityIds.length - 2}` : ''),
      );
    }
  }
  const listingCount = (s.allowedListingIds || []).filter(
    (id) => id !== 'All' && id !== 'ALL',
  ).length;
  if (listingCount) parts.push(`${listingCount} annonce(s)`);
  return parts.length ? parts.join(' · ') : 'Aucun accès';
}
type OwnerOption = { id: string; label: string };

function emptyStaff(): Staff {
  return {
    _id: '',
    fullName: '',
    phoneE164: '',
    whatsappE164: '',
    status: 'active',
    whatsappNotificationsEnabled: true,
    orchestrationNotify: { mode: 'individual', digestTime: '17:00' },
    contractType: 'employee',
    // Aucun type par défaut — l’utilisateur choisit explicitement (salarié ou freelance).
    allowedTaskTypes: [],
    rates: {},
    allowedListingIds: [],
    allowedCityIds: [],
    alwaysAvailable: false,
    taskTypeModes: {},
    autoAccept: false,
    readyToFinish: false,
    lang: 'fr',
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      timeWindows: [{ start: '08:00', end: '17:00' }],
      dayWindows: {
        1: [{ start: '08:00', end: '17:00' }],
        2: [{ start: '08:00', end: '17:00' }],
        3: [{ start: '08:00', end: '17:00' }],
        4: [{ start: '08:00', end: '17:00' }],
        5: [{ start: '08:00', end: '17:00' }],
      },
    },
  };
}

function scheduleHours(s: Staff): string {
  if (s.alwaysAvailable) return 'Toujours · 24/7';
  const dw = s.schedule?.dayWindows;
  if (dw && Object.keys(dw).length) {
    const all = Object.values(dw).flat();
    if (!all.length) return '—';
    if (all.every((w) => w.start === '00:00' && (w.end === '23:59' || w.end === '24:00'))) {
      return '24/24';
    }
    const uniq = [...new Set(all.map((w) => `${w.start}–${w.end}`))];
    return uniq.slice(0, 2).join(' · ') + (uniq.length > 2 ? '…' : '');
  }
  const w = s.schedule?.timeWindows?.[0];
  if (!w) return '—';
  if (w.start === '00:00' && (w.end === '23:59' || w.end === '24:00')) return '24/24';
  return `${w.start} → ${w.end}`;
}

function roleLine(s: Staff): string {
  if (s.status === 'off') return `${s.contractType === 'freelance' ? 'FREELANCE' : 'SALARIÉ'} · DÉSACTIVÉ`;
  return s.contractType === 'freelance' ? 'FREELANCE' : 'SALARIÉ';
}

function avClass(color?: number): string {
  if (color === 2) return 'av c2';
  if (color === 3) return 'av c3';
  if (color === 4) return 'av c4';
  return 'av';
}

interface Props {
  staff: Staff[];
  listings: ListingOpt[];
  loading?: boolean;
  onSave: (form: Staff, editingId: string | null) => Promise<string | void>;
  onDelete?: (id: string) => Promise<void>;
  useMockFallback?: boolean;
  /** Villes Sojori pour permissions par ville. */
  cities?: CityOpt[];
  /** Propriétaire actif (filtre ou session). */
  scopedOwnerLabel?: string;
  /** Admin : choix du PM dans le formulaire. */
  showOwnerPicker?: boolean;
  ownerOptions?: OwnerOption[];
  sessionOwnerId?: string;
  /** Propriétaire sélectionné dans le filtre en haut de page. */
  filterOwnerId?: string;
}

export default function StaffPageView({
  staff: staffProp,
  listings: listingsProp,
  loading,
  onSave,
  onDelete,
  useMockFallback = true,
  scopedOwnerLabel = '',
  showOwnerPicker = false,
  ownerOptions = [],
  sessionOwnerId,
  filterOwnerId,
  cities: citiesProp = [],
}: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Staff>(emptyStaff());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** Quel panneau accès est ouvert (null = rien). Villes + listings se cumulent en DB. */
  const [accessPanel, setAccessPanel] = useState<AccessPanel>(null);
  /** Filtre ville dans le panneau « Par listing » uniquement. */
  const [listingCityFilter, setListingCityFilter] = useState<string | null>(null);
  /** Jour sélectionné pour éditer ses créneaux (null = panneau fermé). */
  const [planningDay, setPlanningDay] = useState<number | null>(1);
  /** Activités ouvertes (collapse) — toutes repliées par défaut. */
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  const staff = useMemo(() => {
    if (staffProp.length > 0) return staffProp;
    if (useMockFallback) return MOCK_STAFF_DESIGN;
    return [];
  }, [staffProp, useMockFallback]);

  const listings = useMemo(() => {
    if (listingsProp.length > 0) return listingsProp;
    return MOCK_LISTINGS_DESIGN;
  }, [listingsProp]);

  const cities = useMemo(() => citiesProp, [citiesProp]);

  const allListingsMode = hasAllAccess(form.allowedListingIds);

  const formListings = useMemo(() => {
    const formOwnerId = form.ownerId?.trim();
    if (!showOwnerPicker || !formOwnerId) return listings;
    return listings.filter((l) => !l.ownerId || String(l.ownerId) === formOwnerId);
  }, [listings, form.ownerId, showOwnerPicker]);

  const formCities = useMemo(() => {
    // Uniquement les villes actives Sojori (usedInSojoriSysytem) — déjà filtrées côté API.
    return cities;
  }, [cities]);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (filter === 'active') return s.status === 'active';
      if (filter === 'freelance') return s.contractType === 'freelance';
      return true;
    });
  }, [staff, filter]);

  const counts = useMemo(
    () => ({
      all: staff.length,
      active: staff.filter((s) => s.status === 'active').length,
      freelance: staff.filter((s) => s.contractType === 'freelance').length,
    }),
    [staff],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyStaff(),
      ownerId: showOwnerPicker ? filterOwnerId || '' : sessionOwnerId || '',
    });
    setAccessPanel(null);
    setListingCityFilter(null);
    setPlanningDay(1);
    setExpandedActivities({});
    setDrawerOpen(true);
    setSelectedId(null);
  };

  const setFormOwnerId = (ownerId: string) => {
    setForm((f) => ({
      ...f,
      ownerId,
      allowedListingIds: f.allowedListingIds.filter((lid) => {
        const listing = listings.find((l) => String(l.id) === String(lid));
        return !listing?.ownerId || String(listing.ownerId) === ownerId;
      }),
    }));
  };

  const openEdit = (s: Staff) => {
    setEditingId(s._id || null);
    let dayWindows: Partial<Record<number, { start: string; end: string }[]>> =
      s.schedule?.dayWindows || {};
    if (!Object.keys(dayWindows).length) {
      const tw = s.schedule?.timeWindows?.length
        ? s.schedule.timeWindows
        : [{ start: '08:00', end: '17:00' }];
      dayWindows = {};
      for (const d of s.schedule?.daysOfWeek || []) {
        // Ignore créneaux inversés hérités (ex. 09:00→08:59)
        const clean = tw.filter((w) => String(w.end) > String(w.start) || (w.start === '00:00' && w.end === '23:59'));
        dayWindows[d] = (clean.length ? clean : [{ start: '08:00', end: '17:00' }]).map((w) => ({
          ...w,
        }));
      }
    } else {
      const cleaned: Partial<Record<number, { start: string; end: string }[]>> = {};
      for (const [k, windows] of Object.entries(dayWindows)) {
        const list = (windows || []).filter(
          (w) =>
            String(w.end) > String(w.start) || (w.start === '00:00' && (w.end === '23:59' || w.end === '24:00')),
        );
        if (list.length) cleaned[Number(k)] = list;
      }
      dayWindows = cleaned;
    }
    const daysOfWeek = Object.keys(dayWindows)
      .map(Number)
      .filter((d) => (dayWindows[d] || []).length > 0)
      .sort((a, b) => a - b);
    setForm({
      ...s,
      rates: { ...s.rates },
      ratesMode: { ...(s.ratesMode || {}) },
      alwaysAvailable: s.alwaysAvailable === true,
      taskTypeModes: { ...(s.taskTypeModes || {}) },
      autoAccept: s.autoAccept === true,
      readyToFinish: s.readyToFinish === true,
      allowedTaskTypes: sanitizeStaffAllowedTaskTypes(s.allowedTaskTypes as string[]),
      schedule: {
        daysOfWeek,
        timeWindows: [{ start: '08:00', end: '17:00' }],
        dayWindows,
      },
    });
    setAccessPanel(deriveAccessPanel(s));
    setListingCityFilter(null);
    setPlanningDay(daysOfWeek[0] ?? null);
    setExpandedActivities({});
    setDrawerOpen(true);
    setSelectedId(s._id);
  };

  const patchForm = (patch: Partial<Staff>) => setForm((f) => ({ ...f, ...patch }));

  const setActivityAccess = (key: string, on: boolean) => {
    const set = new Set(form.allowedTaskTypes as string[]);
    const modes = { ...(form.taskTypeModes || {}) };
    if (on) {
      set.add(key);
      modes[key] = modes[key] || {
        notifyAssign: true,
        remindMode: 'individual',
        autoAccept: false,
        readyToFinish: false,
      };
    } else {
      set.delete(key);
    }
    patchForm({
      allowedTaskTypes: [...set] as Staff['allowedTaskTypes'],
      taskTypeModes: modes,
    });
  };

  const toggleActivityExpanded = (key: string) => {
    setExpandedActivities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const patchTaskTypeCfg = (
    key: string,
    patch: Partial<{
      notifyAssign: boolean;
      remindMode: 'individual' | 'daily_digest';
      digestTime: string;
      autoAccept: boolean;
      readyToFinish: boolean;
    }>,
  ) => {
    const prev = form.taskTypeModes?.[key] || {
      notifyAssign: true,
      remindMode: 'individual' as const,
      autoAccept: false,
      readyToFinish: false,
    };
    let next = { ...prev, ...patch };
    // Auto accept et Auto start sont orthogonaux (ne pas forcer l’un via l’autre).
    if (next.remindMode === 'daily_digest') {
      next = {
        ...next,
        // Journalier = digeste seul ; pas de WA unitaire à l’assign.
        notifyAssign: false,
        digestTime: next.digestTime || '17:00',
      };
    }
    patchForm({
      taskTypeModes: { ...(form.taskTypeModes || {}), [key]: next },
    });
  };

  const selectedCityIds = useMemo(
    () => form.allowedCityIds.filter((id) => id !== 'All' && id !== 'ALL'),
    [form.allowedCityIds],
  );

  const selectedListingIds = useMemo(
    () => form.allowedListingIds.filter((id) => id !== 'All' && id !== 'ALL'),
    [form.allowedListingIds],
  );

  /** Bascule le panneau visible ; recliquer ferme. « Tous » active l’accès total. */
  const selectAccessPanel = (panel: Exclude<AccessPanel, null>) => {
    if (accessPanel === panel) {
      setAccessPanel(null);
      return;
    }
    if (panel === 'all') {
      patchForm({ allowedListingIds: ['All'], allowedCityIds: ['All'] });
      setAccessPanel('all');
      return;
    }
    // Quitter « Tous » : garder les sélections spécifiques déjà présentes
    if (allListingsMode) {
      patchForm({ allowedListingIds: [], allowedCityIds: [] });
    }
    setAccessPanel(panel);
  };

  const toggleCityId = (cityId: string) => {
    const set = new Set(selectedCityIds);
    if (set.has(cityId)) set.delete(cityId);
    else set.add(cityId);
    patchForm({
      allowedCityIds: [...set],
      allowedListingIds: selectedListingIds,
    });
  };

  const removeCityId = (cityId: string) => {
    patchForm({
      allowedCityIds: selectedCityIds.filter((id) => id !== cityId),
      allowedListingIds: selectedListingIds,
    });
  };

  const toggleListingId = (listingId: string) => {
    const set = new Set(selectedListingIds);
    if (set.has(listingId)) set.delete(listingId);
    else set.add(listingId);
    patchForm({
      allowedListingIds: [...set],
      allowedCityIds: selectedCityIds,
    });
  };

  const removeListingId = (listingId: string) => {
    patchForm({
      allowedListingIds: selectedListingIds.filter((id) => id !== listingId),
      allowedCityIds: selectedCityIds,
    });
  };

  const listingsForPicker = useMemo(() => {
    if (!listingCityFilter) return formListings;
    return formListings.filter(
      (l) =>
        String(l.cityId || '') === listingCityFilter ||
        formCities.find((c) => c.id === listingCityFilter)?.name === l.city,
    );
  }, [formListings, listingCityFilter, formCities]);

  const normalizeHm = (raw: string, fallback: string): string => {
    const m = String(raw || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return fallback;
    const h = Math.min(23, Math.max(0, Number(m[1])));
    const min = Math.min(59, Math.max(0, Number(m[2])));
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const sanitizeWindows = (
    windows: { start: string; end: string }[],
  ): { start: string; end: string }[] => {
    const out: { start: string; end: string }[] = [];
    for (const w of windows || []) {
      const start = normalizeHm(w.start, '08:00');
      let end = normalizeHm(w.end, '17:00');
      // Évite les créneaux inversés type 09:00 → 08:59
      if (end <= start && !(start === '00:00' && end === '23:59')) {
        end = '17:00';
        if (end <= start) end = '23:59';
      }
      out.push({ start, end });
    }
    return out;
  };

  const dayWindowsOf = (day: number): { start: string; end: string }[] => {
    const dw = form.schedule.dayWindows?.[day];
    if (dw?.length) return sanitizeWindows(dw);
    return [];
  };

  const isDayOn = (day: number): boolean => dayWindowsOf(day).length > 0;

  const syncScheduleFromDayWindows = (
    dayWindows: Partial<Record<number, { start: string; end: string }[]>>,
  ) => {
    const cleaned: Partial<Record<number, { start: string; end: string }[]>> = {};
    for (const [k, windows] of Object.entries(dayWindows)) {
      const day = Number(k);
      const list = sanitizeWindows(windows || []);
      if (list.length) cleaned[day] = list;
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
    patchForm({
      alwaysAvailable: false,
      schedule: { daysOfWeek, timeWindows, dayWindows: cleaned },
    });
  };

  const selectPlanningDay = (day: number) => {
    setPlanningDay((prev) => (prev === day ? null : day));
  };

  const setDayOn = (day: number, on: boolean) => {
    if (on) {
      setDayWindows(day, [{ start: '08:00', end: '17:00' }]);
    } else {
      setDayWindows(day, []);
    }
  };

  const setDayWindows = (day: number, windows: { start: string; end: string }[]) => {
    const next = { ...(form.schedule.dayWindows || {}) };
    if (!windows.length) delete next[day];
    else next[day] = sanitizeWindows(windows);
    syncScheduleFromDayWindows(next);
  };

  const patchDayWindow = (
    day: number,
    index: number,
    patch: Partial<{ start: string; end: string }>,
  ) => {
    const windows = [...dayWindowsOf(day)];
    windows[index] = { ...windows[index], ...patch };
    setDayWindows(day, windows);
  };

  const addDayWindow = (day: number, preset?: { start: string; end: string }) => {
    setDayWindows(day, [...dayWindowsOf(day), preset || { start: '14:00', end: '18:00' }]);
  };

  const removeDayWindow = (day: number, index: number) => {
    setDayWindows(
      day,
      dayWindowsOf(day).filter((_, i) => i !== index),
    );
  };

  const applyPresetToDay = (day: number, windows: { start: string; end: string }[]) => {
    setDayWindows(day, windows);
  };

  const applyDayToActiveDays = (sourceDay: number) => {
    const source = dayWindowsOf(sourceDay);
    if (!source.length) return;
    const next = { ...(form.schedule.dayWindows || {}) };
    for (const d of Object.keys(next).map(Number)) {
      if ((next[d] || []).length) next[d] = source.map((w) => ({ ...w }));
    }
    // aussi les jours déjà actifs via daysOfWeek
    for (const d of form.schedule.daysOfWeek) {
      next[d] = source.map((w) => ({ ...w }));
    }
    syncScheduleFromDayWindows(next);
    toast.info('Créneaux appliqués aux jours actifs');
  };

  const handleSave = async () => {
    if (showOwnerPicker && !editingId && !form.ownerId?.trim()) {
      toast.error('Choisissez le propriétaire (PM) avant d\'enregistrer.');
      return;
    }
    setSaving(true);
    try {
      const payload: Staff = {
        ...form,
        allowedTaskTypes: sanitizeStaffAllowedTaskTypes(form.allowedTaskTypes as string[]),
      };
      const savedId = await onSave(payload, editingId);
      if (!editingId && savedId) {
        setEditingId(savedId);
        setForm((f) => ({ ...f, _id: savedId }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId || !onDelete) return;
    const label = form.fullName?.trim() || 'ce membre';
    if (!window.confirm(`Supprimer ${label} ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await onDelete(editingId);
      setDrawerOpen(false);
      setEditingId(null);
      setSelectedId(null);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!drawerOpen && selectedId) {
      const still = staff.find((s) => s._id === selectedId);
      if (still) setSelectedId(still._id);
    }
  }, [drawerOpen, selectedId, staff]);

  const drawerTitle = editingId
    ? `Modifier · ${form.fullName || 'Staff'}`
    : 'Ajouter un membre';

  return (
    <div className="so-staff-root">
      <div className="section-hero">
        <div className="em">👷</div>
        <div style={{ flex: 1 }}>
          <h1>
            Staff <span className="badge">OPS · pas de WA</span>
          </h1>
          <div className="sub">
            Membres de votre équipe et leurs compétences. Chaque staff a un contrat, des types de
            tâches autorisées, des listings rattachés et un planning.{' '}
            <b>Quand désactivé</b> : le staff ne reçoit plus de nouvelles assignations mais conserve
            ses tâches en cours.
          </div>
        </div>
      </div>

      <div className="list-h">
        <h2>
          Équipe · <span className="ct">{counts.active} actifs</span>
        </h2>
        <div className="filters">
          {(
            [
              ['all', `TOUS · ${counts.all}`],
              ['active', `ACTIFS · ${counts.active}`],
              ['freelance', `FREELANCE · ${counts.freelance}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`filter-pill${filter === key ? ' on' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && staffProp.length === 0 ? (
        <p style={{ color: 'var(--t3)' }}>Chargement…</p>
      ) : (
        <div className="staff-grid">
          {filtered.map((s) => {
            const chipTypes = sanitizeStaffAllowedTaskTypes(s.allowedTaskTypes as string[]).slice(
              0,
              6,
            );
            const firstRate = s.rates && Object.entries(s.rates)[0];
            return (
              <div
                key={s._id}
                className={`staff-card${selectedId === s._id ? ' on' : ''}${s.status === 'off' ? ' off' : ''}`}
                onClick={() => setSelectedId(s._id)}
                onKeyDown={() => {}}
                role="button"
                tabIndex={0}
              >
                <div className="row1">
                  <div className={avClass(s.avatarColor)}>
                    {initials(s.fullName)}
                    <span
                      className={`dot ${s.status === 'active' ? 'green' : 'red'}`}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">
                      {s.fullName}
                    </div>
                    <div className="role">{roleLine(s)}</div>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(s);
                      }}
                    >
                      ✏
                    </button>
                  </div>
                </div>
                <div className="tasks">
                  {chipTypes.map((t) => {
                    const meta = pillLabelForType(t);
                    if (!meta) return null;
                    return (
                      <span key={t} className="task-chip active">
                        {meta.emoji} {meta.label.split(' ')[0].toUpperCase()}
                      </span>
                    );
                  })}
                </div>
                <div className="meta-line">
                  <span style={{ textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700 }}>
                    Accès
                  </span>
                  <span style={{ color: 'var(--t2)', fontSize: 11 }}>{accessSummary(s, cities)}</span>
                </div>
                <div className="meta-line">
                  <span style={{ textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700 }}>
                    WhatsApp
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--t)' }}>
                    {s.whatsappE164 || s.phoneE164}
                    {(() => {
                      const digestModes = Object.values(s.taskTypeModes || {}).filter(
                        (m) => m?.remindMode === 'daily_digest',
                      );
                      if (!digestModes.length) return '';
                      const hours = [
                        ...new Set(
                          digestModes.map((m) => m.digestTime || '17:00'),
                        ),
                      ];
                      return ` · digeste ${hours.join('/')}`;
                    })()}
                  </span>
                </div>
                {firstRate && (
                  <div className="meta-line">
                    <span style={{ textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700 }}>
                      Tarif
                    </span>
                    <span style={{ color: 'var(--pd)', fontFamily: 'var(--mono)' }}>
                      {firstRate[1]} MAD
                    </span>
                  </div>
                )}
                <div className="schedule">
                  <div className="days">
                    {DAY_DISPLAY_ORDER.map((i) => (
                      <span
                        key={`day-${i}`}
                        className={`day${s.schedule.daysOfWeek.includes(i) ? ' on' : ''}`}
                      >
                        {DAY_LABELS[i]}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{scheduleHours(s)}</span>
                </div>
              </div>
            );
          })}

          <div className="add-staff-card" onClick={openCreate} onKeyDown={() => {}} role="button" tabIndex={0}>
            <div style={{ fontSize: 28 }}>➕</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Ajouter un membre</div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div className="drawer">
          <div className="drawer-h">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'var(--pt)',
                color: 'var(--pd)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {initials(form.fullName || '?')}
            </div>
            <h3>{drawerTitle}</h3>
            <button type="button" className="close" onClick={() => setDrawerOpen(false)}>
              ✕
            </button>
          </div>

          <div className="form-grid">
            <div className="form-section full">
              <div className="form-section-h">Propriétaire (PM)</div>
              {showOwnerPicker ? (
                <div className="field">
                  <div className="field-label">
                    Rattaché au propriétaire<span className="req">*</span>
                    <span className="hint">Obligatoire pour les comptes admin</span>
                  </div>
                  <select
                    className={`input${!form.ownerId ? ' input--warn' : ''}`}
                    value={form.ownerId || ''}
                    onChange={(e) => setFormOwnerId(e.target.value)}
                  >
                    <option value="">— Choisir un propriétaire —</option>
                    {ownerOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="drawer-owner-scope">
                  <strong>Propriétaire :</strong>{' '}
                  {scopedOwnerLabel || 'Votre compte'} — détecté automatiquement depuis votre
                  session.
                </div>
              )}
            </div>

            <div className="form-section full">
              <div className="form-section-h">Identité</div>
              <div className="field-row field-row--3">
                <div className="field">
                  <div className="field-label">
                    Nom complet<span className="req">*</span>
                  </div>
                  <input
                    className="input"
                    value={form.fullName}
                    onChange={(e) => patchForm({ fullName: e.target.value })}
                    placeholder="ex: Ahmed Benali"
                  />
                </div>
                <div className="field">
                  <div className="field-label">
                    WhatsApp<span className="req">*</span>
                    <span className="hint">E.164 · +212…</span>
                  </div>
                  <input
                    className="input"
                    value={form.whatsappE164}
                    onChange={(e) =>
                      patchForm({ whatsappE164: e.target.value, phoneE164: e.target.value })
                    }
                    placeholder="+2126…"
                  />
                </div>
                <div className="field">
                  <div className="field-label">Langue</div>
                  <div className="pill-group">
                    {LANG_OPTIONS.map((lg) => (
                      <button
                        key={lg.value}
                        type="button"
                        className={`pill-toggle${form.lang === lg.value ? ' on' : ''}`}
                        onClick={() => patchForm({ lang: lg.value as WorkLang })}
                      >
                        {lg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Activités : liste complète en collapse — Accès Oui/Non + options. */}
            <div className="form-section full">
              <div className="form-section-h">
                Activités<span className="req">*</span>
              </div>
              <div className="ds" style={{ marginBottom: 8 }}>
                Accès Oui = staff assignable. Ouvrir ▶ pour Notifier · Rappels · Auto accept · Auto start.
              </div>
              {form.allowedTaskTypes.length === 0 ? (
                <p className="staff-recap-warn">
                  ⚠ Aucune activité active — ce staff ne recevra jamais d&apos;assignation.
                </p>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STAFF_TASK_PILLS.map((p) => {
                  const accessOn = (form.allowedTaskTypes as string[]).includes(p.key);
                  const expanded = expandedActivities[p.key] === true;
                  const cfg = form.taskTypeModes?.[p.key] || {
                    notifyAssign: true,
                    remindMode: 'individual' as const,
                    autoAccept: false,
                    readyToFinish: false,
                  };
                  return (
                    <div
                      key={p.key}
                      style={{
                        border: '1px solid var(--bd, #e5e7eb)',
                        borderRadius: 10,
                        overflow: 'hidden',
                        opacity: accessOn ? 1 : 0.72,
                      }}
                    >
                      <div
                        className="admin-row"
                        style={{
                          padding: '8px 10px',
                          margin: 0,
                          gap: 8,
                          cursor: 'pointer',
                          background: expanded ? 'var(--bg2, #f8fafc)' : undefined,
                        }}
                        onClick={() => toggleActivityExpanded(p.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleActivityExpanded(p.key);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={expanded}
                      >
                        <span
                          style={{
                            width: 18,
                            fontSize: 12,
                            color: 'var(--t3)',
                            flexShrink: 0,
                          }}
                          aria-hidden
                        >
                          {expanded ? '▼' : '▶'}
                        </span>
                        <span style={{ fontSize: 16 }}>{p.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="nm" style={{ fontSize: 13 }}>
                            {p.label}
                          </div>
                        </div>
                        <div
                          className="pill-group"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {(
                            [
                              { id: true, label: 'Oui' },
                              { id: false, label: 'Non' },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={String(opt.id)}
                              type="button"
                              className={`pill-toggle${accessOn === opt.id ? ' on' : ''}`}
                              onClick={() => setActivityAccess(p.key, opt.id)}
                              title="Accès activité"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {expanded ? (
                        <div style={{ padding: '6px 12px 10px', borderTop: '1px solid var(--bd, #e5e7eb)' }}>
                          {!accessOn ? (
                            <div className="ds" style={{ marginBottom: 6 }}>
                              Accès Non — options mémorisées, actives seulement si Accès Oui.
                            </div>
                          ) : null}
                          <div
                            className="activity-cfg-compact"
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: '6px 14px',
                            }}
                          >
                            <div
                              className="activity-cfg-item"
                              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                              title={
                                cfg.remindMode === 'daily_digest'
                                  ? `Inclus dans digeste ${cfg.digestTime || '17:00'} (pas de WA à l’assign)`
                                  : 'Notif WhatsApp à l’assignation'
                              }
                            >
                              <span className="nm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                Notifier
                              </span>
                              <div className="pill-group">
                                {(
                                  [
                                    { id: true, label: 'Oui' },
                                    { id: false, label: 'Non' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={String(opt.id)}
                                    type="button"
                                    disabled={cfg.remindMode === 'daily_digest'}
                                    className={`pill-toggle${
                                      (cfg.remindMode === 'daily_digest'
                                        ? false
                                        : cfg.notifyAssign) === opt.id
                                        ? ' on'
                                        : ''
                                    }`}
                                    onClick={() => {
                                      if (cfg.remindMode === 'daily_digest') return;
                                      patchTaskTypeCfg(p.key, { notifyAssign: opt.id });
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div
                              className="activity-cfg-item"
                              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                              title="Rappels orchestration"
                            >
                              <span className="nm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                Rappels
                              </span>
                              <div className="pill-group">
                                {(
                                  [
                                    { id: 'individual' as const, label: 'Indiv.' },
                                    { id: 'daily_digest' as const, label: 'Journ.' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    className={`pill-toggle${
                                      cfg.remindMode === opt.id ? ' on' : ''
                                    }`}
                                    onClick={() =>
                                      patchTaskTypeCfg(p.key, { remindMode: opt.id })
                                    }
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                              {cfg.remindMode === 'daily_digest' ? (
                                <input
                                  className="input"
                                  type="time"
                                  title="Heure digeste (Casablanca)"
                                  style={{
                                    width: 92,
                                    padding: '2px 6px',
                                    fontSize: 12,
                                    height: 26,
                                  }}
                                  value={cfg.digestTime || '17:00'}
                                  onChange={(e) =>
                                    patchTaskTypeCfg(p.key, {
                                      remindMode: 'daily_digest',
                                      digestTime: e.target.value || '17:00',
                                    })
                                  }
                                />
                              ) : null}
                            </div>

                            <div
                              className="activity-cfg-item"
                              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                              title="Auto accept : pas de Refuser · assignation → À commencer"
                            >
                              <span className="nm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                Auto accept
                              </span>
                              <div className="pill-group">
                                {(
                                  [
                                    { id: true, label: 'Oui' },
                                    { id: false, label: 'Non' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={`auto-${String(opt.id)}`}
                                    type="button"
                                    className={`pill-toggle${
                                      Boolean(cfg.autoAccept) === opt.id ? ' on' : ''
                                    }`}
                                    onClick={() =>
                                      patchTaskTypeCfg(p.key, {
                                        autoAccept: opt.id,
                                      })
                                    }
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div
                              className="activity-cfg-item"
                              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                              title="Auto start : saute Commencer · va direct à Terminer"
                            >
                              <span className="nm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                Auto start
                              </span>
                              <div className="pill-group">
                                {(
                                  [
                                    { id: true, label: 'Oui' },
                                    { id: false, label: 'Non' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={`fin-${String(opt.id)}`}
                                    type="button"
                                    className={`pill-toggle${
                                      Boolean(cfg.readyToFinish) === opt.id ? ' on' : ''
                                    }`}
                                    onClick={() =>
                                      patchTaskTypeCfg(p.key, {
                                        readyToFinish: opt.id,
                                      })
                                    }
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-h">Contrat & rémunération</div>
              <div className="field">
                <div className="field-label">
                  Type de contrat<span className="req">*</span>
                </div>
                <div className="seg">
                  {(
                    [
                      ['employee', '💼 Salarié'],
                      ['freelance', '🎯 Freelance'],
                    ] as const
                  ).map(([ct, label]) => (
                    <button
                      key={ct}
                      type="button"
                      className={form.contractType === ct ? 'on' : ''}
                      onClick={() => patchForm({ contractType: ct as ContractType })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {form.contractType !== 'freelance' && (
                <div className="field">
                  <div className="field-label">
                    Salaire (MAD/mois)
                    <span className="hint">Montant mensuel fixe — enregistré en base</span>
                  </div>
                  <div className="price-row">
                    <input
                      className="input"
                      type="number"
                      min={0}
                      placeholder="ex. 4000"
                      value={form.salary ?? ''}
                      onChange={(e) =>
                        patchForm({
                          salary: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>
                      MAD / mois
                    </span>
                  </div>
                </div>
              )}
              {form.contractType === 'freelance' && (
              <div className="field">
                <div className="field-label">
                  Tarifs (MAD)
                  <span className="hint">Prix par activité — ex. ménage 100 MAD</span>
                </div>
                <div className="pricing-grid">
                  {STAFF_TASK_PILLS.filter(
                    (p) => form.rates?.[p.key as keyof typeof form.rates] != null,
                  ).map((p) => (
                    <div key={p.key} className="price-row">
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {p.emoji} {p.label}
                      </span>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={form.rates?.[p.key as keyof typeof form.rates] ?? ''}
                        onChange={(e) =>
                          patchForm({
                            rates: {
                              ...form.rates,
                              [p.key]: Number(e.target.value) || 0,
                            },
                          })
                        }
                      />
                      <select
                        className="input"
                        style={{ width: 'auto', fontSize: 12 }}
                        value={form.ratesMode?.[p.key] ?? 'per_task'}
                        onChange={(e) =>
                          patchForm({
                            ratesMode: {
                              ...form.ratesMode,
                              [p.key]: e.target.value as 'per_task' | 'hourly' | 'monthly',
                            },
                          })
                        }
                      >
                        <option value="per_task">MAD / tâche</option>
                        <option value="hourly">MAD / heure</option>
                        <option value="monthly">MAD fixe / mois</option>
                      </select>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          const next = { ...form.rates };
                          delete next[p.key as keyof typeof next];
                          patchForm({ rates: next });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="add-btn"
                  onClick={() => {
                    const first = STAFF_TASK_PILLS.find(
                      (p) => form.rates?.[p.key as keyof typeof form.rates] == null,
                    );
                    if (first) patchForm({ rates: { ...form.rates, [first.key]: 0 } });
                  }}
                >
                  + Ajouter un type
                </button>
              </div>
              )}
            </div>

            <div className="form-section full">
              <div className="form-section-h">Accès annonces</div>
              <div className="access-mode-row">
                {(
                  [
                    ['all', '🌍', 'Tous les listings'],
                    ['city', '📍', 'Par ville'],
                    ['listing', '🏠', 'Par listing'],
                  ] as const
                ).map(([key, emoji, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`access-mode-btn${accessPanel === key ? ' on' : ''}${
                      key === 'all' && allListingsMode ? ' active-value' : ''
                    }${key === 'city' && selectedCityIds.length > 0 && !allListingsMode ? ' active-value' : ''}${
                      key === 'listing' && selectedListingIds.length > 0 && !allListingsMode
                        ? ' active-value'
                        : ''
                    }`}
                    onClick={() => selectAccessPanel(key)}
                  >
                    <span>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>

              {allListingsMode ? (
                <div className="access-selected-chips access-selected-chips--compact">
                  <span className="access-chip">
                    <span className="access-chip-emoji">🌍</span>
                    <span className="access-chip-label">Tous les listings</span>
                    <button
                      type="button"
                      className="access-chip-x"
                      aria-label="Retirer accès total"
                      onClick={() => {
                        patchForm({ allowedListingIds: [], allowedCityIds: [] });
                        setAccessPanel(null);
                      }}
                    >
                      ✕
                    </button>
                  </span>
                </div>
              ) : selectedCityIds.length > 0 || selectedListingIds.length > 0 ? (
                <div className="access-selected-chips access-selected-chips--compact">
                  {selectedCityIds.map((id) => {
                    const name = formCities.find((c) => c.id === id)?.name || id;
                    return (
                      <span key={`c-${id}`} className="access-chip">
                        <span className="access-chip-emoji">📍</span>
                        <span className="access-chip-label">{name}</span>
                        <button
                          type="button"
                          className="access-chip-x"
                          aria-label={`Retirer ${name}`}
                          onClick={() => removeCityId(id)}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                  {selectedListingIds.map((id) => {
                    const name = formListings.find((l) => l.id === id)?.name || id;
                    return (
                      <span key={`l-${id}`} className="access-chip">
                        <span className="access-chip-emoji">🏠</span>
                        <span className="access-chip-label">{name}</span>
                        <button
                          type="button"
                          className="access-chip-x"
                          aria-label={`Retirer ${name}`}
                          onClick={() => removeListingId(id)}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}

              {accessPanel === 'all' && allListingsMode ? (
                <p className="access-panel-hint">Accès à toutes les annonces du propriétaire.</p>
              ) : null}

              {accessPanel === 'city' ? (
                <div className="access-check-grid">
                  {formCities.length === 0 ? (
                    <p className="access-panel-hint">Aucune ville disponible.</p>
                  ) : (
                    formCities.map((c) => (
                      <label key={c.id} className="access-check">
                        <input
                          type="checkbox"
                          checked={selectedCityIds.includes(c.id)}
                          onChange={() => toggleCityId(c.id)}
                        />
                        <span>📍 {c.name}</span>
                      </label>
                    ))
                  )}
                </div>
              ) : null}

              {accessPanel === 'listing' ? (
                <div className="access-listing-panel">
                  {formCities.length > 0 ? (
                    <div className="access-city-filter">
                      <button
                        type="button"
                        className={`access-city-filter-btn${!listingCityFilter ? ' on' : ''}`}
                        onClick={() => setListingCityFilter(null)}
                      >
                        Toutes
                      </button>
                      {formCities.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`access-city-filter-btn${
                            listingCityFilter === c.id ? ' on' : ''
                          }`}
                          onClick={() =>
                            setListingCityFilter((prev) => (prev === c.id ? null : c.id))
                          }
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {showOwnerPicker && !form.ownerId ? (
                    <p className="access-panel-hint">
                      Choisissez d&apos;abord un propriétaire.
                    </p>
                  ) : (
                    <div className="access-check-grid access-check-grid--listings">
                      {listingsForPicker.length === 0 ? (
                        <p className="access-panel-hint">Aucune annonce.</p>
                      ) : (
                        listingsForPicker.map((l) => (
                          <label key={l.id} className="access-check">
                            <input
                              type="checkbox"
                              checked={selectedListingIds.includes(l.id)}
                              onChange={() => toggleListingId(l.id)}
                            />
                            <span title={l.name}>🏠 {l.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="form-section full">
              <div className="form-section-h">Planning de travail</div>
              <div className="admin-row" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🕒</span>
                <div style={{ flex: 1 }}>
                  <div className="nm">Toujours disponible</div>
                  <div className="ds">
                    7j/7 · 24h/24 — l’assignation ignore les créneaux (congés exclus)
                  </div>
                </div>
                <div
                  className={`toggle${form.alwaysAvailable ? ' on' : ''}`}
                  onClick={() => {
                    const next = !form.alwaysAvailable;
                    if (next) {
                      const dayWindows: Partial<Record<number, { start: string; end: string }[]>> =
                        {};
                      for (let d = 0; d <= 6; d += 1) {
                        dayWindows[d] = [{ start: '00:00', end: '23:59' }];
                      }
                      patchForm({
                        alwaysAvailable: true,
                        schedule: {
                          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                          timeWindows: [{ start: '00:00', end: '23:59' }],
                          dayWindows,
                        },
                      });
                    } else {
                      patchForm({ alwaysAvailable: false });
                    }
                  }}
                  onKeyDown={() => {}}
                  role="switch"
                  aria-checked={Boolean(form.alwaysAvailable)}
                />
              </div>
              {form.alwaysAvailable ? (
                <p className="access-panel-hint">
                  Mode actif — ce membre est éligible à toute heure. Désactivez pour éditer les
                  jours.
                </p>
              ) : null}
              <div className={`day-pills${form.alwaysAvailable ? ' disabled-soft' : ''}`}>
                {DAY_DISPLAY_ORDER.map((i) => {
                  const active = form.alwaysAvailable || isDayOn(i);
                  const selected = planningDay === i;
                  return (
                    <button
                      key={`d-${i}`}
                      type="button"
                      className={`day-pill${active ? ' on' : ''}${selected ? ' selected' : ''}`}
                      onClick={() => {
                        if (form.alwaysAvailable) return;
                        selectPlanningDay(i);
                      }}
                      title={DAY_FULL_LABELS[i]}
                      disabled={form.alwaysAvailable}
                    >
                      {DAY_LABELS[i]}
                    </button>
                  );
                })}
              </div>

              {form.alwaysAvailable ? null : planningDay == null ? (
                <p className="access-panel-hint" style={{ marginTop: 10 }}>
                  Cliquez un jour · activez-le · définissez ses créneaux — ou activez « Toujours
                  disponible ».
                </p>
              ) : (
                <div className="planning-day-panel">
                  <div className="planning-day-toggle-row">
                    <div>
                      <strong>{DAY_FULL_LABELS[planningDay]}</strong>
                      <div className="hint">
                        {isDayOn(planningDay) ? 'Jour travaillé' : 'Jour off'}
                      </div>
                    </div>
                    <div className="planning-onoff">
                      <span className={!isDayOn(planningDay) ? 'on' : ''}>Off</span>
                      <div
                        className={`toggle${isDayOn(planningDay) ? ' on' : ''}`}
                        onClick={() => setDayOn(planningDay, !isDayOn(planningDay))}
                        onKeyDown={() => {}}
                        role="switch"
                        aria-checked={isDayOn(planningDay)}
                      />
                      <span className={isDayOn(planningDay) ? 'on' : ''}>On</span>
                    </div>
                  </div>

                  {isDayOn(planningDay) ? (
                    <>
                      <div className="planning-presets">
                        <button
                          type="button"
                          className="planning-preset-btn"
                          onClick={() =>
                            applyPresetToDay(planningDay, [{ start: '08:00', end: '12:00' }])
                          }
                        >
                          8h–12h
                        </button>
                        <button
                          type="button"
                          className="planning-preset-btn"
                          onClick={() =>
                            applyPresetToDay(planningDay, [{ start: '14:00', end: '18:00' }])
                          }
                        >
                          14h–18h
                        </button>
                        <button
                          type="button"
                          className="planning-preset-btn"
                          onClick={() =>
                            applyPresetToDay(planningDay, [
                              { start: '08:00', end: '12:00' },
                              { start: '14:00', end: '18:00' },
                            ])
                          }
                        >
                          8–12 + 14–18
                        </button>
                        <button
                          type="button"
                          className="planning-preset-btn"
                          onClick={() =>
                            applyPresetToDay(planningDay, [{ start: '08:00', end: '17:00' }])
                          }
                        >
                          8h–17h
                        </button>
                        <button
                          type="button"
                          className="planning-preset-btn"
                          onClick={() =>
                            applyPresetToDay(planningDay, [{ start: '00:00', end: '23:59' }])
                          }
                        >
                          24/24
                        </button>
                        <button
                          type="button"
                          className="planning-preset-btn"
                          onClick={() => {
                            const dayWindows: Partial<
                              Record<number, { start: string; end: string }[]>
                            > = {};
                            for (let d = 0; d <= 6; d += 1) {
                              dayWindows[d] = [{ start: '00:00', end: '23:59' }];
                            }
                            patchForm({
                              alwaysAvailable: true,
                              schedule: {
                                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                                timeWindows: [{ start: '00:00', end: '23:59' }],
                                dayWindows,
                              },
                            });
                            setPlanningDay(null);
                          }}
                        >
                          Toujours
                        </button>
                      </div>
                      <div className="planning-slots">
                        {dayWindowsOf(planningDay).map((w, idx) => (
                          <div key={`slot-${planningDay}-${idx}`} className="planning-slot-row">
                            <input
                              className="input"
                              type="time"
                              value={w.start}
                              onChange={(e) =>
                                patchDayWindow(planningDay, idx, { start: e.target.value })
                              }
                            />
                            <span className="planning-slot-sep">→</span>
                            <input
                              className="input"
                              type="time"
                              value={w.end}
                              onChange={(e) =>
                                patchDayWindow(planningDay, idx, { end: e.target.value })
                              }
                            />
                            <button
                              type="button"
                              className="access-chip-x"
                              aria-label="Supprimer créneau"
                              onClick={() => removeDayWindow(planningDay, idx)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="planning-day-actions">
                        <button
                          type="button"
                          className="add-btn"
                          onClick={() => addDayWindow(planningDay)}
                        >
                          + Ajouter un créneau
                        </button>
                        <button
                          type="button"
                          className="add-btn"
                          onClick={() => applyDayToActiveDays(planningDay)}
                        >
                          Appliquer aux jours actifs
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="access-panel-hint">
                      Jour off — aucune assignation ce jour-là. Activez le toggle pour définir un
                      planning.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="drawer-foot">
            <div className="drawer-foot-start">
              {editingId && onDelete ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={saving || deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting ? 'Suppression…' : 'Supprimer'}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={deleting}
              onClick={() => setDrawerOpen(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-prim"
              disabled={saving || deleting}
              onClick={() => void handleSave()}
            >
              Enregistrer ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
