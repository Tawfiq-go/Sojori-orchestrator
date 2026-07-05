import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { V3, V3_TOGGLE } from './theme';

type ToggleKind = keyof typeof V3_TOGGLE;

const KIND_TINT: Record<
  ToggleKind,
  { bg: string; color: string; border: string; grad: string; glow: string }
> = {
  manage: {
    bg: V3.pt,
    color: V3.pd,
    border: V3.pt2,
    grad: V3_TOGGLE.manage.grad,
    glow: '0 0 0 3px rgba(184,133,26,0.22)',
  },
  client: {
    bg: V3.clientT,
    color: V3.client,
    border: 'rgba(6,115,179,0.28)',
    grad: V3_TOGGLE.client.grad,
    glow: '0 0 0 3px rgba(6,115,179,0.18)',
  },
  orch: {
    bg: V3.orchT,
    color: V3.orch,
    border: 'rgba(124,58,237,0.28)',
    grad: V3_TOGGLE.orch.grad,
    glow: '0 0 0 3px rgba(124,58,237,0.18)',
  },
  task: {
    bg: V3.taskT,
    color: V3.task,
    border: 'rgba(8,145,178,0.28)',
    grad: V3_TOGGLE.task.grad,
    glow: '0 0 0 3px rgba(8,145,178,0.18)',
  },
};

export function V3Toggle({
  kind,
  checked,
  disabled,
  onChange,
}: {
  kind: ToggleKind;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  const tint = KIND_TINT[kind];
  return (
    <Box
      component="div"
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={e => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      onClick={e => {
        if (disabled) return;
        e.stopPropagation();
        onChange(!checked);
      }}
      sx={{
        width: 40,
        height: 22,
        borderRadius: '99px',
        bgcolor: checked ? tint.grad : '#d8d4cb',
        border: checked ? `1px solid ${tint.border}` : '1px solid rgba(20,17,10,0.12)',
        p: 0,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all .2s',
        flexShrink: 0,
        boxShadow: checked ? tint.glow : 'none',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 2,
          left: 2,
          width: 16,
          height: 16,
          bgcolor: '#fff',
          borderRadius: '50%',
          boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
          transform: checked ? 'translateX(18px)' : 'none',
          transition: 'transform .2s',
        },
      }}
    />
  );
}

/** Pill décision : zone gauche = voir le contenu · zone droite = toggle ON/OFF uniquement. */
export function V3DecisionPill({
  icon,
  label,
  hint,
  kind,
  enabled,
  selected,
  locked,
  hideToggle,
  onSelect,
  onEnabledChange,
}: {
  icon: string;
  label: string;
  hint?: string;
  kind: ToggleKind;
  enabled: boolean;
  selected: boolean;
  locked?: boolean;
  /** Pas de switch ON/OFF (ex. menu_navigation · Client choisit) */
  hideToggle?: boolean;
  onSelect: () => void;
  onEnabledChange: (v: boolean) => void;
}) {
  const sxSelected = {
    background: `linear-gradient(135deg, ${V3.ps} 0%, ${V3.p} 55%, ${V3.pd} 100%)`,
    border: `2px solid ${V3.pd}`,
    color: '#1a1408',
    boxShadow: '0 4px 14px rgba(184,133,26,0.38), inset 0 1px 0 rgba(255,255,255,0.35)',
  };

  const sxEnabled = {
    bgcolor: V3.pt,
    border: `2px solid ${V3.p}`,
    color: V3.pd,
    boxShadow: '0 0 0 2px rgba(184,133,26,0.12)',
  };

  const sxOff = {
    bgcolor: '#fff',
    border: `1px solid ${V3.b}`,
    color: V3.t4,
    boxShadow: 'none',
  };

  const visual = selected ? sxSelected : enabled ? sxEnabled : sxOff;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '11px',
        overflow: 'hidden',
        opacity: locked ? 0.42 : 1,
        transition: 'all .18s ease',
        ...visual,
      }}
    >
      <Box
        component="button"
        type="button"
        disabled={locked}
        onClick={onSelect}
        title="Afficher le contenu"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.5,
          p: '8px 10px',
          border: 0,
          bgcolor: 'transparent',
          cursor: locked ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          color: 'inherit',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: 15, lineHeight: 1 }}>{icon}</Typography>
          <Typography
            sx={{
              flex: 1,
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              color: 'inherit',
            }}
          >
            {label}
          </Typography>
        </Box>
        {hint && (
          <Typography
            sx={{
              fontSize: 9,
              fontWeight: selected ? 700 : 500,
              color: selected ? 'rgba(26,20,8,0.72)' : enabled ? V3.t3 : V3.t4,
              lineHeight: 1.2,
              pl: '22px',
            }}
          >
            {enabled ? hint : 'OFF — activer avec le switch →'}
          </Typography>
        )}
      </Box>

      {!hideToggle ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.35,
            px: 1,
            py: 0.75,
            borderLeft: `1px solid ${selected ? 'rgba(26,20,8,0.12)' : enabled ? V3.pt2 : V3.b}`,
            bgcolor: selected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 8, fontWeight: 800, color: V3.t4, letterSpacing: '0.06em', lineHeight: 1 }}>
            {enabled ? 'ON' : 'OFF'}
          </Typography>
          <V3Toggle kind={kind} checked={enabled} disabled={locked} onChange={onEnabledChange} />
        </Box>
      ) : null}
    </Box>
  );
}

/** Section unique : toggle ON/OFF + replier/déplier le contenu (plus de doublon header). */
export function V3Section({
  icon,
  kind,
  title,
  subtitle,
  enabled,
  onEnabledChange,
  open,
  onOpenChange,
  locked,
  badge,
  children,
}: {
  icon: string;
  kind: ToggleKind;
  title: ReactNode;
  subtitle?: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locked?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const tint = KIND_TINT[kind];
  const active = enabled && !locked;

  return (
    <Box
      sx={{
        mb: 1.25,
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid ${active ? tint.border : V3.b}`,
        bgcolor: active ? '#fff' : V3.alt,
        boxShadow: active ? '0 2px 8px rgba(20,17,10,0.05)' : 'none',
        opacity: locked ? 0.48 : 1,
        transition: 'border-color .2s, box-shadow .2s',
      }}
    >
      <Box
        component="button"
        type="button"
        disabled={locked}
        onClick={() => {
          if (!active) return;
          onOpenChange(!open);
        }}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 1.125,
          p: '10px 12px',
          border: 0,
          bgcolor: active ? `linear-gradient(135deg,${tint.bg},transparent 70%)` : 'transparent',
          cursor: locked ? 'not-allowed' : active ? 'pointer' : 'default',
          textAlign: 'left',
          borderBottom: active && open ? `1px solid ${V3.b}` : 0,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '8px',
            bgcolor: active ? tint.bg : 'rgba(20,17,10,0.05)',
            color: active ? tint.color : V3.t4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            flexShrink: 0,
            border: active ? `1px solid ${tint.border}` : `1px solid ${V3.b}`,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: active ? V3.t : V3.t3,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              lineHeight: 1.2,
            }}
          >
            {title}
            {badge}
          </Typography>
          {subtitle ? (
            <Typography sx={{ fontSize: 10.5, color: V3.t4, mt: 0.2, lineHeight: 1.35 }} noWrap>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Typography
          sx={{
            fontSize: 9,
            fontWeight: 800,
            fontFamily: 'monospace',
            color: active ? tint.color : V3.t4,
            letterSpacing: '0.06em',
            flexShrink: 0,
            mr: 0.5,
          }}
        >
          {active ? 'ON' : 'OFF'}
        </Typography>
        <V3Toggle kind={kind} checked={enabled} disabled={locked} onChange={onEnabledChange} />
        <Typography
          sx={{
            color: V3.t4,
            fontSize: 10,
            transform: open && active ? 'rotate(90deg)' : 'none',
            transition: 'transform .2s',
            flexShrink: 0,
            opacity: active ? 1 : 0.35,
          }}
        >
          ▶
        </Typography>
      </Box>
      {active && open && <Box sx={{ p: 1.5 }}>{children}</Box>}
    </Box>
  );
}

export function V3PillButton({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        px: 1.125,
        py: 0.5,
        borderRadius: '8px',
        fontSize: 11.5,
        fontWeight: 700,
        fontFamily: 'inherit',
        opacity: disabled ? 0.45 : 1,
        ...(active
          ? {
              bgcolor: V3.pt,
              color: V3.pd,
              border: `1px solid ${V3.p}`,
              boxShadow: '0 0 0 2px rgba(184,133,26,0.15)',
            }
          : {
              bgcolor: '#fff',
              color: V3.t3,
              border: `1px solid ${V3.b}`,
            }),
      }}
    >
      {children}
    </Box>
  );
}

export function V3SubTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.25 }}>
      {tabs.map(t => (
        <V3PillButton key={t.id} active={active === t.id} onClick={() => onChange(t.id)}>
          {t.label}
        </V3PillButton>
      ))}
    </Box>
  );
}

export function V3Accordion({
  icon,
  iconTint,
  title,
  subtitle,
  badge,
  open,
  gated,
  onToggle,
  children,
}: {
  icon: string;
  iconTint: { bg: string; color: string };
  title: ReactNode;
  subtitle: string;
  badge?: ReactNode;
  open: boolean;
  gated?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <V3Section
      icon={icon}
      kind="manage"
      title={title}
      subtitle={subtitle}
      enabled={!gated}
      onEnabledChange={() => onToggle()}
      open={open}
      onOpenChange={onToggle}
      locked={gated}
      badge={badge}
    >
      {children}
    </V3Section>
  );
}

export function V3Badge({
  children,
  tone = 'ok',
}: {
  children: ReactNode;
  tone?: 'ok' | 'owner' | 'todo';
}) {
  const map = {
    ok: { bg: V3.suT, color: V3.su },
    owner: { bg: V3.clientT, color: V3.client },
    todo: { bg: V3.warnT, color: V3.warn },
  };
  const s = map[tone];
  return (
    <Box
      component="span"
      sx={{
        fontFamily: '"Geist Mono", ui-monospace, monospace',
        fontSize: 8.5,
        fontWeight: 800,
        px: 0.875,
        py: '1px',
        borderRadius: '99px',
        bgcolor: s.bg,
        color: s.color,
        letterSpacing: '0.03em',
      }}
    >
      {children}
    </Box>
  );
}

export function V3ExecBanner({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 10.5,
        color: V3.t3,
        bgcolor: V3.alt,
        borderRadius: '8px',
        px: 1.25,
        py: 0.75,
        mb: 1,
        lineHeight: 1.45,
        display: 'flex',
        gap: 0.75,
        alignItems: 'flex-start',
      }}
    >
      <span>{icon}</span>
      <span>{children}</span>
    </Typography>
  );
}

export function V3FormRow({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t2, mb: help ? 0.25 : 0.5 }}>{label}</Typography>
      {help ? (
        <Typography sx={{ fontSize: 10, color: V3.t4, mb: 0.75, lineHeight: 1.35 }}>{help}</Typography>
      ) : null}
      {children}
    </Box>
  );
}
