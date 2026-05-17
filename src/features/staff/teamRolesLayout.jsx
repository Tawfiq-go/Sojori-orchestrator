import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
/** Orchestrator : shell déjà fourni par DashboardWrapper — pas de layout legacy */
function DashboardLayout({ children }) {
  return children;
}

export const TEAM_ROLES_FONT = "'Poppins', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const teamRolesOuterSx = {
  width: '100%',
  maxWidth: '100%',
  minHeight: '100%',
  px: { xs: 0.5, sm: 1 },
  pt: 0.75,
  pb: 2,
  bgcolor: '#f8f8fa',
  fontFamily: TEAM_ROLES_FONT,
};

export const teamRolesHeaderPaperSx = {
  mb: 1,
  px: 1.25,
  py: 0.85,
  borderRadius: 1.5,
  background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #fffaf5 100%)',
  border: '1px solid rgba(255,107,53,0.28)',
  boxShadow: '0 2px 12px rgba(255, 107, 53, 0.08)',
};

export const teamRolesContentPaperSx = {
  borderRadius: 1.5,
  border: '1px solid rgba(255,107,53,0.15)',
  overflow: 'hidden',
  bgcolor: '#ffffff',
  boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
};

/** Barres GlobalFilter / ListingGlobalFilter sous le bandeau orange (Équipe & Rôles). */
export const TEAM_ROLES_FILTER_WRAP_CLASS_COMPACT = 'w-full !mt-0 !mb-0 px-1 py-1';

/** Espacement legacy (pages staff hors shell commun). */
export const TEAM_ROLES_FILTER_WRAP_CLASS_DEFAULT = 'w-full !mt-5';

/** En-têtes de tableau denses (même ligne que Admin WhatsApp / GlobalTable dense). */
export const teamRolesTableHeaderCellSx = {
  background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
  color: '#0f172a',
  fontWeight: 700,
  fontSize: '11px',
  p: 1,
  borderBottom: '2px solid #FF6B35',
};

export const teamRolesTableHeaderCellSxCenter = {
  ...teamRolesTableHeaderCellSx,
  textAlign: 'center',
};

/** Bande filtres (planning staff) alignée visuellement sur le bandeau Équipe & Rôles. */
export const teamRolesPlanningFiltersSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1,
  mb: 1.25,
  p: 1,
  background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #fffaf5 100%)',
  borderRadius: 1.5,
  border: '1px solid rgba(255,107,53,0.22)',
  boxShadow: '0 1px 8px rgba(255, 107, 53, 0.06)',
};

const iconWrapSx = {
  width: 32,
  height: 32,
  borderRadius: 1,
  bgcolor: '#FF6B35',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  boxShadow: '0 2px 8px rgba(255,107,53,0.35)',
  flexShrink: 0,
};

/**
 * Bandeau titre compact (même style que la page Property manager / owners).
 */
export function TeamRolesSectionHeader({ title, titleKey, icon, chip, actions }) {
  const { t } = useTranslation('common');
  const label = titleKey ? t(titleKey) : title;
  if (!label && !icon && !chip && !actions) return null;

  return (
    <Paper elevation={0} sx={teamRolesHeaderPaperSx}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          {icon != null ? <Box sx={iconWrapSx}>{icon}</Box> : null}
          {label ? (
            <Typography
              sx={{
                fontFamily: TEAM_ROLES_FONT,
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '-0.02em',
                color: '#E55A2B',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </Typography>
          ) : null}
          {chip}
        </Stack>
        {actions ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{actions}</Box> : null}
      </Stack>
    </Paper>
  );
}

/**
 * Conteneur commun Équipe & Rôles : pleine largeur (sidenav repliée côté admin), fond gris léger.
 */
export default function TeamRolesPageShell({ children }) {
  return (
    <DashboardLayout>
      <Box className="team-roles-page" sx={teamRolesOuterSx}>
        {children}
      </Box>
    </DashboardLayout>
  );
}
