// ════════════════════════════════════════════════════════════════════
// Sojori — CancelReservationModal 🟠 IMPORTANT
// Annulation avec raison, remboursement, notifications, double confirm
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, TextField, Button, IconButton,
  FormControl, InputLabel, Select, MenuItem, Alert, Switch,
  FormControlLabel, Divider, ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4c430', primaryTint: 'rgba(230,176,34,0.10)',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

export type CancelReason =
  | 'guest-request' | 'no-show' | 'force-majeure' | 'pricing-error'
  | 'overbooking' | 'host-decision' | 'other';
export type RefundType = 'none' | 'partial' | 'full';

export interface CancelReservationResult {
  id: string; reservationId: string;
  reason: CancelReason; reasonDetail: string;
  refundType: RefundType; refundAmount: number;
  notifyGuest: boolean; createCredit: boolean; creditAmount: number;
  createdAt: string;
}

export interface CancelReservationModalProps {
  open: boolean; onClose: () => void;
  reservationId: string; guestName?: string; totalAmount?: number;
  onSubmit?: (result: CancelReservationResult) => Promise<void> | void;
}

const REASONS: { value: CancelReason; label: string }[] = [
  { value: 'guest-request', label: 'Demande voyageur' },
  { value: 'no-show',       label: 'No-show' },
  { value: 'force-majeure', label: 'Force majeure' },
  { value: 'pricing-error', label: 'Erreur de tarif' },
  { value: 'overbooking',   label: 'Surréservation' },
  { value: 'host-decision', label: 'Décision hôte' },
  { value: 'other',         label: 'Autre' },
];

export const CancelReservationModal: React.FC<CancelReservationModalProps> = ({
  open, onClose, reservationId, guestName, totalAmount = 0, onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState<CancelReason>('guest-request');
  const [reasonDetail, setReasonDetail] = useState('');
  const [refundType, setRefundType] = useState<RefundType>('full');
  const [refundAmount, setRefundAmount] = useState<number>(totalAmount);
  const [notifyGuest, setNotifyGuest] = useState(true);
  const [createCredit, setCreateCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (loading) return;
    setStep(1); setReason('guest-request'); setReasonDetail(''); setRefundType('full');
    setRefundAmount(totalAmount); setNotifyGuest(true); setCreateCredit(false);
    setCreditAmount(0); setError(null); onClose();
  };

  const handleNext = () => {
    if (refundType === 'partial' && (refundAmount <= 0 || refundAmount >= totalAmount)) {
      setError(`Montant partiel doit être entre 0 et ${totalAmount} €`);
      return;
    }
    if (createCredit && creditAmount <= 0) {
      setError('Montant du crédit doit être supérieur à 0');
      return;
    }
    setError(null); setStep(2);
  };

  const handleSubmit = async () => {
    setError(null); setLoading(true);
    const finalRefund = refundType === 'full' ? totalAmount : refundType === 'partial' ? refundAmount : 0;

    const result: CancelReservationResult = {
      id: `cnl_${Date.now()}`, reservationId, reason, reasonDetail,
      refundType, refundAmount: finalRefund,
      notifyGuest, createCredit, creditAmount: createCredit ? creditAmount : 0,
      createdAt: new Date().toISOString(),
    };

    await new Promise(r => setTimeout(r, 600));
    try {
      const stored = JSON.parse(localStorage.getItem('sojori.cancellations') || '[]');
      stored.push(result);
      localStorage.setItem('sojori.cancellations', JSON.stringify(stored));
      await onSubmit?.(result);
      handleClose();
    } catch { setError('Erreur d\'annulation'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: T.bg1 } }}>
      <DialogTitle sx={{ pb: 1.5, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: T.error }}>
              ⚠️ Annuler la réservation
            </Typography>
            <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.5 }}>
              {reservationId} {guestName && `· ${guestName}`} {totalAmount > 0 && `· ${totalAmount} €`}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={handleClose}>✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {step === 1 ? (
          <Stack spacing={2.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>Raison de l'annulation</InputLabel>
              <Select value={reason} label="Raison de l'annulation" onChange={e => setReason(e.target.value as CancelReason)}>
                {REASONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField label="Détails (optionnel)" multiline minRows={3} fullWidth size="small"
              value={reasonDetail} onChange={e => setReasonDetail(e.target.value)} />

            <Divider />

            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Remboursement
              </Typography>
              <ToggleButtonGroup value={refundType} exclusive size="small" fullWidth
                onChange={(_, v) => v && setRefundType(v as RefundType)}
                sx={{ '& .MuiToggleButton-root': { py: 1, textTransform: 'none', fontWeight: 600, borderColor: T.border, color: T.text2, '&.Mui-selected': { bgcolor: T.primaryTint, color: T.text, borderColor: T.primary } } }}>
                <ToggleButton value="none">Aucun</ToggleButton>
                <ToggleButton value="partial">Partiel</ToggleButton>
                <ToggleButton value="full">Total ({totalAmount} €)</ToggleButton>
              </ToggleButtonGroup>
              {refundType === 'partial' && (
                <TextField label="Montant remboursé (€)" type="number" size="small" sx={{ mt: 2, width: 220 }}
                  value={refundAmount} onChange={e => setRefundAmount(Number(e.target.value))}
                  inputProps={{ min: 0, max: totalAmount, step: 10 }} />
              )}
            </Box>

            <Divider />

            <FormControlLabel
              control={<Switch size="small" checked={notifyGuest} onChange={(_, c) => setNotifyGuest(c)} />}
              label={<Typography sx={{ fontSize: 13 }}>📧 Notifier le voyageur par email + WhatsApp</Typography>} />

            <Box>
              <FormControlLabel
                control={<Switch size="small" checked={createCredit} onChange={(_, c) => setCreateCredit(c)} />}
                label={<Typography sx={{ fontSize: 13 }}>🎁 Créer un crédit / voucher pour un futur séjour</Typography>} />
              {createCredit && (
                <TextField label="Montant crédit (€)" type="number" size="small" sx={{ mt: 1.5, width: 220 }}
                  value={creditAmount} onChange={e => setCreditAmount(Number(e.target.value))}
                  inputProps={{ min: 0, step: 10 }} />
              )}
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            <Alert severity="warning" sx={{ fontWeight: 600 }}>
              Cette action est irréversible. Vérifiez les informations ci-dessous.
            </Alert>
            <Box sx={{ p: 2, bgcolor: T.bg2, borderRadius: 1, border: `1px solid ${T.border}` }}>
              <Stack spacing={1}>
                <Row label="Réservation"        value={reservationId} />
                {guestName && <Row label="Voyageur" value={guestName} />}
                <Row label="Raison" value={REASONS.find(r => r.value === reason)?.label || reason} />
                <Row label="Remboursement" value={
                  refundType === 'none' ? 'Aucun' :
                  refundType === 'full' ? `${totalAmount} € (total)` :
                  `${refundAmount} € (partiel)`
                } emphasize />
                {createCredit && <Row label="Crédit voucher" value={`${creditAmount} €`} />}
                <Row label="Notification voyageur" value={notifyGuest ? 'Oui' : 'Non'} />
              </Stack>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, gap: 1 }}>
        {step === 2 && (
          <Button onClick={() => setStep(1)} disabled={loading}
            sx={{ color: T.text2, textTransform: 'none', mr: 'auto' }}>← Retour</Button>
        )}
        <Button onClick={handleClose} disabled={loading} sx={{ color: T.text2, textTransform: 'none' }}>Annuler</Button>
        {step === 1 ? (
          <Button onClick={handleNext} variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, px: 3, bgcolor: T.error,
              '&:hover': { bgcolor: '#c93a3a' } }}>
            Continuer →
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading} variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, px: 3, bgcolor: T.error,
              '&:hover': { bgcolor: '#c93a3a' } }}>
            {loading ? 'Annulation…' : 'Confirmer l\'annulation'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const Row: React.FC<{ label: string; value: string; emphasize?: boolean }> = ({ label, value, emphasize }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography sx={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13, color: emphasize ? T.error : T.text, fontWeight: emphasize ? 800 : 600, fontFamily: emphasize ? 'Geist Mono' : 'inherit' }}>{value}</Typography>
  </Stack>
);

export default CancelReservationModal;
