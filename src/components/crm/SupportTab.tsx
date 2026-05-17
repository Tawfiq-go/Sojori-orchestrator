/**
 * SupportTab.tsx
 * Onglet "Équipe support" du CRM avec 3 sous-onglets
 * Migré depuis sojori-dashboard/src/features/support-team
 */

import { useState, useEffect } from 'react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import {
  getSupportAgents,
  deleteSupportAgent,
  getAppointments,
  deleteAppointment,
  type SupportAgent,
  type Appointment,
} from '../../services/crmService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PlanningView } from './PlanningView';

type SubTabId = 'appointments' | 'planning' | 'agents';

const SUB_TABS: Array<{ id: SubTabId; label: string; icon: string }> = [
  { id: 'appointments', label: 'Rendez-vous', icon: '📅' },
  { id: 'planning', label: 'Planning', icon: '📆' },
  { id: 'agents', label: 'Agents', icon: '👥' },
];

const APPOINTMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FFF3E0' },
  confirmed: { label: 'Confirmé', color: '#10B981', bgColor: '#E8F5E9' },
  cancelled: { label: 'Annulé', color: '#EF4444', bgColor: '#FFEBEE' },
  rescheduled: { label: 'Modifié', color: '#8b5cf6', bgColor: '#F3E5F5' },
  completed: { label: 'Terminé', color: '#3B82F6', bgColor: '#E3F2FD' },
  no_show: { label: 'Absent', color: '#9CA3AF', bgColor: '#F3F4F6' },
};

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export function SupportTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('appointments'); // Default to appointments like legacy

  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedAgent, setSelectedAgent] = useState<SupportAgent | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const loadAgents = async () => {
    setLoading(true);
    console.log('[SupportTab] 🔄 Loading agents...');
    try {
      const response = await getSupportAgents();
      console.log('[SupportTab] 📥 Agents response:', response);

      if (response.success) {
        setAgents(response.data || []);
      }
    } catch (error) {
      console.error('[SupportTab] ❌ Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    console.log('[SupportTab] 🔄 Loading appointments...');
    try {
      const response = await getAppointments();
      console.log('[SupportTab] 📥 Appointments response:', response);

      if (response.success) {
        setAppointments(response.data || []);
      }
    } catch (error) {
      console.error('[SupportTab] ❌ Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'agents') {
      loadAgents();
    } else if (activeSubTab === 'appointments') {
      loadAppointments();
    }
  }, [activeSubTab]);

  const handleActionsClickAgent = (event: React.MouseEvent, agent: SupportAgent) => {
    event.stopPropagation();
    setSelectedAgent(agent);
    setSelectedAppointment(null);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowMenu(true);
  };

  const handleActionsClickAppointment = (event: React.MouseEvent, appointment: Appointment) => {
    event.stopPropagation();
    setSelectedAppointment(appointment);
    setSelectedAgent(null);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
    setSelectedAgent(null);
    setSelectedAppointment(null);
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;
    handleCloseMenu();

    if (!window.confirm(`Supprimer définitivement l'agent ${selectedAgent.firstName} ${selectedAgent.lastName} ?`)) {
      return;
    }

    try {
      const agentId = selectedAgent._id || (selectedAgent as any).id;
      if (!agentId) {
        alert('ID agent manquant');
        return;
      }
      const data = await deleteSupportAgent(agentId);
      if (data.success) {
        setAgents((prev) => prev.filter((a) => (a._id || (a as any).id) !== agentId));
      }
    } catch (error) {
      console.error('[SupportTab] delete agent error:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    handleCloseMenu();

    if (!window.confirm('Supprimer définitivement ce rendez-vous ?')) {
      return;
    }

    try {
      const appointmentId = selectedAppointment._id || (selectedAppointment as any).id;
      if (!appointmentId) {
        alert('ID rendez-vous manquant');
        return;
      }
      const data = await deleteAppointment(appointmentId);
      if (data.success) {
        setAppointments((prev) => prev.filter((a) => (a._id || (a as any).id) !== appointmentId));
      }
    } catch (error) {
      console.error('[SupportTab] delete appointment error:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd/MM/yy', { locale: fr });
    } catch {
      return '—';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'EEE dd MMM yyyy · HH:mm', { locale: fr });
    } catch {
      return '—';
    }
  };

  const formatAppointmentDate = (startTime?: string, endTime?: string) => {
    if (!startTime) return '—';
    try {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : null;
      const dateStr = format(start, 'EEE dd MMM yyyy', { locale: fr });
      const timeStr = format(start, 'HH:mm', { locale: fr });
      const endTimeStr = end ? format(end, 'HH:mm', { locale: fr }) : '';
      const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600 }}>{dateStr}</span>
          <span style={{ fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
            {timeStr} – {endTimeStr} · {duration} min
          </span>
        </div>
      );
    } catch {
      return '—';
    }
  };

  const getAgentName = (agentId: any) => {
    if (typeof agentId === 'object' && agentId !== null) {
      return `${agentId.firstName || ''} ${agentId.lastName || ''}`.trim() || '—';
    }
    const agent = agents.find((a) => (a._id || (a as any).id) === agentId);
    if (agent) {
      return `${agent.firstName} ${agent.lastName}`;
    }
    return '—';
  };

  const getStatusBadge = (active?: boolean) => {
    if (active === undefined || active === null) return null;
    if (active) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 700,
            backgroundColor: '#E8F5E9',
            color: '#10B981',
          }}
        >
          ✓ Actif
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: '#F3F4F6',
          color: '#9CA3AF',
        }}
      >
        ○ Inactif
      </span>
    );
  };

  const getAppointmentStatusBadge = (status: string) => {
    const config = APPOINTMENT_STATUS_CONFIG[status] || APPOINTMENT_STATUS_CONFIG.pending;
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
        {config.label}
      </span>
    );
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: `2px solid ${T.border}`,
          marginBottom: 16,
          paddingBottom: 0,
        }}
      >
        {SUB_TABS.map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 700,
                color: active ? T.primary : T.text3,
                background: 'transparent',
                border: 0,
                borderBottom: `3px solid ${active ? T.primary : 'transparent'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                marginBottom: -2,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = T.text2;
                  e.currentTarget.style.borderBottomColor = T.border;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = T.text3;
                  e.currentTarget.style.borderBottomColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '10px 12px',
          background: T.bg2,
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 12, color: T.text3 }}>
          {activeSubTab === 'agents' && (
            <span style={{ fontWeight: 700, color: T.text }}>
              {agents.length} agent{agents.length !== 1 ? 's' : ''}
            </span>
          )}
          {activeSubTab === 'appointments' && (
            <span style={{ fontWeight: 700, color: T.text }}>
              {appointments.length} RDV
            </span>
          )}
          {activeSubTab === 'planning' && <span style={{ fontWeight: 700, color: T.text }}>Planning hebdomadaire</span>}
        </div>
        <button
          onClick={() => {
            if (activeSubTab === 'agents') loadAgents();
            else if (activeSubTab === 'appointments') loadAppointments();
          }}
          disabled={loading}
          style={{
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

      {/* Content */}
      {activeSubTab === 'planning' && <PlanningView />}

      {activeSubTab === 'appointments' && (
        <div
          style={{
            overflow: 'auto',
            border: `1px solid ${T.border}`,
            borderRadius: 8,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
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
                    minWidth: 160,
                  }}
                >
                  Date & créneau
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                    minWidth: 120,
                  }}
                >
                  Agent
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
                  Nom & prénom
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
                  Email
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
                    minWidth: 100,
                  }}
                >
                  Statut
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                    minWidth: 80,
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading && appointments.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                    Aucun rendez-vous trouvé
                  </td>
                </tr>
              )}
              {!loading &&
                appointments.map((appointment: any) => {
                  const appointmentId = appointment._id || appointment.id;
                  return (
                    <tr
                      key={appointmentId}
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
                      <td
                        style={{
                          padding: '10px 14px',
                          fontSize: 11,
                          color: T.text3,
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {formatDateTime(appointment.createdAt)}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>
                        {formatAppointmentDate(appointment.startTime, appointment.endTime)}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>
                        {getAgentName(appointment.agentId)}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>
                        {(appointment as any).clientName || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>
                        {(appointment as any).clientEmail || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>
                        {(appointment as any).clientPhone || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>{getAppointmentStatusBadge(appointment.status)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => handleActionsClickAppointment(e, appointment)}
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
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'agents' && (
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
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Nom
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
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
                  }}
                >
                  Rôle
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Statut
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Créé le
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'right',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading && agents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                    Aucun agent trouvé
                  </td>
                </tr>
              )}
              {!loading &&
                agents.map((agent) => {
                  const agentId = agent._id || (agent as any).id;
                  return (
                    <tr
                      key={agentId}
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
                      <td style={{ padding: '10px 14px', fontSize: 13, color: T.text, fontWeight: 600 }}>
                        {agent.firstName} {agent.lastName}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{agent.email || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{agent.phone || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{agent.role || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{getStatusBadge(agent.active)}</td>
                      <td
                        style={{
                          padding: '10px 14px',
                          fontSize: 11,
                          color: T.text3,
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {formatDate(agent.createdAt)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => handleActionsClickAgent(e, agent)}
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
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Context Menu */}
      {showMenu && (selectedAgent || selectedAppointment) && (
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
              onClick={selectedAgent ? handleDeleteAgent : handleDeleteAppointment}
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
