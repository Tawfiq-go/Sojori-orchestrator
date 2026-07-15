import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StockStepper } from './StockStepper';
import { PhotoZone } from './PhotoZone';
import {
  DEFAULT_AMENITY_LABELS,
  multiTokens as t,
  type MultiRoomTypeDraft,
} from './multiTypes';

type Props = {
  roomType: MultiRoomTypeDraft;
  onChange: (next: MultiRoomTypeDraft) => void;
  onClose: () => void;
  uploading?: boolean;
  onPickFiles?: (files: FileList) => void;
};

export function RoomTypeEditor({ roomType, onChange, onClose, uploading, onPickFiles }: Props) {
  const labels = roomType.amenityLabels || [];
  const patch = (partial: Partial<MultiRoomTypeDraft>) => onChange({ ...roomType, ...partial });

  return (
    <Box
      sx={{
        mt: 2,
        border: `1.5px solid ${t.primary}`,
        borderRadius: t.radius,
        overflow: 'hidden',
        boxShadow: `0 0 0 3px ${t.primaryTint}`,
        animation: 'fadeUp .2s ease',
        '@keyframes fadeUp': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'none' },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${t.border}`,
          background: t.bg1,
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
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
        <Typography sx={{ fontWeight: 800, fontSize: 14, flex: 1 }}>
          Éditer · {roomType.roomTypeName}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="fermer">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, background: t.bg1 }}>
        {/* STOCK HERO */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            background: `linear-gradient(135deg, ${t.primaryTint}, ${t.bg2})`,
            border: `1px solid rgba(230,176,34,0.35)`,
            borderRadius: '12px',
            p: 2,
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13.5, mb: 0.5 }}>
              Nombre d&apos;unités de ce type
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.text3, lineHeight: 1.45 }}>
              Combien de chambres <b>identiques</b> de ce type possédez-vous ? C&apos;est votre{' '}
              <b>stock réservable</b> pour chaque nuit.
            </Typography>
          </Box>
          <StockStepper
            value={roomType.roomNumber}
            onChange={(roomNumber) => patch({ roomNumber })}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <TextField
            label="Nom du type *"
            size="small"
            value={roomType.roomTypeName}
            onChange={(e) => patch({ roomTypeName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Capacité (pers.)"
            type="number"
            size="small"
            value={roomType.personCapacity}
            onChange={(e) => {
              const personCapacity = Math.max(1, Number(e.target.value) || 1);
              patch({ personCapacity, personCapacityMax: personCapacity });
            }}
            fullWidth
          />
          <TextField
            label="Prix / nuit (MAD)"
            type="number"
            size="small"
            value={roomType.basePrice}
            onChange={(e) => patch({ basePrice: Math.max(0, Number(e.target.value) || 0) })}
            fullWidth
          />
        </Box>

        <TextField
          label="Composition (lits)"
          size="small"
          value={roomType.bedsLabel || ''}
          onChange={(e) => patch({ bedsLabel: e.target.value })}
          fullWidth
          sx={{ mb: 1.5 }}
        />

        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.8 }}>
            Équipements du type
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
            {DEFAULT_AMENITY_LABELS.map((a) => {
              const on = labels.includes(a);
              return (
                <Button
                  key={a}
                  size="small"
                  onClick={() => {
                    const next = on ? labels.filter((x) => x !== a) : [...labels, a];
                    patch({ amenityLabels: next });
                  }}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    px: 1.2,
                    py: 0.4,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${on ? t.primary : t.border}`,
                    background: on ? t.primaryTint : t.bg2,
                    color: on ? t.primaryDeep : t.text2,
                  }}
                >
                  {a}
                </Button>
              );
            })}
          </Box>
        </Box>

        <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.8 }}>
          Photos de ce type
        </Typography>
        <PhotoZone
          variant="type"
          tag={`Type : ${roomType.roomTypeName}`}
          hint="Uniquement ce type de chambre — distinctes des photos communes"
          images={roomType.roomTypeImages}
          onChange={(roomTypeImages) => patch({ roomTypeImages })}
          uploading={uploading}
          onPickFiles={onPickFiles}
        />
      </Box>
    </Box>
  );
}
