import { useMemo, useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { btnGhostSx, btnPrimarySx, tokens as t } from './DashboardV2.components';
import type { DashboardPropertyOption } from '../../types/dashboard.types';

export type ListingFilterApply = {
  listingIds: string[];
  /** Multi drill — empty = building entier (KPIs inchangés). */
  roomTypeIds: string[];
};

interface ListingCheckboxFilterProps {
  listings: DashboardPropertyOption[];
  selectedIds: string[];
  selectedRoomTypeIds?: string[];
  onApply: (next: ListingFilterApply) => void;
  loading?: boolean;
  disabled?: boolean;
}

function isMultiHotelOption(listing: DashboardPropertyOption): boolean {
  return (
    String(listing.propertyUnit || '') === 'Multi' &&
    (listing.roomTypeCount ?? listing.roomTypes?.length ?? 0) > 1
  );
}

export function ListingCheckboxFilter({
  listings,
  selectedIds,
  selectedRoomTypeIds = [],
  onApply,
  loading = false,
  disabled = false,
}: ListingCheckboxFilterProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [draftRoomTypeIds, setDraftRoomTypeIds] = useState<string[]>([]);
  const [expandedMulti, setExpandedMulti] = useState<Record<string, boolean>>({});

  const open = Boolean(anchorEl);

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = listings.filter((listing) => listing.isActive !== false);
    if (!query) return active;
    return active.filter((listing) => {
      if (
        listing.label.toLowerCase().includes(query) ||
        listing.name.toLowerCase().includes(query) ||
        (listing.city?.toLowerCase().includes(query) ?? false)
      ) {
        return true;
      }
      return (listing.roomTypes || []).some((rt) =>
        rt.name.toLowerCase().includes(query),
      );
    });
  }, [listings, search]);

  const label =
    selectedIds.length === 0
      ? `Listings · tous (${listings.length})`
      : selectedRoomTypeIds.length > 0
        ? `Listings · ${selectedIds.length} · ${selectedRoomTypeIds.length} type${selectedRoomTypeIds.length > 1 ? 's' : ''}`
        : `Listings · ${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}`;

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setDraftIds(selectedIds);
    setDraftRoomTypeIds(selectedRoomTypeIds);
    setSearch('');
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch('');
  };

  const toggleExpand = (listingId: string, e: MouseEvent) => {
    e.stopPropagation();
    setExpandedMulti((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  const toggleListing = (listing: DashboardPropertyOption) => {
    const id = listing.id;
    const rtIds = (listing.roomTypes || []).map((rt) => rt.id);
    const multi = isMultiHotelOption(listing);
    const checked = draftIds.includes(id);

    if (checked) {
      setDraftIds((prev) => prev.filter((value) => value !== id));
      if (multi && rtIds.length > 0) {
        setDraftRoomTypeIds((prev) => prev.filter((rtId) => !rtIds.includes(rtId)));
      }
      return;
    }

    setDraftIds((prev) => [...new Set([...prev, id])]);
    if (multi && rtIds.length > 0) {
      // Parent cochée = tous les types (pas de sous-filtre KPI / stays)
      setDraftRoomTypeIds((prev) => prev.filter((rtId) => !rtIds.includes(rtId)));
    }
  };

  const toggleRoomType = (listing: DashboardPropertyOption, roomTypeId: string) => {
    const rtIds = (listing.roomTypes || []).map((rt) => rt.id);
    const parentFull =
      draftIds.includes(listing.id) &&
      !draftRoomTypeIds.some((id) => rtIds.includes(id));
    const currentlyOn = parentFull || draftRoomTypeIds.includes(roomTypeId);

    let nextRt: string[];
    if (currentlyOn) {
      // Décocher un type depuis « tout le building » → garder les autres
      if (parentFull) {
        nextRt = [
          ...draftRoomTypeIds.filter((id) => !rtIds.includes(id)),
          ...rtIds.filter((id) => id !== roomTypeId),
        ];
      } else {
        nextRt = draftRoomTypeIds.filter((id) => id !== roomTypeId);
      }
    } else {
      nextRt = [...new Set([...draftRoomTypeIds, roomTypeId])];
    }

    const selectedForListing = nextRt.filter((id) => rtIds.includes(id));

    // Tous les types cochés → équivaut au building (clear roomTypeIds for this hotel)
    if (selectedForListing.length === rtIds.length && rtIds.length > 0) {
      nextRt = nextRt.filter((id) => !rtIds.includes(id));
      setDraftRoomTypeIds(nextRt);
      setDraftIds((prev) => [...new Set([...prev, listing.id])]);
      return;
    }

    if (selectedForListing.length === 0) {
      setDraftRoomTypeIds(nextRt);
      setDraftIds((prev) => prev.filter((id) => id !== listing.id));
      return;
    }

    setDraftRoomTypeIds(nextRt);
    setDraftIds((prev) => [...new Set([...prev, listing.id])]);
  };

  const selectAllVisible = () => {
    const visibleIds = filteredListings.map((listing) => listing.id);
    setDraftIds((prev) => [...new Set([...prev, ...visibleIds])]);
    // Clearing RT filters for newly selected Multi = full building
    const multiRtIds = filteredListings
      .filter(isMultiHotelOption)
      .flatMap((l) => (l.roomTypes || []).map((rt) => rt.id));
    if (multiRtIds.length > 0) {
      setDraftRoomTypeIds((prev) => prev.filter((id) => !multiRtIds.includes(id)));
    }
  };

  const clearDraft = () => {
    setDraftIds([]);
    setDraftRoomTypeIds([]);
  };

  const apply = () => {
    onApply({ listingIds: draftIds, roomTypeIds: draftRoomTypeIds });
    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        disabled={disabled || loading}
        onClick={handleOpen}
        startIcon={loading ? <CircularProgress size={14} /> : <FilterListIcon fontSize="small" />}
        sx={{
          textTransform: 'none',
          borderColor: t.border,
          color: t.text,
          bgcolor: t.bg1,
          fontWeight: 600,
          '&:hover': { borderColor: t.primary, bgcolor: t.bg2 },
        }}
      >
        {label}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'min(100vw - 32px, 440px)', sm: 440 },
              mt: 0.5,
              border: `1px solid ${t.border}`,
              boxShadow: '0 12px 40px rgba(26,20,8,0.12)',
            },
          },
        }}
      >
        <Box sx={{ p: 1.5, pb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Filtrer par listing
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Listing, ville ou villa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: t.text3 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" sx={btnGhostSx} onClick={selectAllVisible}>
              Cocher visibles
            </Button>
            <Button size="small" sx={btnGhostSx} onClick={clearDraft}>
              Tout effacer
            </Button>
          </Box>
        </Box>

        <Divider />

        <List dense sx={{ maxHeight: 360, overflow: 'auto', py: 0 }}>
          {filteredListings.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
              Aucun listing trouvé.
            </Typography>
          ) : (
            filteredListings.map((listing) => {
              const multi = isMultiHotelOption(listing);
              const rtIds = (listing.roomTypes || []).map((rt) => rt.id);
              const selectedRtCount = draftRoomTypeIds.filter((id) => rtIds.includes(id)).length;
              const listingChecked =
                draftIds.includes(listing.id) &&
                (selectedRtCount === 0 || selectedRtCount === rtIds.length);
              const listingIndeterminate =
                selectedRtCount > 0 && selectedRtCount < rtIds.length;
              const expanded = Boolean(expandedMulti[listing.id]) || Boolean(search.trim());
              const typeNames = (listing.roomTypes || []).map((rt) => rt.name);
              const secondary = [
                listing.city,
                multi && typeNames.length > 0 && !expanded
                  ? `${typeNames.length} types`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <Box key={listing.id}>
                  <ListItemButton onClick={() => toggleListing(listing)} dense>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={listingChecked || listingIndeterminate}
                        indeterminate={listingIndeterminate}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                          <Typography
                            component="span"
                            sx={{
                              fontSize: 13,
                              fontWeight: listingChecked || listingIndeterminate ? 600 : 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {listing.name}
                          </Typography>
                          {multi ? (
                            <Chip
                              size="small"
                              label={`Multi · ${listing.roomTypeCount ?? typeNames.length}`}
                              sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 700,
                                bgcolor: 'rgba(59,130,246,0.12)',
                                color: '#1d4ed8',
                                '& .MuiChip-label': { px: 0.75 },
                                flexShrink: 0,
                              }}
                            />
                          ) : null}
                        </Box>
                      }
                      secondary={secondary || undefined}
                      secondaryTypographyProps={{ fontSize: 11 }}
                    />
                    {multi ? (
                      <IconButton
                        size="small"
                        onClick={(e) => toggleExpand(listing.id, e)}
                        aria-label="Afficher les room types"
                      >
                        {expanded ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    ) : null}
                  </ListItemButton>

                  {multi ? (
                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                      <List dense disablePadding sx={{ bgcolor: t.bg2 }}>
                        {(listing.roomTypes || []).map((rt) => {
                          const rtChecked =
                            draftRoomTypeIds.includes(rt.id) ||
                            (draftIds.includes(listing.id) && selectedRtCount === 0);
                          return (
                            <ListItemButton
                              key={rt.id}
                              onClick={() => toggleRoomType(listing, rt.id)}
                              dense
                              sx={{ pl: 5 }}
                            >
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Checkbox
                                  edge="start"
                                  checked={rtChecked}
                                  tabIndex={-1}
                                  disableRipple
                                  size="small"
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={rt.name}
                                primaryTypographyProps={{ fontSize: 12.5 }}
                              />
                            </ListItemButton>
                          );
                        })}
                      </List>
                    </Collapse>
                  ) : null}
                </Box>
              );
            })
          )}
        </List>

        <Divider />

        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
            bgcolor: t.bg2,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {draftIds.length === 0
              ? 'Tous les listings'
              : draftRoomTypeIds.length > 0
                ? `${draftIds.length} listing(s) · ${draftRoomTypeIds.length} type(s) — KPI building`
                : `${draftIds.length} sélectionné${draftIds.length > 1 ? 's' : ''}`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" sx={btnGhostSx} onClick={handleClose}>
              Annuler
            </Button>
            <Button size="small" sx={btnPrimarySx} onClick={apply}>
              Appliquer
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
