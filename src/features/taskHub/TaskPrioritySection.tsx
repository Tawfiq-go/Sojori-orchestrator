// ════════════════════════════════════════════════════════════════════
// TaskPrioritySection — Presets de priorité 3 couleurs par type de tâche
// « vert je continue, orange je regarde, rouge j'agis ».
// Le PM choisit UNE puce par type : ⏱ Heure pile · 🕐 Normal · 🌤 Souple.
// Stocké dans TaskTypeConfig.priorityProfile (cascade owner/listing backend).
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';

type Preset = 'strict' | 'normal' | 'souple';

/** Types staff visibles + preset par défaut (miroir backend DEFAULT_PRESET_BY_TYPE). */
const TYPES: Array<{ type: string; label: string; icon: string; defaultPreset: Preset }> = [
  { type: 'transport', label: 'Navette / transport', icon: '🚐', defaultPreset: 'strict' },
  { type: 'checkout_cleaning', label: 'Ménage Sojori', icon: '🧹', defaultPreset: 'souple' },
  { type: 'cleaning_paid', label: 'Ménage payant', icon: '🧽', defaultPreset: 'souple' },
  { type: 'receive_arrival', label: 'Accueil client (check-in)', icon: '🛎️', defaultPreset: 'normal' },
  { type: 'receive_departure', label: 'Départ client (check-out)', icon: '🛎️', defaultPreset: 'normal' },
  { type: 'groceries', label: 'Courses', icon: '🛒', defaultPreset: 'normal' },
  { type: 'concierge', label: 'Conciergerie', icon: '🤝', defaultPreset: 'normal' },
  { type: 'support', label: 'Support', icon: '🛠️', defaultPreset: 'normal' },
];

/** Seuils miroir PRIORITY_PRESETS (srv-fulltask) — affichés en clair pour le PM. */
const PRESETS: Array<{
  key: Preset;
  label: string;
  short: string;
  accept: string;
  start: string;
  forWhom: string;
}> = [
  {
    key: 'strict',
    label: '⏱ Heure pile',
    short: 'Client qui attend',
    accept: '🟠 24 h avant · 🔴 6 h avant',
    start: '🟠 +5 min · 🔴 +15 min',
    forWhom: 'Navette / transport',
  },
  {
    key: 'normal',
    label: '🕐 Normal',
    short: 'Équilibre classique',
    accept: '🟠 4 h avant · 🔴 2 h avant',
    start: '🟠 +15 min · 🔴 +30 min',
    forWhom: 'Accueil, courses, concierge…',
  },
  {
    key: 'souple',
    label: '🌤 Souple',
    short: 'Fenêtre large',
    accept: '🟠 4 h avant · 🔴 2 h avant',
    start: '🟠 +30 min · 🔴 +1 h',
    forWhom: 'Ménage',
  },
];

function PresetHoverCard({ preset }: { preset: (typeof PRESETS)[number] }) {
  return (
    <Box sx={{ p: 0.25, maxWidth: 280 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.5 }}>{preset.label}</Typography>
      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', mb: 1 }}>
        {preset.short} — idéal pour {preset.forWhom}
      </Typography>
      <Stack gap={0.6}>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', opacity: 0.7 }}>
            PAS ENCORE ACCEPTÉE
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{preset.accept}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', opacity: 0.7 }}>
            ACCEPTÉE, PAS COMMENCÉE
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{preset.start}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function TaskPrioritySection({ ownerKey }: { ownerKey: string }) {
  const [chosen, setChosen] = useState<Record<string, Preset | undefined>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setChosen({});
    fulltaskApi
      .getTaskConfigs(ownerKey)
      .then((res: { data?: Array<{ type?: string; listingId?: unknown; priorityProfile?: { preset?: string } }> }) => {
        if (!alive) return;
        const map: Record<string, Preset | undefined> = {};
        for (const row of res?.data ?? []) {
          if (row.listingId) continue; // v1 : réglage owner (le par-listing héritera)
          const preset = row.priorityProfile?.preset;
          if (row.type && (preset === 'strict' || preset === 'normal' || preset === 'souple')) {
            map[row.type] = preset;
          }
        }
        setChosen(map);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      alive = false;
    };
  }, [ownerKey]);

  const pick = useCallback(
    async (type: string, preset: Preset, isDefault: boolean) => {
      setSaving(type);
      try {
        await fulltaskApi.upsertTaskTypeConfig(ownerKey, type, {
          /* Revenir au défaut du type = retirer l'override (null). */
          priorityProfile: isDefault ? null : { preset },
        });
        setChosen((prev) => ({ ...prev, [type]: isDefault ? undefined : preset }));
        toast.success('Priorité mise à jour');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Échec de la mise à jour');
      } finally {
        setSaving(null);
      }
    },
    [ownerKey],
  );

  return (
    <Box
      sx={{
        mb: 2,
        p: '14px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(184,133,26,0.25)',
        bgcolor: 'rgba(212,165,116,0.06)',
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 0.25 }}>
        🚦 Priorité des tâches — seuils par type
      </Typography>
      <Typography sx={{ fontSize: 12, color: '#6b6b6b', mb: 1.25 }}>
        Règle staff : <b>vert je continue · orange je regarde · rouge j&apos;agis</b>. Survole une
        puce pour voir les seuils. Le rappel WhatsApp « 🔴 URGENT » part au staff assigné.
      </Typography>

      {/* Légende toujours visible — pas besoin de hover pour comprendre. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        gap={1}
        sx={{ mb: 1.5 }}
      >
        {PRESETS.map((p) => (
          <Tooltip
            key={p.key}
            title={<PresetHoverCard preset={p} />}
            arrow
            enterDelay={120}
            enterNextDelay={80}
            leaveDelay={60}
            placement="top"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: '#1c1914',
                  color: '#fff',
                  borderRadius: 1.5,
                  px: 1.25,
                  py: 1,
                  maxWidth: 300,
                  boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
                },
              },
              arrow: { sx: { color: '#1c1914' } },
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                p: '8px 10px',
                borderRadius: 1.25,
                border: '1px solid rgba(0,0,0,0.08)',
                bgcolor: 'rgba(255,255,255,0.55)',
                cursor: 'help',
                transition: 'border-color 0.15s, background 0.15s',
                '&:hover': {
                  borderColor: 'rgba(184,133,26,0.55)',
                  bgcolor: 'rgba(212,165,116,0.18)',
                },
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 0.25 }}>{p.label}</Typography>
              <Typography sx={{ fontSize: 10.5, color: '#6b6b6b', lineHeight: 1.35 }}>
                Accept. {p.accept.replace('🟠 ', '').replace('🔴 ', ' / ')}
                <br />
                Début {p.start.replace('🟠 ', '').replace('🔴 ', ' / ')}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Stack>

      {!loaded ? (
        <Typography sx={{ fontSize: 12, color: '#999' }}>Chargement…</Typography>
      ) : (
        <Stack gap={0.75}>
          {TYPES.map((t) => {
            const active: Preset = chosen[t.type] ?? t.defaultPreset;
            const isOverridden = chosen[t.type] != null;
            const activeMeta = PRESETS.find((p) => p.key === active)!;
            return (
              <Stack
                key={t.type}
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                gap={1}
                sx={{
                  py: 0.5,
                  px: 0.75,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.45)' },
                }}
              >
                <Box sx={{ minWidth: { sm: 210 }, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 650 }}>
                    {t.icon} {t.label}
                    {!isOverridden && (
                      <Box component="span" sx={{ color: '#999', fontWeight: 500 }}>
                        {' '}
                        · défaut
                      </Box>
                    )}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#8a8a8a', mt: 0.15 }}>
                    Actif : {activeMeta.label} — accept. {activeMeta.accept.split('·')[0].trim()}
                  </Typography>
                </Box>
                <Stack direction="row" gap={0.6} flexWrap="wrap">
                  {PRESETS.map((p) => {
                    const selected = active === p.key;
                    return (
                      <Tooltip
                        key={p.key}
                        title={<PresetHoverCard preset={p} />}
                        arrow
                        enterDelay={100}
                        enterNextDelay={60}
                        leaveDelay={40}
                        placement="top"
                        slotProps={{
                          tooltip: {
                            sx: {
                              bgcolor: '#1c1914',
                              color: '#fff',
                              borderRadius: 1.5,
                              px: 1.25,
                              py: 1,
                              maxWidth: 300,
                              boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
                            },
                          },
                          arrow: { sx: { color: '#1c1914' } },
                        }}
                      >
                        <Box
                          component="button"
                          type="button"
                          disabled={saving === t.type}
                          onClick={() => pick(t.type, p.key, p.key === t.defaultPreset)}
                          sx={{
                            all: 'unset',
                            boxSizing: 'border-box',
                            font: 'inherit',
                            fontSize: 11.5,
                            fontWeight: 700,
                            px: 1.25,
                            py: '5px',
                            borderRadius: 999,
                            cursor: saving === t.type ? 'wait' : 'pointer',
                            border: selected
                              ? '1px solid rgba(184,133,26,0.65)'
                              : '1px solid rgba(0,0,0,0.12)',
                            bgcolor: selected ? 'rgba(212,165,116,0.35)' : 'rgba(255,255,255,0.7)',
                            color: selected ? '#7a5c1f' : '#555',
                            opacity: saving === t.type ? 0.5 : 1,
                            transition: 'background 0.12s, border-color 0.12s',
                            '&:hover': {
                              borderColor: 'rgba(184,133,26,0.55)',
                              bgcolor: selected
                                ? 'rgba(212,165,116,0.45)'
                                : 'rgba(212,165,116,0.14)',
                            },
                          }}
                        >
                          {p.label}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
