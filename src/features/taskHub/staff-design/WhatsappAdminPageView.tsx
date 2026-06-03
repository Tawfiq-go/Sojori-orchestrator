import { useMemo, useState } from 'react';
import './staffDesign.css';
import {
  WA_ADMIN_TYPES,
  WA_LANGUAGES,
  cyclePermissionAccess,
  emptyWhatsappAdmin,
  type WhatsappAdminDesign,
} from './whatsappAdminTypes';
import { initials } from './staffDesignConstants';

type ListingOpt = { id: string; name: string };

type Props = {
  admins: WhatsappAdminDesign[];
  listings: ListingOpt[];
  loading?: boolean;
  onSave: (form: WhatsappAdminDesign, editingId: string | null) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export default function WhatsappAdminPageView({
  admins,
  listings,
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
    setForm({ ...a, permissions: a.permissions.map((p) => ({ ...p })), listingIds: [...a.listingIds] });
    setDrawerOpen(true);
  };

  const patchForm = (patch: Partial<WhatsappAdminDesign>) => setForm((f) => ({ ...f, ...patch }));

  const toggleListing = (id: string) => {
    if (!id) return;
    const sid = String(id);
    const next = form.listingIds.filter((x) => x !== 'All' && x !== 'ALL');
    const set = new Set(next.map(String));
    if (set.has(sid)) set.delete(sid);
    else set.add(sid);
    patchForm({ listingIds: [...set] });
  };

  const hasAllListings = form.listingIds.some((x) => x === 'All' || x === 'ALL');

  const toggleAllListings = () => {
    patchForm({ listingIds: hasAllListings ? [] : ['All'] });
  };

  const isListingSelected = (id: string) => {
    if (hasAllListings) return false;
    return form.listingIds.some((x) => String(x) === String(id));
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
                        {meta?.abbr}:{permLabel(p.access)}
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
              <div className="form-section-h">Permissions · clic pour N → R → W</div>
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
                      {meta?.abbr}:{permLabel(p.access)} {meta?.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-section full">
              <div className="form-section-h">Annonces · multi-sélection</div>
              <div className="pill-group">
                <button
                  type="button"
                  className={`pill-toggle${hasAllListings ? ' on' : ''}`}
                  onClick={toggleAllListings}
                >
                  🌐 Toutes les annonces
                </button>
                {listings.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--t3)', padding: '6px 4px' }}>
                    Aucune annonce disponible
                  </span>
                ) : (
                  listings.map((l, idx) => (
                    <button
                      key={l.id || `listing-${idx}`}
                      type="button"
                      disabled={hasAllListings}
                      className={`pill-toggle${isListingSelected(l.id) ? ' on' : ''}`}
                      style={hasAllListings ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                      onClick={() => toggleListing(l.id)}
                    >
                      🏠 {l.name}
                    </button>
                  ))
                )}
              </div>
              {hasAllListings ? (
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
                  Désactivez « Toutes » pour choisir des annonces précises.
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
