import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import {
  activateListingImportOnboarding,
  finishListingImportOnboarding,
  getListingImportOnboarding,
} from '../../services/importOnboardingService';
import type { ListingSummary } from '../../types/listings.types';
import { btnGhostSx, btnPrimarySx, tokens as t } from '../dashboard/DashboardV2.components';

function formatRuIds(value: unknown): string {
  return Array.isArray(value) ? value.map((id) => String(id).trim()).filter(Boolean).join(', ') : '';
}

function parseRuIdsInput(value: string): string[] {
  return [
    ...new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

interface RoomTypeRow {
  _id: string;
  roomTypeName: string;
  rentalUnitedId: string;
}

export interface ListingQuickEditDialogProps {
  open: boolean;
  listing: ListingSummary | null;
  onClose: () => void;
  onUpdated?: (listing: ListingSummary) => void;
}

export function ListingQuickEditDialog({ open, listing, onClose, onUpdated }: ListingQuickEditDialogProps) {
  const [listingName, setListingName] = useState('');
  const [listingActive, setListingActive] = useState(true);
  const [listingRuIds, setListingRuIds] = useState('');
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([]);
  const [importModeActive, setImportModeActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importModeBusy, setImportModeBusy] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadListing = useCallback(async () => {
    if (!open || !listing?.id) return;

    setLoading(true);
    setLoadError('');
    setListingName(listing.name || '');
    setListingActive(listing.status === 'active');
    setListingRuIds(formatRuIds(listing.rentalUnitedIds));
    setRoomTypes([]);
    setImportModeActive(false);

    try {
      const [fullListing, onboarding] = await Promise.all([
        listingsService.getListingDocument(listing.id),
        getListingImportOnboarding(listing.id).catch(() => ({ active: false })),
      ]);
      if (!fullListing) {
        setLoadError('Impossible de charger le détail du listing');
        return;
      }

      setListingName(String(fullListing.name || listing.name || ''));
      setListingActive(fullListing.active !== false);
      setListingRuIds(formatRuIds(fullListing.rentalUnitedIds ?? listing.rentalUnitedIds));
      setImportModeActive(Boolean(onboarding?.active));
      const rawRoomTypes = fullListing.roomTypes;
      setRoomTypes(
        Array.isArray(rawRoomTypes)
          ? rawRoomTypes.map((rt: Record<string, unknown>) => ({
              _id: String(rt._id ?? ''),
              roomTypeName: String(rt.roomTypeName || 'Room type'),
              rentalUnitedId: String(rt.rentalUnitedId ?? ''),
            }))
          : [],
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setLoadError(err?.response?.data?.message || err?.message || 'Impossible de charger le listing');
    } finally {
      setLoading(false);
    }
  }, [open, listing]);

  useEffect(() => {
    if (open) {
      void loadListing();
    } else {
      setListingName('');
      setListingActive(true);
      setListingRuIds('');
      setRoomTypes([]);
      setImportModeActive(false);
      setLoadError('');
    }
  }, [open, loadListing]);

  const canSubmit = Boolean(listing?.id) && !loading && !saving && !importModeBusy;

  const handleRoomTypeRuChange = (roomTypeId: string, value: string) => {
    setRoomTypes((prev) =>
      prev.map((roomType) =>
        roomType._id === roomTypeId ? { ...roomType, rentalUnitedId: value } : roomType,
      ),
    );
  };

  const handleImportModeToggle = async (nextActive: boolean) => {
    if (!listing?.id || importModeBusy) return;

    if (!nextActive) {
      const ok = window.confirm(
        'Terminer le mode import ?\n\n' +
          '• Les prochaines résas seront en mode auto\n' +
          '• Les résas pending non lancées passeront en skipped (pas de lancement batch)\n' +
          '• Aucune orchestration ne sera lancée automatiquement',
      );
      if (!ok) return;
    }

    try {
      setImportModeBusy(true);
      if (nextActive) {
        const firstRu = parseRuIdsInput(listingRuIds)[0];
        const ruPropertyId = firstRu && !Number.isNaN(Number(firstRu)) ? Number(firstRu) : undefined;
        const data = await activateListingImportOnboarding(listing.id, { ruPropertyId });
        setImportModeActive(Boolean(data?.active));
        toast.success('Mode import activé — nouvelles résas silencieuses (pas de retag auto)');
      } else {
        const data = await finishListingImportOnboarding(listing.id);
        setImportModeActive(Boolean(data?.active));
        toast.success('Mode import terminé');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Impossible de changer le mode import',
      );
    } finally {
      setImportModeBusy(false);
    }
  };

  const handleUpdateListing = async () => {
    const trimmedName = String(listingName || '').trim();
    if (!trimmedName) {
      toast.error('Le nom du listing est requis');
      return;
    }
    if (!listing?.id) return;

    try {
      setSaving(true);
      const response = await listingsService.updateListingQuickEdit(listing.id, {
        name: trimmedName,
        active: listingActive,
        rentalUnitedIds: parseRuIdsInput(listingRuIds),
        roomTypes: roomTypes.map((roomType) => ({
          _id: roomType._id,
          rentalUnitedId: String(roomType.rentalUnitedId || '').trim(),
        })),
      });

      if (response.success) {
        const updated: ListingSummary = {
          ...listing,
          name: response.data?.listing?.name || trimmedName,
          status: (response.data?.listing?.active ?? listingActive) ? 'active' : 'inactive',
          rentalUnitedIds: response.data?.listing?.rentalUnitedIds || parseRuIdsInput(listingRuIds),
        };
        onUpdated?.(updated);
        toast.success('Listing mis à jour');
        onClose();
      } else {
        toast.error(response.message || 'Mise à jour impossible');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message || err?.message || 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving || importModeBusy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Quick edit listing import fields</Typography>
        <Typography sx={{ fontSize: 13, color: t.text2, mt: 0.5 }}>
          Update the listing name, listing RU IDs and room RU IDs without leaving this page.
        </Typography>
        {listing?.name && (
          <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.75, fontStyle: 'italic' }}>
            {listing.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: t.primary }} />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {loadError && <Alert severity="error">{loadError}</Alert>}

            <TextField
              fullWidth
              label="Listing name"
              size="small"
              value={listingName}
              onChange={(e) => setListingName(e.target.value)}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={listingActive}
                  onChange={(e) => setListingActive(e.target.checked)}
                  color="primary"
                />
              }
              label={listingActive ? 'Active in Sojori' : 'Inactive in Sojori'}
            />

            <TextField
              fullWidth
              label="Listing RU IDs"
              size="small"
              value={listingRuIds}
              onChange={(e) => setListingRuIds(e.target.value)}
              helperText="Comma-separated. Leave empty to unlink the listing from RU."
            />

            <Divider />

            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: `1px solid ${importModeActive ? 'rgba(184,133,26,0.35)' : t.border}`,
                bgcolor: importModeActive ? 'rgba(184,133,26,0.06)' : t.bg1,
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Mode import</Typography>
                <Chip
                  size="small"
                  label={importModeActive ? 'Actif' : 'Inactif'}
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    bgcolor: importModeActive ? 'rgba(184,133,26,0.15)' : t.bg2,
                    color: importModeActive ? t.primary : t.text2,
                  }}
                />
              </Stack>
              <Typography sx={{ fontSize: 12, color: t.text2, mb: 1.25 }}>
                Admin uniquement. Active = nouvelles résas silencieuses (pas de notifs / pas de plan auto).
                Désactive = prochaines résas en auto. Ne retague pas les résas existantes (utiliser Sync après import).
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={importModeActive}
                    disabled={importModeBusy || !listing?.id}
                    onChange={(e) => void handleImportModeToggle(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  importModeBusy
                    ? '…'
                    : importModeActive
                      ? 'Mode import ON — sortir = Terminer l’import'
                      : 'Mode import OFF — activer pour silence'
                }
              />
            </Box>

            <Divider />

            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5 }}>Room types RU IDs</Typography>
              {roomTypes.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: t.text3 }}>No room types found for this listing.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {roomTypes.map((roomType) => (
                    <TextField
                      key={roomType._id}
                      fullWidth
                      size="small"
                      label={roomType.roomTypeName}
                      value={roomType.rentalUnitedId}
                      onChange={(e) => handleRoomTypeRuChange(roomType._id, e.target.value)}
                      helperText="Leave empty to unlink this room type from RU."
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button sx={btnGhostSx} onClick={onClose} disabled={saving || importModeBusy}>
          Cancel
        </Button>
        <Button sx={btnPrimarySx} onClick={() => void handleUpdateListing()} disabled={!canSubmit}>
          {saving ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ListingQuickEditDialog;
