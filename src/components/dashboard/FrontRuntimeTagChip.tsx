import { Chip } from '@mui/material';
import type { FrontRuntimeTag } from '../../utils/appBuildInfo';

type Props = {
  tag: FrontRuntimeTag;
  size?: 'small' | 'medium';
};

/** Badge LOCAL / VERCEL / PREVIEW pour la session admin. */
export function FrontRuntimeTagChip({ tag, size = 'small' }: Props) {
  return (
    <Chip
      size={size}
      label={tag.shortLabel}
      title={tag.label}
      sx={{
        height: size === 'medium' ? 26 : 22,
        fontFamily: 'Geist Mono, monospace',
        fontSize: size === 'medium' ? 11.5 : 10.5,
        fontWeight: 800,
        letterSpacing: '0.06em',
        color: tag.color,
        bgcolor: tag.bg,
        border: `1px solid ${tag.border}`,
        borderRadius: '6px',
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}
