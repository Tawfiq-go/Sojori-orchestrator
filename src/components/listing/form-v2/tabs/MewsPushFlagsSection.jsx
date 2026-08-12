/**
 * Push Mews — verrous listing + roomType (Multi only).
 * Effectif = global AND roomType (déjà fourni par GET roomType.effective).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import listingsService from '../../../../services/listingsService';
import { T } from './_shared';

const CONFIRM_COPY = {
  resa: {
    title: 'Activer Réservations → Mews ?',
    body:
      'Les réservations Sojori/Airbnb de ce bâtiment seront créées dans le PMS Mews de l’hôtel — confirmer ?',
  },
  calendar: {
    title: 'Activer Calendrier → Mews ?',
    body:
      'Les dispos / calendrier de ce bâtiment seront poussés vers le PMS Mews de l’hôtel — confirmer ?',
  },
  roomResa: {
    title: 'Activer Résas → Mews pour ce type ?',
    body:
      'Ce type d’unité pourra pousser ses réservations vers Mews (uniquement si le verrou global « Réservations » est aussi ouvert).',
  },
  roomCalendar: {
    title: 'Activer Calendrier → Mews pour ce type ?',
    body:
      'Ce type d’unité pourra pousser son calendrier vers Mews (uniquement si le verrou global « Calendrier » est aussi ouvert).',
  },
};

function EffectiveBadge({ on, globalOn }) {
  if (on) {
    return (
      <Chip
        size="small"
        label="effectif ON"
        sx={{
          height: 20,
          fontSize: 10,
          fontWeight: 800,
          bgcolor: 'rgba(34,197,94,0.12)',
          color: '#15803d',
        }}
      />
    );
  }
  if (!globalOn) {
    return (
      <Chip
        size="small"
        label="inactif (verrou global fermé)"
        sx={{
          height: 20,
          fontSize: 10,
          fontWeight: 700,
          bgcolor: 'rgba(148,163,184,0.18)',
          color: T.text2,
        }}
      />
    );
  }
  return (
    <Chip
      size="small"
      label="inactif"
      sx={{
        height: 20,
        fontSize: 10,
        fontWeight: 700,
        bgcolor: 'rgba(148,163,184,0.14)',
        color: T.text3,
      }}
    />
  );
}

function FlagSwitch({ label, checked, disabled, busy, onToggle }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.5} sx={{ opacity: disabled ? 0.55 : 1 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text2, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      {busy ? (
        <CircularProgress size={14} thickness={5} />
      ) : (
        <Switch
          size="small"
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: T.primary,
            },
          }}
        />
      )}
    </Stack>
  );
}

/**
 * Bloc global « Push vers Mews » + switches par roomType (header carte).
 */
export function MewsPushGlobalCard({ listingId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resa, setResa] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [confirm, setConfirm] = useState(null); // { kind: 'resa'|'calendar', next: true }

  const load = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError('');
    const res = await listingsService.getListingMewsPushFlags(listingId);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setResa(res.data?.mewsResaPushEnabled === true);
    setCalendar(res.data?.mewsCalendarPushEnabled === true);
    setLoading(false);
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async (kind, next) => {
    setBusyKey(kind);
    setError('');
    const body = kind === 'resa' ? { resaPush: next } : { calendarPush: next };
    const res = await listingsService.putListingMewsPushFlags(listingId, body);
    setBusyKey('');
    if (res.error) {
      setError(res.error);
      return;
    }
    if (kind === 'resa') setResa(next);
    else setCalendar(next);
    // Notifie les cartes roomType pour recharger effective
    window.dispatchEvent(
      new CustomEvent('mews-push-listing-flags-changed', {
        detail: { listingId, resaPush: kind === 'resa' ? next : resa, calendarPush: kind === 'calendar' ? next : calendar },
      }),
    );
  };

  const requestToggle = (kind, next) => {
    if (next) {
      setConfirm({ kind, next: true });
      return;
    }
    void apply(kind, false);
  };

  return (
    <Box
      sx={{
        mb: 1.5,
        p: 1.25,
        borderRadius: '12px',
        border: `1.5px solid ${T.borderStrong || T.border}`,
        bgcolor: 'rgba(184,133,26,0.06)',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text }}>
          Push vers Mews
        </Typography>
        {loading ? <CircularProgress size={16} /> : null}
      </Stack>
      <Typography sx={{ fontSize: 11, color: T.text2, mb: 1, lineHeight: 1.35 }}>
        Double opt-in : global ET type. Défaut OFF — rien n’est poussé tant que les deux ne sont pas ouverts.
      </Typography>
      {error ? (
        <Typography sx={{ fontSize: 11, color: '#b91c1c', mb: 0.75 }}>{error}</Typography>
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <FlagSwitch
          label="Réservations → Mews"
          checked={resa}
          busy={busyKey === 'resa'}
          disabled={loading || Boolean(busyKey)}
          onToggle={(v) => requestToggle('resa', v)}
        />
        <FlagSwitch
          label="Calendrier / dispo → Mews"
          checked={calendar}
          busy={busyKey === 'calendar'}
          disabled={loading || Boolean(busyKey)}
          onToggle={(v) => requestToggle('calendar', v)}
        />
      </Stack>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          {confirm ? CONFIRM_COPY[confirm.kind].title : ''}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: T.text2, lineHeight: 1.45 }}>
            {confirm ? CONFIRM_COPY[confirm.kind].body : ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} sx={{ textTransform: 'none' }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const c = confirm;
              setConfirm(null);
              if (c) void apply(c.kind, true);
            }}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: T.primary, '&:hover': { bgcolor: T.primaryDeep } }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Switches + badge effective pour une carte roomType. */
export function MewsPushRoomTypeControls({ listingId, roomTypeId, listingResaOn, listingCalendarOn }) {
  const [loading, setLoading] = useState(true);
  const [resa, setResa] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [effective, setEffective] = useState({ resaPush: false, calendarPush: false });
  const [listingFlags, setListingFlags] = useState({
    resa: listingResaOn === true,
    calendar: listingCalendarOn === true,
  });
  const [busyKey, setBusyKey] = useState('');
  const [confirm, setConfirm] = useState(null);

  const canLoad = Boolean(roomTypeId) && /^[a-f\d]{24}$/i.test(String(roomTypeId));

  const load = useCallback(async () => {
    if (!canLoad) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listingsService.getRoomTypeMewsPushFlags(roomTypeId);
    if (!res.error && res.data) {
      setResa(res.data.roomType?.mewsResaPushEnabled === true);
      setCalendar(res.data.roomType?.mewsCalendarPushEnabled === true);
      setEffective({
        resaPush: res.data.effective?.resaPush === true,
        calendarPush: res.data.effective?.calendarPush === true,
      });
      setListingFlags({
        resa: res.data.listing?.mewsResaPushEnabled === true,
        calendar: res.data.listing?.mewsCalendarPushEnabled === true,
      });
    }
    setLoading(false);
  }, [canLoad, roomTypeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onListingFlags = (ev) => {
      if (String(ev?.detail?.listingId) !== String(listingId)) return;
      void load();
    };
    window.addEventListener('mews-push-listing-flags-changed', onListingFlags);
    return () => window.removeEventListener('mews-push-listing-flags-changed', onListingFlags);
  }, [listingId, load]);

  const apply = async (kind, next) => {
    if (!canLoad) return;
    setBusyKey(kind);
    const body = kind === 'resa' ? { resaPush: next } : { calendarPush: next };
    const res = await listingsService.putRoomTypeMewsPushFlags(roomTypeId, body);
    setBusyKey('');
    if (res.error) return;
    if (kind === 'resa') {
      setResa(next);
      setEffective((e) => ({ ...e, resaPush: next && listingFlags.resa }));
    } else {
      setCalendar(next);
      setEffective((e) => ({ ...e, calendarPush: next && listingFlags.calendar }));
    }
    void load();
  };

  const requestToggle = (kind, next) => {
    if (next) {
      setConfirm({ kind, next: true });
      return;
    }
    void apply(kind, false);
  };

  if (!canLoad) {
    return (
      <Typography sx={{ fontSize: 10, color: T.text3, whiteSpace: 'nowrap' }}>
        Mews : enregistrez le type
      </Typography>
    );
  }

  return (
    <Stack direction="row" alignItems="center" gap={0.75} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {loading ? <CircularProgress size={12} /> : null}
      <Stack direction="row" alignItems="center" gap={0.35}>
        <FlagSwitch
          label="Résas → Mews"
          checked={resa}
          busy={busyKey === 'resa'}
          disabled={loading || Boolean(busyKey)}
          onToggle={(v) => requestToggle('resa', v)}
        />
        <EffectiveBadge on={effective.resaPush} globalOn={listingFlags.resa} />
      </Stack>
      <Stack direction="row" alignItems="center" gap={0.35}>
        <FlagSwitch
          label="Calendrier → Mews"
          checked={calendar}
          busy={busyKey === 'calendar'}
          disabled={loading || Boolean(busyKey)}
          onToggle={(v) => requestToggle('calendar', v)}
        />
        <EffectiveBadge on={effective.calendarPush} globalOn={listingFlags.calendar} />
      </Stack>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          {confirm
            ? CONFIRM_COPY[confirm.kind === 'resa' ? 'roomResa' : 'roomCalendar'].title
            : ''}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: T.text2, lineHeight: 1.45 }}>
            {confirm
              ? CONFIRM_COPY[confirm.kind === 'resa' ? 'roomResa' : 'roomCalendar'].body
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} sx={{ textTransform: 'none' }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const c = confirm;
              setConfirm(null);
              if (c) void apply(c.kind, true);
            }}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: T.primary, '&:hover': { bgcolor: T.primaryDeep } }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default MewsPushGlobalCard;
