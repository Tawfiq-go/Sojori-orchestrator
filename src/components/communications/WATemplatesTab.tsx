import { Box, Typography } from '@mui/material';
import { Panel, tokens as t } from '../dashboard/DashboardV2.components';

/**
 * WA Templates Tab - Templates WhatsApp pour QA
 * Tab dans Communications Hub
 *
 * TODO: Implémenter liste des templates WhatsApp avec préview
 */
export default function WATemplatesTab() {
  return (
    <Panel>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography sx={{ fontSize: 48, mb: 2 }}>📝</Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
          WA Templates (QA)
        </Typography>
        <Typography sx={{ fontSize: 13, color: t.text3 }}>
          Liste des templates WhatsApp pour QA - À implémenter
        </Typography>
      </Box>
    </Panel>
  );
}
