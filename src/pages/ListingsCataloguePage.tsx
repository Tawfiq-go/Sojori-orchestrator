import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ActionToast, useActionToast } from '../components/ActionToast';
import { useAuth } from '../hooks/useAuth';
import {
  createEmptyListing,
  getStoredListings,
  getStoredOwners,
  saveStoredListings,
  type ListingRecord,
  type ListingStatus,
} from '../data/catalogueMock';
import {
  DataTable,
  FilterBar,
  FilterChip,
  ListingCard,
  ListingsGrid,
  PageHeader,
  Panel,
  ViewToggle,
  btnGhostSx,
  btnPrimarySx,
  btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

type ViewMode = 'grid' | 'table' | 'map';

interface ImportState {
  ownerId: string;
  city: string;
  count: number;
  prefix: string;
}

export function ListingsCataloguePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast, showToast, hideToast } = useActionToast();

  const [listings, setListings] = useState<ListingRecord[]>(() => getStoredListings());
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ListingStatus>('active');
  const [selectedListing, setSelectedListing] = useState<ListingRecord | null>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importState, setImportState] = useState<ImportState>({
    ownerId: getStoredOwners()[0]?.id || '',
    city: 'Marrakech',
    count: 2,
    prefix: 'Imported RU',
  });

  const owners = useMemo(() => getStoredOwners().filter((item) => item.role === 'owner'), []);
  const countries = useMemo(() => Array.from(new Set(listings.map((item) => item.country))).sort(), [listings]);
  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          listings
            .filter((item) => countryFilter === 'all' || item.country === countryFilter)
            .map((item) => item.city),
        ),
      ).sort(),
    [countryFilter, listings],
  );
  const types = useMemo(() => Array.from(new Set(listings.map((item) => item.type))).sort(), [listings]);

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        const haystack = [
          listing.name,
          listing.city,
          listing.country,
          listing.ownerName,
          listing.type,
        ]
          .join(' ')
          .toLowerCase();

        if (search && !haystack.includes(search.toLowerCase())) return false;
        if (isAdmin && ownerFilter !== 'all' && listing.ownerId !== ownerFilter) return false;
        if (countryFilter !== 'all' && listing.country !== countryFilter) return false;
        if (cityFilter !== 'all' && listing.city !== cityFilter) return false;
        if (typeFilter !== 'all' && listing.type !== typeFilter) return false;
        if (statusFilter !== 'all' && listing.status !== statusFilter) return false;
        return true;
      }),
    [cityFilter, countryFilter, isAdmin, listings, ownerFilter, search, statusFilter, typeFilter],
  );

  const persistListings = (nextListings: ListingRecord[], message: string) => {
    setListings(nextListings);
    saveStoredListings(nextListings);
    showToast(message);
  };

  const applyQuickEdit = () => {
    if (!selectedListing) return;

    persistListings(
      listings.map((listing) => {
        if (listing.id !== selectedListing.id) return listing;
        const next = structuredClone(selectedListing);
        next.form.basic.name = next.name;
        next.form.basic.status = next.status;
        next.form.pricing.basePrice = next.adr;
        next.updatedAt = new Date().toISOString();
        return next;
      }),
      'Annonce mise à jour via quick edit',
    );
    setQuickEditOpen(false);
  };

  const handleImportRu = () => {
    const owner = owners.find((item) => item.id === importState.ownerId) || owners[0];
    const imported = Array.from({ length: importState.count }, (_, index) => {
      const draft = createEmptyListing();
      draft.name = `${importState.prefix} ${index + 1}`;
      draft.form.basic.name = draft.name;
      draft.city = importState.city;
      draft.country = importState.city === 'Nice' ? 'France' : 'Maroc';
      draft.countryCode = importState.city === 'Nice' ? 'FR' : 'MA';
      draft.form.address.city = importState.city;
      draft.form.address.country = draft.country;
      draft.form.address.countryCode = draft.countryCode;
      draft.ownerId = owner.id;
      draft.ownerName = owner.name;
      draft.form.basic.ownerId = owner.id;
      draft.form.basic.ownerName = owner.name;
      draft.status = 'draft';
      draft.form.basic.status = 'draft';
      draft.updatedAt = new Date().toISOString();
      return draft;
    });

    persistListings([...imported, ...listings], `${imported.length} annonces importées depuis RU (mock)`);
    setImportOpen(false);
  };

  const listingRows = filteredListings.map((listing) => ({
    ...listing,
    owner: listing.ownerName,
    revenue: `${Math.round(listing.monthlyRevenue / 1000)}k€`,
  }));

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces']}>
      <PageHeader title="Annonces" count={`${filteredListings.filter((item) => item.status === 'active').length} actives`}>
        <ViewToggle
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'table', label: 'Table' },
            { value: 'map', label: 'Map' },
          ]}
          value={view}
          onChange={(value: string) => setView(value as ViewMode)}
        />
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => setImportOpen(true)}>
          📥 Import RU
        </Button>
        <Button sx={btnPrimarySx} onClick={() => navigate('/listings/new')}>
          + Nouvelle annonce
        </Button>
      </PageHeader>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Quick search: nom, ville, owner, type..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ maxWidth: 420, '& .MuiOutlinedInput-root': { bgcolor: t.bg1, borderRadius: '8px' } }}
        />
      </Box>

      <FilterBar>
        <FilterChip label={statusFilter === 'all' ? 'Tous statuts' : statusFilter} active dropdown onClick={() => setStatusFilter((prev) => (prev === 'active' ? 'inactive' : prev === 'inactive' ? 'draft' : prev === 'draft' ? 'all' : 'active'))} />
        {isAdmin && <FilterChip label={ownerFilter === 'all' ? 'Owner' : owners.find((item) => item.id === ownerFilter)?.name || 'Owner'} active={ownerFilter !== 'all'} dropdown onClick={() => setOwnerFilter('all')} />}
        <FilterChip label={countryFilter === 'all' ? 'Country' : countryFilter} active={countryFilter !== 'all'} dropdown onClick={() => setCountryFilter('all')} />
        <FilterChip label={cityFilter === 'all' ? 'City' : cityFilter} active={cityFilter !== 'all'} dropdown onClick={() => setCityFilter('all')} />
        <FilterChip label={typeFilter === 'all' ? 'Type' : typeFilter} active={typeFilter !== 'all'} dropdown onClick={() => setTypeFilter('all')} />
      </FilterBar>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {isAdmin && owners.map((owner) => (
          <Button key={owner.id} sx={{ ...btnGhostSx, ...(ownerFilter === owner.id ? { bgcolor: t.primaryTint } : {}) }} onClick={() => setOwnerFilter((prev) => (prev === owner.id ? 'all' : owner.id))}>
            {owner.name}
          </Button>
        ))}
        {countries.map((country) => (
          <Button key={country} sx={{ ...btnGhostSx, ...(countryFilter === country ? { bgcolor: t.primaryTint } : {}) }} onClick={() => { setCountryFilter((prev) => (prev === country ? 'all' : country)); setCityFilter('all'); }}>
            {country}
          </Button>
        ))}
        {cities.map((city) => (
          <Button key={city} sx={{ ...btnGhostSx, ...(cityFilter === city ? { bgcolor: t.primaryTint } : {}) }} onClick={() => setCityFilter((prev) => (prev === city ? 'all' : city))}>
            {city}
          </Button>
        ))}
        {types.map((type) => (
          <Button key={type} sx={{ ...btnGhostSx, ...(typeFilter === type ? { bgcolor: t.primaryTint } : {}) }} onClick={() => setTypeFilter((prev) => (prev === type ? 'all' : type))}>
            {type}
          </Button>
        ))}
      </Stack>

      {view === 'grid' && (
        <ListingsGrid>
          {filteredListings.map((listing) => (
            <Box key={listing.id}>
              <div onClick={() => navigate(`/listings/${listing.id}`)}>
                <ListingCard
                  photoColor={listing.photoColor}
                  name={listing.name}
                  place={listing.sizeLabel}
                  rating={listing.reviewCount > 0 ? `${listing.rating.toFixed(2)} · ${listing.reviewCount} avis` : 'Brouillon'}
                  occupancy={`${listing.occupancy}%`}
                  adr={`€${listing.adr}`}
                  monthlyRev={`€${Math.round(listing.monthlyRevenue / 1000)}k`}
                  channels={listing.channels.map((channel) => channel.id)}
                  draft={listing.status === 'draft'}
                  draftAction={{ onClick: () => navigate(`/listings/${listing.id}`) }}
                />
              </div>
              <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => { setSelectedListing(listing); setDetailOpen(true); }}>Détails</Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/listings/${listing.id}`)}>Éditer</Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/tasks?listing=${listing.id}`)}>Tâches</Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/calendar?listing=${listing.id}`)}>Calendrier</Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => { setSelectedListing(listing); setQuickEditOpen(true); }}>Quick edit</Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => showToast(`Sync OTA lancée pour ${listing.name}`)}>Sync OTA</Button>
              </Stack>
            </Box>
          ))}
        </ListingsGrid>
      )}

      {view === 'table' && (
        <DataTable
          columns={[
            { key: 'name', label: 'Annonce', render: (row: any) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.name}</Typography> },
            { key: 'owner', label: 'Owner', render: (row: any) => <Typography sx={{ fontSize: 12 }}>{row.owner}</Typography> },
            { key: 'city', label: 'Ville' },
            { key: 'country', label: 'Pays' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Statut' },
            { key: 'occupancy', label: 'OCC', align: 'right', render: (row: any) => `${row.occupancy}%` },
            { key: 'adr', label: 'ADR', align: 'right', render: (row: any) => `€${row.adr}` },
            { key: 'revenue', label: 'RV/MO', align: 'right' },
            {
              key: 'actions',
              label: 'Actions',
              render: (row: any) => (
                <Stack direction="row" spacing={0.75}>
                  <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/listings/${row.id}`)}>Éditer</Button>
                  <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => { setSelectedListing(row as ListingRecord); setQuickEditOpen(true); }}>Quick edit</Button>
                </Stack>
              ),
            },
          ]}
          rows={listingRows}
        />
      )}

      {view === 'map' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '340px 1fr' }, gap: 2 }}>
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Listings filtrés</Typography>
            <Stack spacing={1.25}>
              {filteredListings.map((listing) => (
                <Box key={listing.id} sx={{ p: 1.5, borderRadius: '8px', bgcolor: t.bg2, border: `1px solid ${t.border}` }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{listing.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: t.text3 }}>{listing.city}, {listing.country}</Typography>
                </Box>
              ))}
            </Stack>
          </Panel>
          <Panel sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', minHeight: 520, background: 'radial-gradient(circle at 30% 30%, rgba(230,176,34,0.18), transparent 35%), radial-gradient(circle at 70% 65%, rgba(139,92,246,0.14), transparent 28%), linear-gradient(180deg, #f8f7f2, #f1ede2)' }}>
              {filteredListings.map((listing, index) => (
                <Box key={listing.id} sx={{ position: 'absolute', top: `${18 + index * 12}%`, left: `${20 + (index % 4) * 18}%`, transform: 'translate(-50%, -50%)' }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: listing.status === 'active' ? t.primary : listing.status === 'inactive' ? t.text4 : t.ai, border: '3px solid white', boxShadow: '0 6px 14px rgba(26,20,8,0.18)' }} />
                  <Typography sx={{ mt: 0.75, fontSize: 10.5, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.92)', borderRadius: '99px', px: 1, py: 0.25, border: `1px solid ${t.border}` }}>{listing.city}</Typography>
                </Box>
              ))}
            </Box>
          </Panel>
        </Box>
      )}

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Détails annonce</DialogTitle>
        <DialogContent dividers>
          {selectedListing && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Panel sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Fiche</Typography>
                <Typography sx={{ fontSize: 12 }}>Nom: {selectedListing.name}</Typography>
                <Typography sx={{ fontSize: 12 }}>Owner: {selectedListing.ownerName}</Typography>
                <Typography sx={{ fontSize: 12 }}>Ville: {selectedListing.city}</Typography>
                <Typography sx={{ fontSize: 12 }}>Type: {selectedListing.type}</Typography>
                <Typography sx={{ fontSize: 12 }}>Statut: {selectedListing.status}</Typography>
              </Panel>
              <Panel sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Performance</Typography>
                <Typography sx={{ fontSize: 12 }}>OCC: {selectedListing.occupancy}%</Typography>
                <Typography sx={{ fontSize: 12 }}>ADR: €{selectedListing.adr}</Typography>
                <Typography sx={{ fontSize: 12 }}>Revenu mensuel: €{selectedListing.monthlyRevenue}</Typography>
              </Panel>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
          {selectedListing && <Button onClick={() => navigate(`/listings/${selectedListing.id}`)} sx={btnPrimarySx}>Ouvrir la fiche</Button>}
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={quickEditOpen} onClose={() => setQuickEditOpen(false)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 2 }}>Quick edit listing</Typography>
          {selectedListing && (
            <Stack spacing={2}>
              <TextField label="Nom" size="small" value={selectedListing.name} onChange={(event) => setSelectedListing((prev) => (prev ? { ...prev, name: event.target.value } : prev))} />
              <TextField label="Prix de base" size="small" type="number" value={selectedListing.adr} onChange={(event) => setSelectedListing((prev) => (prev ? { ...prev, adr: Number(event.target.value || 0) } : prev))} />
              <TextField label="Statut" size="small" select value={selectedListing.status} onChange={(event) => setSelectedListing((prev) => (prev ? { ...prev, status: event.target.value as ListingStatus } : prev))}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="draft">Brouillon</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1.5}>
                <Button sx={btnGhostSx} onClick={() => setQuickEditOpen(false)}>Annuler</Button>
                <Button sx={btnPrimarySx} onClick={applyQuickEdit}>Enregistrer</Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import from RU (mock)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Owner" select value={importState.ownerId} onChange={(event) => setImportState((prev) => ({ ...prev, ownerId: event.target.value }))}>
              {owners.map((owner) => <MenuItem key={owner.id} value={owner.id}>{owner.name}</MenuItem>)}
            </TextField>
            <TextField label="Ville" select value={importState.city} onChange={(event) => setImportState((prev) => ({ ...prev, city: event.target.value }))}>
              {['Marrakech', 'Nice', 'Calvi'].map((city) => <MenuItem key={city} value={city}>{city}</MenuItem>)}
            </TextField>
            <TextField label="Nombre de propriétés" type="number" value={importState.count} onChange={(event) => setImportState((prev) => ({ ...prev, count: Number(event.target.value || 1) }))} />
            <TextField label="Préfixe" value={importState.prefix} onChange={(event) => setImportState((prev) => ({ ...prev, prefix: event.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Annuler</Button>
          <Button sx={btnPrimarySx} onClick={handleImportRu}>Importer</Button>
        </DialogActions>
      </Dialog>

      <ActionToast open={toast.open} message={toast.message} severity={toast.severity} onClose={hideToast} />
    </DashboardWrapper>
  );
}
