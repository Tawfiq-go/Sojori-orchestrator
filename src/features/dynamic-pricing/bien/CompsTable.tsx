// ════════════════════════════════════════════════════════════════════
// CompsTable.tsx — Section 7 : tableau des comps + ligne self highlighted
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Stack, Typography, IconButton } from '@mui/material';
import { T } from '../_tokens';
import DataEmptyPlaceholder from '../DataEmptyPlaceholder';
import { formatDistanceMeters } from '../utils/geoDistance';

export interface CompRow {
  id: string;
  isSelf?: boolean;
  name: string;
  photoGradient?: 1 | 2 | 3 | 4 | 5;
  distanceMeters: number | null;       // null si self
  rating: number;
  reviews: number;
  bedrooms: number;
  adrTtm: number;
  occupancyTtm: number;                 // 0-1
  revenueTtm: number;
}

export interface CompsTableProps {
  rows: CompRow[];
  onMapClick?: (id: string) => void;
  onDetailsClick?: (id: string) => void;
  onCompareClick?: (id: string) => void;
}

const GRADIENTS = {
  1: 'linear-gradient(135deg, #fde68a, #d97706)',
  2: 'linear-gradient(135deg, #a5f3fc, #0e7490)',
  3: 'linear-gradient(135deg, #86efac, #16a34a)',
  4: 'linear-gradient(135deg, #ddd6fe, #7c3aed)',
  5: 'linear-gradient(135deg, #fda4af, #ec4899)',
} as const;

type SortKey = 'distance' | 'rating' | 'adr' | 'occupancy' | 'revenue';

export default function CompsTable({ rows, onMapClick, onDetailsClick, onCompareClick }: CompsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  if (rows.length === 0) {
    return <DataEmptyPlaceholder hint="Pas de comps marché en base pour ce bien" />;
  }

  const sortedRows = [...rows].sort((a, b) => {
    // self row toujours visible mais ne s'inclut pas dans le tri par défaut
    const cmp = (x: number | null, y: number | null) => {
      if (x === null) return 1; if (y === null) return -1;
      return sortDir === 'asc' ? x - y : y - x;
    };
    if (sortKey === 'distance') return cmp(a.distanceMeters, b.distanceMeters);
    if (sortKey === 'rating')   return cmp(a.rating, b.rating);
    if (sortKey === 'adr')      return cmp(a.adrTtm, b.adrTtm);
    if (sortKey === 'occupancy') return cmp(a.occupancyTtm, b.occupancyTtm);
    return cmp(a.revenueTtm, b.revenueTtm);
  });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'distance' ? 'asc' : 'desc'); }
  };

  return (
    <Box sx={{
      maxWidth: 1380, mx: 'auto',
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
      overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{
        p: '14px 18px', borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2,
      }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800 }}>Comps · tier Premium</Typography>
        <Typography sx={{ fontSize: 10.5, color: T.text3, ml: 1 }}>
          Distance = vol d’oiseau (GPS, sans API)
        </Typography>
        <Stack direction="row" gap={0.75} sx={{ ml: 'auto', flexWrap: 'wrap' }}>
          <FilterChip>📍 Tri distance</FilterChip>
          <FilterChip>⭐ Note 4.5+</FilterChip>
          <FilterChip>⚖ Comparer (0)</FilterChip>
        </Stack>
      </Stack>

      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <Box component="thead">
            <Box component="tr">
              <Th />
              <Th>Nom</Th>
              <Th sortable active={sortKey === 'distance'} dir={sortDir} onClick={() => toggleSort('distance')}>Distance</Th>
              <Th sortable active={sortKey === 'rating'} dir={sortDir} onClick={() => toggleSort('rating')}>Note</Th>
              <Th>Chambres</Th>
              <Th sortable active={sortKey === 'adr'} dir={sortDir} onClick={() => toggleSort('adr')}>ADR TTM</Th>
              <Th sortable active={sortKey === 'occupancy'} dir={sortDir} onClick={() => toggleSort('occupancy')}>Occupation</Th>
              <Th sortable active={sortKey === 'revenue'} dir={sortDir} onClick={() => toggleSort('revenue')}>Revenu TTM</Th>
              <Th>Actions</Th>
            </Box>
          </Box>
          <Box component="tbody">
            {sortedRows.map(row => (
              <Box component="tr" key={row.id} sx={{
                bgcolor: row.isSelf ? 'rgba(244,207,94,0.06)' : 'transparent',
                '&:hover': { bgcolor: row.isSelf ? 'rgba(244,207,94,0.10)' : T.bg2 },
              }}>
                <Td>
                  <Box sx={{
                    width: 44, height: 36, borderRadius: 0.875,
                    background: GRADIENTS[row.photoGradient || 1],
                    boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
                  }} />
                </Td>
                <Td>
                  {row.isSelf
                    ? <Box component="b" sx={{ color: T.goldDeep, fontWeight: 700 }}>{row.name} (vous)</Box>
                    : <Box sx={{ fontWeight: 700, letterSpacing: '-0.005em' }}>{row.name}</Box>}
                </Td>
                <Td
                  mono
                  title={
                    row.distanceMeters != null
                      ? 'Distance à vol d’oiseau (GPS marché / bien)'
                      : undefined
                  }
                >
                  {formatDistanceMeters(row.distanceMeters)}
                </Td>
                <Td>
                  <Stack direction="row" alignItems="center" gap={0.625}>
                    <Box sx={{ color: T.gold, fontWeight: 800 }}>★ {row.rating.toFixed(2)}</Box>
                    <Box sx={{ color: T.text3, fontFamily: '"Geist Mono", monospace', fontSize: 10.5 }}>· {row.reviews} avis</Box>
                  </Stack>
                </Td>
                <Td mono>{row.bedrooms}</Td>
                <Td mono>{row.adrTtm.toLocaleString('fr-FR')}<Unit>MAD</Unit></Td>
                <Td mono colorIf={row.isSelf ? T.error : undefined}>{Math.round(row.occupancyTtm * 100)}%</Td>
                <Td mono colorIf={row.isSelf ? T.error : undefined}>{row.revenueTtm.toLocaleString('fr-FR')}<Unit>MAD</Unit></Td>
                <Td>
                  <Stack direction="row" gap={0.375}>
                    <RowBtn onClick={() => onMapClick?.(row.id)}>🗺</RowBtn>
                    {!row.isSelf && (
                      <>
                        <RowBtn onClick={() => onDetailsClick?.(row.id)}>👁</RowBtn>
                        <RowBtn onClick={() => onCompareClick?.(row.id)}>⚖</RowBtn>
                      </>
                    )}
                  </Stack>
                </Td>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ─── Cells ─── */
function Th({ children, sortable, active, dir, onClick }: {
  children?: React.ReactNode; sortable?: boolean; active?: boolean; dir?: 'asc' | 'desc'; onClick?: () => void;
}) {
  return (
    <Box component="th" onClick={sortable ? onClick : undefined} sx={{
      p: '10px 12px', textAlign: 'left',
      fontSize: 10, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
      color: active ? T.goldDeep : T.text3, textTransform: 'uppercase', letterSpacing: '0.06em',
      borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2,
      position: 'sticky', top: 0, cursor: sortable ? 'pointer' : 'default',
      userSelect: 'none',
    }}>
      {children}
      {sortable && (
        <Box component="span" sx={{ ml: 0.375, color: active ? T.goldDeep : T.text4, fontWeight: 600 }}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </Box>
      )}
    </Box>
  );
}

function Td({ children, mono, colorIf }: { children?: React.ReactNode; mono?: boolean; colorIf?: string }) {
  return (
    <Box component="td" sx={{
      p: '11px 12px', borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle',
      ...(mono ? { fontFamily: '"Geist Mono", monospace', fontWeight: 700, letterSpacing: '-0.005em' } : {}),
      ...(colorIf ? { color: colorIf } : {}),
    }}>{children}</Box>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <Box component="span" sx={{ color: T.text3, fontSize: 10, ml: 0.375 }}>{children}</Box>;
}

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <Box component="button" sx={{
      all: 'unset', cursor: 'pointer',
      px: 1.125, py: 0.625, borderRadius: 0.875,
      bgcolor: T.bg1, border: `1px solid ${T.border}`,
      fontSize: 11, fontWeight: 700, color: T.text2,
    }}>{children}</Box>
  );
}

function RowBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <IconButton size="small" onClick={onClick} sx={{
      px: 1, py: 0.5, borderRadius: 0.75,
      bgcolor: T.bg1, border: `1px solid ${T.border}`,
      fontSize: 10.5, fontWeight: 700, color: T.text2,
      '&:hover': { bgcolor: T.goldTint, color: T.goldDeep, borderColor: T.gold },
    }}>{children}</IconButton>
  );
}
