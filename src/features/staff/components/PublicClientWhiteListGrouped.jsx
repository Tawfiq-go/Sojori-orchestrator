/**
 * PublicClientWhiteListGrouped - Vue groupée par téléphone
 * Design inspiré de TasksNew avec infos AI visibles immédiatement
 *
 * Structure:
 * - Ligne 1: Numéro téléphone (rowspan pour toutes les réservations)
 * - Lignes 2+: Chaque réservation du même numéro
 * - Colonnes: Réservation, Listing, Adultes (V/N/D), Heures, Catégories WhatsApp, Actions
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, InputAdornment, IconButton, TablePagination, CircularProgress, Chip, Tooltip, TableContainer, Paper, Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, Radio, RadioGroup, FormControlLabel, FormLabel } from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Close as CloseIcon, CheckCircle as CheckCircleIcon, Home as HomeIcon, Person as PersonIcon, AccessTime as AccessTimeIcon, WhatsApp as WhatsAppIcon, ExitToApp as ExitToAppIcon, Login as LoginIcon, Fullscreen as FullscreenIcon, ArrowDropDown as ArrowDropDownIcon, Language as LanguageIcon, Block as BlockIcon, Chat as ChatIcon, FilterList as FilterListIcon, AssignmentTurnedIn as AssignmentTurnedInIcon, DateRange as DateRangeIcon, Numbers as NumbersIcon, FilterAlt as FilterAltIcon, RestartAlt as RestartAltIcon, ManageAccounts as ManageAccountsIcon } from '@mui/icons-material';
import { ToastContainer, toast } from 'react-toastify';
import { getClientWhiteList, getOwnersAllPages, updateClientWhiteList } from '../services/serverApi.task';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from 'utils/rbac.utils';
import { getOwnerListLabel } from 'utils/ownerDisplay.utils';
import ReservationDetailsModal from './ReservationDetailsModal';
import ModifyClientWhiteListSidebar from './ModifyClientWhiteListSidebar';
import '../../../features/reservation/pages/reservation.page.css';
const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161'
  }
};

const PublicClientWhiteListGrouped = () => {
  const { user } = useSelector(state => state.auth);
  const isAdmin = hasAdminAccess(user?.role);
  const [owners, setOwners] = useState([]);
  const [ownerIdFilter, setOwnerIdFilter] = useState('');

  const ownerIdForRequest = useMemo(() => {
    if (isAdmin) {
      return ownerIdFilter && String(ownerIdFilter).trim() !== '' ? String(ownerIdFilter).trim() : null;
    }
    if (!user) return null;
    if (user.role === 'Owner') return user._id || user.id || null;
    if (user.role === 'Worker' && user.ownerId) return user.ownerId;
    return null;
  }, [isAdmin, ownerIdFilter, user]);

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [searchText, setSearchText] = useState('');

  // Visible filters
  const [selectedListings, setSelectedListings] = useState([]); // Multi-select listing filter
  const [isListingFilterOpen, setIsListingFilterOpen] = useState(false);
  const [pendingListings, setPendingListings] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]); // Multi-select language filter
  const [isLanguageFilterOpen, setIsLanguageFilterOpen] = useState(false);
  const [pendingLanguages, setPendingLanguages] = useState([]);
  const [blockedFilter, setBlockedFilter] = useState('all'); // all, true, false
  const [isBlockedFilterOpen, setIsBlockedFilterOpen] = useState(false);
  const [tempBlockedFilter, setTempBlockedFilter] = useState('all');
  const [communicationFilter, setCommunicationFilter] = useState('all'); // all, true, false
  const [isCommunicationFilterOpen, setIsCommunicationFilterOpen] = useState(false);
  const [tempCommunicationFilter, setTempCommunicationFilter] = useState('all');
  const [reservationStatusFilter, setReservationStatusFilter] = useState('all'); // all, ongoing, completed, cancelled
  const [isReservationStatusFilterOpen, setIsReservationStatusFilterOpen] = useState(false);
  const [tempReservationStatusFilter, setTempReservationStatusFilter] = useState('all');

  // Advanced filters modal
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [checkinStatusFilter, setCheckinStatusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start: '',
    end: ''
  });
  const [dateType, setDateType] = useState('arrival'); // 'arrival' or 'departure'
  const [reservationCountFilter, setReservationCountFilter] = useState('all');

  // Temporary states for advanced filters modal
  const [tempDateRange, setTempDateRange] = useState({
    start: '',
    end: ''
  });
  const [tempDateType, setTempDateType] = useState('arrival');
  const [tempCheckinStatus, setTempCheckinStatus] = useState('all');
  const [tempReservationCount, setTempReservationCount] = useState('all');

  // Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReservationDetails, setSelectedReservationDetails] = useState(null);

  // Sidebar pour modifier client (ajouter/supprimer réservations)
  const [modifySidebarOpen, setModifySidebarOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Refs pour scroll sync (comme TasksNew)
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const stickyScrollRef = useRef(null);
  const isSyncingScroll = useRef(false);

  // Attach scroll listeners with useEffect - 3-way sync (copié de TasksNew)
  useEffect(() => {
    const headerElement = headerScrollRef.current;
    const bodyElement = bodyScrollRef.current;
    const stickyElement = stickyScrollRef.current;
    if (!headerElement || !bodyElement || !stickyElement) {
      return;
    }
    const syncAll = (source, scrollLeft) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      if (source !== 'body') bodyElement.scrollLeft = scrollLeft;
      if (source !== 'header') headerElement.scrollLeft = scrollLeft;
      if (source !== 'sticky') stickyElement.scrollLeft = scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    };
    const syncFromBody = () => syncAll('body', bodyElement.scrollLeft);
    const syncFromHeader = () => syncAll('header', headerElement.scrollLeft);
    const syncFromSticky = () => syncAll('sticky', stickyElement.scrollLeft);
    bodyElement.addEventListener('scroll', syncFromBody, {
      passive: true
    });
    headerElement.addEventListener('scroll', syncFromHeader, {
      passive: true
    });
    stickyElement.addEventListener('scroll', syncFromSticky, {
      passive: true
    });
    return () => {
      bodyElement.removeEventListener('scroll', syncFromBody);
      headerElement.removeEventListener('scroll', syncFromHeader);
      stickyElement.removeEventListener('scroll', syncFromSticky);
    };
  }, []);
  useEffect(() => {
    if (!isAdmin) return;
    let cancel = false;
    (async () => {
      try {
        const rows = await getOwnersAllPages({ search_text: '' });
        if (!cancel) setOwners(Array.isArray(rows) ? rows : []);
      } catch (_) {
        if (!cancel) setOwners([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isAdmin]);
  useEffect(() => {
    fetchData();
  }, [page, limit, searchText, selectedListings, selectedLanguages, blockedFilter, communicationFilter, reservationStatusFilter, ownerIdForRequest]);

  // Initialize temp states when opening advanced filters modal
  useEffect(() => {
    if (advancedFiltersOpen) {
      setTempDateRange(dateRangeFilter);
      setTempDateType(dateType);
      setTempCheckinStatus(checkinStatusFilter);
      setTempReservationCount(reservationCountFilter);
    }
  }, [advancedFiltersOpen]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        searchTerm: searchText,
        // Multi-criteria search (phone, name, reservation, listing)
        reservations: true // Seulement clients avec réservations
      };
      if (selectedListings && selectedListings.length > 0) {
        params.listings = selectedListings;
      }
      if (selectedLanguages && selectedLanguages.length > 0) {
        params.languages = selectedLanguages;
      }
      if (blockedFilter !== 'all') {
        params.status = blockedFilter; // 'active' or 'blocked'
      }
      if (communicationFilter !== 'all') {
        params.communication = communicationFilter; // 'true' or 'false'
      }
      if (reservationStatusFilter !== 'all') {
        params.reservationStatus = reservationStatusFilter; // 'ongoing', 'completed', 'cancelled'
      }
      if (ownerIdForRequest) {
        params.ownerId = ownerIdForRequest;
      }
      const response = await getClientWhiteList(params);
      if (response && Array.isArray(response.data)) {
        setRawData(response.data);
        setTotalCount(response.total || 0);
      } else {
        setRawData([]);
        setTotalCount(0);
      }
    } catch (error) {
      setRawData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };
  const handleApplySearch = () => {
    setSearchText(searchInput);
    setPage(0);
  };
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchText('');
    setPage(0);
  };

  // Reset all filters
  const handleResetAllFilters = () => {
    setSearchInput('');
    setSearchText('');
    setSelectedListings([]);
    setSelectedLanguages([]);
    setBlockedFilter('all');
    setCommunicationFilter('all');
    setReservationStatusFilter('all');
    setCheckinStatusFilter('all');
    setDateRangeFilter({
      start: '',
      end: ''
    });
    setReservationCountFilter('all');
    setOwnerIdFilter('');
    setPage(0);
  };

  // Check if any filter is active
  const hasActiveFilters = searchText !== '' || selectedListings.length > 0 || selectedLanguages.length > 0 || blockedFilter !== 'all' || communicationFilter !== 'all' || reservationStatusFilter !== 'all' || checkinStatusFilter !== 'all' || dateRangeFilter.start !== '' || dateRangeFilter.end !== '' || reservationCountFilter !== 'all' || (isAdmin && ownerIdFilter !== '');

  // Extract unique listings from data for filter
  const availableListings = useMemo(() => {
    const listingSet = new Set();
    rawData.forEach(client => {
      if (client.reservationIds && Array.isArray(client.reservationIds)) {
        client.reservationIds.forEach(res => {
          if (res.listingName) {
            listingSet.add(res.listingName);
          }
        });
      }
    });
    return Array.from(listingSet).sort();
  }, [rawData]);

  // Extract unique languages from data for filter
  const availableLanguages = useMemo(() => {
    const languageSet = new Set();
    rawData.forEach(client => {
      if (client.language) {
        languageSet.add(client.language);
      }
      if (client.detected_language && client.detected_language !== client.language) {
        languageSet.add(client.detected_language);
      }
    });
    return Array.from(languageSet).sort();
  }, [rawData]);

  // Filter options
  const blockedOptions = [{
    value: 'all',
    label: 'Tous',
    icon: <CheckCircleIcon fontSize="small" />,
    color: SOJORI_COLORS.primary
  }, {
    value: 'active',
    label: 'Actif',
    icon: <CheckCircleIcon fontSize="small" />,
    color: SOJORI_COLORS.success
  }, {
    value: 'blocked',
    label: 'Bloqué',
    icon: <BlockIcon fontSize="small" />,
    color: SOJORI_COLORS.error
  }];
  const communicationOptions = [{
    value: 'all',
    label: 'Tous',
    icon: <ChatIcon fontSize="small" />,
    color: SOJORI_COLORS.primary
  }, {
    value: 'true',
    label: 'Communiqué',
    icon: <CheckCircleIcon fontSize="small" />,
    color: SOJORI_COLORS.success
  }, {
    value: 'false',
    label: 'Non communiqué',
    icon: <CloseIcon fontSize="small" />,
    color: SOJORI_COLORS.error
  }];
  const reservationStatusOptions = [{
    value: 'all',
    label: 'Tous',
    icon: <DateRangeIcon fontSize="small" />,
    color: SOJORI_COLORS.primary
  }, {
    value: 'ongoing',
    label: 'En cours',
    icon: <AssignmentTurnedInIcon fontSize="small" />,
    color: SOJORI_COLORS.success
  }, {
    value: 'completed',
    label: 'Terminées',
    icon: <CheckCircleIcon fontSize="small" />,
    color: SOJORI_COLORS.info
  }, {
    value: 'cancelled',
    label: 'Annulées',
    icon: <CloseIcon fontSize="small" />,
    color: SOJORI_COLORS.error
  }];

  // Column widths - ensures header and body columns align perfectly (comme TasksNew)
  const columnWidths = {
    phone: '140px',
    // Téléphone (sticky left)
    language: '50px',
    // Lng
    blocked: '55px',
    // Blq
    communicated: '55px',
    // Com
    reservation: '120px',
    // Réservation
    listing: '150px',
    // Listing
    dates: '70px',
    // Dates
    aci: '80px',
    // A/C/I
    vdn: '110px',
    // V/D/N
    arrival: '110px',
    // Arrivée (avec booléens)
    departure: '110px',
    // Départ (avec booléens)
    status: '80px',
    // Statut
    whatsapp: '160px',
    // WhatsApp
    actions: '80px' // Actions
  };

  // Calculate total table width
  const totalTableWidth = Object.values(columnWidths).reduce((acc, width) => {
    return acc + parseInt(width);
  }, 0) + 'px';

  // Flatten data: un client peut avoir N réservations
  const flattenedData = useMemo(() => {
    const result = [];
    rawData.forEach(client => {
      const reservations = client.reservationIds || [];
      if (reservations.length === 0) {
        // Client sans réservations (ne devrait pas arriver avec filter)
        result.push({
          phone: client.phone,
          name: client.name,
          language: client.language,
          blocked: client.blocked,
          reservationCount: 0,
          isFirstRow: true,
          rowSpan: 1,
          reservation: null
        });
      } else {
        // Client avec réservations
        reservations.forEach((reservation, index) => {
          result.push({
            phone: client.phone,
            name: client.name,
            language: client.language,
            detected_language: client.detected_language,
            blocked: client.blocked,
            reservationCount: reservations.length,
            isFirstRow: index === 0,
            // Première ligne affiche le phone avec rowspan
            rowSpan: reservations.length,
            reservation
          });
        });
      }
    });
    return result;
  }, [rawData]);
  const formatTime = timeStr => {
    if (!timeStr) return 'N/A';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeStr;
    }
  };
  const formatDate = dateStr => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  // Get WhatsApp categories with status
  const getWhatsAppCategories = reservation => {
    if (!reservation?.whatsapp_config?.menu_options) return [];
    const now = new Date();
    const departureDate = reservation.departureDate ? new Date(reservation.departureDate) : null;
    return reservation.whatsapp_config.menu_options.map(service => {
      // Vérifier si événements requis sont complétés
      const checkEventCompleted = requires => {
        if (!requires) return true;
        const eventsCompleted = reservation.events_completed || {};
        const checkinStatus = reservation.checkin_status || {};
        const eventToCheck = requires === 'E_completed' ? 'online_checkin_completed' : requires;
        if (eventToCheck === 'online_checkin_completed') {
          return checkinStatus.registration_complete === true;
        }
        return eventsCompleted[eventToCheck] === true;
      };

      // Parser les conditions de temps
      const parseCondition = (condition, arrivalDate, departureDate) => {
        if (!condition || !arrivalDate) return null;
        const match = condition.match(/(\d+)\s+(days?|hours?)\s+(before|after)\s+(check-in|check-out)/i);
        if (!match) {
          if (condition.includes('on check-in day')) return new Date(arrivalDate);
          if (condition.includes('on check-out day')) return departureDate ? new Date(departureDate) : null;
          return null;
        }
        const [, value, unit, beforeAfter, reference] = match;
        const numValue = parseInt(value);
        const isNegative = beforeAfter.toLowerCase() === 'before';
        const referenceDate = reference.toLowerCase() === 'check-in' ? new Date(arrivalDate) : departureDate ? new Date(departureDate) : null;
        if (!referenceDate) return null;
        const result = new Date(referenceDate);
        if (unit.toLowerCase().startsWith('day')) {
          result.setDate(result.getDate() + (isNegative ? -numValue : numValue));
        } else if (unit.toLowerCase().startsWith('hour')) {
          result.setHours(result.getHours() + (isNegative ? -numValue : numValue));
        }
        return result;
      };
      const startDate = parseCondition(service.start_condition, reservation.arrivalDate, reservation.departureDate);
      const endDate = parseCondition(service.end_condition, reservation.arrivalDate, reservation.departureDate);
      const effectiveEndDate = endDate || departureDate;
      const requiresField = service.requires || service.availability_requires || service.availability?.requires;
      const isEventCompleted = checkEventCompleted(requiresField);
      const isInTimeWindow = startDate ? effectiveEndDate && now >= startDate && now <= effectiveEndDate : effectiveEndDate && now <= effectiveEndDate;
      const isBlockedByCondition = requiresField && !isEventCompleted && isInTimeWindow;
      const isActive = isInTimeWindow && isEventCompleted && service.enabled;
      const isPending = startDate && now < startDate;
      const isExpired = effectiveEndDate && now > effectiveEndDate;
      const isDisabled = !service.enabled;

      // Déterminer statut et couleur
      let status = 'disabled';
      let color = '#9E9E9E'; // Gris (désactivé)
      let bgColor = '#F5F5F5';
      let tooltip = 'Désactivé';
      if (service.enabled) {
        if (isActive) {
          status = 'active';
          color = 'white';
          bgColor = '#25D366'; // Vert WhatsApp
          tooltip = '🟢 Disponible maintenant';
        } else if (isBlockedByCondition) {
          status = 'blocked';
          color = 'white';
          bgColor = '#FF9800'; // Orange
          tooltip = `🔒 Bloqué (${requiresField} requis)`;
        } else if (isPending) {
          status = 'pending';
          color = 'white';
          bgColor = '#FFC107'; // Jaune
          tooltip = '⏳ Pas encore disponible';
        } else if (isExpired) {
          status = 'expired';
          color = 'white';
          bgColor = '#F44336'; // Rouge
          tooltip = '🔴 Expiré';
        }
      }
      return {
        code: service.code,
        name: service.service_name || service.name_fr || service.name_en,
        status,
        color,
        bgColor,
        tooltip
      };
    });
  };
  return <div className="card !px-4">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex flex-col min-h-[calc(100vh-160px)]">
        {/* Filters - Compact */}
        <div className="p-3 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-2">
              {/* Left: Search */}
              <div className="flex items-center gap-2">
                <TextField placeholder="Téléphone, nom, réservation..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => {
              if (e.key === 'Enter') {
                handleApplySearch();
              }
            }} size="small" slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">
                        <SearchIcon style={{
                  color: searchText ? '#dc2626' : SOJORI_COLORS.primary,
                  fontSize: 20
                }} />
                      </InputAdornment>,
                endAdornment: searchInput && <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchInput('')}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
              }
            }} sx={{
              width: 280,
              ...(searchText && {
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#dc2626',
                    borderWidth: 2
                  },
                  backgroundColor: '#fee2e2'
                }
              })
            }} />

                <IconButton onClick={handleApplySearch} size="small" sx={{
              backgroundColor: SOJORI_COLORS.primary,
              color: 'white',
              '&:hover': {
                backgroundColor: '#B8881A'
              }
            }}>
                  <SearchIcon />
                </IconButton>

                <IconButton onClick={fetchData} size="small" title="Actualiser" sx={{
              color: SOJORI_COLORS.primary,
              border: '1px solid #e0e0e0'
            }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>

                {isAdmin && <FormControl size="small" sx={{ minWidth: 200, '& .MuiOutlinedInput-root': ownerIdFilter ? {
                    '& fieldset': {
                      borderColor: '#dc2626',
                      borderWidth: 2
                    },
                    backgroundColor: '#fee2e2'
                  } : {}
                }}>
                    <InputLabel id="whitelist-owner-filter-label">Propriétaire</InputLabel>
                    <Select
                      labelId="whitelist-owner-filter-label"
                      label="Propriétaire"
                      value={ownerIdFilter}
                      onChange={e => {
                        setOwnerIdFilter(e.target.value);
                        setPage(0);
                      }}
                      displayEmpty
                      renderValue={val => {
                        if (val === '' || val == null) {
                          return <em>Tous</em>;
                        }
                        const o = owners.find(x => String(x._id) === String(val));
                        if (o) {
                          return getOwnerListLabel(o) || '—';
                        }
                        return '—';
                      }}
                    >
                      <MenuItem value="">
                        <em>Tous</em>
                      </MenuItem>
                      {owners.map(o => <MenuItem key={o._id} value={o._id}>
                          {getOwnerListLabel(o)}
                        </MenuItem>)}
                    </Select>
                  </FormControl>}

                {/* Listing Filter - Multi-select */}
                <div className="relative listing-filter-dropdown">
                  <TextField label="Propriété" value={selectedListings.length === 0 ? 'Toutes' : `${selectedListings.length} sélectionné${selectedListings.length > 1 ? 's' : ''}`} onClick={() => {
                setPendingListings([...selectedListings]);
                setIsListingFilterOpen(!isListingFilterOpen);
              }} size="small" slotProps={{
                input: {
                  readOnly: true,
                  startAdornment: <InputAdornment position="start">
                          <HomeIcon style={{
                    fontSize: 20,
                    color: selectedListings.length > 0 ? '#dc2626' : SOJORI_COLORS.primary
                  }} />
                        </InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                          <ArrowDropDownIcon style={{
                    color: selectedListings.length > 0 ? '#dc2626' : SOJORI_COLORS.primary
                  }} />
                        </InputAdornment>
                }
              }} sx={{
                width: 180,
                '& .MuiOutlinedInput-root': {
                  cursor: 'pointer',
                  ...(selectedListings.length > 0 && {
                    '& fieldset': {
                      borderColor: '#dc2626',
                      borderWidth: 2
                    },
                    backgroundColor: '#fee2e2'
                  })
                }
              }} />

                  {isListingFilterOpen && <div className="absolute z-[1100] mt-1 w-80 bg-white border border-slate-300 rounded-lg shadow-xl" style={{
                maxHeight: '400px'
              }}>
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
                        {availableListings.map(listingName => {
                    const isSelected = pendingListings.includes(listingName);
                    return <label key={listingName} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors" style={{
                      backgroundColor: isSelected ? '#FFF3E0' : undefined
                    }}>
                              <input type="checkbox" checked={isSelected} onChange={() => {
                        const newListings = isSelected ? pendingListings.filter(name => name !== listingName) : [...pendingListings, listingName];
                        setPendingListings(newListings);
                      }} className="w-4 h-4 accent-[#E6B022] cursor-pointer" />
                              <HomeIcon style={{
                        fontSize: 16,
                        color: isSelected ? '#E6B022' : '#9ca3af'
                      }} />
                              <span className="flex-1 text-sm" style={{
                        color: isSelected ? '#E6B022' : '#1f2937'
                      }}>
                                {listingName}
                              </span>
                            </label>;
                  })}
                      </div>
                      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                        <button onClick={() => setPendingListings([])} className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">
                          Effacer
                        </button>
                        <button onClick={() => {
                    setSelectedListings([...pendingListings]);
                    setPage(0);
                    setIsListingFilterOpen(false);
                  }} className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded">
                          Appliquer
                        </button>
                      </div>
                    </div>}
                </div>

                {/* Language Filter - Multi-select */}
                <div className="relative">
                  <TextField label="Langue" value={selectedLanguages.length === 0 ? 'Toutes' : `${selectedLanguages.length}`} onClick={() => {
                setPendingLanguages([...selectedLanguages]);
                setIsLanguageFilterOpen(!isLanguageFilterOpen);
              }} size="small" slotProps={{
                input: {
                  readOnly: true,
                  startAdornment: <InputAdornment position="start">
                          <LanguageIcon style={{
                    fontSize: 20,
                    color: selectedLanguages.length > 0 ? '#dc2626' : SOJORI_COLORS.primary
                  }} />
                        </InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                          <ArrowDropDownIcon style={{
                    color: selectedLanguages.length > 0 ? '#dc2626' : SOJORI_COLORS.primary
                  }} />
                        </InputAdornment>
                }
              }} sx={{
                width: 140,
                '& .MuiOutlinedInput-root': {
                  cursor: 'pointer',
                  ...(selectedLanguages.length > 0 && {
                    '& fieldset': {
                      borderColor: '#dc2626',
                      borderWidth: 2
                    },
                    backgroundColor: '#fee2e2'
                  })
                }
              }} />

                  {isLanguageFilterOpen && <div className="absolute z-[1100] mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-xl">
                      <div className="sticky top-0 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LanguageIcon fontSize="small" />
                          <span className="text-sm font-semibold">Langues</span>
                        </div>
                        <button onClick={() => setIsLanguageFilterOpen(false)} className="text-white hover:bg-white/20 rounded px-1">
                          <CloseIcon fontSize="small" />
                        </button>
                      </div>
                      <div className="p-2 max-h-48 overflow-y-auto">
                        {availableLanguages.map(lang => {
                    const isSelected = pendingLanguages.includes(lang);
                    return <label key={lang} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer" style={{
                      backgroundColor: isSelected ? '#FFF3E0' : undefined
                    }}>
                              <input type="checkbox" checked={isSelected} onChange={() => setPendingLanguages(isSelected ? pendingLanguages.filter(l => l !== lang) : [...pendingLanguages, lang])} className="w-4 h-4 accent-[#E6B022] cursor-pointer" />
                              <span className="flex-1 text-sm font-medium" style={{
                        color: isSelected ? '#E6B022' : '#1f2937'
                      }}>{lang.toUpperCase()}</span>
                            </label>;
                  })}
                      </div>
                      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                        <button onClick={() => setPendingLanguages([])} className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">Effacer</button>
                        <button onClick={() => {
                    setSelectedLanguages([...pendingLanguages]);
                    setPage(0);
                    setIsLanguageFilterOpen(false);
                  }} className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded">Appliquer</button>
                      </div>
                    </div>}
                </div>

                {/* Blocked Filter */}
                <div className="relative">
                  <TextField label="Statut" value={blockedOptions.find(o => o.value === blockedFilter)?.label || 'Tous'} onClick={() => {
                setTempBlockedFilter(blockedFilter);
                setIsBlockedFilterOpen(!isBlockedFilterOpen);
              }} size="small" slotProps={{
                input: {
                  readOnly: true,
                  startAdornment: <InputAdornment position="start">
                          {blockedOptions.find(o => o.value === blockedFilter)?.icon || <BlockIcon fontSize="small" />}
                        </InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                          <ArrowDropDownIcon style={{
                    color: blockedFilter !== 'all' ? '#dc2626' : SOJORI_COLORS.primary
                  }} />
                        </InputAdornment>
                }
              }} sx={{
                width: 130,
                '& .MuiOutlinedInput-root': {
                  cursor: 'pointer',
                  ...(blockedFilter !== 'all' && {
                    '& fieldset': {
                      borderColor: '#dc2626',
                      borderWidth: 2
                    },
                    backgroundColor: '#fee2e2'
                  })
                }
              }} />

                  {isBlockedFilterOpen && <div className="absolute z-[1100] mt-1 w-56 bg-white border border-slate-300 rounded-lg shadow-xl">
                      <div className="sticky top-0 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">Statut client</span>
                        <button onClick={() => setIsBlockedFilterOpen(false)} className="text-white hover:bg-white/20 rounded px-1"><CloseIcon fontSize="small" /></button>
                      </div>
                      <div className="p-2">
                        {blockedOptions.map(option => <label key={option.value} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded cursor-pointer" style={{
                    backgroundColor: tempBlockedFilter === option.value ? '#FFF3E0' : undefined
                  }}>
                            <div style={{
                      color: option.color
                    }}>{option.icon}</div>
                            <input type="radio" checked={tempBlockedFilter === option.value} onChange={() => setTempBlockedFilter(option.value)} className="w-4 h-4 accent-[#E6B022] cursor-pointer" />
                            <span className="flex-1 text-sm font-medium" style={{
                      color: tempBlockedFilter === option.value ? '#E6B022' : '#1f2937'
                    }}>{option.label}</span>
                          </label>)}
                      </div>
                      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                        <button onClick={() => setTempBlockedFilter('all')} className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">Effacer</button>
                        <button onClick={() => {
                    setBlockedFilter(tempBlockedFilter);
                    setPage(0);
                    setIsBlockedFilterOpen(false);
                  }} className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded">Appliquer</button>
                      </div>
                    </div>}
                </div>

                {/* Communication Filter */}
                <div className="relative">
                  <TextField label="Communication" value={communicationOptions.find(o => o.value === communicationFilter)?.label || 'Tous'} onClick={() => {
                setTempCommunicationFilter(communicationFilter);
                setIsCommunicationFilterOpen(!isCommunicationFilterOpen);
              }} size="small" slotProps={{
                input: {
                  readOnly: true,
                  startAdornment: <InputAdornment position="start">
                          <ChatIcon style={{
                    fontSize: 20,
                    color: communicationFilter !== 'all' ? '#dc2626' : SOJORI_COLORS.primary
                  }} />
                        </InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                          <ArrowDropDownIcon style={{
                    color: communicationFilter !== 'all' ? '#dc2626' : SOJORI_COLORS.primary
                  }} />
                        </InputAdornment>
                }
              }} sx={{
                width: 170,
                '& .MuiOutlinedInput-root': {
                  cursor: 'pointer',
                  ...(communicationFilter !== 'all' && {
                    '& fieldset': {
                      borderColor: '#dc2626',
                      borderWidth: 2
                    },
                    backgroundColor: '#fee2e2'
                  })
                }
              }} />

                  {isCommunicationFilterOpen && <div className="absolute z-[1100] mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-xl">
                      <div className="sticky top-0 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">Communication</span>
                        <button onClick={() => setIsCommunicationFilterOpen(false)} className="text-white hover:bg-white/20 rounded px-1"><CloseIcon fontSize="small" /></button>
                      </div>
                      <div className="p-2">
                        {communicationOptions.map(option => <label key={option.value} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded cursor-pointer" style={{
                    backgroundColor: tempCommunicationFilter === option.value ? '#FFF3E0' : undefined
                  }}>
                            <div style={{
                      color: option.color
                    }}>{option.icon}</div>
                            <input type="radio" checked={tempCommunicationFilter === option.value} onChange={() => setTempCommunicationFilter(option.value)} className="w-4 h-4 accent-[#E6B022] cursor-pointer" />
                            <span className="flex-1 text-sm font-medium" style={{
                      color: tempCommunicationFilter === option.value ? '#E6B022' : '#1f2937'
                    }}>{option.label}</span>
                          </label>)}
                      </div>
                      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                        <button onClick={() => setTempCommunicationFilter('all')} className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">Effacer</button>
                        <button onClick={() => {
                    setCommunicationFilter(tempCommunicationFilter);
                    setPage(0);
                    setIsCommunicationFilterOpen(false);
                  }} className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded">Appliquer</button>
                      </div>
                    </div>}
                </div>

                {/* Reservation Status Filter */}
                <div className="relative">
                  <TextField label="Statut Réservation" value={reservationStatusOptions.find(o => o.value === reservationStatusFilter)?.label || 'Tous'} onClick={() => {
                setTempReservationStatusFilter(reservationStatusFilter);
                setIsReservationStatusFilterOpen(!isReservationStatusFilterOpen);
              }} size="small" slotProps={{
                input: {
                  readOnly: true,
                  startAdornment: <InputAdornment position="start">
                          {reservationStatusOptions.find(o => o.value === reservationStatusFilter)?.icon || <DateRangeIcon fontSize="small" />}
                        </InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                          <ArrowDropDownIcon style={{
                    color: reservationStatusFilter !== 'all' ? '#dc2626' : SOJORI_COLORS.primary
                  }} />
                        </InputAdornment>
                }
              }} sx={{
                width: 190,
                '& .MuiOutlinedInput-root': {
                  cursor: 'pointer',
                  ...(reservationStatusFilter !== 'all' && {
                    '& fieldset': {
                      borderColor: '#dc2626',
                      borderWidth: 2
                    },
                    backgroundColor: '#fee2e2'
                  })
                }
              }} />

                  {isReservationStatusFilterOpen && <div className="absolute z-[1100] mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-xl">
                      <div className="sticky top-0 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">Statut Réservation</span>
                        <button onClick={() => setIsReservationStatusFilterOpen(false)} className="text-white hover:bg-white/20 rounded px-1"><CloseIcon fontSize="small" /></button>
                      </div>
                      <div className="p-2">
                        {reservationStatusOptions.map(option => <label key={option.value} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded cursor-pointer" style={{
                    backgroundColor: tempReservationStatusFilter === option.value ? '#FFF3E0' : undefined
                  }}>
                            <div style={{
                      color: option.color
                    }}>{option.icon}</div>
                            <input type="radio" checked={tempReservationStatusFilter === option.value} onChange={() => setTempReservationStatusFilter(option.value)} className="w-4 h-4 accent-[#E6B022] cursor-pointer" />
                            <span className="flex-1 text-sm font-medium" style={{
                      color: tempReservationStatusFilter === option.value ? '#E6B022' : '#1f2937'
                    }}>{option.label}</span>
                          </label>)}
                      </div>
                      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2 flex gap-2">
                        <button onClick={() => setTempReservationStatusFilter('all')} className="flex-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">Effacer</button>
                        <button onClick={() => {
                    setReservationStatusFilter(tempReservationStatusFilter);
                    setPage(0);
                    setIsReservationStatusFilterOpen(false);
                  }} className="flex-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-[#E6B022] to-[#B8881A] hover:shadow-lg rounded">Appliquer</button>
                      </div>
                    </div>}
                </div>

                {/* Advanced Filters Button */}
                <div className="relative">
                  <IconButton onClick={() => {
                setTempDateRange(dateRangeFilter);
                setTempDateType(dateType);
                setTempCheckinStatus(checkinStatusFilter);
                setTempReservationCount(reservationCountFilter);
                setAdvancedFiltersOpen(true);
              }} size="small" sx={{
                color: dateRangeFilter.start || dateRangeFilter.end || checkinStatusFilter !== 'all' || reservationCountFilter !== 'all' ? SOJORI_COLORS.primary : 'inherit',
                border: '2px solid',
                borderColor: dateRangeFilter.start || dateRangeFilter.end || checkinStatusFilter !== 'all' || reservationCountFilter !== 'all' ? SOJORI_COLORS.primary : '#e0e0e0',
                backgroundColor: dateRangeFilter.start || dateRangeFilter.end || checkinStatusFilter !== 'all' || reservationCountFilter !== 'all' ? SOJORI_COLORS.primaryPale : undefined
              }} title="Filtres avancés">
                    <FilterAltIcon fontSize="small" />
                  </IconButton>
                  {/* Badge showing count of active advanced filters */}
                  {(() => {
                const activeCount = [dateRangeFilter.start || dateRangeFilter.end, checkinStatusFilter !== 'all', reservationCountFilter !== 'all'].filter(Boolean).length;
                return activeCount > 0 ? <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md">
                        {activeCount}
                      </span> : null;
              })()}
                </div>

                {/* Reset All Filters Button */}
                <IconButton onClick={handleResetAllFilters} size="small" sx={{
              color: hasActiveFilters ? SOJORI_COLORS.primary : '#64748b',
              border: '2px solid',
              borderColor: hasActiveFilters ? SOJORI_COLORS.primary : '#e0e0e0',
              backgroundColor: hasActiveFilters ? SOJORI_COLORS.primaryPale : undefined
            }} title="Réinitialiser tous les filtres">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </div>

            {/* Right: Pagination */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center bg-gradient-to-r from-[#E6B022] to-[#B8881A] rounded-lg px-3 py-1.5">
                <span className="text-white font-bold text-xs">
                  {totalCount} client{totalCount > 1 ? 's' : ''}
                </span>
              </div>
              <TablePagination component="div" count={totalCount} page={page} onPageChange={(e, newPage) => setPage(newPage)} rowsPerPage={limit} onRowsPerPageChange={e => {
              setLimit(parseInt(e.target.value, 10));
              setPage(0);
            }} rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="" labelDisplayedRows={({
              from,
              to,
              count
            }) => `${from}-${to}/${count}`} sx={{
              '& .MuiTablePagination-toolbar': {
                minHeight: 32,
                padding: '0 4px'
              },
              '& .MuiTablePagination-selectLabel': {
                display: 'none'
              },
              '& .MuiTablePagination-displayedRows': {
                fontSize: 11,
                margin: 0
              },
              '& .MuiTablePagination-select': {
                fontSize: 11,
                paddingTop: 0,
                paddingBottom: 0
              },
              '& .MuiTablePagination-actions': {
                marginLeft: '4px'
              },
              '& .MuiIconButton-root': {
                padding: '4px'
              }
            }} />
            </div>
          </div>
        </div>

        {/* Table - Excel-like: Separate header (sticky to page) + body (natural size) - STRUCTURE COPIÉE DE TasksNew */}

        {/* Header Table - Sticky to page scroll */}
        <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#f8fafc'
      }}>
          <div ref={headerScrollRef} className="tasks-header-scroll" style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          borderRadius: '12px 12px 0 0'
        }}>
            <Table style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            minWidth: totalTableWidth
          }}>
              <TableHead className="tasks-table-head">
                <TableRow>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.phone,
                  minWidth: columnWidths.phone,
                  maxWidth: columnWidths.phone,
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  position: 'sticky',
                  left: 0,
                  zIndex: 1001
                }}>
                    Téléphone
                  </TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.language,
                  minWidth: columnWidths.language,
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '0.75rem'
                }}>Lng</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.blocked,
                  minWidth: columnWidths.blocked,
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '0.75rem'
                }}>Blq</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.communicated,
                  minWidth: columnWidths.communicated,
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '0.75rem'
                }}>Com</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.reservation,
                  minWidth: columnWidths.reservation,
                  padding: '4px',
                  fontSize: '0.75rem'
                }}>Réservation</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.listing,
                  minWidth: columnWidths.listing,
                  padding: '4px',
                  fontSize: '0.75rem'
                }}>Listing</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.dates,
                  minWidth: columnWidths.dates,
                  padding: '4px',
                  fontSize: '0.75rem'
                }}>Dates</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.aci,
                  minWidth: columnWidths.aci,
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '0.75rem'
                }}>A/C/I</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.vdn,
                  minWidth: columnWidths.vdn,
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '0.75rem'
                }}>V/D/N</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.arrival,
                  minWidth: columnWidths.arrival,
                  padding: '4px',
                  fontSize: '0.75rem'
                }}>Arrivée</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.departure,
                  minWidth: columnWidths.departure,
                  padding: '4px',
                  fontSize: '0.75rem'
                }}>Départ</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.status,
                  minWidth: columnWidths.status,
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '0.75rem'
                }}>Statut</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.whatsapp,
                  minWidth: columnWidths.whatsapp,
                  padding: '4px',
                  fontSize: '0.75rem'
                }}>WhatsApp</TableCell>
                  <TableCell style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontWeight: 'bold',
                  width: columnWidths.actions,
                  minWidth: columnWidths.actions,
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '0.75rem'
                }}>Act</TableCell>
                </TableRow>
              </TableHead>
            </Table>
          </div>
        </div>

        {/* Body Table - Scrollable */}
        <TableContainer ref={bodyScrollRef} component={Paper} className="shadow-lg tasks-table-container" sx={{
        borderRadius: '0 0 12px 12px',
        border: '1px solid #e2e8f0',
        borderTop: 'none',
        overflowX: 'auto',
        marginBottom: '20px',
        padding: 0,
        // Hide scrollbar - use only sticky scrollbar at bottom
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
          <Table style={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          minWidth: totalTableWidth
        }}>
            <TableHead style={{
            visibility: 'collapse'
          }}>
              <TableRow>
                {/* Hidden header row to maintain column widths */}
                <TableCell style={{
                width: columnWidths.phone,
                minWidth: columnWidths.phone,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.language,
                minWidth: columnWidths.language,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.blocked,
                minWidth: columnWidths.blocked,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.communicated,
                minWidth: columnWidths.communicated,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.reservation,
                minWidth: columnWidths.reservation,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.listing,
                minWidth: columnWidths.listing,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.dates,
                minWidth: columnWidths.dates,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.aci,
                minWidth: columnWidths.aci,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.vdn,
                minWidth: columnWidths.vdn,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.arrival,
                minWidth: columnWidths.arrival,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.departure,
                minWidth: columnWidths.departure,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.status,
                minWidth: columnWidths.status,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.whatsapp,
                minWidth: columnWidths.whatsapp,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
                <TableCell style={{
                width: columnWidths.actions,
                minWidth: columnWidths.actions,
                padding: 0,
                height: 0,
                border: 'none'
              }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableRow>
                  <TableCell colSpan={14} align="center" style={{
                padding: '40px'
              }}>
                    <CircularProgress style={{
                  color: SOJORI_COLORS.primary
                }} />
                  </TableCell>
                </TableRow> : flattenedData.length === 0 ? <TableRow>
                  <TableCell colSpan={14} align="center" style={{
                padding: '40px'
              }}>
                    <Typography variant="body1" style={{
                  color: SOJORI_COLORS.gray[600]
                }}>
                      Aucune donnée
                    </Typography>
                  </TableCell>
                </TableRow> : flattenedData.map((row, index) => <TableRow key={index} hover sx={{
              '&:hover': {
                backgroundColor: '#FFF3E0'
              },
              borderTop: row.isFirstRow && index > 0 ? '2px solid #E6B022' : undefined
            }}>
                      {/* Téléphone (rowspan pour toutes les réservations du même numéro) - Sticky left column */}
                      {row.isFirstRow && <TableCell rowSpan={row.rowSpan} className="px-2 py-1" style={{
                borderRight: '1px solid #e0e0e0',
                backgroundColor: row.blocked ? '#fee2e2' : 'white',
                verticalAlign: 'top',
                position: 'sticky',
                left: 0,
                zIndex: 100,
                boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
              }}>
                          <div className="flex flex-col gap-2">
                            <Chip label={row.phone} size="small" icon={<PersonIcon />} style={{
                    backgroundColor: SOJORI_COLORS.info,
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }} />
                            {row.name && <span className="text-xs font-medium text-slate-700">{row.name}</span>}
                            <div className="text-[10px] text-slate-500 mt-1">
                              {row.reservationCount} rés.
                            </div>
                            <IconButton size="small" onClick={() => {
                    const originalClient = rawData.find(c => c.phone === row.phone);
                    const clientData = {
                      _id: originalClient?._id || row.phone,
                      phone: row.phone,
                      name: row.name,
                      language: row.language,
                      detected_language: row.detected_language,
                      blocked: row.blocked,
                      communicated: row.reservationCount > 0,
                      reservation: row.reservationCount > 0,
                      reservationIds: originalClient?.reservationIds || [],
                      country: originalClient?.country || ''
                    };
                    setSelectedClient(clientData);
                    setModifySidebarOpen(true);
                  }} sx={{
                    backgroundColor: SOJORI_COLORS.primary,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#B8881A'
                    },
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}>
                              <span className="text-[9px] font-semibold">Modif</span>
                            </IconButton>
                          </div>
                        </TableCell>}

                      {/* Langue (rowspan) */}
                      {row.isFirstRow && <TableCell rowSpan={row.rowSpan} className="px-1 py-1 text-center" style={{
                borderRight: '1px solid #e0e0e0',
                backgroundColor: row.blocked ? '#fee2e2' : '#fafafa',
                verticalAlign: 'middle'
              }}>
                          <Chip label={row.detected_language || row.language || '?'} size="small" style={{
                  fontSize: '0.65rem',
                  height: '20px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  fontWeight: 600
                }} />
                        </TableCell>}

                      {/* Bloqué (rowspan) */}
                      {row.isFirstRow && <TableCell rowSpan={row.rowSpan} className="px-1 py-1 text-center" style={{
                borderRight: '1px solid #e0e0e0',
                backgroundColor: row.blocked ? '#fee2e2' : '#fafafa',
                verticalAlign: 'middle'
              }}>
                          {row.blocked ? <Chip label="OUI" size="small" style={{
                  backgroundColor: SOJORI_COLORS.error,
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  height: '20px'
                }} /> : <Chip label="NON" size="small" style={{
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  height: '20px'
                }} />}
                        </TableCell>}

                      {/* Communiqué (rowspan) */}
                      {row.isFirstRow && <TableCell rowSpan={row.rowSpan} className="px-1 py-1 text-center" style={{
                borderRight: '2px solid #e0e0e0',
                backgroundColor: row.blocked ? '#fee2e2' : '#fafafa',
                verticalAlign: 'middle'
              }}>
                          {row.reservationCount > 0 ? <Chip label="OUI" size="small" style={{
                  backgroundColor: SOJORI_COLORS.success,
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  height: '20px'
                }} /> : <Chip label="NON" size="small" style={{
                  backgroundColor: '#fecaca',
                  color: '#991b1b',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  height: '20px'
                }} />}
                        </TableCell>}

                      {/* Réservation */}
                      <TableCell className="px-1 py-1">
                        {row.reservation ? <Chip label={row.reservation.reservationNumber || 'N/A'} size="small" style={{
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }} /> : <span className="text-gray-400 italic text-xs">Pas de réservation</span>}
                      </TableCell>

                      {/* Listing */}
                      <TableCell className="px-1 py-1">
                        {row.reservation?.listingName ? <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <HomeIcon style={{
                      fontSize: 14,
                      color: SOJORI_COLORS.primary
                    }} />
                              <span className="text-xs font-medium text-slate-800">{row.reservation.listingName}</span>
                            </div>
                            {row.reservation.access_type && <div className="text-[10px] font-semibold ml-4">
                                {row.reservation.access_type === 'automatic' ? <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">🤖 Auto</span> : row.reservation.access_type === 'assisted' ? <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">👤 Assisté</span> : <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">❓ {row.reservation.access_type}</span>}
                              </div>}
                          </div> : <span className="text-gray-400 italic text-xs">N/A</span>}
                      </TableCell>

                      {/* Dates (Check-in / Check-out) */}
                      <TableCell className="px-1 py-1">
                        {row.reservation ? <div className="text-[11px] space-y-0.5">
                            <div className="text-slate-700">
                              {row.reservation.arrivalDate ? new Date(row.reservation.arrivalDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit'
                    }) : 'N/A'}
                            </div>
                            <div className="text-slate-700">
                              {row.reservation.departureDate ? new Date(row.reservation.departureDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit'
                    }) : 'N/A'}
                            </div>
                          </div> : <span className="text-gray-400 italic text-xs">N/A</span>}
                      </TableCell>

                      {/* A/C/I (Adultes / Enfants / Bébés) */}
                      <TableCell className="px-1 py-1 text-center">
                        {row.reservation?.checkin_status ? <div className="text-xs font-semibold text-slate-900">
                            {row.reservation.checkin_status.total_adults || 0}A /
                            {row.reservation.checkin_status.total_children || 0}C /
                            {row.reservation.checkin_status.total_infants || 0}I
                          </div> : <span className="text-gray-400 italic text-xs">N/A</span>}
                      </TableCell>

                      {/* V/D/N (Validés / Draft / Non enregistrés) */}
                      <TableCell className="px-1 py-1 text-center">
                        {row.reservation?.checkin_status ? <div className="flex items-center justify-center gap-1 text-[10px]">
                            <Tooltip title="Validés">
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded">
                                {row.reservation.checkin_status.validated_adults || 0}V
                              </span>
                            </Tooltip>
                            <span className="text-gray-400">/</span>
                            <Tooltip title="Brouillons">
                              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded">
                                {row.reservation.checkin_status.draft_adults || 0}D
                              </span>
                            </Tooltip>
                            <span className="text-gray-400">/</span>
                            <Tooltip title="Non enregistrés">
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">
                                {(row.reservation.checkin_status.total_adults || 0) - (row.reservation.checkin_status.validated_adults || 0) - (row.reservation.checkin_status.draft_adults || 0)}N
                              </span>
                            </Tooltip>
                            {row.reservation.checkin_status.registration_complete && <CheckCircleIcon style={{
                    color: SOJORI_COLORS.success,
                    fontSize: 14,
                    marginLeft: 2
                  }} />}
                          </div> : <span className="text-gray-400 italic text-xs">N/A</span>}
                      </TableCell>

                      {/* Arrivée (Heure prévue + Heure effective + Booléens) */}
                      <TableCell className="px-1 py-1">
                        {row.reservation ? <div className="text-[10px] space-y-0.5">
                            <div className="text-slate-600">
                              Prév: {row.reservation.arrival_time || row.reservation.checkInTime || 'N/A'}
                            </div>
                            {row.reservation.actualArrivalTime || row.reservation.actual_arrival_time ? <div className="text-green-700 font-semibold">
                                ✓ {formatTime(row.reservation.actualArrivalTime || row.reservation.actual_arrival_time)}
                              </div> : <div className="text-slate-400 italic">
                                Pas arrivé
                              </div>}
                            <div className="flex gap-1 text-[9px] pt-0.5 border-t border-slate-200">
                              <span className={row.reservation.arrival_time_chosen ? 'text-green-600 font-bold' : 'text-red-500'}>
                                {row.reservation.arrival_time_chosen ? 'A✓' : 'A✗'}
                              </span>
                              <span className={row.reservation.customer_inside || ['arrived', 'on_site', 'departed'].includes(row.reservation.customerStatus) ? 'text-green-600 font-bold' : 'text-red-500'}>
                                {row.reservation.customer_inside || ['arrived', 'on_site', 'departed'].includes(row.reservation.customerStatus) ? 'In✓' : 'In✗'}
                              </span>
                            </div>
                          </div> : <span className="text-gray-400 italic text-xs">N/A</span>}
                      </TableCell>

                      {/* Départ (Heure prévue + Heure effective + Booléens) */}
                      <TableCell className="px-1 py-1">
                        {row.reservation ? <div className="text-[10px] space-y-0.5">
                            <div className="text-slate-600">
                              Prév: {row.reservation.departure_time || row.reservation.checkOutTime || 'N/A'}
                            </div>
                            {row.reservation.actualDepartureTime || row.reservation.actual_departure_time ? <div className="text-orange-700 font-semibold">
                                ✓ {formatTime(row.reservation.actualDepartureTime || row.reservation.actual_departure_time)}
                              </div> : <div className="text-slate-400 italic">
                                Pas parti
                              </div>}
                            <div className="flex gap-1 text-[9px] pt-0.5 border-t border-slate-200">
                              <span className={row.reservation.departure_time_chosen ? 'text-green-600 font-bold' : 'text-red-500'}>
                                {row.reservation.departure_time_chosen ? 'D✓' : 'D✗'}
                              </span>
                              <span className={row.reservation.customer_left || row.reservation.customerStatus === 'departed' ? 'text-orange-600 font-bold' : 'text-red-500'}>
                                {row.reservation.customer_left || row.reservation.customerStatus === 'departed' ? 'Out✓' : 'Out✗'}
                              </span>
                            </div>
                          </div> : <span className="text-gray-400 italic text-xs">N/A</span>}
                      </TableCell>

                      {/* Statut */}
                      <TableCell className="px-1 py-1 text-center">
                        {row.reservation ? <Chip label={row.reservation.status || 'N/A'} size="small" style={{
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  height: '18px'
                }} /> : <span className="text-gray-400 italic text-xs">N/A</span>}
                      </TableCell>

                      {/* Catégories WhatsApp - Toutes les lettres */}
                      <TableCell className="px-1 py-1">
                        {row.reservation ? <div className="text-xs font-mono text-slate-700">
                            {(() => {
                    const categories = getWhatsAppCategories(row.reservation);
                    if (categories.length === 0) {
                      return <span className="text-gray-400 italic">Aucune</span>;
                    }
                    // Afficher toutes les lettres séparées par des virgules
                    return categories.map(cat => cat.code).join(', ');
                  })()}
                          </div> : <span className="text-gray-400 italic text-xs">N/A</span>}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-1 py-1 text-center" style={{
                whiteSpace: 'nowrap'
              }}>
                        {row.reservation && <IconButton size="small" title="Voir détail réservation" onClick={() => {
                  setSelectedReservationDetails(row.reservation);
                  setDetailsModalOpen(true);
                }} sx={{
                  color: SOJORI_COLORS.primary,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 107, 53, 0.1)'
                  }
                }}>
                            <SearchIcon fontSize="small" />
                          </IconButton>}
                        {row.isFirstRow && <IconButton size="small" title="Gérer les réservations de ce numéro" onClick={() => {
                  const originalClient = rawData.find(c => c.phone === row.phone);
                  setSelectedClient({
                    _id: originalClient?._id || row.phone,
                    phone: row.phone,
                    name: row.name,
                    language: row.language,
                    detected_language: row.detected_language,
                    blocked: row.blocked,
                    communicated: row.reservationCount > 0,
                    reservation: row.reservationCount > 0,
                    reservationIds: originalClient?.reservationIds || [],
                    country: originalClient?.country || ''
                  });
                  setModifySidebarOpen(true);
                }} sx={{
                  color: '#7c3aed',
                  '&:hover': {
                    backgroundColor: 'rgba(124, 58, 237, 0.1)'
                  }
                }}>
                            <ManageAccountsIcon fontSize="small" />
                          </IconButton>}
                      </TableCell>
                    </TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Sticky Scrollbar - Always visible at bottom of screen, starts after first column (comme TasksNew) */}
          <div style={{
        position: 'fixed',
        bottom: 0,
        left: columnWidths.phone,
        // Start after first sticky column
        right: 0,
        height: '12px',
        backgroundColor: 'transparent',
        zIndex: 999
      }}>
            <Box ref={stickyScrollRef} sx={{
          overflowX: 'scroll',
          // Force scrollbar always visible
          overflowY: 'hidden',
          height: '100%',
          width: '100%',
          scrollbarWidth: 'thin',
          scrollbarColor: '#E6B022 #f1f1f1',
          '&::-webkit-scrollbar': {
            height: '10px',
            webkitAppearance: 'none'
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '0'
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(180deg, #E6B022 0%, #B8881A 100%)',
            borderRadius: '5px',
            border: '1px solid #f1f1f1',
            boxShadow: 'none'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'linear-gradient(180deg, #B8881A 0%, #D44920 100%)'
          }
        }}>
              {/* Width = total - first column (sticky) */}
              <div style={{
            width: `calc(${totalTableWidth} - ${columnWidths.phone})`,
            height: '1px'
          }}></div>
            </Box>
          </div>

        {/* Modal Details */}
        <ReservationDetailsModal open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} reservation={selectedReservationDetails} />

        {/* Sidebar Modifier Client (Ajouter/Supprimer Réservations) */}
        <ModifyClientWhiteListSidebar open={modifySidebarOpen} onClose={() => {
        setModifySidebarOpen(false);
        setSelectedClient(null);
      }} staff={selectedClient} onSubmit={async (clientId, updatedData) => {
        // ✅ FIX: Call API to persist changes (was only updating local state)
        try {
          await updateClientWhiteList(clientId, updatedData);
          toast.success('Client updated successfully');

          // Update local state to reflect changes immediately
          setRawData(prevData => prevData.map(client => client._id === clientId ? {
            ...client,
            ...updatedData
          } : client));
        } catch (error) {
          toast.error('Failed to update client');
          throw error; // Propagate error to sidebar
        }
      }} onRefresh={async () => {
        // Rafraîchir seulement après ajout/suppression de réservations

        await fetchData();
      }} />

        {/* Advanced Filters Modal - Custom Div-based */}
        {advancedFiltersOpen && <div className="fixed inset-0 flex items-center justify-center z-[1100] bg-black bg-opacity-50" onClick={() => setAdvancedFiltersOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white p-6 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <FilterAltIcon fontSize="medium" />
                  <h2 className="text-xl font-semibold">Filtres avancés</h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Date Range Filter */}
                <div className="space-y-3">
                  <label className="block font-semibold text-gray-700 mb-2">Plage de dates</label>

                  {/* Date Type Selection */}
                  <RadioGroup row value={tempDateType} onChange={e => setTempDateType(e.target.value)}>
                    <FormControlLabel value="arrival" control={<Radio sx={{
                  color: SOJORI_COLORS.primary,
                  '&.Mui-checked': {
                    color: SOJORI_COLORS.primary
                  }
                }} />} label="Date d'arrivée" />
                    <FormControlLabel value="departure" control={<Radio sx={{
                  color: SOJORI_COLORS.primary,
                  '&.Mui-checked': {
                    color: SOJORI_COLORS.primary
                  }
                }} />} label="Date de départ" />
                  </RadioGroup>

                  {/* Date Range Pickers */}
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Date début" type="date" value={tempDateRange.start} onChange={e => setTempDateRange({
                  ...tempDateRange,
                  start: e.target.value
                })} InputLabelProps={{
                  shrink: true
                }} fullWidth size="small" />
                    <TextField label="Date fin" type="date" value={tempDateRange.end} onChange={e => setTempDateRange({
                  ...tempDateRange,
                  end: e.target.value
                })} InputLabelProps={{
                  shrink: true
                }} fullWidth size="small" />
                  </div>
                </div>

                {/* Check-in Status Filter */}
                <FormControl fullWidth size="small">
                  <InputLabel>Statut Check-in</InputLabel>
                  <Select value={tempCheckinStatus} label="Statut Check-in" onChange={e => setTempCheckinStatus(e.target.value)}>
                    <MenuItem value="all">Tous</MenuItem>
                    <MenuItem value="completed">Check-in complété</MenuItem>
                    <MenuItem value="pending">Check-in en attente</MenuItem>
                  </Select>
                </FormControl>

                {/* Reservation Count Filter */}
                <FormControl fullWidth size="small">
                  <InputLabel>Nombre de réservations</InputLabel>
                  <Select value={tempReservationCount} label="Nombre de réservations" onChange={e => setTempReservationCount(e.target.value)}>
                    <MenuItem value="all">Tous</MenuItem>
                    <MenuItem value="1">1 réservation</MenuItem>
                    <MenuItem value="2+">2+ réservations</MenuItem>
                    <MenuItem value="5+">5+ réservations</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {/* Footer with buttons */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button onClick={() => {
              setTempDateRange({
                start: '',
                end: ''
              });
              setTempDateType('arrival');
              setTempCheckinStatus('all');
              setTempReservationCount('all');
            }} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                  Réinitialiser
                </button>
                <button onClick={() => {
              setDateRangeFilter(tempDateRange);
              setDateType(tempDateType);
              setCheckinStatusFilter(tempCheckinStatus);
              setReservationCountFilter(tempReservationCount);
              setPage(0);
              setAdvancedFiltersOpen(false);
            }} className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white hover:from-[#B8881A] hover:to-[#D44920] transition-all font-medium shadow-md">
                  Confirmer
                </button>
              </div>
            </div>
          </div>}
      </div>
    </div>;
};
export default PublicClientWhiteListGrouped;
