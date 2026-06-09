import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import './staffDesign.css';
import type { Staff, ContractType } from './types';
import {
  STAFF_TASK_PILLS,
  DAY_LABELS,
  LANG_OPTIONS,
  initials,
  pillLabelForType,
  type WorkLang,
} from './staffDesignConstants';
import { MOCK_STAFF_DESIGN, MOCK_LISTINGS_DESIGN } from './mockStaffDesign';

type FilterKey = 'all' | 'active' | 'admin' | 'freelance';
type ListingOpt = { id: string; name: string; ownerId?: string };
type OwnerOption = { id: string; label: string };

function emptyStaff(): Staff {
  return {
    _id: '',
    fullName: '',
    phoneE164: '',
    whatsappE164: '',
    status: 'active',
    isAdmin: false,
    contractType: 'employee',
    allowedTaskTypes: [],
    allowedListingIds: [],
    maxTasksPerDay: 5,
    lang: 'fr',
    schedule: { daysOfWeek: [0, 1, 2, 3, 4], timeWindows: [{ start: '08:00', end: '17:00' }] },
  };
}

function scheduleHours(s: Staff): string {
  const w = s.schedule?.timeWindows?.[0];
  if (!w) return '—';
  if (w.start === '00:00' && (w.end === '23:59' || w.end === '24:00')) return '24/7';
  return `${w.start} → ${w.end}`;
}

function roleLine(s: Staff): string {
  if (s.status === 'off') return `${s.contractType === 'freelance' ? 'FREELANCE' : 'SALARIÉ'} · DÉSACTIVÉ`;
  if (s.isAdmin) return 'FREELANCE · ESCALADES AUTO';
  const contract = s.contractType === 'freelance' ? 'FREELANCE' : 'SALARIÉ';
  const max = s.maxTasksPerDay ? `${s.maxTasksPerDay} TÂCHES/J` : '';
  return [contract, max].filter(Boolean).join(' · ');
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
  onSave: (form: Staff, editingId: string | null) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  useMockFallback?: boolean;
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
}: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Staff>(emptyStaff());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const staff = useMemo(() => {
    if (staffProp.length > 0) return staffProp;
    if (useMockFallback) return MOCK_STAFF_DESIGN;
    return [];
  }, [staffProp, useMockFallback]);

  const listings = useMemo(() => {
    if (listingsProp.length > 0) return listingsProp;
    return MOCK_LISTINGS_DESIGN;
  }, [listingsProp]);

  const formListings = useMemo(() => {
    const formOwnerId = form.ownerId?.trim();
    if (!showOwnerPicker || !formOwnerId) return listings;
    return listings.filter((l) => !l.ownerId || String(l.ownerId) === formOwnerId);
  }, [listings, form.ownerId, showOwnerPicker]);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (filter === 'active') return s.status === 'active';
      if (filter === 'admin') return s.isAdmin;
      if (filter === 'freelance') return s.contractType === 'freelance';
      return true;
    });
  }, [staff, filter]);

  const counts = useMemo(
    () => ({
      all: staff.length,
      active: staff.filter((s) => s.status === 'active').length,
      admin: staff.filter((s) => s.isAdmin).length,
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
    setForm({ ...s, rates: { ...s.rates } });
    setDrawerOpen(true);
    setSelectedId(s._id);
  };

  const patchForm = (patch: Partial<Staff>) => setForm((f) => ({ ...f, ...patch }));

  const toggleTaskType = (key: string) => {
    const set = new Set(form.allowedTaskTypes as string[]);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    patchForm({ allowedTaskTypes: [...set] as Staff['allowedTaskTypes'] });
  };

  const toggleListing = (id: string) => {
    const set = new Set(form.allowedListingIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patchForm({ allowedListingIds: [...set] });
  };

  const toggleDay = (d: number) => {
    const set = new Set(form.schedule.daysOfWeek);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    patchForm({ schedule: { ...form.schedule, daysOfWeek: [...set].sort() } });
  };

  const handleSave = async () => {
    if (showOwnerPicker && !editingId && !form.ownerId?.trim()) {
      toast.error('Choisissez le propriétaire (PM) avant d\'enregistrer.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form, editingId);
      setDrawerOpen(false);
      setEditingId(null);
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
              ['admin', `ADMIN · ${counts.admin}`],
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
            const chipTypes = (s.allowedTaskTypes || []).slice(0, 6);
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
                      {s.isAdmin && <span className="admin">👑 ADMIN</span>}
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
                    WhatsApp
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--t)' }}>
                    {s.whatsappE164 || s.phoneE164}
                  </span>
                </div>
                {firstRate && s.contractType === 'freelance' && (
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
                    {DAY_LABELS.map((lbl, i) => (
                      <span
                        key={`${lbl}-${i}`}
                        className={`day${s.schedule.daysOfWeek.includes(i) ? ' on' : ''}`}
                      >
                        {lbl}
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

            <div className="form-section">
              <div className="form-section-h">Identité</div>
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
                  Téléphone WhatsApp<span className="req">*</span>
                  <span className="hint">Format E.164 · ex : +212 6XX XXX XXX</span>
                </div>
                <input
                  className="input"
                  value={form.whatsappE164}
                  onChange={(e) =>
                    patchForm({ whatsappE164: e.target.value, phoneE164: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <div className="field-label">Langue de travail</div>
                <div className="pill-group">
                  {LANG_OPTIONS.map((lg) => (
                    <button
                      key={lg}
                      type="button"
                      className={`pill-toggle${form.lang === lg ? ' on' : ''}`}
                      onClick={() => patchForm({ lang: lg as WorkLang })}
                    >
                      {lg.toUpperCase()}
                    </button>
                  ))}
                </div>
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
              <div className="field" style={{ opacity: form.contractType === 'freelance' ? 1 : 0.5 }}>
                <div className="field-label">
                  Tarifs freelance
                  <span className="hint">Activé si Freelance · prix par type de tâche</span>
                </div>
                <div className="pricing-grid">
                  {STAFF_TASK_PILLS.filter((p) => form.rates?.[p.key as keyof typeof form.rates] != null ||
                    ['cleaning_free', 'cleaning_paid'].includes(p.key),
                  ).slice(0, 4).map((p) => (
                    <div key={p.key} className="price-row">
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {p.emoji} {p.label}
                      </span>
                      <input
                        className="input"
                        type="number"
                        value={form.rates?.[p.key as keyof typeof form.rates] ?? ''}
                        onChange={(e) =>
                          patchForm({
                            rates: {
                              ...form.rates,
                              [p.key]: Number(e.target.value) || 0,
                            },
                          })
                        }
                        disabled={form.contractType !== 'freelance'}
                      />
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
                  disabled={form.contractType !== 'freelance'}
                  onClick={() => {
                    const first = STAFF_TASK_PILLS.find((p) => form.rates?.[p.key as keyof typeof form.rates] == null);
                    if (first) patchForm({ rates: { ...form.rates, [first.key]: 150 } });
                  }}
                >
                  + Ajouter un type
                </button>
              </div>
            </div>

            <div className="form-section full">
              <div className="form-section-h">Tâches autorisées · multi-sélection</div>
              <div className="pill-group">
                {STAFF_TASK_PILLS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`pill-toggle${
                      (form.allowedTaskTypes as string[]).includes(p.key) ? ' on' : ''
                    }`}
                    onClick={() => toggleTaskType(p.key)}
                  >
                    <span style={{ marginRight: 3 }}>{p.emoji}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section full">
              <div className="form-section-h">Listings rattachés · multi-sélection</div>
              {showOwnerPicker && !form.ownerId ? (
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--pd)' }}>
                  Choisissez d&apos;abord un propriétaire pour afficher ses annonces.
                </p>
              ) : null}
              <div className="pill-group">
                {formListings.map((l, idx) => (
                  <button
                    key={l.id || `listing-${idx}`}
                    type="button"
                    className={`pill-toggle${
                      form.allowedListingIds.includes(l.id) ? ' on' : ''
                    }`}
                    onClick={() => toggleListing(l.id)}
                  >
                    <span style={{ marginRight: 3 }}>🏠</span>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-h">Limite quotidienne</div>
              <div className="field">
                <div className="field-label">
                  Max tâches/jour
                  <span className="hint">Le système n&apos;assignera pas au-delà</span>
                </div>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={20}
                  value={form.maxTasksPerDay ?? 5}
                  onChange={(e) => patchForm({ maxTasksPerDay: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-h">Statut admin</div>
              <div className="admin-row">
                <span style={{ fontSize: 18 }}>👑</span>
                <div style={{ flex: 1 }}>
                  <div className="nm">Admin · escalades + auto-accept</div>
                  <div className="ds">Reçoit les tâches escaladées si personne ne les prend</div>
                </div>
                <div
                  className={`toggle${form.isAdmin ? ' on' : ''}`}
                  onClick={() => patchForm({ isAdmin: !form.isAdmin })}
                  onKeyDown={() => {}}
                  role="switch"
                  aria-checked={form.isAdmin}
                />
              </div>
            </div>

            <div className="form-section full">
              <div className="form-section-h">Planning de travail</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px',
                  gap: 12,
                  alignItems: 'flex-end',
                }}
              >
                <div className="field">
                  <div className="field-label">Jours actifs</div>
                  <div className="day-pills">
                    {DAY_LABELS.map((lbl, i) => (
                      <button
                        key={`d-${lbl}-${i}`}
                        type="button"
                        className={`day-pill${form.schedule.daysOfWeek.includes(i) ? ' on' : ''}`}
                        onClick={() => toggleDay(i)}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <div className="field-label">Début</div>
                  <input
                    className="input"
                    value={form.schedule.timeWindows[0]?.start || '08:00'}
                    onChange={(e) =>
                      patchForm({
                        schedule: {
                          ...form.schedule,
                          timeWindows: [
                            {
                              start: e.target.value,
                              end: form.schedule.timeWindows[0]?.end || '17:00',
                            },
                          ],
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <div className="field-label">Fin</div>
                  <input
                    className="input"
                    value={form.schedule.timeWindows[0]?.end || '17:00'}
                    onChange={(e) =>
                      patchForm({
                        schedule: {
                          ...form.schedule,
                          timeWindows: [
                            {
                              start: form.schedule.timeWindows[0]?.start || '08:00',
                              end: e.target.value,
                            },
                          ],
                        },
                      })
                    }
                  />
                </div>
              </div>
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
            <button type="button" className="btn btn-ghost" disabled={deleting} onClick={() => setDrawerOpen(false)}>
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
