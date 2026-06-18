import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import {
  CAPABILITY_GROUPS,
  CAPABILITY_REGISTRY,
  capabilityShortHint,
  type CapabilityGroupId,
} from '../serviceMatrix/capabilityRegistry';
import type { CapabilityRowState } from '../serviceMatrix/types';
import { V3 } from './theme';
import {
  activationsFromRows,
  defaultActivationsAllOff,
  saveOwnerCapabilityActivations,
} from './ownerCapabilityActivation';
import type { OwnerOrchestrationDoc } from './ownerOrchestrationApi';

const GROUP_EMOJI: Record<CapabilityGroupId, string> = {
  cleaning: '🧹',
  journey: '✈️',
  communication: '💬',
  concierge: '🛎',
  info: 'ℹ️',
};

type Props = {
  ownerKey: string;
  rows: CapabilityRowState[];
  orchestrationDoc: OwnerOrchestrationDoc | null;
  /** Création owner : pas de save auto, state contrôlé par le parent. */
  compact?: boolean;
  /** Contenu de l’onglet dédié (sans carte englobante). */
  variant?: 'card' | 'tab';
  value?: Record<string, boolean>;
  onChange?: (next: Record<string, boolean>) => void;
  onSaved?: (activations: Record<string, boolean>) => void;
  disabled?: boolean;
};

export default function OwnerCapabilitiesActivationPanel({
  ownerKey,
  rows,
  orchestrationDoc,
  compact = false,
  variant = 'card',
  value,
  onChange,
  onSaved,
  disabled = false,
}: Props) {
  const isTab = variant === 'tab';
  const controlled = value != null && onChange != null;
  const [local, setLocal] = useState<Record<string, boolean>>(() =>
    controlled ? (value ?? defaultActivationsAllOff()) : activationsFromRows(rows),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (controlled) {
      setLocal(value ?? defaultActivationsAllOff());
      setDirty(false);
      return;
    }
    setLocal(activationsFromRows(rows));
    setDirty(false);
  }, [controlled, rows, value]);

  const setActivation = useCallback(
    (key: string, active: boolean) => {
      setLocal(prev => {
        const next = { ...prev, [key]: active };
        onChange?.(next);
        return next;
      });
      if (!controlled) setDirty(true);
    },
    [controlled, onChange],
  );

  const setGroup = useCallback(
    (groupId: CapabilityGroupId, active: boolean) => {
      setLocal(prev => {
        const next = { ...prev };
        for (const def of CAPABILITY_REGISTRY) {
          if (def.group === groupId && def.key !== 'menu_navigation') {
            next[def.key] = active;
          }
        }
        onChange?.(next);
        return next;
      });
      if (!controlled) setDirty(true);
    },
    [controlled, onChange],
  );

  const groups = useMemo(
    () =>
      (Object.entries(CAPABILITY_GROUPS) as [CapabilityGroupId, string][]).map(([id, label]) => ({
        id,
        label,
        items: CAPABILITY_REGISTRY.filter(c => c.group === id && c.key !== 'menu_navigation'),
      })),
    [],
  );

  const menuNav = CAPABILITY_REGISTRY.find(c => c.key === 'menu_navigation');

  const activeCount = Object.values(local).filter(Boolean).length;

  const persist = async () => {
    if (!ownerKey || ownerKey === 'global') return;
    setSaving(true);
    try {
      await saveOwnerCapabilityActivations(ownerKey, local, orchestrationDoc);
      toast.success('Activation services enregistrée');
      setDirty(false);
      onSaved?.(local);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur enregistrement';
      if (/network error|connection refused|failed to fetch/i.test(msg)) {
        toast.error(
          'API listing inaccessible — vérifiez que le serveur Vite tourne (127.0.0.1:4174) ou relancez pnpm dev.',
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        mb: isTab ? 0 : 2,
        p: compact ? 1.5 : isTab ? 0 : 2,
        borderRadius: isTab ? 0 : 2,
        border: isTab ? 'none' : `1px solid ${V3.b}`,
        bgcolor: isTab ? 'transparent' : V3.card,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          {!isTab ? (
            <Typography sx={{ fontSize: compact ? 14 : 15, fontWeight: 800 }}>
              Activation des services
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: 12, color: V3.t3 }}>
            Désactivé = invisible dans le menu gauche. Par défaut tout est off pour un nouveau PM.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={`${activeCount} actif(s)`} color={activeCount ? 'success' : 'default'} />
          {!controlled && dirty ? (
            <Button
              size="small"
              variant="contained"
              disabled={saving || disabled}
              onClick={() => void persist()}
              sx={{ bgcolor: V3.p, '&:hover': { bgcolor: V3.pD } }}
            >
              {saving ? <CircularProgress size={16} color="inherit" /> : 'Enregistrer'}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {menuNav ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            p: 1.25,
            mb: 1.5,
            borderRadius: 1.5,
            border: `1px solid ${local.menu_navigation ? V3.wa : V3.b}`,
            bgcolor: local.menu_navigation ? V3.waT : 'transparent',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {menuNav.emoji} {menuNav.label}
            </Typography>
            <Typography sx={{ fontSize: 11, color: V3.t3, fontFamily: 'monospace' }}>
              A · B · C · D · J
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography sx={{ fontSize: 11, color: V3.t3 }}>{local.menu_navigation ? 'Oui' : 'Non'}</Typography>
            <Switch
              size="small"
              checked={local.menu_navigation === true}
              disabled={disabled || saving}
              onChange={(_, checked) => setActivation('menu_navigation', checked)}
            />
          </Stack>
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: compact
            ? { xs: '1fr', md: '1fr 1fr' }
            : { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: 1.5,
        }}
      >
        {groups.map(grp => (
          <Box
            key={grp.id}
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: `1px solid ${V3.b}`,
              bgcolor: V3.bg,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                {GROUP_EMOJI[grp.id]} {grp.label}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Button
                  size="small"
                  sx={{ minWidth: 0, fontSize: 10, py: 0.25 }}
                  disabled={disabled || saving}
                  onClick={() => setGroup(grp.id, true)}
                >
                  Tout Oui
                </Button>
                <Button
                  size="small"
                  sx={{ minWidth: 0, fontSize: 10, py: 0.25 }}
                  disabled={disabled || saving}
                  onClick={() => setGroup(grp.id, false)}
                >
                  Tout Non
                </Button>
              </Stack>
            </Stack>
            <Stack spacing={0.75}>
              {grp.items.map(def => (
                <Stack
                  key={def.key}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ gap: 1, py: 0.25 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25 }}>
                      {def.label}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: V3.t3, lineHeight: 1.2 }}>
                      {capabilityShortHint(def)}
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={local[def.key] === true}
                    disabled={disabled || saving}
                    onChange={(_, checked) => setActivation(def.key, checked)}
                  />
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
