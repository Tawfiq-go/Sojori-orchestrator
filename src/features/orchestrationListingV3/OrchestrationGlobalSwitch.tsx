import { Box, Stack, Switch, Typography } from '@mui/material';
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
      ? 'Si désactivé : aucun plan / tâche / message auto pour les annonces synchronisées depuis ce modèle (sauf override listing).'
      : 'Si désactivé : aucun plan, aucune tâche ni message automatique pour ce listing — même si des services sont actifs ci-dessous.';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        p: 1.5,
        mb: 1.5,
        borderRadius: 1.5,
        border: `1px solid ${checked ? V3.wa : 'rgba(200,30,30,0.35)'}`,
        bgcolor: checked ? V3.waT : 'rgba(200,30,30,0.06)',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>
          Orchestration globale
        </Typography>
        <Typography sx={{ fontSize: 11, color: V3.t3, lineHeight: 1.35, mt: 0.25 }}>
          {desc}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: checked ? V3.wa : '#9b1c1c',
          }}
        >
          {checked ? 'Active' : 'Coupée'}
        </Typography>
        <Switch
          size="small"
          checked={checked}
          disabled={disabled}
          onChange={(_, v) => onChange(v)}
          inputProps={{ 'aria-label': 'Orchestration globale' }}
        />
      </Stack>
    </Box>
  );
}
