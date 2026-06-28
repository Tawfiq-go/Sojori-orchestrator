// Entrée principale · filtre ville portefeuille Dynamic Pricing
import React from 'react';
import { Box, Stack, Typography, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { T } from './_tokens';
import type { CityScopeOption, CityScopeStats } from './cityScope';
import { MARKET_CACHE_CITIES, marketBandAppliesToCityScope } from './cityScope';

interface Props {
  options: CityScopeOption[];
  activeScope: string | null;
  onScopeChange: (scope: string | null) => void;
  stats: CityScopeStats;
  globalTotal: number;
  loading?: boolean;
}

export default function PortfolioCityScopeBar({
  options, activeScope, onScopeChange, stats, globalTotal, loading,
}: Props) {
  const activeOpt = options.find(o =>
    o.id === '__all__' ? !activeScope : o.id === activeScope,
  );
  const showGapHint = stats.withoutSnapshot > 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" sx={{ gap: 1,  alignItems: 'center', mb: 1 }}>
        <Typography sx={{
          fontSize: 10, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
          color: T.text3, textTransform: 'uppercase', letterSpacing: '0.10em',
        }}>
          Ville · portefeuille
        </Typography>
        <Tooltip
          title="Choisir une ville pour filtrer biens, macros et tableau. Les données marché (—) apparaissent seulement après ⟳ refresh par bien avec annonce connectée."
          arrow
        >
          <InfoOutlinedIcon sx={{ fontSize: 14, color: T.text3, cursor: 'help' }} />
        </Tooltip>
        {activeScope && activeOpt && activeOpt.rawLabels.length > 1 ? (
          <Typography sx={{
            fontSize: 10, color: T.warning, fontFamily: '"Geist Mono", monospace', ml: 'auto',
          }}>
            Libellés Sojori : {activeOpt.rawLabels.join(' · ')} — regroupés sous {activeScope}
          </Typography>
        ) : null}
      </Stack>

      <Stack direction="row" sx={{ gap: 0.75,  flexWrap: 'wrap', mb: 1.25 }}>
        {options.map(opt => {
          const active = opt.id === '__all__' ? !activeScope : opt.id === activeScope;
          return (
            <Box
              key={opt.id}
              component="button"
              type="button"
              disabled={loading}
              onClick={() => onScopeChange(opt.id === '__all__' ? null : opt.id)}
              sx={{
                all: 'unset',
                cursor: loading ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.75,
                py: 1.125,
                borderRadius: 1.25,
                border: `1px solid ${active ? T.goldDeep : T.border}`,
                bgcolor: active ? T.goldTint : T.bg1,
                boxShadow: active ? '0 1px 3px rgba(20,17,10,0.08)' : 'none',
                opacity: loading ? 0.7 : 1,
                transition: 'border-color 0.15s, background 0.15s',
                '&:hover': { borderColor: T.goldDeep, bgcolor: active ? T.goldTint : T.bg2 },
              }}
            >
              <Typography sx={{
                fontSize: 13, fontWeight: active ? 800 : 600, color: active ? T.text : T.text2,
                letterSpacing: '-0.01em',
              }}>
                {opt.label}
              </Typography>
              <Box sx={{
                fontFamily: '"Geist Mono", monospace', fontSize: 10.5, fontWeight: 800,
                px: 0.875, py: 0.25, borderRadius: 999,
                bgcolor: active ? 'rgba(199,155,34,0.25)' : T.bg3,
                color: active ? T.goldDeep : T.text3,
              }}>
                {opt.count}
              </Box>
            </Box>
          );
        })}
      </Stack>

      {showGapHint ? (
        <Box sx={{
          p: 1.5, borderRadius: 1.5,
          border: `1px solid ${T.border}`,
          bgcolor: T.bg1,
        }}>
          <Typography sx={{ fontSize: 12.5, color: T.text2, lineHeight: 1.55 }}>
            <Box component="span" sx={{ fontWeight: 800, color: T.text }}>
              {activeScope ? `Vue ${activeScope}` : 'Toutes villes'}
            </Box>
            {' · '}
            {stats.withSnapshot}/{stats.total} bien{stats.total !== 1 ? 's' : ''} avec snapshot marché
            {stats.withAirbnb < stats.total ? (
              <> · {stats.withAirbnb} annonce{stats.withAirbnb !== 1 ? 's' : ''} connectée{stats.withAirbnb !== 1 ? 's' : ''} (refresh ⟳ possible)</>
            ) : null}
            {stats.withoutSnapshot > 0 ? (
              <>
                {' · '}
                <Box component="span" sx={{ color: T.warning, fontWeight: 700 }}>
                  {stats.withoutSnapshot} ligne{stats.withoutSnapshot !== 1 ? 's' : ''} en —
                </Box>
                {' '}
                = pas encore de refresh marché (pas un bug portefeuille). Connecter l’annonce sur le listing
                puis ⟳ « Actualiser performances ».
              </>
            ) : null}
          </Typography>
          {!activeScope && globalTotal > 12 ? (
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.75 }}>
              Conseil : filtrer par ville pour éviter de mélanger Casablanca et Marrakech dans le même tableau.
            </Typography>
          ) : null}
          {activeScope && !marketBandAppliesToCityScope(activeScope) ? (
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.75 }}>
              Le cache marché ⟳ (modal) est disponible pour {MARKET_CACHE_CITIES.join(' et ')} — choisissez l’une de ces villes pour la bande marché.
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
