import { useNavigate } from 'react-router-dom';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { useAuth } from '../../hooks/useAuth';
import { toLegacyAuthUser } from '../../utils/legacyAuthUser';
import { REPORTS_CATALOG, reportsForMode, type ReportEntry } from '../../config/reportsConfig';
import { useReportsMode } from './useReportsMode';

/**
 * Accueil des rapports — fusion Dashboard + Rapports + Rapports 2.
 *
 * Filtré dynamiquement selon le tag `reportsMode` (hôtel/LCD) du PM regardé —
 * jamais de mélange, un rapport hôtel n'a pas de sens pour un gestionnaire
 * multi-biens et inversement. Les rapports `both` sont toujours visibles.
 */

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  gold: '#E6B022',
  green: '#93C47D',
  red: '#C81E1E',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
};

function ReportCard({ report, onClick }: { report: ReportEntry; onClick: () => void }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2.5,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${report.accent}`,
        borderRadius: 1.75,
        bgcolor: T.bg1,
        cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s',
        '&:hover': { borderColor: report.accent, boxShadow: '0 2px 12px rgba(20,17,10,0.06)' },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800, color: T.text }}>{report.title}</Typography>
        <Chip
          size="small"
          label="Lancer"
          sx={{
            height: 20,
            fontSize: 10.5,
            fontWeight: 700,
            bgcolor: `${report.accent}1e`,
            color: report.accent === T.gold ? T.primaryDeep : report.accent,
          }}
        />
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: T.text2, fontWeight: 600, mt: 0.5 }}>
        {report.pitch}
      </Typography>
      <Typography sx={{ fontSize: 12, color: T.text3, mt: 1, lineHeight: 1.55 }}>
        {report.detail}
      </Typography>
    </Paper>
  );
}

export function ReportsHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const legacyUser = toLegacyAuthUser(user);
  const isAdmin = legacyUser?.role === 'SuperAdmin' || legacyUser?.role === 'Admin';
  const reportsMode = useReportsMode();

  const visible = reportsForMode(reportsMode).filter((r) => !r.adminOnly || isAdmin);
  const featured = visible.filter((r) => r.featured);
  const others = visible.filter((r) => !r.featured);

  return (
    <DashboardWrapper breadcrumb={['Rapports']}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
        Choisissez un rapport. Les données proviennent du PMS et des saisies Sojori, sans
        ressaisie.
        {reportsMode === 'hotel' ? ' Vue hôtel.' : ' Vue location courte durée.'}
      </Typography>

      {featured.length ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          {featured.map((r) => (
            <ReportCard key={r.id} report={r} onClick={() => navigate(r.route)} />
          ))}
        </Box>
      ) : null}

      {others.length ? (
        <>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.text3, mb: 1.5, mt: 1 }}>
            AUTRES RAPPORTS
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            {others.map((r) => (
              <ReportCard key={r.id} report={r} onClick={() => navigate(r.route)} />
            ))}
          </Box>
        </>
      ) : null}
    </DashboardWrapper>
  );
}

export { REPORTS_CATALOG };
