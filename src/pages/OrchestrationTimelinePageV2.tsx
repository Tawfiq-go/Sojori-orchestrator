// ════════════════════════════════════════════════════════════════════
// Sojori — Orchestration Timeline V2 · Layout Colonnes Verticales
// Équivalent exact de NewWorkflowTimeline.jsx avec design Aurora
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
  Drawer,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  Panel,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { getOrchestrationPlanDetail } from '../services/orchestrationService';
import cleanlinessService from '../services/cleanlinessService';
import type { DisplayCleanliness } from '../utils/cleanlinessDisplay';
import type { OrchestrationPlanDetail, CategoryWorkflow } from '../types/orchestration.types';
import { CleaningSojoriSchedulePanel } from '../components/orchestration/CleaningSojoriSchedulePanel';

// ════════════════════════════════════════════════════════════════════
// COULEURS PAR STATUT (aligné avec ancien dashboard)
// ════════════════════════════════════════════════════════════════════

function getGranularStatusColor(status: string): string {
  // error: Rouge (FAILED, RETARD, REMINDERS_EXHAUSTED)
  if (status === 'FAILED' || status === 'RETARD' || status === 'REMINDERS_EXHAUSTED') return t.error;

  // warning: Orange (TERMINATED, ASSIGNMENTS_EXHAUSTED, NO_STAFF_AVAILABLE, LM_RELANCE, REMINDED, INITIAL_SENT)
  if (
    status === 'TERMINATED' ||
    status === 'ASSIGNMENTS_EXHAUSTED' ||
    status === 'NO_STAFF_AVAILABLE' ||
    status === 'LM_RELANCE' ||
    status === 'REMINDED' ||
    status === 'INITIAL_SENT'
  ) {
    return t.warning;
  }

  // success: Vert (COMPLETED, DONE)
  if (status === 'COMPLETED' || status === 'DONE' || status === 'EXECUTED') return t.success;

  // secondary: Gris clair (LAST_SENT)
  if (status === 'LAST_SENT') return t.text3;

  // default: Gris neutre
  return t.text2;
}

function getWorkflowStatusColor(status: string): string {
  const s = status.toUpperCase();

  if (s === 'FAILED' || s === 'CANCELLED' || s === 'LAST_RELANCE') return t.error;
  if (s === 'COMPLETED' || s === 'EXECUTED') return t.success;
  if (s === 'IN_PROGRESS') return t.info;
  if (s === 'NOT_ASSIGNED' || s === 'PENDING') return t.warning;

  return t.text2;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Complété',
    EXECUTED: 'Exécuté',
    FAILED: 'Échec',
    CANCELLED: 'Annulé',
    SKIPPED: 'Ignoré',
    RETARD: 'Retard',
    REMINDED: 'Relancé',
    INITIAL_SENT: 'Envoyé',
    DONE: 'Terminé',
    TERMINATED: 'Terminé',
    NO_STAFF_AVAILABLE: 'Pas de staff',
    ASSIGNMENTS_EXHAUSTED: 'Tentatives épuisées',
    LM_RELANCE: 'Last Minute',
    REMINDERS_EXHAUSTED: 'Relances terminées',
  };

  return labels[status] || status;
}

// ════════════════════════════════════════════════════════════════════
// ACTION CARD COMPONENT (dans une colonne)
// ════════════════════════════════════════════════════════════════════

interface ActionCardProps {
  action: any;
  actionType: 'requestTimeslot' | 'assignStaff' | 'createTask' | 'deadlineEscalation' | 'sendNotification';
  workflow: CategoryWorkflow;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, actionType, workflow, onClick }) => {
  const status = action.status || 'PENDING';
  const statusColor = getGranularStatusColor(status);

  // Icônes par type d'action
  const icons: Record<string, string> = {
    requestTimeslot: '📱',
    assignStaff: '👤',
    createTask: '📋',
    deadlineEscalation: '⏰',
    sendNotification: '🔔',
  };

  const labels: Record<string, string> = {
    requestTimeslot: 'WhatsApp',
    assignStaff: 'Staff',
    createTask: 'Tâche',
    deadlineEscalation: 'Deadline',
    sendNotification: 'Notif',
  };

  const icon = icons[actionType] || '●';
  const label = labels[actionType] || actionType;

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        mb: 1,
        bgcolor: `${statusColor}10`,
        border: `2px solid ${statusColor}`,
        borderRadius: 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${statusColor}30`,
        },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center',  mb: 0.5 }}>
        <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: statusColor }}>
          {label}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          size="small"
          label={getStatusLabel(status)}
          sx={{
            bgcolor: `${statusColor}20`,
            color: statusColor,
            fontWeight: 700,
            fontSize: 9,
            height: 18,
          }}
        />
      </Stack>

      {/* Informations spécifiques par type d'action */}
      {actionType === 'requestTimeslot' && action.execution?.response?.selectedHour !== undefined && (
        <Typography sx={{ fontSize: 11, color: t.success, fontWeight: 600 }}>
          ✓ Heure: {action.execution.response.selectedHour}h
        </Typography>
      )}

      {actionType === 'assignStaff' && action.execution?.assignedStaff && (
        <Typography sx={{ fontSize: 11, color: t.success, fontWeight: 600 }}>
          ✓ {action.execution.assignedStaff.name}
        </Typography>
      )}

      {actionType === 'assignStaff' && action.execution?.attempts && (
        <Typography sx={{ fontSize: 10, color: t.text3 }}>
          {action.execution.attempts.length}/3 essais
        </Typography>
      )}

      {actionType === 'sendNotification' && action.config?.templateName && (
        <Typography sx={{ fontSize: 10, color: t.text3 }}>
          {action.config.templateName}
        </Typography>
      )}
    </Box>
  );
};

// ════════════════════════════════════════════════════════════════════
// WORKFLOW COLUMN COMPONENT (colonne verticale)
// ════════════════════════════════════════════════════════════════════

interface WorkflowColumnProps {
  workflow: CategoryWorkflow;
  plan: OrchestrationPlanDetail | null;
  onCardClick: (action: any, actionType: string, workflow: CategoryWorkflow) => void;
  onCleanlinessChange?: (listingId: string, status: DisplayCleanliness) => void | Promise<void>;
}

const WorkflowColumn: React.FC<WorkflowColumnProps> = ({
  workflow,
  plan,
  onCardClick,
  onCleanlinessChange,
}) => {
  const statusColor = getWorkflowStatusColor(workflow.status);

  // Collecter toutes les actions
  const actions = workflow.actions;
  const actionEntries: Array<{ action: any; type: string }> = [];

  if (actions.requestTimeslot) actionEntries.push({ action: actions.requestTimeslot, type: 'requestTimeslot' });
  if (actions.assignStaff) actionEntries.push({ action: actions.assignStaff, type: 'assignStaff' });
  if (actions.createTask) actionEntries.push({ action: actions.createTask, type: 'createTask' });
  if (actions.deadlineEscalation) actionEntries.push({ action: actions.deadlineEscalation, type: 'deadlineEscalation' });
  if (actions.sendNotification) actionEntries.push({ action: actions.sendNotification, type: 'sendNotification' });

  return (
    <Box
      sx={{
        minWidth: 200,
        maxWidth: 220,
        bgcolor: t.bg1,
        borderRadius: 2,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Header colonne */}
      <Box
        sx={{
          p: 1.5,
          bgcolor: `${statusColor}15`,
          borderBottom: `2px solid ${statusColor}`,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, mb: 0.5 }}>
          {workflow.categoryDisplayLabel || workflow.category}
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Chip
            size="small"
            label={getStatusLabel(workflow.status)}
            sx={{
              bgcolor: `${statusColor}20`,
              color: statusColor,
              fontWeight: 700,
              fontSize: 9,
              height: 18,
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
                fontSize: 8,
                height: 16,
              }}
            />
          )}
        </Stack>

        {/* Registration stats */}
        {workflow.registrationStats && (
          <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.5 }}>
            📋 {workflow.registrationStats.validated}V / {workflow.registrationStats.draft}D / {workflow.registrationStats.notRegistered}N
          </Typography>
        )}

        {(workflow.categoryType === 'CLEANING_SOJORI' || workflow.category === 'cleaning_sojori') && (
          <CleaningSojoriSchedulePanel
            metadata={(workflow as any).metadata}
            compact
            listingId={plan?.listingId}
            listingOperational={plan?.listingOperational}
            checkInDate={plan?.checkInDate}
            checkOutDate={plan?.checkOutDate}
            onCleanlinessChange={onCleanlinessChange}
          />
        )}
      </Box>

      {/* Actions cards empilées */}
      <Box sx={{ p: 1.5 }}>
        {actionEntries.length === 0 && (
          <Typography sx={{ fontSize: 11, color: t.text4, fontStyle: 'italic' }}>
            Aucune action
          </Typography>
        )}

        {actionEntries.map((entry, idx) => (
          <ActionCard
            key={idx}
            action={entry.action}
            actionType={entry.type as any}
            workflow={workflow}
            onClick={() => onCardClick(entry.action, entry.type, workflow)}
          />
        ))}

        {/* Count indicator */}
        {actionEntries.length > 0 && (
          <Typography sx={{ fontSize: 10, color: t.text4, mt: 1, textAlign: 'center' }}>
            {actionEntries.length}/{actionEntries.length}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// ════════════════════════════════════════════════════════════════════
// DETAIL DRAWER (Config + Audit)
// ════════════════════════════════════════════════════════════════════

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  action: any;
  actionType: string;
  workflow: CategoryWorkflow;
  plan: OrchestrationPlanDetail | null;
  onCleanlinessChange?: (listingId: string, status: DisplayCleanliness) => void | Promise<void>;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  open,
  onClose,
  action,
  actionType,
  workflow,
  plan,
  onCleanlinessChange,
}) => {
  const [tab, setTab] = useState(0);

  if (!action) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 450, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}`, bgcolor: t.bg2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.text }}>
                {workflow.categoryDisplayLabel || workflow.category}
              </Typography>
              <Typography sx={{ fontSize: 11, color: t.text3 }}>
                Action: {actionType}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: `1px solid ${t.border}` }}>
          <Tab label="Config" sx={{ fontSize: 12, fontWeight: 600 }} />
          <Tab label="Audit" sx={{ fontSize: 12, fontWeight: 600 }} />
        </Tabs>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {tab === 0 && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                📋 Configuration
              </Typography>

              {/* Status */}
              <Box>
                <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Statut</Typography>
                <Chip
                  size="small"
                  label={getStatusLabel(action.status || 'PENDING')}
                  sx={{
                    bgcolor: `${getGranularStatusColor(action.status)}20`,
                    color: getGranularStatusColor(action.status),
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                />
              </Box>

              {(workflow.categoryType === 'CLEANING_SOJORI' || workflow.category === 'cleaning_sojori') && (
                <CleaningSojoriSchedulePanel
                  metadata={(workflow as any).metadata}
                  listingId={plan?.listingId}
                  listingOperational={plan?.listingOperational}
                  checkInDate={plan?.checkInDate}
                  checkOutDate={plan?.checkOutDate}
                  onCleanlinessChange={onCleanlinessChange}
                />
              )}

              {/* Config details */}
              {action.config && (
                <Box sx={{ p: 2, bgcolor: t.bg2, borderRadius: 1 }}>
                  <pre style={{ fontSize: 10, margin: 0, whiteSpace: 'pre-wrap', color: t.text2 }}>
                    {JSON.stringify(action.config, null, 2)}
                  </pre>
                </Box>
              )}

              {(workflow.categoryType === 'CLEANING_SOJORI' || workflow.category === 'cleaning_sojori') && plan && (
                <CleaningSojoriSchedulePanel
                  metadata={(workflow as any).metadata}
                  listingId={plan.listingId}
                  listingOperational={plan.listingOperational}
                  checkInDate={plan.checkInDate}
                  checkOutDate={plan.checkOutDate}
                  onCleanlinessChange={onCleanlinessChange}
                />
              )}

              {(workflow as any).metadata?.scheduling?.logs?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text, mb: 0.5 }}>
                    📜 Logs planification
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2, fontSize: 11, color: t.text2 }}>
                    {((workflow as any).metadata.scheduling.logs as string[]).map((line: string, i: number) => (
                      <li key={i}>{line}</li>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Execution details */}
              {action.execution && (
                <>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, mt: 2 }}>
                    ⚡ Exécution
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: t.bg2, borderRadius: 1 }}>
                    <pre style={{ fontSize: 10, margin: 0, whiteSpace: 'pre-wrap', color: t.text2 }}>
                      {JSON.stringify(action.execution, null, 2)}
                    </pre>
                  </Box>
                </>
              )}
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                📊 Historique d'audit
              </Typography>

              <Alert severity="info" sx={{ fontSize: 12 }}>
                L'audit détaillé sera disponible prochainement via l'API
                GET /api/v1/orchestrator/workflow-audit/:workflowId
              </Alert>

              {/* Placeholder pour les logs futurs */}
              <Box sx={{ p: 2, bgcolor: t.bg2, borderRadius: 1 }}>
                <Typography sx={{ fontSize: 11, color: t.text3, fontStyle: 'italic' }}>
                  Aucun log d'audit disponible pour cette action.
                </Typography>
              </Box>
            </Stack>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════

export const OrchestrationTimelinePageV2: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<OrchestrationPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<CategoryWorkflow | null>(null);

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

  const handleCardClick = (action: any, actionType: string, workflow: CategoryWorkflow) => {
    setSelectedAction(action);
    setSelectedActionType(actionType);
    setSelectedWorkflow(workflow);
    setDrawerOpen(true);
  };

  const handleCleanlinessChange = async (listingId: string, status: DisplayCleanliness) => {
    const result = await cleanlinessService.updateListingStatus(listingId, status);
    if (!result.success) {
      throw new Error(result.message || 'Échec mise à jour propreté');
    }
    await fetchPlan();
  };

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
            title={`🟣 Orchestration · ${plan?.reservationCode || id}`}
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

        {/* Content: Info + Colonnes */}
        {!loading && !error && plan && (
          <>
            {/* Reservation Info */}
            <Panel sx={{ mb: 3, p: 2 }}>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>Voyageur</Typography>
                  <Typography sx={{ fontSize: 13, color: t.text, fontWeight: 600 }}>
                    {plan.guestName || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>Listing</Typography>
                  <Typography sx={{ fontSize: 13, color: t.text, fontWeight: 600 }}>
                    {plan.listingName || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>Dates</Typography>
                  <Typography sx={{ fontSize: 13, color: t.text, fontWeight: 600 }}>
                    {plan.arrivalDate && new Date(plan.arrivalDate).toLocaleDateString('fr-FR')} →{' '}
                    {plan.departureDate && new Date(plan.departureDate).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>
              </Stack>
            </Panel>

            {/* Colonnes Timeline */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 2,
                '&::-webkit-scrollbar': { height: 8 },
                '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 4 },
              }}
            >
              {plan.workflows.map((workflow) => (
                <WorkflowColumn
                  key={workflow.workflowId}
                  workflow={workflow}
                  plan={plan}
                  onCardClick={handleCardClick}
                  onCleanlinessChange={handleCleanlinessChange}
                />
              ))}

              {plan.workflows.length === 0 && (
                <Alert severity="info">
                  Aucun workflow trouvé pour cette réservation.
                </Alert>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Detail Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        action={selectedAction}
        actionType={selectedActionType}
        workflow={selectedWorkflow!}
        plan={plan}
        onCleanlinessChange={handleCleanlinessChange}
      />
    </DashboardWrapper>
  );
};

export default OrchestrationTimelinePageV2;
