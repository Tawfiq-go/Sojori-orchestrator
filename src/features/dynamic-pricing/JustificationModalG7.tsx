// ════════════════════════════════════════════════════════════════════
// JustificationModalG7.tsx — modale waterfall horizontale
// Pénalités (rouge) vs bonus (gold) · 7 facteurs · concurrents directs
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Dialog, Box, Stack, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { T } from './_tokens';
import type { PriceFactor, CompListing } from './_tokens';

export interface MinStayFactorView {
  key: string;
  label: string;
  sub?: string;
  nights: number;
  kind: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  date?: string;
  factors: PriceFactor[];
  minStayFactors?: MinStayFactorView[];
  finalMinStay?: number;
  marketMinNights?: number;
  loading?: boolean;
  comps: CompListing[];
  total: number;
  onApply?: () => void;
  onEditManual?: () => void;
}

export default function JustificationModalG7({
  open,
  onClose,
  date,
  factors,
  minStayFactors = [],
  finalMinStay = 1,
  marketMinNights = 1,
  loading = false,
  comps,
  total,
  onApply,
  onEditManual,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={false}
      PaperProps={{
        sx: {
          width: 760, maxWidth: '95vw', maxHeight: '90vh', borderRadius: 2.25,
          overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.30)',
          display: 'flex', flexDirection: 'column', m: 2,
        },
      }}
      BackdropProps={{ sx: { background: 'rgba(20,17,10,0.55)', backdropFilter: 'blur(4px)' } }}
    >
      {/* Header noir + gold */}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.75, 
        p: '20px 26px', borderBottom: `1px solid ${T.border}`,
        background: 'linear-gradient(135deg, #1a1408, #332b1c)', color: '#fff',
      }}>
        <Box sx={{
          width: 46, height: 46, borderRadius: 1.375,
          background: `linear-gradient(135deg, ${T.goldSoft}, ${T.gold})`,
          color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0, boxShadow: '0 4px 12px rgba(244,207,94,0.30)',
        }}>⚖</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: 11, fontFamily: '"Geist Mono", monospace', color: T.gold,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800,
          }}>{date || '—'}</Typography>
          <Typography sx={{ mt: 0.25, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            Justification du prix
          </Typography>
        </Box>
        <Stack sx={{ alignItems: 'flex-end' }}>
          <Typography sx={{
            fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: '"Geist Mono", monospace',
            textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
          }}>Prix recommandé</Typography>
          <Typography sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: 24, fontWeight: 800,
            color: T.gold, mt: 0.375, letterSpacing: '-0.02em',
          }}>{Math.round(total).toLocaleString('fr-FR')}<Box component="span" sx={{
            fontSize: 11, color: 'rgba(244,207,94,0.7)', ml: 0.375, fontWeight: 600,
          }}>MAD</Box></Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{
          ml: 1, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)',
          borderRadius: 1, width: 32, height: 32,
        }}><CloseIcon fontSize="small" /></IconButton>
      </Stack>

      {/* Body */}
      <Box sx={{ p: '22px 26px', overflowY: 'auto', flex: 1 }}>
        <Typography sx={{
          fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
          color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.75,
        }}>💰 Prix · {loading ? '…' : `${factors.length} facteur(s)`}</Typography>

        {loading ? (
          <Typography sx={{ fontSize: 12, color: T.text3, mb: 2 }}>Chargement breakdown…</Typography>
        ) : (
          factors.map((f) => <WaterfallRow key={f.key} factor={f} />)
        )}

        <Typography sx={{
          mt: 2.5,
          mb: 1.25,
          fontSize: 10.5,
          fontFamily: '"Geist Mono", monospace',
          fontWeight: 800,
          color: T.text3,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          🌙 Séjour minimum · base marché {marketMinNights} nuit{marketMinNights > 1 ? 's' : ''}
        </Typography>
        {minStayFactors.length > 0 ? (
          minStayFactors.map((f) => <MinStayRow key={f.key} factor={f} />)
        ) : (
          <Typography sx={{ fontSize: 12, color: T.text3, mb: 1 }}>
            Marché : {marketMinNights} nuit(s) — lancez preview/apply pour le détail.
          </Typography>
        )}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr 100px',
          gap: 1.75,
          alignItems: 'center',
          py: 0.75,
          mb: 1.5,
        }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Min. appliqué</Typography>
          <Box />
          <Typography sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 16,
            fontWeight: 800,
            color: T.goldDeep,
            textAlign: 'right',
          }}>
            {finalMinStay} nuit{finalMinStay > 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Total final */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: '200px 1fr 100px', gap: 1.75,
          alignItems: 'center', mt: 0.75, pt: 1.75, borderTop: `2px solid ${T.text}`,
        }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.text }}>Prix final recommandé</Typography>
          <Box sx={{ height: 24, background: T.bg2, borderRadius: 0.625, overflow: 'hidden', position: 'relative' }}>
            <Box sx={{
              position: 'absolute', top: -3, left: 0, height: 24, width: '86%',
              background: `linear-gradient(90deg, ${T.gold}, ${T.goldDeep})`,
              borderRadius: 0.5, animation: 'sj-drawBar 0.5s both',
              boxShadow: '0 4px 12px rgba(244,207,94,0.30)',
            }} />
          </Box>
          <Typography sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: 18, fontWeight: 800,
            color: T.goldDeep, textAlign: 'right',
          }}>{Math.round(total).toLocaleString('fr-FR')} MAD</Typography>
        </Box>

        {/* Confidence */}
        <Box sx={{
          mt: 2.25, p: '11px 14px', borderLeft: `3px solid ${T.success}`,
          background: `linear-gradient(90deg, ${T.successTint}, transparent)`,
          borderRadius: '0 1 1 0', fontSize: 12, color: T.text2,
        }}>
          <Box component="b" sx={{ color: T.success, fontWeight: 700 }}>Confiance : Haute</Box>
          {' · Mois dans la fenêtre lead time moyen (42 jours)'}
        </Box>

        {/* Concurrents */}
        {comps.length > 0 && (
          <>
            <Typography sx={{
              mt: 2.25, mb: 1.5, fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
              color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>🏨 Vos {comps.length} concurrents directs ce jour-là</Typography>
            <Stack sx={{ gap: 0.625 }}>
              {comps.map(c => <CompRow key={c._id} comp={c} />)}
            </Stack>
          </>
        )}
      </Box>

      {/* Footer */}
      <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.25, 
        p: '14px 26px', borderTop: `1px solid ${T.border}`, background: T.bg2,
      }}>
        <Button onClick={onEditManual || onClose} sx={{
          textTransform: 'none', fontWeight: 700, fontSize: 12.5, px: 2,
          background: T.bg1, color: T.text, border: `1px solid ${T.border}`,
          '&:hover': { background: T.bg3 },
        }}>Modifier manuellement</Button>
        <Button onClick={onApply} sx={{
          textTransform: 'none', fontWeight: 800, fontSize: 12.5, px: 2.25,
          background: `linear-gradient(180deg, #f9dc7a, ${T.gold})`, color: T.text,
          boxShadow: '0 2px 8px rgba(244,207,94,0.40)',
          '&:hover': { transform: 'translateY(-1px)' },
        }}>✓ Appliquer ce prix</Button>
      </Stack>
    </Dialog>
  );
}

function WaterfallRow({ factor }: { factor: PriceFactor }) {
  const colors = {
    base:    { bar: 'linear-gradient(90deg, #a8a299, #7a756c)', val: T.text3 },
    plus:    { bar: `linear-gradient(90deg, ${T.gold}, ${T.goldDeep})`, val: T.success },
    minus:   { bar: `linear-gradient(90deg, #fca5a5, ${T.error})`, val: T.error, borderLeft: T.error },
    neutral: { bar: T.bg3, val: T.text3, dashed: true },
  }[factor.kind];
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: '200px 1fr 100px', gap: 1.75,
      alignItems: 'center', py: 1, animation: 'sj-fadeIn 0.35s both',
    }}>
      <Typography sx={{ fontSize: 12, color: T.text2 }}>
        <Box component="b" sx={{ color: T.text, fontWeight: 700 }}>{factor.label}</Box>
        {factor.sub && <Box component="span" sx={{ display: 'block', fontSize: 10.5, color: T.text3 }}>{factor.sub}</Box>}
      </Typography>
      <Box sx={{ height: 18, background: T.bg2, borderRadius: 0.625, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{
          position: 'absolute', top: 0, bottom: 0,
          background: colors.bar, borderRadius: 0.5,
          animation: 'sj-drawBar 0.5s both', transformOrigin: 'left',
          ...(factor.kind === 'minus' ? { borderLeft: `3px solid ${colors.borderLeft}` } : {}),
          ...(factor.kind === 'neutral' ? { border: `1px dashed ${T.borderStrong}` } : {}),
          // Position calculée par le parent (ou ici en %)
          left: 0, width: `${Math.min(100, Math.abs(factor.value) / 20)}%`,
        }} />
      </Box>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 12.5, fontWeight: 800,
        textAlign: 'right', color: colors.val,
      }}>
        {factor.kind === 'plus' ? '+' : factor.kind === 'minus' ? '−' : ''}
        {Math.abs(factor.value).toLocaleString('fr-FR')} MAD
      </Typography>
    </Box>
  );
}

function MinStayRow({ factor }: { factor: MinStayFactorView }) {
  const accent =
    factor.kind === 'base' ? T.text : factor.kind === 'plus' ? T.success : T.text2;
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: '200px 1fr 100px',
      gap: 1.75,
      alignItems: 'center',
      py: 0.65,
    }}>
      <Typography sx={{ fontSize: 12, color: T.text2 }}>
        <Box component="b" sx={{ color: T.text, fontWeight: 700 }}>{factor.label}</Box>
        {factor.sub && (
          <Box component="span" sx={{ display: 'block', fontSize: 10.5, color: T.text3 }}>
            {factor.sub}
          </Box>
        )}
      </Typography>
      <Box sx={{ height: 10, bgcolor: T.bg2, borderRadius: 0.5 }} />
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: 12.5,
        fontWeight: 800,
        textAlign: 'right',
        color: accent,
      }}>
        {factor.nights} nuit{factor.nights > 1 ? 's' : ''}
      </Typography>
    </Box>
  );
}

function CompRow({ comp }: { comp: CompListing }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.375, 
      p: '9px 12px', background: T.bg2, borderRadius: 1.125,
    }}>
      <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{comp.name}</Typography>
      <Stack direction="row" sx={{ gap: 1.125,  fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
        <span>occ <b style={{ color: T.text }}>{Math.round(comp.occTtm * 100)}%</b></span>
        <span style={{ color: T.gold }}>★ {comp.rating.toFixed(2)}</span>
      </Stack>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 13.5, fontWeight: 800,
        color: T.text, minWidth: 80, textAlign: 'right',
      }}>{Math.round(comp.adrTtm).toLocaleString('fr-FR')} MAD</Typography>
    </Stack>
  );
}
