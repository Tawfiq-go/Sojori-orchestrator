/**
 * Monitoring — design system aligné Dashboard V2 (Sojori Orchestrator)
 *
 * Palette :
 * - Fond page : tokens.bg0 (#f6f5f1)
 * - Cartes : tokens.bg1 + border tokens.border, radius 12px
 * - CTA / onglet actif : ambre tokens.primary (#b8851a)
 * - Accent monitoring / IA : violet tokens.ai (#7c3aed)
 * - Sévérité : success | warning | error | info (tokens sémantiques)
 */

import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  Badge,
  FilterBar,
  FilterChip,
  DataTable,
  Panel,
  Pagination as TablePagination,
  StatCard,
  StatsRow,
  ViewToggle,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../../../components/dashboard/DashboardV2.components';

export { t as monitorTokens };
export {
  Badge,
  FilterBar,
  FilterChip,
  DataTable,
  Panel,
  StatCard,
  StatsRow,
  ViewToggle,
  TablePagination,
  btnGhostSx,
  btnPrimarySx,
};

export type MonitorAccent = 'default' | 'whatsapp' | 'ai' | 'infra' | 'logs' | 'metrics' | 'rabbitmq';

const ACCENT: Record<
  MonitorAccent,
  { emoji: string; iconBg: string; iconColor: string; chipActive?: string }
> = {
  default: { emoji: '📊', iconBg: t.primaryTint, iconColor: t.primaryDeep },
  logs: { emoji: '📝', iconBg: t.infoTint, iconColor: t.info },
  metrics: { emoji: '📈', iconBg: 'rgba(6,182,212,0.12)', iconColor: '#0e7490' },
  rabbitmq: { emoji: '◇', iconBg: t.primaryTint, iconColor: t.primaryDeep },
  whatsapp: { emoji: '💬', iconBg: 'rgba(16,185,129,0.12)', iconColor: t.success },
  ai: { emoji: '🤖', iconBg: t.aiTint, iconColor: t.ai },
  infra: { emoji: '🏗️', iconBg: t.infoTint, iconColor: t.info },
};

export function severityBadgeVariant(
  severity?: string,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const s = (severity || '').toLowerCase();
  if (s === 'critical' || s === 'error' || s === 'fatal') return 'error';
  if (s === 'warning' || s === 'warn') return 'warning';
  if (s === 'ok' || s === 'healthy' || s === 'sent' || s === 'delivered') return 'success';
  if (s === 'info') return 'info';
  return 'neutral';
}

/** Conteneur racine d’un onglet monitoring (dans le hub). */
export function MonitorPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        pb: 3,
        animation: 'fadeIn 0.35s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {children}
    </Box>
  );
}

export function MonitorPageHeader({
  title,
  subtitle,
  accent = 'default',
  count,
  live,
  onToggleLive,
  onRefresh,
  loading,
  extraActions,
}: {
  title: string;
  subtitle?: string;
  accent?: MonitorAccent;
  count?: string;
  live?: boolean;
  onToggleLive?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  extraActions?: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        mb: 3,
        pb: 2,
        borderBottom: `1px solid ${t.border}`,
        gap: 2,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            bgcolor: a.iconBg,
            flexShrink: 0,
          }}
        >
          {a.emoji}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              fontSize: { xs: '1.15rem', sm: '1.35rem' },
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: t.text,
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {title}
            {count ? (
              <Box
                component="span"
                sx={{
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: 11,
                  color: t.text3,
                  fontWeight: 600,
                  bgcolor: t.bg2,
                  px: 1.25,
                  py: 0.375,
                  borderRadius: '999px',
                  border: `1px solid ${t.border}`,
                }}
              >
                {count}
              </Box>
            ) : null}
          </Typography>
          {subtitle ? (
            <Typography sx={{ fontSize: 12, color: t.text3, fontWeight: 500, mt: 0.25 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
      {onToggleLive != null ? (
        <Button sx={btnGhostSx} onClick={onToggleLive}>
          <Badge variant={live ? 'success' : 'neutral'} dot>
            {live ? 'Live' : 'Pause'}
          </Badge>
        </Button>
      ) : null}
      {onRefresh ? (
        <Button sx={btnGhostSx} onClick={onRefresh} disabled={loading}>
          {loading ? '…' : 'Actualiser'}
        </Button>
      ) : null}
      {extraActions}
      </Stack>
    </Stack>
  );
}

export function MonitorSubTabs<T extends string>({
  options,
  value,
  onChange,
  dense,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  dense?: boolean;
}) {
  return (
    <Box sx={{ mb: dense ? 0 : 2 }}>
      <ViewToggle
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        value={value}
        onChange={(v) => onChange(v as T)}
      />
    </Box>
  );
}

export function MonitorTimeRange({
  ranges,
  value,
  onChange,
  dense,
}: {
  ranges: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  dense?: boolean;
}) {
  if (dense) {
    return (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        {ranges.map((r) => (
          <FilterChip
            key={r.value}
            label={r.label}
            active={value === r.value}
            onClick={() => onChange(r.value)}
          />
        ))}
      </Stack>
    );
  }
  return (
    <FilterBar>
      {ranges.map((r) => (
        <FilterChip
          key={r.value}
          label={r.label}
          active={value === r.value}
          onClick={() => onChange(r.value)}
        />
      ))}
    </FilterBar>
  );
}

/** Barre d’outils compacte : sous-onglets + période + actions sur une ligne. */
export function MonitorToolbarRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        mb: 1.25,
        pb: 1,
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, minWidth: 0 }}>
        {left}
      </Stack>
      {right ? (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {right}
        </Stack>
      ) : null}
    </Stack>
  );
}

/** KPIs horizontaux compacts (peu de hauteur). Cliquables si onClick fourni. */
export function MonitorKpiStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string | number;
    tone?: 'neutral' | 'error' | 'warning' | 'success' | 'info';
    active?: boolean;
    onClick?: () => void;
  }>;
}) {
  const toneMap = {
    neutral: { bg: t.bg2, color: t.text },
    error: { bg: t.errorTint, color: t.error },
    warning: { bg: t.warningTint, color: t.warning },
    success: { bg: t.successTint, color: t.success },
    info: { bg: t.infoTint, color: t.info },
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.75,
        mb: 1.25,
      }}
    >
      {items.map((item) => {
        const c = toneMap[item.tone || 'neutral'];
        const clickable = Boolean(item.onClick);
        return (
          <Box
            key={item.label}
            component={clickable ? 'button' : 'div'}
            type={clickable ? 'button' : undefined}
            onClick={item.onClick}
            sx={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: '8px',
              border: `1px solid ${item.active ? t.primary : t.border}`,
              bgcolor: item.active ? t.primaryTint : c.bg,
              minWidth: 0,
              cursor: clickable ? 'pointer' : 'default',
              font: 'inherit',
              m: 0,
              boxShadow: item.active ? `0 0 0 1px ${t.primary}` : 'none',
              '&:hover': clickable
                ? { borderColor: t.borderStrong, bgcolor: item.active ? t.primaryTint : t.bg2 }
                : undefined,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Geist Mono, monospace',
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: c.color,
                lineHeight: 1.1,
              }}
            >
              {item.value}
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: t.text3, whiteSpace: 'nowrap' }}>
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export function MonitorToolbar({ children }: { children: React.ReactNode }) {
  return <FilterBar>{children}</FilterBar>;
}

export function MonitorSelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Box
      component="label"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        fontSize: 12,
        color: t.text2,
        fontWeight: 500,
      }}
    >
      <Box component="span" sx={{ color: t.text3, fontSize: 11 }}>
        {label}
      </Box>
      <Box
        component="select"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        sx={{
          fontSize: 12,
          fontWeight: 600,
          py: 0.75,
          px: 1.25,
          borderRadius: '7px',
          border: `1px solid ${t.border}`,
          bgcolor: t.bg1,
          color: t.text,
          cursor: 'pointer',
          '&:focus': { outline: `2px solid ${t.primaryTint}`, borderColor: t.primary },
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Box>
    </Box>
  );
}

export function MonitorLoading({ label = 'Chargement…' }: { label?: string }) {
  return (
    <Box
      sx={{
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={40} sx={{ color: t.primary }} />
      <Typography sx={{ fontSize: 13, color: t.text3 }}>{label}</Typography>
    </Box>
  );
}

export function MonitorError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Panel sx={{ mb: 2 }}>
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button size="small" sx={btnGhostSx} onClick={onRetry}>
              Réessayer
            </Button>
          ) : undefined
        }
      >
        {message}
      </Alert>
    </Panel>
  );
}

export function MonitorEmpty({ message }: { message: string }) {
  return (
    <Panel>
      <Typography sx={{ fontSize: 13, color: t.text3, textAlign: 'center', py: 4 }}>
        {message}
      </Typography>
    </Panel>
  );
}

export function MonitorSection({
  title,
  desc,
  children,
  headRight,
  dense,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  headRight?: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <Panel
      title={title}
      desc={desc}
      headRight={headRight}
      sx={{
        mb: dense ? 1.25 : 2.5,
        p: dense ? 1.5 : undefined,
        '& > .MuiStack-root:first-of-type': dense
          ? { mb: 1, pb: 0.75 }
          : undefined,
      }}
    >
      {children}
    </Panel>
  );
}

export function MonitorErrorList({
  items,
  renderTitle,
  renderMeta,
  dense,
}: {
  items: Array<{ _id?: string; severity?: string; timestamp?: string; service?: string; data?: Record<string, unknown> }>;
  renderTitle: (item: (typeof items)[0]) => string;
  renderMeta?: (item: (typeof items)[0]) => React.ReactNode;
  dense?: boolean;
}) {
  if (!items.length) return <MonitorEmpty message="Aucune erreur sur la période." />;
  return (
    <Stack spacing={dense ? 0.5 : 1.25}>
      {items.map((item, idx) => (
        <Box
          key={item._id || idx}
          sx={{
            p: dense ? 1 : 1.75,
            borderRadius: dense ? '8px' : '10px',
            border: `1px solid ${t.border}`,
            bgcolor: severityBadgeVariant(item.severity) === 'error' ? t.errorTint : t.warningTint,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            {!dense ? (
              <Badge variant={severityBadgeVariant(item.severity)} dot>
                {(item.severity || 'info').toUpperCase()}
              </Badge>
            ) : null}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: dense ? 12 : 13,
                  fontWeight: 600,
                  color: t.text,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {renderTitle(item)}
              </Typography>
              {renderMeta ? (
                <Typography
                  component="div"
                  sx={{
                    fontSize: 11,
                    color: t.text3,
                    mt: dense ? 0.25 : 0.5,
                    lineHeight: 1.35,
                  }}
                >
                  {renderMeta(item)}
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
