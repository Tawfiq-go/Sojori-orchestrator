import { Box } from '@mui/material';
import { T } from './_tokens';

export function FilterChip({
  label,
  count,
  active,
  urgent,
  compact,
  emoji,
  countInline,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  urgent?: boolean;
  compact?: boolean;
  emoji?: string;
  countInline?: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'center' : 'space-between',
        flexDirection: compact && !countInline ? 'column' : 'row',
        gap: compact ? 0.25 : 0.5,
        px: compact ? '3px' : '10px',
        py: compact ? '5px' : '7px',
        border: `1px solid ${active ? T.primary : T.border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: compact ? 9 : 11,
        fontWeight: active ? 700 : 600,
        color: active ? T.primaryDeep : urgent ? T.error : T.text2,
        bgcolor: active ? T.primaryTint : T.bg1,
        transition: 'all 0.15s',
        minWidth: 0,
        '&:hover': { bgcolor: active ? T.primaryTint : T.bg3 },
      }}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          lineHeight: 1.15,
        }}
      >
        {countInline && count != null && (
          <InlineCount value={count} active={active} urgent={urgent && !active} />
        )}
        {emoji ? `${emoji} ` : ''}
        {label}
      </span>
      {count != null && !countInline && (
        <CountPill value={count} active={active} urgent={urgent && !active} compact={compact} />
      )}
    </Box>
  );
}

function InlineCount({
  value,
  active,
  urgent,
}: {
  value: number;
  active?: boolean;
  urgent?: boolean;
}) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: 7,
        fontWeight: 800,
        minWidth: 8,
        color: active ? T.primaryDeep : urgent ? T.error : value > 0 ? T.text3 : T.text4,
        opacity: value > 0 ? 1 : 0.45,
        flexShrink: 0,
      }}
    >
      {value}
    </Box>
  );
}

export function CountPill({
  value,
  active,
  urgent,
  compact,
}: {
  value: number;
  active?: boolean;
  urgent?: boolean;
  compact?: boolean;
}) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: compact ? 8 : 9,
        fontWeight: 700,
        minWidth: compact ? 14 : 18,
        textAlign: 'center',
        px: 0.5,
        py: '1px',
        borderRadius: 999,
        bgcolor: active ? T.primary : urgent ? T.errorTint : T.bg3,
        color: active ? '#fff' : urgent ? T.error : T.text4,
        lineHeight: 1.2,
      }}
    >
      {value}
    </Box>
  );
}
