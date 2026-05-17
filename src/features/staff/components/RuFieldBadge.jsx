import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const BADGE_CFG = {
  ru: { labelKey: 'ruFieldBadge.ru', color: 'success', tipKey: 'ruFieldBadge.tooltipRu' },
  nonRu: { labelKey: 'ruFieldBadge.nonRu', color: 'default', tipKey: 'ruFieldBadge.tooltipNonRu' },
  new: { labelKey: 'ruFieldBadge.new', color: 'warning', tipKey: 'ruFieldBadge.tooltipNew' },
  ruMirror: { labelKey: 'ruFieldBadge.ruMirror', color: 'success', tipKey: 'ruFieldBadge.tooltipRuMirror' },
  ruStoredNotPushed: {
    labelKey: 'ruFieldBadge.storedOnly',
    color: 'info',
    tipKey: 'ruFieldBadge.tooltipStoredOnly',
  },
};

/**
 * RU = inclus dans le corps Push_FillCompanyDetails vers RU (ou recopié depuis le compte).
 * Non RU = Sojori uniquement (pas ce nœud XML).
 * new = champ présent côté mapping RU / spec, ajouté au formulaire.
 * ruMirror = compte Sojori recopié dans ContactInfo à l’envoi RU.
 * ruStoredNotPushed = stocké FillCompany mais retiré avant push RU.
 */
export default function RuFieldBadge({ kind = 'ru', ruXmlPath }) {
  const { t } = useTranslation('common');
  const cfg = BADGE_CFG[kind] || BADGE_CFG.ru;
  const tip = ruXmlPath ? `${t(cfg.tipKey)} (${ruXmlPath})` : t(cfg.tipKey);
  return (
    <Tooltip title={tip}>
      <Chip
        label={t(cfg.labelKey)}
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

export function FieldLabelWithRuBadge({ children, kind, ruXmlPath, required = false }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
      <Typography variant="subtitle2" fontWeight={600}>
        {children}
        {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
      </Typography>
      {kind ? <RuFieldBadge kind={kind} ruXmlPath={ruXmlPath} /> : null}
    </Box>
  );
}
