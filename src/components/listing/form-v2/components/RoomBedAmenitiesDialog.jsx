import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import listingsService from '../../../../services/listingsService';
import { T } from '../tabs/_shared';

function getCompositionRoomLabel(room) {
  if (!room) return '';
  const sojori = room.RoomNameSojori;
  if (sojori && typeof sojori === 'object') {
    return sojori.fr || sojori.FR || sojori.en || sojori.EN || room.roomName || '';
  }
  return room.roomName || '';
}

function getAmenityLabel(amenity) {
  if (!amenity) return '';
  if (typeof amenity.name === 'string') return amenity.name;
  if (amenity.name && typeof amenity.name === 'object') {
    return (
      amenity.name.fr ||
      amenity.name.FR ||
      amenity.name.en ||
      amenity.name.EN ||
      Object.values(amenity.name)[0] ||
      ''
    );
  }
  return amenity.rentalAmenityName || '';
}

export default function RoomBedAmenitiesDialog({
  open,
  room,
  instanceIndex,
  selectedAmenities = [],
  onClose,
  onSave,
}) {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (!open || !room?.rentalId) return;
    let cancelled = false;
    setLoading(true);
    void listingsService.getBedAmenitiesForCompositionRoom(room.rentalId).then((items) => {
      if (cancelled) return;
      setAmenities(items);
      const initial = {};
      selectedAmenities
        .filter((a) => a.useBed === true)
        .forEach((a) => {
          initial[String(a._id)] = a.count || 1;
        });
      setQuantities(initial);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, room?.rentalId, selectedAmenities]);

  const changeQty = (id, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  const handleSave = () => {
    const picked = Object.entries(quantities)
      .filter(([, count]) => count > 0)
      .map(([amenityId, count]) => {
        const row = amenities.find((a) => String(a._id) === amenityId);
        return {
          _id: amenityId,
          count: parseInt(String(count), 10),
          name: row?.name || row?.rentalAmenityName || 'Unknown',
          rentalAmenityName: row?.rentalAmenityName,
          useBed: true,
          numberOfPlace: row?.numberOfPlace || 1,
        };
      });
    onSave?.(picked);
    onClose?.();
  };

  const roomLabel = getCompositionRoomLabel(room);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Lits — {roomLabel} {instanceIndex != null ? instanceIndex + 1 : ''}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: T.primary }} />
          </Box>
        ) : amenities.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
            Aucun type de lit pour cette pièce.
          </Typography>
        ) : (
          <List dense>
            {amenities.map((amenity) => {
              const id = String(amenity._id);
              return (
                <ListItem
                  key={id}
                  sx={{
                    mb: 1,
                    border: `1px solid ${T.border}`,
                    borderRadius: 1,
                    bgcolor: T.bg2,
                  }}
                >
                  <ListItemText primary={getAmenityLabel(amenity)} />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => changeQty(id, -1)} disabled={!quantities[id]}>
                      −
                    </IconButton>
                    <TextField
                      size="small"
                      value={quantities[id] || 0}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10) || 0;
                        setQuantities((prev) => ({ ...prev, [id]: n }));
                      }}
                      slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', width: 36 } } }}
                      sx={{ width: 56, mx: 0.5 }}
                    />
                    <IconButton size="small" onClick={() => changeQty(id, 1)}>
                      +
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleSave} sx={{ bgcolor: T.primary }}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
