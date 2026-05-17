/**
 * RequestsTab.tsx
 * Onglet "Demandes" (Demo Requests) du CRM
 * Migré depuis sojori-dashboard/src/features/demo/pages/DemoRequests.page.jsx
 */

import { useState, useEffect } from 'react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import {
  getDemoRequests,
  updateDemoRequestStatus,
  deleteDemoRequest,
  type DemoRequest,
} from '../../services/crmService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    color: '#F59E0B',
    bgColor: '#FFF3E0',
    icon: '⏳',
  },
  contacted: {
    label: 'Contacté',
    color: '#3B82F6',
    bgColor: '#E3F2FD',
    icon: '📧',
  },
  qualified: {
    label: 'Qualifié',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    icon: '✅',
  },
  converted: {
    label: 'Converti',
    color: '#10B981',
    bgColor: '#E8F5E9',
    icon: '✅',
  },
  rejected: {
    label: 'Rejeté',
    color: '#EF4444',
    bgColor: '#FFEBEE',
    icon: '❌',
  },
};

const COLUMNS = [
  { id: 'source', label: 'Source', width: '8%' },
  { id: 'email', label: 'Email', width: '14%' },
  { id: 'phone', label: 'Tél.', width: '10%' },
  { id: 'fullName', label: 'Nom', width: '12%' },
  { id: 'company', label: 'Entreprise', width: '12%' },
  { id: 'numberOfProperties', label: 'Biens', width: '6%' },
  { id: 'requestType', label: 'Type', width: '10%' },
  { id: 'status', label: 'Statut', width: '10%' },
  { id: 'qualification', label: 'Qualif.', width: '8%' },
  { id: 'createdAt', label: 'Créé le', width: '8%' },
  { id: 'actions', label: '', width: '2%' },
];

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export function RequestsTab() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [statusFilter, setStatusFilter] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const loadRequests = async () => {
    setLoading(true);
    console.log('[RequestsTab] 🔄 Loading requests...');
    try {
      const params: any = {
        page,
        limit: rowsPerPage,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      if (statusFilter) params.status = statusFilter;
      if (qualificationFilter) {
        params.qualificationCompleted = qualificationFilter === 'true';
      }

      console.log('[RequestsTab] 📤 API params:', params);
      const response = await getDemoRequests(params);
      console.log('[RequestsTab] 📥 API response:', response);

      if (response.success) {
        console.log('[RequestsTab] ✅ Data received:', response.data?.length, 'requests');
        setRequests(response.data || []);
        setTotal(response.pagination?.total || 0);
      } else {
        console.warn('[RequestsTab] ⚠️ API returned success=false');
      }
    } catch (error) {
      console.error('[RequestsTab] ❌ Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [page, rowsPerPage, statusFilter, qualificationFilter]);

  const handleActionsClick = (event: React.MouseEvent, request: DemoRequest) => {
    event.stopPropagation();
    setSelectedRequest(request);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
    setSelectedRequest(null);
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;
    handleCloseMenu();

    if (!window.confirm('Supprimer définitivement cette demande et tout rendez-vous démo lié ?')) {
      return;
    }

    try {
      const requestId = selectedRequest.id || selectedRequest._id;
      if (!requestId) {
        alert('ID de demande manquant');
        return;
      }
      const data = await deleteDemoRequest(requestId);
      if (data.success) {
        setRequests((prev) => prev.filter((r) => (r.id || r._id) !== requestId));
      }
    } catch (error) {
      console.error('[RequestsTab] delete error:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleStatusChange = async (request: DemoRequest, newStatus: DemoRequest['status']) => {
    try {
      const requestId = request.id || request._id;
      if (!requestId) {
        alert('ID de demande manquant');
        return;
      }
      const data = await updateDemoRequestStatus(requestId, newStatus);
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => ((r.id || r._id) === requestId ? { ...r, status: newStatus } : r)),
        );
      }
    } catch (error) {
      console.error('[RequestsTab] status change error:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const renderStatusChip = (status: DemoRequest['status']) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: config.bgColor,
          color: config.color,
        }}
      >
        <span style={{ fontSize: 12 }}>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yy', { locale: fr });
    } catch {
      return '—';
    }
  };

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          padding: 12,
          background: T.bg2,
          borderRadius: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: 'block', marginBottom: 6 }}>
            Statut
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.bg1,
              color: T.text,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <option value="">Tous</option>
            <option value="pending">En attente</option>
            <option value="contacted">Contacté</option>
            <option value="qualified">Qualifié</option>
            <option value="converted">Converti</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: 'block', marginBottom: 6 }}>
            Qualification
          </label>
          <select
            value={qualificationFilter}
            onChange={(e) => setQualificationFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.bg1,
              color: T.text,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <option value="">Tous</option>
            <option value="true">Qualifiés</option>
            <option value="false">Non qualifiés</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={loadRequests}
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
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Chargement...' : '🔄 Actualiser'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          padding: '10px 12px',
          background: T.bg2,
          borderRadius: 6,
          fontSize: 12,
          color: T.text3,
        }}
      >
        <span style={{ fontWeight: 700, color: T.text }}>
          {total} demande{total !== 1 ? 's' : ''}
        </span>
        {statusFilter && <span>· Filtre : {STATUS_CONFIG[statusFilter as DemoRequest['status']]?.label}</span>}
      </div>

      {/* Table */}
      <div
        style={{
          overflow: 'auto',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.bg2 }}>
              {COLUMNS.map((col) => (
                <th
                  key={col.id}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                  Chargement...
                </td>
              </tr>
            )}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                  Aucune demande trouvée
                </td>
              </tr>
            )}
            {!loading &&
              requests.map((request) => (
                <tr
                  key={request.id || request._id}
                  style={{
                    borderBottom: `1px solid ${T.border}`,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = T.bg2;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: T.primaryTint,
                        color: T.primaryDeep,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      {request.source || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{request.email || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{request.phone || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{request.fullName || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{request.company || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: T.text, textAlign: 'center' }}>
                    {request.numberOfProperties || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{request.requestType || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <select
                        value={request.status}
                        onChange={(e) => handleStatusChange(request, e.target.value as DemoRequest['status'])}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: `1px solid ${T.border}`,
                          background: STATUS_CONFIG[request.status]?.bgColor,
                          color: STATUS_CONFIG[request.status]?.color,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <option value="pending">En attente</option>
                        <option value="contacted">Contacté</option>
                        <option value="qualified">Qualifié</option>
                        <option value="converted">Converti</option>
                        <option value="rejected">Rejeté</option>
                      </select>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: T.text, textAlign: 'center' }}>
                    {request.qualificationCompleted ? (
                      <span style={{ color: T.success }}>✅</span>
                    ) : (
                      <span style={{ color: T.text3 }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      fontSize: 11,
                      color: T.text3,
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    {formatDate(request.createdAt)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => handleActionsClick(e, request)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: `1px solid ${T.border}`,
                        background: T.bg1,
                        color: T.text2,
                        fontSize: 16,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > rowsPerPage && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
            padding: '10px 12px',
            background: T.bg2,
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <div style={{ color: T.text3 }}>
            Page {page + 1} sur {Math.ceil(total / rowsPerPage)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: `1px solid ${T.border}`,
                background: T.bg1,
                color: T.text,
                fontSize: 12,
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              ← Précédent
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / rowsPerPage) - 1}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: `1px solid ${T.border}`,
                background: T.bg1,
                color: T.text,
                fontSize: 12,
                cursor: page >= Math.ceil(total / rowsPerPage) - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= Math.ceil(total / rowsPerPage) - 1 ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showMenu && selectedRequest && (
        <>
          <div
            onClick={handleCloseMenu}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: menuPosition.x,
              top: menuPosition.y,
              background: T.bg1,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: 180,
            }}
          >
            <button
              onClick={handleDelete}
              style={{
                width: '100%',
                padding: '10px 16px',
                textAlign: 'left',
                border: 0,
                background: 'transparent',
                color: T.error,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderRadius: '8px 8px 0 0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.bg2;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              🗑️ Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
