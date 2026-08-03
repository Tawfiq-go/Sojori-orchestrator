import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  partnersApi,
  type CommissionType,
  type Partner,
} from '../services/partnersApi';
import CityAssociationField from '../features/listing/components/ConfigOrchestration/CityAssociationField';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import './partnersAdmin.css';

type Draft = {
  name: string;
  email: string;
  whatsapp: string;
  cityIds: 'all' | string[];
  commissionType: CommissionType;
  commissionPercent: number;
  commissionFixedMad: number;
  notes: string;
  active: boolean;
};

type FicheTab = 'own' | 'market';

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

function emptyDraft(): Draft {
  return {
    name: '',
    email: '',
    whatsapp: '',
    cityIds: 'all',
    commissionType: 'percent',
    commissionPercent: 15,
    commissionFixedMad: 0,
    notes: '',
    active: true,
  };
}

function toDraft(p: Partner): Draft {
  return {
    name: p.name || '',
    email: p.email || '',
    whatsapp: p.whatsapp || '',
    cityIds: p.cityIds === undefined || p.cityIds === null ? 'all' : p.cityIds,
    commissionType: p.commissionType || 'percent',
    commissionPercent: Number(p.commissionPercent) || 0,
    commissionFixedMad: Number(p.commissionFixedMad) || 0,
    notes: p.notes || '',
    active: p.active !== false,
  };
}

/**
 * Fiches provider owner — Mes fiches (CRUD) + Marché for sale (lecture seule).
 */
export function OwnerProviderPage() {
  const { requestOwnerId, showOwnerFilter, ownerScopeUnset } = useAdminOwnerFilter();
  const [ownRows, setOwnRows] = useState<Partner[]>([]);
  const [marketRows, setMarketRows] = useState<Partner[]>([]);
  const [ficheTab, setFicheTab] = useState<FicheTab>('own');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const canEdit = ficheTab === 'own';
  const rows = ficheTab === 'own' ? ownRows : marketRows;

  const load = useCallback(async () => {
    if (showOwnerFilter && ownerScopeUnset) {
      setOwnRows([]);
      setMarketRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [mineList, marketList] = await Promise.all([
        partnersApi.list({
          includePlatform: false,
          ownerId: requestOwnerId ? String(requestOwnerId) : undefined,
        }),
        partnersApi
          .list({
            scope: 'marketplace',
            ownerId: requestOwnerId ? String(requestOwnerId) : undefined,
          })
          .catch(() => [] as Partner[]),
      ]);
      const mine = (mineList || []).filter((p) => {
        if (!p.ownerId) return false;
        if (requestOwnerId) return String(p.ownerId) === String(requestOwnerId);
        return true;
      });
      setOwnRows(mine);
      setMarketRows((marketList || []).map((p) => ({ ...p, marketplace: true })));
      if (!selectedId && !isNew && ficheTab === 'own' && mine.length === 1) {
        setSelectedId(mine[0].id);
        setDraft(toDraft(mine[0]));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement fiche impossible');
    } finally {
      setLoading(false);
    }
  }, [selectedId, isNew, requestOwnerId, showOwnerFilter, ownerScopeUnset, ficheTab]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    if (!canEdit) return;
    setIsNew(true);
    setSelectedId(null);
    setDraft(emptyDraft());
  };

  const openView = (p: Partner) => {
    setIsNew(false);
    setSelectedId(p.id);
    setDraft(toDraft(p));
  };

  const save = async () => {
    if (!canEdit) {
      toast.error('Les fiches du marché sont en lecture seule');
      return;
    }
    if (!draft.name.trim()) {
      toast.error('Nom commercial requis');
      return;
    }
    if (showOwnerFilter && !requestOwnerId) {
      toast.error('Choisissez un owner dans le filtre admin');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: draft.name.trim(),
        email: draft.email.trim(),
        whatsapp: draft.whatsapp.trim(),
        cityIds: draft.cityIds,
        commissionType: draft.commissionType,
        commissionPercent: draft.commissionPercent,
        commissionFixedMad: draft.commissionFixedMad,
        notes: draft.notes,
        active: draft.active,
        ...(requestOwnerId ? { ownerId: String(requestOwnerId) } : {}),
      };
      if (isNew) {
        const created = await partnersApi.create(body);
        toast.success('Fiche créée — vous pouvez mettre des expériences for sale');
        setIsNew(false);
        setSelectedId(created.id);
        setDraft(toDraft(created));
        await load();
      } else if (selectedId) {
        const updated = await partnersApi.update(selectedId, body);
        toast.success('Fiche enregistrée');
        setDraft(toDraft(updated));
        await load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const showEditor = isNew || !!selectedId;
  const declared = ownRows.some((r) => r.active !== false);

  const switchTab = (next: FicheTab) => {
    if (next === ficheTab) return;
    setFicheTab(next);
    setIsNew(false);
    setSelectedId(null);
    setDraft(emptyDraft());
  };

  const subtitle = useMemo(() => {
    if (ficheTab === 'market') {
      return 'Fiches for sale d’autres owners — lecture seule. Le catalogue Marché liste leurs activités.';
    }
    return 'Un owner peut avoir plusieurs fiches (providers). Chaque activité doit être associée à une fiche. Activez for sale sur le catalogue pour partager.';
  }, [ficheTab]);

  return (
    <div
      className="pa-root"
      style={{ height: 'auto', minHeight: 'calc(100vh - 56px)', padding: '20px 24px 48px' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <div className="pa-lbl">Expériences</div>
          <h1 className="pa-d" style={{ margin: '6px 0 8px', fontSize: 32 }}>
            Ma fiche
          </h1>
          <p style={{ margin: 0, color: 'var(--pa-ink3)', fontSize: 14, maxWidth: 560 }}>
            {subtitle}
          </p>
          {!loading && ficheTab === 'own' && !declared ? (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--pa-danger)' }}>
              Pas encore déclaré — for sale indisponible tant qu’aucune fiche active.
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/experiences" style={{ ...btnOutline(), textDecoration: 'none' }}>
            Catalogue
          </Link>
          {canEdit ? (
            <button type="button" style={btnGold()} onClick={openNew}>
              + Déclarer ma fiche
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 18,
          borderBottom: '1px solid var(--pa-line)',
        }}
      >
        {(
          [
            { v: 'own' as const, l: 'Mes fiches', count: ownRows.length },
            { v: 'market' as const, l: 'Marché', count: marketRows.length },
          ] as const
        ).map((tb) => (
          <button
            key={tb.v}
            type="button"
            onClick={() => switchTab(tb.v)}
            style={{
              border: 'none',
              background: 'none',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: ficheTab === tb.v ? 700 : 500,
              color: ficheTab === tb.v ? 'var(--pa-ink)' : 'var(--pa-ink3)',
              borderBottom:
                ficheTab === tb.v ? '2px solid var(--pa-gold, #b8851a)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tb.l}
            <span style={{ marginLeft: 8, color: 'var(--pa-ink4)', fontWeight: 500, fontSize: 12 }}>
              {tb.count}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showEditor ? '280px 1fr' : '1fr', gap: 20 }}>
        <div>
          {loading ? (
            <div style={{ color: 'var(--pa-ink3)', padding: 12 }}>Chargement…</div>
          ) : rows.length === 0 ? (
            <div
              style={{
                padding: 24,
                borderRadius: 'var(--pa-r-lg)',
                border: '1px dashed var(--pa-line)',
                color: 'var(--pa-ink3)',
                background: 'var(--pa-surface)',
              }}
            >
              {ficheTab === 'own'
                ? 'Aucune fiche. Déclarez-vous pour activer le marché for sale.'
                : 'Aucune fiche for sale pour le moment.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((p) => {
                const active = selectedId === p.id && !isNew;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openView(p)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      borderRadius: 'var(--pa-r-lg)',
                      border: `1px solid ${active ? 'var(--pa-gold)' : 'var(--pa-line)'}`,
                      background: active ? 'var(--pa-gold-wash)' : 'var(--pa-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--pa-ink3)', marginTop: 4 }}>
                      {ficheTab === 'market'
                        ? 'For sale · lecture seule'
                        : p.active !== false
                          ? 'Actif · déclaré'
                          : 'Inactif'}
                      {p.whatsapp ? ` · ${p.whatsapp}` : ''}
                    </div>
                  </button>
                );
              })}
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
              position: 'sticky',
              top: 16,
              maxHeight: 'calc(100vh - 96px)',
              overflow: 'auto',
            }}
          >
            <div className="pa-lbl" style={{ marginBottom: 8 }}>
              {isNew
                ? 'Nouvelle déclaration'
                : canEdit
                  ? 'Fiche'
                  : 'Fiche (lecture seule)'}
            </div>
            <fieldset
              disabled={!canEdit}
              style={{ border: 'none', margin: 0, padding: 0, minInlineSize: 0 }}
            >
              <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
                <input
                  className="pa-in"
                  style={inpBase}
                  placeholder="Nom commercial"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
                <input
                  className="pa-in"
                  style={inpBase}
                  placeholder="Email"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                />
                <input
                  className="pa-in"
                  style={inpBase}
                  placeholder="WhatsApp E.164"
                  value={draft.whatsapp}
                  onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))}
                />
                <CityAssociationField
                  value={draft.cityIds}
                  onChange={(next) => setDraft((d) => ({ ...d, cityIds: next }))}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                  />
                  <span>Fiche active (requis pour for sale)</span>
                </label>
                {canEdit ? (
                  <textarea
                    className="pa-in"
                    style={{ ...inpBase, minHeight: 72 }}
                    placeholder="Notes internes"
                    value={draft.notes}
                    onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  />
                ) : null}
              </div>
            </fieldset>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {canEdit ? (
                <button type="button" style={btnGold()} disabled={saving} onClick={() => void save()}>
                  {isNew ? 'Déclarer' : 'Enregistrer'}
                </button>
              ) : (
                <Link
                  to="/experiences?section=market"
                  style={{ ...btnOutline(), textDecoration: 'none' }}
                >
                  Voir les activités
                </Link>
              )}
              <button
                type="button"
                style={btnOutline()}
                onClick={() => {
                  setIsNew(false);
                  setSelectedId(null);
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OwnerProviderPage;
