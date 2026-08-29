import { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import { V3 } from './theme';

/** Miroir srv-listing utils/cleaningRules — HousekeepingPolicyConfig. */
export type HousekeepingPolicyConfig = {
  creation?: 'auto' | 'manual';
  assignment?: 'auto' | 'manual' | 'supervisor';
  notification?: 'immediate' | 'digest' | 'none';
  /** HH:mm, heure Africa/Casablanca. */
  digestTime?: string;
};


const DIGEST_TIME_DEFAULT = '08:00';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type Props = {
  listingId: string;
  /** cleaningRules.housekeepingPolicy du doc orchestration (undefined si non configuré). */
  policy?: HousekeepingPolicyConfig | null;
  /** Remonte la policy effective après chaque écriture serveur. */
  onSaved?: (policy: HousekeepingPolicyConfig | null) => void;
};

const sectionSx = {
  border: `1px solid ${V3.b}`,
  borderRadius: '12px',
  bgcolor: V3.card,
  overflow: 'hidden',
};

function normalizePolicy(raw: unknown): HousekeepingPolicyConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: HousekeepingPolicyConfig = {};
  if (r.creation === 'auto' || r.creation === 'manual') out.creation = r.creation;
  if (r.assignment === 'auto' || r.assignment === 'manual' || r.assignment === 'supervisor') {
    out.assignment = r.assignment;
  }
  if (r.notification === 'immediate' || r.notification === 'digest' || r.notification === 'none') {
    out.notification = r.notification;
  }
  if (typeof r.digestTime === 'string' && TIME_RE.test(r.digestTime)) out.digestTime = r.digestTime;
  return Object.keys(out).length ? out : null;
}

export default function V3HousekeepingPolicyPanel({ listingId, policy, onSaved }: Props) {
  const [state, setState] = useState<HousekeepingPolicyConfig | null>(() =>
    normalizePolicy(policy),
  );
  const [digestDraft, setDigestDraft] = useState<string>(
    normalizePolicy(policy)?.digestTime ?? DIGEST_TIME_DEFAULT,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = normalizePolicy(policy);
    setState(next);
    setDigestDraft(next?.digestTime ?? DIGEST_TIME_DEFAULT);
  }, [policy]);

  const persist = async (patch: HousekeepingPolicyConfig | null) => {
    setSaving(true);
    const prev = state;
    // null = unset explicite (le backend efface la clé → retour aux défauts
    // système résolus par profil : hôtel → manuel, single → auto).
    const optimistic = patch === null ? undefined : { ...(state ?? {}), ...patch };
    setState(optimistic);
    try {
      await listingsService.putListingOrchestration(listingId, {
        cleaningRules: { housekeepingPolicy: patch },
      });
      onSaved?.(optimistic ?? null);
    } catch (e: unknown) {
      setState(prev);
      setDigestDraft(prev?.digestTime ?? DIGEST_TIME_DEFAULT);
      toast.error(
        e instanceof Error ? e.message : 'Impossible d’enregistrer la politique ménage',
      );
    } finally {
      setSaving(false);
    }
  };

  const commitDigestTime = (value: string) => {
    setDigestDraft(value);
    if (!TIME_RE.test(value)) return;
    if (state?.notification !== 'digest') return;
    if (value === state?.digestTime) return;
    void persist({ digestTime: value });
  };

  const reset = () => {
    setDigestDraft(DIGEST_TIME_DEFAULT);
    void persist(null);
  };

  const configured = Boolean(state && Object.keys(state).length);

  return (
    <Box sx={sectionSx}>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${V3.b}`,
          bgcolor: V3.alt,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: V3.t }}>
            Politique du listing
          </Typography>
          <Typography sx={{ fontSize: 11, color: V3.t3 }}>
            Qui crée, qui assigne, qui est prévenu
          </Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          {saving && (
            <Typography sx={{ fontSize: 10.5, color: V3.t4, fontFamily: 'monospace' }}>
              Enregistrement…
            </Typography>
          )}
          <Button
            size="small"
            onClick={reset}
            disabled={!configured || saving}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12,
              borderRadius: '8px',
              color: V3.t3,
              border: `1px dashed ${V3.bs}`,
              '&.Mui-disabled': { opacity: 0.4 },
            }}
          >
            Réinitialiser
          </Button>
        </Stack>
      </Box>

      <Stack sx={{ px: 2, py: 1.5, gap: 1.5 }}>
        {!configured && (
          <Typography sx={{ fontSize: 11, color: V3.t4, fontStyle: 'italic' }}>
            Défauts système (hôtel = manuel · superviseur · digest 17:00)
          </Typography>
        )}

        <PolicyRow
          label="Création des ménages"
          options={[
            { value: 'manual', label: 'Manuelle (SM)' },
            { value: 'auto', label: 'Automatique' },
          ]}
          value={state?.creation}
          disabled={saving}
          onSelect={v => void persist({ creation: v as 'auto' | 'manual' })}
        />

        <PolicyRow
          label="Assignation"
          options={[
            { value: 'manual', label: 'Manuelle' },
            { value: 'auto', label: 'Auto' },
            { value: 'supervisor', label: 'Superviseur' },
          ]}
          value={state?.assignment}
          disabled={saving}
          onSelect={v => void persist({ assignment: v as 'auto' | 'manual' | 'supervisor' })}
        />

        <PolicyRow
          label="Notification FdM"
          options={[
            { value: 'immediate', label: 'Immédiate' },
            { value: 'digest', label: 'Digest du matin' },
          ]}
          value={state?.notification}
          disabled={saving}
          onSelect={v =>
            void persist(
              v === 'digest'
                ? { notification: 'digest', digestTime: TIME_RE.test(digestDraft) ? digestDraft : DIGEST_TIME_DEFAULT }
                : { notification: v as 'immediate' },
            )
          }
        />

        {state?.notification === 'digest' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.25 }}>
            <Typography sx={{ fontSize: 12, color: V3.t2, fontWeight: 600 }}>
              Heure du digest
            </Typography>
            <TextField
              size="small"
              type="time"
              value={digestDraft}
              onChange={e => commitDigestTime(e.target.value)}
              disabled={saving}
              sx={{
                width: 120,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: 13,
                  bgcolor: '#fff',
                  '& fieldset': { borderColor: V3.b },
                  '&:hover fieldset': { borderColor: V3.bs },
                  '&.Mui-focused fieldset': { borderColor: V3.p },
                },
              }}
            />
            <Typography sx={{ fontSize: 10.5, color: V3.t4, fontFamily: 'monospace' }}>
              heure Casablanca
            </Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: 11, color: V3.t4, pt: 0.25 }}>
          L’Urgent notifie toujours immédiatement. Un staff peut réduire ses propres
          notifications, jamais l’inverse.
        </Typography>
      </Stack>
    </Box>
  );
}

function PolicyRow({
  label,
  options,
  value,
  disabled,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: V3.t2, mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <Button
              key={opt.value}
              size="small"
              variant={active ? 'contained' : 'outlined'}
              disabled={disabled}
              onClick={() => {
                if (!active) onSelect(opt.value);
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: '8px',
                ...(active
                  ? { bgcolor: V3.p, '&:hover': { bgcolor: V3.pd } }
                  : { borderColor: V3.bs, color: V3.t2 }),
              }}
            >
              {opt.label}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}
