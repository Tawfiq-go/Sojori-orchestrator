import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { OrchestrationTimelineSimulation } from '../features/taskHub/taskConfig/OrchestrationTimelineSimulation';
import '../features/taskHub/staff-design/orchDesign.css';
import * as fulltaskApi from '../services/fulltaskApi';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import OwnerConfigScopeBarWithSync from '../features/taskHub/components/OwnerConfigScopeBarWithSync';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import tasksService from '../services/fulltaskTasksService';
import { orchestrationSummary } from '../utils/fulltaskMappers';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../constants/orchestrationAdmin';

import {
  FULLTASK_TASK_TYPES,
  FULLTASK_TASK_TYPE_LABELS,
} from '../features/taskHub/staff-design/fulltaskTaskTypes';
import {
  AUTO_COMPLETION_TRIGGER_LABELS,
  TASK_AUTO_COMPLETION_TRIGGERS,
  hintForAutoCompletion,
  normalizeCompletionTrigger,
  type TaskAutoCompletionTrigger,
} from '../features/taskHub/taskConfig/taskCompletionLabels';

type ConfigField = 'requiresClientAction' | 'autoCompletionTrigger';

export interface TaskConfigRow {
  type: string;
  requiresClientAction: boolean;
  autoCompletionTrigger: TaskAutoCompletionTrigger | null;
  orchestration: Record<string, unknown> | null;
}

function normalizeRows(apiRows: Record<string, unknown>[]): TaskConfigRow[] {
  const byType = new Map(apiRows.map((r) => [String(r.type), r]));

  return FULLTASK_TASK_TYPES.map((type) => {
    const row = byType.get(type);
    const autoCompletionTrigger = normalizeCompletionTrigger(
      row?.autoCompletionTrigger != null ? String(row.autoCompletionTrigger) : null,
    );
    return {
      type,
      requiresClientAction: Boolean(row?.requiresClientAction),
      autoCompletionTrigger,
      orchestration: (row?.orchestration as Record<string, unknown> | null) ?? null,
    };
  });
}

function TasksConfigFulltaskPageInner() {
  const ownerScope = useFulltaskConfigOwner();
  const { ownerKey, ownerDisplayName, ownerKeyDetail, isAdminTemplate, showOwnerPicker } = ownerScope;

  const [rows, setRows] = useState<TaskConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    console.log('LOAD START - ownerKey:', ownerKey);
    try {
      const cfgRes = await fulltaskApi.getTaskConfigs(ownerKey, {});
      console.log('LOAD RESPONSE:', cfgRes);
      const normalized = normalizeRows((cfgRes?.data as Record<string, unknown>[]) || []);
      console.log('NORMALIZED ROWS:', normalized);
      setRows(normalized);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('LOAD ERROR:', err);
      toast.error(err.message || 'Erreur config');
      setRows(normalizeRows([]));
    } finally {
      setLoading(false);
    }
  }, [ownerKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRow = async (
    type: string,
    patch: Partial<Pick<TaskConfigRow, 'requiresClientAction' | 'autoCompletionTrigger'>>,
  ) => {
    const prev = rows;
    setRows((r) => r.map((row) => (row.type === type ? { ...row, ...patch } : row)));
    setSavingType(type);
    try {
      const row = prev.find((r) => r.type === type);
      if (!row) return;

      const nextTrigger = patch.autoCompletionTrigger ?? row.autoCompletionTrigger;
      if (!nextTrigger) {
        toast.error('Choisir un mode de complétion avant enregistrement');
        setRows(prev);
        setSavingType(null);
        return;
      }
      const body = {
        type,
        requiresClientAction: patch.requiresClientAction ?? row.requiresClientAction,
        autoCompletionTrigger: nextTrigger,
      };

      const result = await fulltaskApi.upsertTaskTypeConfig(ownerKey, type, body, undefined);

      console.log('SAVE RESULT:', result);

      toast.success('Config mise à jour');

      console.log('RELOADING...');
      await load();
    } catch (e: unknown) {
      setRows(prev);
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      console.error('SAVE CONFIG ERROR:', err);
      toast.error(err.response?.data?.error || err.message || 'Erreur enregistrement');
    } finally {
      setSavingType(null);
    }
  };

  const toggle = (type: string, field: 'requiresClientAction', value: boolean) =>
    void saveRow(type, { [field]: value });

  const handleSyncToOwner = async (targetOwnerId: string, targetOwnerName: string) => {
    console.log('=== SYNC TO OWNER START ===');
    console.log('sourceOwnerId (ADMIN):', ORCHESTRATION_ADMIN_OWNER_ID);
    console.log('targetOwnerId:', targetOwnerId);
    console.log('targetOwnerName:', targetOwnerName);
    try {
      const result = await fulltaskApi.copyTaskConfigToOwner(ORCHESTRATION_ADMIN_OWNER_ID, targetOwnerId);
      console.log('SYNC RESULT:', result);
      toast.success(`Config synchronisée vers ${targetOwnerName}`);
      await load();
      console.log('=== SYNC TO OWNER END ===');
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { error?: string } } };
      console.error('SYNC ERROR:', err);
      toast.error(err.response?.data?.error || err.message || 'Erreur synchronisation');
    }
  };

  const handleSyncToAllOwners = async () => {
    console.log('=== SYNC TO ALL START ===');
    console.log('sourceOwnerId (ADMIN):', ORCHESTRATION_ADMIN_OWNER_ID);
    try {
      const result = await fulltaskApi.copyTaskConfigToAllOwners(ORCHESTRATION_ADMIN_OWNER_ID);
      console.log('SYNC ALL RESULT:', result);
      toast.success('Config synchronisée vers tous les PMs');
      await load();
      console.log('=== SYNC TO ALL END ===');
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { error?: string } } };
      console.error('SYNC ALL ERROR:', err);
      toast.error(err.response?.data?.error || err.message || 'Erreur synchronisation');
    }
  };

  return (
    <DashboardWrapper breadcrumb={['taskNew', 'Task config']}>
      <Box sx={{ p: 3, bgcolor: '#f6f5f1', minHeight: 'calc(100vh - 60px)' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            Task config
          </Typography>
        </Stack>
        <OwnerConfigScopeBarWithSync
          {...ownerScope}
          onSyncToOwner={handleSyncToOwner}
          onSyncToAllOwners={handleSyncToAllOwners}
        />

        {loading ? (
          <CircularProgress />
        ) : (
          <Paper sx={{ overflow: 'auto', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Action client</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Auto-complétion</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Plan orchestration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <Fragment key={row.type}>
                    <TableRow hover>
                      <TableCell>
                        {FULLTASK_TASK_TYPE_LABELS[
                          row.type as keyof typeof FULLTASK_TASK_TYPE_LABELS
                        ] || row.type}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ ml: 1, color: 'text.secondary', fontFamily: 'monospace' }}
                        >
                          {row.type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Switch
                          disabled={savingType === row.type}
                          checked={row.requiresClientAction}
                          onChange={(e) =>
                            void toggle(row.type, 'requiresClientAction', e.target.checked)
                          }
                          color="warning"
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 280 }}>
                        <FormControl size="small" fullWidth disabled={savingType === row.type}>
                          <Select
                            value={row.autoCompletionTrigger ?? ''}
                            displayEmpty
                            onChange={(e) =>
                              void saveRow(row.type, {
                                autoCompletionTrigger: e.target
                                  .value as TaskAutoCompletionTrigger,
                              })
                            }
                            sx={{ fontSize: 13, bgcolor: 'white' }}
                          >
                            <MenuItem value="" disabled sx={{ fontSize: 13 }}>
                              — Non configuré —
                            </MenuItem>
                            {TASK_AUTO_COMPLETION_TRIGGERS.map((key) => (
                              <MenuItem key={key} value={key} sx={{ fontSize: 13 }}>
                                {AUTO_COMPLETION_TRIGGER_LABELS[key]}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {hintForAutoCompletion(row.type, row.autoCompletionTrigger)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            size="small"
                            label={row.orchestration ? 'Plan global' : '—'}
                            color={row.orchestration ? 'primary' : 'default'}
                            variant={row.orchestration ? 'filled' : 'outlined'}
                            sx={{ fontSize: 11 }}
                          />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {orchestrationSummary(row.orchestration)}
                          </Typography>
                          <Button
                            component={RouterLink}
                            to="/tasks/orchestration-config"
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: 'none', fontSize: 11 }}
                          >
                            Modifier le plan
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            disabled={!row.orchestration}
                            onClick={() =>
                              setPreviewType((t) => (t === row.type ? null : row.type))
                            }
                            sx={{ textTransform: 'none', fontSize: 11, minWidth: 0, px: 0.5 }}
                          >
                            {previewType === row.type ? 'Masquer' : 'Timeline'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    <TableRow key={`${row.type}-tl`}>
                      <TableCell
                        colSpan={4}
                        sx={{ py: 0, borderBottom: previewType === row.type ? undefined : 0 }}
                      >
                        <Collapse in={previewType === row.type}>
                          <Box sx={{ py: 2, px: 1 }}>
                            <div
                              className="so-orch-root"
                              style={{ padding: 0, minHeight: 0, background: 'transparent' }}
                            >
                              <OrchestrationTimelineSimulation
                                title={`${
                                  FULLTASK_TASK_TYPE_LABELS[
                                    row.type as keyof typeof FULLTASK_TASK_TYPE_LABELS
                                  ] || row.type
                                } · simulation`}
                                workflow={row.orchestration}
                                taskTypeId={row.type}
                              />
                            </div>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Box>
    </DashboardWrapper>
  );
}

export default function TasksConfigFulltaskPage() {
  return (
    <AdminOwnerScopeLayout showTopBar={false}>
      <TasksConfigFulltaskPageInner />
    </AdminOwnerScopeLayout>
  );
}
