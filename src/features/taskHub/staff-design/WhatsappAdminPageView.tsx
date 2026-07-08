import { useMemo, useState } from 'react';
import './staffDesign.css';
import {
  WA_ADMIN_NOTIFICATION_GROUPS,
  WA_ADMIN_TYPES,
  WA_LANGUAGES,
  WA_TASK_NOTIFY_CANCELLED,
  WA_TASK_NOTIFY_CREATED,
  cyclePermissionAccess,
  defaultAdminNotifications,
  emptyWhatsappAdmin,
  type WhatsappAdminDesign,
} from './whatsappAdminTypes';
import { initials } from './staffDesignConstants';
import StaffAccessMultiSelect from './StaffAccessMultiSelect';

type ListingOpt = { id: string; name: string };
type CityOpt = { id: string; name: string };

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

function adminAccessSummary(a: WhatsappAdminDesign, cities: CityOpt[]): string {
  if (hasAllAccess(a.listingIds)) return 'Toutes les annonces';
  if (!a.listingIds?.length && !a.cityIds?.length) return 'Toutes les annonces';
  const parts: string[] = [];
  if (hasAllAccess(a.cityIds)) {
    parts.push('Toutes les villes');
  } else if (a.cityIds?.length) {
    const names = a.cityIds
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

  const activeCount = useMemo(() => admins.filter((a) => !a.banned).length, [admins]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyWhatsappAdmin());
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
    setDrawerOpen(true);
  };

  const patchForm = (patch: Partial<WhatsappAdminDesign>) => setForm((f) => ({ ...f, ...patch }));

  const allListingsMode = hasAllAccess(form.listingIds);
  const allCitiesMode = hasAllAccess(form.cityIds);

  const toggleAllListings = () => {
    if (allListingsMode) {
      patchForm({ listingIds: [], cityIds: [] });
      return;
    }
    patchForm({ listingIds: ['All'], cityIds: ['All'] });
  };

  const toggleAllCities = () => {
    if (allListingsMode) return;
    patchForm({ cityIds: allCitiesMode ? [] : ['All'] });
  };

  const selectedCityIds = useMemo(
    () => form.cityIds.filter((id) => id !== 'All' && id !== 'ALL'),
    [form.cityIds],
  );

  const selectedListingIds = useMemo(
    () => form.listingIds.filter((id) => id !== 'All' && id !== 'ALL'),
    [form.listingIds],
  );

  const cityOptions = useMemo(
    () => cities.map((c) => ({ id: c.id, label: c.name, emoji: '📍' })),
    [cities],
  );

  const listingOptions = useMemo(
    () => listings.map((l) => ({ id: l.id, label: l.name, emoji: '🏠' })),
    [listings],
  );

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

  const setAllTaskNotify = (event: 'created' | 'cancelled', on: boolean) => {
    const items = event === 'created' ? WA_TASK_NOTIFY_CREATED : WA_TASK_NOTIFY_CANCELLED;
    const patch: Record<string, boolean> = { ...form.notifications };
    for (const item of items) {
      patch[item.key] = on;
    }
    patchForm({ notifications: patch });
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
            Opérateurs WhatsApp avec accès dashboard (réservations, tâches, messages…). Distinct du staff
            terrain — pas d&apos;assignation ménage.
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
                  <div className="role">{a.language}</div>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => openEdit(a)}>
                    ✏
                  </button>
                </div>
              </div>
              <div className="tasks">
                {a.permissions
                  .filter((p) => p.access !== 'none')
                  .map((p) => {
                    const meta = WA_ADMIN_TYPES.find((t) => t.type === p.type);
                    return (
                      <span key={p.type} className="task-chip active">
                        {meta?.menuLetter}:{permLabel(p.access)}
                      </span>
                    );
                  })}
                <span className="task-chip active">{a.language}</span>
              </div>
              <div className="meta-line">
                <span style={{ textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700 }}>
                  WhatsApp
                </span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--t)' }}>{a.whatsappPhone}</span>
              </div>
              <div className="meta-line">
                <span style={{ textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700 }}>
                  Accès
                </span>
                <span style={{ color: 'var(--t)' }}>{adminAccessSummary(a, cities)}</span>
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
            <div className="form-section">
              <div className="form-section-h">Identité</div>
              <div className="field">
                <div className="field-label">
                  Username<span className="req">*</span>
                </div>
                <input
                  className="input"
                  value={form.username}
                  onChange={(e) => patchForm({ username: e.target.value })}
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
                  placeholder="+212..."
                />
              </div>
              <div className="field">
                <div className="field-label">Langue</div>
                <div className="pill-group">
                  {WA_LANGUAGES.map((lg) => (
                    <button
                      key={lg}
                      type="button"
                      className={`pill-toggle${form.language === lg ? ' on' : ''}`}
                      onClick={() => patchForm({ language: lg })}
                    >
                      {lg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-h">Statut</div>
              <div className="admin-row">
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
              <div className="form-section-h">
                Menus WhatsApp · lettre · N → R → W
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>
                Contrôle l&apos;ouverture des flows (M messages, V avis, L leads, R résa, D arr/dép., E
                dépense/extra, T tâches). Indépendant des notifications push ci-dessous.
              </div>
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
                        next[idx] = {
                          ...p,
                          access: cyclePermissionAccess(p.access),
                        };
                        patchForm({ permissions: next });
                      }}
                    >
                      <strong>{meta?.menuLetter}</strong> · {meta?.label}{' '}
                      <span style={{ opacity: 0.85 }}>({permLabel(p.access)})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-section full">
              <div className="form-section-h">Notifications push WhatsApp</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>
                Messages automatiques reçus sur ce numéro (sans taper une lettre). Désactivé si banni.
              </div>
              {WA_ADMIN_NOTIFICATION_GROUPS.map((group) => (
                <div key={group.title} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--t2)',
                      marginBottom: 4,
                    }}
                  >
                    {group.title}
                  </div>
                  {group.hint ? (
                    <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6 }}>{group.hint}</div>
                  ) : null}
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

              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--t2)',
                    marginBottom: 4,
                  }}
                >
                  Tâches · création
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6 }}>
                  Push à la création (status new). Par défaut : OFF pour déclarer / choisir créneau /
                  enregistrement / ménage plan — ON pour transport, courses, conciergerie, etc.
                </div>
                <div className="pill-group" style={{ marginBottom: 6 }}>
                  <button type="button" className="pill-toggle" onClick={() => setAllTaskNotify('created', true)}>
                    Tout 🔔
                  </button>
                  <button type="button" className="pill-toggle" onClick={() => setAllTaskNotify('created', false)}>
                    Tout 🔕
                  </button>
                </div>
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

              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--t2)',
                    marginBottom: 4,
                  }}
                >
                  Tâches · annulation
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6 }}>
                  Push quand une tâche est annulée manuellement. Si la réservation est annulée : une
                  seule notif « Réservation annulée » (section Réservation) — pas de push par tâche
                  pour l&apos;admin ; le staff assigné reçoit quand même sa notif.
                </div>
                <div className="pill-group" style={{ marginBottom: 6 }}>
                  <button type="button" className="pill-toggle" onClick={() => setAllTaskNotify('cancelled', true)}>
                    Tout 🔔
                  </button>
                  <button type="button" className="pill-toggle" onClick={() => setAllTaskNotify('cancelled', false)}>
                    Tout 🔕
                  </button>
                </div>
                <div className="pill-group">
                  {WA_TASK_NOTIFY_CANCELLED.map((item) => (
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
            </div>

            <div className="form-section full">
              <div className="form-section-h">Accès annonces</div>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--pd)' }}>
                Par ville : les nouvelles annonces de la ville sont incluses automatiquement.
              </p>
              <button
                type="button"
                className={`access-all-chip${allListingsMode ? ' on' : ''}`}
                onClick={toggleAllListings}
              >
                <span>🌍</span>
                Toutes les annonces
              </button>
              {!allListingsMode ? (
                <>
                  <div className="form-section-h" style={{ marginTop: 4, marginBottom: 6 }}>
                    Villes autorisées
                  </div>
                  <button
                    type="button"
                    className={`access-all-chip${allCitiesMode ? ' on' : ''}`}
                    style={{ marginBottom: 8 }}
                    onClick={toggleAllCities}
                  >
                    Toutes les villes
                  </button>
                  {allCitiesMode ? (
                    <div className="access-selected-chips" style={{ marginBottom: 12 }}>
                      <span className="access-chip">
                        <span className="access-chip-emoji">📍</span>
                        <span className="access-chip-label">Toutes les villes</span>
                        <button
                          type="button"
                          className="access-chip-x"
                          aria-label="Retirer toutes les villes"
                          onClick={toggleAllCities}
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  ) : (
                    <StaffAccessMultiSelect
                      options={cityOptions}
                      selectedIds={selectedCityIds}
                      onChange={(ids) => patchForm({ cityIds: ids })}
                      placeholder="Aucune ville — ajoutez Casablanca, Rabat…"
                      searchPlaceholder="Rechercher une ville…"
                      addLabel="+ Ajouter des villes"
                      emptyLabel="Aucune ville trouvée"
                    />
                  )}
                  <div className="form-section-h" style={{ marginTop: 14, marginBottom: 6 }}>
                    Annonces spécifiques (optionnel)
                  </div>
                  <StaffAccessMultiSelect
                    options={listingOptions}
                    selectedIds={selectedListingIds}
                    onChange={(ids) => patchForm({ listingIds: ids })}
                    disabled={!listings.length}
                    placeholder="Aucune annonce spécifique"
                    searchPlaceholder="Rechercher une annonce…"
                    addLabel="+ Ajouter des annonces"
                    emptyLabel="Aucune annonce trouvée"
                  />
                </>
              ) : (
                <div className="access-selected-chips">
                  <span className="access-chip">
                    <span className="access-chip-emoji">🌍</span>
                    <span className="access-chip-label">Toutes les annonces</span>
                    <button
                      type="button"
                      className="access-chip-x"
                      aria-label="Retirer accès total"
                      onClick={toggleAllListings}
                    >
                      ✕
                    </button>
                  </span>
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
            <button type="button" className="btn btn-ghost" disabled={deleting} onClick={() => setDrawerOpen(false)}>
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
