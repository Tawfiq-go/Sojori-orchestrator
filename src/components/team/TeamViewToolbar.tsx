import { Box, Paper, Stack, Typography } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useTeamViewMode } from '../../context/TeamViewContext';
import { TEAM_T } from './teamHubTokens';

type TeamViewToolbarProps = {
  stats?: Array<{ icon: string; label: string; value: string; iconBg?: string; iconColor?: string }>;
};

function KpiCompact({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Paper
      sx={{
        px: 1.25,
        py: 0.75,
        border: `1px solid ${TEAM_T.border}`,
        borderRadius: 1,
        bgcolor: TEAM_T.bg1,
        minWidth: 72,
      }}
    >
      <Typography
        sx={{
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: TEAM_T.text3,
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: accent, lineHeight: 1 }}>
        {value}
      </Typography>
    </Paper>
  );
}

export function TeamViewToolbar({ stats = [] }: TeamViewToolbarProps) {
  const { viewMode, setViewMode } = useTeamViewMode();

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 1.5,
        border: `1px solid ${TEAM_T.border}`,
        borderRadius: 1.5,
        bgcolor: TEAM_T.bg1,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.25}>
        {stats.length > 0 ? (
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            {stats.map((s) => (
              <KpiCompact
                key={s.label}
                label={s.label}
                value={s.value}
                accent={s.iconColor || TEAM_T.primaryDeep}
              />
            ))}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: 12, color: TEAM_T.text3 }}>Vue équipe</Typography>
        )}

        <Box
          sx={{
            display: 'inline-flex',
            bgcolor: TEAM_T.bg2,
            border: `1px solid ${TEAM_T.border}`,
            borderRadius: '9px',
            p: '3px',
            gap: '2px',
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => setViewMode('cards')}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.625,
              borderRadius: '6px',
              fontSize: 12,
              fontWeight: 700,
              color: viewMode === 'cards' ? '#1a1408' : TEAM_T.text2,
              background:
                viewMode === 'cards'
                  ? `linear-gradient(180deg, #cb9b2c, ${TEAM_T.primary})`
                  : 'transparent',
            }}
          >
            <GridViewIcon sx={{ fontSize: 16 }} />
            Cartes
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => setViewMode('list')}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.625,
              borderRadius: '6px',
              fontSize: 12,
              fontWeight: 700,
              color: viewMode === 'list' ? '#1a1408' : TEAM_T.text2,
              background:
                viewMode === 'list'
                  ? `linear-gradient(180deg, #cb9b2c, ${TEAM_T.primary})`
                  : 'transparent',
            }}
          >
            <ViewListIcon sx={{ fontSize: 16 }} />
            Liste
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

export default TeamViewToolbar;
