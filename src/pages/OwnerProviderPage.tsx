import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  partnersApi,
  type CommissionType,
  type Partner,
} from '../services/partnersApi';
import CityAssociationField from '../features/listing/components/ConfigOrchestration/CityAssociationField';
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
 * Fiche Provider owner — obligatoire pour forSale.
 * Un provider = Partner.ownerId = self (pas de provider plateforme ici).
 */
export function OwnerProviderPage() {
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await partnersApi.list({ includePlatform: false });
      const mine = (list || []).filter((p) => !!p.ownerId);
      setRows(mine);
      if (!selectedId && !isNew && mine.length === 1) {
        setSelectedId(mine[0].id);
        setDraft(toDraft(mine[0]));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement fiche impossible');
    } finally {
      setLoading(false);
    }
  }, [selectedId, isNew]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const openNew = () => {
    setIsNew(true);
    setSelectedId(null);
    setDraft(emptyDraft());
  };

  const openEdit = (p: Partner) => {
    setIsNew(false);
    setSelectedId(p.id);
    setDraft(toDraft(p));
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error('Nom commercial requis');
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
  const declared = rows.some((r) => r.active !== false);

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
          marginBottom: 22,
        }}
      >
        <div>
          <div className="pa-lbl">Expériences</div>
          <h1 className="pa-d" style={{ margin: '6px 0 8px', fontSize: 32 }}>
            Ma fiche
          </h1>
          <p style={{ margin: 0, color: 'var(--pa-ink3)', fontSize: 14, maxWidth: 560 }}>
            Pour vendre des expériences aux autres PMs (<b>for sale</b>), déclarez votre fiche.
            Elle est liée à votre compte owner. Ensuite gérez le catalogue.
          </p>
          {!loading && !declared ? (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--pa-danger)' }}>
              Pas encore déclaré — for sale indisponible tant qu’aucune fiche active.
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/experiences" style={{ ...btnOutline(), textDecoration: 'none' }}>
            Catalogue
          </Link>
          <button type="button" style={btnGold()} onClick={openNew}>
            + Déclarer ma fiche
          </button>
        </div>
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
              Aucune fiche. Déclarez-vous pour activer le marché for sale.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((p) => {
                const active = selectedId === p.id && !isNew;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openEdit(p)}
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
                      {p.active !== false ? 'Actif · déclaré' : 'Inactif'}
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
            }}
          >
            <div className="pa-lbl" style={{ marginBottom: 8 }}>
              {isNew ? 'Nouvelle déclaration' : 'Fiche'}
            </div>
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
              <textarea
                className="pa-in"
                style={{ ...inpBase, minHeight: 72 }}
                placeholder="Notes internes"
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" style={btnGold()} disabled={saving} onClick={() => void save()}>
                  {isNew ? 'Déclarer' : 'Enregistrer'}
                </button>
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
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OwnerProviderPage;
