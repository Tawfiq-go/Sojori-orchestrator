import { Box, Typography } from '@mui/material';
import {
  CAPABILITY_GROUPS,
  CAPABILITY_REGISTRY,
  type CapabilityDefinition,
} from '../serviceMatrix/capabilityRegistry';
import type { CapabilityRowState } from '../serviceMatrix/types';
import { V3 } from './theme';

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
  libraryActive: boolean;
  onSelectService: (key: string) => void;
  onSelectLibrary: () => void;
};

function statusColor(status: CapabilityRowState['status']) {
  if (status === 'configured') return V3.su;
  if (status === 'incomplete') return V3.warn;
  return V3.bs;
}

export default function V3Rail({
  rows,
  selectedKey,
  libraryActive,
  onSelectService,
  onSelectLibrary,
}: Props) {
  const rowByKey = Object.fromEntries(rows.map(r => [r.key, r]));

  const groups = Object.entries(CAPABILITY_GROUPS).map(([id, label]) => ({
    id,
    label,
    items: CAPABILITY_REGISTRY.filter(c => c.group === id && c.key !== 'menu_navigation'),
  }));

  const menuNavDef = CAPABILITY_REGISTRY.find(c => c.key === 'menu_navigation');
  const menuNavRow = rowByKey.menu_navigation;

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
      {menuNavDef && (
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
            border: `1px solid ${selectedKey === 'menu_navigation' && !libraryActive ? V3.wa : V3.b}`,
            bgcolor:
              selectedKey === 'menu_navigation' && !libraryActive
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
              px: 1.5,
              py: '9px 6px',
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              fontSize: 9,
              fontWeight: 800,
              color: V3.t4,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <span>{GROUP_EMOJI[grp.id] ?? '•'}</span>
            {grp.label}
          </Typography>
          {grp.items.map((def: CapabilityDefinition) => {
            const row = rowByKey[def.key];
            const active = !libraryActive && selectedKey === def.key;
            const disabled = row?.status === 'not_managed' && !row?.managed;
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
                <Typography
                  sx={{
                    flex: 1,
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 600,
                    color: active ? V3.pd : disabled ? V3.t4 : V3.t,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {def.label}
                </Typography>
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

      <Box sx={{ height: 1, bgcolor: V3.b, mx: 1.5, my: 1.25 }} />

      <Box
        component="button"
        type="button"
        onClick={onSelectLibrary}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 1.125,
          p: '11px',
          borderRadius: '9px',
          border: '1px dashed rgba(124,58,247,0.25)',
          bgcolor: libraryActive ? V3.orchT : 'linear-gradient(135deg,rgba(124,58,247,0.10),transparent)',
          cursor: 'pointer',
          textAlign: 'left',
          '&:hover': { bgcolor: V3.orchT },
        }}
      >
        <span style={{ fontSize: 15 }}>📚</span>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Bibliothèque messages</Typography>
          <Typography
            sx={{
              fontSize: 9.5,
              color: V3.t3,
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              mt: '1px',
            }}
          >
            template PM · OTA/Email/WA
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
