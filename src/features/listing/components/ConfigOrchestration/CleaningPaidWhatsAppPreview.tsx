// Aperçu fixe · entrée menu WA « Ménage payant » (libellé non modifiable par le PM)
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { SOJORI_TOKENS as T } from './types';
import { PAID_CLEANING_WA_MENU_LABEL_FR } from './cleaningConfigTypes';
import type { PaidCleaningServiceType } from './cleaningConfigTypes';
import { TYPO } from './SHARED';

const WA_BG = '#075E54';
const WA_GREEN = '#25D366';

type Props = {
  serviceTypes: PaidCleaningServiceType[];
};

export default function CleaningPaidWhatsAppPreview({ serviceTypes }: Props) {
  const active = serviceTypes.filter(s => s.enabled);

  return (
    <Box
      sx={{
        bgcolor: 'linear-gradient(180deg, #f0eee8, #e7e1d2)',
        borderRadius: 1.25,
        p: 2,
        position: { lg: 'sticky' },
        top: 72,
        alignSelf: 'flex-start',
      }}
    >
      <Typography sx={{ ...TYPO.bodyBold, fontSize: 12.5, mb: 1.25 }}>📱 Aperçu Menu WhatsApp</Typography>
      <Box
        sx={{
          width: '100%',
          maxWidth: 280,
          mx: 'auto',
          bgcolor: '#1a1a1a',
          borderRadius: 3,
          p: '6px',
          boxShadow: '0 16px 32px rgba(0,0,0,0.22)',
        }}
      >
        <Box sx={{ bgcolor: '#fff', borderRadius: 2.5, overflow: 'hidden', pt: '14px' }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ bgcolor: WA_BG, color: '#fff', px: 1.5, py: 1 }}>
            <Typography sx={{ fontSize: 14, opacity: 0.9, fontWeight: 600 }}>‹</Typography>
            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>Services</Typography>
          </Stack>
          <Box sx={{ p: 1.25, bgcolor: '#fff' }}>
            <Typography sx={{ ...TYPO.caps, mb: 0.75 }}>Libellé fixe (FR)</Typography>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                p: '9px 10px',
                border: `2px solid ${WA_GREEN}`,
                borderRadius: 1,
                bgcolor: '#F0FAF3',
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: `2px solid ${WA_GREEN}`,
                  background: `radial-gradient(circle at center, ${WA_GREEN} 0 3px, transparent 3px)`,
                }}
              />
              <Typography sx={{ fontSize: 18, lineHeight: 1 }}>🧹</Typography>
              <Typography sx={{ ...TYPO.bodyBold, fontSize: 12.5, flex: 1 }}>{PAID_CLEANING_WA_MENU_LABEL_FR}</Typography>
            </Stack>

            {active.length > 0 && (
              <>
                <Typography sx={{ ...TYPO.caps, mt: 1.25, mb: 0.5 }}>Types configurés</Typography>
                <Stack gap={0.5}>
                  {active.map((s, i) => (
                    <Stack
                      key={s.id}
                      direction="row"
                      alignItems="center"
                      gap={0.75}
                      sx={{
                        p: '7px 9px',
                        border: `1px solid ${i === 0 ? WA_GREEN : T.border}`,
                        borderRadius: 0.875,
                        bgcolor: i === 0 ? '#F0FAF3' : '#fff',
                      }}
                    >
                      <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{s.icon}</Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ ...TYPO.small, lineHeight: 1.2 }} noWrap>
                          {s.labelFr}
                        </Typography>
                        <Typography sx={{ ...TYPO.monoHelp, fontSize: 9.5 }}>{s.price} MAD</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
          </Box>
        </Box>
      </Box>
      <Typography sx={{ ...TYPO.monoHelp, textAlign: 'center', mt: 1 }}>
        Libellé menu · traduction plus tard
      </Typography>
    </Box>
  );
}
