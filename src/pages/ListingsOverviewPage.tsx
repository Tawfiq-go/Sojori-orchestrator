import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { toast } from 'react-toastify';
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
import { ImportAirbnbModalContainer } from '../components/listing/import-airbnb';
import { useAuth } from '../hooks/useAuth';
import type { ListingStatus, ListingsStats, ListingSummary } from '../types/listings.types';
import { ListingQuickEditDialog } from '../components/listing/ListingQuickEditDialog';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';

const PAGE_SIZE = 20;

type ListingsTab = 'active' | 'inactive';

const STATUS_FILTERS: Array<{ key: ListingsTab; label: string }> = [
  { key: 'active', label: 'Actives' },
  { key: 'inactive', label: 'Inactives' },
];

function parseListingsTab(raw: string | null): ListingsTab {
  return raw === 'inactive' ? 'inactive' : 'active';
}

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

function formatRuIdsLabel(ids: string[] | undefined): string | null {
  const clean = (ids || []).map((id) => String(id).trim()).filter(Boolean);
  if (!clean.length) return null;
  return `RU #${clean.join(', #')}`;
}

function normalizeAuthRole(role?: string): string {
  return String(role || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');
}

function canCreateListing(role?: string): boolean {
  const r = normalizeAuthRole(role);
  return ['superadmin', 'admin', 'owner', 'worker', 'staff'].includes(r) || !r;
}

function isAdminRole(role?: string): boolean {
  const r = normalizeAuthRole(role);
  return r === 'superadmin' || r === 'admin' || r === 'super_admin';
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
  /** Toujours afficher sur la liste — l’API quick-edit applique les droits côté srv-listing. */
  const showQuickEdit = true;
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
  const [otaAuditListingId, setOtaAuditListingId] = useState<string | null>(null);

  // ?tab=active|inactive — défaut actives (jamais « tous »)
  const [statusFilter, setStatusFilter] = useState<ListingsTab>(() =>
    parseListingsTab(searchParams.get('tab')),
  );

  const [page, setPage] = useState(0);
  const [totalListings, setTotalListings] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const listingsQueryOptions = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      staging: false,
      useActiveFilter: true,
      active: statusFilter === 'active',
    }),
    [page, statusFilter],
  );

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
    void listingsService.getCities({ allCities: true, limit: 2000 }).then((rows) => {
      setCities(rows.map((c) => ({ _id: c._id, name: c.name })));
    });
  }, []);

  // URL : toujours ?tab=active ou ?tab=inactive
  useEffect(() => {
    const tab = parseListingsTab(searchParams.get('tab'));
    if (searchParams.get('tab') !== tab) {
      setSearchParams({ tab }, { replace: true });
      return;
    }
    setStatusFilter(tab);
  }, [searchParams, setSearchParams]);

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
      if (listing.status !== statusFilter) return false;
      return true;
    });
  }, [listings, search, statusFilter]);

  const handleListingQuickUpdated = (updated: ListingSummary) => {
    setListings((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  };

  const handleOtaQuickAudit = async (listingId: string) => {
    setOtaAuditListingId(listingId);
    try {
      const result = await listingsService.verifyOtaChannels(listingId);
      if (result.success) {
        toast.success('Audit OTA terminé — canaux Airbnb / Booking mis à jour.');
      } else {
        toast.error(result.error || 'Échec de l’audit OTA');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de l’audit OTA');
    } finally {
      setOtaAuditListingId(null);
    }
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces']}>
      <CatalogueAnnoncesTabs />
      {/* Boutons actions en haut */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, justifyContent: 'flex-end' }}>
        <Button sx={btnGhostSx} onClick={() => { void loadStats(); void loadListings(); }}>
          Actualiser
        </Button>
        {canCreate && (
          <Button
            sx={{
              ...btnGhostSx,
              borderColor: '#E6B022',
              color: '#E6B022',
              '&:hover': { borderColor: '#B8881A', bgcolor: 'rgba(255, 107, 53, 0.06)' },
            }}
            onClick={() => setShowImportRu(true)}
          >
            Import Airbnb
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
                  searchParams.set('tab', filter.key);
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
                : `Aucune annonce ${statusFilter === 'active' ? 'active' : 'inactive'}.`}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {filteredListings.map((listing, index) => {
              const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
              const ruLabel = formatRuIdsLabel(listing.rentalUnitedIds);
              const otaAuditing = otaAuditListingId === listing.id;
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
                      Propriétaire : {listing.ownerName}
                    </Typography>
                    {ruLabel && (
                      <Typography
                        sx={{ mt: 0.5, fontSize: 11.5, fontWeight: 700, color: '#f97316', fontFamily: 'Geist Mono' }}
                      >
                        {ruLabel}
                      </Typography>
                    )}
                    <Typography sx={{ mt: 0.5, fontSize: 12.5, color: t.text2 }}>
                      Type : {listing.propertyUnit}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 12.5, color: t.text2 }}>
                      Channel manager: {listing.channelManager || 'Non défini'}
                    </Typography>
                    <Typography sx={{ mt: 0.75, fontSize: 11.5, color: t.text3, fontFamily: 'Geist Mono' }}>
                      Maj: {formatDate(listing.updatedAt)}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {showQuickEdit && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
                          onClick={() => setQuickEditListing(listing)}
                          sx={{
                            textTransform: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            bgcolor: '#00b4b4',
                            color: '#fff',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#009999', boxShadow: '0 2px 8px rgba(0,180,180,0.35)' },
                          }}
                        >
                          Quick edit
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="small"
                          disabled={otaAuditing}
                          sx={{
                            minWidth: 0,
                            px: 0.5,
                            textTransform: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            color: t.primaryDeep,
                          }}
                          onClick={() => void handleOtaQuickAudit(listing.id)}
                          startIcon={otaAuditing ? <CircularProgress size={12} color="inherit" /> : undefined}
                        >
                          {otaAuditing ? 'Audit…' : 'Audit OTA'}
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
      <ImportAirbnbModalContainer
        open={showImportRu}
        initialCities={cities}
        onClose={() => setShowImportRu(false)}
        onImported={() => {
          void loadListings();
          void loadStats();
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
