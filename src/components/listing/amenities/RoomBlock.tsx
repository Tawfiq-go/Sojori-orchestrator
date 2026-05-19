// ════════════════════════════════════════════════════════════════════
// RoomBlock.tsx — bloc par pièce (miroir CategoryBlock, vue « Par pièce »)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { T } from './_tokens';
import type { Amenity, CompositionRoom, Density, SelectedAmenity } from './_tokens';
import AmenityCard from './AmenityCard';

const COLS = {
  dense: 'repeat(auto-fill, minmax(168px, 1fr))',
  cozy: 'repeat(auto-fill, minmax(180px, 1fr))',
  list: 'repeat(auto-fill, minmax(280px, 1fr))',
};

export interface RoomBlockProps {
  room: CompositionRoom;
  amenities: Amenity[];
  selected: Map<string, SelectedAmenity>;
  density: Density;
  selectedCount: number;
  onToggle: (a: Amenity) => void;
  onQty: (a: Amenity, delta: 1 | -1) => void;
}

export default function RoomBlock({
  room, amenities, selected, density, selectedCount, onToggle, onQty,
}: RoomBlockProps) {
  if (amenities.length === 0) return null;

  const title = room.nameFr || room.roomName;
  const emoji = room.useBed ? '🛏' : '🚪';

  return (
    <Box sx={{ mb: 2.25 }}>
      <Stack direction="row" gap={1} sx={{
        alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 2, bgcolor: T.bg0, py: 1, mb: 0.75,
        px: 0.5,
      }}>
        <Box sx={{ fontSize: 14 }}>{emoji}</Box>
        <Typography sx={{
          fontSize: 11, fontWeight: 700, color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          flex: 1, minWidth: 0,
        }}>
          {title}
        </Typography>
        <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 10, color: T.text3, fontWeight: 700, flexShrink: 0 }}>
          {selectedCount > 0 && (
            <Box component="span" sx={{
              bgcolor: T.primaryTint, color: T.primaryDeep,
              px: 0.875, py: '1px', borderRadius: 99, letterSpacing: '0.04em', mr: 0.75,
            }}>{selectedCount} sél.</Box>
          )}
          <Box component="span">{amenities.length} équipements</Box>
        </Typography>
      </Stack>

      <Box sx={{
        display: 'grid', gridTemplateColumns: COLS[density], gap: density === 'list' ? 0.5 : 0.75,
        animation: 'sj-fadeIn 0.2s',
      }}>
        {amenities.map((a) => (
          <AmenityCard key={a._id} amenity={a} selected={selected.get(a._id)}
            density={density} onToggle={onToggle} onQty={onQty} />
        ))}
      </Box>
    </Box>
  );
}
