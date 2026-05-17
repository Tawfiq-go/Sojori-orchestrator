import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { Box, Button, TextField, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  Badge,
  PageHeader,
  Panel,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { listingsService } from '../services/listingsService';
import { RuImportDialog } from '../components/listing/RuImportDialog';
import { useAuth } from '../hooks/useAuth';
import type { ListingStatus, ListingsStats, ListingSummary } from '../types/listings.types';
import { ListingQuickEditDialog } from '../components/listing/ListingQuickEditDialog';

const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ key: 'all' | ListingStatus; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actives' },
  { key: 'inactive', label: 'Inactives' },
  { key: 'draft', label: 'Brouillons' },
];

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #fde68a, #d97706)',
  'linear-gradient(135deg, #a5f3fc, #0e7490)',
  'linear-gradient(135deg, #ddd6fe, #7c3aed)',
  'linear-gradient(135deg, #86efac, #16a34a)',
  'linear-gradient(135deg, #fbcfe8, #db2777)',
];

function getStatusVariant(status: ListingStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'draft') return 'warning';
  return 'neutral';
}

function formatDate(value: string | null): string {
  if (!value) return 'Date indisponible';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('fr-FR');
}

function canCreateListing(role?: string): boolean {
  const r = (role || '').toLowerCase();
  return ['superadmin', 'admin', 'owner', 'worker'].includes(r);
}

function isAdminRole(role?: string): boolean {
  const r = (role || '').toLowerCase();
  return r === 'superadmin' || r === 'admin';
}

function canUpdateListing(role?: string): boolean {
  const r = (role || '').toLowerCase();
  return ['superadmin', 'admin', 'owner', 'worker'].includes(r);
}

function initialStats(): ListingsStats {
  return {
    total: 0,
    active: 0,
    inactive: 0,
    draft: 0,
  };
}

export function ListingsOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const canCreate = canCreateListing(user?.role);
  const canUpdate = canUpdateListing(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [stats, setStats] = useState<ListingsStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [quickEditListing, setQuickEditListing] = useState<ListingSummary | null>(null);
  const [showImportRu, setShowImportRu] = useState(false);
  const [cities, setCities] = useState<Array<{ _id: string; name?: string }>>([]);

  // Initialize statusFilter from URL param ?tab=active/inactive/draft
  const tabParam = searchParams.get('tab') as 'all' | ListingStatus | null;
  const initialStatusFilter = tabParam && ['all', 'active', 'inactive', 'draft'].includes(tabParam) ? tabParam : 'all';
  const [statusFilter, setStatusFilter] = useState<'all' | ListingStatus>(initialStatusFilter);

  const [page, setPage] = useState(0);
  const [totalListings, setTotalListings] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const listingsQueryOptions = useMemo(() => {
    const useActiveFilter = statusFilter === 'active' || statusFilter === 'inactive';
    return {
      page,
      limit: PAGE_SIZE,
      staging: false,
      useActiveFilter,
      active: statusFilter === 'active',
    };
  }, [page, statusFilter]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const statsResult = await listingsService.getStats();
      setStats(statsResult.data);
    } catch {
      /* KPI secondaires — ne bloque pas la liste */
    } finally {
      setStatsLoading(false);
    }
  };

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const listingsResult = await listingsService.getListings(listingsQueryOptions);
      setListings(listingsResult.data.items);
      setTotalListings(listingsResult.data.total);
      if (listingsResult.warning) setWarning(listingsResult.warning);
    } catch (reason: unknown) {
      const message = isAxiosError(reason)
        ? String(
            (reason.response?.data as { message?: string; error?: string })?.message ||
              (reason.response?.data as { error?: string })?.error ||
              reason.message,
          )
        : reason instanceof Error
          ? reason.message
          : 'Erreur lors du chargement des annonces';
      setError(message);
      setListings([]);
      setTotalListings(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    void loadListings();
  }, [listingsQueryOptions]);

  useEffect(() => {
    void listingsService.getCities().then((rows) => {
      setCities(rows.map((c) => ({ _id: c._id, name: c.name })));
    });
  }, []);

  // Sync statusFilter with URL param ?tab=
  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'all' | ListingStatus | null;
    if (tabParam && ['all', 'active', 'inactive', 'draft'].includes(tabParam)) {
      setStatusFilter(tabParam);
    } else if (!tabParam) {
      setStatusFilter('all');
    }
  }, [searchParams]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const haystack = [
        listing.name,
        listing.city,
        listing.country,
        listing.ownerName,
        listing.propertyUnit,
      ]
        .join(' ')
        .toLowerCase();

      if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
      if (statusFilter !== 'all' && listing.status !== statusFilter) return false;
      return true;
    });
  }, [listings, search, statusFilter]);

  const handleListingQuickUpdated = (updated: ListingSummary) => {
    setListings((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces']}>
      {/* Boutons actions en haut */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, justifyContent: 'flex-end' }}>
        <Button sx={btnGhostSx} onClick={() => { void loadStats(); void loadListings(); }}>
          Actualiser
        </Button>
        {canCreate && (
          <Button
            sx={{
              ...btnGhostSx,
              borderColor: '#FF6B35',
              color: '#FF6B35',
              '&:hover': { borderColor: '#E55A2B', bgcolor: 'rgba(255, 107, 53, 0.06)' },
            }}
            onClick={() => setShowImportRu(true)}
          >
            Import from RU
          </Button>
        )}
        {canCreate && (
          <Button sx={btnPrimarySx} onClick={() => navigate('/listings/new')}>
            Créer
          </Button>
        )}
      </Box>

      {warning && !error && (
        <Panel sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>{warning}</Typography>
        </Panel>
      )}

      {error && (
        <Panel sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, color: t.error }}>{error}</Typography>
        </Panel>
      )}

      <Panel sx={{ mb: 2 }}>
        {/* KPI compacts en haut */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 600 }}>
            <span>🏠</span>
            <span style={{ color: t.primaryDeep }}>{stats.total}</span>
            <span style={{ color: t.text3, fontSize: 11 }}>Listings</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 600 }}>
            <span>✅</span>
            <span style={{ color: t.success }}>{stats.active}</span>
            <span style={{ color: t.text3, fontSize: 11 }}>Actifs</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 600 }}>
            <span>⏸</span>
            <span style={{ color: t.text3 }}>{stats.inactive}</span>
            <span style={{ color: t.text3, fontSize: 11 }}>Inactifs</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 600 }}>
            <span>📝</span>
            <span style={{ color: '#b45309' }}>{stats.draft}</span>
            <span style={{ color: t.text3, fontSize: 11 }}>Brouillons</span>
          </Box>
        </Box>

        {/* Recherche + Filtres sur la même ligne */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Rechercher une annonce"
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ flex: 1, minWidth: 240, maxWidth: 360 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.key}
                sx={statusFilter === filter.key ? btnPrimarySx : btnGhostSx}
                onClick={() => {
                  setStatusFilter(filter.key);
                  setPage(0);
                  if (filter.key === 'all') {
                    searchParams.delete('tab');
                  } else {
                    searchParams.set('tab', filter.key);
                  }
                  setSearchParams(searchParams);
                }}
              >
                {filter.label}
              </Button>
            ))}
          </Box>
        </Box>
      </Panel>

      <Panel title="Listings" desc={loading ? 'Chargement...' : `${filteredListings.length} entrée(s)`}>
        {loading ? (
          <Typography sx={{ py: 6, textAlign: 'center', color: t.text3 }}>Chargement des annonces...</Typography>
        ) : filteredListings.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ color: t.text3 }}>
              {listings.length === 0
                ? 'Aucune annonce retournée par l’API.'
                : `Aucune annonce pour le filtre « ${statusFilter} » (${listings.length} au total).`}
            </Typography>
            {listings.length > 0 && statusFilter !== 'all' && (
              <Button sx={{ ...btnGhostSx, mt: 2 }} onClick={() => {
                setStatusFilter('all');
                searchParams.delete('tab');
                setSearchParams(searchParams);
              }}>
                Voir toutes les annonces
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {filteredListings.map((listing, index) => {
              const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
              return (
                <Box
                  key={listing.id}
                  sx={{
                    border: `1px solid ${t.border}`,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: t.bg1,
                    boxShadow: '0 8px 24px rgba(26,20,8,0.06)',
                  }}
                >
                  <Box
                    sx={{
                      height: 180,
                      position: 'relative',
                      background: listing.coverImageUrl
                        ? `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.40)), url(${listing.coverImageUrl}) center/cover`
                        : gradient,
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                      <Badge variant={getStatusVariant(listing.status)}>{listing.status}</Badge>
                    </Box>
                  </Box>

                  <Box sx={{ p: 2 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: t.text }}>{listing.name}</Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 12, color: t.text3, fontFamily: 'Geist Mono' }}>
                      {listing.city || 'Ville inconnue'} · {listing.country || 'Pays inconnu'}
                    </Typography>
                    <Typography sx={{ mt: 1.25, fontSize: 12.5, color: t.text2 }}>
                      Owner: {listing.ownerName}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 12.5, color: t.text2 }}>
                      Type: {listing.propertyUnit}
                    </Typography>
                    {isAdmin && listing.rentalUnitedIds?.length > 0 && (
                      <Typography sx={{ mt: 0.75, fontSize: 11, fontWeight: 600, color: '#f97316' }}>
                        RU #{listing.rentalUnitedIds.join(', #')}
                      </Typography>
                    )}
                    <Typography sx={{ mt: 0.5, fontSize: 12.5, color: t.text2 }}>
                      Channel manager: {listing.channelManager || 'Non défini'}
                    </Typography>
                    <Typography sx={{ mt: 0.75, fontSize: 11.5, color: t.text3, fontFamily: 'Geist Mono' }}>
                      Maj: {formatDate(listing.updatedAt)}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {canUpdate && (
                        <Button
                          size="small"
                          sx={{
                            minWidth: 0,
                            px: 0.5,
                            textTransform: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#00b4b4',
                          }}
                          onClick={() => setQuickEditListing(listing)}
                        >
                          Quick edit
                        </Button>
                      )}
                      <Button sx={btnPrimarySx} onClick={() => navigate(`/catalogue/listings/${listing.id}`)}>
                        Voir détail
                      </Button>
                      <Button sx={btnGhostSx} onClick={() => navigate(`/listings/${listing.id}`)}>
                        Formulaire
                      </Button>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Panel>

        {!loading && totalListings > PAGE_SIZE && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: 12, color: t.text3 }}>
              Page {page + 1} · {totalListings} annonce(s)
              {statsLoading ? '' : ` · ${stats.total} total (stats)`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button sx={btnGhostSx} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Précédent
              </Button>
              <Button
                sx={btnGhostSx}
                disabled={(page + 1) * PAGE_SIZE >= totalListings}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </Box>
          </Box>
        )}
      <RuImportDialog
        open={showImportRu}
        onClose={() => setShowImportRu(false)}
        cities={cities}
        onImported={() => {
          setShowImportRu(false);
          void loadListings(); void loadStats();
        }}
      />
      <ListingQuickEditDialog
        open={Boolean(quickEditListing)}
        listing={quickEditListing}
        onClose={() => setQuickEditListing(null)}
        onUpdated={handleListingQuickUpdated}
      />
    </DashboardWrapper>
  );
}

export default ListingsOverviewPage;
