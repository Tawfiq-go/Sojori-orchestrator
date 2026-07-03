// ════════════════════════════════════════════════════════════════════
// Sojori — OrchestrationPlansPageV2 🟣 LAYOUT COLONNES VERTICALES
// Exactement comme l'ancien dashboard avec cartes réservations + colonnes workflows
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Stack, Typography, Button, Alert, CircularProgress,
  Chip, Tabs, Tab, Card, LinearProgress,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader, tokens as t } from '../components/dashboard/DashboardV2.components';
import { getOrchestrationPlans, getOrchestrationPlanDetail } from '../services/orchestrationService';
import cleanlinessService from '../services/cleanlinessService';
import { CleaningSojoriSchedulePanel } from '../components/orchestration/CleaningSojoriSchedulePanel';
import type { DisplayCleanliness } from '../utils/cleanlinessDisplay';
import type { OrchestrationPlan, OrchestrationPlanDetail, CategoryWorkflow } from '../types/orchestration.types';

// ════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════

function getStatusColor(status: string): string {
  if (status === 'COMPLETED' || status === 'EXECUTED') return t.success;
  if (status === 'FAILED' || status === 'error') return t.error;
  if (status === 'IN_PROGRESS' || status === 'active') return t.info;
  if (status === 'PENDING') return t.warning;
  return t.text2;
}

// Transform workflow actions into displayable action cards
function transformWorkflowToActions(workflow: CategoryWorkflow) {
  const actions: Array<{
    type: string;
    label: string;
    status: string;
    icon: string;
    detail?: string;
  }> = [];

  // Request Timeslot action
  if (workflow.actions.requestTimeslot) {
    const action = workflow.actions.requestTimeslot;
    let detail = '';
    if (action.execution?.initialMessage) {
      const date = new Date(action.execution.initialMessage.sentAt);
      detail = `${action.execution.initialMessage.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (action.deadline) {
      detail = `Deadline: ${new Date(action.deadline).toLocaleDateString('fr-FR')}`;
    }
    actions.push({
      type: 'requestTimeslot',
      label: 'Demande créneau',
      status: action.status,
      icon: '📱',
      detail,
    });
  }

  // Assign Staff action
  if (workflow.actions.assignStaff) {
    const action = workflow.actions.assignStaff;
    const attempts = action.execution?.attempts?.length || 0;
    const assigned = action.execution?.assignedStaff;
    let detail = assigned
      ? `Assigné: ${assigned.staffName}`
      : `${attempts}/3 essais`;
    actions.push({
      type: 'assignStaff',
      label: 'Staff',
      status: action.status,
      icon: '👤',
      detail,
    });
  }

  // Deadline Escalation action
  if (workflow.actions.deadlineEscalation) {
    const action = workflow.actions.deadlineEscalation;
    let detail = '';
    if (action.execution?.deadlineReachedAt) {
      detail = 'En retard';
    } else if (action.deadline) {
      detail = `Deadline: ${new Date(action.deadline).toLocaleDateString('fr-FR')}`;
    }
    actions.push({
      type: 'deadline',
      label: 'Deadline',
      status: action.status,
      icon: '⏰',
      detail,
    });
  }

  // Send Notification action
  if (workflow.actions.sendNotification) {
    const action = workflow.actions.sendNotification;
    let detail = '';
    if (action.execution) {
      const date = new Date(action.execution.sentAt);
      detail = `${action.execution.channel} · ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    actions.push({
      type: 'notification',
      label: 'Notification',
      status: action.status,
      icon: action.status === 'COMPLETED' ? '✅' : '🔔',
      detail,
    });
  }

  return actions;
}

function isCleaningSojoriWorkflow(workflow: CategoryWorkflow): boolean {
  return (
    workflow.categoryType === 'CLEANING_SOJORI' ||
    workflow.category === 'cleaning_sojori'
  );
}

// ════════════════════════════════════════════════════════════════════
// RESERVATION CARD (horizontal, en haut)
// ════════════════════════════════════════════════════════════════════

interface ReservationCardProps {
  plan: OrchestrationPlan;
  onSelect: () => void;
  selected: boolean;
}

const ReservationCard: React.FC<ReservationCardProps> = ({ plan, onSelect, selected }) => {
  const totalWorkflows = plan.eventCounts?.total || 0;
  const completedWorkflows = plan.eventCounts?.executed || 0;
  const progress = totalWorkflows > 0 ? (completedWorkflows / totalWorkflows) * 100 : 0;

  return (
    <Card
      onClick={onSelect}
      sx={{
        minWidth: 200,
        maxWidth: 220,
        p: 2,
        cursor: 'pointer',
        border: selected ? `2px solid ${t.primary}` : `1px solid ${t.border}`,
        borderRadius: 2,
        bgcolor: selected ? t.primaryTint : t.bg1,
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(26,20,8,0.1)',
        },
      }}
    >
      {/* Code réservation */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center',  mb: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3 }}>
          {plan.reservationNumber}
        </Typography>
        <Chip
          size="small"
          label="Active"
          sx={{
            bgcolor: t.success + '20',
            color: t.success,
            fontWeight: 700,
            fontSize: 9,
            height: 16,
          }}
        />
      </Stack>

      {/* Listing */}
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, mb: 0.5 }}>
        {plan.listingName}
      </Typography>

      {/* Guest */}
      <Typography sx={{ fontSize: 11, color: t.text3, mb: 1 }}>
        👤 {plan.guestName}
      </Typography>

      {/* Dates */}
      <Typography sx={{ fontSize: 10, color: t.text3, mb: 1.5 }}>
        📅 {new Date(plan.arrivalDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → {new Date(plan.departureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
      </Typography>

      {/* Progress */}
      <Box sx={{ mb: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: t.bg2,
            '& .MuiLinearProgress-bar': {
              bgcolor: progress === 100 ? t.success : t.warning,
              borderRadius: 3,
            },
          }}
        />
      </Box>
      <Typography sx={{ fontSize: 10, color: t.text3, textAlign: 'right' }}>
        {completedWorkflows}/{totalWorkflows}
      </Typography>
    </Card>
  );
};

// ════════════════════════════════════════════════════════════════════
// WORKFLOW COLUMN (colonnes verticales)
// ════════════════════════════════════════════════════════════════════

interface WorkflowColumnProps {
  title: string;
  badge?: string;
  timeslotCode?: string;
  actions: Array<{
    type: string;
    label: string;
    status: string;
    icon: string;
    detail?: string;
  }>;
  cleaningPanel?: React.ReactNode;
}

const WorkflowColumn: React.FC<WorkflowColumnProps> = ({
  title,
  badge,
  timeslotCode,
  actions,
  cleaningPanel,
}) => {
  return (
    <Box
      sx={{
        minWidth: 200,
        maxWidth: 220,
        bgcolor: t.bg1,
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          bgcolor: t.bg2,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text, mb: 0.5 }}>
          {title}
        </Typography>
        <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }}>
          {badge && (
            <Chip
              size="small"
              label={badge}
              sx={{
                bgcolor: t.infoTint,
                color: t.info,
                fontWeight: 600,
                fontSize: 9,
                height: 16,
              }}
            />
          )}
          {timeslotCode && (
            <Chip
              size="small"
              label={timeslotCode}
              sx={{
                bgcolor: t.bg1,
                color: t.text2,
                fontWeight: 600,
                fontSize: 8,
                height: 16,
                fontFamily: '"Geist Mono", monospace',
              }}
            />
          )}
        </Stack>
        {cleaningPanel}
      </Box>

      {/* Actions */}
      <Box sx={{ p: 1.5 }}>
        {actions.map((action, idx) => {
          const statusColor = getStatusColor(action.status);
          return (
            <Box
              key={idx}
              sx={{
                p: 1.5,
                mb: 1,
                bgcolor: `${statusColor}10`,
                border: `1px solid ${statusColor}`,
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
                <Typography sx={{ fontSize: 12 }}>{action.icon}</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: statusColor }}>
                  {action.label}
                </Typography>
              </Stack>
              <Chip
                size="small"
                label={action.status}
                sx={{
                  bgcolor: `${statusColor}20`,
                  color: statusColor,
                  fontWeight: 700,
                  fontSize: 9,
                  height: 16,
                }}
              />
              {action.detail && (
                <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.5 }}>
                  {action.detail}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════

export default function OrchestrationPlansPageV2() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState<OrchestrationPlan[]>([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number | null>(null);
  const [planDetail, setPlanDetail] = useState<OrchestrationPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanlinessSaving, setCleanlinessSaving] = useState(false);

  const handleCleanlinessChange = async (listingId: string, status: DisplayCleanliness) => {
    setCleanlinessSaving(true);
    try {
      const result = await cleanlinessService.updateListingStatus(listingId, status);
      if (!result.success) {
        throw new Error(result.message || 'Échec mise à jour propreté');
      }
      if (result.data && planDetail) {
        setPlanDetail({
          ...planDetail,
          listingOperational: {
            ...planDetail.listingOperational,
            listingId,
            cleanlinessStatus_v2: result.data.cleanlinessStatus_v2,
            cleanlinessStatus: result.data.cleanlinessStatus,
            cleanlinessEmergency: result.data.cleanlinessEmergency,
            occupancyStatus: result.data.occupancyStatus,
          },
        });
      }
      const rn = selectedPlan?.reservationNumber;
      if (rn) {
        const detail = await getOrchestrationPlanDetail(rn);
        setPlanDetail(detail);
      }
    } finally {
      setCleanlinessSaving(false);
    }
  };

  const handleTabChange = (_: any, newValue: number) => {
    setTab(newValue);
    if (newValue === 1) navigate('/orchestration'); // Chronologie
    if (newValue === 2) navigate('/orchestration/events'); // Événements
    if (newValue === 4) navigate('/orchestration/config'); // Configuration
  };

  const fetchData = async () => {
    console.log('🔄 Fetching orchestration plans...');
    setLoading(true);
    setError(null);
    try {
      const response = await getOrchestrationPlans({ limit: 10, reservationStatus: 'ACTIVE' });
      console.log('📦 API response:', response);

      if (response.success && response.data) {
        console.log('✅ Plans loaded:', response.data.length, 'plans');
        console.log('📋 Plan list:', response.data.map(p => ({
          reservationNumber: p.reservationNumber,
          listingName: p.listingName,
          guestName: p.guestName
        })));
        setPlans(response.data);
      }
    } catch (err: any) {
      console.error('❌ Error loading plans:', err);
      setError(err.message || 'Erreur lors du chargement des plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check URL for plan parameter and pre-select if valid
  useEffect(() => {
    const planParam = searchParams.get('plan');
    console.log('🔍 URL check - planParam:', planParam);
    console.log('📋 Plans loaded:', plans.length);

    if (planParam && plans.length > 0) {
      const idx = plans.findIndex(p => p.reservationNumber === planParam);
      console.log('🎯 Found plan index:', idx);

      if (idx !== -1) {
        console.log('✅ Pre-selecting plan:', plans[idx].reservationNumber, plans[idx].listingName);
        setSelectedPlanIndex(idx);

        // Load plan detail
        const loadDetail = async () => {
          console.log('🔄 Fetching plan detail from URL param:', planParam);
          setLoadingDetail(true);
          try {
            const detail = await getOrchestrationPlanDetail(planParam);
            console.log('✅ Plan detail loaded from URL:', detail);
            console.log('📋 Workflows count:', detail.workflows?.length || 0);
            setPlanDetail(detail);
          } catch (err: any) {
            console.error('❌ Error loading plan detail from URL:', err);
            setPlanDetail(null);
          } finally {
            setLoadingDetail(false);
          }
        };
        loadDetail();
      } else {
        console.log('❌ Plan not found in loaded plans');
      }
    }
  }, [plans, searchParams]);

  // Handle plan selection and update URL
  const handleSelectPlan = async (idx: number) => {
    const plan = plans[idx];
    console.log('👆 Click on plan:', plan.reservationNumber, plan.listingName);
    console.log('📌 Setting selected index:', idx);

    setSelectedPlanIndex(idx);
    setSearchParams({ plan: plan.reservationNumber });

    console.log('🔗 URL updated with plan:', plan.reservationNumber);

    // Fetch detailed workflows for this plan
    console.log('🔄 Fetching plan detail for:', plan.reservationNumber);
    setLoadingDetail(true);
    try {
      const detail = await getOrchestrationPlanDetail(plan.reservationNumber);
      console.log('✅ Plan detail loaded:', detail);
      console.log('📋 Workflows count:', detail.workflows?.length || 0);
      setPlanDetail(detail);
    } catch (err: any) {
      console.error('❌ Error loading plan detail:', err);
      setPlanDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectedPlan = selectedPlanIndex !== null ? plans[selectedPlanIndex] : null;

  // Log when selected plan changes
  useEffect(() => {
    if (selectedPlan) {
      console.log('🟣 Selected plan changed:', {
        index: selectedPlanIndex,
        reservationNumber: selectedPlan.reservationNumber,
        listingName: selectedPlan.listingName,
        guestName: selectedPlan.guestName,
        totalWorkflows: selectedPlan.eventCounts?.total || 0,
        completedWorkflows: selectedPlan.eventCounts?.executed || 0
      });
    } else {
      console.log('⚪ No plan selected (selectedPlanIndex:', selectedPlanIndex, ')');
    }
  }, [selectedPlan, selectedPlanIndex]);

  // Transform workflows from plan detail into columns
  const workflowColumns = React.useMemo(() => {
    if (!planDetail?.workflows) {
      console.log('⚪ No workflows to display');
      return [];
    }

    console.log('🔄 Transforming workflows into columns:', planDetail.workflows.length);

    const listingId = planDetail.listingId;
    const listingOperational = planDetail.listingOperational;

    return planDetail.workflows.map((workflow) => {
      const actions = transformWorkflowToActions(workflow);

      // Create badge based on workflow metadata
      let badge = workflow.categoryDisplayLabel || workflow.category;
      if (workflow.metadata?.timeslotType) {
        badge += ` · ${workflow.metadata.timeslotType}`;
      }

      const cleaningPanel = isCleaningSojoriWorkflow(workflow) ? (
        <CleaningSojoriSchedulePanel
          metadata={(workflow as CategoryWorkflow & { metadata?: Record<string, unknown> }).metadata}
          compact
          listingId={listingId}
          listingOperational={listingOperational}
          checkInDate={planDetail.checkInDate}
          checkOutDate={planDetail.checkOutDate}
          onCleanlinessChange={cleanlinessSaving ? undefined : handleCleanlinessChange}
        />
      ) : undefined;

      return {
        title: workflow.categoryDisplayLabel || workflow.category,
        badge,
        timeslotCode: workflow.timeslotCode,
        actions,
        cleaningPanel,
        workflowId: workflow.workflowId,
        status: workflow.status,
      };
    });
  }, [planDetail, cleanlinessSaving]);

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Plans']}>
      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: t.border, mb: 0 }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ px: 3 }}>
          <Tab label="Plans" />
          <Tab label="Chronologie" />
          <Tab label="Événement" />
          <Tab label="Daily Ops" />
          <Tab label="Configuration" />
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        <PageHeader
          title="🟣 Orchestration · Plans actifs"
          count={`${plans.length} ${plans.length > 1 ? 'plans' : 'plan'}`}
        />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && !loading && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && plans.length > 0 && (
          <>
            {/* Cartes réservations (horizontal scroll) */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 2,
                mb: 3,
                '&::-webkit-scrollbar': { height: 8 },
                '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 4 },
              }}
            >
              {plans.map((plan, idx) => (
                <ReservationCard
                  key={plan.reservationId}
                  plan={plan}
                  selected={selectedPlanIndex === idx}
                  onSelect={() => handleSelectPlan(idx)}
                />
              ))}
            </Box>

            {/* Afficher les workflows SEULEMENT si un plan est sélectionné */}
            {selectedPlan && (
              <>
                {/* Filtres */}
                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: t.text,
                      color: '#fff',
                      fontSize: 11,
                      textTransform: 'none',
                      '&:hover': { bgcolor: t.text2 },
                    }}
                  >
                    Toutes les étapes
                  </Button>
                  <Button variant="outlined" sx={{ fontSize: 11, textTransform: 'none' }}>
                    À faire
                  </Button>
                  <Button variant="outlined" sx={{ fontSize: 11, textTransform: 'none' }}>
                    En retard
                  </Button>
                  <Button variant="outlined" sx={{ fontSize: 11, textTransform: 'none' }}>
                    Aujourd'hui
                  </Button>
                  <Button variant="outlined" sx={{ fontSize: 11, textTransform: 'none' }}>
                    Communication
                  </Button>
                  <Button variant="outlined" sx={{ fontSize: 11, textTransform: 'none' }}>
                    Staff
                  </Button>
                  <Button variant="outlined" sx={{ fontSize: 11, textTransform: 'none' }}>
                    Déclaration
                  </Button>
                </Stack>

                {/* Légende */}
                <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'flex-end' }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.success }} />
                    <Typography sx={{ fontSize: 10, color: t.text3 }}>Complété</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.warning }} />
                    <Typography sx={{ fontSize: 10, color: t.text3 }}>En cours</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.error }} />
                    <Typography sx={{ fontSize: 10, color: t.text3 }}>Retard</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.info }} />
                    <Typography sx={{ fontSize: 10, color: t.text3 }}>Info</Typography>
                  </Stack>
                </Stack>

                {/* Loading state for workflows */}
                {loadingDetail && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                )}

                {/* Colonnes workflows (horizontal scroll) */}
                {!loadingDetail && workflowColumns.length > 0 && (
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
                    {workflowColumns.map((workflow, idx) => (
                      <WorkflowColumn key={workflow.workflowId || idx} {...workflow} />
                    ))}
                  </Box>
                )}

                {/* Empty state */}
                {!loadingDetail && workflowColumns.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Aucun workflow trouvé pour ce plan.
                  </Alert>
                )}
              </>
            )}
          </>
        )}

        {!loading && !error && plans.length === 0 && (
          <Alert severity="info">Aucun plan d'orchestration actif trouvé.</Alert>
        )}
      </Box>
    </DashboardWrapper>
  );
}
