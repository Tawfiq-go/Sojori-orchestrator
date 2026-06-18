import { useMemo, useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
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
import { btnGhostSx, btnPrimarySx, tokens as t } from './DashboardV2.components';
import type { DashboardPropertyOption } from '../../types/dashboard.types';

interface ListingCheckboxFilterProps {
  listings: DashboardPropertyOption[];
  selectedIds: string[];
  onApply: (ids: string[]) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ListingCheckboxFilter({
  listings,
  selectedIds,
  onApply,
  loading = false,
  disabled = false,
}: ListingCheckboxFilterProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [draftIds, setDraftIds] = useState<string[]>([]);

  const open = Boolean(anchorEl);

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = listings.filter((listing) => listing.isActive !== false);
    if (!query) return active;
    return active.filter(
      (listing) =>
        listing.label.toLowerCase().includes(query) ||
        listing.name.toLowerCase().includes(query) ||
        (listing.city?.toLowerCase().includes(query) ?? false),
    );
  }, [listings, search]);

  const label =
    selectedIds.length === 0
      ? `Listings · tous (${listings.length})`
      : `Listings · ${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}`;

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setDraftIds(selectedIds);
    setSearch('');
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch('');
  };

  const toggleId = (id: string) => {
    setDraftIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredListings.map((listing) => listing.id);
    setDraftIds((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  const clearDraft = () => setDraftIds([]);

  const apply = () => {
    onApply(draftIds);
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
              width: { xs: 'min(100vw - 32px, 380px)', sm: 380 },
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
            placeholder="Rechercher un listing…"
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

        <List dense sx={{ maxHeight: 280, overflow: 'auto', py: 0 }}>
          {filteredListings.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
              Aucun listing trouvé.
            </Typography>
          ) : (
            filteredListings.map((listing) => {
              const checked = draftIds.includes(listing.id);
              return (
                <ListItemButton key={listing.id} onClick={() => toggleId(listing.id)} dense>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple size="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={listing.name}
                    secondary={listing.city || undefined}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: checked ? 600 : 400 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </ListItemButton>
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
