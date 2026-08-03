/** Ligne checklist ménage — FR + EN + AR */
import React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SOJORI_TOKENS as T } from './types';
import { TextInput, PillButton } from './SHARED';
import type { CleaningChecklistItem } from './cleaningSojoriConfigTypes';

type Props = {
  item: CleaningChecklistItem;
  onUpdate: (patch: Partial<CleaningChecklistItem>) => void;
  onDelete: () => void;
};

export default function CleaningChecklistSortableRow({ item, onUpdate, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      sx={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto 32px',
        gap: 1,
        alignItems: 'start',
        p: 1,
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 1,
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          color: T.text3,
          fontSize: 14,
          textAlign: 'center',
          userSelect: 'none',
          pt: 1,
        }}
      >
        ⠿
      </Box>
      <Stack spacing={0.75}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 0.75, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text3 }}>FR</Typography>
          <TextInput
            value={item.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Libellé français…"
            style={{ padding: '8px 10px', fontSize: 12.5 }}
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 0.75, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text3 }}>EN</Typography>
          <TextInput
            value={item.labelEn || ''}
            onChange={(e) => onUpdate({ labelEn: e.target.value })}
            placeholder="English label…"
            style={{ padding: '8px 10px', fontSize: 12.5 }}
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 0.75, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text3 }}>AR</Typography>
          <TextInput
            value={item.labelAr || ''}
            onChange={(e) => onUpdate({ labelAr: e.target.value })}
            placeholder="الترجمة العربية…"
            dir="rtl"
            style={{ padding: '8px 10px', fontSize: 12.5 }}
          />
        </Box>
      </Stack>
      <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center', flexWrap: 'wrap', pt: 0.5 }}>
        <PillButton
          compact
          active={item.required}
          onClick={() => onUpdate({ required: true, photoRequired: item.photoRequired })}
        >
          REQUIS
        </PillButton>
        <PillButton
          compact
          active={!item.required}
          onClick={() => onUpdate({ required: false, photoRequired: false })}
        >
          OPT
        </PillButton>
        {item.required && (
          <PillButton
            compact
            active={item.photoRequired}
            onClick={() => onUpdate({ photoRequired: !item.photoRequired })}
          >
            PHOTO
          </PillButton>
        )}
      </Stack>
      <IconButton size="small" onClick={onDelete} sx={{ color: T.error, p: 0.25, mt: 0.5 }} aria-label="Supprimer">
        ✕
      </IconButton>
    </Box>
  );
}
