import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { resolveLegacyAuthUser } from '../../utils/legacyAuthUser';
import ConfigMessagesView from './ConfigMessagesView';
import ConfigTaskTemplateView from './ConfigTaskTemplateView';
import apiClient from '../../config/axios';
import { MICROSERVICE_BASE_URL } from '../../config/backendServer.config';
import {
  isOrchestrationAdminUser,
  ORCHESTRATION_ADMIN_OWNER_ID,
} from '../../constants/orchestrationAdmin';
import ApplyAdminTemplateToOwnerButton from '../../features/setting/components/ApplyAdminTemplateToOwnerButton';
import {
  OrchConfigPageShell,
  OrchTabBar,
  OrchSubTabBar,
  OrchConfigPanel,
  OrchHint,
  orchSelectSx,
  T,
} from './orchestrationConfigUi';

const ORCH_SCOPE_ADMIN = 'admin';
const ORCH_SCOPE_OWNER = 'owner';

const OrchestratorConfigContent = () => {
  const { t } = useTranslation('common');
  const reduxUser = useSelector((state) => state.auth.user);
  const { user: authUser } = useAuth();
  const user = useMemo(
    () => resolveLegacyAuthUser(authUser, reduxUser),
    [reduxUser, authUser],
  );
  const isOrchestrationAdmin = isOrchestrationAdminUser(user);

  const [searchParams, setSearchParams] = useSearchParams();
  const configTab = searchParams.get('configTab') || 'orchestration';

  const orchScopeRaw = searchParams.get('orchScope');
  const orchScope =
    isOrchestrationAdmin && orchScopeRaw === ORCH_SCOPE_OWNER
      ? ORCH_SCOPE_OWNER
      : ORCH_SCOPE_ADMIN;
  const orchOwnerId = searchParams.get('orchOwnerId') || '';

  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [orchConfigReloadNonce, setOrchConfigReloadNonce] = useState(0);

  useEffect(() => {
    if (!isOrchestrationAdmin || configTab !== 'orchestration' || orchScope !== ORCH_SCOPE_OWNER) {
      return;
    }
    let cancelled = false;
    setOwnersLoading(true);
    const queryParams = new URLSearchParams({
      page: 0,
      limit: 500,
      paged: true,
      roles: 'Owner',
      deleted: false,
      banned: false,
      search_text: '',
    });
    apiClient
      .get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/get-account?${queryParams.toString()}`)
      .then((res) => {
        if (cancelled) return;
        const rows = res.data?.data || [];
        setOwners(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setOwners([]);
      })
      .finally(() => {
        if (!cancelled) setOwnersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOrchestrationAdmin, configTab, orchScope]);

  const taskTemplateTargetOwnerId = useMemo(() => {
    if (!isOrchestrationAdmin) return undefined;
    if (orchScope === ORCH_SCOPE_ADMIN) return ORCHESTRATION_ADMIN_OWNER_ID;
    return orchOwnerId || '';
  }, [isOrchestrationAdmin, orchScope, orchOwnerId]);

  const mainTabs = [
    { id: 'orchestration', label: t('Templates') || 'Modèles', icon: '📋' },
    { id: 'messages', label: t('Messages') || 'Messages', icon: '✉️' },
  ];

  const adminOrchTabs = [
    { id: ORCH_SCOPE_ADMIN, label: 'Admin Configuration', icon: '⚙️' },
    { id: ORCH_SCOPE_OWNER, label: 'Owner Configuration', icon: '👤' },
  ];

  const handleTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'configuration');
    if (id === 'orchestration') next.delete('configTab');
    else next.set('configTab', id);
    setSearchParams(next);
  };

  const handleOrchAdminTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'configuration');
    if (searchParams.get('configTab')) next.set('configTab', searchParams.get('configTab'));
    else next.delete('configTab');
    next.set('orchScope', id);
    if (id === ORCH_SCOPE_ADMIN) next.delete('orchOwnerId');
    setSearchParams(next);
  };

  const handleOrchOwnerSelect = (e) => {
    const id = e.target.value;
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'configuration');
    if (searchParams.get('configTab')) next.set('configTab', searchParams.get('configTab'));
    else next.delete('configTab');
    next.set('orchScope', ORCH_SCOPE_OWNER);
    if (id) next.set('orchOwnerId', id);
    else next.delete('orchOwnerId');
    setSearchParams(next);
  };

  return (
    <OrchConfigPageShell
      title="Configuration orchestration"
      subtitle="Modèles de tâches par catégorie et templates de messages (email & WhatsApp)"
    >
      <OrchTabBar tabs={mainTabs} activeId={configTab} onChange={handleTab} />

      {isOrchestrationAdmin && configTab === 'orchestration' && (
        <OrchSubTabBar tabs={adminOrchTabs} activeId={orchScope} onChange={handleOrchAdminTab}>
          {orchScope === ORCH_SCOPE_OWNER && (
            <FormControl size="small" sx={orchSelectSx}>
              <InputLabel id="orch-owner-select-label">Property manager</InputLabel>
              <Select
                labelId="orch-owner-select-label"
                label="Property manager"
                value={orchOwnerId}
                onChange={handleOrchOwnerSelect}
                disabled={ownersLoading}
              >
                <MenuItem value="">
                  <em>Choisir un propriétaire…</em>
                </MenuItem>
                {owners.map((o) => (
                  <MenuItem key={o._id} value={o._id}>
                    {o.email || o._id}
                    {o.firstName || o.lastName
                      ? ` (${[o.firstName, o.lastName].filter(Boolean).join(' ')})`
                      : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {orchScope === ORCH_SCOPE_OWNER && orchOwnerId && (
            <ApplyAdminTemplateToOwnerButton
              targetOwnerId={orchOwnerId}
              disabled={ownersLoading}
              onApplied={() => setOrchConfigReloadNonce((n) => n + 1)}
            />
          )}
        </OrchSubTabBar>
      )}

      {isOrchestrationAdmin && configTab === 'orchestration' && orchScope === ORCH_SCOPE_OWNER && (
        <OrchHint>
          Sélectionnez un compte propriétaire pour charger et modifier sa configuration (copie indépendante en base).
        </OrchHint>
      )}

      <OrchConfigPanel>
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 200, p: { xs: 1, sm: 2 } }}>
          {configTab === 'orchestration' && (
            <ConfigTaskTemplateView
              key={`${taskTemplateTargetOwnerId}-${orchConfigReloadNonce}`}
              targetOwnerId={taskTemplateTargetOwnerId}
            />
          )}
          {configTab === 'messages' && <ConfigMessagesView />}
        </Box>
      </OrchConfigPanel>
    </OrchConfigPageShell>
  );
};

export default OrchestratorConfigContent;
