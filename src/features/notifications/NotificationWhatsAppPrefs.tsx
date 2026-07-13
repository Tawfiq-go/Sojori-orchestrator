import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import type { PreferenceCatalogEntry } from './types';
import { GUEST_JOURNEY_NOTIFY_EVENTS } from './constants';
import { useUpdatePreferences } from './useNotifications';

export const WHATSAPP_MESSAGE_EVENT = 'message:whatsapp_received';

export { GUEST_JOURNEY_NOTIFY_EVENTS };

export type WhatsappNotifyMode = 'all_messages' | 'milestones_only';

const MILESTONES_DEFAULT_ON = new Set([
  'guest:registration_completed',
  'guest:arrival_time_chosen',
  'guest:departure_time_chosen',
]);

function catalogMap(catalog: PreferenceCatalogEntry[]) {
  return new Map(catalog.map((e) => [e.eventKey, e]));
}

function deriveMode(catalog: PreferenceCatalogEntry[]): WhatsappNotifyMode {
  const wa = catalog.find((e) => e.eventKey === WHATSAPP_MESSAGE_EVENT);
  return wa?.channels.dashboard ? 'all_messages' : 'milestones_only';
}

interface NotificationWhatsAppPrefsProps {
  catalog: PreferenceCatalogEntry[];
  targetUserId?: string | null;
}

export function NotificationWhatsAppPrefs({ catalog, targetUserId = null }: NotificationWhatsAppPrefsProps) {
  const updatePrefs = useUpdatePreferences(targetUserId);
  const [regDetailOpen, setRegDetailOpen] = useState(true);

  const byKey = useMemo(() => catalogMap(catalog), [catalog]);
  const mode = deriveMode(catalog);

  const waEntry = byKey.get(WHATSAPP_MESSAGE_EVENT);
  const journeyEntries = GUEST_JOURNEY_NOTIFY_EVENTS.map((k) => byKey.get(k)).filter(
    Boolean,
  ) as PreferenceCatalogEntry[];

  const applyMode = (next: WhatsappNotifyMode) => {
    const patch: Record<string, { dashboard: boolean }> = {
      [WHATSAPP_MESSAGE_EVENT]: { dashboard: next === 'all_messages' },
    };
    for (const key of GUEST_JOURNEY_NOTIFY_EVENTS) {
      patch[key] = {
        dashboard:
          next === 'milestones_only' ? MILESTONES_DEFAULT_ON.has(key) : false,
      };
    }
    void updatePrefs.mutateAsync(patch).catch(() => {});
  };

  const toggleEvent = (eventKey: string, next: boolean) => {
    void updatePrefs.mutateAsync({ [eventKey]: { dashboard: next } }).catch(() => {});
  };

  if (!waEntry) return null;

  return (
    <Box
      sx={{
        mb: 2,
        border: `1px solid ${t.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        bgcolor: t.bg1,
      }}
    >
      <Box sx={{ px: 1.5, py: 1.25, bgcolor: t.bg2, borderBottom: `1px solid ${t.border}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: 'rgba(37,211,102,0.15)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
            }}
          >
            💬
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text }}>
              WhatsApp guest
            </Typography>
            <Typography sx={{ fontSize: 11, color: t.text3, lineHeight: 1.4 }}>
              Messages libres ou jalons parcours (enregistrement, heures). Transport, courses et
              conciergerie → section <b>Tâches</b>.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 1.25 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, mb: 0.75 }}>
          Mode
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
          <ModeRadio
            active={mode === 'all_messages'}
            label="Tous les messages client"
            hint="Chaque message WhatsApp entrant"
            onClick={() => applyMode('all_messages')}
          />
          <ModeRadio
            active={mode === 'milestones_only'}
            label="Jalons parcours seulement"
            hint="Enregistrement, heure arrivée / départ — pas chaque « bonjour »"
            onClick={() => applyMode('milestones_only')}
          />
        </Box>

        <PrefRow
          label={waEntry.labelFr}
          sub={WHATSAPP_MESSAGE_EVENT}
          checked={waEntry.channels.dashboard}
          onChange={(v) => toggleEvent(WHATSAPP_MESSAGE_EVENT, v)}
        />

        {mode === 'milestones_only' ? (
          <Box sx={{ mt: 1.5, pt: 1.25, borderTop: `1px solid ${t.border}` }}>
            <Box
              component="button"
              type="button"
              onClick={() => setRegDetailOpen((o) => !o)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                p: 0,
                mb: regDetailOpen ? 0.75 : 0,
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2 }}>
                Jalons enregistrement & séjour
              </Typography>
              <Typography sx={{ fontSize: 12, color: t.text3 }}>
                {regDetailOpen ? '▾' : '▸'}
              </Typography>
            </Box>

            {regDetailOpen
              ? journeyEntries.map((ev) => (
                  <PrefRow
                    key={ev.eventKey}
                    label={ev.labelFr}
                    sub={ev.eventKey}
                    checked={ev.channels.dashboard}
                    onChange={(v) => toggleEvent(ev.eventKey, v)}
                  />
                ))
              : null}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function ModeRadio({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        textAlign: 'left',
        border: `1px solid ${active ? t.primary : t.border}`,
        borderRadius: '10px',
        bgcolor: active ? t.primaryTint : t.bg2,
        px: 1.25,
        py: 1,
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: `2px solid ${active ? t.primary : t.text4}`,
          mt: 0.25,
          flexShrink: 0,
          boxShadow: active ? `inset 0 0 0 3px ${t.bg1}` : 'none',
          bgcolor: active ? t.primary : 'transparent',
        }}
      />
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: active ? t.primaryDeep : t.text }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: t.text3, lineHeight: 1.4 }}>{hint}</Typography>
      </Box>
    </Box>
  );
}

function PrefRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 1,
        alignItems: 'center',
        py: 0.65,
        borderBottom: `1px solid ${t.border}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text }}>{label}</Typography>
        <Typography sx={{ fontSize: 10, color: t.text4, fontFamily: 'Geist Mono, monospace' }}>
          {sub}
        </Typography>
      </Box>
      <Switch size="small" checked={checked} onChange={(_, v) => onChange(v)} />
    </Box>
  );
}
