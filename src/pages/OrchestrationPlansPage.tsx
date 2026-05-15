// ════════════════════════════════════════════════════════════════════
// Sojori — OrchestrationPlansPage 🟣 ORCHESTRATION API
// Liste + détail des plans d'orchestration (srv-orchestrator API)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Stack, Typography, Button, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab, Tooltip,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { Panel, PageHeader, Badge } from '../components/dashboard/DashboardV2.components';
import {
  getOrchestrationPlans,
  getOrchestrationPlanDetail,
  cancelOrchestrationPlan,
  getOrchestrationStats,
} from '../services/orchestrationService';
import type {
  OrchestrationPlan,
  OrchestrationPlanDetail,
  OrchestrationStats,
  CategoryWorkflow,
} from '../types/orchestration.types';

const t = {
  primary: '#e6b022', primarySoft: '#f4c430', primaryTint: 'rgba(230,176,34,0.10)',
  purple: '#8b5cf6', purpleSoft: '#a78bfa', purpleTint: 'rgba(139,92,246,0.10)',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

// ════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════

function getStatusColor(status: string): string {
  if (status === 'COMPLETED' || status === 'EXECUTED') return t.success;
  if (status === 'FAILED' || status === 'error') return t.error;
  if (status === 'IN_PROGRESS' || status === 'active') return t.info;
  if (status === 'PENDING') return t.warning;
  if (status === 'CANCELLED' || status === 'SKIPPED') return t.text3;
  return t.text2;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    no_plan: 'Sans plan',
    error: 'Erreur',
    active: 'Actif',
    completed: 'Terminé',
    PENDING: 'En attente',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    EXECUTED: 'Exécuté',
    FAILED: 'Échec',
    CANCELLED: 'Annulé',
    SKIPPED: 'Ignoré',
  };
  return labels[status] || status;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ════════════════════════════════════════════════════════════════════
// WORKFLOW DETAIL COMPONENT
// ════════════════════════════════════════════════════════════════════

interface WorkflowDetailProps {
  workflow: CategoryWorkflow;
}

const WorkflowDetail: React.FC<WorkflowDetailProps> = ({ workflow }) => {
  const statusColor = getStatusColor(workflow.status);
  const hasOrchestration = 'requestTimeslot' in workflow.actions || 'assignStaff' in workflow.actions;
  const isNotification = 'sendNotification' in workflow.actions;

  return (
    <Box sx={{ p: 2, bgcolor: t.bg2, borderRadius: 1, border: `1px solid ${t.border}`, mb: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.text }}>
            {workflow.categoryDisplayLabel || workflow.category}
          </Typography>
          <Chip
            size="small"
            label={getStatusLabel(workflow.status)}
            sx={{ bgcolor: `${statusColor}20`, color: statusColor, fontWeight: 700, fontSize: 11 }}
          />
          {workflow.categoryType && (
            <Chip
              size="small"
              label={workflow.categoryType}
              sx={{ bgcolor: t.purpleTint, color: t.purple, fontWeight: 600, fontSize: 10 }}
            />
          )}
        </Stack>
        <Typography sx={{ fontSize: 11, color: t.text3 }}>
          {workflow.timeslotCode || workflow.workflowId}
        </Typography>
      </Stack>

      {/* Registration Stats */}
      {workflow.registrationStats && (
        <Box sx={{ mb: 1, p: 1, bgcolor: t.bg1, borderRadius: 0.5, border: `1px solid ${t.border}` }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, mb: 0.5 }}>
            📋 Enregistrement Voyageurs
          </Typography>
          <Stack direction="row" spacing={2}>
            <Chip size="small" label={`${workflow.registrationStats.validated} / ${workflow.registrationStats.adults} validés`}
              sx={{ bgcolor: t.success + '20', color: t.success, fontWeight: 600 }} />
            {workflow.registrationStats.draft > 0 && (
              <Chip size="small" label={`${workflow.registrationStats.draft} brouillon`}
                sx={{ bgcolor: t.warning + '20', color: t.warning, fontWeight: 600 }} />
            )}
            {workflow.registrationStats.notRegistered > 0 && (
              <Chip size="small" label={`${workflow.registrationStats.notRegistered} non enregistrés`}
                sx={{ bgcolor: t.error + '20', color: t.error, fontWeight: 600 }} />
            )}
          </Stack>
        </Box>
      )}

      {/* Declaration Info */}
      {workflow.declarationInfo && (
        <Box sx={{ mb: 1, p: 1, bgcolor: t.bg1, borderRadius: 0.5, border: `1px solid ${t.border}` }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, mb: 0.5 }}>
            ✅ Déclaration
          </Typography>
          <Stack direction="row" spacing={1}>
            <Typography sx={{ fontSize: 11, color: t.text2 }}>
              Statut: <strong>{workflow.declarationInfo.computedStatus}</strong>
            </Typography>
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              · Déclaré: {formatDateTime(workflow.declarationInfo.actualTime)}
            </Typography>
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              · Via: {workflow.declarationInfo.confirmedBy}
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Orchestration Actions */}
      {hasOrchestration && (
        <Box sx={{ mt: 1 }}>
          {workflow.actions.requestTimeslot && (
            <Box sx={{ p: 1, bgcolor: t.bg1, borderRadius: 0.5, mb: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.purple, mb: 0.5 }}>
                📨 Demande Créneau
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Typography sx={{ fontSize: 10, color: t.text3 }}>
                  Template: {workflow.actions.requestTimeslot.config.templateName}
                </Typography>
                <Typography sx={{ fontSize: 10, color: t.text3 }}>
                  Deadline: {formatDateTime(workflow.actions.requestTimeslot.deadline)}
                </Typography>
                {workflow.actions.requestTimeslot.execution?.response && (
                  <Chip size="small" label="✅ Créneau sélectionné"
                    sx={{ height: 18, bgcolor: t.success + '20', color: t.success, fontSize: 9 }} />
                )}
              </Stack>
            </Box>
          )}

          {workflow.actions.assignStaff && (
            <Box sx={{ p: 1, bgcolor: t.bg1, borderRadius: 0.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.purple, mb: 0.5 }}>
                👤 Assignation Staff
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 10, color: t.text3 }}>
                  Stratégie: {workflow.actions.assignStaff.config.strategy}
                </Typography>
                <Typography sx={{ fontSize: 10, color: t.text3 }}>
                  Jour actuel: {workflow.actions.assignStaff.currentDay}
                </Typography>
                <Typography sx={{ fontSize: 10, color: t.text3 }}>
                  Tentatives: {workflow.actions.assignStaff.execution.attempts.length}
                </Typography>
                {workflow.actions.assignStaff.execution.assignedStaff && (
                  <Chip size="small"
                    label={`✅ ${workflow.actions.assignStaff.execution.assignedStaff.staffName}`}
                    sx={{ height: 18, bgcolor: t.success + '20', color: t.success, fontSize: 9 }} />
                )}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* Notification Action */}
      {isNotification && workflow.actions.sendNotification && (
        <Box sx={{ mt: 1, p: 1, bgcolor: t.bg1, borderRadius: 0.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.info, mb: 0.5 }}>
            📧 Notification
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Typography sx={{ fontSize: 10, color: t.text3 }}>
              Template: {workflow.actions.sendNotification.config.templateName}
            </Typography>
            <Typography sx={{ fontSize: 10, color: t.text3 }}>
              Envoi prévu: {formatDateTime(workflow.actions.sendNotification.scheduledFor)}
            </Typography>
            {workflow.actions.sendNotification.execution && (
              <Chip size="small"
                label={`✅ Envoyé via ${workflow.actions.sendNotification.execution.channel}`}
                sx={{ height: 18, bgcolor: t.success + '20', color: t.success, fontSize: 9 }} />
            )}
          </Stack>
        </Box>
      )}

      <Stack direction="row" sx={{ justifyContent: 'space-between',  mt: 1.5, pt: 1, borderTop: `1px solid ${t.border}` }}>
        <Typography sx={{ fontSize: 10, color: t.text3 }}>
          Créé: {formatDateTime(workflow.createdAt)}
        </Typography>
        {workflow.completedAt && (
          <Typography sx={{ fontSize: 10, color: t.text3 }}>
            Terminé: {formatDateTime(workflow.completedAt)}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

// ════════════════════════════════════════════════════════════════════
// PLAN DETAIL MODAL
// ════════════════════════════════════════════════════════════════════

interface PlanDetailModalProps {
  open: boolean;
  onClose: () => void;
  reservationNumber: string;
}

const PlanDetailModal: React.FC<PlanDetailModalProps> = ({ open, onClose, reservationNumber }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<OrchestrationPlanDetail | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (open) {
      fetchPlanDetail();
    }
  }, [open, reservationNumber]);

  const fetchPlanDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrchestrationPlanDetail(reservationNumber);
      setPlan(data);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const activeWorkflows = plan?.workflows.filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED') || [];
  const completedWorkflows = plan?.workflows.filter(w => w.status === 'COMPLETED' || w.status === 'EXECUTED') || [];
  const failedWorkflows = plan?.workflows.filter(w => w.status === 'FAILED') || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, bgcolor: t.bg1, maxHeight: '90vh' } } }}
    >
      <DialogTitle sx={{ pb: 1.5, borderBottom: `1px solid ${t.border}` }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: t.text }}>
              🟣 Plan d'Orchestration
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.5 }}>
              {reservationNumber} {plan && `· ${plan.workflows.length} workflows`}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}>✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {loading && (
          <Stack spacing={2} sx={{ alignItems: 'center',  py: 4 }}>
            <CircularProgress size={40} sx={{ color: t.purple }} />
            <Typography sx={{ fontSize: 13, color: t.text3 }}>Chargement du plan...</Typography>
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {plan && (
          <Box>
            {/* Plan Info */}
            <Panel title="Informations Réservation" sx={{ mb: 2.5 }}>
              <Stack spacing={1}>
                <InfoRow label="Listing ID" value={plan.listingId} />
                <InfoRow label="Owner ID" value={plan.ownerId} />
                <InfoRow label="Check-in" value={formatDate(plan.checkInDate)} />
                <InfoRow label="Check-out" value={formatDate(plan.checkOutDate)} />
                <InfoRow label="Plan ID" value={plan.planId} />
                <InfoRow label="Créé le" value={formatDateTime(plan.createdAt)} />
              </Stack>
            </Panel>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: t.border, mb: 2 }}>
              <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
                <Tab label={`Actifs (${activeWorkflows.length})`} />
                <Tab label={`Terminés (${completedWorkflows.length})`} />
                <Tab label={`Échecs (${failedWorkflows.length})`} />
                <Tab label={`Tous (${plan.workflows.length})`} />
              </Tabs>
            </Box>

            {/* Workflows */}
            <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
              {currentTab === 0 && activeWorkflows.map(w => <WorkflowDetail key={w.workflowId} workflow={w} />)}
              {currentTab === 1 && completedWorkflows.map(w => <WorkflowDetail key={w.workflowId} workflow={w} />)}
              {currentTab === 2 && failedWorkflows.map(w => <WorkflowDetail key={w.workflowId} workflow={w} />)}
              {currentTab === 3 && plan.workflows.map(w => <WorkflowDetail key={w.workflowId} workflow={w} />)}

              {((currentTab === 0 && activeWorkflows.length === 0) ||
                (currentTab === 1 && completedWorkflows.length === 0) ||
                (currentTab === 2 && failedWorkflows.length === 0)) && (
                <Typography sx={{ fontSize: 13, color: t.text3, textAlign: 'center', py: 4 }}>
                  Aucun workflow dans cette catégorie
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${t.border}` }}>
        <Button onClick={onClose} sx={{ color: t.text2, textTransform: 'none' }}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATION PLANS PAGE
// ════════════════════════════════════════════════════════════════════

const OrchestrationPlansPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<OrchestrationPlan[]>([]);
  const [stats, setStats] = useState<OrchestrationStats | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ALL'>('ACTIVE');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'checkin_asc' | 'checkin_desc'>('recent');

  useEffect(() => {
    fetchData();
  }, [statusFilter, sortBy]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, statsRes] = await Promise.all([
        getOrchestrationPlans({ reservationStatus: statusFilter, sortBy, limit: 100 }),
        getOrchestrationStats(),
      ]);
      setPlans(plansRes.data);
      setStats(statsRes);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPlan = async (reservationNumber: string) => {
    if (!confirm(`Annuler le plan d'orchestration pour ${reservationNumber} ?`)) return;

    try {
      await cancelOrchestrationPlan({ reservationNumber, reason: 'Cancelled from dashboard' });
      alert('Plan annulé avec succès');
      fetchData();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration API', 'Plans']}>
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="🟣 Orchestration · Plans API"
          count={`${plans.length} ${plans.length > 1 ? 'plans' : 'plan'}`}
        >
        </PageHeader>

        {/* Stats Cards */}
        {stats && (
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Panel sx={{ flex: 1 }}>
              <Stack sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: t.purple }}>{stats.plans.total}</Typography>
                <Typography sx={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>Total Plans</Typography>
              </Stack>
            </Panel>
            <Panel sx={{ flex: 1 }}>
              <Stack sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: t.info }}>{stats.plans.active}</Typography>
                <Typography sx={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>Plans Actifs</Typography>
              </Stack>
            </Panel>
            <Panel sx={{ flex: 1 }}>
              <Stack sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: t.success }}>{stats.plans.completed}</Typography>
                <Typography sx={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>Terminés</Typography>
              </Stack>
            </Panel>
            <Panel sx={{ flex: 1 }}>
              <Stack sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: t.warning }}>{stats.actions.pending}</Typography>
                <Typography sx={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>Actions En Attente</Typography>
              </Stack>
            </Panel>
            {stats.plans.withoutPlan > 0 && (
              <Panel sx={{ flex: 1 }}>
                <Stack sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: t.error }}>{stats.plans.withoutPlan}</Typography>
                  <Typography sx={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>Sans Plan</Typography>
                </Stack>
              </Panel>
            )}
          </Stack>
        )}

        {/* Filters */}
        <Panel sx={{ mb: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FormControl size="small" sx={{ width: 200 }}>
              <InputLabel>Statut</InputLabel>
              <Select value={statusFilter} label="Statut" onChange={(e) => setStatusFilter(e.target.value as any)}>
                <MenuItem value="ACTIVE">Actifs</MenuItem>
                <MenuItem value="COMPLETED">Terminés</MenuItem>
                <MenuItem value="CANCELLED">Annulés</MenuItem>
                <MenuItem value="ALL">Tous</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ width: 200 }}>
              <InputLabel>Tri</InputLabel>
              <Select value={sortBy} label="Tri" onChange={(e) => setSortBy(e.target.value as any)}>
                <MenuItem value="recent">Plus récents</MenuItem>
                <MenuItem value="oldest">Plus anciens</MenuItem>
                <MenuItem value="checkin_asc">Check-in ↑</MenuItem>
                <MenuItem value="checkin_desc">Check-in ↓</MenuItem>
              </Select>
            </FormControl>

            <Button variant="outlined" onClick={fetchData}
              sx={{ ml: 'auto', textTransform: 'none', borderColor: t.border, color: t.text2 }}>
              🔄 Actualiser
            </Button>
          </Stack>
        </Panel>

        {/* Table */}
        <Panel>
          {loading && (
            <Stack spacing={2} sx={{ alignItems: 'center',  py: 4 }}>
              <CircularProgress size={40} sx={{ color: t.purple }} />
              <Typography sx={{ fontSize: 13, color: t.text3 }}>Chargement des plans...</Typography>
            </Stack>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!loading && plans.length === 0 && (
            <Typography sx={{ fontSize: 13, color: t.text3, textAlign: 'center', py: 4 }}>
              Aucun plan d'orchestration trouvé
            </Typography>
          )}

          {!loading && plans.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: t.text3 }}>RÉSERVATION</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: t.text3 }}>VOYAGEUR</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: t.text3 }}>LISTING</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: t.text3 }}>DATES</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: t.text3 }}>STATUT</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: t.text3 }}>WORKFLOWS</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: t.text3 }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plans.map((plan) => {
                    const statusColor = getStatusColor(plan.orchestrationStatus);
                    return (
                      <TableRow key={plan.id} hover sx={{ cursor: 'pointer' }}
                        onClick={() => setSelectedPlan(plan.reservationNumber)}>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: 'Geist Mono' }}>
                            {plan.reservationNumber}
                          </Typography>
                          {plan.planNotCreated && (
                            <Chip size="small" label="Sans plan"
                              sx={{ mt: 0.5, height: 16, bgcolor: t.error + '20', color: t.error, fontSize: 9 }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, color: t.text2 }}>{plan.guestName || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 12, color: t.text2 }}>{plan.listingName || plan.listingId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 12, color: t.text2 }}>
                            {formatDate(plan.arrivalDate)} → {formatDate(plan.departureDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={getStatusLabel(plan.orchestrationStatus)}
                            sx={{ bgcolor: `${statusColor}20`, color: statusColor, fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Badge variant="neutral" label={`${plan.eventCounts.total} total`} />
                            {plan.eventCounts.pending > 0 && (
                              <Badge variant="warning" label={`${plan.eventCounts.pending} en attente`} />
                            )}
                            {plan.eventCounts.failed > 0 && (
                              <Badge variant="error" label={`${plan.eventCounts.failed} échecs`} />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Voir détails (modal)">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan.reservationNumber); }}>
                                👁️
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Voir timeline complète">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/orchestration/timeline/${plan.reservationNumber}`); }}>
                                📊
                              </IconButton>
                            </Tooltip>
                            {plan.orchestrationStatus !== 'completed' && !plan.planNotCreated && (
                              <Tooltip title="Annuler plan">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCancelPlan(plan.reservationNumber); }}>
                                  ❌
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Panel>

        {/* Plan Detail Modal */}
        {selectedPlan && (
          <PlanDetailModal
            open={!!selectedPlan}
            onClose={() => setSelectedPlan(null)}
            reservationNumber={selectedPlan}
          />
        )}
      </Box>
    </DashboardWrapper>
  );
};

// ════════════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ════════════════════════════════════════════════════════════════════

interface InfoRowProps {
  label: string;
  value: string | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
    <Typography sx={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{ fontSize: 12, color: t.text, fontWeight: 600 }}>{value || '-'}</Typography>
  </Stack>
);

export default OrchestrationPlansPage;
