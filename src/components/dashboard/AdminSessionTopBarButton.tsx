import { useMemo, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import { isPlatformAdminRole } from '../../utils/taskScope.utils';
import { buildAdminSessionViewModel } from './adminSessionDetails.shared';
import { AdminSessionDetailsDialog } from './AdminSessionDetailsDialog';
import { tokens as t } from './dashboardTokens';
import { getFrontRuntimeTag } from '../../utils/appBuildInfo';

const iconBtnSx = {
  width: 36,
  height: 36,
  borderRadius: '9px',
  color: t.text2,
  transition: 'background-color 0.18s ease, color 0.18s ease, transform 0.18s ease',
  '&:hover': { bgcolor: t.bg2, color: t.text, transform: 'translateY(-1px)' },
  position: 'relative' as const,
};

/** Icône statut session admin (top bar droite) — SuperAdmin / Admin uniquement. */
export function AdminSessionTopBarButton() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { ownerScopeUnset, ownerScopeAll, requestOwnerId, adminScopeMode } = useAdminOwnerFilter();
  const [open, setOpen] = useState(false);

  const isAdmin = isPlatformAdminRole(user?.role);
  const langCode = (i18n.language || 'fr').split('-')[0];

  const view = useMemo(() => {
    if (!user) return null;
    return buildAdminSessionViewModel({
      user,
      langCode,
      ownerScopeUnset,
      ownerScopeAll,
      requestOwnerId,
      adminScopeMode,
    });
  }, [user, langCode, ownerScopeUnset, ownerScopeAll, requestOwnerId, adminScopeMode]);

  if (!isAdmin || !user || !view) return null;

  const frontTag = getFrontRuntimeTag();

  return (
    <>
      <Tooltip title={`Session admin · ${frontTag.shortLabel}`}>
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="Ouvrir session admin et statut déploiement"
          sx={{
            ...iconBtnSx,
            color: t.primaryDeep,
            bgcolor: frontTag.bg,
            border: `1px solid ${frontTag.border}`,
            '&:hover': {
              bgcolor: frontTag.bg,
              color: frontTag.color,
              filter: 'brightness(0.97)',
            },
          }}
        >
          <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20, color: frontTag.color }} />
          {ownerScopeUnset ? (
            <Box
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: t.warning,
                border: `2px solid ${t.bg1}`,
              }}
            />
          ) : null}
        </IconButton>
      </Tooltip>
      <AdminSessionDetailsDialog open={open} onClose={() => setOpen(false)} user={user} view={view} />
    </>
  );
}
