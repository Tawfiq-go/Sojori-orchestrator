import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  partnersApi,
  type Partner,
  type PartnerService,
  type PartnerServiceFormule,
  type PartnerServicePayment,
  type PartnerServiceSchedule,
  type PaymentMethod,
  DEFAULT_SCHEDULE,
  DEFAULT_PAYMENT,
} from '../services/partnersApi';
import { postFormDataAsMultipart } from '../utils/upload/postFormData';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import { listingsService } from '../services/listingsService';
import CityAssociationField from '../features/listing/components/ConfigOrchestration/CityAssociationField';
import './partnersAdmin.css';

type Draft = {
  category: string;
  title: string;
  description: string;
  whatsapp: string;
  cityIds: 'all' | string[];
  photos: string[];
  formules: PartnerServiceFormule[];
  schedule: PartnerServiceSchedule;
  payment: PartnerServicePayment;
  active: boolean;
  sortOrder: number;
};

const CATS = [
  { v: 'Aventure', l: 'Aventure' },
  { v: 'Excursion', l: 'Excursion' },
  { v: 'Vue d’en haut', l: 'Vue d’en haut' },
  { v: 'Culture & nature', l: 'Culture & nature' },
  { v: 'Mobilité', l: 'Mobilité' },
  { v: 'Soirée', l: 'Soirée' },
];

const PAY_METHODS: { v: PaymentMethod; l: string }[] = [
  { v: 'card', l: 'Carte' },
  { v: 'cash', l: 'Cash' },
  { v: 'transfer', l: 'Virement' },
];

const inpBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 'var(--pa-r)',
  border: '1px solid var(--pa-line)',
  background: 'var(--pa-surface)',
  fontSize: 14,
};

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '10px 17px',
  borderRadius: 999,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
};

function btnGold(extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...btnBase,
    background: 'var(--pa-gold)',
    color: '#2C2005',
    border: '1px solid var(--pa-gold)',
    ...extra,
  };
}
function btnOutline(extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...btnBase,
    background: 'var(--pa-surface)',
    color: 'var(--pa-ink)',
    border: '1px solid var(--pa-line)',
    ...extra,
  };
}
function btnDanger(extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...btnBase,
    background: 'transparent',
    color: 'var(--pa-danger)',
    border: '1px solid var(--pa-line)',
    ...extra,
  };
}

function money(n: number) {
  return Number(n || 0)
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, ' ');
}

function emptyDraft(): Draft {
  return {
    category: 'Aventure',
    title: '',
    description: '',
    whatsapp: '',
    cityIds: 'all',
    photos: [],
    formules: [{ label: '', priceMad: 0 }],
    schedule: { ...DEFAULT_SCHEDULE },
    payment: { ...DEFAULT_PAYMENT, methods: [...DEFAULT_PAYMENT.methods] },
    active: true,
    sortOrder: 0,
  };
}

function toDraft(s: PartnerService): Draft {
  const formules =
    Array.isArray(s.formules) && s.formules.length
      ? s.formules.map((f) => ({ label: f.label || '', priceMad: Number(f.priceMad) || 0 }))
      : [{ label: '', priceMad: 0 }];
  const pay = s.payment || DEFAULT_PAYMENT;
  return {
    category: s.category || 'Aventure',
    title: s.title || '',
    description: s.description || '',
    whatsapp: s.whatsapp || '',
    cityIds: s.cityIds === undefined || s.cityIds === null ? 'all' : s.cityIds,
    photos: Array.isArray(s.photos) ? s.photos.slice(0, 3) : [],
    formules,
    schedule: { ...DEFAULT_SCHEDULE, ...(s.schedule || {}) },
    payment: {
      methods: Array.isArray(pay.methods) && pay.methods.length ? [...pay.methods] : ['cash'],
      collection: pay.collection === 'deposit' ? 'deposit' : 'full',
      depositPercent: pay.depositPercent ?? null,
    },
    active: s.active !== false,
    sortOrder: s.sortOrder || 0,
  };
}

/** Clé provider (fiche Partner liée à l’owner de l’expérience). */
function experienceProviderKey(s: PartnerService): string {
  if (s.providerId) return String(s.providerId);
  if (s.partnerId) return String(s.partnerId);
  if (s.ownerId) return `owner:${String(s.ownerId)}`;
  return 'owner';
}

function experienceProviderLabel(
  s: PartnerService,
  partnersByOwner: Map<string, string>,
): string {
  if (s.providerName) return String(s.providerName);
  if (s.partnerId) return 'Sojori';
  if (s.ownerId) {
    return partnersByOwner.get(String(s.ownerId)) || 'Mes expériences';
  }
  return 'Mes expériences';
}

export function OwnerExperiencesPage() {
  const [rows, setRows] = useState<PartnerService[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [cities, setCities] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [q, setQ] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, partnersList, citiesRes] = await Promise.all([
        partnersApi.listExperiences(),
        partnersApi.list({ includePlatform: false }).catch(() => [] as Partner[]),
        listingsService.getCities({ limit: 200 }).catch(() => null),
      ]);
      setRows(list);
      setPartners(Array.isArray(partnersList) ? partnersList : []);
      const cityList = (citiesRes?.data?.cities ?? citiesRes?.data ?? citiesRes ?? []) as Array<{
        _id: string;
        name: string;
      }>;
      setCities(Array.isArray(cityList) ? cityList.filter((c) => c._id && c.name) : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement expériences impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const partnersByOwner = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of partners) {
      if (!p.ownerId || !p.name) continue;
      const oid = String(p.ownerId);
      if (!map.has(oid) || p.active !== false) {
        map.set(oid, p.name);
      }
    }
    return map;
  }, [partners]);

  const providers = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const id = experienceProviderKey(r);
      const name = experienceProviderLabel(r, partnersByOwner);
      map.set(id, name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [rows, partnersByOwner]);

  useEffect(() => {
    if (providerFilter === 'all') return;
    if (providers.some((p) => p.id === providerFilter)) return;
    setProviderFilter('all');
  }, [providers, providerFilter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const pid = experienceProviderKey(r);
      if (providerFilter !== 'all' && pid !== providerFilter) return false;
      if (!needle) return true;
      const provider = experienceProviderLabel(r, partnersByOwner);
      return (
        r.title.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle) ||
        (r.description || '').toLowerCase().includes(needle) ||
        provider.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, providerFilter, partnersByOwner]);

  const cityName = useCallback(
    (id: string) => cities.find((c) => c._id === id)?.name || id,
    [cities],
  );

  /** Groupement Ensoconnect-style : par ville (all en premier). */
  const groupedByCity = useMemo(() => {
    const buckets = new Map<string, PartnerService[]>();
    for (const s of filtered) {
      const ids =
        s.cityIds === 'all' || s.cityIds === undefined || s.cityIds === null
          ? ['all']
          : Array.isArray(s.cityIds) && s.cityIds.length
            ? s.cityIds.map(String)
            : ['all'];
      for (const cid of ids) {
        const list = buckets.get(cid) || [];
        list.push(s);
        buckets.set(cid, list);
      }
    }
    const keys = Array.from(buckets.keys()).sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      return cityName(a).localeCompare(cityName(b), 'fr');
    });
    return keys.map((key) => ({
      key,
      label: key === 'all' ? 'Toutes les villes' : cityName(key),
      items: buckets.get(key) || [],
    }));
  }, [filtered, cityName]);

  const openNew = () => {
    setIsNew(true);
    setSelectedId(null);
    setDraft(emptyDraft());
  };

  const openEdit = (s: PartnerService) => {
    setIsNew(false);
    setSelectedId(s.id);
    setDraft(toDraft(s));
  };

  const closeEditor = () => {
    setIsNew(false);
    setSelectedId(null);
    setDraft(emptyDraft());
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.category.trim()) {
      toast.error('Titre et catégorie requis');
      return;
    }
    const formules = draft.formules
      .map((f) => ({ label: f.label.trim(), priceMad: Number(f.priceMad) || 0 }))
      .filter((f) => f.label);
    if (!formules.length) {
      toast.error('Au moins une formule');
      return;
    }
    if (!draft.payment.methods.length) {
      toast.error('Choisissez au moins un mode de paiement');
      return;
    }
    const needsRemote = draft.payment.methods.some((m) => m === 'card' || m === 'transfer');
    const payment: PartnerServicePayment = {
      methods: draft.payment.methods,
      collection: needsRemote && draft.payment.collection === 'deposit' ? 'deposit' : 'full',
      depositPercent:
        needsRemote && draft.payment.collection === 'deposit'
          ? Number(draft.payment.depositPercent) || 30
          : null,
    };
    const body = {
      category: draft.category.trim(),
      title: draft.title.trim(),
      description: draft.description,
      whatsapp: draft.whatsapp.trim(),
      cityIds: draft.cityIds,
      photos: draft.photos.slice(0, 3),
      formules,
      schedule: draft.schedule,
      payment,
      active: draft.active,
      sortOrder: draft.sortOrder,
    };
    setSaving(true);
    try {
      if (isNew) {
        const created = await partnersApi.createExperience(body);
        toast.success('Expérience créée');
        await load();
        openEdit(created);
      } else if (selectedId) {
        await partnersApi.updateExperience(selectedId, body);
        toast.success('Enregistré');
        await load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedId || isNew) return;
    if (!window.confirm('Supprimer cette expérience ?')) return;
    setSaving(true);
    try {
      await partnersApi.removeExperience(selectedId);
      toast.success('Supprimée');
      closeEditor();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const slots = 3 - draft.photos.length;
    if (slots <= 0) {
      toast.info('Maximum 3 photos');
      return;
    }
    const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const allowedExt = /\.(jpe?g|png|webp)$/i;
    const maxBytes = 1 * 1024 * 1024; // 1 Mo — idéal WhatsApp flow
    const picked = Array.from(files).slice(0, slots);
    const valid: File[] = [];
    for (const file of picked) {
      const mimeOk = allowedMime.has(file.type) || (!file.type && allowedExt.test(file.name));
      const extOk = allowedExt.test(file.name) || allowedMime.has(file.type);
      if (!mimeOk || !extOk) {
        toast.error(`${file.name} : formats acceptés JPEG, PNG ou WebP`);
        continue;
      }
      if (file.size > maxBytes) {
        toast.error(`${file.name} : max 1 Mo`);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;
    try {
      const formData = new FormData();
      valid.forEach((file) => formData.append('media', file));
      formData.append('type', 'partner-services');
      formData.append('name', `experience-${Date.now()}`);
      const { data } = await postFormDataAsMultipart(
        MICROSERVICE_BASE_URL.UPLOAD_IMAGE_MULTIPLE,
        formData,
      );
      const urls = (Array.isArray(data?.files) ? data.files : [])
        .map((f: { url?: string }) => f?.url)
        .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0);
      if (!urls.length) throw new Error('Aucune URL renvoyée');
      setDraft((d) => ({ ...d, photos: [...d.photos, ...urls].slice(0, 3) }));
      toast.success(`${urls.length} photo(s) uploadée(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload impossible');
    }
  };

  const toggleMethod = (m: PaymentMethod) => {
    setDraft((d) => {
      const has = d.payment.methods.includes(m);
      const methods = has ? d.payment.methods.filter((x) => x !== m) : [...d.payment.methods, m];
      return { ...d, payment: { ...d.payment, methods: methods.length ? methods : ['cash'] } };
    });
  };

  const showEditor = isNew || !!selectedId;
  const needsRemotePay = draft.payment.methods.some((m) => m === 'card' || m === 'transfer');

  return (
    <div className="pa-root" style={{ height: 'auto', minHeight: 'calc(100vh - 56px)', padding: '20px 24px 48px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <div className="pa-lbl">Catalogue global</div>
          <h1 className="pa-d" style={{ margin: '6px 0 8px', fontSize: 32 }}>
            Expériences
          </h1>
          <p style={{ margin: 0, color: 'var(--pa-ink3)', fontSize: 14, maxWidth: 560 }}>
            Catalogue par ville (comme Ensoconnect). Les listings ne créent pas d’activités —
            ils cochent celles à activer (Expériences PM ou Expériences Sojori).
          </p>
        </div>
        <button type="button" style={btnGold()} onClick={openNew}>
          + Nouvelle expérience
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showEditor ? '340px 1fr' : '1fr', gap: 20 }}>
        <div>
          {groupedByCity.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {groupedByCity.map((group) => (
                <button
                  key={`chip-${group.key}`}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`exp-city-${group.key}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    ...btnOutline({ padding: '6px 12px', fontSize: 12 }),
                  }}
                >
                  {group.label}
                  <span style={{ color: 'var(--pa-ink4)', marginLeft: 6 }}>{group.items.length}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: providers.length > 0 ? 'minmax(160px, 1fr) 1.4fr' : '1fr',
              gap: 10,
              marginBottom: 12,
            }}
          >
            {providers.length > 0 ? (
              <select
                className="pa-in"
                style={inpBase}
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                aria-label="Filtrer par provider"
              >
                <option value="all">Tous les providers</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              className="pa-in"
              style={inpBase}
              placeholder="Rechercher… (titre, catégorie, provider)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {loading ? (
            <div style={{ color: 'var(--pa-ink3)', padding: 12 }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: 24,
                borderRadius: 'var(--pa-r-lg)',
                border: '1px dashed var(--pa-line)',
                color: 'var(--pa-ink3)',
                background: 'var(--pa-surface)',
              }}
            >
              {rows.length === 0
                ? 'Aucune expérience. Créez la première.'
                : 'Aucun résultat pour ces filtres.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {providerFilter !== 'all' || q.trim() ? (
                <div style={{ fontSize: 12, color: 'var(--pa-ink3)', marginTop: -4 }}>
                  {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                  {rows.length !== filtered.length ? ` · sur ${rows.length}` : ''}
                </div>
              ) : null}
              {groupedByCity.map((group) => (
                <div key={group.key} id={`exp-city-${group.key}`}>
                  <div
                    className="pa-lbl"
                    style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>{group.label}</span>
                    <span style={{ color: 'var(--pa-ink4)' }}>{group.items.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map((s) => {
                      const prices = (s.formules || []).map((f) => Number(f.priceMad) || 0);
                      const min = prices.length ? Math.min(...prices) : 0;
                      const active = selectedId === s.id && !isNew;
                      const provider = experienceProviderLabel(s, partnersByOwner);
                      return (
                        <div
                          key={`${group.key}-${s.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'stretch',
                            gap: 8,
                            borderRadius: 'var(--pa-r-lg)',
                            border: `1px solid ${active ? 'var(--pa-gold)' : 'var(--pa-line)'}`,
                            background: active ? 'var(--pa-gold-wash)' : 'var(--pa-surface)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            style={{
                              flex: 1,
                              textAlign: 'left',
                              padding: '14px 16px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--pa-ink3)', marginTop: 4 }}>
                              <span style={{ fontWeight: 700, color: 'var(--pa-ink2)' }}>{provider}</span>
                              {` · ${s.category}`}
                              {min > 0 ? ` · dès ${money(min)} MAD` : ''}
                              {!s.active ? ' · inactif' : ''}
                            </div>
                          </button>
                          <button
                            type="button"
                            title="Supprimer"
                            disabled={saving}
                            onClick={(e) => {
                              e.stopPropagation();
                              void (async () => {
                                if (!window.confirm(`Supprimer « ${s.title} » ?`)) return;
                                setSaving(true);
                                try {
                                  await partnersApi.removeExperience(s.id);
                                  toast.success('Supprimée');
                                  if (selectedId === s.id) closeEditor();
                                  await load();
                                } catch (err) {
                                  toast.error(
                                    err instanceof Error ? err.message : 'Suppression impossible',
                                  );
                                } finally {
                                  setSaving(false);
                                }
                              })();
                            }}
                            style={{
                              ...btnDanger({ padding: '8px 12px', alignSelf: 'center', marginRight: 8 }),
                              fontSize: 12,
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showEditor ? (
          <div
            style={{
              padding: 22,
              borderRadius: 'var(--pa-r-lg)',
              border: '1px solid var(--pa-line)',
              background: 'var(--pa-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <div className="pa-lbl">{isNew ? 'Création' : 'Édition'}</div>
                <h2 className="pa-d" style={{ margin: '4px 0 0', fontSize: 26 }}>
                  {isNew ? 'Nouvelle expérience' : draft.title || 'Sans titre'}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={btnOutline()} onClick={closeEditor}>
                  Fermer
                </button>
                <button type="button" style={btnGold()} disabled={saving} onClick={() => void save()}>
                  {isNew ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </div>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Présentation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, marginTop: 8 }}>
                <input
                  className="pa-in"
                  style={inpBase}
                  placeholder="Titre"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
                <select
                  className="pa-in"
                  style={inpBase}
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                >
                  {CATS.map((c) => (
                    <option key={c.v} value={c.v}>
                      {c.l}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="pa-in"
                style={{ ...inpBase, marginTop: 12, minHeight: 88 }}
                placeholder="Description"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
              <input
                className="pa-in"
                style={{ ...inpBase, marginTop: 12 }}
                placeholder="WhatsApp E.164 (optionnel)"
                value={draft.whatsapp}
                onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))}
              />
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Villes</div>
              <div style={{ maxWidth: 480, marginTop: 8 }}>
                <CityAssociationField
                  value={draft.cityIds}
                  onChange={(next) => setDraft((d) => ({ ...d, cityIds: next }))}
                />
              </div>
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Photos (max 3)</div>
              <p style={{ margin: '6px 0 8px', fontSize: 12, color: 'var(--pa-ink3)' }}>
                JPEG, PNG ou WebP · max 1 Mo · idéal 1200×628
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {draft.photos.map((url) => (
                  <div key={url} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt=""
                      style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <button
                      type="button"
                      style={btnOutline({
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        padding: '2px 6px',
                        fontSize: 11,
                      })}
                      onClick={() => setDraft((d) => ({ ...d, photos: d.photos.filter((p) => p !== url) }))}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {draft.photos.length < 3 ? (
                  <label style={{ ...btnOutline(), cursor: 'pointer' }}>
                    + Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      multiple
                      hidden
                      onChange={(e) => {
                        void uploadPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Formules</div>
              {draft.formules.map((f, i) => (
                <div
                  key={i}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 120px 36px', gap: 8, marginTop: 8 }}
                >
                  <input
                    className="pa-in"
                    style={inpBase}
                    placeholder="Label"
                    value={f.label}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        formules: d.formules.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                      }))
                    }
                  />
                  <input
                    className="pa-in"
                    style={inpBase}
                    type="number"
                    placeholder="MAD"
                    value={f.priceMad}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        formules: d.formules.map((x, j) =>
                          j === i ? { ...x, priceMad: Number(e.target.value) || 0 } : x,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    style={btnOutline({ padding: '8px' })}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        formules: d.formules.length > 1 ? d.formules.filter((_, j) => j !== i) : d.formules,
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                style={btnOutline({ marginTop: 10 })}
                onClick={() => setDraft((d) => ({ ...d, formules: [...d.formules, { label: '', priceMad: 0 }] }))}
              >
                + Formule
              </button>
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Paiement</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {PAY_METHODS.map((m) => {
                  const on = draft.payment.methods.includes(m.v);
                  return (
                    <button
                      key={m.v}
                      type="button"
                      style={on ? btnGold({ padding: '7px 13px', fontSize: 12.5 }) : btnOutline({ padding: '7px 13px', fontSize: 12.5 })}
                      onClick={() => toggleMethod(m.v)}
                    >
                      {m.l}
                    </button>
                  );
                })}
              </div>
              {needsRemotePay ? (
                <div
                  style={{
                    marginTop: 14,
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px',
                    gap: 12,
                    maxWidth: 420,
                  }}
                >
                  <select
                    className="pa-in"
                    style={inpBase}
                    value={draft.payment.collection}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        payment: {
                          ...d.payment,
                          collection: e.target.value === 'deposit' ? 'deposit' : 'full',
                        },
                      }))
                    }
                  >
                    <option value="full">Total</option>
                    <option value="deposit">Acompte %</option>
                  </select>
                  {draft.payment.collection === 'deposit' ? (
                    <input
                      className="pa-in"
                      style={inpBase}
                      type="number"
                      min={1}
                      max={100}
                      placeholder="% acompte"
                      value={draft.payment.depositPercent ?? 30}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          payment: { ...d.payment, depositPercent: Number(e.target.value) || 30 },
                        }))
                      }
                    />
                  ) : (
                    <div />
                  )}
                </div>
              ) : (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--pa-ink3)' }}>
                  Cash seul → règlement sur place (pas d’acompte).
                </p>
              )}
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Planning</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <select
                  className="pa-in"
                  style={inpBase}
                  value={draft.schedule.dateMode}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      schedule: { ...d.schedule, dateMode: e.target.value as 'from' | 'sure' },
                    }))
                  }
                >
                  <option value="from">Date à partir de</option>
                  <option value="sure">Date sure</option>
                </select>
                <select
                  className="pa-in"
                  style={inpBase}
                  value={draft.schedule.timeMode}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      schedule: {
                        ...d.schedule,
                        timeMode: e.target.value as 'window' | 'slots' | 'fixed',
                      },
                    }))
                  }
                >
                  <option value="window">Plage horaire</option>
                  <option value="slots">Créneaux</option>
                  <option value="fixed">Heure fixe</option>
                </select>
                <input
                  className="pa-in"
                  style={inpBase}
                  type="time"
                  value={draft.schedule.windowStart || '09:00'}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, schedule: { ...d.schedule, windowStart: e.target.value } }))
                  }
                />
                <input
                  className="pa-in"
                  style={inpBase}
                  type="time"
                  value={draft.schedule.windowEnd || '18:00'}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, schedule: { ...d.schedule, windowEnd: e.target.value } }))
                  }
                />
              </div>
              <textarea
                className="pa-in"
                style={{ ...inpBase, marginTop: 12, minHeight: 56 }}
                placeholder="Note planning (optionnel)"
                value={draft.schedule.note || ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, schedule: { ...d.schedule, note: e.target.value } }))
                }
              />
            </section>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              <span>Active (visible WhatsApp)</span>
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" style={btnGold()} disabled={saving} onClick={() => void save()}>
                {isNew ? 'Créer' : 'Enregistrer'}
              </button>
              {!isNew && selectedId ? (
                <button type="button" style={btnDanger()} disabled={saving} onClick={() => void remove()}>
                  Supprimer
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OwnerExperiencesPage;
