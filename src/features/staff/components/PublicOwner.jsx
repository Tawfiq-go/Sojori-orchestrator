import React, { useState, useEffect, useMemo } from 'react';
import { CircularProgress, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Box, Paper, Stack, IconButton, TextField, Alert } from '@mui/material';
import EditOffIcon from '@mui/icons-material/EditOff';
import { toast } from 'react-toastify';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import BusinessIcon from '@mui/icons-material/Business';
import AdminFilter from './AdminFilter';
import CreateOwnerSidebar from './CreateOwnerSidebar';
import UpdateOwnerSidebar from './UpdateOwnerSidebar';
import TableLoading from 'components/TableLoading/TableLoadign';
import { getOwners } from '../../../services/teamDashboardApi';
import { getCities, updateFillCompany, deleteOwner, getOwnerRuLoginCredentials, syncOwnersRuIds, applyOwnersRuIdsSync } from '../services/serverApi.task';
import { getListingsWithChannelMetrics } from 'features/tasks/services/serverApi.task';
import { Chip, Popover, Tooltip, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { RemoveRedEye } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SyncIcon from '@mui/icons-material/Sync';
import { ToastContainer } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import OwnerFilter from './OwnerFilter';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { Users, Milestone } from 'lucide-react';
import { useTeamViewMode } from '../../../context/TeamViewContext';
import { PropertyManagerHubView } from '../../../components/team/PropertyManagerHubView';
import { TEAM_T } from '../../../components/team/teamHubTokens';
const SOJORI = {
  orange: '#E6B022',
  orangeDark: '#B8881A',
  orangeSoft: 'rgba(255, 107, 53, 0.12)',
  teal: '#00b4b4',
  ink: '#0c0c0f',
  chrome: '#121218',
  chrome2: '#1a1a22',
  line: 'rgba(255,255,255,0.08)',
  panel: '#ffffff',
  muted: '#64748b',
  paper: '#f8f8fa',
  error: '#F44336'
};
const FONT = "'Poppins', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
function normalizeOwnerId(ownerId) {
  if (!ownerId) return '';
  const raw = typeof ownerId === 'object' && ownerId !== null ? ownerId._id ?? ownerId.id : ownerId;
  return String(raw);
}
const PublicOwner = ({
  insidePageShell = false,
  /** Sous-onglet URL (`?tab=`) — ex. `list` ; réservé pour futures vues. */
  ownerTab: _ownerTab = 'list',
} = {}) => {
  const {
    t
  } = useTranslation('common');
  const navigate = useNavigate();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [viewOwnerDialog, setViewOwnerDialog] = useState(false);
  const [viewCompanyDialog, setViewCompanyDialog] = useState(false);
  const [viewLegalDialog, setViewLegalDialog] = useState(false);
  const [viewDialogData, setViewDialogData] = useState(null);
  const [deletedFilter, setDeletedFilter] = useState('false');
  const [bannedFilter, setBannedFilter] = useState('false');
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState(null);
  const [ruCredOpen, setRuCredOpen] = useState(false);
  const [ruCredOwner, setRuCredOwner] = useState(null);
  const [ruCredData, setRuCredData] = useState(null);
  const [ruCredLoading, setRuCredLoading] = useState(false);
  const [ruCredError, setRuCredError] = useState('');
  const [listings, setListings] = useState([]);
  const [selectedListings, setSelectedListings] = useState([]);
  const [syncDialog, setSyncDialog] = useState(false);
  const [syncData, setSyncData] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedSyncOwners, setSelectedSyncOwners] = useState([]);
  const [xmlPreviewDialog, setXmlPreviewDialog] = useState(false);
  const [xmlPreviewData, setXmlPreviewData] = useState(null);
  const [xmlPreviewLoading, setXmlPreviewLoading] = useState(false);
  const [pendingArchiveOwner, setPendingArchiveOwner] = useState(null);

  const authUser = useSelector((state) => state.auth?.user);
  const isPlatformAdmin = hasAdminAccess(authUser?.role);
  const canCreate = useMemo(() => isPlatformAdmin, [isPlatformAdmin]);
  const canUpdate = useMemo(() => isPlatformAdmin, [isPlatformAdmin]);
  const canDelete = useMemo(() => isPlatformAdmin, [isPlatformAdmin]);
  useEffect(() => {
    fetchOwners();
    fetchCities();
    fetchListings();
  }, [page, limit, deletedFilter, bannedFilter, searchText, selectedListings]);
  const fetchOwners = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        deleted: deletedFilter === 'true',
        banned: bannedFilter === 'true',
        search_text: searchText
      };
      if (selectedListings && selectedListings.length > 0) {
        params.listings = selectedListings;
      }
      const response = await getOwners(params);
      if (response && response.data) {
        setOwners(response.data);
        const total = response.total || 0;
        setTotalCount(total);
        setIsNextDisabled(total === 0 || (page + 1) * limit >= total);
      } else {
        setOwners([]);
        setTotalCount(0);
        setIsNextDisabled(true);
      }
    } catch (error) {
      setOwners([]);
      setTotalCount(0);
      setIsNextDisabled(true);
    } finally {
      setLoading(false);
    }
  };
  const fetchCities = async () => {
    setLoadingCities(true);
    try {
      const response = await getCities({
        limit: 200,
        paged: false
      });
      setCities(response || []);
    } catch (error) {} finally {
      setLoadingCities(false);
    }
  };
  const fetchListings = async () => {
    try {
      const response = await getListingsWithChannelMetrics();
      setListings(response || []);
    } catch (error) {}
  };
  const onOwnerCreated = async newOwner => {
    toast.success(t('Owner created successfully'));
    await fetchOwners();
  };
  const onOwnerUpdated = updatedOwner => {
    setOwners(prevOwners => prevOwners.map(owner => owner._id === updatedOwner._id ? {
      ...owner,
      ...updatedOwner
    } : owner));
    toast.success(t('Owner updated successfully'));
  };
  const handleUpdate = owner => {
    if (!canUpdate) return;
    setSelectedOwner(owner);
    setOpenUpdateDialog(true);
  };
  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleLimitChange = newLimit => {
    setLimit(newLimit);
    setPage(0);
  };
  const handleStatusClick = (event, rowData) => {
    setStatusAnchorEl(event.currentTarget);
    setSelectedStatus(rowData);
  };
  const handleStatusClose = () => {
    setStatusAnchorEl(null);
    setSelectedStatus(null);
  };
  const handleFilterChange = (key, value) => {
    setPage(0); // Reset to first page when filters change
  };
  const handleSearchOwner = event => {
    setSearchText(event.target.value);
    setPage(0);
  };
  const handleSearch = () => {
    fetchOwners();
  };
  const handleReset = () => {
    setSearchText('');
    setSelectedListings([]);
    setPage(0);
  };
  // Handlers pour afficher les 3 dialogues en lecture seule
  const handleViewOwner = owner => {
    setViewDialogData(owner);
    setViewOwnerDialog(true);
  };

  const handleViewCompany = owner => {
    setViewDialogData(owner);
    setViewCompanyDialog(true);
  };

  const handleViewLegal = owner => {
    setViewDialogData(owner);
    setViewLegalDialog(true);
  };

  const handleDelete = owner => {
    if (!canDelete) return;
    setOwnerToDelete(owner);
    setDeleteDialog(true);
  };
  const handleDeleteConfirm = async () => {
    if (ownerToDelete) {
      try {
        const res = await deleteOwner(ownerToDelete._id);
        toast.success(t('Owner deleted successfully'));
        const ext = res?.rentalUnitedArchive;
        if (res?.warning) {
          toast.warning(res.warning);
        } else if (ext?.idempotentRuSuccess) {
          toast.info(t('delete_owner_ru_idempotent_toast'));
        } else if (ext?.message && ext?.attempted === false) {
          toast.info(ext.message);
        } else if (ext?.success === false && ext?.message) {
          toast.warning(ext.message);
        }
        await fetchOwners();
        setDeleteDialog(false);
        setOwnerToDelete(null);
      } catch (error) {
        let errorMessage = t('Error deleting owner');
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        toast.error(errorMessage);
        setDeleteDialog(false);
        setOwnerToDelete(null);
      }
    }
  };
  const handleDeleteCancel = () => {
    setDeleteDialog(false);
    setOwnerToDelete(null);
  };
  const handleRuCredentialsClick = async owner => {
    const id = normalizeOwnerId(owner?._id);
    if (!id) return;
    setRuCredOwner(owner);
    setRuCredOpen(true);
    setRuCredData(null);
    setRuCredError('');
    setRuCredLoading(true);
    try {
      const res = await getOwnerRuLoginCredentials(id);
      if (res?.success && res.data) {
        setRuCredData(res.data);
      } else {
        setRuCredError(res?.error || '—');
      }
    } catch (e) {
      setRuCredError(e?.message || '—');
    } finally {
      setRuCredLoading(false);
    }
  };
  const handleRuCredClose = () => {
    setRuCredOpen(false);
    setRuCredOwner(null);
    setRuCredData(null);
    setRuCredError('');
  };
  const handleSyncOwners = async () => {
    setSyncLoading(true);
    try {
      const res = await syncOwnersRuIds();
      if (res?.success && res.data) {
        setSyncData(res.data);
        const allIds = (res.data.ownersToSync || []).map(o => o.accountId);
        setSelectedSyncOwners(allIds);
        setSyncDialog(true);
      } else {
        toast.error(res?.message || t('Failed to fetch sync data'));
      }
    } catch (e) {
      toast.error(e?.message || t('Failed to fetch sync data'));
    } finally {
      setSyncLoading(false);
    }
  };
  const handleSyncClose = () => {
    setSyncDialog(false);
    setSyncData(null);
    setSelectedSyncOwners([]);
  };
  const handleSyncApply = async () => {
    if (selectedSyncOwners.length === 0) {
      toast.warning(t('Please select at least one owner to sync'));
      return;
    }
    setSyncLoading(true);
    try {
      const res = await applyOwnersRuIdsSync(selectedSyncOwners);
      if (res?.success) {
        toast.success(t('Sync completed: ') + (res.data?.updated || 0) + t(' owners updated'));
        if (res.data?.errors > 0) {
          toast.warning(t('Errors: ') + res.data.errors);
        }
        await fetchOwners();
        handleSyncClose();
      } else {
        toast.error(res?.message || t('Sync failed'));
      }
    } catch (e) {
      toast.error(e?.message || t('Sync failed'));
    } finally {
      setSyncLoading(false);
    }
  };
  const handleRepairSingle = async (accountId) => {
    setSyncLoading(true);
    try {
      const res = await applyOwnersRuIdsSync([accountId]);
      if (res?.success) {
        toast.success(t('Owner repaired successfully'));
        await handleSyncOwners(); // Refresh dialog data
        await fetchOwners(); // Refresh main table
      } else {
        toast.error(res?.message || t('Repair failed'));
      }
    } catch (e) {
      toast.error(e?.message || t('Repair failed'));
    } finally {
      setSyncLoading(false);
    }
  };
  const handleArchiveSingle = async (ruOwnerId, owner) => {
    // ⚠️ CRITICAL SAFETY: Validation stricte avant archivage
    // Incident référence: INCIDENT_2026-04-30_DELETE_OWNER_BUG.md
    if (!ruOwnerId) {
      toast.error(t('Invalid RU Owner ID'));
      return;
    }

    // ✅ Vérifier que l'owner existe dans Sojori (a un accountId)
    if (!owner || !owner.accountId) {
      toast.error(t('Cannot archive: Owner not found in Sojori database. This owner only exists in Rental United.'));
      return;
    }

    // ✅ Étape 1: Charger le preview XML
    setXmlPreviewLoading(true);
    setXmlPreviewDialog(true);
    setPendingArchiveOwner({ ruOwnerId, owner });

    try {
      const { previewArchiveChannelsRuUserOwner } = await import('../../channels/api/channelsDashboardApi');
      const res = await previewArchiveChannelsRuUserOwner(ruOwnerId);

      if (res?.data?.success && res.data.data) {
        setXmlPreviewData(res.data.data);
      } else {
        toast.error(res?.data?.message || t('Failed to generate XML preview'));
        setXmlPreviewDialog(false);
        setPendingArchiveOwner(null);
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.message || e?.message || t('Failed to generate XML preview');
      console.error('[handleArchiveSingle] Preview error:', e);
      toast.error(errorMsg);
      setXmlPreviewDialog(false);
      setPendingArchiveOwner(null);
    } finally {
      setXmlPreviewLoading(false);
    }
  };

  const handleConfirmArchiveAfterPreview = async () => {
    if (!pendingArchiveOwner) return;

    const { ruOwnerId, owner } = pendingArchiveOwner;
    const ownerName = owner.firstName && owner.lastName
      ? `${owner.firstName} ${owner.lastName}`
      : owner.email || 'Unknown';

    // Demander confirmation finale
    const confirmMsg = t(
      'You have reviewed the XML. Type ARCHIVE to confirm execution:',
      { name: ownerName }
    );

    const userInput = window.prompt(confirmMsg);
    if (userInput !== 'ARCHIVE') {
      toast.info(t('Archive cancelled'));
      setXmlPreviewDialog(false);
      setPendingArchiveOwner(null);
      setXmlPreviewData(null);
      return;
    }

    setSyncLoading(true);
    try {
      const { archiveChannelsRuUserOwner } = await import('../../channels/api/channelsDashboardApi');
      const res = await archiveChannelsRuUserOwner(ruOwnerId);
      if (res?.data?.success) {
        toast.success(t('Owner {{name}} archived successfully from RU. Please close and reopen the sync dialog to see updated list.', { name: ownerName }));
        setXmlPreviewDialog(false);
        setPendingArchiveOwner(null);
        setXmlPreviewData(null);
      } else {
        toast.error(res?.data?.message || t('Archive failed'));
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.message || e?.message || t('Archive failed');
      console.error('[handleConfirmArchiveAfterPreview] Error:', e);
      toast.error(errorMsg);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCancelXmlPreview = () => {
    setXmlPreviewDialog(false);
    setPendingArchiveOwner(null);
    setXmlPreviewData(null);
    toast.info(t('Archive cancelled'));
  };
  const handleAddAll = async () => {
    if (!syncData?.allOwners) return;
    const idsToAdd = syncData.allOwners.filter(o => o.action === 'add').map(o => o.accountId);
    if (idsToAdd.length === 0) {
      toast.warning(t('No owners to add'));
      return;
    }
    setSyncLoading(true);
    try {
      const res = await applyOwnersRuIdsSync(idsToAdd);
      if (res?.success) {
        toast.success(t('Added ') + (res.data?.updated || 0) + t(' RU IDs'));
        if (res.data?.errors > 0) {
          toast.warning(t('Errors: ') + res.data.errors);
        }
        await handleSyncOwners(); // Refresh dialog data
        await fetchOwners(); // Refresh main table
      } else {
        toast.error(res?.message || t('Add failed'));
      }
    } catch (e) {
      toast.error(e?.message || t('Add failed'));
    } finally {
      setSyncLoading(false);
    }
  };
  const handleToggleSyncOwner = (accountId) => {
    setSelectedSyncOwners(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };
  const handleToggleAllSyncOwners = () => {
    if (!syncData?.ownersToSync) return;
    const allIds = syncData.ownersToSync.map(o => o.accountId);
    if (selectedSyncOwners.length === allIds.length) {
      setSelectedSyncOwners([]);
    } else {
      setSelectedSyncOwners(allIds);
    }
  };
  const listingStatsByOwner = useMemo(() => {
    const m = {};
    for (const L of listings) {
      const oid = normalizeOwnerId(L.ownerId);
      if (!oid) continue;
      if (!m[oid]) m[oid] = {
        total: 0,
        ruLinked: 0,
        channexLinked: 0
      };
      m[oid].total += 1;
      if (Array.isArray(L.rentalUnitedIds) && L.rentalUnitedIds.length > 0) m[oid].ruLinked += 1;
      if (L.channexListingId && String(L.channexListingId).trim() !== '') m[oid].channexLinked += 1;
    }
    return m;
  }, [listings]);
  const portfolioKpis = useMemo(() => {
    let ruListings = 0;
    let cxListings = 0;
    for (const L of listings) {
      if (Array.isArray(L.rentalUnitedIds) && L.rentalUnitedIds.length > 0) ruListings += 1;
      if (L.channexListingId && String(L.channexListingId).trim() !== '') cxListings += 1;
    }
    return {
      listingsTotal: listings.length,
      listingsRu: ruListings,
      listingsChannex: cxListings,
      ruOwnersOnPage: owners.filter(o => o.channelManager === 'RU').length,
      cxOwnersOnPage: owners.filter(o => o.channelManager === 'Channex').length
    };
  }, [listings, owners]);
  const { setTeamStats } = useTeamViewMode();
  useEffect(() => {
    if (!insidePageShell) return;
    setTeamStats([
      { icon: '🏢', label: 'PM', value: String(totalCount), iconColor: TEAM_T.primaryDeep },
      {
        icon: '🏠',
        label: 'Annonces',
        value: String(portfolioKpis.listingsTotal),
        iconColor: TEAM_T.info,
      },
    ]);
  }, [insidePageShell, totalCount, portfolioKpis.listingsTotal, setTeamStats]);
  const cellSx = {
    fontFamily: FONT,
    fontSize: 12
  };
  const columns = [{
    field: 'identity',
    header: t('Owner'),
    width: '200px',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <Box sx={{
      minWidth: 0
    }}>
          <Typography sx={{
        ...cellSx,
        fontWeight: 700,
        color: SOJORI.ink,
        lineHeight: 1.2
      }}>
            {rowData.firstName} {rowData.lastName}
          </Typography>
          <Typography sx={{
        ...cellSx,
        fontSize: 10,
        color: SOJORI.muted,
        lineHeight: 1.2
      }} noWrap title={rowData.email}>
            {rowData.email}
          </Typography>
        </Box>,
    sortable: false
  }, {
    field: 'phone',
    header: t('Phone'),
    width: '100px',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <Typography sx={{
      ...cellSx,
      color: SOJORI.ink
    }} noWrap>
          {rowData.phone || '—'}
        </Typography>,
    sortable: false
  }, {
    field: 'channelManager',
    header: t('Channel'),
    width: '76px',
    headerStyle: {
      justifyContent: 'center'
    },
    body: rowData => rowData.channelManager === 'Channex' ? <Chip label="CX" size="small" sx={{
      height: 22,
      fontSize: 10,
      fontWeight: 700,
      bgcolor: '#2563eb',
      color: '#fff'
    }} /> : rowData.channelManager === 'RU' ? <Chip label="RU" size="small" sx={{
      height: 22,
      fontSize: 10,
      fontWeight: 700,
      bgcolor: SOJORI.orange,
      color: '#fff'
    }} /> : <Typography sx={{
      ...cellSx,
      color: SOJORI.muted
    }}>—</Typography>,
    sortable: false
  }, {
    field: 'ruOwnerId',
    header: t('owners_column_ru_owner_id'),
    width: '132px',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => {
      if (rowData.channelManager !== 'RU') {
        return <Typography sx={{
          ...cellSx,
          color: SOJORI.muted
        }}>—</Typography>;
      }
      const id = rowData.ruOwnerId && String(rowData.ruOwnerId).trim();
      if (!id) {
        return <Typography sx={{
          ...cellSx,
          color: '#b45309',
          fontWeight: 600
        }} title={t('owners_ru_owner_id_missing_hint')}>
              —
            </Typography>;
      }
      return <Typography sx={{
        ...cellSx,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
        color: SOJORI.ink,
        wordBreak: 'break-all'
      }} title={id}>
            {id}
          </Typography>;
    },
    sortable: false
  }, {
    field: 'ownerCode',
    header: t('Code'),
    width: '72px',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <Typography sx={{
      ...cellSx,
      fontWeight: 600,
      color: SOJORI.muted
    }} noWrap>
          {rowData.ownerCode || '—'}
        </Typography>,
    sortable: false
  }, {
    field: 'configuration',
    header: t('Configuration'),
    width: '168px',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{
      maxWidth: 168
    }}>
          <Chip size="small" label={(rowData.settings?.language || '—').toUpperCase()} sx={{
        height: 20,
        fontSize: 9,
        fontWeight: 700,
        borderColor: SOJORI.teal,
        color: SOJORI.chrome2
      }} variant="outlined" />
          <Chip size="small" label={rowData.settings?.currency || '—'} sx={{
        height: 20,
        fontSize: 9,
        fontWeight: 700,
        bgcolor: SOJORI.paper,
        border: `1px solid ${SOJORI.orangeSoft}`
      }} />
        </Stack>,
    sortable: false
  }, {
    field: 'listingStats',
    header: t('Listings'),
    width: '108px',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => {
      const st = listingStatsByOwner[String(rowData._id)] || {
        total: 0,
        ruLinked: 0,
        channexLinked: 0
      };
      return <Typography component="div" sx={{
        ...cellSx,
        fontWeight: 600,
        color: SOJORI.ink,
        letterSpacing: '0.02em'
      }} title={t('Total listings')}>
            <Box component="span" sx={{
          color: SOJORI.muted,
          fontWeight: 500,
          mr: 0.25
        }}>T</Box>
            {st.total}
            <Box component="span" sx={{
          mx: 0.5,
          color: '#cbd5e1'
        }}>|</Box>
            <Box component="span" sx={{
          color: SOJORI.orange,
          fontWeight: 700
        }}>RU {st.ruLinked}</Box>
            <Box component="span" sx={{
          mx: 0.5,
          color: '#cbd5e1'
        }}>|</Box>
            <Box component="span" sx={{
          color: '#2563eb',
          fontWeight: 700
        }}>CX {st.channexLinked}</Box>
          </Typography>;
    },
    sortable: false
  }, {
    field: 'cityId',
    header: t('City'),
    width: '100px',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => {
      const city = cities.find(c => c._id === rowData.cityId);
      if (loadingCities) return <CircularProgress size={14} sx={{
        color: SOJORI.orange
      }} />;
      if (city) {
        return <Typography sx={{
          ...cellSx,
          fontWeight: 600,
          color: SOJORI.ink
        }} noWrap title={city.name}>
              {city.name}
            </Typography>;
      }
      if (rowData.cityId) {
        return <Typography sx={{
          ...cellSx,
          color: SOJORI.muted
        }} noWrap>
              …
            </Typography>;
      }
      return <Typography sx={{
        ...cellSx,
        color: SOJORI.muted
      }}>—</Typography>;
    },
    sortable: false
  }, {
    field: 'status',
    header: t('Status'),
    width: '44px',
    headerStyle: {
      justifyContent: 'center'
    },
    body: rowData => <IconButton size="small" onClick={e => handleStatusClick(e, rowData)} sx={{
      p: 0.25,
      color: SOJORI.teal,
      '&:hover': {
        bgcolor: 'rgba(0,180,180,0.1)'
      }
    }}>
          <RemoveRedEye sx={{
        fontSize: 18
      }} />
        </IconButton>,
    sortable: false
  }, {
    field: 'viewOwner',
    header: t('Propriétaire'),
    width: '75px',
    headerStyle: {
      justifyContent: 'center'
    },
    body: rowData => {
      if (rowData.channelManager !== 'RU') {
        return <Typography sx={{
          ...cellSx,
          color: SOJORI.muted,
          textAlign: 'center'
        }}>—</Typography>;
      }
      return <IconButton size="small" onClick={() => handleViewOwner(rowData)} sx={{
        p: 0.25,
        color: SOJORI.teal,
        '&:hover': {
          bgcolor: 'rgba(0,180,180,0.08)'
        }
      }}>
            <RemoveRedEye sx={{
          fontSize: 18
        }} />
          </IconButton>;
    },
    sortable: false
  }, {
    field: 'viewCompany',
    header: t('Entreprise'),
    width: '75px',
    headerStyle: {
      justifyContent: 'center'
    },
    body: rowData => {
      if (rowData.channelManager !== 'RU') {
        return <Typography sx={{
          ...cellSx,
          color: SOJORI.muted,
          textAlign: 'center'
        }}>—</Typography>;
      }
      const hasData = rowData.fillCompany?.CompanyInfo;
      return <IconButton size="small" onClick={() => handleViewCompany(rowData)} sx={{
        p: 0.25,
        color: hasData ? SOJORI.teal : SOJORI.muted,
        '&:hover': {
          bgcolor: 'rgba(0,180,180,0.08)'
        }
      }}>
            <BusinessIcon sx={{
          fontSize: 18
        }} />
          </IconButton>;
    },
    sortable: false
  }, {
    field: 'viewLegal',
    header: t('Représentant'),
    width: '85px',
    headerStyle: {
      justifyContent: 'center'
    },
    body: rowData => {
      if (rowData.channelManager !== 'RU') {
        return <Typography sx={{
          ...cellSx,
          color: SOJORI.muted,
          textAlign: 'center'
        }}>—</Typography>;
      }
      const hasData = rowData.fillCompany?.LegalRepresentativeInfo;
      return <IconButton size="small" onClick={() => handleViewLegal(rowData)} sx={{
        p: 0.25,
        color: hasData ? SOJORI.teal : SOJORI.muted,
        '&:hover': {
          bgcolor: 'rgba(0,180,180,0.08)'
        }
      }}>
            <Users size={18} />
          </IconButton>;
    },
    sortable: false
  }, ...(canUpdate || canDelete ? [{
    field: 'action',
    header: t('Action'),
    width: '120px',
    headerStyle: {
      justifyContent: 'flex-end'
    },
    body: rowData => <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Tooltip title="Suivi onboarding">
                    <IconButton size="small" onClick={() => navigate(`/admin/crm?tab=onboarding&ownerId=${rowData._id}`)} sx={{
          p: 0.35,
          borderRadius: 1,
          border: `1px solid ${SOJORI.orange}`,
          color: SOJORI.orange,
          '&:hover': {
            bgcolor: SOJORI.orangeSoft
          }
        }}>
                        <Milestone size={16} />
                      </IconButton>
                  </Tooltip>
                {canUpdate && <Tooltip title={t('owner_credentials_tooltip', {
        defaultValue: 'Identifiants (Sojori + R.U.)',
      })}>
                    <IconButton size="small" onClick={() => handleRuCredentialsClick(rowData)} sx={{
          p: 0.35,
          borderRadius: 1,
          border: '1px solid rgba(15,23,42,0.15)',
          color: SOJORI.ink,
          '&:hover': {
            bgcolor: 'rgba(15,23,42,0.06)'
          }
        }}>
                        <VpnKeyIcon sx={{
            fontSize: 16
          }} />
                      </IconButton>
                  </Tooltip>}
                {canUpdate && <IconButton size="small" onClick={() => handleUpdate(rowData)} sx={{
        p: 0.35,
        borderRadius: 1,
        bgcolor: SOJORI.teal,
        color: '#fff',
        '&:hover': {
          bgcolor: '#009090'
        }
      }}>
                    <EditOffIcon sx={{
          fontSize: 16
        }} />
                  </IconButton>}
                {canDelete && !(rowData.banned && rowData.deleted) && <IconButton size="small" onClick={() => handleDelete(rowData)} sx={{
        p: 0.35,
        borderRadius: 1,
        border: `1px solid ${SOJORI.orange}`,
        color: SOJORI.orange,
        '&:hover': {
          bgcolor: SOJORI.orangeSoft
        }
      }}>
                    <DeleteIcon sx={{
          fontSize: 16
        }} />
                  </IconButton>}
              </Stack>,
    sortable: false
  }] : [])];
  const kpiChipSx = {
    height: 22,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: FONT,
    border: '1px solid rgba(255,107,53,0.28)',
    bgcolor: 'rgba(255,255,255,0.92)',
    color: SOJORI.orangeDark
  };
  const outerShellSx = {
    width: '100%',
    maxWidth: '100%',
    fontFamily: FONT,
    ...(insidePageShell ? {} : {
      px: {
        xs: 0.5,
        sm: 1
      },
      pb: 2,
      pt: 0.75,
      bgcolor: SOJORI.paper,
      minHeight: '100%'
    })
  };
  return <Box sx={insidePageShell ? { width: '100%' } : outerShellSx}>
            <ToastContainer position="top-right" autoClose={3000} />
            {insidePageShell ? (
              <div className="so-staff-root" style={{ padding: 0, minHeight: 0, background: 'transparent' }}>
              <PropertyManagerHubView
                t={t}
                owners={owners}
                loading={loading}
                totalCount={totalCount}
                page={page}
                limit={limit}
                setPage={setPage}
                setLimit={setLimit}
                searchText={searchText}
                setSearchText={setSearchText}
                listings={listings}
                selectedListings={selectedListings}
                setSelectedListings={setSelectedListings}
                deletedFilter={deletedFilter}
                bannedFilter={bannedFilter}
                onDeletedChange={setDeletedFilter}
                onBannedChange={setBannedFilter}
                onSearch={handleSearch}
                onReset={handleReset}
                onFilterChange={handleFilterChange}
                onCreate={() => setOpenCreateDialog(true)}
                onEdit={handleUpdate}
                onSync={handleSyncOwners}
                syncLoading={syncLoading}
                canCreate={canCreate}
                canUpdate={canUpdate}
                listingStatsByOwner={listingStatsByOwner}
                portfolioKpis={portfolioKpis}
              />
              <UpdateOwnerSidebar
                inline
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                owner={selectedOwner}
                onOwnerUpdated={onOwnerUpdated}
              />
              </div>
            ) : (
            <>
            <Box sx={{
      mb: 1,
      px: 1.25,
      py: 0.85,
      borderRadius: 1.5,
      background: `linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #fffaf5 100%)`,
      border: `1px solid rgba(255,107,53,0.28)`,
      boxShadow: '0 2px 12px rgba(255, 107, 53, 0.08)'
    }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" useFlexGap>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                        <Box sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: SOJORI.orange,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(255,107,53,0.35)'
          }}>
                            <Users size={16} strokeWidth={2.4} />
                        </Box>
                        <Typography sx={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '-0.02em',
            color: SOJORI.orangeDark,
            textTransform: 'uppercase'
          }}>
                            {t('owners_page_badge')}
                        </Typography>
                        <Chip label={t('owners_count_label', {
            count: totalCount
          })} size="small" sx={kpiChipSx} />
                        <Chip label={`${t('owners_kpi_listings')} ${portfolioKpis.listingsTotal}`} size="small" sx={kpiChipSx} />
                        <Chip label={`${t('owners_kpi_ru')} ${portfolioKpis.listingsRu}`} size="small" sx={{
            ...kpiChipSx,
            borderColor: 'rgba(255,107,53,0.45)',
            bgcolor: SOJORI.orangeSoft
          }} />
                        <Chip label={`${t('owners_kpi_cx')} ${portfolioKpis.listingsChannex}`} size="small" sx={{
            ...kpiChipSx,
            borderColor: 'rgba(37,99,235,0.25)',
            color: '#1d4ed8'
          }} />
                        <Tooltip title={t('owners_kpi_page_channels_hint')}>
                            <Chip label={`RU·${portfolioKpis.ruOwnersOnPage} · CX·${portfolioKpis.cxOwnersOnPage}`} size="small" sx={{
              ...kpiChipSx,
              fontSize: 9,
              height: 22,
              color: SOJORI.muted,
              borderColor: '#e2e8f0'
            }} />
                        </Tooltip>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={syncLoading ? <CircularProgress size={14} /> : <SyncIcon />}
                            onClick={handleSyncOwners}
                            disabled={syncLoading}
                            sx={{
                                height: 28,
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: FONT,
                                textTransform: 'none',
                                borderColor: SOJORI.orange,
                                color: SOJORI.orange,
                                '&:hover': {
                                    borderColor: SOJORI.orangeDark,
                                    bgcolor: SOJORI.orangeSoft,
                                }
                            }}
                        >
                            {t('Sync Owner RU')}
                        </Button>
                        <Chip label="Sojori" size="small" sx={{
              height: 22,
              fontSize: 10,
              fontWeight: 800,
              fontFamily: FONT,
              bgcolor: SOJORI.orange,
              color: '#fff',
              border: 'none'
            }} />
                    </Stack>
                </Stack>
            </Box>
            <Paper elevation={0} sx={{
      borderRadius: 1.5,
      border: `1px solid rgba(255,107,53,0.15)`,
      overflow: 'hidden',
      bgcolor: SOJORI.panel,
      boxShadow: '0 1px 0 rgba(15,23,42,0.04)'
    }}>
            <OwnerFilter compact searchText={searchText} setSearchText={setSearchText} listings={listings} selectedListings={selectedListings} setSelectedListings={setSelectedListings} deletedFilter={deletedFilter} bannedFilter={bannedFilter} onDeletedChange={setDeletedFilter} onBannedChange={setBannedFilter} onSearch={handleSearch} onReset={handleReset} onFilterChange={handleFilterChange} onOpenSidebar={canCreate ? () => setOpenCreateDialog(true) : null} canCreate={canCreate} page={page} setPage={setPage} limit={limit} setLimit={setLimit} totalItems={totalCount} rowsPerPageOptions={[5, 10, 20, 50]} loading={loading} />
            <Box sx={{
        bgcolor: '#fff'
      }}>
                {loading ? <Box className="flex items-center justify-center" sx={{
          minHeight: 200
        }}>
                        <CircularProgress size={28} sx={{
            color: SOJORI.orange
          }} />
                    </Box> : <GlobalTable dense data={owners} columns={columns} page={page} hasPagination={false} onPageChange={handlePageChange} isNextDisabled={isNextDisabled} limit={limit} onLimitChange={handleLimitChange} rowsPerPageOptions={[5, 10, 20, 50]} totalCount={totalCount} />}
            </Box>
            </Paper>
            </>
            )}

            <CreateOwnerSidebar open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} onOwnerCreated={onOwnerCreated} />

            {!insidePageShell ? (
            <UpdateOwnerSidebar
              open={openUpdateDialog}
              onClose={() => setOpenUpdateDialog(false)}
              owner={selectedOwner}
              onOwnerUpdated={onOwnerUpdated}
              inline={false}
            />
            ) : null}

            {/* Dialog Propriétaire - View Only */}
            <Dialog
              open={viewOwnerDialog}
              onClose={() => setViewOwnerDialog(false)}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: '12px',
                  minWidth: '480px'
                }
              }}
            >
              <DialogTitle sx={{
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: FONT,
                borderBottom: `2px solid ${SOJORI.orange}`,
                pb: 1.5
              }}>
                {t('Propriétaire')}
              </DialogTitle>
              <DialogContent sx={{ mt: 2 }}>
                {viewDialogData && (
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Prénom')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.firstName || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Nom')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.lastName || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Email')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.email || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Téléphone')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.phone || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Ville')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany?.ContactInfo?.City || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Adresse')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany?.ContactInfo?.Address || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Code Postal')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany?.ContactInfo?.ZipCode || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Date de Naissance')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany?.ContactInfo?.BirthDate || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Nationalité')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany?.ContactInfo?.Nationality || '-'}</Typography>
                    </Box>
                  </Stack>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button
                  onClick={() => setViewOwnerDialog(false)}
                  variant="contained"
                  sx={{
                    bgcolor: SOJORI.orange,
                    color: 'white !important',
                    textTransform: 'none',
                    fontFamily: FONT,
                    '&:hover': {
                      bgcolor: SOJORI.orangeDark
                    }
                  }}
                >
                  {t('Fermer')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Dialog Entreprise - View Only */}
            <Dialog
              open={viewCompanyDialog}
              onClose={() => setViewCompanyDialog(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: '12px',
                  minWidth: '600px'
                }
              }}
            >
              <DialogTitle sx={{
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: FONT,
                borderBottom: `2px solid ${SOJORI.orange}`,
                pb: 1.5
              }}>
                {t('Entreprise')}
              </DialogTitle>
              <DialogContent sx={{ mt: 2 }}>
                {viewDialogData?.fillCompany?.CompanyInfo ? (
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Nom Entreprise')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.CompanyName || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Site Web')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.WebsiteAddress || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Ville')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.CompanyCity || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Adresse')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.Address || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Code Postal')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.PostCode || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Téléphone')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.PhoneNumber || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Numéro TVA')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.VATNumber || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Email Confirmation')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.ConfirmationEmail || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Nombre de Propriétés')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.NumberOfProperties || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Nombre d\'Employés')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.NumberOfEmployees || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Années en Activité')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.CompanyInfo.YearsInBusiness || '-'}</Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Alert severity="info" sx={{ fontFamily: FONT }}>{t('Aucune information entreprise disponible')}</Alert>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button
                  onClick={() => setViewCompanyDialog(false)}
                  variant="contained"
                  sx={{
                    bgcolor: SOJORI.orange,
                    color: 'white !important',
                    textTransform: 'none',
                    fontFamily: FONT,
                    '&:hover': {
                      bgcolor: SOJORI.orangeDark
                    }
                  }}
                >
                  {t('Fermer')}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Dialog Représentant Légal - View Only */}
            <Dialog
              open={viewLegalDialog}
              onClose={() => setViewLegalDialog(false)}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: '12px',
                  minWidth: '480px'
                }
              }}
            >
              <DialogTitle sx={{
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: FONT,
                borderBottom: `2px solid ${SOJORI.orange}`,
                pb: 1.5
              }}>
                {t('Représentant Légal')}
              </DialogTitle>
              <DialogContent sx={{ mt: 2 }}>
                {viewDialogData?.fillCompany?.LegalRepresentativeInfo ? (
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Prénom')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.LegalRepresentativeInfo.FirstName || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Nom')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.LegalRepresentativeInfo.LastName || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Email')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.LegalRepresentativeInfo.Email || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Ville')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.LegalRepresentativeInfo.City || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Adresse')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.LegalRepresentativeInfo.Address || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Code Postal')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.LegalRepresentativeInfo.PostCode || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Date de Naissance')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.LegalRepresentativeInfo.Birthday || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: SOJORI.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {t('Nationalité')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: FONT }}>{viewDialogData.fillCompany.LegalRepresentativeInfo.NationalityId || '-'}</Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Alert severity="info" sx={{ fontFamily: FONT }}>{t('Aucune information représentant légal disponible')}</Alert>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button
                  onClick={() => setViewLegalDialog(false)}
                  variant="contained"
                  sx={{
                    bgcolor: SOJORI.orange,
                    color: 'white !important',
                    textTransform: 'none',
                    fontFamily: FONT,
                    '&:hover': {
                      bgcolor: SOJORI.orangeDark
                    }
                  }}
                >
                  {t('Fermer')}
                </Button>
              </DialogActions>
            </Dialog>

            <Popover open={Boolean(statusAnchorEl)} anchorEl={statusAnchorEl} onClose={handleStatusClose} anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'left'
    }} transformOrigin={{
      vertical: 'top',
      horizontal: 'left'
    }} PaperProps={{
      sx: {
        borderRadius: '12px',
        border: `1px solid ${SOJORI.orangeSoft}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
        overflow: 'hidden'
      }
    }}>
                {selectedStatus && <Box sx={{
        p: 2,
        bgcolor: 'white'
      }}>
                        <Stack direction="column" spacing={1}>
                            <Chip size="small" label={t(selectedStatus.status)} color={selectedStatus.status === 'active' ? 'success' : 'default'} variant="outlined" />
                            <Chip size="small" label={t(selectedStatus.banned ? 'Banned' : 'Not Banned')} color={selectedStatus.banned ? 'error' : 'success'} variant="outlined" />
                            <Chip size="small" label={t(selectedStatus.deleted ? 'Deleted' : 'Not Deleted')} color={selectedStatus.deleted ? 'default' : 'success'} variant="outlined" />
                        </Stack>
                    </Box>}
            </Popover>

            <Dialog open={deleteDialog} onClose={handleDeleteCancel} aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" PaperProps={{
      sx: {
        borderRadius: '12px',
        minWidth: '400px'
      }
    }}>
                <DialogTitle id="delete-dialog-title" sx={{
        fontSize: '16px',
        fontWeight: 700
      }}>
                    {t('Delete Owner')}
                </DialogTitle>
                <DialogContent>
                    <Typography id="delete-dialog-description" component="div" sx={{
          fontSize: '14px'
        }}>
                        <Box component="p" sx={{
            mb: 1.5,
            m: 0
          }}>
                            {t('Are you sure you want to delete owner')}{' '}
                            <strong>{ownerToDelete?.firstName} {ownerToDelete?.lastName}</strong>?
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{
            display: 'block',
            mb: 0.5
          }}>
                            {t('delete_owner_ru_hint')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{
            display: 'block'
          }}>
                            {t('delete_owner_channex_hint')}
                        </Typography>
                    </Typography>
                </DialogContent>
                <DialogActions sx={{
        p: 2,
        gap: 1
      }}>
                    <Button onClick={handleDeleteCancel} sx={{
          textTransform: 'none'
        }}>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={handleDeleteConfirm} variant="contained" autoFocus sx={{
          bgcolor: SOJORI.error,
          color: 'white !important',
          textTransform: 'none',
          '&:hover': {
            bgcolor: '#D32F2F'
          }
        }}>
                        {t('Delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={ruCredOpen} onClose={handleRuCredClose} PaperProps={{
      sx: {
        borderRadius: '12px',
        minWidth: '380px',
        maxWidth: '480px'
      }
    }}>
                <DialogTitle sx={{
        fontSize: '16px',
        fontWeight: 700
      }}>
                    {t('owner_credentials_dialog_title', {
          defaultValue: 'Identifiants du compte',
        })}
                </DialogTitle>
                <DialogContent>
                    {ruCredOwner && <Typography variant="body2" color="text.secondary" sx={{
          mb: 1.5
        }}>
                        {ruCredOwner.firstName} {ruCredOwner.lastName}
                    </Typography>}
                    {ruCredLoading && <CircularProgress size={24} />}
                    {!ruCredLoading && ruCredError && <Alert severity="warning">{ruCredError}</Alert>}
                    {!ruCredLoading && ruCredData && <Stack spacing={2} sx={{
          mt: 0.5
        }}>
                            <TextField label={t('Email')} value={ruCredData.email || ''} fullWidth size="small" InputProps={{
            readOnly: true
          }} />

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LockOpenIcon sx={{ fontSize: 18, color: SOJORI.teal }} />
                              <TextField label="Mot de passe Sojori (dashboard)" value={ruCredData.sojoriPassword || '—'} fullWidth size="small" type="text" InputProps={{
                readOnly: true
              }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,180,180,0.04)' } }} />
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <VpnKeyIcon sx={{ fontSize: 18, color: SOJORI.orange }} />
                              <TextField label="Mot de passe R.U. (extranet)" value={ruCredData.password || '—'} fullWidth size="small" type="text" InputProps={{
                readOnly: true
              }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: SOJORI.orangeSoft } }} />
                            </Box>

                            {ruCredData.ruOwnerId != null && ruCredData.ruOwnerId !== '' && <Typography variant="caption" color="text.secondary">
                                RU OwnerId: {String(ruCredData.ruOwnerId)}
                              </Typography>}
                            <Alert severity="info" variant="outlined" sx={{ fontSize: '0.75rem' }}>
                                <LockOpenIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: 'middle', color: SOJORI.teal }} /> Sojori : connexion au dashboard client<br/>
                                <VpnKeyIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: 'middle', color: SOJORI.orange }} /> R.U. : accès extranet Rentals United (usage interne)
                            </Alert>
                        </Stack>}
                </DialogContent>
                <DialogActions sx={{
        p: 2
      }}>
                    <Button onClick={handleRuCredClose} variant="contained" sx={{
          textTransform: 'none'
        }}>
                        {t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={syncDialog} onClose={handleSyncClose} maxWidth="md" fullWidth PaperProps={{
      sx: {
        borderRadius: '12px'
      }
    }}>
                <DialogTitle sx={{
        fontSize: '16px',
        fontWeight: 700
      }}>
                    {t('Sync Owner RU IDs')}
                </DialogTitle>
                <DialogContent>
                    {syncLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={32} sx={{ color: SOJORI.orange }} />
                    </Box>}
                    {!syncLoading && syncData && <>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            {t('Total RU Owners')}: {syncData.totalRuOwners || 0} |
                            {t('Total Sojori Owners')}: {syncData.totalSojoriOwners || 0} |
                            {t('To Add')}: {syncData.ownersToAdd || 0} |
                            {t('To Delete')}: {syncData.ownersToDelete || 0}
                        </Alert>
                        {(syncData.allOwners || []).length === 0 ? (
                            <Alert severity="warning">
                                {t('No RU owners found in database')}
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('Name')}</TableCell>
                                            <TableCell>{t('Email')}</TableCell>
                                            <TableCell>{t('RU ID')}</TableCell>
                                            <TableCell>{t('Status')}</TableCell>
                                            <TableCell>{t('Action')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(syncData.allOwners || []).map((owner, idx) => (
                                            <TableRow key={owner.accountId || `ru-${idx}`} hover>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                                        {owner.firstName} {owner.lastName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: 12 }}>
                                                        {owner.email}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{
                                                        fontSize: 12,
                                                        fontFamily: 'monospace',
                                                        color: owner.matchedRuOwnerId ? SOJORI.ink : SOJORI.muted
                                                    }}>
                                                        {owner.currentRuOwnerId || owner.matchedRuOwnerId || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {owner.status === 'synced' && (
                                                        <Chip label="🟢 Synced" size="small" sx={{
                                                            bgcolor: '#10b981',
                                                            color: '#fff',
                                                            fontSize: 10,
                                                            height: 20
                                                        }} />
                                                    )}
                                                    {owner.status === 'needs_add' && (
                                                        <Chip label="🟠 Need Add" size="small" sx={{
                                                            bgcolor: '#f59e0b',
                                                            color: '#fff',
                                                            fontSize: 10,
                                                            height: 20
                                                        }} />
                                                    )}
                                                    {owner.status === 'only_in_ru' && (
                                                        <Chip label="🔴 Only in RU" size="small" sx={{
                                                            bgcolor: '#ef4444',
                                                            color: '#fff',
                                                            fontSize: 10,
                                                            height: 20
                                                        }} />
                                                    )}
                                                    {owner.status === 'deleted_in_sojori_still_in_ru' && (
                                                        <Chip label="🟣 Archived Sojori" size="small" sx={{
                                                            bgcolor: '#9333ea',
                                                            color: '#fff',
                                                            fontSize: 10,
                                                            height: 20
                                                        }} />
                                                    )}
                                                    {owner.status === 'not_in_ru' && (
                                                        <Chip label="⚪ Not in RU" size="small" sx={{
                                                            bgcolor: '#6b7280',
                                                            color: '#fff',
                                                            fontSize: 10,
                                                            height: 20
                                                        }} />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {owner.action === 'add' && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleRepairSingle(owner.accountId)}
                                                            disabled={syncLoading}
                                                            sx={{
                                                                fontSize: 10,
                                                                height: 24,
                                                                textTransform: 'none',
                                                                borderColor: '#f59e0b',
                                                                color: '#f59e0b',
                                                                '&:hover': {
                                                                    borderColor: '#d97706',
                                                                    bgcolor: '#fef3c7'
                                                                }
                                                            }}
                                                        >
                                                            Add RU ID
                                                        </Button>
                                                    )}
                                                    {owner.action === 'delete' && owner.accountId && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleArchiveSingle(owner.matchedRuOwnerId, owner)}
                                                            disabled={syncLoading}
                                                            sx={{
                                                                fontSize: 10,
                                                                height: 24,
                                                                textTransform: 'none',
                                                                borderColor: '#ef4444',
                                                                color: '#ef4444',
                                                                '&:hover': {
                                                                    borderColor: '#dc2626',
                                                                    bgcolor: '#fee2e2'
                                                                }
                                                            }}
                                                        >
                                                            Delete from RU
                                                        </Button>
                                                    )}
                                                    {owner.action === 'delete' && !owner.accountId && (
                                                        <Tooltip title={t('Cannot archive: Owner not found in Sojori database. This owner only exists in Rental United.')}>
                                                            <Typography sx={{
                                                                fontSize: 10,
                                                                color: '#9ca3af',
                                                                fontStyle: 'italic',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.5
                                                            }}>
                                                                ⚠️ Not in Sojori
                                                            </Typography>
                                                        </Tooltip>
                                                    )}
                                                    {!owner.action && (
                                                        <Typography sx={{ fontSize: 11, color: SOJORI.muted }}>—</Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </>}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={handleSyncClose} sx={{ textTransform: 'none' }}>
                        {t('Close')}
                    </Button>
                    {syncData && (syncData.ownersToAdd || 0) > 0 && (
                        <Button
                            onClick={handleAddAll}
                            variant="contained"
                            disabled={syncLoading}
                            sx={{
                                bgcolor: '#f59e0b',
                                color: 'white !important',
                                textTransform: 'none',
                                '&:hover': {
                                    bgcolor: '#d97706'
                                }
                            }}
                        >
                            Add All RU IDs ({syncData.ownersToAdd})
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* XML Preview Dialog - Prévisualisation du XML avant archivage */}
            <Dialog
                open={xmlPreviewDialog}
                onClose={handleCancelXmlPreview}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        maxHeight: '90vh'
                    }
                }}
            >
                <DialogTitle sx={{
                    fontSize: '16px',
                    fontWeight: 700,
                    bgcolor: '#fff7ed',
                    borderBottom: '2px solid #ff6b35'
                }}>
                    🛡️ NEW MODAL PROTECTED OWNER - Preview XML Archive
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {xmlPreviewLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={32} sx={{ color: SOJORI.orange }} />
                        </Box>
                    )}

                    {!xmlPreviewLoading && xmlPreviewData && (
                        <>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    🔍 {t('Veuillez VÉRIFIER attentivement ce XML avant de confirmer !')}
                                </Typography>
                                <Typography variant="body2">
                                    {xmlPreviewData.explanation?.fr || xmlPreviewData.explanation?.en}
                                </Typography>
                            </Alert>

                            <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f8fa', borderRadius: 1, border: '1px solid #e2e8f0' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: SOJORI.ink }}>
                                    📋 {t('Owner Information')}
                                </Typography>
                                <Stack spacing={0.5}>
                                    <Typography variant="body2">
                                        <strong>Nom:</strong> {xmlPreviewData.ownerName}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Email:</strong> {xmlPreviewData.ownerEmail}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>RU Owner ID:</strong> {xmlPreviewData.ruOwnerId}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Account ID (MongoDB):</strong> {xmlPreviewData.accountId}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600 }}>
                                        <strong>✅ Authentication Email:</strong> {xmlPreviewData.authenticationEmail}
                                    </Typography>
                                </Stack>
                            </Box>

                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: SOJORI.ink }}>
                                📄 {t('XML qui sera envoyé à Rental United:')}
                            </Typography>
                            <Box
                                component="pre"
                                sx={{
                                    p: 2,
                                    bgcolor: '#1e1e1e',
                                    color: '#d4d4d4',
                                    borderRadius: 1,
                                    overflow: 'auto',
                                    maxHeight: '300px',
                                    fontSize: 12,
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    border: '2px solid #ff6b35'
                                }}
                            >
                                {xmlPreviewData.xml}
                            </Box>

                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    💡 <strong>Vérification importante:</strong> L&apos;email dans &lt;UserName&gt; doit correspondre à l&apos;owner que vous voulez archiver. Si c&apos;est le bon owner, cliquez sur &quot;Confirmer l&apos;archivage&quot;.
                                </Typography>
                            </Alert>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1, bgcolor: '#f8f8fa' }}>
                    <Button
                        onClick={handleCancelXmlPreview}
                        sx={{
                            textTransform: 'none',
                            borderColor: SOJORI.muted,
                            color: SOJORI.muted
                        }}
                        variant="outlined"
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        onClick={handleConfirmArchiveAfterPreview}
                        variant="contained"
                        disabled={syncLoading || xmlPreviewLoading}
                        sx={{
                            bgcolor: '#ef4444',
                            color: 'white !important',
                            textTransform: 'none',
                            '&:hover': {
                                bgcolor: '#dc2626'
                            }
                        }}
                    >
                        {syncLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : t('Confirmer l\'archivage')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>;
};
export default PublicOwner;
