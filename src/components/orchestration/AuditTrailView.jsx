// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Atelier 2026
// AuditTrailView.jsx — Vue globale d'audit pour toutes les réservations
// Migration depuis sojori-dashboard/AuditTrailView.jsx
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://dev.sojori.com';

/**
 * Composant de vue Audit Trail global
 * - Panneau gauche: Liste des réservations avec recherche
 * - Panneau droit: Détails de l'audit trail avec timeline
 */
export function AuditTrailView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [auditData, setAuditData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Fetch reservations
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/api/v1/orchestrator/reservations?limit=100`);
        if (response.data.success) {
          setReservations(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching reservations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReservations();
  }, []);

  // Fetch audit trail when reservation selected
  useEffect(() => {
    if (!selectedReservation) {
      setAuditData(null);
      setTimeline([]);
      return;
    }

    const fetchAuditTrail = async () => {
      try {
        setIsLoadingAudit(true);
        const [auditResponse, timelineResponse] = await Promise.all([
          axios.get(`${API_URL}/api/v1/orchestrator/audit-trail/${selectedReservation.reservationNumber}`),
          axios.get(`${API_URL}/api/v1/orchestrator/audit-trail/${selectedReservation.reservationNumber}/timeline`)
        ]);

        if (auditResponse.data.success) {
          setAuditData(auditResponse.data.data);
        }
        if (timelineResponse.data.success) {
          setTimeline(timelineResponse.data.data.timeline || []);
        }
      } catch (error) {
        console.error('Error fetching audit trail:', error);
      } finally {
        setIsLoadingAudit(false);
      }
    };

    fetchAuditTrail();
  }, [selectedReservation]);

  // Filter reservations
  const filteredReservations = reservations.filter(r =>
    r.reservationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get icon for event type
  const getEventIcon = (eventType) => {
    if (eventType?.includes('completed')) return '✅';
    if (eventType?.includes('cancelled')) return '❌';
    if (eventType?.includes('updated')) return '🔄';
    if (eventType?.includes('sent')) return '📨';
    if (eventType?.includes('email')) return '📧';
    if (eventType?.includes('whatsapp')) return '📱';
    return 'ℹ️';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      {/* Left Panel: Reservations List */}
      <div style={{
        width: 350,
        background: 'white',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Search */}
        <div style={{ padding: 16, borderBottom: '1px solid #e0e0e0' }}>
          <input
            type="text"
            placeholder="Rechercher une réservation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Reservations List */}
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32, color: '#999' }}>
              Chargement...
            </div>
          ) : filteredReservations.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>
              Aucune réservation trouvée
            </div>
          ) : (
            filteredReservations.map(reservation => (
              <div
                key={reservation._id}
                onClick={() => setSelectedReservation(reservation)}
                style={{
                  marginBottom: 8,
                  padding: 12,
                  background: selectedReservation?._id === reservation._id ? '#fff3e0' : 'white',
                  border: selectedReservation?._id === reservation._id ? '2px solid #E6B022' : '1px solid #e0e0e0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedReservation?._id !== reservation._id) {
                    e.currentTarget.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedReservation?._id !== reservation._id) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {reservation.reservationNumber}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {new Date(reservation.checkIn).toLocaleDateString('fr-FR')} →{' '}
                  {new Date(reservation.checkOut).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Audit Trail Details */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {!selectedReservation ? (
          <div style={{
            padding: 32,
            textAlign: 'center',
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e0e0e0',
            color: '#666'
          }}>
            Sélectionnez une réservation pour voir son audit trail
          </div>
        ) : isLoadingAudit ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 64,
            color: '#999'
          }}>
            Chargement de l'audit trail...
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              background: 'white',
              padding: 20,
              borderRadius: 12,
              marginBottom: 24,
              border: '1px solid #e0e0e0'
            }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#333' }}>
                {selectedReservation.reservationNumber}
              </h2>
              <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                {new Date(selectedReservation.checkIn).toLocaleDateString('fr-FR')} →{' '}
                {new Date(selectedReservation.checkOut).toLocaleDateString('fr-FR')}
              </div>
            </div>

            {/* Timeline */}
            {timeline.length > 0 && (
              <div style={{
                background: 'white',
                padding: 20,
                borderRadius: 12,
                border: '1px solid #e0e0e0'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#333' }}>
                  Timeline · {timeline.length} événements
                </h3>
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  {/* Vertical line */}
                  <div style={{
                    position: 'absolute',
                    left: 7,
                    top: 12,
                    bottom: 12,
                    width: 2,
                    background: '#e0e0e0'
                  }} />

                  {timeline.map((event, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
                      {/* Dot */}
                      <div style={{
                        position: 'absolute',
                        left: -20,
                        top: 4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: event.type?.includes('completed') ? '#10b981' :
                                   event.type?.includes('failed') ? '#ef4444' :
                                   event.type?.includes('sent') ? '#3b82f6' : '#6b7280',
                        border: '3px solid white',
                        boxShadow: '0 0 0 1px #e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8
                      }}>
                        <span>{getEventIcon(event.type)}</span>
                      </div>

                      {/* Content */}
                      <div style={{
                        background: '#f9fafb',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #e0e0e0'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4
                        }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>
                            {event.label || event.type}
                          </span>
                          <span style={{
                            fontSize: 11,
                            color: '#999',
                            fontFamily: '"Geist Mono", monospace'
                          }}>
                            {event.timestamp ? new Date(event.timestamp).toLocaleString('fr-FR') : event.at}
                          </span>
                        </div>
                        {event.description && (
                          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                            {event.description}
                          </div>
                        )}
                        {event.source && (
                          <div style={{
                            marginTop: 6,
                            fontSize: 10,
                            color: '#999',
                            fontFamily: '"Geist Mono", monospace'
                          }}>
                            Source: {event.source}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Data */}
            {auditData && (
              <div style={{
                background: 'white',
                padding: 20,
                borderRadius: 12,
                marginTop: 24,
                border: '1px solid #e0e0e0'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#333' }}>
                  Détails de l'audit
                </h3>
                <pre style={{
                  background: '#f9fafb',
                  padding: 16,
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: '"Geist Mono", monospace',
                  overflow: 'auto',
                  maxHeight: 400,
                  color: '#333'
                }}>
                  {JSON.stringify(auditData, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AuditTrailView;
