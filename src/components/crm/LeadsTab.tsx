/**
 * LeadsTab.tsx
 * Onglet "Leads & fiches" du CRM
 * Migré depuis sojori-dashboard/src/features/lead
 */

import { useState, useEffect, useCallback } from 'react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import {
  getLeads,
  getLeadDetails,
  deleteLeadDetail,
  getLeadDetailFilterOptions,
  type Lead,
  type LeadDetail,
} from '../../services/crmService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export function LeadsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [leadDetails, setLeadDetails] = useState<LeadDetail[]>([]);
  const [filterLeadOptions, setFilterLeadOptions] = useState<Lead[]>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState({
    lead_id: '',
    search_text: '',
  });

  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const fetchFilterLeadOptions = useCallback(async () => {
    try {
      const response = await getLeadDetailFilterOptions();
      if (response.success && Array.isArray(response.data)) {
        setFilterLeadOptions(response.data);
      }
    } catch (error) {
      console.error('[LeadsTab] Error loading filter options:', error);
    }
  }, []);

  const fetchLeadDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        paged: 'true',
        limit: String(limit),
        page: String(page),
      });
      if (filters.lead_id) params.set('lead_id', filters.lead_id);
      if (filters.search_text && filters.search_text.trim()) {
        params.set('search_text', filters.search_text.trim());
      }

      console.log('[LeadsTab] 🔄 Loading lead details...', params.toString());
      const response = await getLeadDetails(params.toString());
      console.log('[LeadsTab] 📥 Response:', response);

      if (response.success) {
        setLeadDetails(Array.isArray(response.data) ? response.data : []);
        setTotalRecords(typeof (response as any).total === 'number' ? (response as any).total : 0);
      } else {
        setLeadDetails([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error('[LeadsTab] ❌ Error loading lead details:', error);
      setLeadDetails([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, filters.lead_id, filters.search_text]);

  useEffect(() => {
    fetchFilterLeadOptions();
  }, [fetchFilterLeadOptions]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  const handleActionsClick = (event: React.MouseEvent, lead: LeadDetail) => {
    event.stopPropagation();
    setSelectedLead(lead);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
    setSelectedLead(null);
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    handleCloseMenu();

    if (!window.confirm('Supprimer définitivement cette fiche détaillée ?')) {
      return;
    }

    try {
      const leadId = selectedLead._id || (selectedLead as any).id;
      if (!leadId) {
        alert('ID de fiche manquant');
        return;
      }
      const data = await deleteLeadDetail(leadId);
      if (data.success) {
        setLeadDetails((prev) => prev.filter((r) => (r._id || (r as any).id) !== leadId));
        setTotalRecords((prev) => prev - 1);
      }
    } catch (error) {
      console.error('[LeadsTab] delete error:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: fr });
    } catch {
      return '—';
    }
  };

  // Format date from row (fiche si présente, sinon date du lead)
  const formatCreatedAt = (row: any) => {
    const raw = row?.created_at || row?.createdAt || row?.lead?.created_at;
    if (!raw) return '—';
    try {
      return format(new Date(raw), 'dd MMM yyyy HH:mm', { locale: fr });
    } catch {
      return '—';
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search_text: e.target.value }));
    setPage(0); // Reset page when searching
  };

  const handleLeadFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, lead_id: e.target.value }));
    setPage(0);
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
        <div style={{ flex: 2 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: 'block', marginBottom: 6 }}>
            Rechercher
          </label>
          <input
            type="text"
            value={filters.search_text}
            onChange={handleSearchChange}
            placeholder="Email, nom, entreprise..."
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
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: 'block', marginBottom: 6 }}>
            Filtrer par lead
          </label>
          <select
            value={filters.lead_id}
            onChange={handleLeadFilterChange}
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
            <option value="">Tous les leads</option>
            {filterLeadOptions.map((lead) => (
              <option key={lead._id || (lead as any).id} value={lead._id || (lead as any).id}>
                {lead.email || lead.fullName || 'Sans nom'}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={fetchLeadDetails}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: 6,
              border: 0,
              background: T.primary,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {isLoading ? 'Chargement...' : '🔄 Actualiser'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div
        style={{
          marginBottom: 12,
          padding: '8px 12px',
          background: T.bg2,
          borderRadius: 6,
          fontSize: 11,
          color: T.text3,
        }}
      >
        Toutes les <strong>demandes</strong> (formulaire simple) et les <strong>fiches détaillées</strong> — tri par{' '}
        <strong>Créé le</strong> (fiche si présente, sinon date du lead). Plus récent en premier.
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
          {totalRecords} résultat{totalRecords !== 1 ? 's' : ''}
        </span>
        {filters.lead_id && <span>· Lead filtré</span>}
        {filters.search_text && <span>· Recherche : {filters.search_text}</span>}
      </div>

      {/* Table */}
      <div
        style={{
          overflow: 'auto',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ background: T.bg2 }}>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 140,
                }}
              >
                Demande
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 130,
                }}
              >
                Créé le
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 110,
                }}
              >
                Téléphone
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 140,
                }}
              >
                Entreprise
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 100,
                }}
              >
                Chronologie
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 160,
                }}
              >
                Solutions
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 72,
                }}
              >
                Plan de Croissance
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 90,
                }}
              >
                Type de Client
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 100,
                }}
              >
                Secteur d'Activité
              </th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `2px solid ${T.border}`,
                  minWidth: 96,
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                  Chargement...
                </td>
              </tr>
            )}
            {!isLoading && leadDetails.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                  Aucun résultat
                </td>
              </tr>
            )}
            {!isLoading &&
              leadDetails.map((row: any, index) => {
                const leadId = row.id || row.lead_id || row._id || index;
                const hasDetail = row.has_detail !== false; // true by default unless explicitly false
                const leadName = row?.lead?.name || row?.lead?.email || '—';
                const leadEmail = row?.lead?.email || '';
                const phoneNumber = row?.lead?.phone_number || '—';
                const companyName = row.company_name || '—';
                const timeline = row.timeline || '—';
                const currentSolutions = row.current_solutions || [];
                const plannedGrowth = row.planned_growth != null ? `${row.planned_growth} propriétés` : '—';
                const clientType = row.client_type || '—';
                const industry = row.industry || '—';

                return (
                  <tr
                    key={leadId}
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
                    {/* Demande column with name and badge */}
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text, fontWeight: 600 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span title={leadEmail}>{leadName}</span>
                        {!hasDetail && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              border: `1px solid ${T.border}`,
                              borderRadius: 4,
                              color: T.text3,
                              alignSelf: 'flex-start',
                            }}
                          >
                            Formulaire simple
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        color: T.text3,
                        fontFamily: '"Geist Mono", monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCreatedAt(row)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{phoneNumber}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }} title={companyName}>
                      {companyName}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{timeline}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {currentSolutions.slice(0, 4).map((solution: string, i: number) => (
                          <span
                            key={i}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: T.bg3,
                              color: T.text2,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {solution}
                          </span>
                        ))}
                        {currentSolutions.length > 4 && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: `1px solid ${T.border}`,
                              color: T.text3,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            +{currentSolutions.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{plannedGrowth}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{clientType}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{industry}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => handleActionsClick(e, row)}
                        disabled={!row?.id}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: `1px solid ${T.border}`,
                          background: row?.id ? T.bg1 : T.bg3,
                          color: row?.id ? T.text2 : T.text3,
                          fontSize: 16,
                          cursor: row?.id ? 'pointer' : 'not-allowed',
                          fontFamily: 'inherit',
                        }}
                        title={row?.id ? 'Actions' : 'Pas de fiche détaillée à supprimer'}
                      >
                        ⋯
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalRecords > limit && (
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
            Page {page + 1} sur {Math.ceil(totalRecords / limit)} · {totalRecords} résultat
            {totalRecords !== 1 ? 's' : ''}
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
              disabled={page >= Math.ceil(totalRecords / limit) - 1}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: `1px solid ${T.border}`,
                background: T.bg1,
                color: T.text,
                fontSize: 12,
                cursor: page >= Math.ceil(totalRecords / limit) - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= Math.ceil(totalRecords / limit) - 1 ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showMenu && selectedLead && (
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
                borderRadius: 8,
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
