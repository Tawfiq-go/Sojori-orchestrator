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
import OwnerConfigScopeBar from '../features/taskHub/components/OwnerConfigScopeBar';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import tasksService from '../services/fulltaskTasksService';
import { orchestrationSummary } from '../utils/fulltaskMappers';
import ApplyAdminConfigToOwnersButton from '../components/ApplyAdminConfigToOwnersButton';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../constants/orchestrationAdmin';

import {
  FULLTASK_TASK_TYPES,
  FULLTASK_TASK_TYPE_LABELS,
} from '../features/taskHub/staff-design/fulltaskTaskTypes';

type ConfigField = 'requiresClientAction';

export interface TaskConfigRow {
  type: string;
  requiresClientAction: boolean;
  orchestration: Record<string, unknown> | null;
}

function normalizeRows(apiRows: Record<string, unknown>[]): TaskConfigRow[] {
  const byType = new Map(apiRows.map((r) => [String(r.type), r]));

  return FULLTASK_TASK_TYPES.map((type) => {
    const row = byType.get(type);
    return {
      type,
      requiresClientAction: Boolean(row?.requiresClientAction),
      orchestration: (row?.orchestration as Record<string, unknown> | null) ?? null,
    };
  });
}

export default function TasksConfigFulltaskPage() {
  const ownerScope = useFulltaskConfigOwner();
  const { ownerKey, ownerDisplayName, ownerKeyDetail, isAdminTemplate, showOwnerPicker } = ownerScope;

  const [listingId, setListingId] = useState('');
  const [listings, setListings] = useState<{ _id: string; name: string }[]>([]);
  const [rows, setRows] = useState<TaskConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    try {
      const svc = tasksService as { getListings: () => Promise<{ _id: string; name: string }[]> };
      const list = await svc.getListings();
      setListings(list);
    } catch {
      setListings([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = listingId ? { listingId } : {};
      const cfgRes = await fulltaskApi.getTaskConfigs(ownerKey, params);
      setRows(normalizeRows((cfgRes?.data as Record<string, unknown>[]) || []));
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur config');
      setRows(normalizeRows([]));
    } finally {
      setLoading(false);
    }
  }, [ownerKey, listingId]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (type: string, field: ConfigField, value: boolean) => {
    const prev = rows;
    setRows((r) => r.map((row) => (row.type === type ? { ...row, [field]: value } : row)));
    setSavingType(type);
    try {
      const row = prev.find((r) => r.type === type);
      if (!row) return;
      await fulltaskApi.upsertTaskTypeConfig(
        ownerKey,
        type,
        { type, requiresClientAction: value },
        listingId || undefined,
      );
      toast.success('Config mise à jour');
      await load();
    } catch (e: unknown) {
      setRows(prev);
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur enregistrement');
    } finally {
      setSavingType(null);
    }
  };

  const handleApplyAdminToOwners = async (
    mode: 'current' | 'all',
    targetOwnerId?: string,
  ) => {
    // Charger la config Admin
    const adminConfig = await fulltaskApi.getTaskConfigs(ORCHESTRATION_ADMIN_OWNER_ID, {});

    if (mode === 'current' && targetOwnerId) {
      // Appliquer à l'Owner sélectionné
      await fulltaskApi.copyTaskConfigToOwner(ORCHESTRATION_ADMIN_OWNER_ID, targetOwnerId);
    } else if (mode === 'all') {
      // Appliquer à tous les Owners
      await fulltaskApi.copyTaskConfigToAllOwners(ORCHESTRATION_ADMIN_OWNER_ID);
    }

    // Recharger pour afficher les changements
    await load();
  };

  return (
    <AdminOwnerScopeLayout showTopBar={false}>
    <DashboardWrapper breadcrumb={['taskNew', 'Task config']}>
      <Box sx={{ p: 3, bgcolor: '#f6f5f1', minHeight: 'calc(100vh - 60px)' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            Task config
          </Typography>
          {showOwnerPicker && (
            <ApplyAdminConfigToOwnersButton
              currentOwnerId={isAdminTemplate ? null : ownerKey}
              currentOwnerName={isAdminTemplate ? undefined : ownerDisplayName}
              isAdminTemplate={isAdminTemplate}
              onApply={handleApplyAdminToOwners}
              disabled={loading}
            />
          )}
        </Stack>
        <OwnerConfigScopeBar {...ownerScope} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Action client</strong> : pas de tâche dans /tasks à la création résa — créée à la
          première action voyageur. <strong>Support / conciergerie / transport</strong> : jamais auto,
          uniquement demande explicite. Relances et staff :{' '}
          <Link component={RouterLink} to="/tasks/orchestration-config" fontWeight={700}>
            Orchestration config
          </Link>
          {' '}
          pour <strong>{ownerDisplayName}</strong>
          {listingId ? ` · listing ${listingId}` : ' · portée globale PM'}
          <Typography
            component="span"
            variant="caption"
            display="block"
            sx={{ mt: 0.5, fontFamily: 'Geist Mono, ui-monospace, monospace', color: 'text.secondary' }}
          >
            Clé API : {ownerKeyDetail}
          </Typography>
        </Typography>

        <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
          <InputLabel>Portée</InputLabel>
          <Select
            label="Portée"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
          >
            <MenuItem value="">Globale (PM)</MenuItem>
            {listings.map((l) => (
              <MenuItem key={l._id} value={l._id}>
                {l.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loading ? (
          <CircularProgress />
        ) : (
          <Paper sx={{ overflow: 'auto', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Action client</TableCell>
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
                        colSpan={3}
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
    </AdminOwnerScopeLayout>
  );
}
