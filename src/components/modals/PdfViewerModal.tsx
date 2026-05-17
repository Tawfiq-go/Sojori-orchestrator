// ════════════════════════════════════════════════════════════════════
// Sojori — PdfViewerModal 🟢 BONUS
// Afficher PDF (iframe simple, fallback react-pdf possible côté repo)
// Navigation pages, zoom, download, print
// ════════════════════════════════════════════════════════════════════
import { useState, type FC, type ReactNode } from 'react';
import {
  Dialog, DialogContent, Box, Stack, Typography, Button, IconButton, Chip,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';

const T = {
  primary: '#e6b022', primaryTint: 'rgba(230,176,34,0.10)',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

export interface PdfViewerModalProps {
  open: boolean; onClose: () => void;
  url: string;
  title?: string;
  filename?: string;
  pageCount?: number;
  /** Pour intégration react-pdf custom : si fourni, remplace l'iframe */
  renderer?: ReactNode;
}

export const PdfViewerModal: FC<PdfViewerModalProps> = ({
  open, onClose, url, title = 'Document', filename, pageCount, renderer,
}) => {
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'document.pdf';
    document.body.appendChild(a); a.click(); a.remove();
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none'; iframe.src = url;
    iframe.onload = () => { iframe.contentWindow?.print(); };
    document.body.appendChild(iframe);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, bgcolor: T.bg1, minHeight: '85vh' } } }}>
      {/* Toolbar */}
      <Stack direction="row"
        sx={{ p: 1.5, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: T.text }}>
            📄 {title}
          </Typography>
          {filename && (
            <Chip size="small" label={filename}
              sx={{ bgcolor: T.bg1, fontFamily: 'Geist Mono', fontSize: 11 }} />
          )}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {pageCount && pageCount > 1 && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <IconButton size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</IconButton>
              <Typography sx={{ fontSize: 12, fontFamily: 'Geist Mono', minWidth: 60, textAlign: 'center' }}>
                {page} / {pageCount}
              </Typography>
              <IconButton size="small" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>›</IconButton>
            </Stack>
          )}

          <ToggleButtonGroup value={zoom} exclusive size="small"
            onChange={(_, v) => v && setZoom(v)}
            sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.25, fontSize: 11, fontWeight: 600, borderColor: T.border, '&.Mui-selected': { bgcolor: T.primaryTint, color: T.text } } }}>
            <ToggleButton value={75}>75%</ToggleButton>
            <ToggleButton value={100}>100%</ToggleButton>
            <ToggleButton value={125}>125%</ToggleButton>
            <ToggleButton value={150}>150%</ToggleButton>
          </ToggleButtonGroup>

          <Button size="small" variant="outlined" onClick={handleDownload}
            sx={{ textTransform: 'none', borderColor: T.border, color: T.text2 }}>⬇️ Download</Button>
          <Button size="small" variant="outlined" onClick={handlePrint}
            sx={{ textTransform: 'none', borderColor: T.border, color: T.text2 }}>🖨️ Imprimer</Button>
          <IconButton size="small" onClick={onClose}>✕</IconButton>
        </Stack>
      </Stack>

      <DialogContent sx={{ p: 0, bgcolor: '#3a3838', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
        {renderer ? (
          <Box sx={{ width: `${zoom}%`, my: 2, transition: 'width 0.2s' }}>{renderer}</Box>
        ) : (
          <Box component="iframe" src={`${url}#page=${page}&zoom=${zoom}`} title={title}
            sx={{
              width: `${zoom}%`, minHeight: '75vh', my: 2,
              border: 'none', bgcolor: T.bg1,
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              transition: 'width 0.2s',
            }} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;
