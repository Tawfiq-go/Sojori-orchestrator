// ════════════════════════════════════════════════════════════════════
// WhatsAppPreview.tsx
// Phone mockup live · aperçu en temps réel du flow support voyageur
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { SupportCategory } from './types';
import { SOJORI_TOKENS } from './types';

const T = SOJORI_TOKENS;
const WA_BG = '#075E54';
const WA_BG_LIGHT = '#ECE5DD';
const WA_GREEN = '#25D366';

interface Props {
  categories: SupportCategory[];
}

export default function WhatsAppPreview({ categories }: Props) {
  return (
    <Box sx={{
      width: 300, mx: 'auto', bgcolor: '#1a1a1a', borderRadius: 3.75, p: '7px',
      boxShadow: '0 24px 48px rgba(0,0,0,0.30), 0 8px 16px rgba(0,0,0,0.15)',
      position: 'relative',
      '&::before': {
        content: '""', position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
        width: 55, height: 5, bgcolor: '#000', borderRadius: '99px', zIndex: 2,
      },
    }}>
      <Box sx={{ bgcolor: '#fff', borderRadius: 3, overflow: 'hidden', pt: '17px' }}>
        {/* WA flow header */}
        <Stack direction="row" alignItems="center" gap={1.125} sx={{
          bgcolor: WA_BG, color: '#fff', p: '9px 12px',
        }}>
          <Box sx={{ fontSize: 16, opacity: 0.9 }}>‹</Box>
          <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>
            Quel problème ?
          </Typography>
          <Box sx={{ fontSize: 16, opacity: 0.9 }}>✕</Box>
        </Stack>

        {/* Flow body */}
        <Box sx={{ p: '12px', bgcolor: '#fff', minHeight: 200 }}>
          <Typography sx={{
            fontSize: 9.5, fontWeight: 800, color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75,
          }}>Catégorie</Typography>

          {categories.length === 0 ? (
            <Typography sx={{
              p: 2, textAlign: 'center', fontSize: 11.5, color: T.text4,
              bgcolor: T.bg2, borderRadius: 1, border: `1px dashed ${T.borderStrong}`,
            }}>
              ⚠ Aucune catégorie active
            </Typography>
          ) : (
            categories.map((cat, idx) => (
              <Stack key={cat.id} direction="row" alignItems="flex-start" gap={1} sx={{
                p: '8px 9px', mb: 0.5,
                bgcolor: idx === 0 ? '#F0FAF3' : '#fff',
                border: `1px solid ${idx === 0 ? WA_GREEN : T.border}`,
                borderRadius: 0.875, cursor: 'pointer',
              }}>
                <Box sx={{
                  width: 13, height: 13, borderRadius: '50%',
                  border: `2px solid ${idx === 0 ? WA_GREEN : T.borderStrong}`,
                  flexShrink: 0, mt: '1px',
                  background: idx === 0 ? `radial-gradient(circle at center, ${WA_GREEN} 0 3px, transparent 3px)` : 'transparent',
                }} />
                <Box sx={{ fontSize: 13, flexShrink: 0, lineHeight: 1 }}>{cat.icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{
                    fontSize: 11.5, fontWeight: 700, letterSpacing: '-0.005em', lineHeight: 1.25,
                  }}>{cat.label.fr}</Typography>
                  {cat.description?.fr && (
                    <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.125, fontWeight: 500 }}>
                      {cat.description.fr}
                    </Typography>
                  )}
                </Box>
              </Stack>
            ))
          )}

          <Typography sx={{
            fontSize: 9.5, fontWeight: 800, color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            textTransform: 'uppercase', letterSpacing: '0.06em', mt: 1.5, mb: 0.75,
          }}>Description<Box component="span" sx={{ color: '#c81e1e' }}> *</Box></Typography>
          <Box component="textarea" placeholder="Décrivez le problème…" sx={{
            display: 'block', width: '100%', p: '8px 10px',
            border: `1px solid ${T.border}`, borderRadius: 0.875, bgcolor: T.bg2,
            font: 'inherit', fontSize: 11.5, minHeight: 50, resize: 'none',
            boxSizing: 'border-box',
          }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
            mt: 1.5, p: 0, borderTop: `1px dashed ${T.border}`, pt: 1.25,
          }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Urgent ?</Typography>
            <Box sx={{
              width: 28, height: 16, borderRadius: '99px', position: 'relative',
              background: `linear-gradient(135deg, #cb9b2c, ${T.primary})`,
              '&::after': {
                content: '""', position: 'absolute', top: 2, right: 2,
                width: 12, height: 12, bgcolor: '#fff', borderRadius: '50%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
              },
            }} />
          </Stack>

          <Box sx={{
            mt: 1.5, p: '11px', textAlign: 'center',
            background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`,
            color: '#1a1408', fontSize: 13, fontWeight: 800, borderRadius: 1.125,
            letterSpacing: '-0.005em',
            boxShadow: '0 2px 8px rgba(184,133,26,0.30)',
            cursor: 'pointer',
          }}>Envoyer →</Box>
        </Box>
      </Box>
    </Box>
  );
}
