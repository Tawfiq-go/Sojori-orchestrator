import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link } from 'react-router-dom';
import type { MenuOptionInterpretation } from './whatsappMenuAvailability';
import WhatsappMenuInterpretationPanel, { WhatsappMenuDots } from './WhatsappMenuInterpretationPanel';
import { CHATBOT_T as T } from './chatbotTokens';

export default function WhatsappConfigCell({
  options,
  hasConfig,
  loading,
  snapshotMissing,
  listingId,
  listingName,
  guestName,
  reservationCode,
  checkInLabel,
  checkOutLabel,
}: {
  options: MenuOptionInterpretation[];
  hasConfig: boolean;
  loading?: boolean;
  /** Doc `listing_snapshot` absent dans fullchatbot — pas de lecture srv-listing */
  snapshotMissing?: boolean;
  listingId?: string;
  listingName?: string;
  guestName?: string;
  reservationCode?: string;
  checkInLabel?: string;
  checkOutLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  if (loading) {
    return <Typography sx={{ fontSize: 11, color: T.text3 }}>…</Typography>;
  }

  if (!hasConfig) {
    if (snapshotMissing && listingId) {
      return (
        <Box>
          <Typography sx={{ fontSize: 11, color: T.warning, fontStyle: 'italic' }}>
            Snapshot non sync.
          </Typography>
          <Link
            to={`/chatbot/listing?listingId=${encodeURIComponent(listingId)}`}
            style={{ fontSize: 10, color: T.primaryDeep, fontWeight: 600 }}
          >
            Listing chatbot ↗
          </Link>
        </Box>
      );
    }
    return (
      <Typography sx={{ fontSize: 11, color: T.text3, fontStyle: 'italic' }}>
        Pas de config WA
      </Typography>
    );
  }

  const title = [guestName, reservationCode].filter(Boolean).join(' · ');

  return (
    <>
      <WhatsappMenuDots options={options} onClick={() => setOpen(true)} />
      <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.35 }}>Cliquer pour le détail</Typography>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 2, border: `1px solid ${T.borderStrong}` },
          },
        }}
      >
        <DialogTitle sx={{ pr: 6, pb: 1 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.text }}>Menu WhatsApp</Typography>
          {title && (
            <Typography sx={{ fontSize: 12.5, color: T.text2, mt: 0.25 }}>{title}</Typography>
          )}
          <IconButton
            size="small"
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: T.bg0 }}>
          <WhatsappMenuInterpretationPanel
            options={options}
            listingName={listingName}
            guestLabel={guestName ? `${guestName}${reservationCode ? ` · ${reservationCode}` : ''}` : reservationCode}
            checkInLabel={checkInLabel}
            checkOutLabel={checkOutLabel}
          />
          <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.5 }}>
              Même logique que fullchatbot : vert = visible maintenant, jaune = conditions ou date future, rouge = inactive.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
