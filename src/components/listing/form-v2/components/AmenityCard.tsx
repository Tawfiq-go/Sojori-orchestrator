import { memo } from 'react';
import { Box, Checkbox, IconButton, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface AmenityCardProps {
  amenity: {
    _id: string;
    name: string | { en?: string; fr?: string; ar?: string };
    iconUrl?: string;
    compositionRooms?: Array<{
      roomId: string;
      roomType: string;
    }>;
    basic?: boolean;
    category?: string;
  };
  isSelected: boolean;
  count?: number;
  onToggle: (amenityId: string, checked: boolean) => void;
  onCountChange: (amenityId: string, delta: number) => void;
  onRoomSelect?: (amenity: any) => void;
  showRoomButton?: boolean;
  /** Grille dense : pas d’icône, carte basse, 4+ par ligne */
  compact?: boolean;
}

const T = {
  bg1: '#ffffff',
  bg2: '#f8f9fa',
  border: '#e2e8f0',
  text: '#1a1408',
  text2: '#64748b',
  text3: '#94a3b8',
  accent: '#b8851a',
  accentHover: '#8f6814',
};

function getAmenityName(name: string | { en?: string; fr?: string; ar?: string }): string {
  if (typeof name === 'string') return name;
  return name.fr || name.en || name.ar || 'Nom indisponible';
}

export const AmenityCard = memo(function AmenityCard({
  amenity,
  isSelected,
  count = 1,
  onToggle,
  onCountChange,
  onRoomSelect,
  showRoomButton = false,
  compact = false,
}: AmenityCardProps) {
  const amenityName = getAmenityName(amenity.name);
  const showIcon = !compact && Boolean(amenity.iconUrl);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(amenity._id, event.target.checked);
  };

  const countControls = isSelected ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
      <IconButton
        size="small"
        onClick={() => onCountChange(amenity._id, -1)}
        disabled={count <= 1}
        sx={{
          width: compact ? 20 : 24,
          height: compact ? 20 : 24,
          border: `1px solid ${T.border}`,
          borderRadius: '4px',
          p: 0,
        }}
      >
        <RemoveIcon sx={{ fontSize: compact ? 12 : 14, color: T.text2 }} />
      </IconButton>
      <Typography
        sx={{
          fontSize: compact ? 11 : 13,
          fontWeight: 700,
          color: T.accent,
          minWidth: 14,
          textAlign: 'center',
        }}
      >
        {count}
      </Typography>
      <IconButton
        size="small"
        onClick={() => onCountChange(amenity._id, 1)}
        sx={{
          width: compact ? 20 : 20,
          height: compact ? 20 : 24,
          border: `1px solid ${T.border}`,
          borderRadius: '4px',
          p: 0,
        }}
      >
        <AddIcon sx={{ fontSize: compact ? 12 : 14, color: T.text2 }} />
      </IconButton>
      {showRoomButton && amenity.compositionRooms && amenity.compositionRooms.length > 0 && (
        <Typography
          onClick={() => onRoomSelect?.(amenity)}
          sx={{
            fontSize: 9,
            fontWeight: 600,
            color: T.accent,
            cursor: 'pointer',
            ml: 0.25,
            whiteSpace: 'nowrap',
          }}
        >
          Pièces
        </Typography>
      )}
    </Box>
  ) : null;

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${isSelected ? T.accent : T.border}`,
        borderRadius: compact ? '6px' : '8px',
        px: compact ? 0.75 : 1.25,
        py: compact ? 0.5 : 1,
        bgcolor: isSelected ? `${T.accent}08` : T.bg1,
        transition: 'border-color 0.15s ease',
        '&:hover': {
          borderColor: isSelected ? T.accent : T.text3,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 0.5 : 1,
          minHeight: compact ? 32 : undefined,
        }}
      >
        <Checkbox
          size="small"
          checked={isSelected}
          onChange={handleCheckboxChange}
          sx={{
            p: 0,
            color: T.border,
            '&.Mui-checked': { color: T.accent },
          }}
        />

        {showIcon && (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: T.bg2,
              flexShrink: 0,
            }}
          >
            <img
              src={amenity.iconUrl}
              alt=""
              style={{ width: 18, height: 18, objectFit: 'contain' }}
            />
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            title={amenityName}
            sx={{
              fontSize: compact ? 11.5 : 13,
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? T.text : T.text2,
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {amenityName}
          </Typography>
          {amenity.basic && (
            <Typography
              sx={{
                fontSize: compact ? 8.5 : 10,
                color: T.text3,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                lineHeight: 1.2,
              }}
            >
              Basic
            </Typography>
          )}
          {!compact && isSelected && countControls && (
            <Box sx={{ mt: 0.75 }}>{countControls}</Box>
          )}
        </Box>

        {compact && countControls}
      </Box>
    </Paper>
  );
});

export default AmenityCard;
