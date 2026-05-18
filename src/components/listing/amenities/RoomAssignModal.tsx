// ════════════════════════════════════════════════════════════════════
// RoomAssignModal.tsx — modal pièces (needsRoomAssignment)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Dialog, Box, Stack, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { T, emojiFor } from './_tokens';
import type { Amenity, CompositionRoom } from './_tokens';

const ROOM_EMOJI: Record<string, string> = {
  Bedroom: '🛏', Bathroom: '🚿', 'Living room': '🛋', Kitchen: '🍳',
  'Livingroom / Bedroom': '🛋', 'Bedroom/Living room with kitchen corner': '🏠',
  'Kitchen in the living / dining room': '🍴',
};

export interface RoomAssignModalProps {
  open: boolean;
  amenity: Amenity | null;
  rooms: CompositionRoom[];
  selectedRoomRentalIds: string[];
  onClose: () => void;
  onConfirm: (rentalIds: string[]) => void;
}

export default function RoomAssignModal({ open, amenity, rooms, selectedRoomRentalIds, onClose, onConfirm }: RoomAssignModalProps) {
  const [picks, setPicks] = useState<Set<string>>(new Set(selectedRoomRentalIds));

  useEffect(() => { if (open) setPicks(new Set(selectedRoomRentalIds)); }, [open, selectedRoomRentalIds]);

  if (!amenity) return null;

  const toggle = (rentalId: string) => {
    setPicks(prev => { const next = new Set(prev); next.has(rentalId) ? next.delete(rentalId) : next.add(rentalId); return next; });
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{
      sx: { width: 440, maxWidth: '90vw', borderRadius: 1.75, overflow: 'hidden' },
    }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{
        p: '16px 20px', borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2,
      }}>
        <Box sx={{ fontSize: 24 }}>{emojiFor(amenity)}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em' }}>Dans quelles pièces ?</Typography>
          <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25 }}>
            {amenity.nameFr} · à assigner aux pièces concernées
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </Stack>

      <Box sx={{ p: '16px 20px' }}>
        <Typography sx={{
          fontSize: 10.5, fontWeight: 700, color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1,
        }}>Pièces du logement</Typography>

        {rooms.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center', color: T.text4, fontSize: 12 }}>
            Aucune pièce configurée dans ce listing.
          </Box>
        )}

        {rooms.sort((a, b) => a.order - b.order).map(r => {
          const isOn = picks.has(r.rentalId);
          return (
            <Stack key={r.rentalId} direction="row" alignItems="center" gap={1.25}
              onClick={() => toggle(r.rentalId)} sx={{
                p: '9px 12px', border: '1px solid', borderColor: isOn ? T.primary : T.border,
                borderRadius: 1.125, cursor: 'pointer', mb: 0.625, transition: 'all 0.12s',
                bgcolor: isOn ? T.primaryTint : T.bg1,
                boxShadow: isOn ? `0 0 0 2px ${T.primaryTint}` : 'none',
                '&:hover': { borderColor: isOn ? T.primary : T.borderStrong },
              }}>
              <Box sx={{
                width: 18, height: 18, borderRadius: 0.625,
                border: '1.5px solid', borderColor: isOn ? T.primaryDeep : T.borderStrong,
                bgcolor: isOn ? T.primary : T.bg1, color: '#1a1408',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0,
              }}>{isOn ? '✓' : ''}</Box>
              <Box sx={{ fontSize: 16 }}>{ROOM_EMOJI[r.roomName] || '🚪'}</Box>
              <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r.nameFr || r.roomName}</Typography>
            </Stack>
          );
        })}
      </Box>

      <Stack direction="row" justifyContent="flex-end" gap={1.125} sx={{
        p: '12px 20px', borderTop: `1px solid ${T.border}`, bgcolor: T.bg2,
      }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: T.text2 }}>Annuler</Button>
        <Button onClick={() => onConfirm(Array.from(picks))} sx={{
          textTransform: 'none', fontWeight: 700,
          background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`, color: '#1a1408',
          px: 2, '&:hover': { filter: 'brightness(1.05)' },
        }}>
          Confirmer ({picks.size} {picks.size > 1 ? 'pièces' : 'pièce'})
        </Button>
      </Stack>
    </Dialog>
  );
}
