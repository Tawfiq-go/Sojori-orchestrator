import { Box, Button, Typography } from '@mui/material';
import {
  createEmptyRoomType,
  multiTokens as t,
  type MultiRoomTypeDraft,
} from './multiTypes';
import { RoomTypeEditor } from './RoomTypeEditor';

type Props = {
  roomTypes: MultiRoomTypeDraft[];
  editingKey: string | null;
  onEditingKey: (key: string | null) => void;
  onChange: (roomTypes: MultiRoomTypeDraft[]) => void;
  uploadingKey?: string | null;
  onPickFiles?: (roomKey: string, files: FileList) => void;
};

export function RoomTypeCards({
  roomTypes,
  editingKey,
  onEditingKey,
  onChange,
  uploadingKey,
  onPickFiles,
}: Props) {
  const units = roomTypes.reduce((s, r) => s + (Number(r.roomNumber) || 0), 0);

  const updateOne = (key: string, next: MultiRoomTypeDraft) => {
    onChange(roomTypes.map((rt) => (rt._key === key ? next : rt)));
  };

  const duplicate = (key: string) => {
    const src = roomTypes.find((r) => r._key === key);
    if (!src) return;
    const copy = createEmptyRoomType({
      roomTypeName: `${src.roomTypeName} (copie)`,
      roomNumber: src.roomNumber,
      personCapacity: src.personCapacity,
      personCapacityMax: src.personCapacityMax,
      bedsNumber: src.bedsNumber,
      bedroomsNumber: src.bedroomsNumber,
      bathroomsNumber: src.bathroomsNumber,
      basePrice: src.basePrice,
      surface: src.surface,
      roomTypeImages: [...(src.roomTypeImages || [])],
      amenitiesIds: [...(src.amenitiesIds || [])],
      bedsLabel: src.bedsLabel,
      amenityLabels: [...(src.amenityLabels || [])],
    });
    const idx = roomTypes.findIndex((r) => r._key === key);
    const next = [...roomTypes];
    next.splice(idx + 1, 0, copy);
    onChange(next);
    onEditingKey(copy._key);
  };

  const remove = (key: string) => {
    if (roomTypes.length <= 1) {
      window.alert('Une structure Multi doit garder au moins un type de chambre.');
      return;
    }
    const rt = roomTypes.find((r) => r._key === key);
    if (!rt) return;
    if (
      !window.confirm(`Supprimer le type « ${rt.roomTypeName} » (${rt.roomNumber} unités) ?`)
    ) {
      return;
    }
    onChange(roomTypes.filter((r) => r._key !== key));
    if (editingKey === key) onEditingKey(null);
  };

  const editing = roomTypes.find((r) => r._key === editingKey) || null;

  return (
    <Box
      sx={{
        background: t.bg1,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.25,
          py: 1.75,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '8px',
            background: t.primaryTint,
            color: t.primaryDeep,
            fontFamily: t.mono,
            fontWeight: 800,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          R
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>Types de chambres</Typography>
          <Typography sx={{ fontSize: 11.5, color: t.text3 }}>
            {roomTypes.length} type{roomTypes.length > 1 ? 's' : ''} · {units} unités au total
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2.25 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: 1.5,
          }}
        >
          {roomTypes.map((rt) => {
            const cover = rt.roomTypeImages?.[0]?.url;
            const active = editingKey === rt._key;
            return (
              <Box
                key={rt._key}
                sx={{
                  border: `1.5px solid ${active ? t.primary : t.border}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: t.bg1,
                  boxShadow: active ? `0 0 0 3px ${t.primaryTint}` : 'none',
                  transition: '0.14s',
                  '&:hover': {
                    borderColor: t.borderStrong,
                    boxShadow: '0 6px 18px -10px rgba(20,17,10,0.2)',
                  },
                }}
              >
                <Box
                  onClick={() => onEditingKey(rt._key)}
                  sx={{
                    height: 104,
                    position: 'relative',
                    cursor: 'pointer',
                    background: cover
                      ? `center/cover url(${cover})`
                      : `linear-gradient(135deg, ${t.bg3}, #d8d0c0)`,
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: t.primary,
                      color: '#3a2c08',
                      borderRadius: '8px',
                      px: 1.1,
                      py: 0.45,
                      fontWeight: 800,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                      boxShadow: '0 2px 6px rgba(184,133,26,0.4)',
                    }}
                  >
                    {rt.roomNumber}
                    <Box component="span" sx={{ fontSize: 9, fontWeight: 700, opacity: 0.75, fontFamily: t.mono }}>
                      unités
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 7,
                      right: 7,
                      fontFamily: t.mono,
                      fontSize: 9.5,
                      fontWeight: 700,
                      background: 'rgba(20,17,10,0.62)',
                      color: '#fff',
                      px: 0.9,
                      py: 0.25,
                      borderRadius: '6px',
                    }}
                  >
                    {rt.roomTypeImages.length} photo{rt.roomTypeImages.length > 1 ? 's' : ''}
                  </Box>
                </Box>
                <Box sx={{ px: 1.5, py: 1.3 }} onClick={() => onEditingKey(rt._key)}>
                  <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{rt.roomTypeName}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.4, fontSize: 11, color: t.text3 }}>
                    <span>👤 {rt.personCapacity} pers.</span>
                    <span>🛏 {rt.bedsLabel || `${rt.bedsNumber} lit(s)`}</span>
                  </Box>
                  <Typography sx={{ mt: 1, fontWeight: 800, fontSize: 13, color: t.primaryDeep }}>
                    {Number(rt.basePrice || 0).toLocaleString('fr-FR')} MAD{' '}
                    <Box component="small" sx={{ fontWeight: 600, color: t.text3, fontSize: 10.5 }}>
                      / nuit
                    </Box>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', borderTop: `1px solid ${t.border}` }}>
                  <Button
                    onClick={() => onEditingKey(rt._key)}
                    sx={{ flex: 1, py: 1, fontSize: 11, fontWeight: 600, color: t.text3, textTransform: 'none' }}
                  >
                    ✎ Éditer
                  </Button>
                  <Button
                    onClick={() => duplicate(rt._key)}
                    sx={{
                      flex: 1,
                      py: 1,
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.text3,
                      textTransform: 'none',
                      borderLeft: `1px solid ${t.border}`,
                    }}
                  >
                    ⧉ Dupliquer
                  </Button>
                  <Button
                    onClick={() => remove(rt._key)}
                    sx={{
                      flex: 0.6,
                      py: 1,
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.text3,
                      textTransform: 'none',
                      borderLeft: `1px solid ${t.border}`,
                      '&:hover': { color: t.error, background: t.errorTint },
                    }}
                  >
                    🗑
                  </Button>
                </Box>
              </Box>
            );
          })}

          <Box
            onClick={() => {
              const rt = createEmptyRoomType();
              onChange([...roomTypes, rt]);
              onEditingKey(rt._key);
            }}
            sx={{
              border: `1.5px dashed ${t.borderStrong}`,
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.9,
              color: t.text3,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: 180,
              '&:hover': {
                borderColor: t.primary,
                color: t.primaryDeep,
                background: t.primaryTint,
              },
            }}
          >
            <Box sx={{ fontSize: 28, lineHeight: 1 }}>+</Box>
            Ajouter un type de chambre
          </Box>
        </Box>

        {editing && (
          <RoomTypeEditor
            roomType={editing}
            onChange={(next) => updateOne(editing._key, next)}
            onClose={() => onEditingKey(null)}
            uploading={uploadingKey === editing._key}
            onPickFiles={
              onPickFiles ? (files) => onPickFiles(editing._key, files) : undefined
            }
          />
        )}
      </Box>
    </Box>
  );
}
