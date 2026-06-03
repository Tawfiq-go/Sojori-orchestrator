import React, { useState, useEffect, useMemo } from 'react';
import { CircularProgress, Button, Typography, Box, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Paper } from '@mui/material';
import { getAdminWhatsapp, deleteAdminWhatsapp } from '../services/serverApi.task';
import ModifyAdminWhatsapp from './ModifyAdminWhatsapp';
import { toast } from 'react-toastify';
import CreateAdminWhatsappDialog from './AddAdminWhatsapp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getcities, getcountries } from '../../setting/services/serverApi.adminConfig';
import { getListingsTa } from '../../tasks/services/serverApi.task';
import ListingPopup from './ListingPopup';
import { getLanguage } from '../services/serverApi.task';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddIcon from '@mui/icons-material/Add';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from 'utils/rbac.utils';
import { useTranslation } from 'react-i18next';
import WhatsappFilters from './WhatsappFilters';
import { can } from '../../../utils/permissions';
import { useAdminOwnerFilter } from 'context/AdminOwnerFilterContext';
import { useTeamViewMode } from '../../../context/TeamViewContext';
import { TeamHubMemberCard, TeamHubCardGrid } from '../../../components/team/TeamHubMemberCard';
import { TeamHubListTable } from '../../../components/team/TeamHubListTable';
import { TeamHubPagination } from '../../../components/team/TeamHubPagination';
import { TEAM_T } from '../../../components/team/teamHubTokens';

const TYPE_ABBR = {
  Reservation: 'RS',
  Réservation: 'RS',
  Task: 'TS',
  Tâche: 'TS',
  Message: 'MS',
  Reviews: 'AV',
  Avis: 'AV',
  ArrivalDeparture: 'DC',
  'Arrivée/Départ': 'DC',
};
const ACCESS_ABBR = { write: 'W', read: 'R', none: 'N' };

function buildPermMap(perms) {
  const permMap = {};
  (perms || []).forEach((p) => {
    const abbr = TYPE_ABBR[p.type] || p.type.substring(0, 2).toUpperCase();
    const access = ACCESS_ABBR[p.access] || 'N';
    permMap[abbr] = access;
  });
  return permMap;
}

function PermChips({ permMap }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
      {Object.entries(permMap).map(([type, access]) => {
        const color = access === 'W' ? TEAM_T.success : access === 'R' ? TEAM_T.info : TEAM_T.text4;
        return (
          <Chip
            key={type}
            label={`${type}:${access}`}
            size="small"
            sx={{
              fontSize: 10,
              height: 18,
              bgcolor: `${color}18`,
              color,
              fontWeight: 700,
              fontFamily: 'monospace',
            }}
          />
        );
      })}
    </Box>
  );
}
const PublicAdminWhatsapp = () => {
  const {
    t
  } = useTranslation('common');
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingPopupOpen, setListingPopupOpen] = useState(false);
  const [selectedListingIds, setSelectedListingIds] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [types] = useState([{
    task: 'Reservation',
    _id: 1
  }, {
    task: 'Task',
    _id: 2
  }, {
    task: 'Listing',
    _id: 3
  }, {
    task: 'Calendrier',
    _id: 4
  }, {
    task: 'DynamicPrice',
    _id: 5
  }, {
    task: 'Message',
    _id: 6
  }, {
    task: 'Reviews',
    _id: 7
  }, {
    task: 'ArrivalDeparture',
    _id: 8
  }]);
  const [selectedListings, setSelectedListings] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedAccess, setSelectedAccess] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    staff: null
  });
  const [canCreate] = useState(can('create'));
  const [canUpdate] = useState(can('update'));
  const [canDelete] = useState(can('delete'));
  const { requestOwnerId } = useAdminOwnerFilter();
  const { viewMode, setTeamStats } = useTeamViewMode();
  const fetchLanguages = async () => {
    try {
      const response = await getLanguage();
      const rows = Array.isArray(response?.data) ? response.data : [];
      setLanguages(rows);
    } catch (error) {
      toast.error(t('Error loading languages'));
    }
  };
  const fetchCities = async () => {
    try {
      const response = await getcities();
      setCities(response.data.cities);
    } catch (error) {}
  };
  const fetchCountries = async () => {
    try {
      const response = await getcountries();
      setCountries(response.data);
    } catch (error) {}
  };
  const fetchListings = async () => {
    try {
      const response = await getListingsTa();
      // Transform listings to have _id field
      const transformedListings = (response || []).map(listing => ({
        ...listing,
        _id: listing.id || listing._id,
        id: listing.id || listing._id
      }));
      setListings(transformedListings);
    } catch (error) {}
  };
  useEffect(() => {
    fetchCities();
    fetchCountries();
    fetchListings();
    fetchLanguages();
  }, []);
  useEffect(() => {
    fetchStaff();
  }, [page, limit, searchText, selectedListings, selectedTypes, selectedAccess, selectedLanguages, requestOwnerId]);

  useEffect(() => {
    const active = staff.filter((s) => !s.banned).length;
    setTeamStats([
      { icon: '📱', label: 'Admins WA', value: String(totalCount) },
      { icon: '✅', label: 'Actifs', value: String(active) },
    ]);
  }, [staff, totalCount, setTeamStats]);
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit,
        search_text: searchText
      };
      if (selectedListings?.length > 0) params.listings = selectedListings;
      if (selectedTypes?.length > 0) params.types = selectedTypes;
      if (selectedAccess?.length > 0) params.access = selectedAccess;
      if (selectedLanguages?.length > 0) params.languages = selectedLanguages;
      if (requestOwnerId) params.owner_id = requestOwnerId;
      const response = await getAdminWhatsapp(params);
      if (response && Array.isArray(response.data)) {
        setStaff(response.data);
        setTotalCount(response.total || 0);
      } else {
        setStaff([]);
        setTotalCount(0);
      }
    } catch (error) {
      setStaff([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpdate = staffMember => {
    setSelectedStaff(staffMember);
    setOpenModal(true);
  };
  const handleDelete = staffMember => {
    setDeleteDialog({
      open: true,
      staff: staffMember
    });
  };
  const confirmDelete = async () => {
    try {
      await deleteAdminWhatsapp(deleteDialog.staff._id);
      toast.success(t('Admin deleted successfully'));
      setDeleteDialog({
        open: false,
        staff: null
      });
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || t('Error deleting admin'));
    }
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedStaff(null);
  };
  const handleStaffUpdate = updatedStaff => {
    setStaff(prevStaff => prevStaff.map(member => member._id === updatedStaff._id ? updatedStaff : member));
  };
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);

  const adminColumns = useMemo(
    () => [
      {
        key: 'username',
        label: 'Username',
        render: (row) => (
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: TEAM_T.text }}>{row.username}</Typography>
        ),
      },
      ...(isAdmin
        ? [
            {
              key: 'owner',
              label: 'Owner',
              render: (row) =>
                row.owner ? `${row.owner.firstName} ${row.owner.lastName}` : '—',
            },
          ]
        : []),
      {
        key: 'whatsapp',
        label: 'WhatsApp',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontFamily: 'monospace', fontSize: 11.5 }}>
            <WhatsAppIcon sx={{ fontSize: 14, color: TEAM_T.success }} />
            {row.whatsappPhone}
          </Box>
        ),
      },
      {
        key: 'permissions',
        label: 'Permissions',
        render: (row) => <PermChips permMap={buildPermMap(row.permissions)} />,
      },
      {
        key: 'language',
        label: 'Langue',
        render: (row) => row.language || '—',
      },
      {
        key: 'listings',
        label: 'Annonces',
        align: 'center',
        render: (row) => {
          const listingCount = row.listingIds?.includes('All') ? 'Tous' : row.listingIds?.length || 0;
          return (
            <Chip
              label={listingCount}
              size="small"
              sx={{
                fontSize: 10,
                height: 18,
                bgcolor: `${TEAM_T.success}18`,
                color: TEAM_T.success,
                fontWeight: 700,
              }}
            />
          );
        },
      },
      {
        key: 'status',
        label: 'Statut',
        align: 'center',
        render: (row) => (
          <Chip
            icon={
              row.banned ? (
                <BlockIcon style={{ fontSize: 12 }} />
              ) : (
                <CheckCircleIcon style={{ fontSize: 12 }} />
              )
            }
            label={row.banned ? 'Banni' : 'Actif'}
            size="small"
            sx={{
              fontSize: 10,
              height: 20,
              fontWeight: 700,
              ...(row.banned
                ? { bgcolor: '#fde8e8', color: TEAM_T.error }
                : { bgcolor: '#e6f6ef', color: TEAM_T.success }),
            }}
          />
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'center',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            {canUpdate && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdate(row);
                }}
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: TEAM_T.primary,
                  color: '#fff',
                  '&:hover': { bgcolor: TEAM_T.primaryDeep },
                }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
            {canDelete && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row);
                }}
                size="small"
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: TEAM_T.error,
                  color: '#fff',
                  '&:hover': { bgcolor: '#a01818' },
                }}
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Box>
        ),
      },
    ],
    [isAdmin, canUpdate, canDelete],
  );

  return <Box sx={{
    width: '100%',
    minHeight: 0,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    bgcolor: 'transparent'
  }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <WhatsAppIcon sx={{ fontSize: 20, color: TEAM_T.primary }} />
        <Typography sx={{ fontWeight: 800, fontSize: 16, color: TEAM_T.text }}>WhatsApp Admin</Typography>
        <Chip
          label={`${totalCount} membres`}
          size="small"
          sx={{
            bgcolor: TEAM_T.primaryTint,
            color: TEAM_T.primaryDeep,
            fontWeight: 700,
            fontSize: 11,
            height: 22,
          }}
        />
      </Box>

      <WhatsappFilters
        searchText={searchText}
        setSearchText={setSearchText}
        listings={listings}
        selectedListings={selectedListings}
        setSelectedListings={setSelectedListings}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        selectedAccess={selectedAccess}
        setSelectedAccess={setSelectedAccess}
        selectedLanguages={selectedLanguages}
        setSelectedLanguages={setSelectedLanguages}
        types={types}
        languages={languages}
        onReset={() => {
          setSearchText('');
          setSelectedListings([]);
          setSelectedTypes([]);
          setSelectedAccess([]);
          setSelectedLanguages([]);
          setPage(0);
        }}
        onFilterChange={() => setPage(0)}
        addButton={
          canCreate ? (
            <Button
              onClick={() => setOpenCreateDialog(true)}
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              sx={{
                bgcolor: TEAM_T.primary,
                color: '#fff !important',
                '&:hover': { bgcolor: TEAM_T.primaryDeep },
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
                whiteSpace: 'nowrap',
              }}
            >
              Nouveau
            </Button>
          ) : null
        }
      />

      <Box sx={{
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
      }}>
        {isLoading ? <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
            <CircularProgress sx={{
            color: TEAM_T.primary
          }} />
          </Box> : staff.length === 0 ? <Box sx={{
          textAlign: 'center',
          py: 4
        }}>
            <WhatsAppIcon sx={{
            fontSize: '48px',
            color: TEAM_T.text4,
            mb: 1
          }} />
            <Typography sx={{
            color: TEAM_T.text3
          }}>Aucun admin trouvé</Typography>
          </Box> : viewMode === 'cards' ? (
          <TeamHubCardGrid>
            {staff.map((row) => {
              const listingCount = row.listingIds?.includes('All') ? 'Tous' : row.listingIds?.length || 0;
              const initials = (row.username || '?').slice(0, 2).toUpperCase();
              const permChips = Object.entries(buildPermMap(row.permissions)).map(
                ([type, access]) => `${type}:${access}`,
              );
              return (
                <TeamHubMemberCard
                  key={row._id}
                  initials={initials}
                  title={row.username}
                  subtitle={row.whatsappPhone}
                  badge={row.banned ? 'Banni' : 'Actif'}
                  chips={[row.language || '—', `Annonces: ${listingCount}`, ...permChips.slice(0, 4)]}
                  metaLines={
                    isAdmin && row.owner
                      ? [{ label: 'Owner', value: `${row.owner.firstName} ${row.owner.lastName}` }]
                      : []
                  }
                  active={!row.banned}
                  inactive={row.banned}
                  onEdit={canUpdate ? () => handleUpdate(row) : undefined}
                  onDelete={canDelete ? () => handleDelete(row) : undefined}
                />
              );
            })}
          </TeamHubCardGrid>
        ) : (
          <TeamHubListTable
            rows={staff}
            columns={adminColumns}
            rowKey={(row) => row._id}
            emptyLabel="Aucun admin trouvé"
          />
        )}
      </Box>

      <TeamHubPagination
        page={page}
        limit={limit}
        total={totalCount}
        onPageChange={setPage}
        onLimitChange={setLimit}
        limitOptions={[5, 10, 25, 50, 100]}
        itemLabel="admins"
      />

      {/* Modals */}
      <ModifyAdminWhatsapp open={openModal} handleClose={handleCloseModal} staff={selectedStaff} onStaffUpdate={handleStaffUpdate} cities={cities} countries={countries} listings={listings} taskTypes={types} languages={languages} />
      <CreateAdminWhatsappDialog open={openCreateDialog} handleClose={() => setOpenCreateDialog(false)} onStaffCreated={newStaff => {
      setStaff([newStaff, ...staff]);
      setTotalCount(prev => prev + 1);
    }} cities={cities} countries={countries} listings={listings} taskTypes={types} languages={languages} />
      <ListingPopup open={listingPopupOpen} onClose={() => setListingPopupOpen(false)} listingIds={selectedListingIds} />

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({
      open: false,
      staff: null
    })} PaperProps={{
      sx: {
        borderRadius: '12px',
        minWidth: '400px'
      }
    }}>
        <DialogTitle sx={{
        fontSize: '16px',
        fontWeight: 700
      }}>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography sx={{
          fontSize: '14px'
        }}>
            Voulez-vous vraiment supprimer <strong>{deleteDialog.staff?.username}</strong> ?
          </Typography>
        </DialogContent>
        <DialogActions sx={{
        p: 2,
        gap: 1
      }}>
          <Button onClick={() => setDeleteDialog({
          open: false,
          staff: null
        })} sx={{
          textTransform: 'none'
        }}>
            Annuler
          </Button>
          <Button onClick={confirmDelete} variant="contained" sx={{
          bgcolor: TEAM_T.error,
          color: 'white !important',
          textTransform: 'none',
          '&:hover': {
            bgcolor: '#a01818'
          }
        }}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>;
};
export default PublicAdminWhatsapp;
