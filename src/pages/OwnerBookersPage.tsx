import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import TeamOwnerScopeBar from '../features/taskHub/staff-design/TeamOwnerScopeBar';
import { useAuth } from '../hooks/useAuth';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { useAdminScopeFetchReady } from '../hooks/useAdminScopeFetchReady';
import { resolveTasksUserScope } from '../services/fulltaskTasksService';
import * as fulltaskApi from '../services/fulltaskApi';
import listingsService from '../services/listingsService';
import { normalizeOwnerId } from '../utils/fulltaskMappers';
import { initials } from '../features/taskHub/staff-design/staffDesignConstants';
import '../features/taskHub/staff-design/staffDesign.css';
import '../pages/tasksTeamPage.css';

type OwnerBooker = {
  _id: string;
  name: string;
  whatsappPhone: string;
  language: string;
  listingIds: string[];
  enabled: boolean;
  banned?: boolean;
  modelTier: 'standard' | 'premium';
  notes?: string;
};

type ListingOpt = { id: string; name: string };

const LANGS = [
  { id: 'darija', label: 'Darija' },
  { id: 'fr', label: 'FR' },
  { id: 'ar', label: 'AR' },
  { id: 'en', label: 'EN' },
  { id: 'es', label: 'ES' },
  { id: 'it', label: 'IT' },
] as const;

function emptyForm(): Omit<OwnerBooker, '_id'> {
  return {
    name: '',
    whatsappPhone: '',
    language: 'darija',
    listingIds: [],
    enabled: true,
    modelTier: 'premium',
    notes: '',
  };
}

function formatPhone(raw: string): string {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('00') ? d.slice(2) : d.replace(/^\+/, '');
}

export default function OwnerBookersPage() {
  const { user } = useAuth();
  const { requestOwnerId, showOwnerFilter } = useAdminOwnerFilter();
  const scopeFetchReady = useAdminScopeFetchReady();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);

  const filterOwnerId = useMemo(
    () =>
      normalizeOwnerId(requestOwnerId) ||
      (scope.canAccessAllOwners ? undefined : normalizeOwnerId(scope.ownerId)) ||
      undefined,
    [requestOwnerId, scope],
  );

  const [bookers, setBookers] = useState<OwnerBooker[]>([]);
  const [listings, setListings] = useState<ListingOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!scopeFetchReady) return;
    if (showOwnerFilter && !filterOwnerId) {
      setBookers([]);
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filterOwnerId) params.ownerId = filterOwnerId;
      const [bookersRes, listingsRes] = await Promise.all([
        fulltaskApi.listOwnerBookers(params),
        listingsService.getListings({
          limit: 500,
          compact: true,
          ...(filterOwnerId ? { ownerId: filterOwnerId } : {}),
        }),
      ]);
      const rows = (bookersRes?.data || bookersRes || []) as OwnerBooker[];
      setBookers(Array.isArray(rows) ? rows.filter((b) => !b.banned) : []);
      const payload = listingsRes as {
        success?: boolean;
        data?: { items?: Array<{ _id?: string; id?: string; name?: string }> };
      };
      const items = payload?.data?.items || [];
      setListings(
        items
          .map((l) => ({
            id: String(l._id || l.id || ''),
            name: String(l.name || 'Listing'),
          }))
          .filter((l) => l.id),
      );
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger Resa Proprio');
    } finally {
      setLoading(false);
    }
  }, [filterOwnerId, scopeFetchReady, showOwnerFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDrawerOpen(true);
  };

  const openEdit = (b: OwnerBooker) => {
    setEditingId(b._id);
    setForm({
      name: b.name,
      whatsappPhone: b.whatsappPhone,
      language: b.language || 'darija',
      listingIds: [...(b.listingIds || []).map(String)],
      enabled: b.enabled !== false,
      modelTier: b.modelTier === 'standard' ? 'standard' : 'premium',
      notes: b.notes || '',
    });
    setDrawerOpen(true);
  };

  const toggleListing = (id: string) => {
    setForm((f) => {
      const has = f.listingIds.includes(id);
      return {
        ...f,
        listingIds: has ? f.listingIds.filter((x) => x !== id) : [...f.listingIds, id],
      };
    });
  };

  const onSave = async () => {
    const phone = formatPhone(form.whatsappPhone);
    if (!form.name.trim()) {
      toast.error('Nom requis');
      return;
    }
    if (phone.length < 8) {
      toast.error('Numéro WhatsApp invalide');
      return;
    }
    if (!form.listingIds.length) {
      toast.error('Sélectionnez au moins un bien');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        whatsappPhone: phone,
        language: form.language,
        listingIds: form.listingIds,
        enabled: form.enabled,
        modelTier: form.modelTier,
        notes: form.notes || '',
        ...(filterOwnerId ? { ownerId: filterOwnerId } : {}),
      };
      if (editingId) {
        await fulltaskApi.updateOwnerBooker(editingId, body);
        toast.success('Booker mis à jour');
      } else {
        await fulltaskApi.createOwnerBooker(body);
        toast.success('Booker ajouté');
      }
      setDrawerOpen(false);
      await load();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error || '')
          : '';
      toast.error(msg || 'Échec enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Retirer ce numéro de l’allowlist ?')) return;
    try {
      await fulltaskApi.deleteOwnerBooker(id);
      toast.success('Booker retiré');
      await load();
    } catch {
      toast.error('Échec suppression');
    }
  };

  const activeCount = useMemo(() => bookers.filter((b) => b.enabled !== false).length, [bookers]);

  return (
    <DashboardWrapper>
      <AdminOwnerScopeLayout>
        <div className="so-staff-root">
          {showOwnerFilter ? <TeamOwnerScopeBar /> : null}

          <div className="section-hero">
            <div className="em">🔑</div>
            <div>
              <h2>
                Resa Proprio <span className="badge">N° RÉSERVATION</span>
              </h2>
              <div className="sub">
                Allowlist pour le <b>numéro Réservation</b> (+212 669-742611) — voix / texte /
                cash. <b>Pas</b> le numéro Staff. Les bookers écrivent sur la ligne résa client.
              </div>
            </div>
          </div>

          <div className="list-h">
            <div>
              Bookers · <span className="ct">{activeCount} actifs</span>
            </div>
            <button type="button" className="btn primary" onClick={openCreate}>
              + Ajouter
            </button>
          </div>

          {loading ? (
            <div className="sub" style={{ padding: 24 }}>
              Chargement…
            </div>
          ) : (
            <div className="staff-grid">
              {bookers.map((b) => {
                const listingNames = (b.listingIds || [])
                  .map((id) => listings.find((l) => l.id === String(id))?.name || String(id).slice(-4))
                  .slice(0, 2);
                return (
                  <div
                    key={b._id}
                    className={`staff-card${b.enabled ? ' on' : ' off'}`}
                    onClick={() => openEdit(b)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openEdit(b);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="row1">
                      <div className="av">
                        {initials(b.name)}
                        <span className={`dot ${b.enabled ? 'green' : 'red'}`} />
                      </div>
                      <div>
                        <div className="nm">
                          {b.name}{' '}
                          <span className="admin">{b.enabled ? 'CAN BOOK' : 'OFF'}</span>
                        </div>
                        <div className="role">
                          +{b.whatsappPhone} · {b.language} · {b.modelTier}
                        </div>
                      </div>
                      <div className="actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Retirer"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDelete(b._id);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="meta-line">
                      {listingNames.length
                        ? `${listingNames.join(' · ')}${(b.listingIds || []).length > 2 ? '…' : ''}`
                        : `${(b.listingIds || []).length} bien(s)`}
                    </div>
                  </div>
                );
              })}
              <button type="button" className="add-staff-card" onClick={openCreate}>
                + Nouveau booker
              </button>
            </div>
          )}

          {drawerOpen ? (
            <div className="drawer">
              <div className="drawer-h">
                <h3>{editingId ? 'Modifier le booker' : 'Nouveau booker'}</h3>
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
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Proprio NOMMOS"
                      />
                    </div>
                    <div className="field">
                      <div className="field-label">
                        WhatsApp<span className="req">*</span>
                      </div>
                      <input
                        className="input"
                        value={form.whatsappPhone}
                        onChange={(e) => setForm((f) => ({ ...f, whatsappPhone: e.target.value }))}
                        placeholder="2126…"
                      />
                    </div>
                    <div className="field">
                      <div className="field-label">Langue</div>
                      <div className="pill-group">
                        {LANGS.map((lg) => (
                          <button
                            key={lg.id}
                            type="button"
                            className={`pill-toggle${form.language === lg.id ? ' on' : ''}`}
                            onClick={() => setForm((f) => ({ ...f, language: lg.id }))}
                          >
                            {lg.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section full">
                  <div className="form-section-h">Droits</div>
                  <div className="field-row field-row--2">
                    <div className="field">
                      <div className="field-label">Modèle IA</div>
                      <div className="pill-group">
                        <button
                          type="button"
                          className={`pill-toggle${form.modelTier === 'premium' ? ' on' : ''}`}
                          onClick={() => setForm((f) => ({ ...f, modelTier: 'premium' }))}
                        >
                          Premium
                        </button>
                        <button
                          type="button"
                          className={`pill-toggle${form.modelTier === 'standard' ? ' on' : ''}`}
                          onClick={() => setForm((f) => ({ ...f, modelTier: 'standard' }))}
                        >
                          Standard
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <div className="field-label">Statut</div>
                      <label className="admin-row" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.enabled}
                          onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                        />
                        <div>
                          <div className="nm">Autorisé à réserver</div>
                          <div className="ds">écrit / parle sur le n° Réservation (+212 669-742611)</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-section full">
                  <div className="form-section-h">
                    Biens autorisés · {form.listingIds.length} sélectionné(s)
                  </div>
                  <div className="pill-group" style={{ flexWrap: 'wrap' }}>
                    {listings.map((l) => {
                      const on = form.listingIds.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          type="button"
                          className={`pill-toggle${on ? ' on' : ''}`}
                          onClick={() => toggleListing(l.id)}
                        >
                          {l.name}
                        </button>
                      );
                    })}
                    {!listings.length ? (
                      <div className="ds">Aucun listing dans le scope — choisissez un owner.</div>
                    ) : null}
                  </div>
                </div>

                <div className="form-section full">
                  <div className="form-section-h">Notes</div>
                  <textarea
                    className="input"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <div className="form-section full" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn" onClick={() => setDrawerOpen(false)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={saving}
                    onClick={() => void onSave()}
                  >
                    {saving ? '…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </AdminOwnerScopeLayout>
    </DashboardWrapper>
  );
}
