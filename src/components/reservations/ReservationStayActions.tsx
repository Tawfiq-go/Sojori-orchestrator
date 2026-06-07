import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  MenuItem,
  Popover,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';

const T = {
  success: '#0a8f5e',
  text3: '#7a756c',
  text4: '#a8a299',
  primaryDeep: '#876119',
  border: 'rgba(20,17,10,0.10)',
};

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6); // 6h … 23h

function hourFromReservationTime(timeInput: unknown, fallbackHour: number): number {
  if (timeInput === undefined || timeInput === null || timeInput === '') return fallbackHour;
  if (typeof timeInput === 'number') return Math.floor(timeInput / 100);
  const s = String(timeInput);
  if (s.includes('T')) {
    const m = s.match(/T(\d{2}):/);
    if (m) return Number(m[1]);
  }
  const hm = s.match(/^(\d{1,2}):/);
  if (hm) return Number(hm[1]);
  return fallbackHour;
}

function hourToApi(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

export type StayFieldPatch = {
  checkInTime?: number | string | null;
  checkOutTime?: number | string | null;
  confirmedCheckInTime?: boolean;
  confirmedCheckOutTime?: boolean;
  actualArrivalTime?: string | null;
  actualDepartureTime?: string | null;
};

type Props = {
  reservationId: string;
  kind: 'arrival' | 'departure';
  dateLabel: string;
  chosenTime?: number | string | null;
  chosenConfirmed?: boolean;
  declaredTime?: string | null;
  disabled?: boolean;
  onStayUpdated?: (patch: StayFieldPatch) => void;
};

export function ReservationStayActions({
  reservationId,
  kind,
  dateLabel,
  chosenTime,
  chosenConfirmed,
  declaredTime,
  disabled,
  onStayUpdated,
}: Props) {
  const isArrival = kind === 'arrival';
  const defaultHour = isArrival ? 15 : 11;
  const chooseTitle = isArrival ? 'Choisir arrivée' : 'Choisir départ';
  const declareTitle = isArrival ? 'Déclarer arrivée' : 'Déclarer départ';

  const chosenHour = hourFromReservationTime(chosenTime, defaultHour);
  const declaredHour = declaredTime ? hourFromReservationTime(declaredTime, defaultHour) : null;
  const hasDeclared = Boolean(declaredTime);

  const [chooseAnchor, setChooseAnchor] = useState<HTMLElement | null>(null);
  const [declareAnchor, setDeclareAnchor] = useState<HTMLElement | null>(null);
  const [pickChooseHour, setPickChooseHour] = useState(chosenHour);
  const [pickDeclareHour, setPickDeclareHour] = useState(declaredHour ?? chosenHour);
  const [busy, setBusy] = useState<'choose' | 'declare' | null>(null);

  useEffect(() => {
    setPickChooseHour(chosenHour);
  }, [chosenHour]);

  useEffect(() => {
    setPickDeclareHour(declaredHour ?? chosenHour);
  }, [declaredHour, chosenHour]);

  const xxLabel = useMemo(() => `${chosenHour}h`, [chosenHour]);
  const yyLabel = hasDeclared && declaredHour != null ? `${declaredHour}h` : 'ND';

  const runChoose = async () => {
    if (!reservationId) return;
    setBusy('choose');
    try {
      const fn = isArrival ? fulltaskApi.chooseGuestArrival : fulltaskApi.chooseGuestDeparture;
      const res = await fn(reservationId, hourToApi(pickChooseHour));
      if (res?.success === false) throw new Error(res?.error || 'Échec');
      toast.success(chooseTitle);
      setChooseAnchor(null);
      onStayUpdated?.(
        isArrival
          ? { checkInTime: hourToApi(pickChooseHour), confirmedCheckInTime: true }
          : { checkOutTime: hourToApi(pickChooseHour), confirmedCheckOutTime: true },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(null);
    }
  };

  const runDeclare = async () => {
    if (!reservationId) return;
    setBusy('declare');
    try {
      const fn = isArrival ? fulltaskApi.declareGuestArrival : fulltaskApi.declareGuestDeparture;
      const res = await fn(reservationId, pickDeclareHour);
      if (res?.success === false) throw new Error(res?.error || 'Échec');
      toast.success(declareTitle);
      setDeclareAnchor(null);
      onStayUpdated?.(
        isArrival
          ? { actualArrivalTime: hourToApi(pickDeclareHour) }
          : { actualDepartureTime: hourToApi(pickDeclareHour) },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(null);
    }
  };

  const linkSx = {
    fontFamily: '"Geist Mono", monospace',
    fontSize: 11,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    borderRadius: 0.25,
    px: 0.15,
    lineHeight: 1.3,
    '&:hover': disabled ? {} : { bgcolor: 'rgba(184,133,26,0.08)' },
  };

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 72 }}>
      <Typography sx={{ fontSize: 11.5, color: 'inherit', mb: 0.25 }}>{dateLabel}</Typography>
      <Stack direction="row" spacing={0.25} sx={{ alignItems: 'baseline' }}>
        <Box
          component="span"
          title={chooseTitle}
          onClick={(e) => {
            if (disabled) return;
            setChooseAnchor(e.currentTarget);
          }}
          sx={{
            ...linkSx,
            color: chosenConfirmed ? T.success : T.primaryDeep,
            textDecoration: chosenConfirmed ? 'none' : 'underline',
            textDecorationStyle: 'dotted',
          }}
        >
          {xxLabel}
        </Box>
        <Typography component="span" sx={{ fontSize: 10, color: T.text4, userSelect: 'none' }}>
          -
        </Typography>
        <Box
          component="span"
          title={declareTitle}
          onClick={(e) => {
            if (disabled) return;
            setDeclareAnchor(e.currentTarget);
          }}
          sx={{
            ...linkSx,
            color: hasDeclared ? T.success : T.text4,
            fontStyle: hasDeclared ? 'normal' : 'italic',
          }}
        >
          {yyLabel}
        </Box>
      </Stack>

      <Popover
        open={Boolean(chooseAnchor)}
        anchorEl={chooseAnchor}
        onClose={() => setChooseAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.25, minWidth: 140, border: `1px solid ${T.border}` } } }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, mb: 0.75, textTransform: 'uppercase' }}>
          {chooseTitle}
        </Typography>
        <FormControl size="small" fullWidth sx={{ mb: 1 }}>
          <Select
            value={pickChooseHour}
            onChange={(e) => setPickChooseHour(Number(e.target.value))}
            sx={{ fontSize: 12, fontFamily: '"Geist Mono", monospace' }}
          >
            {HOUR_OPTIONS.map((h) => (
              <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>
                {h}h
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          size="small"
          fullWidth
          disabled={Boolean(busy)}
          onClick={() => void runChoose()}
          sx={{ fontSize: 11, textTransform: 'none', fontWeight: 700 }}
        >
          {busy === 'choose' ? '…' : 'Enregistrer'}
        </Button>
      </Popover>

      <Popover
        open={Boolean(declareAnchor)}
        anchorEl={declareAnchor}
        onClose={() => setDeclareAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.25, minWidth: 140, border: `1px solid ${T.border}` } } }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, mb: 0.75, textTransform: 'uppercase' }}>
          {declareTitle}
        </Typography>
        <FormControl size="small" fullWidth sx={{ mb: 1 }}>
          <Select
            value={pickDeclareHour}
            onChange={(e) => setPickDeclareHour(Number(e.target.value))}
            sx={{ fontSize: 12, fontFamily: '"Geist Mono", monospace' }}
          >
            {HOUR_OPTIONS.map((h) => (
              <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>
                {h}h
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          size="small"
          fullWidth
          variant="contained"
          disabled={Boolean(busy)}
          onClick={() => void runDeclare()}
          sx={{ fontSize: 11, textTransform: 'none', fontWeight: 700, bgcolor: T.success, boxShadow: 'none' }}
        >
          {busy === 'declare' ? '…' : hasDeclared ? 'Modifier' : 'Déclarer'}
        </Button>
      </Popover>
    </Box>
  );
}
