import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { SOJORI_TOKENS as T } from '../../listing/components/ConfigOrchestration/types';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Popup confirmation suppression — même esprit que Support / listing config */
export default function OrchConfirmDialog({ open, title, message, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13.5, color: T.text2, lineHeight: 1.5 }}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onCancel} sx={{ fontWeight: 700, color: T.text2 }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          sx={{
            fontWeight: 700,
            bgcolor: T.error,
            '&:hover': { bgcolor: '#b91c1e' },
          }}
        >
          Supprimer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
