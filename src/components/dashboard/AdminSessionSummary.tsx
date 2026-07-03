import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import { isPlatformAdminRole, normalizeUserRole } from '../../utils/taskScope.utils';
import { formatBuildDeployedAt, getAppBuildInfo } from '../../utils/appBuildInfo';
import { tokens as t, pageMetaChipSx } from './DashboardV2.components';

const LANG_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
};

function scopeLabel(
  ownerScopeUnset: boolean,
  ownerScopeAll: boolean,
  requestOwnerId: string | null,
): string {
  if (ownerScopeUnset) return 'PM non sélectionné';
  if (ownerScopeAll) return 'Tous les PM (plateforme)';
  if (requestOwnerId) return `PM ${requestOwnerId.slice(-6)}`;
  return 'Scope actif';
}

export function AdminSessionSummary() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { ownerScopeUnset, ownerScopeAll, requestOwnerId, adminScopeMode } = useAdminOwnerFilter();
  const [open, setOpen] = useState(false);

  const isAdmin = isPlatformAdminRole(user?.role);
  const build = useMemo(() => getAppBuildInfo(), []);

  if (!isAdmin || !user) return null;

  const role = normalizeUserRole(user.role);
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Admin';
  const langCode = (i18n.language || 'fr').split('-')[0];
  const langLabel = LANG_LABELS[langCode] ?? langCode.toUpperCase();
  const deployedAt = formatBuildDeployedAt(build.builtAtIso);
  const scope = scopeLabel(ownerScopeUnset, ownerScopeAll, requestOwnerId);

  return (
    <>
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          border: `1px solid ${t.border}`,
          bgcolor: t.bg1,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 18, color: t.primaryDeep }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text, mr: 0.5 }}>
          Session admin
        </Typography>
        <Chip size="small" label={displayName} sx={pageMetaChipSx} />
        <Chip size="small" label={user.email} sx={pageMetaChipSx} />
        <Chip size="small" label={`Langue · ${langLabel}`} sx={pageMetaChipSx} />
        <Chip size="small" label={`Rôle · ${role}`} sx={pageMetaChipSx} />
        <Chip size="small" label={`Scope · ${scope}`} sx={pageMetaChipSx} />
        {deployedAt ? (
          <Chip size="small" label={`Front Vercel · ${build.commitSha} · ${deployedAt}`} sx={pageMetaChipSx} />
        ) : (
          <Chip size="small" label={`Build · ${build.commitSha} (local)`} sx={pageMetaChipSx} />
        )}
        <Button size="small" variant="text" onClick={() => setOpen(true)} sx={{ ml: { sm: 'auto' }, fontSize: 12 }}>
          Détails
        </Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Résumé session & déploiement</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Row label="Nom" value={displayName} />
            <Row label="Email" value={user.email} />
            <Row label="Rôle" value={role} />
            <Row label="Langue interface" value={`${langLabel} (${langCode})`} />
            <Row label="Filtre PM" value={scope} />
            <Row label="Mode scope" value={adminScopeMode} />
            <Row label="API backend" value={build.apiOrigin} />
            <Row label="Hôte front" value={build.host || '—'} />
            <Row label="Commit front" value={build.commitSha} />
            <Row label="Déployé (build)" value={deployedAt ?? '—'} />
            <Row label="Environnement" value={build.deployEnv || (import.meta.env.PROD ? 'production' : 'development')} />
            <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
              Visible uniquement pour SuperAdmin / Admin. Les propriétaires (Owner) ne voient pas ce panneau.
              Le backend reste sur le cluster ({build.apiOrigin}) ; Vercel ne sert que le front statique.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3, minWidth: 130 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: t.text, wordBreak: 'break-all' }}>{value}</Typography>
    </Stack>
  );
}
