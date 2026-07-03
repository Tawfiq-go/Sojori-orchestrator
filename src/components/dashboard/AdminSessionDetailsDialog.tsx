import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import { tokens as t, pageMetaChipSx } from './dashboardTokens';
import type { User } from '../../contexts/AuthContext';
import type { AdminSessionViewModel } from './adminSessionDetails.shared';

type Props = {
  open: boolean;
  onClose: () => void;
  user: User;
  view: AdminSessionViewModel;
};

export function AdminSessionDetailsDialog({ open, onClose, user, view }: Props) {
  const { build, role, displayName, langCode, langLabel, deployedAt, scope, adminScopeMode, deployChip } = view;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(230,176,34,0.12)',
              border: `1px solid rgba(230,176,34,0.25)`,
              color: t.primaryDeep,
            }}
          >
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>Session admin</Typography>
            <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.25 }}>Compte, scope et statut front</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2.5}>
          <Section title="Compte" icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />}>
            <Stack spacing={1}>
              <Row label="Nom" value={displayName} />
              <Row label="Email" value={user.email ?? '—'} />
              <Row label="Rôle" value={role} />
            </Stack>
          </Section>

          <Section title="Interface" icon={<LanguageOutlinedIcon sx={{ fontSize: 16 }} />}>
            <Stack spacing={1}>
              <Row label="Langue" value={`${langLabel} (${langCode})`} />
              <Typography variant="caption" color="text.secondary">
                Modifiable via Mon compte (bas de la barre latérale).
              </Typography>
            </Stack>
          </Section>

          <Section title="Scope plateforme" icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />}>
            <Stack spacing={1}>
              <Row label="Filtre PM" value={scope} />
              <Row label="Mode" value={adminScopeMode} />
            </Stack>
          </Section>

          <Section title="Déploiement front" icon={<CloudOutlinedIcon sx={{ fontSize: 16 }} />}>
            <Stack spacing={1}>
              <Chip size="small" label={deployChip} sx={{ ...pageMetaChipSx, alignSelf: 'flex-start' }} />
              <Row label="Commit" value={build.commitSha} />
              <Row label="Déployé" value={deployedAt ?? '—'} />
              <Row label="Environnement" value={build.deployEnv || (import.meta.env.PROD ? 'production' : 'development')} />
              <Row label="API backend" value={build.apiOrigin} />
              <Row label="Hôte front" value={build.host || '—'} />
            </Stack>
          </Section>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
        <Box sx={{ color: t.primaryDeep, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1.25, borderColor: t.border }} />
      {children}
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3, minWidth: 110, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, color: t.text, wordBreak: 'break-all' }}>{value}</Typography>
    </Stack>
  );
}
