// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration V2 — Atelier 2026
// OrchestrationView avec données réelles de l'API
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { API_BASE_URL as API_URL } from '../../config/backendServer.config';
import OrchestrationFilters from './filters/OrchestrationFilters';
import ReservationCard from './ReservationCard';
import WorkflowTimeline from './WorkflowTimeline';
import { mapReservationToWorkflows } from '../../utils/workflowMapper';
import { fetchOrchestrationPlanContext } from '../../utils/fetchOrchestrationPlanContext';
import cleanlinessService from '../../services/cleanlinessService';
import { dispatchWorkflowAction } from './WorkflowActionsHandler';
import ViewMessagesModal from './modals/ViewMessagesModal';
import ReassignStaffModal from './modals/ReassignStaffModal';

const OrchestrationView = () => {
  // States pour les filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState([]);
  const [selectedListings, setSelectedListings] = useState([]);
  const [planStatuses, setPlanStatuses] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [selectedReservation, setSelectedReservation] = useState(null);

  // States pour les données API
  const [reservations, setReservations] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [error, setError] = useState(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  // States pour les workflows de la réservation sélectionnée
  const [workflowsData, setWorkflowsData] = useState(null);
  const [planContext, setPlanContext] = useState(null);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [cleanlinessSaving, setCleanlinessSaving] = useState(false);

  // States pour les modales
  const [viewMessagesModal, setViewMessagesModal] = useState({ open: false, actionId: null, reservationNumber: null });
  const [reassignStaffModal, setReassignStaffModal] = useState({ open: false, actionId: null, reservationNumber: null, onRefresh: null });

  // Fetch réservations depuis l'API
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoadingReservations(true);
        setError(null);

        const params = new URLSearchParams({
          limit: '20',
          offset: '0',
          sortBy: sortBy,
          reservationStatus: 'ACTIVE'
        });

        if (selectedListings.length === 1) {
          params.append('listingId', selectedListings[0]);
        }

        const url = `${API_URL}/api/v1/orchestrator/reservations?${params.toString()}`;
        const response = await axios.get(url);

        if (response.data.success) {
          setReservations(response.data.data || []);
        }
      } catch (err) {
        console.error('[OrchestrationView] Erreur fetch réservations:', err);
        setError(err.message);
      } finally {
        setIsLoadingReservations(false);
      }
    };

    fetchReservations();
  }, [selectedListings, sortBy, listRefreshKey]);

  const loadPlanForReservation = async (reservationNumber) => {
    const url = `${API_URL}/api/v1/orchestrator/orchestration/plans/${reservationNumber}`;
    const response = await axios.get(url);
    if (!response.data.success) {
      setWorkflowsData({ workflows: [], daySeparators: [] });
      setPlanContext(null);
      return;
    }
    const planData = response.data.data;
    const enrichment = await fetchOrchestrationPlanContext(planData);
    const mapped = mapReservationToWorkflows(planData, enrichment);
    setWorkflowsData(mapped);
    setPlanContext({
      listingId: planData.listingId,
      listingName: planData.listingName,
      listingOperational: planData.listingOperational,
      checkInDate: planData.checkInDate,
      checkOutDate: planData.checkOutDate,
      workflows: planData.workflows,
    });
  };

  const handleCleanlinessChange = async (listingId, status) => {
    setCleanlinessSaving(true);
    try {
      const result = await cleanlinessService.updateListingStatus(listingId, status);
      if (!result.success) {
        throw new Error(result.message || 'Échec mise à jour propreté');
      }
      if (selectedReservation?.reservationNumber) {
        await loadPlanForReservation(selectedReservation.reservationNumber);
      }
    } finally {
      setCleanlinessSaving(false);
    }
  };

  // Fetch workflows when a reservation is selected
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!selectedReservation) {
        setWorkflowsData(null);
        setPlanContext(null);
        return;
      }

      try {
        setIsLoadingWorkflows(true);
        await loadPlanForReservation(selectedReservation.reservationNumber);
      } catch (err) {
        console.error('[OrchestrationView] Erreur fetch workflows:', err);
        setWorkflowsData({ workflows: [], daySeparators: [] });
        setPlanContext(null);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };

    fetchWorkflows();
  }, [selectedReservation]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatus([]);
    setSelectedListings([]);
    setPlanStatuses([]);
    setSortBy('recent');
  };

  // Message d'erreur si nécessaire
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Erreur lors du chargement des données: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box className="so-fade-in" sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>
      {/* En-tête */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2.25 }}>
        <Typography sx={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: 'var(--text-h)'
        }}>
          Plans
        </Typography>
        <Typography sx={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: '"Geist Mono", monospace',
        }}>
          {isLoadingReservations ? 'Chargement...' : `${reservations.length} réservation${reservations.length > 1 ? 's' : ''}`}
          {selectedReservation ? ` · ${selectedReservation.reservationNumber} sélectionnée` : ''}
        </Typography>
      </Box>

      {/* Filtres */}
      <OrchestrationFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        status={status}
        setStatus={setStatus}
        selectedListings={selectedListings}
        setSelectedListings={setSelectedListings}
        listings={[]} // TODO: Récupérer la liste des listings
        planStatuses={planStatuses}
        setPlanStatuses={setPlanStatuses}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onReset={resetFilters}
      />

      {/* Cartes de réservation (scroll horizontal) */}
      <Box sx={{ mb: 3, mt: 2 }}>
        <Typography sx={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-muted)',
          mb: 1.5,
          letterSpacing: '0.02em',
          textTransform: 'uppercase'
        }}>
          Réservations
        </Typography>

        {isLoadingReservations ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : reservations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'var(--text-muted)' }}>
            <Typography sx={{ fontSize: 14 }}>
              Aucune réservation active trouvée
            </Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 6,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: 3,
            }
          }}>
            {reservations.map(reservation => (
              <ReservationCard
                key={reservation.id || reservation.reservationNumber}
                reservation={reservation}
                selected={selectedReservation?.reservationNumber === reservation.reservationNumber}
                onClick={() => setSelectedReservation(reservation)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Timeline 3 niveaux */}
      {selectedReservation && (
        <Box sx={{ mt: 4 }}>
          <Typography sx={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-muted)',
            mb: 2,
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            Workflows — {selectedReservation.reservationNumber}
          </Typography>

          {isLoadingWorkflows ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : workflowsData && workflowsData.workflows.length > 0 ? (
            <WorkflowTimeline
              workflows={workflowsData.workflows}
              daySeparators={workflowsData.daySeparators}
              planContext={
                planContext?.listingId
                  ? {
                      listingId: planContext.listingId,
                      listingOperational: planContext.listingOperational,
                      checkInDate: planContext.checkInDate,
                      checkOutDate: planContext.checkOutDate,
                      onCleanlinessChange: cleanlinessSaving ? undefined : handleCleanlinessChange,
                    }
                  : null
              }
              onAction={async (action) => {
                // Handle action execution
                const { id: actionType, actionId, reservationNumber, executionId, lastMinute } = action;

                // Refresh callback après l'action
                const handleRefresh = async () => {
                  setIsLoadingWorkflows(true);
                  try {
                    await loadPlanForReservation(reservationNumber);
                  } catch (err) {
                    console.error('[OrchestrationView] Erreur refresh workflows:', err);
                  } finally {
                    setIsLoadingWorkflows(false);
                  }
                };

                // Dispatch action
                const result = await dispatchWorkflowAction(actionType, actionId, reservationNumber, handleRefresh, {
                  executionId,
                  lastMinute,
                });

                // Si l'action demande d'ouvrir une modale
                if (result?.openModal === 'view-messages') {
                  setViewMessagesModal({ open: true, actionId, reservationNumber });
                } else if (result?.openModal === 'reassign-staff') {
                  setReassignStaffModal({ open: true, actionId, reservationNumber, onRefresh: handleRefresh });
                }
              }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'var(--text-muted)' }}>
              <Typography sx={{ fontSize: 14 }}>
                Aucun workflow trouvé pour cette réservation
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Message si aucune réservation sélectionnée */}
      {!selectedReservation && (
        <Box sx={{
          mt: 6,
          textAlign: 'center',
          color: 'var(--text-muted)',
          p: 4
        }}>
          <Typography sx={{ fontSize: 14 }}>
            👆 Cliquez sur une réservation pour voir la timeline
          </Typography>
        </Box>
      )}

      {/* Modales */}
      <ViewMessagesModal
        open={viewMessagesModal.open}
        onClose={() => setViewMessagesModal({ open: false, actionId: null, reservationNumber: null })}
        actionId={viewMessagesModal.actionId}
        reservationNumber={viewMessagesModal.reservationNumber}
      />

      <ReassignStaffModal
        open={reassignStaffModal.open}
        onClose={() => setReassignStaffModal({ open: false, actionId: null, reservationNumber: null, onRefresh: null })}
        actionId={reassignStaffModal.actionId}
        reservationNumber={reassignStaffModal.reservationNumber}
        onRefresh={reassignStaffModal.onRefresh}
      />
    </Box>
  );
};

export default OrchestrationView;
