import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { FACET_ORDER, NOTIF_FACETS } from './constants';
import { NotificationWhatsAppPrefs, WHATSAPP_MESSAGE_EVENT, GUEST_JOURNEY_NOTIFY_EVENTS } from './NotificationWhatsAppPrefs';
import type { NotificationFacet, PreferenceCatalogEntry } from './types';
import { useNotificationPreferences, useUpdatePreferences } from './useNotifications';
import { useNotificationScope } from './NotificationProvider';
import { getNotificationApiDeployed } from './notificationApiErrors';

export interface NotificationPreferencesSectionProps {
  /** Compte cible (owner ou worker). Par défaut : le PM du scope (ownerId). */
  targetUserId?: string | null;
  /** Masquer l’intro (ex. dans le formulaire worker). */
  compact?: boolean;
}

export function NotificationPreferencesSection({
  targetUserId = null,
  compact = false,
}: NotificationPreferencesSectionProps) {
  const { enabled } = useNotificationScope();
  const { data, isLoading, isError } = useNotificationPreferences(targetUserId);
  const updatePrefs = useUpdatePreferences(targetUserId);
  const [collapsed, setCollapsed] = useState<Partial<Record<NotificationFacet, boolean>>>({});

  const groups = useMemo(() => {
    const catalog = data?.catalog ?? [];
    const journeyKeys = new Set<string>(GUEST_JOURNEY_NOTIFY_EVENTS);
    const byFacet = new Map<NotificationFacet, PreferenceCatalogEntry[]>();
    for (const entry of catalog) {
      if (entry.eventKey === WHATSAPP_MESSAGE_EVENT) continue;
      if (journeyKeys.has(entry.eventKey)) continue;
      const list = byFacet.get(entry.facet) ?? [];
      list.push(entry);
      byFacet.set(entry.facet, list);
    }
    return FACET_ORDER.filter((f) => f !== 'guest_journey' && byFacet.has(f)).map((facet) => ({
      facet,
      events: byFacet.get(facet) ?? [],
    }));
  }, [data?.catalog]);

  if (!enabled) {
    return (
      <Box sx={{ p: 2, bgcolor: t.bg2, borderRadius: 2, border: `1px solid ${t.border}` }}>
        <Typography sx={{ fontSize: 13, color: t.text2 }}>
          Sélectionnez un propriétaire (filtre admin ou simulation PM) pour configurer les
          notifications.
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return <Typography sx={{ fontSize: 13, color: t.text3 }}>Chargement…</Typography>;
  }

  if (getNotificationApiDeployed() === false) {
    return (
      <Box sx={{ p: 2, bgcolor: t.warningTint, borderRadius: 2, border: `1px solid ${t.border}` }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, mb: 0.5 }}>
          API notifications v2 pas encore déployée
        </Typography>
        <Typography sx={{ fontSize: 12, color: t.text2, lineHeight: 1.5 }}>
          Déployez <code>srv-fulltask</code> avec le code notifications v2, puis rechargez cette
          page.
        </Typography>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Typography sx={{ fontSize: 13, color: t.error }}>
        Impossible de charger les préférences de notifications.
      </Typography>
    );
  }

  const handleToggle = (
    eventKey: string,
    next: boolean,
    locked?: boolean,
  ) => {
    if (locked && !next) return;
    void updatePrefs
      .mutateAsync({
        [eventKey]: { dashboard: next },
      })
      .catch(() => {});
  };

  return (
    <Box>
      {!compact ? (
        <Typography sx={{ fontSize: 13, color: t.text2, mb: 2, maxWidth: 720 }}>
          Choisissez les événements qui déclenchent une alerte dans la cloche du dashboard. Les
          alertes critiques restent toujours actives (sécurité opérationnelle). À la création, tout
          est activé par défaut.
        </Typography>
      ) : null}

      {data?.catalog?.length ? (
        <NotificationWhatsAppPrefs catalog={data.catalog} targetUserId={targetUserId} />
      ) : null}

      {groups.map(({ facet, events }) => {
        const meta = NOTIF_FACETS[facet];
        const isCollapsed = collapsed[facet];
        return (
          <Box
            key={facet}
            sx={{
              mb: 1.5,
              border: `1px solid ${t.border}`,
              borderRadius: '12px',
              overflow: 'hidden',
              bgcolor: t.bg1,
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [facet]: !prev[facet] }))
              }
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.25,
                border: 'none',
                cursor: 'pointer',
                bgcolor: t.bg2,
                textAlign: 'left',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  bgcolor: `${meta.color}1a`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 16,
                }}
              >
                {meta.icon}
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, flex: 1 }}>
                {meta.label}
              </Typography>
              <Typography sx={{ fontSize: 11, color: t.text3 }}>
                {events.length} événement{events.length > 1 ? 's' : ''}
              </Typography>
              <Typography sx={{ fontSize: 14, color: t.text3, transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}>
                ▾
              </Typography>
            </Box>

            {!isCollapsed ? (
              <Box sx={{ px: 1.5, py: 1 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px',
                    gap: 1,
                    py: 0.75,
                    borderBottom: `1px solid ${t.border}`,
                    mb: 0.5,
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3 }}>
                    Événement
                  </Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, textAlign: 'center' }}>
                    <Tooltip title="Alerte dans la cloche du dashboard (coin haut droit)">
                      <span>Cloche</span>
                    </Tooltip>
                  </Typography>
                </Box>

                {events.map((ev) => (
                  <Box
                    key={ev.eventKey}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 90px',
                      gap: 1,
                      alignItems: 'center',
                      py: 0.75,
                      borderBottom: `1px solid ${t.border}`,
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
                        {ev.labelFr}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, color: t.text4, fontFamily: 'Geist Mono, monospace' }}>
                        {ev.eventKey}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {ev.critical ? (
                        <Tooltip title="Toujours actif (alerte critique)">
                          <LockOutlined sx={{ fontSize: 18, color: t.text3 }} />
                        </Tooltip>
                      ) : (
                        <Switch
                          size="small"
                          checked={ev.channels.dashboard}
                          onChange={(_, checked) =>
                            handleToggle(ev.eventKey, checked, ev.critical)
                          }
                        />
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
