/**
 * Rooms & Beds — parité legacy RoomConfig (composition-rooms + roomTypes[0].roomAmenities).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import listingsService from '../../../../services/listingsService';
import RoomBedAmenitiesDialog from '../components/RoomBedAmenitiesDialog';
import { T, Card, RuFormLegend } from './_shared';

function getCompositionRoomLabel(room) {
  if (!room) return '';
  const sojori = room.RoomNameSojori;
  if (sojori && typeof sojori === 'object') {
    return sojori.fr || sojori.FR || sojori.en || sojori.EN || room.roomName || '';
  }
  return room.roomName || '';
}

function getAmenityDisplayName(amenity) {
  if (!amenity) return 'Unknown';
  if (typeof amenity.name === 'string') return amenity.name;
  if (amenity.name && typeof amenity.name === 'object') {
    return (
      amenity.name.fr ||
      amenity.name.FR ||
      amenity.name.en ||
      amenity.name.EN ||
      Object.values(amenity.name)[0] ||
      'Unknown'
    );
  }
  return amenity.rentalAmenityName || 'Unknown';
}

function cloneRoomTypes(values) {
  const src = Array.isArray(values?.roomTypes) ? values.roomTypes : [];
  return src.length > 0 ? src.map((rt) => ({ ...rt })) : [{ roomAmenities: [] }];
}

export function RoomsTab({ values = {}, onChange, listingId }) {
  const [composition, setComposition] = useState(null);
  const [loading, setLoading] = useState(true);
  const syncedCompositionRef = useRef(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    syncedCompositionRef.current = false;
    setLoading(true);
    setComposition(null);
  }, [listingId]);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    room: null,
    instanceIndex: null,
  });
  const [bedPopup, setBedPopup] = useState({
    open: false,
    room: null,
    instanceIndex: null,
  });

  const primaryRoomType = (values.roomTypes && values.roomTypes[0]) || {};
  const roomTypeLabel =
    primaryRoomType.roomTypeName || primaryRoomType.name || null;

  const persistRoomTypes = useCallback(
    (nextRoomTypes) => {
      onChange?.({ roomTypes: nextRoomTypes });
    },
    [onChange],
  );

  const getRoomAmenities = useCallback(() => {
    const rt = values.roomTypes?.[0];
    return Array.isArray(rt?.roomAmenities) ? rt.roomAmenities : [];
  }, [values.roomTypes]);

  useEffect(() => {
    let cancelled = false;
    void listingsService.getRoomComposition().then((data) => {
      if (cancelled) return;
      setComposition(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    if (!composition?.rooms || syncedCompositionRef.current) return;

    const enabledRooms = composition.rooms.filter((r) => r.enable !== false);
    const currentRoomTypes = cloneRoomTypes(valuesRef.current);
    const currentAmenities = currentRoomTypes[0]?.roomAmenities || [];

    const initializedAmenities = enabledRooms
      .map((room) => {
        const label = getCompositionRoomLabel(room);
        const existing = currentAmenities.find(
          (item) => String(item.roomId) === String(room.rentalId),
        );
        if (!existing || !(existing.rooms || []).length) return null;
        return { ...existing, roomType: label, rooms: existing.rooms || [] };
      })
      .filter(Boolean);

    currentRoomTypes[0] = {
      ...currentRoomTypes[0],
      roomAmenities: initializedAmenities,
    };
    syncedCompositionRef.current = true;
    persistRoomTypes(currentRoomTypes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync unique à l’arrivée du catalogue composition
  }, [composition, persistRoomTypes]);

  const handleAddRoomInstance = (room) => {
    const newRoomTypes = cloneRoomTypes(values);
    const target = newRoomTypes[0];
    if (!target.roomAmenities) target.roomAmenities = [];

    const label = getCompositionRoomLabel(room);
    const idx = target.roomAmenities.findIndex(
      (item) => String(item.roomId) === String(room.rentalId),
    );

    if (idx === -1) {
      target.roomAmenities.push({
        roomType: label,
        roomId: room.rentalId,
        rooms: [{ amenities: [], quantity: 1 }],
      });
    } else {
      target.roomAmenities[idx].roomType = label;
      target.roomAmenities[idx].rooms.push({ amenities: [], quantity: 1 });
    }
    persistRoomTypes(newRoomTypes);
  };

  const handleRemoveRoomInstance = (room, instanceIndex) => {
    const newRoomTypes = cloneRoomTypes(values);
    const target = newRoomTypes[0];
    if (!target?.roomAmenities) return;

    const idx = target.roomAmenities.findIndex(
      (item) => String(item.roomId) === String(room.rentalId),
    );
    if (idx !== -1) {
      target.roomAmenities[idx].rooms.splice(instanceIndex, 1);
      if (target.roomAmenities[idx].rooms.length === 0) {
        target.roomAmenities.splice(idx, 1);
      }
    }
    persistRoomTypes(newRoomTypes);
    setDeleteConfirm({ open: false, room: null, instanceIndex: null });
  };

  const handleSaveRoomAmenities = (room, instanceIndex, amenities) => {
    const newRoomTypes = cloneRoomTypes(values);
    const target = newRoomTypes[0];
    if (!target.roomAmenities) target.roomAmenities = [];

    const idx = target.roomAmenities.findIndex(
      (item) => String(item.roomId) === String(room.rentalId),
    );
    if (idx === -1) return;

    const currentInstance = target.roomAmenities[idx].rooms[instanceIndex];
    const existing = currentInstance?.amenities || [];
    const nonBed = existing.filter((a) => a.useBed !== true);
    target.roomAmenities[idx].rooms[instanceIndex] = {
      ...currentInstance,
      amenities: [...nonBed, ...amenities],
    };
    persistRoomTypes(newRoomTypes);
  };

  const getCurrentRoomAmenities = (room, instanceIndex) => {
    const data = getRoomAmenities().find(
      (item) => String(item.roomId) === String(room.rentalId),
    );
    return data?.rooms?.[instanceIndex]?.amenities || [];
  };

  const renderRoomInstances = (room) => {
    const label = getCompositionRoomLabel(room);
    const composed = getRoomAmenities().find(
      (item) => String(item.roomId) === String(room.rentalId),
    );
    const instances = composed?.rooms || [];
    const noBedsForType = room.useBed === false;

    return (
      <Box
        key={room.rentalId}
        sx={{
          py: 2,
          px: 2,
          borderBottom: `1px solid ${T.border}`,
          '&:last-child': { borderBottom: 'none' },
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: instances.length ? 1.5 : 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14, color: T.text }}>
            {label}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              bgcolor: T.bg2,
              borderRadius: 1,
              px: 1,
              py: 0.25,
              border: `1px solid ${T.border}`,
            }}
          >
            <Typography sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: 14 }}>
              {instances.length}
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleAddRoomInstance(room)}
              sx={{
                ml: 0.5,
                bgcolor: T.successTint,
                color: T.success,
                width: 28,
                height: 28,
                '&:hover': { bgcolor: 'rgba(10,143,94,0.18)' },
              }}
            >
              +
            </IconButton>
          </Stack>
        </Stack>

        {instances.length > 0 && (
          <Stack gap={1}>
            {instances.map((instance, instanceIndex) => {
              const bedAmenities = (instance.amenities || []).filter((a) => a.useBed === true);
              return (
                <Box
                  key={instanceIndex}
                  sx={{
                    bgcolor: T.bg2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 1,
                    p: 1.25,
                  }}
                >
                  <Stack direction="row" gap={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <Stack direction="row" gap={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap',  flex: 1, minWidth: 0 }}>
                      <Chip
                        size="small"
                        label={`${label} ${instanceIndex + 1}`}
                        onDelete={() =>
                          setDeleteConfirm({ open: true, room, instanceIndex })
                        }
                        sx={{
                          bgcolor: T.primary,
                          color: '#fff',
                          fontWeight: 500,
                          '& .MuiChip-deleteIcon': { color: '#fff' },
                        }}
                      />
                      {noBedsForType ? (
                        <Typography variant="caption" sx={{ color: T.text4, fontStyle: 'italic' }}>
                          : Pas de lits
                        </Typography>
                      ) : bedAmenities.length > 0 ? (
                        <Stack direction="row" gap={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ color: T.text3 }}>
                            :
                          </Typography>
                          {bedAmenities.map((amenity, ai) => (
                            <Chip
                              key={ai}
                              size="small"
                              label={`${getAmenityDisplayName(amenity)}${amenity.count > 1 ? ` (${amenity.count})` : ''}`}
                              sx={{ bgcolor: T.infoTint, color: T.info, fontSize: 11, height: 22 }}
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ color: T.text4, fontStyle: 'italic' }}>
                          : Pas de lits
                        </Typography>
                      )}
                    </Stack>
                    {!noBedsForType && (
                      <IconButton
                        size="small"
                        onClick={() =>
                          setBedPopup({ open: true, room, instanceIndex })
                        }
                        sx={{ bgcolor: T.infoTint, color: T.info }}
                        title="Configurer les lits"
                      >
                        ⚙
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: T.primary }} />
      </Box>
    );
  }

  const enabledRooms =
    composition?.rooms?.filter((r) => r.enable !== false) ?? [];

  const roomsToDisplay = enabledRooms.filter((room) => {
    const composed = getRoomAmenities().find(
      (item) => String(item.roomId) === String(room.rentalId),
    );
    return (composed?.rooms || []).length > 0;
  });

  return (
    <Box>
      <RuFormLegend />
      {roomTypeLabel && (
        <Typography sx={{ fontSize: 12, color: T.text3, mb: 1.5 }}>
          Type de logement : <strong>{roomTypeLabel}</strong>
        </Typography>
      )}

      <Card
        title="🛏 Composition des pièces"
        meta={`${roomsToDisplay.length} types · roomAmenities[]`}
      >
        <Typography sx={{ fontSize: 12.5, color: T.text2, mb: 1.5 }}>
          Seules les pièces présentes sur l&apos;annonce sont affichées. Utilisez + pour en ajouter.
        </Typography>
        <Box
          sx={{
            border: `1px solid ${T.border}`,
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: T.bg1,
          }}
        >
          {roomsToDisplay.length > 0 ? (
            roomsToDisplay.map((room) => renderRoomInstances(room))
          ) : enabledRooms.length > 0 ? (
            <Box sx={{ py: 3, px: 2 }}>
              <Typography sx={{ textAlign: 'center', color: T.text3, fontStyle: 'italic', mb: 2 }}>
                Aucune pièce configurée pour le moment.
              </Typography>
              <Stack direction="row" useFlexGap gap={1} sx={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                {enabledRooms.map((room) => (
                  <Button
                    key={room.rentalId}
                    size="small"
                    variant="outlined"
                    onClick={() => handleAddRoomInstance(room)}
                  >
                    + {getCompositionRoomLabel(room)}
                  </Button>
                ))}
              </Stack>
            </Box>
          ) : (
            <Typography sx={{ py: 4, textAlign: 'center', color: T.text3, fontStyle: 'italic' }}>
              Aucune composition de pièces disponible.
            </Typography>
          )}
        </Box>
      </Card>

      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, room: null, instanceIndex: null })}
      >
        <DialogTitle>Supprimer la pièce ?</DialogTitle>
        <DialogContent>
          {deleteConfirm.room && deleteConfirm.instanceIndex != null && (
            <Typography variant="body2">
              Supprimer « {getCompositionRoomLabel(deleteConfirm.room)}{' '}
              {deleteConfirm.instanceIndex + 1} » ?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, room: null, instanceIndex: null })}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() =>
              handleRemoveRoomInstance(deleteConfirm.room, deleteConfirm.instanceIndex)
            }
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <RoomBedAmenitiesDialog
        open={bedPopup.open && bedPopup.room && bedPopup.room.useBed !== false}
        room={bedPopup.room}
        instanceIndex={bedPopup.instanceIndex}
        selectedAmenities={
          bedPopup.room && bedPopup.instanceIndex != null
            ? getCurrentRoomAmenities(bedPopup.room, bedPopup.instanceIndex)
            : []
        }
        onClose={() => setBedPopup({ open: false, room: null, instanceIndex: null })}
        onSave={(amenities) =>
          handleSaveRoomAmenities(bedPopup.room, bedPopup.instanceIndex, amenities)
        }
      />
    </Box>
  );
}
