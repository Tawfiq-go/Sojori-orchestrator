// ════════════════════════════════════════════════════════════════════
// AmenityCard.tsx — carte amenity (dense / cozy / list)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, IconButton } from '@mui/material';
import { T, emojiFor } from './_tokens';
import type { Amenity, Density, SelectedAmenity } from './_tokens';

export interface AmenityCardProps {
  amenity: Amenity;
  selected?: SelectedAmenity;
  density: Density;
  onToggle: (amenity: Amenity) => void;
  onQty: (amenity: Amenity, delta: 1 | -1) => void;
}

export default React.memo(function AmenityCard({ amenity, selected, density, onToggle, onQty }: AmenityCardProps) {
  const isOn = !!selected;
  const hasRooms = isOn && amenity.needsRoomAssignment && (selected!.roomRentalIds?.length ?? 0) > 0;

  // Layouts différents selon density
  if (density === 'list') {
    return (
      <Box onClick={() => onToggle(amenity)} sx={{
        ...baseSx(isOn), p: '6px 10px', minHeight: isOn ? 52 : 34, borderRadius: 0.75, borderWidth: 1,
        display: 'flex', flexDirection: isOn ? 'column' : 'row', gap: isOn ? 0.5 : 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
          <Box sx={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{emojiFor(amenity)}</Box>
          <Typography sx={{ ...nmSx(isOn, 11.5), whiteSpace: isOn ? 'normal' : 'nowrap' }}>{amenity.nameFr}</Typography>
          {!isOn && amenity.basic && <BasicBadge tiny />}
          <Box sx={{ ml: 'auto', flexShrink: 0 }}><Check on={isOn} /></Box>
        </Box>
        {isOn && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75, pl: 3.25 }}
            onClick={(e) => e.stopPropagation()}>
            {amenity.basic && <BasicBadge tiny />}
            <Stepper count={selected!.count} onMinus={() => onQty(amenity, -1)} onPlus={() => onQty(amenity, +1)} mini />
          </Box>
        )}
      </Box>
    );
  }

  if (density === 'cozy') {
    return (
      <Box onClick={() => onToggle(amenity)} sx={{
        ...baseSx(isOn), position: 'relative', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center', p: '12px 10px', minHeight: 96, gap: 1.125,
      }}>
        {amenity.basic && (
          <Box sx={{ position: 'absolute', top: 6, left: 6 }}><BasicBadge /></Box>
        )}
        <Box sx={{ position: 'absolute', top: 6, right: 6 }}><Check on={isOn} /></Box>
        <Box sx={{ fontSize: 26, lineHeight: 1, animation: isOn ? 'sj-scaleIn 0.2s' : undefined }}>{emojiFor(amenity)}</Box>
        <Typography sx={{ ...nmSx(isOn, 12), whiteSpace: 'normal' }}>{amenity.nameFr}</Typography>
        {isOn && <Stepper count={selected!.count} onMinus={() => onQty(amenity, -1)} onPlus={() => onQty(amenity, +1)} />}
        {hasRooms && (
          <Box sx={{ position: 'absolute', bottom: 4, left: 6, fontSize: 8, color: T.info, fontFamily: '"Geist Mono", monospace', fontWeight: 800, bgcolor: T.infoTint, px: 0.625, borderRadius: 0.5, letterSpacing: '0.04em' }}>
            {selected!.roomRentalIds!.length} PIÈCE{selected!.roomRentalIds!.length > 1 ? 'S' : ''}
          </Box>
        )}
      </Box>
    );
  }

  // dense (default) — sélectionné : nom sur ligne 1, ± sur ligne 2
  return (
    <Box onClick={() => onToggle(amenity)} sx={{
      ...baseSx(isOn),
      p: '8px 10px',
      minHeight: isOn ? 56 : 42,
      gap: isOn ? 0.625 : 1.125,
      display: 'flex',
      flexDirection: isOn ? 'column' : 'row',
      alignItems: isOn ? 'stretch' : 'center',
      position: 'relative',
    }}>
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1.125, minWidth: 0, width: '100%',
      }}>
        <Box sx={{ pt: 0.125, flexShrink: 0 }}><Check on={isOn} dense /></Box>
        <Box sx={{
          fontSize: 18, width: 22, textAlign: 'center', flexShrink: 0,
          animation: isOn ? 'sj-scaleIn 0.2s' : undefined,
        }}>
          {emojiFor(amenity)}
        </Box>
        <Typography sx={{
          ...nmSx(isOn, 12),
          whiteSpace: isOn ? 'normal' : 'nowrap',
          display: '-webkit-box',
          WebkitLineClamp: isOn ? 2 : 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {amenity.nameFr}
        </Typography>
        {!isOn && amenity.basic && <BasicBadge />}
      </Box>
      {isOn && (
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75, pl: 4.5 }}
        >
          {amenity.basic && <BasicBadge tiny />}
          <Stepper
            count={selected!.count}
            onMinus={() => onQty(amenity, -1)}
            onPlus={() => onQty(amenity, +1)}
            mini
          />
        </Box>
      )}
      {hasRooms && (
        <Box sx={{
          position: 'absolute', bottom: -1, right: -1, fontSize: 8, color: T.info,
          fontFamily: '"Geist Mono", monospace', fontWeight: 800,
          bgcolor: T.infoTint, px: 0.5, borderRadius: '0 0 4px 0',
          borderLeft: `1px solid ${T.border}`, borderTop: `1px solid ${T.border}`,
          letterSpacing: '0.04em',
        }}>
          {selected!.roomRentalIds!.length} P
        </Box>
      )}
    </Box>
  );
});

/* ─── Sub-pieces ─── */
function baseSx(on: boolean) {
  return {
    bgcolor: on ? 'linear-gradient(180deg,#fff7ed,#fff)' : T.bg1,
    background: on ? 'linear-gradient(180deg,#fff7ed,#fff)' : T.bg1,
    border: '1.5px solid', borderColor: on ? T.primary : T.border,
    borderRadius: 1.125, cursor: 'pointer', transition: 'all 0.12s',
    boxShadow: on ? `0 0 0 2px ${T.primaryTint}` : 'none',
    '&:hover': { borderColor: on ? T.primary : T.borderStrong, bgcolor: on ? undefined : T.bg2 },
  } as const;
}
function nmSx(on: boolean, size: number) {
  return {
    flex: 1, fontSize: size, fontWeight: on ? 700 : 500, color: T.text,
    letterSpacing: '-0.005em', lineHeight: 1.25, minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as const;
}

function Check({ on, dense }: { on: boolean; dense?: boolean }) {
  if (on) {
    return (
      <Box sx={{
        width: 16, height: 16, borderRadius: '50%', bgcolor: T.primary, color: '#1a1408',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, flexShrink: 0, animation: 'sj-popCheck 0.2s',
      }}>✓</Box>
    );
  }
  return <Box sx={{ width: 16, height: 16, borderRadius: 0.5, border: `1.5px solid ${T.borderStrong}`, flexShrink: 0 }} />;
}

function BasicBadge({ tiny }: { tiny?: boolean } = {}) {
  return (
    <Box sx={{
      fontSize: tiny ? 7.5 : 8, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
      bgcolor: T.warningTint, color: T.warning, px: 0.625, py: 0.125,
      borderRadius: 0.375, letterSpacing: '0.04em', flexShrink: 0,
    }}>BASIC</Box>
  );
}

function Stepper({ count, onMinus, onPlus, mini }: { count: number; onMinus: () => void; onPlus: () => void; mini?: boolean }) {
  const h = mini ? 22 : 24;
  const w = mini ? 20 : 24;
  return (
    <Stack direction="row" onClick={e => e.stopPropagation()} sx={{
      border: `1px solid ${T.borderStrong}`, borderRadius: 0.625, overflow: 'hidden',
      bgcolor: T.bg1, flexShrink: 0, height: h,
    }}>
      <IconButton size="small" onClick={onMinus} disableRipple sx={{ width: w, height: h, borderRadius: 0, fontSize: mini ? 11 : 13, color: T.text2, fontWeight: 700, '&:hover': { bgcolor: T.bg2, color: T.text } }}>−</IconButton>
      <Box sx={{ px: mini ? 0.75 : 1.125, display: 'flex', alignItems: 'center', fontFamily: '"Geist Mono", monospace', fontWeight: 700, fontSize: mini ? 11 : 12, minWidth: mini ? 20 : 30, justifyContent: 'center' }}>{count}</Box>
      <IconButton size="small" onClick={onPlus} disableRipple sx={{ width: w, height: h, borderRadius: 0, fontSize: mini ? 11 : 13, color: T.text2, fontWeight: 700, '&:hover': { bgcolor: T.bg2, color: T.text } }}>+</IconButton>
    </Stack>
  );
}
