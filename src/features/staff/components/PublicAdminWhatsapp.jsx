import React, { useState, useEffect } from 'react';
import { CircularProgress, Button, Typography, Box, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
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
import { TeamRolesSectionHeader, teamRolesContentPaperSx, teamRolesTableHeaderCellSx, teamRolesTableHeaderCellSxCenter } from '../teamRolesLayout';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  success: '#4CAF50',
  error: '#F44336',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    600: '#757575',
    700: '#616161',
    800: '#424242'
  }
};
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
  return <Box sx={{
    width: '100%',
    minHeight: 0,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    bgcolor: 'transparent'
  }}>
      <TeamRolesSectionHeader titleKey="WhatsApp Admin" icon={<WhatsAppIcon sx={{
      fontSize: 18,
      color: '#fff'
    }} />} chip={<Chip label={`${totalCount} membres`} size="small" sx={{
      bgcolor: SOJORI_COLORS.primary,
      color: 'white !important',
      fontWeight: 700,
      fontSize: '11px',
      height: '22px'
    }} />} actions={canCreate ? <Button onClick={() => setOpenCreateDialog(true)} variant="contained" startIcon={<AddIcon />} sx={{
      bgcolor: SOJORI_COLORS.primary,
      color: 'white !important',
      '&:hover': {
        bgcolor: SOJORI_COLORS.primaryDark
      },
      textTransform: 'none',
      fontWeight: 700,
      fontSize: '12px'
    }}>
              Nouveau
            </Button> : null} />

      <Paper elevation={0} sx={{
      ...teamRolesContentPaperSx,
      px: {
        xs: 0.5,
        sm: 1
      },
      pt: 1,
      pb: 1.5,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      width: '100%'
    }}>
      {/* Filters */}
      <Box sx={{
        px: {
          xs: 0,
          sm: 0
        },
        pt: 0,
        pb: 0
      }}>
        <WhatsappFilters compact searchText={searchText} setSearchText={setSearchText} listings={listings} selectedListings={selectedListings} setSelectedListings={setSelectedListings} selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} selectedAccess={selectedAccess} setSelectedAccess={setSelectedAccess} selectedLanguages={selectedLanguages} setSelectedLanguages={setSelectedLanguages} types={types} languages={languages} onSearch={() => {
          setPage(0);
          fetchStaff();
        }} onReset={() => {
          setSearchText('');
          setSelectedListings([]);
          setSelectedTypes([]);
          setSelectedAccess([]);
          setSelectedLanguages([]);
          setPage(0);
        }} onFilterChange={() => setPage(0)} canCreate={canCreate} page={page} setPage={setPage} limit={limit} setLimit={setLimit} totalItems={totalCount} rowsPerPageOptions={[5, 10, 25, 50, 100]} loading={isLoading} />
      </Box>

      {/* Table */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        px: {
          xs: 0,
          sm: 0.5
        }
      }}>
        {isLoading ? <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
            <CircularProgress sx={{
            color: SOJORI_COLORS.primary
          }} />
          </Box> : staff.length === 0 ? <Box sx={{
          textAlign: 'center',
          py: 4
        }}>
            <WhatsAppIcon sx={{
            fontSize: '48px',
            color: SOJORI_COLORS.gray[300],
            mb: 1
          }} />
            <Typography sx={{
            color: SOJORI_COLORS.gray[600]
          }}>Aucun admin trouvé</Typography>
          </Box> : <TableContainer component={Paper} elevation={0} sx={{
          mt: 0.75,
          overflow: 'auto',
          borderRadius: 1,
          border: '1px solid rgba(15,23,42,0.06)',
          boxShadow: '0 1px 0 rgba(15,23,42,0.04)'
        }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={teamRolesTableHeaderCellSx}>USERNAME</TableCell>
                  {isAdmin && <TableCell sx={teamRolesTableHeaderCellSx}>OWNER</TableCell>}
                  <TableCell sx={teamRolesTableHeaderCellSx}>WHATSAPP</TableCell>
                  <TableCell sx={teamRolesTableHeaderCellSx}>PERMISSIONS</TableCell>
                  <TableCell sx={teamRolesTableHeaderCellSx}>LANGUE</TableCell>
                  <TableCell sx={teamRolesTableHeaderCellSx}>ANNONCES</TableCell>
                  <TableCell sx={teamRolesTableHeaderCellSxCenter}>STATUT</TableCell>
                  <TableCell sx={teamRolesTableHeaderCellSxCenter}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staff.map(row => {
                const perms = row.permissions || [];

                // Mapping des types vers les abréviations
                const TYPE_ABBR = {
                  'Reservation': 'RS',
                  'Réservation': 'RS',
                  'Task': 'TS',
                  'Tâche': 'TS',
                  'Message': 'MS',
                  'Reviews': 'AV',
                  'Avis': 'AV',
                  'ArrivalDeparture': 'DC',
                  'Arrivée/Départ': 'DC'
                };

                // Mapping des access vers les abréviations
                const ACCESS_ABBR = {
                  'write': 'W',
                  'read': 'R',
                  'none': 'N'
                };

                // Créer une map des permissions pour affichage
                const permMap = {};
                perms.forEach(p => {
                  const abbr = TYPE_ABBR[p.type] || p.type.substring(0, 2).toUpperCase();
                  const access = ACCESS_ABBR[p.access] || 'N';
                  permMap[abbr] = access;
                });
                const listingCount = row.listingIds?.includes('All') ? 'Tous' : row.listingIds?.length || 0;
                return <TableRow key={row._id} hover sx={{
                  '&:hover': {
                    bgcolor: '#FFF8F5'
                  }
                }}>
                      <TableCell sx={{
                    p: 1,
                    fontSize: '12px',
                    fontWeight: 600
                  }}>{row.username}</TableCell>
                      {isAdmin && <TableCell sx={{
                    p: 1,
                    fontSize: '11px'
                  }}>
                          {row.owner ? `${row.owner.firstName} ${row.owner.lastName}` : '-'}
                        </TableCell>}
                      <TableCell sx={{
                    p: 1,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 500
                  }}>
                        <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}>
                          <WhatsAppIcon sx={{
                        fontSize: '14px',
                        color: SOJORI_COLORS.success
                      }} />
                          {row.whatsappPhone}
                        </Box>
                      </TableCell>
                      <TableCell sx={{
                    p: 1
                  }}>
                        <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.4
                    }}>
                          {Object.entries(permMap).map(([type, access]) => {
                        const color = access === 'W' ? SOJORI_COLORS.success : access === 'R' ? '#2196F3' : SOJORI_COLORS.gray[400];
                        return <Chip key={type} label={`${type}:${access}`} size="small" sx={{
                          fontSize: '10px',
                          height: '18px',
                          bgcolor: `${color}15`,
                          color: color,
                          fontWeight: 700,
                          fontFamily: 'monospace'
                        }} />;
                      })}
                        </Box>
                      </TableCell>
                      <TableCell sx={{
                    p: 1,
                    fontSize: '11px'
                  }}>{row.language}</TableCell>
                      <TableCell sx={{
                    p: 1,
                    fontSize: '11px',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}>
                        <Chip label={listingCount} size="small" sx={{
                      fontSize: '10px',
                      height: '18px',
                      bgcolor: `${SOJORI_COLORS.success}15`,
                      color: SOJORI_COLORS.success,
                      fontWeight: 700
                    }} />
                      </TableCell>
                      <TableCell sx={{
                    p: 1,
                    textAlign: 'center'
                  }}>
                        <Chip icon={row.banned ? <BlockIcon style={{
                      fontSize: '12px'
                    }} /> : <CheckCircleIcon style={{
                      fontSize: '12px'
                    }} />} label={row.banned ? 'Banned' : 'Actif'} size="small" sx={{
                      fontSize: '10px',
                      height: '20px',
                      fontWeight: 700,
                      ...(row.banned ? {
                        bgcolor: '#FFEBEE',
                        color: SOJORI_COLORS.error
                      } : {
                        bgcolor: '#E8F5E9',
                        color: SOJORI_COLORS.success
                      })
                    }} />
                      </TableCell>
                      <TableCell sx={{
                    p: 0.5,
                    textAlign: 'center'
                  }}>
                        <Box sx={{
                      display: 'flex',
                      gap: 0.5,
                      justifyContent: 'center'
                    }}>
                          {canUpdate && <IconButton onClick={() => handleUpdate(row)} size="small" sx={{
                        width: 28,
                        height: 28,
                        bgcolor: SOJORI_COLORS.primary,
                        color: 'white',
                        '&:hover': {
                          bgcolor: SOJORI_COLORS.primaryDark
                        }
                      }}>
                              <EditIcon sx={{
                          fontSize: '14px'
                        }} />
                            </IconButton>}
                          {canDelete && <IconButton onClick={() => handleDelete(row)} size="small" sx={{
                        width: 28,
                        height: 28,
                        bgcolor: SOJORI_COLORS.error,
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#D32F2F'
                        }
                      }}>
                              <DeleteIcon sx={{
                          fontSize: '14px'
                        }} />
                            </IconButton>}
                        </Box>
                      </TableCell>
                    </TableRow>;
              })}
              </TableBody>
            </Table>
          </TableContainer>}
      </Box>
      </Paper>

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
          bgcolor: SOJORI_COLORS.error,
          color: 'white !important',
          textTransform: 'none',
          '&:hover': {
            bgcolor: '#D32F2F'
          }
        }}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>;
};
export default PublicAdminWhatsapp;
