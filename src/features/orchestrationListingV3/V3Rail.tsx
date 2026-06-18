import { Box, Typography } from '@mui/material';
import {
  CAPABILITY_GROUPS,
  CAPABILITY_REGISTRY,
  capabilityShortHint,
  type CapabilityDefinition,
} from '../serviceMatrix/capabilityRegistry';
import type { CapabilityRowState } from '../serviceMatrix/types';
import { V3 } from './theme';
import { V3Badge } from './V3Primitives';
import {
  syncHintLabel,
  syncHintTone,
  type CapabilitySyncHint,
} from './capabilitySyncHints';
import { isCapabilityActivated } from './ownerCapabilityActivation';

const GROUP_EMOJI: Record<string, string> = {
  cleaning: '🧹',
  journey: '✈️',
  communication: '💬',
  concierge: '🛎',
  info: 'ℹ️',
};

type Props = {
  rows: CapabilityRowState[];
  selectedKey: string | null;
  /** false = rail listing (masque les entrées listingRailHidden). */
  ownerTemplateMode?: boolean;
  /** Modèle PM : masquer les services non activés (pas pour template admin global). */
  filterInactiveCapabilities?: boolean;
  syncHints?: Record<string, CapabilitySyncHint>;
  onSelectService: (key: string) => void;
};

function statusColor(status: CapabilityRowState['status']) {
  if (status === 'configured') return V3.su;
  if (status === 'incomplete') return V3.warn;
  return V3.bs;
}

export default function V3Rail({
  rows,
  selectedKey,
  ownerTemplateMode = false,
  filterInactiveCapabilities = false,
  syncHints = {},
  onSelectService,
}: Props) {
  const rowByKey = Object.fromEntries(rows.map(r => [r.key, r]));

  const railCapabilities = CAPABILITY_REGISTRY.filter(c => {
    if (c.key === 'menu_navigation') return false;
    if (!ownerTemplateMode && c.listingRailHidden) return false;
    if (ownerTemplateMode && filterInactiveCapabilities) {
      const row = rowByKey[c.key];
      return isCapabilityActivated(row);
    }
    return true;
  });

  const groups = Object.entries(CAPABILITY_GROUPS)
    .map(([id, label]) => ({
      id,
      label,
      items: railCapabilities.filter(c => c.group === id),
    }))
    .filter(grp => grp.items.length > 0);

  const menuNavDef = CAPABILITY_REGISTRY.find(c => c.key === 'menu_navigation');
  const menuNavRow = rowByKey.menu_navigation;
  const showMenuNav = !filterInactiveCapabilities || isCapabilityActivated(menuNavRow);

  return (
    <Box
      component="aside"
      sx={{
        borderRight: `1px solid ${V3.b}`,
        bgcolor: V3.rail,
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        minHeight: 0,
        flexShrink: 0,
        py: 1.5,
        px: 1.25,
        pb: 4,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {menuNavDef && showMenuNav && (
        <Box
          component="button"
          type="button"
          onClick={() => onSelectService('menu_navigation')}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 1.125,
            p: '11px',
            mb: 1,
            borderRadius: '9px',
            border: `1px solid ${selectedKey === 'menu_navigation' ? V3.wa : V3.b}`,
            bgcolor:
              selectedKey === 'menu_navigation'
                ? V3.waT
                : 'linear-gradient(135deg,rgba(37,211,102,0.08),transparent)',
            cursor: 'pointer',
            textAlign: 'left',
            '&:hover': { bgcolor: V3.waT },
          }}
        >
          <span style={{ fontSize: 15 }}>{menuNavDef.emoji}</span>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{menuNavDef.label}</Typography>
            <Typography sx={{ fontSize: 9.5, color: V3.t3, fontFamily: 'monospace' }}>
              A · B · C · D · J
            </Typography>
          </Box>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: statusColor(menuNavRow?.status ?? 'not_managed'),
            }}
          />
        </Box>
      )}

      {groups.map(grp => (
        <Box key={grp.id} sx={{ mb: 0.75 }}>
          <Typography
            sx={{
              px: 1.25,
              py: '8px 4px',
              fontSize: 11,
              fontWeight: 700,
              color: V3.t3,
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <span style={{ fontSize: 14 }}>{GROUP_EMOJI[grp.id] ?? '•'}</span>
            {grp.label}
          </Typography>
          {grp.items.map((def: CapabilityDefinition) => {
            const row = rowByKey[def.key];
            const active = selectedKey === def.key;
            const disabled = !ownerTemplateMode && row?.status === 'not_managed' && !row?.managed;
            return (
              <Box
                key={def.key}
                component="button"
                type="button"
                onClick={() => onSelectService(def.key)}
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.125,
                  p: '9px 11px',
                  borderRadius: '9px',
                  border: 0,
                  bgcolor: active ? V3.pt : 'transparent',
                  cursor: 'pointer',
                  mb: '1px',
                  position: 'relative',
                  textAlign: 'left',
                  opacity: disabled ? 0.55 : 1,
                  '&:hover': { bgcolor: active ? V3.pt : V3.alt },
                  '&::before': active
                    ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        bgcolor: V3.p,
                        borderRadius: '0 3px 3px 0',
                      }
                    : {},
                }}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{def.emoji}</span>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        fontWeight: active ? 700 : 600,
                        color: active ? V3.pd : disabled ? V3.t4 : V3.t,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.25,
                      }}
                    >
                      {def.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: V3.t4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                      }}
                    >
                      {capabilityShortHint(def)}
                    </Typography>
                  </Box>
                  {syncHintLabel(syncHints[def.key]) ? (
                    <V3Badge tone={syncHintTone(syncHints[def.key])}>
                      {syncHintLabel(syncHints[def.key])}
                    </V3Badge>
                  ) : null}
                </Box>
                <Box sx={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                  {(['managed', 'clientEnabled', 'orchestrated', 'taskEnabled'] as const).map((f, i) => {
                    const colors = [V3.p, V3.client, V3.orch, V3.task];
                    const on = row?.[f] ?? false;
                    const na =
                      (f === 'clientEnabled' && def.columns.client === 'na') ||
                      (f === 'orchestrated' && def.columns.orchestrated === 'na') ||
                      (f === 'taskEnabled' && def.columns.task === 'na');
                    return (
                      <Box
                        key={f}
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: on && !na ? colors[i] : V3.bs,
                        }}
                      />
                    );
                  })}
                </Box>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    flexShrink: 0,
                    bgcolor: statusColor(row?.status ?? 'not_managed'),
                  }}
                />
              </Box>
            );
          })}
        </Box>
      ))}

    </Box>
  );
}
