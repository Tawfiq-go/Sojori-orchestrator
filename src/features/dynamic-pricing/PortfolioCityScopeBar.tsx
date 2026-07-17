// Entrée principale · filtre ville portefeuille Dynamic Pricing
import React from 'react';
import { Box, Stack, Typography, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { T } from './_tokens';
import type { CityScopeOption, CityScopeStats } from './cityScope';

interface Props {
  options: CityScopeOption[];
  activeScope: string | null;
  onScopeChange: (scope: string | null) => void;
  stats: CityScopeStats;
  globalTotal: number;
  loading?: boolean;
  /** Biens à traiter (annonce / estimation manquante) */
  todoCount?: number;
}

export default function PortfolioCityScopeBar({
  options, activeScope, onScopeChange, stats, loading, todoCount = 0,
}: Props) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
        <Typography sx={{
          fontSize: 10, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
          color: T.text3, textTransform: 'uppercase', letterSpacing: '0.10em',
        }}>
          Ville
        </Typography>
        <Tooltip
          title="Filtre le tableau. Connectez l’annonce puis actualisez l’estimation prix de marché sur la fiche."
          arrow
        >
          <InfoOutlinedIcon sx={{ fontSize: 14, color: T.text3, cursor: 'help' }} />
        </Tooltip>
        <Typography sx={{
          ml: 'auto', fontSize: 11.5, color: T.text2, fontFamily: '"Geist Mono", monospace',
        }}>
          {stats.withAirbnb}/{stats.total} connecté{stats.total !== 1 ? 's' : ''}
          {' · '}
          {stats.withSnapshot}/{stats.total} estimation
          {todoCount > 0 ? (
            <Box component="span" sx={{ color: T.warning, fontWeight: 700 }}>
              {' · '}{todoCount} à traiter
            </Box>
          ) : null}
        </Typography>
      </Stack>

      <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
        {options.map((opt) => {
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
                px: 1.5,
                py: 0.875,
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
    </Box>
  );
}
