import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface RoomInstance {
  rentalId: string;
  roomName: string;
  RoomNameSojori?: { en?: string; fr?: string; ar?: string };
  enable: boolean;
  instancesCount?: number;
}

interface RoomComposition {
  rooms: RoomInstance[];
}

interface RoomSelectionModalProps {
  open: boolean;
  amenity: {
    _id: string;
    name: string | { en?: string; fr?: string; ar?: string };
    iconUrl?: string;
  } | null;
  roomComposition: RoomComposition | null;
  currentRoomSelections?: Array<{ roomId: string; count: number }>;
  onSave: (amenityId: string, roomSelections: Array<{ roomId: string; count: number }>) => void;
  onClose: () => void;
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
  error: '#ef4444',
};

function getAmenityName(name: string | { en?: string; fr?: string; ar?: string } | undefined): string {
  if (!name) return 'Équipement';
  if (typeof name === 'string') return name;
  return name.fr || name.en || name.ar || 'Équipement';
}

function getRoomName(room: RoomInstance): string {
  if (room.RoomNameSojori) {
    const sojoriName = room.RoomNameSojori.fr || room.RoomNameSojori.en || room.RoomNameSojori.ar;
    if (sojoriName) return sojoriName;
  }
  return room.roomName || 'Chambre sans nom';
}

export function RoomSelectionModal({
  open,
  amenity,
  roomComposition,
  currentRoomSelections = [],
  onSave,
  onClose,
}: RoomSelectionModalProps) {
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && currentRoomSelections) {
      const roomIds = currentRoomSelections.map((sel) => sel.roomId);
      setSelectedRooms(new Set(roomIds));
    }
  }, [open, currentRoomSelections]);

  const handleToggleRoom = (roomId: string) => {
    setSelectedRooms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    if (!amenity) return;

    const roomSelections = Array.from(selectedRooms).map((roomId) => ({
      roomId,
      count: 1, // Default count
    }));

    onSave(amenity._id, roomSelections);
    onClose();
  };

  const handleClose = () => {
    setSelectedRooms(new Set());
    onClose();
  };

  const availableRooms = roomComposition?.rooms || [];
  const enabledRooms = availableRooms.filter((room) => room.enable);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(26,20,8,0.15)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          pt: 2.5,
          px: 3,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.text }}>
            Sélectionner les chambres
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13, color: T.text3 }}>
            {amenity ? getAmenityName(amenity.name) : 'Équipement'}
          </Typography>
        </Box>
        <Button
          onClick={handleClose}
          sx={{
            minWidth: 'auto',
            p: 0.75,
            borderRadius: '8px',
            color: T.text3,
            '&:hover': {
              bgcolor: T.bg2,
              color: T.text2,
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </Button>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {enabledRooms.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, color: T.text3 }}>
              Aucune chambre disponible pour ce listing.
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: 12, color: T.text3 }}>
              Veuillez d'abord configurer les chambres dans l'onglet "Rooms & Beds".
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {enabledRooms.map((room) => {
              const roomId = room.rentalId;
              const isSelected = selectedRooms.has(roomId);

              return (
                <Box
                  key={roomId}
                  sx={{
                    border: `1px solid ${isSelected ? T.accent : T.border}`,
                    borderRadius: '10px',
                    p: 1.5,
                    bgcolor: isSelected ? `${T.accent}08` : T.bg1,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: isSelected ? T.accentHover : T.text3,
                    },
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleRoom(roomId)}
                        sx={{
                          color: T.border,
                          '&.Mui-checked': {
                            color: T.accent,
                          },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 13.5,
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? T.text : T.text2,
                          }}
                        >
                          {getRoomName(room)}
                        </Typography>
                        {room.instancesCount && room.instancesCount > 1 && (
                          <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25 }}>
                            {room.instancesCount} instances
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ m: 0 }}
                  />
                </Box>
              );
            })}
          </Box>
        )}

        {enabledRooms.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: '8px', bgcolor: T.bg2 }}>
            <Typography sx={{ fontSize: 12, color: T.text3 }}>
              💡 Sélectionnez les chambres où cet équipement est disponible. Si aucune chambre n'est
              sélectionnée, l'équipement sera considéré comme global au listing.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          sx={{
            px: 2.5,
            py: 1,
            borderRadius: '8px',
            fontSize: 13,
            fontWeight: 600,
            color: T.text2,
            border: `1px solid ${T.border}`,
            '&:hover': {
              bgcolor: T.bg2,
              borderColor: T.text3,
            },
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          disabled={enabledRooms.length === 0}
          sx={{
            px: 2.5,
            py: 1,
            borderRadius: '8px',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentHover})`,
            boxShadow: `0 2px 10px ${T.accent}28`,
            '&:hover': {
              background: `linear-gradient(135deg, ${T.accentHover}, ${T.accent})`,
              boxShadow: `0 4px 16px ${T.accent}40`,
            },
            '&.Mui-disabled': {
              opacity: 0.4,
            },
          }}
        >
          Enregistrer ({selectedRooms.size})
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RoomSelectionModal;
