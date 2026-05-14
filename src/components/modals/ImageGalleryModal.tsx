// ════════════════════════════════════════════════════════════════════
// Sojori — ImageGalleryModal 🟡 UTILE
// Galerie photos listing : carousel, thumbnails, upload, drag-reorder, main, delete
// ════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, Box, Stack, Typography, Button, IconButton,
  Chip, Tooltip,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4c430', primaryTint: 'rgba(230,176,34,0.10)',
  success: '#10b981', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', bg3: '#ebe7da', border: 'rgba(26,20,8,0.08)',
};

export interface GalleryImage { id: string; url: string; alt?: string; isMain?: boolean }

export interface ImageGalleryModalProps {
  open: boolean; onClose: () => void;
  images: GalleryImage[];
  editable?: boolean;
  onChange?: (images: GalleryImage[]) => void;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  open, onClose, images: initial, editable = true, onChange,
}) => {
  const [images, setImages] = useState<GalleryImage[]>(initial);
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => { setImages(initial); setActive(0); }, [initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setActive(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setActive(i => Math.min(images.length - 1, i + 1));
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length, onClose]);

  const update = (next: GalleryImage[]) => { setImages(next); onChange?.(next); };

  const handleUpload = () => {
    const fakeId = `img_${Date.now()}`;
    update([...images, { id: fakeId, url: `https://picsum.photos/seed/${fakeId}/1200/800`, alt: 'Nouvelle image' }]);
    setActive(images.length);
  };

  const handleDelete = (idx: number) => {
    if (images.length <= 1) return;
    const next = images.filter((_, i) => i !== idx);
    update(next);
    if (active >= next.length) setActive(next.length - 1);
  };

  const setMain = (idx: number) => update(images.map((img, i) => ({ ...img, isMain: i === idx })));

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const next = [...images];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(targetIdx, 0, moved);
    update(next);
    setDraggedIdx(null);
    setActive(targetIdx);
  };

  const current = images[active];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: T.bg1, minHeight: 600 } }}>
      <Box sx={{ position: 'relative' }}>
        {/* Top bar */}
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ p: 2, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: T.text }}>
              📸 Galerie photos
            </Typography>
            <Chip size="small" label={`${active + 1} / ${images.length}`}
              sx={{ bgcolor: T.bg1, fontFamily: 'Geist Mono', fontSize: 11, fontWeight: 700 }} />
            {current?.isMain && <Chip size="small" label="⭐ Principale"
              sx={{ bgcolor: T.primaryTint, color: T.primary, fontSize: 11, fontWeight: 700 }} />}
          </Stack>
          <Stack direction="row" spacing={1}>
            {editable && (
              <>
                <Button size="small" variant="outlined" onClick={handleUpload}
                  sx={{ textTransform: 'none', borderColor: T.border, color: T.text2 }}>
                  ⬆️ Upload
                </Button>
                {!current?.isMain && (
                  <Button size="small" variant="outlined" onClick={() => setMain(active)}
                    sx={{ textTransform: 'none', borderColor: T.primary, color: T.primary }}>
                    ⭐ Principale
                  </Button>
                )}
                <Button size="small" variant="outlined" disabled={images.length <= 1}
                  onClick={() => handleDelete(active)}
                  sx={{ textTransform: 'none', borderColor: T.error, color: T.error }}>
                  🗑️ Supprimer
                </Button>
              </>
            )}
            <IconButton size="small" onClick={onClose}>✕</IconButton>
          </Stack>
        </Stack>

        <DialogContent sx={{ p: 0 }}>
          {/* Main image */}
          <Box sx={{
            position: 'relative', bgcolor: '#0f0f10',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 480, overflow: 'hidden',
          }}
            onClick={() => setZoomed(z => !z)}>
            {current && (
              <Box component="img" src={current.url} alt={current.alt || ''}
                sx={{
                  maxWidth: '100%', maxHeight: zoomed ? 'none' : 480,
                  width: zoomed ? '100%' : 'auto', objectFit: 'contain',
                  transition: 'transform 0.3s', cursor: zoomed ? 'zoom-out' : 'zoom-in',
                  transform: zoomed ? 'scale(1)' : 'scale(1)',
                }} />
            )}

            {/* Prev / Next */}
            {active > 0 && (
              <IconButton onClick={e => { e.stopPropagation(); setActive(a => a - 1); }}
                sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.92)', color: T.text,
                  '&:hover': { bgcolor: T.bg1 }, boxShadow: 2 }}>
                ‹
              </IconButton>
            )}
            {active < images.length - 1 && (
              <IconButton onClick={e => { e.stopPropagation(); setActive(a => a + 1); }}
                sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.92)', color: T.text,
                  '&:hover': { bgcolor: T.bg1 }, boxShadow: 2 }}>
                ›
              </IconButton>
            )}

            <Box sx={{ position: 'absolute', bottom: 12, right: 12,
              bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
              px: 1.5, py: 0.5, borderRadius: 1,
              fontSize: 10, fontFamily: 'Geist Mono', letterSpacing: 0.5 }}>
              {zoomed ? '🔍 Zoom · clic pour réduire' : '🔍 Cliquer pour zoom'}
            </Box>
          </Box>

          {/* Thumbnails */}
          <Box sx={{ p: 1.5, bgcolor: T.bg2, borderTop: `1px solid ${T.border}`,
            display: 'flex', gap: 1, overflowX: 'auto' }}>
            {images.map((img, i) => (
              <Tooltip key={img.id} title={editable ? 'Glisser pour réordonner' : ''} arrow>
                <Box
                  draggable={editable}
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(i)}
                  onClick={() => setActive(i)}
                  sx={{
                    flexShrink: 0, position: 'relative', cursor: editable ? 'grab' : 'pointer',
                    width: 88, height: 64, borderRadius: 1, overflow: 'hidden',
                    border: i === active ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
                    boxShadow: i === active ? `0 0 0 2px ${T.primaryTint}` : 'none',
                    transition: 'all 0.15s', opacity: draggedIdx === i ? 0.5 : 1,
                    '&:hover': { borderColor: T.primary },
                  }}>
                  <Box component="img" src={img.url}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {img.isMain && (
                    <Box sx={{
                      position: 'absolute', top: 2, left: 2,
                      bgcolor: T.primary, color: T.text,
                      px: 0.5, borderRadius: 0.5,
                      fontSize: 9, fontWeight: 800,
                    }}>⭐</Box>
                  )}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </DialogContent>
      </Box>
    </Dialog>
  );
};

export default ImageGalleryModal;
