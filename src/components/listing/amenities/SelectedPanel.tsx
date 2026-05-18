// ════════════════════════════════════════════════════════════════════
// SelectedPanel.tsx — panneau sticky droit · grouping par catégorie
// ════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { Box, Stack, Typography, Button, IconButton } from '@mui/material';
import { T, CATEGORY_META, emojiFor } from './_tokens';
import type { Amenity, SelectedAmenity, CategoryName } from './_tokens';

export interface SelectedPanelProps {
  /** Map id → SelectedAmenity (état formulaire) */
  selected: Map<string, SelectedAmenity>;
  /** Catalogue complet pour lookup par _id */
  catalog: Map<string, Amenity>;
  /** Map rentalId → CompositionRoom name (pour afficher les pins) */
  roomNamesByRentalId?: Map<string, string>;
  onRemove: (a: Amenity) => void;
  onClearAll: () => void;
  onPreview?: () => void;
}

export default function SelectedPanel({
  selected, catalog, roomNamesByRentalId, onRemove, onClearAll, onPreview,
}: SelectedPanelProps) {
  // Groupe par catégorie principale
  const grouped = useMemo(() => {
    const groups = new Map<string, Amenity[]>();
    selected.forEach((_, id) => {
      const a = catalog.get(id);
      if (!a) return;
      const cat = a.categories.find((c) => Boolean(c && CATEGORY_META[c as CategoryName]));
      const key = cat ?? '__other__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [selected, catalog]);

  const total = selected.size;

  return (
    <Box sx={{
      position: 'sticky', top: 16, bgcolor: T.bg1, border: `1px solid ${T.border}`,
      borderRadius: 1.75, overflow: 'hidden', alignSelf: 'start',
      maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column',
    }}>
      <Stack direction="row" gap={1} sx={{
        alignItems: 'center',
        p: '14px 16px', borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2, flexShrink: 0,
      }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>📋 Sélectionnés</Typography>
        <Box sx={{
          ml: 'auto', fontFamily: '"Geist Mono", monospace', fontSize: 10.5,
          bgcolor: T.primaryTint, color: T.primaryDeep, px: 1, py: 0.25,
          borderRadius: 99, fontWeight: 700, letterSpacing: '0.04em',
        }}>{total}</Box>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, '&::-webkit-scrollbar': { width: 5 }, '&::-webkit-scrollbar-thumb': { background: T.borderStrong, borderRadius: 99 } }}>
        {total === 0 ? (
          <Box sx={{ p: '40px 18px', textAlign: 'center', color: T.text4, fontSize: 12 }}>
            <Box sx={{ fontSize: 40, mb: 1.25, opacity: 0.4 }}>📦</Box>
            Aucun équipement sélectionné<br/>
            <Box component="span" sx={{ fontSize: 11 }}>Coche une carte à gauche pour commencer.</Box>
          </Box>
        ) : grouped.map(([cat, items]) => {
          const meta = cat === '__other__'
            ? { emoji: '✨', short: 'Autre' }
            : (CATEGORY_META[cat as CategoryName] ?? { emoji: '✨', short: cat });
          return (
          <Box key={cat} sx={{ mb: 1.75 }}>
            <Stack direction="row" gap={0.75} sx={{ alignItems: 'center', mb: 0.875 }}>
              <Box sx={{ fontSize: 12 }}>{meta.emoji}</Box>
              <Typography sx={{
                fontSize: 10, fontWeight: 700, color: T.text3,
                fontFamily: '"Geist Mono", monospace',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{meta.short}</Typography>
              <Typography sx={{ ml: 'auto', fontFamily: '"Geist Mono", monospace', fontSize: 9, color: T.text3, fontWeight: 700 }}>
                {items.length}
              </Typography>
            </Stack>
            {items.map(a => {
              const sel = selected.get(a._id)!;
              const rooms = sel.roomRentalIds?.map(rid => roomNamesByRentalId?.get(rid) || rid).join(' · ');
              return (
                <Stack key={a._id} direction="row" gap={1.125} sx={{
                  alignItems: 'center',
                  p: '7px 10px', bgcolor: T.bg2, border: `1px solid ${T.border}`,
                  borderRadius: 1, mb: 0.625, animation: 'sj-fadeIn 0.2s',
                }}>
                  <Box sx={{ fontSize: 16, flexShrink: 0 }}>{emojiFor(a)}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.nameFr}
                    </Typography>
                    {rooms && (
                      <Typography sx={{ fontSize: 9.5, color: T.info, fontFamily: '"Geist Mono", monospace', fontWeight: 600, mt: 0.125, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rooms}
                      </Typography>
                    )}
                  </Box>
                  {sel.count > 1 && (
                    <Box sx={{
                      fontFamily: '"Geist Mono", monospace', fontSize: 10, fontWeight: 700,
                      color: T.primaryDeep, bgcolor: T.primaryTint,
                      px: 0.75, borderRadius: 99, letterSpacing: '0.04em', flexShrink: 0,
                    }}>×{sel.count}</Box>
                  )}
                  <IconButton size="small" onClick={() => onRemove(a)} sx={{
                    width: 18, height: 18, color: T.text4, fontSize: 12,
                    '&:hover': { bgcolor: T.errorTint, color: T.error },
                  }}>×</IconButton>
                </Stack>
              );
            })}
          </Box>
          );
        })}
      </Box>

      {total > 0 && (
        <Stack direction="row" gap={1} sx={{
          p: '11px 14px', borderTop: `1px solid ${T.border}`, bgcolor: T.bg2, flexShrink: 0,
        }}>
          <Button size="small" onClick={onClearAll} sx={{ flex: 1, fontSize: 11.5, textTransform: 'none', color: T.text2 }}>
            Tout effacer
          </Button>
          <Button size="small" onClick={onPreview} sx={{
            flex: 1, fontSize: 11.5, textTransform: 'none', fontWeight: 700,
            background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`, color: '#1a1408',
            '&:hover': { filter: 'brightness(1.05)' },
          }}>Aperçu →</Button>
        </Stack>
      )}
    </Box>
  );
}
