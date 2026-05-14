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

export function ListingsPage() {
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
  const [importState, setImportState] = useState<ImportState>(() => ({
    ownerId: getStoredOwners()[0]?.id || '',
    city: 'Marrakech',
    count: 2,
    prefix: 'Imported RU',
  }));

  const owners = useMemo(() => getStoredOwners().filter((item) => item.role === 'owner'), []);
  const countries = useMemo(
    () => Array.from(new Set(listings.map((listing) => listing.country))).sort(),
    [listings],
  );
  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          listings
            .filter((listing) => countryFilter === 'all' || listing.country === countryFilter)
            .map((listing) => listing.city),
        ),
      ).sort(),
    [countryFilter, listings],
  );
  const types = useMemo(
    () => Array.from(new Set(listings.map((listing) => listing.type))).sort(),
    [listings],
  );

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const haystack = [
        listing.name,
        listing.city,
        listing.country,
        listing.ownerName,
        listing.type,
      ]
        .join(' ')
        .toLowerCase();

      if (search && !haystack.includes(search.toLowerCase())) {
        return false;
      }
      if (isAdmin && ownerFilter !== 'all' && listing.ownerId !== ownerFilter) {
        return false;
      }
      if (countryFilter !== 'all' && listing.country !== countryFilter) {
        return false;
      }
      if (cityFilter !== 'all' && listing.city !== cityFilter) {
        return false;
      }
      if (typeFilter !== 'all' && listing.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== 'all' && listing.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [cityFilter, countryFilter, isAdmin, listings, ownerFilter, search, statusFilter, typeFilter]);

  const persistListings = (nextListings: ListingRecord[], message: string) => {
    setListings(nextListings);
    saveStoredListings(nextListings);
    showToast(message);
  };

  const openQuickEdit = (listing: ListingRecord) => {
    setSelectedListing(listing);
    setQuickEditOpen(true);
  };

  const applyQuickEdit = (patch: Partial<ListingRecord>) => {
    if (!selectedListing) {
      return;
    }

    const nextListings = listings.map((listing) => {
      if (listing.id !== selectedListing.id) {
        return listing;
      }

      const next = structuredClone(listing);
      if (patch.name) {
        next.name = patch.name;
        next.form.basic.name = patch.name;
      }
      if (patch.status) {
        next.status = patch.status;
        next.form.basic.status = patch.status;
      }
      if (typeof patch.adr === 'number') {
        next.adr = patch.adr;
        next.form.pricing.basePrice = patch.adr;
      }
      next.updatedAt = new Date().toISOString();
      return next;
    });

    persistListings(nextListings, 'Annonce mise à jour via quick edit');
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
          onChange={(value) => setView(value as ViewMode)}
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
          placeholder="Quick search: nom, ville, owner, type…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{
            maxWidth: 420,
            '& .MuiOutlinedInput-root': {
              bgcolor: t.bg1,
              borderRadius: '8px',
            },
          }}
        />
      </Box>

      <FilterBar>
        <FilterChip
          label={statusFilter === 'all' ? 'Tous statuts' : statusFilter === 'active' ? 'Actives' : statusFilter === 'inactive' ? 'Inactives' : 'Brouillons'}
          active
          dropdown
          onClick={() =>
            setStatusFilter((prev) =>
              prev === 'active' ? 'inactive' : prev === 'inactive' ? 'draft' : prev === 'draft' ? 'all' : 'active',
            )
          }
        />
        {isAdmin && (
          <FilterChip
            label={ownerFilter === 'all' ? 'Owner' : owners.find((item) => item.id === ownerFilter)?.name || 'Owner'}
            active={ownerFilter !== 'all'}
            dropdown
            onClick={() => setOwnerFilter('all')}
          />
        )}
        <FilterChip
          label={countryFilter === 'all' ? 'Country' : countryFilter}
          active={countryFilter !== 'all'}
          dropdown
          onClick={() => setCountryFilter('all')}
        />
        <FilterChip
          label={cityFilter === 'all' ? 'City' : cityFilter}
          active={cityFilter !== 'all'}
          dropdown
          onClick={() => setCityFilter('all')}
        />
        <FilterChip
          label={typeFilter === 'all' ? 'Type' : typeFilter}
          active={typeFilter !== 'all'}
          dropdown
          onClick={() => setTypeFilter('all')}
        />
      </FilterBar>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {isAdmin &&
          owners.map((owner) => (
            <Button
              key={owner.id}
              onClick={() => setOwnerFilter((prev) => (prev === owner.id ? 'all' : owner.id))}
              sx={{
                ...btnGhostSx,
                ...(ownerFilter === owner.id ? { bgcolor: t.primaryTint } : {}),
              }}
            >
              {owner.name}
            </Button>
          ))}
        {countries.map((country) => (
          <Button
            key={country}
            onClick={() => {
              setCountryFilter((prev) => (prev === country ? 'all' : country));
              setCityFilter('all');
            }}
            sx={{ ...btnGhostSx, ...(countryFilter === country ? { bgcolor: t.primaryTint } : {}) }}
          >
            {country}
          </Button>
        ))}
        {cities.map((city) => (
          <Button
            key={city}
            onClick={() => setCityFilter((prev) => (prev === city ? 'all' : city))}
            sx={{ ...btnGhostSx, ...(cityFilter === city ? { bgcolor: t.primaryTint } : {}) }}
          >
            {city}
          </Button>
        ))}
        {types.map((type) => (
          <Button
            key={type}
            onClick={() => setTypeFilter((prev) => (prev === type ? 'all' : type))}
            sx={{ ...btnGhostSx, ...(typeFilter === type ? { bgcolor: t.primaryTint } : {}) }}
          >
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
                  rating={
                    listing.reviewCount > 0
                      ? `${listing.rating.toFixed(2)} · ${listing.reviewCount} avis`
                      : 'Brouillon'
                  }
                  occupancy={`${listing.occupancy}%`}
                  adr={`€${listing.adr}`}
                  monthlyRev={`€${Math.round(listing.monthlyRevenue / 1000)}k`}
                  channels={listing.channels.map((channel) => channel.id)}
                  draft={listing.status === 'draft'}
                  draftAction={{ onClick: () => navigate(`/listings/${listing.id}`) }}
                />
              </div>
              <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => { setSelectedListing(listing); setDetailOpen(true); }}>
                  Détails
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/listings/${listing.id}`)}>
                  Éditer
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/tasks?listing=${listing.id}`)}>
                  Tâches
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/calendar?listing=${listing.id}`)}>
                  Calendrier
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => openQuickEdit(listing)}>
                  Quick edit
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => showToast(`Sync OTA lancée pour ${listing.name}`)}>
                  Sync OTA
                </Button>
              </Stack>
            </Box>
          ))}
        </ListingsGrid>
      )}

      {view === 'table' && (
        <DataTable
          columns={[
            { key: 'name', label: 'Annonce', render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.name}</Typography> },
            { key: 'owner', label: 'Owner', render: (row) => <Typography sx={{ fontSize: 12 }}>{row.owner}</Typography> },
            { key: 'city', label: 'Ville' },
            { key: 'country', label: 'Pays' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Statut' },
            { key: 'occupancy', label: 'OCC', align: 'right', render: (row) => `${row.occupancy}%` },
            { key: 'adr', label: 'ADR', align: 'right', render: (row) => `€${row.adr}` },
            { key: 'revenue', label: 'RV/MO', align: 'right' },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <Stack direction="row" spacing={0.75}>
                  <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/listings/${row.id}`)}>Éditer</Button>
                  <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => openQuickEdit(row)}>Quick edit</Button>
                </Stack>
              ),
            },
          ]}
          rows={listingRows}
        />
      )}

      {view === 'map' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '340px 1fr' },
            gap: 2,
          }}
        >
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Listings filtrés</Typography>
            <Stack spacing={1.25}>
              {filteredListings.map((listing) => (
                <Box
                  key={listing.id}
                  sx={{
                    p: 1.5,
                    borderRadius: '8px',
                    bgcolor: t.bg2,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{listing.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: t.text3 }}>
                    {listing.city}, {listing.country}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Panel>
          <Panel sx={{ p: 0, overflow: 'hidden' }}>
            <Box
              sx={{
                position: 'relative',
                minHeight: 520,
                background:
                  'radial-gradient(circle at 30% 30%, rgba(230,176,34,0.18), transparent 35%), radial-gradient(circle at 70% 65%, rgba(139,92,246,0.14), transparent 28%), linear-gradient(180deg, #f8f7f2, #f1ede2)',
              }}
            >
              {filteredListings.map((listing, index) => (
                <Box
                  key={listing.id}
                  sx={{
                    position: 'absolute',
                    top: `${18 + index * 12}%`,
                    left: `${20 + (index % 4) * 18}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      bgcolor: listing.status === 'active' ? t.primary : listing.status === 'inactive' ? t.text4 : t.ai,
                      border: '3px solid white',
                      boxShadow: '0 6px 14px rgba(26,20,8,0.18)',
                    }}
                  />
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontSize: 10.5,
                      fontWeight: 700,
                      bgcolor: 'rgba(255,255,255,0.92)',
                      borderRadius: '99px',
                      px: 1,
                      py: 0.25,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    {listing.city}
                  </Typography>
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
                <Typography sx={{ fontSize: 12 }}>
                  Rating: {selectedListing.rating.toFixed(2)} ({selectedListing.reviewCount} avis)
                </Typography>
              </Panel>
              <Panel sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Description</Typography>
                <Typography sx={{ fontSize: 12, color: t.text3 }}>
                  {selectedListing.form.basic.longDescription}
                </Typography>
              </Panel>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
          {selectedListing && (
            <Button onClick={() => navigate(`/listings/${selectedListing.id}`)} sx={btnPrimarySx}>
              Ouvrir la fiche
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={quickEditOpen} onClose={() => setQuickEditOpen(false)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 2 }}>Quick edit listing</Typography>
          {selectedListing && (
            <Stack spacing={2}>
              <TextField
                label="Nom"
                size="small"
                defaultValue={selectedListing.name}
                onChange={(event) =>
                  setSelectedListing((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
              />
              <TextField
                label="Prix de base"
                size="small"
                type="number"
                defaultValue={selectedListing.adr}
                onChange={(event) =>
                  setSelectedListing((prev) => (prev ? { ...prev, adr: Number(event.target.value || 0) } : prev))
                }
              />
              <TextField
                label="Statut"
                size="small"
                select
                value={selectedListing.status}
                onChange={(event) =>
                  setSelectedListing((prev) =>
                    prev ? { ...prev, status: event.target.value as ListingStatus } : prev,
                  )
                }
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="draft">Brouillon</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1.5}>
                <Button sx={btnGhostSx} onClick={() => setQuickEditOpen(false)}>
                  Annuler
                </Button>
                <Button
                  sx={btnPrimarySx}
                  onClick={() =>
                    selectedListing &&
                    applyQuickEdit({
                      name: selectedListing.name,
                      adr: selectedListing.adr,
                      status: selectedListing.status,
                    })
                  }
                >
                  Enregistrer
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import from RU (mock)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Owner"
              select
              value={importState.ownerId}
              onChange={(event) => setImportState((prev) => ({ ...prev, ownerId: event.target.value }))}
            >
              {owners.map((owner) => (
                <MenuItem key={owner.id} value={owner.id}>
                  {owner.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Ville"
              select
              value={importState.city}
              onChange={(event) => setImportState((prev) => ({ ...prev, city: event.target.value }))}
            >
              {['Marrakech', 'Nice', 'Calvi'].map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nombre de propriétés"
              type="number"
              value={importState.count}
              onChange={(event) =>
                setImportState((prev) => ({ ...prev, count: Number(event.target.value || 1) }))
              }
            />
            <TextField
              label="Préfixe"
              value={importState.prefix}
              onChange={(event) => setImportState((prev) => ({ ...prev, prefix: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Annuler</Button>
          <Button sx={btnPrimarySx} onClick={handleImportRu}>
            Importer
          </Button>
        </DialogActions>
      </Dialog>

      <ActionToast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </DashboardWrapper>
  );
}
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, FilterBar, FilterChip, ViewToggle, ListingsGrid, ListingCard,
  btnGhostSx, btnSmSx, btnPrimarySx,
} from '../components/dashboard/DashboardV2.components';
import { Button } from '@mui/material';

export function ListingsPage() {
  const navigate = useNavigate();

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces']}>
      <PageHeader title="Annonces" count="42 actives">
        <ViewToggle
          options={[{value:'grid', label:'Grid'}, {value:'table', label:'Table'}, {value:'map', label:'Map'}]}
          value="grid"
        />
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>📥 Import OTA</Button>
        <Button sx={btnPrimarySx}>+ Nouvelle annonce</Button>
      </PageHeader>

      <FilterBar>
        <FilterChip label="Actives" active dropdown />
        <FilterChip label="Type" dropdown />
        <FilterChip label="Ville" dropdown />
        <FilterChip label="Performance" dropdown />
      </FilterBar>

      <ListingsGrid>
        <div onClick={() => navigate('/listings/villa-belvedere')}>
          <ListingCard photoColor="gold" name="Villa Belvédère" place="NICE · CÔTE D'AZUR · 4ch · 240m²"
            rating="4.92 · 47 avis" occupancy="87%" adr="€280" monthlyRev="€18k"
            channels={['airbnb', 'booking', 'vrbo', 'direct']} />
        </div>
        <div onClick={() => navigate('/listings/dar-sojori')}>
          <ListingCard photoColor="blue" name="Dar Sojori" place="MARRAKECH · MÉDINA · 6ch · riad"
            rating="4.85 · 32 avis" occupancy="92%" adr="€180" monthlyRev="€14k"
            channels={['airbnb', 'booking']} />
        </div>
        <div onClick={() => navigate('/listings/villa-atlas')}>
          <ListingCard photoColor="purple" name="Villa Atlas" place="MARRAKECH · PALMERAIE · 5ch · 320m²"
            rating="4.95 · 28 avis" occupancy="91%" adr="€420" monthlyRev="€22k"
            channels={['airbnb', 'booking', 'direct']} />
        </div>
        <ListingCard photoColor="green" name="Atlas Loft" place="MARRAKECH · GUÉLIZ · 2ch · 110m²"
          rating="4.78 · 19 avis" occupancy="78%" adr="€110" monthlyRev="€8k"
          channels={['airbnb']} />
        <ListingCard photoColor="pink" name="Médina House" place="MARRAKECH · MOUASSINE · 3ch · 145m²"
          rating="4.88 · 24 avis" occupancy="83%" adr="€145" monthlyRev="€11k"
          channels={['airbnb', 'booking', 'vrbo']} />
        <ListingCard photoColor="gold" draft name="Studio Côte Bleue" place="CALVI · CENTRE · 1ch · 45m² ✨ AI"
          draftAction={{ onClick: () => console.log('Finalize AI') }} />
      </ListingsGrid>
    </DashboardWrapper>
  );
}
