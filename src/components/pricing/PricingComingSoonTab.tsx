import { Stack, Typography } from '@mui/material';
import { MonitorEmpty, monitorTokens as t } from '../../features/monitoring/shared/MonitorDesign';

export function PricingComingSoonTab({ label, hint }: { label: string; hint: string }) {
  return (
    <Stack spacing={1.5}>
      <MonitorEmpty message={`${label} — pas encore implémenté.`} />
      <Typography sx={{ fontSize: 11, color: t.text3 }}>{hint}</Typography>
    </Stack>
  );
}

export default PricingComingSoonTab;
