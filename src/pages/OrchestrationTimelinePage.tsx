// ════════════════════════════════════════════════════════════════════
// Sojori — Orchestration Timeline · Vue Détaillée d'un Plan
// Équivalent de NewWorkflowTimeline.jsx mais avec design moderne
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  CheckCircle,
  Schedule,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  Panel,
  Badge,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { getOrchestrationPlanDetail } from '../services/orchestrationService';
import type { OrchestrationPlanDetail, CategoryWorkflow } from '../types/orchestration.types';

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

function getStatusColor(status: string): string {
  const statusUpper = status.toUpperCase();
  if (statusUpper === 'COMPLETED' || statusUpper === 'EXECUTED') return t.success;
  if (statusUpper === 'FAILED') return t.error;
  if (statusUpper === 'IN_PROGRESS') return t.info;
  if (statusUpper === 'PENDING') return t.warning;
  if (statusUpper === 'CANCELLED' || statusUpper === 'SKIPPED') return t.text3;
  return t.text2;
}

function getStatusIcon(status: string) {
  const statusUpper = status.toUpperCase();
  if (statusUpper === 'COMPLETED' || statusUpper === 'EXECUTED')
    return <CheckCircle sx={{ fontSize: 16, color: t.success }} />;
  if (statusUpper === 'FAILED')
    return <ErrorIcon sx={{ fontSize: 16, color: t.error }} />;
  if (statusUpper === 'IN_PROGRESS')
    return <InfoIcon sx={{ fontSize: 16, color: t.info }} />;
  if (statusUpper === 'PENDING')
    return <Schedule sx={{ fontSize: 16, color: t.warning }} />;
  return null;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ════════════════════════════════════════════════════════════════════
// WORKFLOW CARD COMPONENT
// ════════════════════════════════════════════════════════════════════

interface WorkflowCardProps {
  workflow: CategoryWorkflow;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow }) => {
  const statusColor = getStatusColor(workflow.status);
  const statusIcon = getStatusIcon(workflow.status);

  const hasOrchestration =
    'requestTimeslot' in workflow.actions ||
    'assignStaff' in workflow.actions ||
    'deadlineEscalation' in workflow.actions;

  const isNotification = 'sendNotification' in workflow.actions;

  return (
    <Card
      sx={{
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        boxShadow: 'none',
        mb: 2,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {statusIcon}
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: t.text }}>
              {workflow.categoryDisplayLabel || workflow.category}
            </Typography>
            <Chip
              size="small"
              label={workflow.status}
              sx={{
                bgcolor: `${statusColor}20`,
                color: statusColor,
                fontWeight: 700,
                fontSize: 11,
                height: 22,
              }}
            />
            {workflow.categoryType && (
              <Chip
                size="small"
                label={workflow.categoryType}
                sx={{
                  bgcolor: t.purpleTint,
                  color: t.purple,
                  fontWeight: 600,
                  fontSize: 10,
                  height: 20,
                }}
              />
            )}
          </Stack>
          <Typography sx={{ fontSize: 11, color: t.text3 }}>
            {workflow.timeslotCode || workflow.workflowId}
          </Typography>
        </Stack>

        {/* Registration Stats */}
        {workflow.registrationStats && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: t.bg2, borderRadius: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text2, mb: 1 }}>
              📋 Voyageurs
            </Typography>
            <Stack direction="row" spacing={2}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 11, color: t.success }}>✓</Typography>
                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                  {workflow.registrationStats.validated} validés
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 11, color: t.warning }}>◐</Typography>
                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                  {workflow.registrationStats.draft} brouillon
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 11, color: t.error }}>✕</Typography>
                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                  {workflow.registrationStats.notRegistered} non enregistrés
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}

        {/* Declaration Info */}
        {workflow.declarationInfo && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: t.bg2, borderRadius: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text2, mb: 1 }}>
              🏛️ Déclaration
            </Typography>
            <Stack spacing={0.5}>
              {workflow.declarationInfo.arrivalDeclared !== undefined && (
                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                  Arrivée: {workflow.declarationInfo.arrivalDeclared ? '✓ Déclarée' : '✕ Non déclarée'}
                </Typography>
              )}
              {workflow.declarationInfo.departureDeclared !== undefined && (
                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                  Départ: {workflow.declarationInfo.departureDeclared ? '✓ Déclaré' : '✕ Non déclaré'}
                </Typography>
              )}
              {workflow.declarationInfo.method && (
                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                  Méthode: {workflow.declarationInfo.method}
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Orchestration Actions */}
        {hasOrchestration && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text2, mb: 1 }}>
              🎯 Actions Orchestration
            </Typography>

            {/* Request Timeslot */}
            {workflow.actions.requestTimeslot && (
              <Accordion
                sx={{
                  boxShadow: 'none',
                  border: `1px solid ${t.border}`,
                  mb: 1,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                      📅 Demande Créneau
                    </Typography>
                    <Chip
                      size="small"
                      label={workflow.actions.requestTimeslot.status}
                      sx={{
                        bgcolor: `${getStatusColor(workflow.actions.requestTimeslot.status)}20`,
                        color: getStatusColor(workflow.actions.requestTimeslot.status),
                        fontSize: 10,
                        height: 18,
                      }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    <Typography sx={{ fontSize: 11, color: t.text3 }}>
                      Template: {workflow.actions.requestTimeslot.config?.templateName || 'N/A'}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: t.text3 }}>
                      Canal: {workflow.actions.requestTimeslot.config?.channelPriority || 'WHATSAPP'}
                    </Typography>
                    {workflow.actions.requestTimeslot.execution?.response?.selectedHour !== undefined && (
                      <Typography sx={{ fontSize: 11, color: t.success, fontWeight: 600 }}>
                        ✓ Heure sélectionnée: {workflow.actions.requestTimeslot.execution.response.selectedHour}h
                      </Typography>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Assign Staff */}
            {workflow.actions.assignStaff && (
              <Accordion
                sx={{
                  boxShadow: 'none',
                  border: `1px solid ${t.border}`,
                  mb: 1,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                      👤 Assignation Staff
                    </Typography>
                    <Chip
                      size="small"
                      label={workflow.actions.assignStaff.status}
                      sx={{
                        bgcolor: `${getStatusColor(workflow.actions.assignStaff.status)}20`,
                        color: getStatusColor(workflow.actions.assignStaff.status),
                        fontSize: 10,
                        height: 18,
                      }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    <Typography sx={{ fontSize: 11, color: t.text3 }}>
                      Stratégie: {workflow.actions.assignStaff.config?.strategy || 'N/A'}
                    </Typography>
                    {workflow.actions.assignStaff.execution?.assignedStaff && (
                      <Typography sx={{ fontSize: 11, color: t.success, fontWeight: 600 }}>
                        ✓ Staff: {workflow.actions.assignStaff.execution.assignedStaff.name}
                      </Typography>
                    )}
                    {workflow.actions.assignStaff.execution?.attempts && (
                      <Typography sx={{ fontSize: 11, color: t.text3 }}>
                        Tentatives: {workflow.actions.assignStaff.execution.attempts.length}
                      </Typography>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Deadline Escalation */}
            {workflow.actions.deadlineEscalation && (
              <Accordion
                sx={{
                  boxShadow: 'none',
                  border: `1px solid ${t.border}`,
                  mb: 1,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                      ⏰ Escalade Deadline
                    </Typography>
                    <Chip
                      size="small"
                      label={workflow.actions.deadlineEscalation.status}
                      sx={{
                        bgcolor: `${getStatusColor(workflow.actions.deadlineEscalation.status)}20`,
                        color: getStatusColor(workflow.actions.deadlineEscalation.status),
                        fontSize: 10,
                        height: 18,
                      }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    <Typography sx={{ fontSize: 11, color: t.text3 }}>
                      Escalade: {workflow.actions.deadlineEscalation.config?.escalateTo || 'N/A'}
                    </Typography>
                    {workflow.actions.deadlineEscalation.config?.deadlineHoursBefore !== undefined && (
                      <Typography sx={{ fontSize: 11, color: t.text3 }}>
                        Deadline: {workflow.actions.deadlineEscalation.config.deadlineHoursBefore}h avant
                      </Typography>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}

        {/* Notification Actions */}
        {isNotification && workflow.actions.sendNotification && (
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text2, mb: 1 }}>
              🔔 Notification
            </Typography>
            <Accordion
              sx={{
                boxShadow: 'none',
                border: `1px solid ${t.border}`,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                    {workflow.actions.sendNotification.config?.templateName || 'Message'}
                  </Typography>
                  <Chip
                    size="small"
                    label={workflow.actions.sendNotification.status}
                    sx={{
                      bgcolor: `${getStatusColor(workflow.actions.sendNotification.status)}20`,
                      color: getStatusColor(workflow.actions.sendNotification.status),
                      fontSize: 10,
                      height: 18,
                    }}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                    Canal: {workflow.actions.sendNotification.config?.channel || 'WHATSAPP'}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                    Timing: {workflow.actions.sendNotification.config?.timing || 'N/A'}
                  </Typography>
                  {workflow.actions.sendNotification.execution?.sentAt && (
                    <Typography sx={{ fontSize: 11, color: t.success, fontWeight: 600 }}>
                      ✓ Envoyé: {formatDate(workflow.actions.sendNotification.execution.sentAt)}
                    </Typography>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {/* Timestamps */}
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2}>
          {workflow.createdAt && (
            <Typography sx={{ fontSize: 10, color: t.text4 }}>
              Créé: {formatDate(workflow.createdAt)}
            </Typography>
          )}
          {workflow.completedAt && (
            <Typography sx={{ fontSize: 10, color: t.text4 }}>
              Terminé: {formatDate(workflow.completedAt)}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════

export const OrchestrationTimelinePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<OrchestrationPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    if (!id) {
      setError('ID de réservation manquant');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const planData = await getOrchestrationPlanDetail(id);
      setPlan(planData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [id]);

  // Group workflows by status
  const activeWorkflows = plan?.workflows.filter(
    (w) => w.status === 'PENDING' || w.status === 'IN_PROGRESS'
  ) || [];
  const completedWorkflows = plan?.workflows.filter(
    (w) => w.status === 'COMPLETED' || w.status === 'EXECUTED'
  ) || [];
  const failedWorkflows = plan?.workflows.filter((w) => w.status === 'FAILED') || [];
  const otherWorkflows = plan?.workflows.filter(
    (w) => !activeWorkflows.includes(w) && !completedWorkflows.includes(w) && !failedWorkflows.includes(w)
  ) || [];

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Timeline']}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center',  mb: 3 }}>
          <Button
            onClick={() => navigate('/admin/orchestrator')}
            startIcon={<ArrowBackIcon />}
            sx={{ color: t.text2 }}
          >
            Retour
          </Button>
          <PageHeader
            title={`🟣 Orchestration · Plan ${plan?.reservationCode || id}`}
            count={plan ? `${plan.workflows.length} workflows` : undefined}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={fetchPlan}
            startIcon={<RefreshIcon />}
            variant="outlined"
            disabled={loading}
          >
            Rafraîchir
          </Button>
        </Stack>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Content */}
        {!loading && !error && plan && (
          <>
            {/* Reservation Info */}
            <Panel sx={{ mb: 3, p: 3 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: t.text, mb: 2 }}>
                📋 Informations Réservation
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" spacing={2}>
                  <Typography sx={{ fontSize: 13, color: t.text3, minWidth: 120 }}>
                    Réservation:
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: t.text, fontWeight: 600 }}>
                    {plan.reservationCode}
                  </Typography>
                </Stack>
                {plan.guestName && (
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ fontSize: 13, color: t.text3, minWidth: 120 }}>
                      Voyageur:
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: t.text }}>
                      {plan.guestName}
                    </Typography>
                  </Stack>
                )}
                {plan.listingName && (
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ fontSize: 13, color: t.text3, minWidth: 120 }}>
                      Listing:
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: t.text }}>
                      {plan.listingName}
                    </Typography>
                  </Stack>
                )}
                {plan.arrivalDate && (
                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ fontSize: 13, color: t.text3, minWidth: 120 }}>
                      Dates:
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: t.text }}>
                      {formatDate(plan.arrivalDate)} → {formatDate(plan.departureDate)}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={2}>
                  <Typography sx={{ fontSize: 13, color: t.text3, minWidth: 120 }}>
                    Système:
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: t.text }}>
                    {plan.systemType}
                  </Typography>
                </Stack>
              </Stack>
            </Panel>

            {/* Workflows Sections */}
            {activeWorkflows.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: t.warning, mb: 2 }}>
                  ⚠️ Workflows Actifs ({activeWorkflows.length})
                </Typography>
                {activeWorkflows.map((workflow) => (
                  <WorkflowCard key={workflow.workflowId} workflow={workflow} />
                ))}
              </Box>
            )}

            {completedWorkflows.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: t.success, mb: 2 }}>
                  ✅ Workflows Terminés ({completedWorkflows.length})
                </Typography>
                {completedWorkflows.map((workflow) => (
                  <WorkflowCard key={workflow.workflowId} workflow={workflow} />
                ))}
              </Box>
            )}

            {failedWorkflows.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: t.error, mb: 2 }}>
                  ❌ Workflows Échoués ({failedWorkflows.length})
                </Typography>
                {failedWorkflows.map((workflow) => (
                  <WorkflowCard key={workflow.workflowId} workflow={workflow} />
                ))}
              </Box>
            )}

            {otherWorkflows.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: t.text2, mb: 2 }}>
                  📦 Autres Workflows ({otherWorkflows.length})
                </Typography>
                {otherWorkflows.map((workflow) => (
                  <WorkflowCard key={workflow.workflowId} workflow={workflow} />
                ))}
              </Box>
            )}

            {plan.workflows.length === 0 && (
              <Alert severity="info">
                Aucun workflow trouvé pour cette réservation.
              </Alert>
            )}
          </>
        )}
      </Box>
    </DashboardWrapper>
  );
};

export default OrchestrationTimelinePage;
