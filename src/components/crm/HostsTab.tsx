/**
 * HostsTab — Demandes Become Host (site booking sojori-vente /become-host)
 * Séparé de RequestsTab (funnel démo PMS sojori.com)
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { tokens as T } from '../dashboard/DashboardV2.components';
import {
  getBecomeHostRequests,
  updateBecomeHostStatus,
  deleteBecomeHostRequest,
  type BecomeHostRequest,
  type BecomeHostStatus,
} from '../../services/crmService';
import { BecomeHostDetailDialog } from './BecomeHostDetailDialog';

const STATUS_CONFIG: Record<
  BecomeHostStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FFF3E0' },
  contacted: { label: 'Contacté', color: '#3B82F6', bgColor: '#E3F2FD' },
  qualified: { label: 'Qualifié', color: '#9C27B0', bgColor: '#F3E5F5' },
  matched: { label: 'Matché', color: '#0EA5E9', bgColor: '#E0F2FE' },
  converted: { label: 'Converti', color: '#10B981', bgColor: '#E8F5E9' },
  rejected: { label: 'Rejeté', color: '#EF4444', bgColor: '#FFEBEE' },
};

const USER_TYPE_LABEL: Record<string, string> = {
  professional_pm: '💼 PM Pro',
  property_owner: '🏠 Propriétaire',
};

function contextSummary(r: BecomeHostRequest): string {
  if (r.userType === 'professional_pm') {
    return [r.company, r.numberOfPropertiesManaged && `${r.numberOfPropertiesManaged} biens`, r.cityRegion]
      .filter(Boolean)
      .join(' · ');
  }
  const locs = r.propertyLocations?.slice(0, 2).join(', ');
  const types = r.propertyTypes?.slice(0, 2).join(', ');
  return [
    r.numberOfPropertiesOwned && `${r.numberOfPropertiesOwned} bien(s)`,
    locs,
    types,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function HostsTab() {
  const [requests, setRequests] = useState<BecomeHostRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [statusFilter, setStatusFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogRequest, setDialogRequest] = useState<BecomeHostRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBecomeHostRequests({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
        userType: userTypeFilter || undefined,
      });
      if (res.success && res.data) {
        setRequests(res.data.requests || []);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (e) {
      console.error('[HostsTab]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, statusFilter, userTypeFilter]);

  const openDetail = (r: BecomeHostRequest) => {
    setDialogRequest(r);
    setDialogOpen(true);
  };

  const handleStatusChange = async (r: BecomeHostRequest, status: BecomeHostStatus) => {
    const id = String(r.id || r._id);
    try {
      const res = await updateBecomeHostStatus(id, status);
      if (res.success) {
        setRequests((prev) => prev.map((x) => (String(x.id || x._id) === id ? { ...x, status } : x)));
      }
    } catch (e) {
      console.error('[HostsTab] status', e);
    }
  };

  const handleDelete = async (r: BecomeHostRequest) => {
    const id = String(r.id || r._id);
    if (!window.confirm('Supprimer cette demande ?')) return;
    try {
      const res = await deleteBecomeHostRequest(id);
      if (res.success) {
        setRequests((prev) => prev.filter((x) => String(x.id || x._id) !== id));
        setTotal((t) => Math.max(0, t - 1));
      }
    } catch (e) {
      console.error('[HostsTab] delete', e);
    }
  };

  const fmt = (d: string) => {
    try {
      return format(new Date(d), 'dd/MM/yy', { locale: fr });
    } catch {
      return '—';
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: T.primaryTint,
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          fontSize: 12,
          color: T.text2,
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: T.text }}>Site booking (sojori-vente)</strong> — formulaire{' '}
        <code>/become-host</code> : propriétaires et PM Pro. Distinct des demandes démo PMS (onglet
        « Demandes PMS »).
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          padding: 12,
          background: T.bg2,
          borderRadius: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: 'block', marginBottom: 6 }}>
            Type
          </label>
          <select
            value={userTypeFilter}
            onChange={(e) => {
              setUserTypeFilter(e.target.value);
              setPage(0);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.bg1,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <option value="">Tous</option>
            <option value="professional_pm">PM Pro</option>
            <option value="property_owner">Propriétaire</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: 'block', marginBottom: 6 }}>
            Statut
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.bg1,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <option value="">Tous</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: 6,
              border: 0,
              background: T.primary,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? '…' : '🔄 Actualiser'}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>
        <strong style={{ color: T.text }}>{total}</strong> demande{total !== 1 ? 's' : ''}
      </div>

      <div style={{ overflow: 'auto', border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: T.bg2 }}>
              {['Type', 'Nom', 'Email', 'Tél.', 'Détails', 'Statut', 'Qualif.', 'Créé', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                  Aucune demande Become Host
                </td>
              </tr>
            )}
            {!loading &&
              requests.map((r) => {
                const id = String(r.id || r._id);
                const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return (
                  <tr
                    key={id}
                    onClick={() => openDetail(r)}
                    style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = T.bg2;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{USER_TYPE_LABEL[r.userType] || r.userType}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>{r.fullName}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{r.email}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{r.phone}</td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        color: T.text3,
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {contextSummary(r) || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r, e.target.value as BecomeHostStatus)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: `1px solid ${T.border}`,
                          background: st.bgColor,
                          color: st.color,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'inherit',
                        }}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {r.qualificationCompleted ? '✅' : '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        fontFamily: '"Geist Mono", monospace',
                        color: T.text3,
                      }}
                    >
                      {fmt(r.createdAt)}
                    </td>
                    <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        title="Supprimer"
                        style={{
                          border: `1px solid ${T.border}`,
                          background: T.bg1,
                          borderRadius: 4,
                          padding: '4px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {total > rowsPerPage && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 16,
            fontSize: 12,
            color: T.text3,
          }}
        >
          <span>
            Page {page + 1} / {Math.ceil(total / rowsPerPage)}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${T.border}`, cursor: 'pointer' }}
            >
              ←
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(total / rowsPerPage) - 1}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${T.border}`, cursor: 'pointer' }}
            >
              →
            </button>
          </div>
        </div>
      )}

      <BecomeHostDetailDialog
        open={dialogOpen}
        request={dialogRequest}
        onClose={() => {
          setDialogOpen(false);
          setTimeout(() => setDialogRequest(null), 200);
        }}
        onStatusChange={(id, status) => {
          setRequests((prev) => prev.map((x) => (String(x.id || x._id) === id ? { ...x, status } : x)));
          setDialogRequest((prev) => (prev ? { ...prev, status } : prev));
        }}
        onDeleted={(id) => {
          setRequests((prev) => prev.filter((x) => String(x.id || x._id) !== id));
          setTotal((t) => Math.max(0, t - 1));
        }}
      />
    </div>
  );
}
