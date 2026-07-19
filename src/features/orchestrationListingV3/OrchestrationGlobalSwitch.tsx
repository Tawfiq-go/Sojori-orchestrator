import { Box, Stack, Switch, Tooltip, Typography } from '@mui/material';
import { V3 } from './theme';

type Props = {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  /** owner | listing — adapte le libellé secondaire */
  scope?: 'owner' | 'listing';
};

/**
 * Coupe-circuit orchestrationEnabled (plan / tâches / messages auto).
 * Indépendant de l’activation service par service.
 */
export default function OrchestrationGlobalSwitch({
  checked,
  disabled = false,
  onChange,
  scope = 'listing',
}: Props) {
  const desc =
    scope === 'owner'
      ? 'Si OFF : aucun plan / tâche / message auto pour les annonces sync depuis ce modèle (sauf override listing).'
      : 'Si OFF : aucun plan, tâche ni message auto pour ce listing — même si des services sont ON.';

  return (
    <Tooltip title={desc} enterDelay={400}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 0.5,
          borderRadius: 1,
          border: `1px solid ${checked ? V3.wa : 'rgba(200,30,30,0.35)'}`,
          bgcolor: checked ? V3.waT : 'rgba(200,30,30,0.06)',
          minHeight: 36,
        }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, flex: 1, minWidth: 0 }}>
          Orchestration globale
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: checked ? V3.wa : '#9b1c1c',
            }}
          >
            {checked ? 'ON' : 'OFF'}
          </Typography>
          <Switch
            size="small"
            checked={checked}
            disabled={disabled}
            onChange={(_, v) => onChange(v)}
            inputProps={{ 'aria-label': 'Orchestration globale' }}
            sx={{ my: -0.5 }}
          />
        </Stack>
      </Box>
    </Tooltip>
  );
}
