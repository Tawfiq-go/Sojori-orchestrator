import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ConfigMessagesView from './ConfigMessagesView';
import ConfigTaskTemplateView from './ConfigTaskTemplateView';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import apiClient from '../../config/axios';
import { MICROSERVICE_BASE_URL } from '../../config/backendServer.config';
import {
  isOrchestrationAdminUser,
  ORCHESTRATION_ADMIN_OWNER_ID,
} from '../../constants/orchestrationAdmin';
import ApplyAdminTemplateToOwnerButton from '../../features/setting/components/ApplyAdminTemplateToOwnerButton';

const SOJORI_ORANGE = { primary: '#FF6B35', dark: '#E55A2B' };

const ORCH_SCOPE_ADMIN = 'admin';
const ORCH_SCOPE_OWNER = 'owner';

/** Contenu de l'onglet Configuration : Modèles | Messages en haut de la page (pas dans le header) */
const OrchestratorConfigContent = () => {
  const { t } = useTranslation('common');
  const user = useSelector((state) => state.auth.user);
  const isOrchestrationAdmin = isOrchestrationAdminUser(user);

  const [searchParams, setSearchParams] = useSearchParams();
  const configTab = searchParams.get('configTab') || 'orchestration';

  const orchScopeRaw = searchParams.get('orchScope');
  const orchScope =
    isOrchestrationAdmin && orchScopeRaw === ORCH_SCOPE_OWNER ? ORCH_SCOPE_OWNER : ORCH_SCOPE_ADMIN;
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

  const tabs = [
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
    <>
      <ToastContainer />
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', pt: 1, pb: 0, px: 2 }}>
        {/* Onglets Modèles | Messages en haut de la page — toujours visibles */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 1.5,
            flexShrink: 0,
            borderBottom: '1px solid rgba(255, 107, 53, 0.12)',
            mb: 1,
          }}
        >
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTab(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.2s',
                background: configTab === id
                  ? `linear-gradient(135deg, ${SOJORI_ORANGE.primary} 0%, ${SOJORI_ORANGE.dark} 100%)`
                  : 'transparent',
                color: configTab === id ? '#fff' : '#6b7280',
              }}
              onMouseEnter={(e) => {
                if (configTab !== id) {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                if (configTab !== id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </Box>

        {isOrchestrationAdmin && configTab === 'orchestration' && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              py: 1,
              flexShrink: 0,
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              mb: 1,
            }}
          >
            {adminOrchTabs.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleOrchAdminTab(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  transition: 'all 0.2s',
                  background: orchScope === id
                    ? `linear-gradient(135deg, ${SOJORI_ORANGE.primary} 0%, ${SOJORI_ORANGE.dark} 100%)`
                    : 'transparent',
                  color: orchScope === id ? '#fff' : '#6b7280',
                }}
                onMouseEnter={(e) => {
                  if (orchScope !== id) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (orchScope !== id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}

            {orchScope === ORCH_SCOPE_OWNER && (
              <FormControl size="small" sx={{ minWidth: 260, ml: { xs: 0, sm: 1 } }}>
                <InputLabel id="orch-owner-select-label">Owner</InputLabel>
                <Select
                  labelId="orch-owner-select-label"
                  label="Owner"
                  value={orchOwnerId}
                  onChange={handleOrchOwnerSelect}
                  disabled={ownersLoading}
                >
                  <MenuItem value="">
                    <em>Choisir un propriétaire…</em>
                  </MenuItem>
                  {owners.map((o) => (
                    <MenuItem key={o._id} value={o._id}>
                      {o.email || o._id}{' '}
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
          </Box>
        )}

        {isOrchestrationAdmin && configTab === 'orchestration' && orchScope === ORCH_SCOPE_OWNER && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Sélectionnez un compte propriétaire pour charger et modifier sa configuration (copie indépendante en base).
          </Typography>
        )}

        {/* Contenu Modèles (templates) ou Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 200 }}>
          {configTab === 'orchestration' && (
            <ConfigTaskTemplateView
              key={`${taskTemplateTargetOwnerId}-${orchConfigReloadNonce}`}
              targetOwnerId={taskTemplateTargetOwnerId}
            />
          )}
          {configTab === 'messages' && <ConfigMessagesView />}
        </Box>
      </Box>
    </>
  );
};

export default OrchestratorConfigContent;
