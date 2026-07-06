/**
 * PublicClientWhiteList - EXACTEMENT comme /Reservation/Liste
 * Header orange sticky + filtres multi-select + pagination compacte
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton,
  TablePagination,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Block as BlockIcon,
  EditOff as EditOffIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
  EventAvailable as EventAvailableIcon,
  Chat as ChatIcon,
  ToggleOn as ToggleOnIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  RemoveCircle as RemoveCircleIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { ToastContainer, toast } from 'react-toastify';
import {
  getClientWhiteList,
  blocClientWhiteList,
  updateClientWhiteList,
  deleteClientWhiteList,
} from '../services/serverApi.task';
import DeleteUserDialog from './DeleteUserDialog';
import ModifyClientWhiteListSidebar from './ModifyClientWhiteListSidebar';
import ReservationDetailsModal from './ReservationDetailsModal';
import { can } from '../../../utils/permissions';
import '../../../features/reservation/pages/reservation.page.css';

const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  gray: {
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
  },
};

// Column widths
const columnWidths = {
  phone: '140px',
  name: '150px',
  country: '120px',
  language: '100px',
  communicated: '120px',
  blocked: '100px',
  reservation: '100px',
  reservationsNbr: '80px',
  reservationNumbers: '400px',
  actions: '150px',
};

const PublicClientWhiteList = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Search - Click-triggered (like TasksNew)
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');

  // Filters
  const [reservationFilter, setReservationFilter] = useState('all');
  const [communicationFilter, setCommunicationFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedListings, setSelectedListings] = useState([]); // Multi-select listing filter

  // Dropdowns
  const [isReservationFilterOpen, setIsReservationFilterOpen] = useState(false);
  const [tempReservationFilter, setTempReservationFilter] = useState('all');
  const [isCommunicationFilterOpen, setIsCommunicationFilterOpen] = useState(false);
  const [tempCommunicationFilter, setTempCommunicationFilter] = useState('all');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState('all');
  const [isListingFilterOpen, setIsListingFilterOpen] = useState(false); // Listing dropdown
  const [pendingListings, setPendingListings] = useState([]); // Temporary selection

  // Modals
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openPermanentDeleteDialog, setOpenPermanentDeleteDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReservationDetails, setSelectedReservationDetails] = useState(null);

  // Permissions
  const [canCreate] = useState(can('create'));
  const [canUpdate] = useState(can('update'));
  const [canDelete] = useState(can('delete'));

  useEffect(() => {
    fetchAdmins();
  }, [page, limit, activeSearchTerm, reservationFilter, communicationFilter, activeFilter, selectedListings]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        searchTerm: activeSearchTerm, // Multi-criteria search
      };

      if (reservationFilter !== 'all') {
        params.reservations = reservationFilter;
      }
      if (communicationFilter !== 'all') {
        params.communication = communicationFilter;
      }
      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }
      if (selectedListings && selectedListings.length > 0) {
        params.listings = selectedListings;
      }

      const response = await getClientWhiteList(params);

      if (response && Array.isArray(response.data)) {
        setAdmins(response.data);
        const total = response.total || 0;
        setTotalCount(total);
      } else {
        setAdmins([]);
        setTotalCount(0);
      }
    } catch {
      setAdmins([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique listings from all clients' reservations
  const availableListings = useMemo(() => {
    const listingSet = new Set();
    admins.forEach(client => {
      if (client.reservationIds && Array.isArray(client.reservationIds)) {
        client.reservationIds.forEach(res => {
          if (res.listingName) {
            listingSet.add(res.listingName);
          }
        });
      }
    });
    return Array.from(listingSet).sort();
  }, [admins]);

  // Search handlers - Click-triggered (like TasksNew)
  const handleSearch = () => {
    setActiveSearchTerm(searchInput);
    setPage(0);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearchTerm('');
    setPage(0);
  };

  const handleReset = () => {
    setSearchInput('');
    setActiveSearchTerm('');
    setReservationFilter('all');
    setCommunicationFilter('all');
    setActiveFilter('all');
    setSelectedListings([]);
    setPendingListings([]);
    setPage(0);
  };

  const handleUpdate = (adminMember, action) => {
    setSelectedAdmin(adminMember);
    switch (action) {
      case 'deleteClientWithList':
        setOpenDeleteDialog(true);
        break;
      case 'permanentDeleteClientWithList':
        setOpenPermanentDeleteDialog(true);
        break;
      case 'updateClientWithList':
        setOpenUpdateDialog(true);
        break;
      default:
        break;
    }
  };

  const blocFunction = async () => {
    try {
      const { data } = await blocClientWhiteList(selectedAdmin._id);
      setAdmins((prevAdmins) =>
        prevAdmins.map((admin) =>
          admin._id === selectedAdmin._id ? data : admin
        )
      );
      toast.success(`Client ${selectedAdmin.phone} bloqué avec succès`);
      setOpenDeleteDialog(false);
    } catch {
      toast.error('Échec du blocage du client');
    }
  };

  const updateFunction = async (id, body) => {
    try {
      const { data } = await updateClientWhiteList(id, body);
      setAdmins((prevAdmins) =>
        prevAdmins.map((admin) =>
          admin._id === id ? data : admin
        )
      );
      setOpenUpdateDialog(false);
      toast.success('Client mis à jour');
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur mise à jour client');
    }
  };

  const deleteFunction = async () => {
    try {
      await deleteClientWhiteList(selectedAdmin._id);
      setAdmins((prevAdmins) =>
        prevAdmins.filter((admin) => admin._id !== selectedAdmin._id)
      );
      toast.success(`Client ${selectedAdmin.phone} supprimé définitivement`);
      setOpenPermanentDeleteDialog(false);
    } catch {
      toast.error('Échec de la suppression du client');
    }
  };

  // Paginated data
  const paginatedData = useMemo(() => {
    return admins;
  }, [admins]);

  const reservationOptions = [
    { value: 'all', label: 'Tous', icon: <RemoveCircleIcon fontSize="small" />, color: '#64748B' },
    { value: 'true', label: '✓', icon: <CheckCircleIcon fontSize="small" />, color: '#4CAF50' },
    { value: 'false', label: '✗', icon: <CancelIcon fontSize="small" />, color: '#F44336' },
  ];

  const communicationOptions = [
    { value: 'all', label: 'Tous', icon: <RemoveCircleIcon fontSize="small" />, color: '#64748B' },
    { value: 'true', label: '✓', icon: <CheckCircleIcon fontSize="small" />, color: '#4CAF50' },
    { value: 'false', label: '✗', icon: <CancelIcon fontSize="small" />, color: '#F44336' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Tous', icon: <RemoveCircleIcon fontSize="small" />, color: '#64748B' },
    { value: 'active', label: 'Actif', icon: <CheckCircleIcon fontSize="small" />, color: '#4CAF50' },
    { value: 'blocked', label: 'Bloqué', icon: <BlockIcon fontSize="small" />, color: '#F44336' },
  ];

  return (
    <div className="card !px-4">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex flex-col h-full">
        {/* Filters */}
        <div className="p-3 border-b border-slate-200 bg-white" style={{ backgroundColor: 'lightblue' }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Left side filters */}
            <div className="flex items-center gap-2">
              {/* Multi-criteria Search */}
              <TextField
                placeholder="Rechercher (téléphone, nom, réservation, listing)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                size="small"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon style={{ color: activeSearchTerm ? '#dc2626' : SOJORI_COLORS.primary, fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchInput && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={handleClearSearch}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  width: 350,
                  ...(activeSearchTerm && {
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#dc2626', borderWidth: 2 },
                      backgroundColor: '#fee2e2',
                    },
                  }),
                }}
              />

              {/* Search Button */}
              <Tooltip title="Rechercher">
                <IconButton
                  onClick={handleSearch}
                size="small"
                sx={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  '&:hover': { backgroundColor: '#B8881A' },
                }}
              >
                <SearchIcon />
              </IconButton>
              </Tooltip>

              {/* Reservation Filter */}
              <div className="relative">
                <TextField
                  label="Réservation"
                  value={reservationFilter === 'all' ? 'Tous' : reservationFilter === 'true' ? '✓' : '✗'}
                  onClick={() => {
                    setTempReservationFilter(reservationFilter);
                    setIsReservationFilterOpen(!isReservationFilterOpen);
                  }}
                  size="small"
                  slotProps={{
                    input: {
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <EventAvailableIcon style={{ fontSize: 20, color: reservationFilter !== 'all' ? '#dc2626' : SOJORI_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    width: 160,
                    '& .MuiOutlinedInput-root': {
                      cursor: 'pointer',
                      ...(reservationFilter !== 'all' && {
                        '& fieldset': { borderColor: '#dc2626', borderWidth: 2 },
                        backgroundColor: '#fee2e2',
                      }),
                    },
                  }}
                />

                {isReservationFilterOpen && (
                  <div className="absolute z-[1100] mt-1 w-56 bg-white border border-slate-300 rounded-lg shadow-xl">
                    <div className="sticky top-0 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <EventAvailableIcon fontSize="small" />
                        <span className="text-sm font-semibold">Réservation</span>
                      </div>
                      <button onClick={() => setIsReservationFilterOpen(false)} className="text-white hover:bg-white/20 rounded px-1">
                        <CloseIcon fontSize="small" />
                      </button>
                    </div>
                    <div className="p-2">
                      {reservationOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded cursor-pointer transition-all"
                          style={{ backgroundColor: tempReservationFilter === option.value ? '#FFF3E0' : undefined }}
                        >
                          <div style={{ color: option.color }}>
                            {option.icon}
                          </div>
                          <input
                            type="radio"
                            name="reservation"
                            checked={tempReservationFilter === option.value}
                            onChange={() => setTempReservationFilter(option.value)}
                            className="w-4 h-4 accent-[#E6B022] cursor-pointer"
                          />
                          <span className="flex-1 text-sm font-medium" style={{ color: tempReservationFilter === option.value ? '#E6B022' : '#1f2937' }}>
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                      <button
                        onClick={() => setTempReservationFilter('all')}
                        className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => {
                          setReservationFilter(tempReservationFilter);
                          setPage(0);
                          setIsReservationFilterOpen(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Communication Filter */}
              <div className="relative">
                <TextField
                  label="Communication"
                  value={communicationFilter === 'all' ? 'Tous' : communicationFilter === 'true' ? '✓' : '✗'}
                  onClick={() => {
                    setTempCommunicationFilter(communicationFilter);
                    setIsCommunicationFilterOpen(!isCommunicationFilterOpen);
                  }}
                  size="small"
                  slotProps={{
                    input: {
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <ChatIcon style={{ fontSize: 20, color: communicationFilter !== 'all' ? '#dc2626' : SOJORI_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    width: 180,
                    '& .MuiOutlinedInput-root': {
                      cursor: 'pointer',
                      ...(communicationFilter !== 'all' && {
                        '& fieldset': { borderColor: '#dc2626', borderWidth: 2 },
                        backgroundColor: '#fee2e2',
                      }),
                    },
                  }}
                />

                {isCommunicationFilterOpen && (
                  <div className="absolute z-[1100] mt-1 w-56 bg-white border border-slate-300 rounded-lg shadow-xl">
                    <div className="sticky top-0 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChatIcon fontSize="small" />
                        <span className="text-sm font-semibold">Communication</span>
                      </div>
                      <button onClick={() => setIsCommunicationFilterOpen(false)} className="text-white hover:bg-white/20 rounded px-1">
                        <CloseIcon fontSize="small" />
                      </button>
                    </div>
                    <div className="p-2">
                      {communicationOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded cursor-pointer transition-all"
                          style={{ backgroundColor: tempCommunicationFilter === option.value ? '#FFF3E0' : undefined }}
                        >
                          <div style={{ color: option.color }}>
                            {option.icon}
                          </div>
                          <input
                            type="radio"
                            name="communication"
                            checked={tempCommunicationFilter === option.value}
                            onChange={() => setTempCommunicationFilter(option.value)}
                            className="w-4 h-4 accent-[#E6B022] cursor-pointer"
                          />
                          <span className="flex-1 text-sm font-medium" style={{ color: tempCommunicationFilter === option.value ? '#E6B022' : '#1f2937' }}>
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                      <button
                        onClick={() => setTempCommunicationFilter('all')}
                        className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => {
                          setCommunicationFilter(tempCommunicationFilter);
                          setPage(0);
                          setIsCommunicationFilterOpen(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <TextField
                  label="Statut"
                  value={statusOptions.find(s => s.value === activeFilter)?.label || 'Tous'}
                  onClick={() => {
                    setTempStatusFilter(activeFilter);
                    setIsStatusFilterOpen(!isStatusFilterOpen);
                  }}
                  size="small"
                  slotProps={{
                    input: {
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <ToggleOnIcon style={{ fontSize: 20, color: activeFilter !== 'all' ? '#dc2626' : SOJORI_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    width: 160,
                    '& .MuiOutlinedInput-root': {
                      cursor: 'pointer',
                      ...(activeFilter !== 'all' && {
                        '& fieldset': { borderColor: '#dc2626', borderWidth: 2 },
                        backgroundColor: '#fee2e2',
                      }),
                    },
                  }}
                />

                {isStatusFilterOpen && (
                  <div className="absolute z-[1100] mt-1 w-56 bg-white border border-slate-300 rounded-lg shadow-xl">
                    <div className="sticky top-0 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ToggleOnIcon fontSize="small" />
                        <span className="text-sm font-semibold">Statut</span>
                      </div>
                      <button onClick={() => setIsStatusFilterOpen(false)} className="text-white hover:bg-white/20 rounded px-1">
                        <CloseIcon fontSize="small" />
                      </button>
                    </div>
                    <div className="p-2">
                      {statusOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded cursor-pointer transition-all"
                          style={{ backgroundColor: tempStatusFilter === option.value ? '#FFF3E0' : undefined }}
                        >
                          <div style={{ color: option.color }}>
                            {option.icon}
                          </div>
                          <input
                            type="radio"
                            name="status"
                            checked={tempStatusFilter === option.value}
                            onChange={() => setTempStatusFilter(option.value)}
                            className="w-4 h-4 accent-[#E6B022] cursor-pointer"
                          />
                          <span className="flex-1 text-sm font-medium" style={{ color: tempStatusFilter === option.value ? '#E6B022' : '#1f2937' }}>
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                      <button
                        onClick={() => setTempStatusFilter('all')}
                        className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter(tempStatusFilter);
                          setPage(0);
                          setIsStatusFilterOpen(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Listing Filter - Multi-select */}
              <div className="relative listing-filter-dropdown">
                <TextField
                  label="Propriété"
                  value={selectedListings.length === 0 ? 'Toutes' : `${selectedListings.length} sélectionné${selectedListings.length > 1 ? 's' : ''}`}
                  onClick={() => {
                    setPendingListings([...selectedListings]);
                    setIsListingFilterOpen(!isListingFilterOpen);
                  }}
                  size="small"
                  slotProps={{
                    input: {
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <HomeIcon style={{ fontSize: 20, color: selectedListings.length > 0 ? '#dc2626' : SOJORI_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    width: 180,
                    '& .MuiOutlinedInput-root': {
                      cursor: 'pointer',
                      ...(selectedListings.length > 0 && {
                        '& fieldset': { borderColor: '#dc2626', borderWidth: 2 },
                        backgroundColor: '#fee2e2',
                      }),
                    },
                  }}
                />

                {isListingFilterOpen && (
                  <div className="absolute z-[1100] mt-1 w-80 bg-white border border-slate-300 rounded-lg shadow-xl" style={{ maxHeight: '400px' }}>
                    <div className="sticky top-0 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HomeIcon fontSize="small" />
                        <span className="text-sm font-semibold">
                          {pendingListings.length > 0 ? `${pendingListings.length} sélectionné${pendingListings.length > 1 ? 's' : ''}` : 'Sélectionner des propriétés'}
                        </span>
                      </div>
                      <button onClick={() => setIsListingFilterOpen(false)} className="text-white hover:bg-white/20 rounded px-1">
                        <CloseIcon fontSize="small" />
                      </button>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {availableListings.map((listingName) => {
                        const isSelected = pendingListings.includes(listingName);
                        return (
                          <label
                            key={listingName}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                            style={{ backgroundColor: isSelected ? '#FFF3E0' : undefined }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const newListings = isSelected
                                  ? pendingListings.filter(name => name !== listingName)
                                  : [...pendingListings, listingName];
                                setPendingListings(newListings);
                              }}
                              className="w-4 h-4 accent-[#E6B022] cursor-pointer"
                            />
                            <HomeIcon style={{ fontSize: 16, color: isSelected ? '#E6B022' : '#9ca3af' }} />
                            <span className="flex-1 text-sm" style={{ color: isSelected ? '#E6B022' : '#1f2937' }}>
                              {listingName}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                      <button
                        onClick={() => setPendingListings([])}
                        className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => {
                          setSelectedListings([...pendingListings]);
                          setPage(0);
                          setIsListingFilterOpen(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <IconButton
                onClick={fetchAdmins}
                size="small"
                title="Actualiser"
                sx={{
                  color: SOJORI_COLORS.primary,
                  border: '1px solid #e0e0e0',
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </div>

            {/* Right side: Pagination */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center bg-gradient-to-r from-[#E6B022] to-[#B8881A] rounded-lg px-3 py-1.5">
                <span className="text-white font-bold text-xs">
                  {totalCount} client{totalCount > 1 ? 's' : ''}
                </span>
              </div>
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={limit}
                onRowsPerPageChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 20, 50]}
                labelRowsPerPage=""
                labelDisplayedRows={({ from, to, count }) => `${from}-${to}/${count}`}
                sx={{
                  '& .MuiTablePagination-toolbar': { minHeight: 32, padding: '0 4px' },
                  '& .MuiTablePagination-selectLabel': { display: 'none' },
                  '& .MuiTablePagination-displayedRows': { fontSize: 11, margin: 0 },
                  '& .MuiTablePagination-select': { fontSize: 11, paddingTop: 0, paddingBottom: 0 },
                  '& .MuiTablePagination-actions': { marginLeft: '4px' },
                  '& .MuiIconButton-root': { padding: '4px' },
                }}
              />
            </div>
          </div>

          {/* Active filters indicator */}
          {(activeSearchTerm || reservationFilter !== 'all' || communicationFilter !== 'all' || activeFilter !== 'all') && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-slate-600">Filtres actifs:</span>
              {activeSearchTerm && (
                <Chip
                  label={`Recherche: ${activeSearchTerm}`}
                  size="small"
                  onDelete={handleClearSearch}
                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.7rem' }}
                />
              )}
              {reservationFilter !== 'all' && (
                <Chip
                  label={`Réservation: ${reservationFilter === 'true' ? 'Oui' : 'Non'}`}
                  size="small"
                  onDelete={() => { setReservationFilter('all'); setPage(0); }}
                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.7rem' }}
                />
              )}
              {communicationFilter !== 'all' && (
                <Chip
                  label={`Communication: ${communicationFilter === 'true' ? 'Oui' : 'Non'}`}
                  size="small"
                  onDelete={() => { setCommunicationFilter('all'); setPage(0); }}
                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.7rem' }}
                />
              )}
              {activeFilter !== 'all' && (
                <Chip
                  label={`Statut: ${statusOptions.find(s => s.value === activeFilter)?.label}`}
                  size="small"
                  onDelete={() => { setActiveFilter('all'); setPage(0); }}
                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.7rem' }}
                />
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto reservations-table-container">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <CircularProgress style={{ color: SOJORI_COLORS.primary }} />
            </div>
          ) : (
            <Table stickyHeader sx={{ minWidth: 1600 }}>
              <TableHead className="reservations-table-head">
                <TableRow>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.phone, minWidth: columnWidths.phone, padding: '8px', fontSize: '0.875rem' }}>Phone</TableCell>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.name, minWidth: columnWidths.name, padding: '8px', fontSize: '0.875rem' }}>Nom</TableCell>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.country, minWidth: columnWidths.country, padding: '8px', fontSize: '0.875rem' }}>Pays</TableCell>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.language, minWidth: columnWidths.language, padding: '8px', fontSize: '0.875rem' }}>Langue</TableCell>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.communicated, minWidth: columnWidths.communicated, padding: '8px', fontSize: '0.875rem', textAlign: 'center' }}>Communiqué</TableCell>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.blocked, minWidth: columnWidths.blocked, padding: '8px', fontSize: '0.875rem', textAlign: 'center' }}>Bloqué</TableCell>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.reservation, minWidth: columnWidths.reservation, padding: '8px', fontSize: '0.875rem', textAlign: 'center' }}>Réservation</TableCell>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.reservationsNbr, minWidth: columnWidths.reservationsNbr, padding: '8px', fontSize: '0.875rem', textAlign: 'center' }}>#</TableCell>
                  <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.reservationNumbers, minWidth: columnWidths.reservationNumbers, padding: '8px', fontSize: '0.875rem' }}>Numéros Réservation</TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell style={{ backgroundColor: SOJORI_COLORS.primary, color: 'white', fontWeight: 'bold', width: columnWidths.actions, minWidth: columnWidths.actions, padding: '8px', fontSize: '0.875rem' }}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canUpdate || canDelete ? 10 : 9} style={{ textAlign: 'center', padding: '32px', color: SOJORI_COLORS.gray[600] }}>
                      Aucun client trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((rowData) => (
                    <TableRow key={rowData._id} hover>
                      {/* Phone */}
                      <TableCell className="px-2 py-2">
                        <Tooltip title={rowData.phone} placement="left">
                          <Chip
                            label={rowData.phone}
                            size="small"
                            style={{ backgroundColor: SOJORI_COLORS.info, color: 'white', fontSize: '0.75rem', fontWeight: 500 }}
                          />
                        </Tooltip>
                      </TableCell>

                      {/* Name */}
                      <TableCell className="px-2 py-2">
                        <span className="text-sm font-medium text-slate-900">{rowData.name || 'N/A'}</span>
                      </TableCell>

                      {/* Country */}
                      <TableCell className="px-2 py-2">
                        <span className="text-sm text-slate-700">{rowData.country || 'N/A'}</span>
                      </TableCell>

                      {/* Language */}
                      <TableCell className="px-2 py-2">
                        <span className="text-sm text-slate-700">{rowData.language || 'N/A'}</span>
                      </TableCell>

                      {/* Communicated */}
                      <TableCell className="px-2 py-2 text-center">
                        <span className="text-base font-semibold" style={{ color: rowData.communicated ? SOJORI_COLORS.success : SOJORI_COLORS.gray[600] }}>
                          {rowData.communicated ? '✓' : '✗'}
                        </span>
                      </TableCell>

                      {/* Blocked */}
                      <TableCell className="px-2 py-2 text-center">
                        <span className="text-base font-semibold" style={{ color: rowData.blocked ? SOJORI_COLORS.error : SOJORI_COLORS.gray[600] }}>
                          {rowData.blocked ? '✓' : '✗'}
                        </span>
                      </TableCell>

                      {/* Reservation */}
                      <TableCell className="px-2 py-2 text-center">
                        <span className="text-base font-semibold" style={{ color: rowData.reservation ? SOJORI_COLORS.success : SOJORI_COLORS.gray[600] }}>
                          {rowData.reservation ? '✓' : '✗'}
                        </span>
                      </TableCell>

                      {/* Reservations Number */}
                      <TableCell className="px-2 py-2 text-center">
                        <span className="text-sm font-bold text-slate-900">{(rowData.reservationIds || []).length}</span>
                      </TableCell>

                      {/* Reservation Numbers */}
                      <TableCell className="px-2 py-2">
                        {(rowData.reservationIds || []).length === 0 ? (
                          <span className="text-gray-400 text-sm italic">Pas de réservations</span>
                        ) : (
                          <div className="flex flex-col gap-2 py-1">
                            {rowData.reservationIds.map((reservation, index) => (
                              <div
                                key={reservation.reservationId || index}
                                className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded transition-colors"
                              >
                                <span className="font-medium text-sm text-[#E6B022]">
                                  #{reservation.reservationNumber || 'N/A'}
                                </span>
                                {reservation.listingName && (
                                  <span className="text-xs font-medium text-gray-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    🏠 {reservation.listingName}
                                  </span>
                                )}
                                {reservation.whatsapp_config?.has_config && (
                                  <span className="text-xs bg-green-100 px-2 py-0.5 rounded text-green-700 font-medium">
                                    💬 {reservation.whatsapp_config.menu_options_count}
                                  </span>
                                )}
                                <button
                                  className="ml-auto p-1.5 hover:bg-orange-100 rounded-full transition-colors"
                                  onClick={() => {
                                    setSelectedReservationDetails(reservation);
                                    setDetailsModalOpen(true);
                                  }}
                                  title="Voir les détails"
                                >
                                  <SearchIcon style={{ fontSize: 18, color: '#E6B022' }} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      {/* Actions */}
                      {(canUpdate || canDelete) && (
                        <TableCell className="px-2 py-2">
                          <div className="flex gap-1 items-center justify-center">
                            {canUpdate && (
                              <Tooltip title="Modifier Client" placement="top">
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdate(rowData, 'updateClientWithList')}
                                  disabled={rowData.deleted}
                                  sx={{
                                    color: SOJORI_COLORS.primary,
                                    padding: '4px',
                                    '&:hover': {
                                      backgroundColor: 'rgba(255, 107, 53, 0.1)',
                                    },
                                    transition: 'all 0.2s',
                                    '&:disabled': {
                                      color: '#ccc',
                                    }
                                  }}
                                >
                                  <EditOffIcon style={{ fontSize: 20 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && (
                              <>
                                <Tooltip title="Bloquer Client" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleUpdate(rowData, 'deleteClientWithList')}
                                    disabled={rowData.deleted}
                                    sx={{
                                      color: SOJORI_COLORS.warning,
                                      padding: '4px',
                                      '&:hover': {
                                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                      },
                                      transition: 'all 0.2s',
                                      '&:disabled': {
                                        color: '#ccc',
                                      }
                                    }}
                                  >
                                    <BlockIcon style={{ fontSize: 20 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Supprimer Définitivement" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleUpdate(rowData, 'permanentDeleteClientWithList')}
                                    disabled={rowData.deleted}
                                    sx={{
                                      color: SOJORI_COLORS.error,
                                      padding: '4px',
                                      '&:hover': {
                                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                      },
                                      transition: 'all 0.2s',
                                      '&:disabled': {
                                        color: '#ccc',
                                      }
                                    }}
                                  >
                                    <DeleteIcon style={{ fontSize: 20 }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Modals */}
      <DeleteUserDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onAdminCreated={() => toast.success('Client bloqué avec succès')}
        functionToExecute={blocFunction}
        user={selectedAdmin}
        title="Bloquer Client"
        message={`Êtes-vous sûr de vouloir bloquer ${selectedAdmin?.phone || ''} ?`}
        btnTxt="Bloquer"
        btnClass="text-white !bg-red-600 !hover:bg-red-600/90"
      />

      <DeleteUserDialog
        open={openPermanentDeleteDialog}
        onClose={() => setOpenPermanentDeleteDialog(false)}
        onAdminCreated={() => toast.success('Client supprimé définitivement')}
        functionToExecute={deleteFunction}
        user={selectedAdmin}
        title="Supprimer Définitivement"
        message={`⚠️ ATTENTION: Cela supprimera DÉFINITIVEMENT ${selectedAdmin?.phone || ''} de la liste blanche. Cette action ne peut PAS être annulée!`}
        btnTxt="Supprimer Définitivement"
        btnClass="text-white !bg-red-700 !hover:bg-red-800/90"
      />

      <ModifyClientWhiteListSidebar
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
        staff={selectedAdmin}
        onSubmit={(id, body) => updateFunction(id, body)}
        onRefresh={fetchAdmins}
      />

      <ReservationDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        reservation={selectedReservationDetails}
      />
    </div>
  );
};

export default PublicClientWhiteList;
