import { useMemo, useState } from 'react';
import './staffDesign.css';
import {
  WA_ADMIN_NOTIFICATION_GROUPS,
  WA_ADMIN_TYPES,
  WA_LANGUAGES,
  WA_TASK_NOTIFY_CREATED,
  cyclePermissionAccess,
  defaultAdminNotifications,
  emptyWhatsappAdmin,
  waAdminLanguageLabel,
  type WhatsappAdminDesign,
} from './whatsappAdminTypes';
import { initials } from './staffDesignConstants';

type ListingOpt = { id: string; name: string; cityId?: string; city?: string };
type CityOpt = { id: string; name: string };
type AccessPanel = 'all' | 'city' | 'listing' | null;

type Props = {
  admins: WhatsappAdminDesign[];
  listings: ListingOpt[];
  cities?: CityOpt[];
  loading?: boolean;
  onSave: (form: WhatsappAdminDesign, editingId: string | null) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

function hasAllAccess(ids: string[] | undefined): boolean {
  if (!ids?.length) return false;
  return ids.some((id) => id === 'All' || id === 'ALL');
}

function deriveAccessPanel(a: Pick<WhatsappAdminDesign, 'listingIds' | 'cityIds'>): AccessPanel {
  if (hasAllAccess(a.listingIds)) return 'all';
  const listings = (a.listingIds || []).filter((id) => id !== 'All' && id !== 'ALL');
  const cities = (a.cityIds || []).filter((id) => id !== 'All' && id !== 'ALL');
  if (listings.length) return 'listing';
  if (cities.length || hasAllAccess(a.cityIds)) return 'city';
  return null;
}

/** Libellé accès — vide = aucun ; All = tous les biens de ce PM (pas la plateforme). */
function adminAccessSummary(a: WhatsappAdminDesign, cities: CityOpt[]): string {
  if (hasAllAccess(a.listingIds) || hasAllAccess(a.cityIds)) {
    return 'Tous les listings (ce owner)';
  }
  if (!a.listingIds?.length && !a.cityIds?.length) return 'Aucun accès';
  const parts: string[] = [];
  if (a.cityIds?.length) {
    const names = a.cityIds
      .filter((id) => id !== 'All' && id !== 'ALL')
      .map((id) => cities.find((c) => c.id === id)?.name || '')
      .filter(Boolean)
      .slice(0, 2);
    if (names.length) {
      parts.push(names.join(', ') + (a.cityIds.length > 2 ? ` +${a.cityIds.length - 2}` : ''));
    }
  }
  const listingCount = (a.listingIds || []).filter((id) => id !== 'All' && id !== 'ALL').length;
  if (listingCount) parts.push(`${listingCount} annonce(s)`);
  return parts.length ? parts.join(' · ') : 'Aucun accès';
}

export default function WhatsappAdminPageView({
  admins,
  listings,
  cities = [],
  loading,
  onSave,
  onDelete,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WhatsappAdminDesign>(emptyWhatsappAdmin());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [accessPanel, setAccessPanel] = useState<AccessPanel>(null);
  const [listingCityFilter, setListingCityFilter] = useState<string | null>(null);

  const activeCount = useMemo(() => admins.filter((a) => !a.banned).length, [admins]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyWhatsappAdmin());
    setAccessPanel(null);
    setListingCityFilter(null);
    setDrawerOpen(true);
  };

  const openEdit = (a: WhatsappAdminDesign) => {
    setEditingId(a._id);
    setForm({
      ...a,
      permissions: a.permissions.map((p) => ({ ...p })),
      listingIds: [...a.listingIds],
      cityIds: [...(a.cityIds || [])],
      notifications: { ...defaultAdminNotifications(), ...a.notifications },
    });
    setAccessPanel(deriveAccessPanel(a));
    setListingCityFilter(null);
    setDrawerOpen(true);
  };

  const patchForm = (patch: Partial<WhatsappAdminDesign>) => setForm((f) => ({ ...f, ...patch }));

  const allListingsMode = hasAllAccess(form.listingIds);
  const selectedCityIds = useMemo(
    () => form.cityIds.filter((id) => id !== 'All' && id !== 'ALL'),
    [form.cityIds],
  );
  const selectedListingIds = useMemo(
    () => form.listingIds.filter((id) => id !== 'All' && id !== 'ALL'),
    [form.listingIds],
  );

  const listingsForPicker = useMemo(() => {
    if (!listingCityFilter) return listings;
    return listings.filter(
      (l) =>
        String(l.cityId || '') === listingCityFilter ||
        cities.find((c) => c.id === listingCityFilter)?.name === l.city,
    );
  }, [listings, listingCityFilter, cities]);

  const selectAccessPanel = (panel: Exclude<AccessPanel, null>) => {
    if (accessPanel === panel) {
      setAccessPanel(null);
      return;
    }
    if (panel === 'all') {
      patchForm({ listingIds: ['All'], cityIds: ['All'] });
      setAccessPanel('all');
      return;
    }
    if (allListingsMode) {
      patchForm({ listingIds: [], cityIds: [] });
    }
    setAccessPanel(panel);
  };

  const toggleCityId = (cityId: string) => {
    const set = new Set(selectedCityIds);
    if (set.has(cityId)) set.delete(cityId);
    else set.add(cityId);
    patchForm({ cityIds: [...set], listingIds: selectedListingIds });
  };

  const removeCityId = (cityId: string) => {
    patchForm({
      cityIds: selectedCityIds.filter((id) => id !== cityId),
      listingIds: selectedListingIds,
    });
  };

  const toggleListingId = (listingId: string) => {
    const set = new Set(selectedListingIds);
    if (set.has(listingId)) set.delete(listingId);
    else set.add(listingId);
    patchForm({ listingIds: [...set], cityIds: selectedCityIds });
  };

  const removeListingId = (listingId: string) => {
    patchForm({
      listingIds: selectedListingIds.filter((id) => id !== listingId),
      cityIds: selectedCityIds,
    });
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.whatsappPhone.trim()) return;
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
    const label = form.username?.trim() || 'cet admin';
    if (!window.confirm(`Supprimer ${label} ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await onDelete(editingId);
      setDrawerOpen(false);
      setEditingId(null);
    } finally {
      setDeleting(false);
    }
  };

  const permLabel = (access: string) => {
    if (access === 'write') return 'W';
    if (access === 'read') return 'R';
    return 'N';
  };

  const toggleNotification = (key: string) => {
    patchForm({
      notifications: {
        ...form.notifications,
        [key]: form.notifications[key] === false,
      },
    });
  };

  return (
    <div className="so-staff-root" style={{ padding: 0, minHeight: 0 }}>
      <div className="section-hero">
        <div className="em">📱</div>
        <div style={{ flex: 1 }}>
          <h1>
            Admin WhatsApp <span className="badge">NOTIFS · PERMISSIONS</span>
          </h1>
          <div className="sub">
            Opérateurs WhatsApp (résas, inbox, tâches). Distinct du staff terrain.
          </div>
        </div>
      </div>

      <div className="list-h">
        <h2>
          Admins · <span className="ct">{activeCount} actifs</span>
        </h2>
      </div>

      {loading && admins.length === 0 ? (
        <p style={{ color: 'var(--t3)' }}>Chargement…</p>
      ) : (
        <div className="staff-grid">
          {admins.map((a) => (
            <div
              key={a._id}
              className={`staff-card${!a.banned ? ' on' : ''}${a.banned ? ' off' : ''}`}
            >
              <div className="row1">
                <div className="av">
                  {initials(a.username)}
                  <span className={`dot ${a.banned ? 'red' : 'green'}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm">
                    {a.username}
                    <span className="admin">{a.banned ? 'BANNI' : 'ACTIF'}</span>
                  </div>
                  <div className="role">
                    {waAdminLanguageLabel(a.language)} · {a.whatsappPhone}
                  </div>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                  >
                    ✏
                  </button>
                </div>
              </div>
              <div className="meta-line">
                <span style={{ textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700 }}>
                  Accès
                </span>
                <span style={{ color: 'var(--t2)', fontSize: 11 }}>
                  {adminAccessSummary(a, cities)}
                </span>
              </div>
            </div>
          ))}

          <div
            className="add-staff-card"
            onClick={openCreate}
            onKeyDown={() => {}}
            role="button"
            tabIndex={0}
          >
            <div style={{ fontSize: 28 }}>➕</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Ajouter un admin</div>
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
              📱
            </div>
            <h3>{editingId ? `Modifier · ${form.username}` : 'Nouvel admin WhatsApp'}</h3>
            <button type="button" className="close" onClick={() => setDrawerOpen(false)}>
              ✕
            </button>
          </div>

          <div className="form-grid">
            <div className="form-section full">
              <div className="form-section-h">Identité</div>
              <div className="field-row field-row--3">
                <div className="field">
                  <div className="field-label">
                    Nom<span className="req">*</span>
                  </div>
                  <input
                    className="input"
                    value={form.username}
                    onChange={(e) => patchForm({ username: e.target.value })}
                    placeholder="ex: Ops Marrakech"
                  />
                </div>
                <div className="field">
                  <div className="field-label">
                    WhatsApp<span className="req">*</span>
                  </div>
                  <input
                    className="input"
                    value={form.whatsappPhone}
                    onChange={(e) => patchForm({ whatsappPhone: e.target.value })}
                    placeholder="+2126…"
                  />
                </div>
                <div className="field">
                  <div className="field-label">Langue</div>
                  <div className="pill-group">
                    {WA_LANGUAGES.map((lg) => (
                      <button
                        key={lg.value}
                        type="button"
                        className={`pill-toggle${form.language === lg.value ? ' on' : ''}`}
                        onClick={() => patchForm({ language: lg.value })}
                      >
                        {lg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="admin-row" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 18 }}>⛔</span>
                <div style={{ flex: 1 }}>
                  <div className="nm">Compte banni</div>
                  <div className="ds">Ne reçoit plus de notifications</div>
                </div>
                <div
                  className={`toggle${form.banned ? ' on' : ''}`}
                  onClick={() => patchForm({ banned: !form.banned })}
                  onKeyDown={() => {}}
                  role="switch"
                  aria-checked={form.banned}
                />
              </div>
            </div>

            <div className="form-section full">
              <div className="form-section-h">Menus · N → R → W</div>
              <div className="pill-group">
                {form.permissions.map((p, idx) => {
                  const meta = WA_ADMIN_TYPES.find((t) => t.type === p.type);
                  return (
                    <button
                      key={p.type}
                      type="button"
                      className={`pill-toggle${p.access !== 'none' ? ' on' : ''}`}
                      onClick={() => {
                        const next = [...form.permissions];
                        next[idx] = { ...p, access: cyclePermissionAccess(p.access) };
                        patchForm({ permissions: next });
                      }}
                    >
                      <strong>{meta?.menuLetter}</strong> {meta?.label} ({permLabel(p.access)})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-section full">
              <div className="form-section-h">Notifications</div>
              {WA_ADMIN_NOTIFICATION_GROUPS.map((group) => (
                <div key={group.title} style={{ marginBottom: 10 }}>
                  <div className="pill-group">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`pill-toggle${form.notifications[item.key] !== false ? ' on' : ''}`}
                        onClick={() => toggleNotification(item.key)}
                      >
                        {form.notifications[item.key] !== false ? '🔔' : '🔕'} {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pill-group">
                {WA_TASK_NOTIFY_CREATED.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`pill-toggle${form.notifications[item.key] !== false ? ' on' : ''}`}
                    onClick={() => toggleNotification(item.key)}
                  >
                    {form.notifications[item.key] !== false ? '🔔' : '🔕'} {item.emoji} {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section full">
              <div className="form-section-h">Accès annonces</div>
              <div className="access-mode-row">
                {(
                  [
                    ['all', '🌍', 'Tous (ce owner)'],
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
                    <span className="access-chip-label">Tous les listings (ce owner)</span>
                    <button
                      type="button"
                      className="access-chip-x"
                      aria-label="Retirer"
                      onClick={() => {
                        patchForm({ listingIds: [], cityIds: [] });
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
                    const name = cities.find((c) => c.id === id)?.name || id;
                    return (
                      <span key={`c-${id}`} className="access-chip">
                        <span className="access-chip-emoji">📍</span>
                        <span className="access-chip-label">{name}</span>
                        <button
                          type="button"
                          className="access-chip-x"
                          onClick={() => removeCityId(id)}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                  {selectedListingIds.map((id) => {
                    const name = listings.find((l) => l.id === id)?.name || id;
                    return (
                      <span key={`l-${id}`} className="access-chip">
                        <span className="access-chip-emoji">🏠</span>
                        <span className="access-chip-label">{name}</span>
                        <button
                          type="button"
                          className="access-chip-x"
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
                  {cities.length === 0 ? (
                    <p className="access-panel-hint">Aucune ville disponible.</p>
                  ) : (
                    cities.map((c) => (
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
                  {cities.length > 0 ? (
                    <div className="access-city-filter">
                      <button
                        type="button"
                        className={`access-city-filter-btn${!listingCityFilter ? ' on' : ''}`}
                        onClick={() => setListingCityFilter(null)}
                      >
                        Toutes
                      </button>
                      {cities.map((c) => (
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
                </div>
              ) : null}
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
              disabled={saving || deleting || !form.username.trim() || !form.whatsappPhone.trim()}
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
