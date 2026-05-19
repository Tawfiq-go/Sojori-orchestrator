import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { Card, ToggleRow } from '../../tabs/_shared';
import ConfigPanelToolbar from './ConfigPanelToolbar';
import {
  useCreateListingRulesAndInfo,
  useListingRulesAndInfo,
  useListingRulesSyncStatus,
  useSyncListingRulesAndInfo,
  useUpdateListingRulesAndInfo,
} from '../../hooks/useListingConfigHooks';
import { menuBtnPrimary } from '../ChatbotMenuConfig/menuTheme';
import { localizeField } from '../../utils/localizeField';

export default function ListingRulesConfigPanel({ listingId, listingName }) {
  const { data: config, isLoading, error, isFetching, refetch } = useListingRulesAndInfo(listingId);
  const isNotFound = Boolean(error?.notFound);
  const { data: syncStatus, isLoading: syncLoading, refetch: refetchSync } = useListingRulesSyncStatus(
    listingId,
    { enabled: !isNotFound },
  );
  const createMutation = useCreateListingRulesAndInfo();
  const syncMutation = useSyncListingRulesAndInfo();
  const updateMutation = useUpdateListingRulesAndInfo();
  const [rulesAndInfo, setRulesAndInfo] = useState({ Rules: [], InfoUtils: [] });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config?.rulesAndInfo) {
      setRulesAndInfo(config.rulesAndInfo);
      setDirty(false);
    }
  }, [config]);

  const copyOwner = async () => {
    try {
      if (isNotFound) await createMutation.mutateAsync({ listingId });
      else await syncMutation.mutateAsync({ listingId });
      await Promise.all([refetch(), refetchSync()]);
      toast.success('Règles appliquées depuis l&apos;admin.');
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ listingId, rulesAndInfo });
      toast.success('Règles enregistrées');
      setDirty(false);
      refetch();
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const toggleRule = (index, enabled) => {
    setRulesAndInfo((prev) => ({
      ...prev,
      Rules: (prev.Rules || []).map((r, i) => (i === index ? { ...r, enabled } : r)),
    }));
    setDirty(true);
  };

  const toggleInfo = (index, enabled) => {
    setRulesAndInfo((prev) => ({
      ...prev,
      InfoUtils: (prev.InfoUtils || []).map((r, i) => (i === index ? { ...r, enabled } : r)),
    }));
    setDirty(true);
  };

  if (!listingId) return <Alert severity="info">Enregistrez le listing d&apos;abord.</Alert>;
  if (isLoading && !config && !isNotFound) {
    return <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} /></Box>;
  }
  if (error && !isNotFound) return <Alert severity="error">{error.message}</Alert>;

  if (isNotFound) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography sx={{ mb: 2 }}>Aucune règle / info pour ce listing.</Typography>
        <Button variant="contained" onClick={copyOwner} sx={menuBtnPrimary}>Copier depuis l&apos;admin</Button>
      </Box>
    );
  }

  const rules = rulesAndInfo.Rules || [];
  const infos = rulesAndInfo.InfoUtils || [];

  return (
    <Box>
      <ConfigPanelToolbar
        title={listingName ? `Règles & infos · ${listingName}` : 'Règles & infos'}
        syncStatus={syncStatus}
        syncLoading={syncLoading}
        onSync={async () => { await syncMutation.mutateAsync({ listingId }); refetch(); refetchSync(); }}
        isSyncing={syncMutation.isPending}
        onCopyOwner={copyOwner}
        onRefresh={() => refetch()}
        isFetching={isFetching}
        onReset={copyOwner}
      />

      <Card title="📋 Règles métier" meta={`${rules.length} règles`}>
        <Stack spacing={1}>
          {rules.length === 0 && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Aucune règle — sync admin.</Typography>}
          {rules.map((rule, i) => (
            <ToggleRow
              key={rule.id || rule._id || i}
              title={localizeField(rule.name) || localizeField(rule.title) || `Règle ${i + 1}`}
              desc={localizeField(rule.description)}
              checked={rule.enabled !== false}
              onChange={(v) => toggleRule(i, v)}
            />
          ))}
        </Stack>
      </Card>

      <Card title="ℹ️ Infos utiles" meta={`${infos.length} entrées`}>
        <Stack spacing={1}>
          {infos.length === 0 && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Aucune info — sync admin.</Typography>}
          {infos.map((info, i) => (
            <ToggleRow
              key={info.id || info._id || i}
              title={localizeField(info.title) || localizeField(info.name) || `Info ${i + 1}`}
              checked={info.enabled !== false}
              onChange={(v) => toggleInfo(i, v)}
            />
          ))}
        </Stack>
      </Card>

      <Stack direction="row" sx={{ mt: 2, justifyContent: 'flex-end' }}>
        <Button variant="contained" disabled={!dirty || updateMutation.isPending} onClick={handleSave} sx={menuBtnPrimary}>
          {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </Stack>
    </Box>
  );
}
