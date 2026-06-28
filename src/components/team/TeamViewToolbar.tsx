import { Box, Paper, Typography } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useTeamViewMode } from '../../context/TeamViewContext';
import { TEAM_T } from './teamHubTokens';

type TeamViewToolbarProps = {
  stats?: Array<{ icon: string; label: string; value: string; iconBg?: string; iconColor?: string }>;
};

function KpiCompact({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.5,
        border: `1px solid ${TEAM_T.border}`,
        borderRadius: 0.75,
        bgcolor: TEAM_T.bg2,
        minWidth: 64,
      }}
    >
      <Typography
        sx={{
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: TEAM_T.text3,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: accent, lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Box>
  );
}

export function TeamViewToolbar({ stats = [] }: TeamViewToolbarProps) {
  const { viewMode, setViewMode, toolbarAction } = useTeamViewMode();

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1.25,
        py: 0.875,
        mb: 1,
        border: `1px solid ${TEAM_T.border}`,
        borderRadius: 1.25,
        bgcolor: TEAM_T.bg1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        {stats.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.625 }}>
            {stats.map((s) => (
              <KpiCompact
                key={s.label}
                label={s.label}
                value={s.value}
                accent={s.iconColor || TEAM_T.primaryDeep}
              />
            ))}
          </Box>
        ) : (
          <Typography sx={{ fontSize: 11.5, color: TEAM_T.text3 }}>Vue équipe</Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box
            sx={{
              display: 'inline-flex',
              bgcolor: TEAM_T.bg2,
              border: `1px solid ${TEAM_T.border}`,
              borderRadius: '8px',
              p: '2px',
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
          {toolbarAction}
        </Box>
      </Box>
    </Paper>
  );
}

export default TeamViewToolbar;
