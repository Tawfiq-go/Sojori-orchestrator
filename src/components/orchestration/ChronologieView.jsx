// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — ChronologieView
// Affiche TOUS les workflows de TOUTES les réservations actives en timeline chronologique
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { API_BASE_URL as API_URL } from '../../config/backendServer.config';
import WorkflowTimeline from './WorkflowTimeline';
import { mapReservationToWorkflows } from '../../utils/workflowMapper';
import { dispatchWorkflowAction } from './WorkflowActionsHandler';
import ViewMessagesModal from './modals/ViewMessagesModal';
import ReassignStaffModal from './modals/ReassignStaffModal';

const ChronologieView = () => {
  const [workflows, setWorkflows] = useState([]);
  const [daySeparators, setDaySeparators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // States pour les modales
  const [viewMessagesModal, setViewMessagesModal] = useState({ open: false, actionId: null, reservationNumber: null });
  const [reassignStaffModal, setReassignStaffModal] = useState({ open: false, actionId: null, reservationNumber: null, onRefresh: null });

  useEffect(() => {
    const fetchAllWorkflows = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch all active reservations
        const reservationsUrl = `${API_URL}/api/v1/orchestrator/reservations?limit=100&reservationStatus=ACTIVE&sortBy=checkin_asc`;
        const reservationsResponse = await axios.get(reservationsUrl);

        if (!reservationsResponse.data.success) {
          throw new Error('Failed to fetch reservations');
        }

        const reservations = reservationsResponse.data.data || [];

        // 2. Fetch workflows for each reservation
        const workflowsPromises = reservations.map(async (reservation) => {
          try {
            const planUrl = `${API_URL}/api/v1/orchestrator/orchestration/plans/${reservation.reservationNumber}`;
            const planResponse = await axios.get(planUrl);

            if (planResponse.data.success && planResponse.data.data) {
              return {
                reservationNumber: reservation.reservationNumber,
                guestName: reservation.guestName,
                listingName: reservation.listingName,
                checkInDate: reservation.arrivalDate,
                checkOutDate: reservation.departureDate,
                planData: planResponse.data.data,
              };
            }
            return null;
          } catch (err) {
            console.error(`[ChronologieView] Error fetching plan for ${reservation.reservationNumber}:`, err);
            return null;
          }
        });

        const allPlans = (await Promise.all(workflowsPromises)).filter(Boolean);

        // 3. Merge all workflows from all reservations into a single timeline
        const allWorkflows = [];
        const reservationMap = new Map(); // To track which workflow belongs to which reservation

        allPlans.forEach((plan) => {
          const mapped = mapReservationToWorkflows(plan.planData);

          mapped.workflows.forEach((workflow) => {
            allWorkflows.push(workflow);
            reservationMap.set(workflow.id, {
              reservationNumber: plan.reservationNumber,
              guestName: plan.guestName,
              listingName: plan.listingName,
            });
          });
        });

        // 4. Sort all workflows by creation date (chronological order)
        allWorkflows.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateA - dateB;
        });

        // 5. Build day separators for the merged timeline
        const separators = [];
        const dateGroups = new Map();

        allWorkflows.forEach((workflow, index) => {
          // Extract date only (DD/MM/YYYY)
          const dateOnly = workflow.createdAt.split(' ')[0];
          if (!dateGroups.has(dateOnly)) {
            dateGroups.set(dateOnly, { index, workflow });
          }
        });

        // Add separator before each new day (except first)
        let isFirst = true;
        dateGroups.forEach(({ index, workflow }, date) => {
          if (!isFirst) {
            const reservation = reservationMap.get(workflow.id);
            separators.push({
              beforeId: allWorkflows[index].id,
              label: `${date} · ${reservation?.listingName || 'N/A'}`,
            });
          }
          isFirst = false;
        });

        setWorkflows(allWorkflows);
        setDaySeparators(separators);

      } catch (err) {
        console.error('[ChronologieView] Error fetching workflows:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllWorkflows();
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Erreur lors du chargement de la chronologie: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box className="so-fade-in" sx={{ width: '100%', minHeight: '100%' }}>
      {/* En-tête */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 3 }}>
        <Typography sx={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: 'var(--text-h)'
        }}>
          Chronologie
        </Typography>
        <Typography sx={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: '"Geist Mono", monospace',
        }}>
          {isLoading ? 'Chargement...' : `${workflows.length} workflow${workflows.length > 1 ? 's' : ''} en cours`}
        </Typography>
      </Box>

      {/* Timeline globale */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : workflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'var(--text-muted)' }}>
          <Typography sx={{ fontSize: 14 }}>
            Aucun workflow actif trouvé
          </Typography>
        </Box>
      ) : (
        <WorkflowTimeline
          workflows={workflows}
          daySeparators={daySeparators}
          onAction={async (action) => {
            // Handle action execution
            const { id: actionType, actionId, reservationNumber } = action;

            // Refresh callback après l'action
            const handleRefresh = async () => {
              // Refetch all workflows
              setIsLoading(true);
              try {
                // Re-fetch all reservations and workflows
                const reservationsUrl = `${API_URL}/api/v1/orchestrator/reservations?limit=100&reservationStatus=ACTIVE&sortBy=checkin_asc`;
                const reservationsResponse = await axios.get(reservationsUrl);
                const reservations = reservationsResponse.data.data || [];

                const workflowsPromises = reservations.map(async (reservation) => {
                  try {
                    const planUrl = `${API_URL}/api/v1/orchestrator/orchestration/plans/${reservation.reservationNumber}`;
                    const planResponse = await axios.get(planUrl);
                    if (planResponse.data.success && planResponse.data.data) {
                      return { reservationNumber: reservation.reservationNumber, guestName: reservation.guestName, listingName: reservation.listingName, planData: planResponse.data.data };
                    }
                    return null;
                  } catch (err) {
                    console.error(`[ChronologieView] Error refetching plan for ${reservation.reservationNumber}:`, err);
                    return null;
                  }
                });

                const allPlans = (await Promise.all(workflowsPromises)).filter(Boolean);
                const allWorkflows = [];
                allPlans.forEach((plan) => {
                  const mapped = mapReservationToWorkflows(plan.planData);
                  mapped.workflows.forEach((workflow) => {
                    allWorkflows.push(workflow);
                  });
                });
                allWorkflows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                setWorkflows(allWorkflows);
              } catch (err) {
                console.error('[ChronologieView] Erreur refresh workflows:', err);
              } finally {
                setIsLoading(false);
              }
            };

            // Dispatch action
            const result = await dispatchWorkflowAction(actionType, actionId, reservationNumber, handleRefresh);

            // Si l'action demande d'ouvrir une modale
            if (result?.openModal === 'view-messages') {
              setViewMessagesModal({ open: true, actionId, reservationNumber });
            } else if (result?.openModal === 'reassign-staff') {
              setReassignStaffModal({ open: true, actionId, reservationNumber, onRefresh: handleRefresh });
            }
          }}
        />
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

export default ChronologieView;
