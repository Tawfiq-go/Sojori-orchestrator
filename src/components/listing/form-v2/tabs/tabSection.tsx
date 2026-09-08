import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Section repliable des onglets listing (Options séjour, Expériences…) :
 * titre + résumé d'état lisible sans ouvrir, contenu replié par défaut.
 */
export function TabSection({
  id,
  icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Accordion
      expanded={open}
      onChange={onToggle}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px !important',
        mb: 1,
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', pr: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 750 }}>
            {icon} {title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{summary}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
