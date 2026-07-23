import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { GuestMemberInput, RegistrationFlowState } from '../../services/fulltaskApi';
import { blurActiveElement } from '../../utils/domFocus';
import { registrationPatchFromGuestContext } from '../../utils/guestContextReservationPatch';
import { guestContextStaySummary, logResaGuest } from '../../utils/resaGuestActionDebug';

const T = {
  success: '#0a8f5e',
  text3: '#7a756c',
  text4: '#a8a299',
  primaryDeep: '#876119',
  border: 'rgba(20,17,10,0.10)',
};

export type RegistrationFieldPatch = {
  guestRegistration?: {
    nbre_guest_registered?: number;
    nbre_guest_to_register?: number;
    members?: GuestMemberRecord[];
  };
};

export type GuestMemberRecord = {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  nationality?: string;
  document_number?: string;
  passport?: string;
  gender?: string;
  status?: string;
};

type Props = {
  reservationId: string;
  registered?: number;
  total?: number;
  members?: GuestMemberRecord[];
  disabled?: boolean;
  /** Mode à l'arrivée déjà actif (plan / day-plan). */
  deferredToArrival?: boolean;
  /**
   * `link` (défaut) = compteur 0/1 souligné — tables denses.
   * `button` = CTA explicite « Ouvrir l'enregistrement · 0/1 » — cockpit / panneaux.
   */
  variant?: 'link' | 'button';
  onRegistrationUpdated?: (patch: RegistrationFieldPatch) => void;
  /** Après passage en mode à l'arrivée (reload parent). */
  onDeferredToArrival?: () => void;
};

const EMPTY_MEMBER: GuestMemberInput = {
  first_name: '',
  last_name: '',
  nationality: '',
  document_number: '',
  gender: '',
};

function parseTravelerIndex(id: string): number {
  const n = Number(id);
  return Number.isFinite(n) ? n : 0;
}

function isTravelerDone(title: string): boolean {
  return title.trimStart().startsWith('✅');
}

function memberFromRecord(record?: GuestMemberRecord): GuestMemberInput {
  if (!record) return { ...EMPTY_MEMBER };
  return {
    first_name: String(record.first_name ?? record.firstName ?? '').trim(),
    last_name: String(record.last_name ?? record.lastName ?? '').trim(),
    nationality: String(record.nationality ?? '').trim(),
    document_number: String(record.document_number ?? record.passport ?? '').trim(),
    gender: String(record.gender ?? '').trim(),
  };
}

function memberFromTravelerTitle(title: string): GuestMemberInput {
  const labelText = title.replace(/^✅\s*|^👤\s*/u, '').trim();
  const parts = labelText.split(/\s+/);
  return {
    ...EMPTY_MEMBER,
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' '),
  };
}

/** Remplissage rapide staff — passeport optionnel. */
function quickMemberForIndex(index: number): GuestMemberInput {
  return {
    first_name: `Voyageur${index + 1}`,
    last_name: '',
    nationality: 'MA',
    gender: index % 2 === 0 ? 'M' : 'F',
    document_number: '',
  };
}

export function ReservationRegistrationActions({
  reservationId,
  registered = 0,
  total = 0,
  members,
  disabled,
  deferredToArrival: deferredProp,
  variant = 'link',
  onRegistrationUpdated,
  onDeferredToArrival,
}: Props) {
  const safeTotal = Math.max(total, 1);
  const safeRegistered = Math.min(Math.max(registered, 0), safeTotal);
  const complete = safeTotal > 0 && safeRegistered >= safeTotal;

  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'one' | 'force' | 'defer' | null>(null);
  const [flow, setFlow] = useState<RegistrationFlowState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [memberForm, setMemberForm] = useState<GuestMemberInput>(EMPTY_MEMBER);
  const [deferredLocal, setDeferredLocal] = useState(Boolean(deferredProp));
  const deferred = deferredLocal || Boolean(deferredProp);

  const label = useMemo(() => {
    const base = `${safeRegistered}/${safeTotal}`;
    if (complete) return base;
    if (deferred) return `${base} · à l’arrivée`;
    return base;
  }, [safeRegistered, safeTotal, complete, deferred]);

  useEffect(() => {
    setDeferredLocal(Boolean(deferredProp));
  }, [deferredProp, reservationId]);

  const runDeferToArrival = async () => {
    if (!reservationId || complete) return;
    setBusy('defer');
    try {
      const res = await fulltaskApi.deferRegistrationToArrival(reservationId);
      if (res?.success === false) throw new Error(res?.error || 'Échec');
      setDeferredLocal(true);
      toast.success(
        res?.alreadyDeferred
          ? 'Déjà en mode à l’arrivée'
          : 'Enregistrement passé à l’arrivée — plus de relances, accès WhatsApp OK',
      );
      onDeferredToArrival?.();
      onRegistrationUpdated?.({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de passer à l’arrivée');
    } finally {
      setBusy(null);
    }
  };

  const loadFlow = async () => {
    if (!reservationId) return;
    setLoading(true);
    try {
      const res = await fulltaskApi.getRegistrationFlowState(reservationId);
      if (res?.success === false || !res?.data) {
        throw new Error(res?.error || 'Enregistrement indisponible');
      }
      setFlow(res.data);
      onRegistrationUpdated?.({
        guestRegistration: {
          nbre_guest_registered: res.data.registered,
          nbre_guest_to_register: res.data.total,
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur chargement');
      setFlow(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!anchor) return;
    void loadFlow();
  }, [anchor, reservationId]);

  useEffect(() => {
    if (!flow?.travelersList?.length) return;
    const traveler = flow.travelersList[selectedIndex] ?? flow.travelersList[0];
    const idx = parseTravelerIndex(traveler.id);
    if (idx !== selectedIndex) setSelectedIndex(idx);

    const fromReservation = memberFromRecord(members?.[idx]);
    const hasReservationData = Boolean(
      fromReservation.first_name || fromReservation.last_name || fromReservation.document_number,
    );
    setMemberForm(hasReservationData ? fromReservation : memberFromTravelerTitle(traveler.title));
  }, [flow, selectedIndex, members]);

  const applyFlowState = (
    state: RegistrationFlowState,
    nextMembers?: GuestMemberRecord[],
    ctxPatch?: RegistrationFieldPatch,
  ) => {
    setFlow(state);
    onRegistrationUpdated?.({
      guestRegistration: {
        nbre_guest_registered: ctxPatch?.guestRegistration?.nbre_guest_registered ?? state.registered,
        nbre_guest_to_register: ctxPatch?.guestRegistration?.nbre_guest_to_register ?? state.total,
        members: nextMembers ?? members,
      },
    });
  };

  const fillQuickForSelected = () => {
    setMemberForm(quickMemberForIndex(selectedIndex));
  };

  const runRegister = async (payload?: GuestMemberInput) => {
    if (!reservationId) return;
    const data = payload ?? memberForm;
    if (!data.first_name?.trim()) {
      toast.error('Prénom requis');
      return;
    }
    setBusy('one');
    try {
      logResaGuest('ui:register →', { reservationId, index: selectedIndex, member: data });
      const res = await fulltaskApi.registerGuestMember(reservationId, selectedIndex, {
        ...data,
        last_name: data.last_name?.trim() ?? '',
        document_number: data.document_number?.trim() || undefined,
      });
      if (res?.success === false) throw new Error(res?.error || 'Échec');
      const state = res?.data?.state;
      if (state) {
        const nextMembers = mergeMembersAfterSave(members, selectedIndex, data);
        const ctxPatch = registrationPatchFromGuestContext(res?.data?.guestContext);
        applyFlowState(state, nextMembers, ctxPatch);
      }
      toast.success('Voyageur enregistré');
    } catch (err) {
      logResaGuest('ui:register ERROR', {
        reservationId,
        index: selectedIndex,
        message: err instanceof Error ? err.message : String(err),
      });
      toast.error(err instanceof Error ? err.message : 'Erreur enregistrement');
    } finally {
      setBusy(null);
    }
  };

  const runForceComplete = async () => {
    if (!reservationId || !flow) return;
    setBusy('force');
    try {
      let state = flow;
      let merged = [...(members ?? [])];
      let lastCtxPatch: RegistrationFieldPatch = {};
      for (let i = 0; i < state.total; i++) {
        const traveler = state.travelersList[i];
        if (traveler && isTravelerDone(traveler.title)) continue;
        const quick = quickMemberForIndex(i);
        const res = await fulltaskApi.registerGuestMember(reservationId, i, quick);
        if (res?.success === false) throw new Error(res?.error || 'Échec');
        if (!res?.data?.state) continue;
        state = res.data.state;
        merged = mergeMembersAfterSave(merged, i, quick);
        lastCtxPatch = registrationPatchFromGuestContext(res?.data?.guestContext);
      }
      applyFlowState(state, merged, lastCtxPatch);
      toast.success('Enregistrement terminé');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur forçage enregistrement');
    } finally {
      setBusy(null);
    }
  };

  const runRegisterCurrent = () => void runRegister();

  const closePopover = () => {
    blurActiveElement();
    setAnchor(null);
    setFlow(null);
  };

  const linkSx = {
    fontFamily: '"Geist Mono", monospace',
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    borderRadius: 0.25,
    px: 0.2,
    lineHeight: 1.3,
    '&:hover': disabled ? {} : { bgcolor: 'rgba(184,133,26,0.08)' },
  };

  return (
    <>
      {variant === 'button' ? (
        <Button
          size="small"
          variant="contained"
          disabled={disabled}
          title="Cliquer pour ouvrir le formulaire d’enregistrement"
          onClick={(e) => {
            if (disabled) return;
            setAnchor(e.currentTarget);
          }}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            fontSize: 12,
            px: 1.25,
            py: 0.6,
            boxShadow: 'none',
            bgcolor: complete ? T.success : T.primaryDeep,
            '&:hover': { bgcolor: complete ? '#087a50' : '#6e4f14', boxShadow: 'none' },
          }}
        >
          {complete
            ? `✓ Enregistrement · ${label}`
            : deferred
              ? `📝 Ouvrir · ${label}`
              : `📝 Ouvrir l’enregistrement · ${label}`}
        </Button>
      ) : (
        <Box
          component="button"
          type="button"
          title="Cliquer pour ouvrir l’enregistrement voyageurs"
          onClick={(e) => {
            if (disabled) return;
            setAnchor(e.currentTarget);
          }}
          sx={{
            ...linkSx,
            appearance: 'none',
            background: 'transparent',
            border: 0,
            color: complete ? T.success : T.primaryDeep,
            textDecoration: complete ? 'none' : 'underline',
            textDecorationStyle: 'dotted',
            textUnderlineOffset: '3px',
          }}
        >
          {label}
        </Box>
      )}

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={closePopover}
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 1.5, width: 280, border: `1px solid ${T.border}` } } }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, mb: 1, textTransform: 'uppercase' }}>
          Enregistrement voyageurs · cliquable
        </Typography>

        {loading ? (
          <Stack sx={{ alignItems: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Stack>
        ) : !flow ? (
          <Stack spacing={1}>
            <Typography sx={{ fontSize: 12, color: T.text3 }}>
              Impossible de charger l’enregistrement (tâche absente ou erreur API).
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => void loadFlow()}
              sx={{ fontSize: 11, textTransform: 'none', fontWeight: 700 }}
            >
              Réessayer
            </Button>
          </Stack>
        ) : (          <>
            <FormControl size="small" fullWidth sx={{ mb: 1 }}>
              <Select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
                sx={{ fontSize: 12 }}
              >
                {flow.travelersList.map((t) => {
                  const idx = parseTravelerIndex(t.id);
                  return (
                    <MenuItem key={t.id} value={idx} sx={{ fontSize: 12 }}>
                      {t.title.replace(/^✅|^👤/u, '').trim() || `Voyageur ${idx + 1}`}
                      {isTravelerDone(t.title) ? ' · OK' : ''}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
              <Button
                size="small"
                variant="outlined"
                disabled={Boolean(busy)}
                onClick={fillQuickForSelected}
                sx={{
                  flex: 1,
                  fontSize: 10,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 0.35,
                  borderColor: T.border,
                  color: T.text3,
                }}
              >
                Voyageur {selectedIndex + 1}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={Boolean(busy) || flow.complete}
                onClick={() => void runForceComplete()}
                sx={{
                  flex: 1,
                  fontSize: 10,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 0.35,
                  borderColor: T.primaryDeep,
                  color: T.primaryDeep,
                }}
              >
                {busy === 'force' ? '…' : 'Tout enregistrer'}
              </Button>
            </Stack>

            {!complete && (
              <Button
                size="small"
                fullWidth
                variant={deferred ? 'contained' : 'outlined'}
                disabled={Boolean(busy) || deferred}
                onClick={() => void runDeferToArrival()}
                sx={{
                  mb: 1,
                  fontSize: 10,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 0.45,
                  borderColor: deferred ? undefined : T.primaryDeep,
                  bgcolor: deferred ? T.text3 : undefined,
                  color: deferred ? '#fff' : T.primaryDeep,
                  boxShadow: 'none',
                }}
              >
                {busy === 'defer'
                  ? '…'
                  : deferred
                    ? '✓ Mode à l’arrivée'
                    : 'Passer à l’arrivée (stop relances)'}
              </Button>
            )}

            {deferred && !complete && (
              <Typography sx={{ fontSize: 10, color: T.text3, mb: 1, lineHeight: 1.35 }}>
                Plus de relances. Le guest peut encore s’enregistrer ; les accès WhatsApp ne sont
                plus bloqués par l’enregistrement.
              </Typography>
            )}

            <Stack spacing={0.75} sx={{ mb: 1 }}>
              <TextField
                size="small"
                label="Prénom"
                value={memberForm.first_name ?? ''}
                onChange={(e) => setMemberForm((m) => ({ ...m, first_name: e.target.value }))}
                sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
              />
              <TextField
                size="small"
                label="Nom"
                value={memberForm.last_name ?? ''}
                onChange={(e) => setMemberForm((m) => ({ ...m, last_name: e.target.value }))}
                sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
              />
              <Stack direction="row" spacing={0.75}>
                <TextField
                  size="small"
                  label="Nationalité"
                  value={memberForm.nationality ?? ''}
                  onChange={(e) => setMemberForm((m) => ({ ...m, nationality: e.target.value }))}
                  sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 12 } }}
                />
                <FormControl size="small" sx={{ minWidth: 72 }}>
                  <Select
                    displayEmpty
                    value={memberForm.gender ?? ''}
                    onChange={(e) => setMemberForm((m) => ({ ...m, gender: String(e.target.value) }))}
                    sx={{ fontSize: 12 }}
                  >
                    <MenuItem value="" sx={{ fontSize: 12 }}>—</MenuItem>
                    <MenuItem value="M" sx={{ fontSize: 12 }}>M</MenuItem>
                    <MenuItem value="F" sx={{ fontSize: 12 }}>F</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                size="small"
                label="N° passeport (opt.)"
                value={memberForm.document_number ?? ''}
                onChange={(e) => setMemberForm((m) => ({ ...m, document_number: e.target.value }))}
                sx={{ '& .MuiInputBase-input': { fontSize: 12, fontFamily: '"Geist Mono", monospace' } }}
              />
            </Stack>

            <Button
              size="small"
              fullWidth
              variant="contained"
              disabled={Boolean(busy)}
              onClick={runRegisterCurrent}
              sx={{ fontSize: 11, textTransform: 'none', fontWeight: 700, bgcolor: T.success, boxShadow: 'none' }}
            >
              {busy === 'one' ? '…' : isTravelerDone(flow.travelersList[selectedIndex]?.title ?? '') ? 'Mettre à jour' : 'Enregistrer'}
            </Button>

            <Typography sx={{ fontSize: 10, color: T.text4, mt: 1, textAlign: 'center' }}>
              {flow.summary}
            </Typography>
          </>
        )}
      </Popover>
    </>
  );
}

function mergeMembersAfterSave(
  prev: GuestMemberRecord[] | undefined,
  index: number,
  member: GuestMemberInput,
): GuestMemberRecord[] {
  const next = [...(prev ?? [])];
  while (next.length <= index) next.push({});
  next[index] = {
    ...next[index],
    first_name: member.first_name,
    last_name: member.last_name,
    nationality: member.nationality,
    document_number: member.document_number,
    gender: member.gender,
    status: 'COMPLETE',
  };
  return next;
}
