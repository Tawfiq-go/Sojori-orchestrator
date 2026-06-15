import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Collapse, IconButton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from '../../listing/components/ConfigOrchestration/types';

interface Props {
  /** id stable pour drag & drop (@dnd-kit) */
  sortableId: string;
  emoji: string;
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
  hideDelete?: boolean;
  headerExtra?: ReactNode;
  children?: ReactNode;
  sortable?: boolean;
}

/**
 * Carte config repliable — poignée ⠿ à gauche (drag), comme Support listing.
 * Pas de flèches : déplacer le bloc en glissant.
 */
export default function OrchConfigListCard({
  sortableId,
  emoji,
  title,
  subtitle,
  expanded,
  onToggleExpand,
  onDelete,
  hideDelete = false,
  headerExtra,
  children,
  sortable = true,
}: Props) {
  const sortableHook = useSortable({ id: sortableId, disabled: !sortable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable
    ? sortableHook
    : {
        attributes: {},
        listeners: {},
        setNodeRef: undefined,
        transform: null,
        transition: undefined,
        isDragging: false,
      };

  const style = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
      }
    : undefined;

  return (
    <Box
      ref={sortable ? setNodeRef : undefined}
      style={style}
      sx={{
        border: `1px solid ${expanded ? T.primary : T.border}`,
        borderRadius: 1.25,
        bgcolor: '#fff',
        overflow: 'hidden',
        boxShadow: expanded ? '0 2px 8px rgba(184,133,26,0.08)' : '0 1px 2px rgba(20,17,10,0.04)',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1,
          p: '10px 12px',
          bgcolor: expanded ? T.primaryTint : T.bg1,
        }}
      >
        {sortable ? (
          <Box
            {...attributes}
            {...listeners}
            sx={{
              color: T.text3,
              cursor: 'grab',
              fontSize: 16,
              flexShrink: 0,
              userSelect: 'none',
              lineHeight: 1,
              px: 0.25,
              '&:active': { cursor: 'grabbing' },
            }}
            title="Glisser pour réordonner"
          >
            ⠿
          </Box>
        ) : (
          <Box sx={{ width: 20, flexShrink: 0 }} />
        )}

        <Box sx={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{emoji}</Box>

        <Box
          sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={onToggleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>
            {title}
          </Typography>
          <Typography
            className="orch-config-card-subtitle"
            sx={{
              fontSize: 11,
              color: T.text3,
              fontFamily: CONFIG_ORCH_FONT.mono,
              mt: 0.35,
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        {headerExtra ? (
          <Box sx={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {headerExtra}
          </Box>
        ) : null}

        {!hideDelete && onDelete ? (
        <IconButton
          size="small"
          onClick={onDelete}
          aria-label="Supprimer"
          sx={{
            width: 28,
            height: 28,
            color: T.text3,
            fontSize: 14,
            flexShrink: 0,
            '&:hover': { bgcolor: T.errorTint, color: T.error },
          }}
        >
          ✕
        </IconButton>
        ) : null}
      </Stack>

      <Collapse in={expanded}>
        <Box
          sx={{
            p: '14px 16px',
            borderTop: `1px solid ${T.border}`,
            bgcolor: T.bg2,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
