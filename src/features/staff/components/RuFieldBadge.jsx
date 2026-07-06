import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ruFieldBadgeFr } from '../../../i18n/ruFieldBadge';

const FR = ruFieldBadgeFr;

const BADGE_CFG = {
  ru: {
    labelKey: 'ruFieldBadge.ru',
    labelDefault: FR.ru,
    color: 'success',
    tipKey: 'ruFieldBadge.tooltipRu',
    tipDefault: FR.tooltipRu,
    legendKey: 'ruFieldBadge.legendRu',
    legendDefault: FR.legendRu,
  },
  nonRu: {
    labelKey: 'ruFieldBadge.nonRu',
    labelDefault: FR.nonRu,
    color: 'default',
    tipKey: 'ruFieldBadge.tooltipNonRu',
    tipDefault: FR.tooltipNonRu,
    legendKey: 'ruFieldBadge.legendNonRu',
    legendDefault: FR.legendNonRu,
  },
  sojoriLogin: {
    labelKey: 'ruFieldBadge.sojoriLogin',
    labelDefault: FR.sojoriLogin,
    color: 'primary',
    tipKey: 'ruFieldBadge.tooltipSojoriLogin',
    tipDefault: FR.tooltipSojoriLogin,
    legendKey: 'ruFieldBadge.legendSojoriLogin',
    legendDefault: FR.legendSojoriLogin,
  },
  ruCreateUser: {
    labelKey: 'ruFieldBadge.ruCreateUser',
    labelDefault: FR.ruCreateUser,
    color: 'success',
    tipKey: 'ruFieldBadge.tooltipRuCreateUser',
    tipDefault: FR.tooltipRuCreateUser,
    legendKey: 'ruFieldBadge.legendRuCreateUser',
    legendDefault: FR.legendRuCreateUser,
  },
  new: {
    labelKey: 'ruFieldBadge.new',
    labelDefault: FR.new,
    color: 'warning',
    tipKey: 'ruFieldBadge.tooltipNew',
    tipDefault: FR.tooltipNew,
    legendKey: 'ruFieldBadge.legendNew',
    legendDefault: FR.legendNew,
  },
  ruMirror: {
    labelKey: 'ruFieldBadge.ruMirror',
    labelDefault: FR.ruMirror,
    color: 'success',
    tipKey: 'ruFieldBadge.tooltipRuMirror',
    tipDefault: FR.tooltipRuMirror,
    legendKey: 'ruFieldBadge.legendRuMirror',
    legendDefault: FR.legendRuMirror,
  },
  ruStoredNotPushed: {
    labelKey: 'ruFieldBadge.storedOnly',
    labelDefault: FR.storedOnly,
    color: 'info',
    tipKey: 'ruFieldBadge.tooltipStoredOnly',
    tipDefault: FR.tooltipStoredOnly,
    legendKey: 'ruFieldBadge.legendStoredOnly',
    legendDefault: FR.legendStoredOnly,
  },
};

const LEGEND_ORDER = ['sojoriLogin', 'ruCreateUser', 'ruMirror', 'ru', 'nonRu', 'ruStoredNotPushed', 'new'];

function badgeLabel(t, cfg) {
  return t(cfg.labelKey, { defaultValue: cfg.labelDefault });
}

function badgeTip(t, cfg, ruXmlPath) {
  const base = t(cfg.tipKey, { defaultValue: cfg.tipDefault });
  return ruXmlPath ? `${base} — ${ruXmlPath}` : base;
}

/**
 * ru / sojoriLogin / ruCreateUser / ruMirror / nonRu / new / ruStoredNotPushed
 */
export default function RuFieldBadge({ kind = 'ru', ruXmlPath }) {
  const { t } = useTranslation('common');
  const cfg = BADGE_CFG[kind] || BADGE_CFG.ru;
  return (
    <Tooltip title={badgeTip(t, cfg, ruXmlPath)}>
      <Chip
        label={badgeLabel(t, cfg)}
        size="small"
        color={cfg.color}
        variant={kind === 'nonRu' ? 'outlined' : 'filled'}
        sx={{
          height: 20,
          fontSize: '0.65rem',
          fontWeight: 700,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Tooltip>
  );
}

export function FieldLabelWithRuBadge({ children, kind, ruXmlPath, required = false, plain = false }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
      <Typography variant="subtitle2" fontWeight={600}>
        {children}
        {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
      </Typography>
      {!plain && kind ? <RuFieldBadge kind={kind} ruXmlPath={ruXmlPath} /> : null}
    </Box>
  );
}

function RuFieldBadgeLegendBody({ native = false }) {
  const { t } = useTranslation('common');

  const title = t('ruFieldBadge.formLegend', { defaultValue: FR.formLegend });
  const subtitle = t('ruFieldBadge.formLegendSub', { defaultValue: FR.formLegendSub });

  const items = LEGEND_ORDER.map((kind) => {
    const cfg = BADGE_CFG[kind];
    return {
      kind,
      text: t(cfg.legendKey, { defaultValue: cfg.legendDefault }),
    };
  });

  if (native) {
    return (
      <div className="owner-ru-badge-legend">
        <p className="owner-ru-badge-legend-title">{title}</p>
        <p className="owner-ru-badge-legend-sub">{subtitle}</p>
        <ul className="owner-ru-badge-legend-list">
          {items.map(({ kind, text }) => (
            <li key={kind}>
              <RuFieldBadge kind={kind} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <AlertLikeBox>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        {subtitle}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
        {items.map(({ kind, text }) => (
          <Box
            component="li"
            key={kind}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              mb: 0.75,
              '&:last-child': { mb: 0 },
            }}
          >
            <Box sx={{ flexShrink: 0, pt: 0.15 }}>
              <RuFieldBadge kind={kind} />
            </Box>
            <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
              {text}
            </Typography>
          </Box>
        ))}
      </Box>
    </AlertLikeBox>
  );
}

export function RuFieldBadgeLegend({ sx }) {
  return (
    <Box sx={sx}>
      <RuFieldBadgeLegendBody />
    </Box>
  );
}

export function RuFieldBadgeLegendNative() {
  return <RuFieldBadgeLegendBody native />;
}

function AlertLikeBox({ children, sx }) {
  return (
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 1,
        bgcolor: 'info.50',
        border: '1px solid',
        borderColor: 'info.200',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function CompteFieldLabel({ children, kind, ruXmlPath, required = false, plain = false }) {
  return (
    <div className="owner-compte-field-label">
      <span className="owner-compte-field-label-text">
        {children}
        {required ? <span className="req">*</span> : null}
      </span>
      {!plain && kind ? <RuFieldBadge kind={kind} ruXmlPath={ruXmlPath} /> : null}
    </div>
  );
}

export function MirrorFieldRow({ label, value, kind = 'ruMirror', ruXmlPath, plain = false }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', py: 0.25 }}>
      <Typography variant="body2" component="span">
        {label} :
      </Typography>
      {!plain ? <RuFieldBadge kind={kind} ruXmlPath={ruXmlPath} /> : null}
      <Typography variant="body2" component="strong" fontWeight={700}>
        {value || '—'}
      </Typography>
    </Box>
  );
}
