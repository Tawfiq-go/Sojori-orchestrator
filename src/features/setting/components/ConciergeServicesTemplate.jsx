import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Card, CardContent, Tabs, Tab, Button, Typography, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, Chip, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ChatIcon from '@mui/icons-material/Chat';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { getOwnerConciergeServices, updateOwnerConciergeServices, resetOwnerConciergeServices, getcities } from '../services/serverApi.adminConfig';
import TransportServiceCard from './conciergeServices/TransportServiceCard';
import GroceryServiceCard from './conciergeServices/GroceryServiceCard';
import CustomServiceCard from './conciergeServices/CustomServiceCard';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const StyledTabs = styled(Tabs)({
  borderBottom: `2px solid ${SOJORI_COLORS.gray[300]}`,
  marginBottom: '24px',
  '& .MuiTabs-indicator': {
    backgroundColor: SOJORI_COLORS.primary,
    height: '3px'
  }
});
const StyledTab = styled(Tab)({
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  color: SOJORI_COLORS.gray[700],
  '&.Mui-selected': {
    color: SOJORI_COLORS.primary
  },
  '&:hover': {
    color: SOJORI_COLORS.primaryDark
  }
});
const ActionButton = styled(Button)(({
  variant
}) => ({
  textTransform: 'none',
  fontWeight: 600,
  borderRadius: '8px',
  padding: '8px 20px',
  ...(variant === 'contained' && {
    backgroundColor: SOJORI_COLORS.primary,
    color: 'white',
    '&:hover': {
      backgroundColor: SOJORI_COLORS.primaryDark
    },
    '&:disabled': {
      backgroundColor: SOJORI_COLORS.gray[300],
      color: SOJORI_COLORS.gray[500]
    }
  }),
  ...(variant === 'outlined' && {
    borderColor: SOJORI_COLORS.primary,
    color: SOJORI_COLORS.primary,
    '&:hover': {
      borderColor: SOJORI_COLORS.primaryDark,
      backgroundColor: SOJORI_COLORS.primaryPale
    }
  })
}));
const ConciergeServicesTemplate = ({
  isAdmin,
  owners = [],
  t,
  onSaveListingConfig,
  initialData,
  /** Listing mode: render next to « Enregistrer » on one row (e.g. Actualiser + Synchroniser admin) */
  listingHeaderActions = null,
  /** Parent (MailTemplates) fournit l’owner pour les admins ; sinon sélection interne */
  managedOwnerId,
  blockLoad = false
}) => {
  const token = useSelector(state => state.auth?.token);
  const currentUser = useSelector(state => state.auth?.user);

  // Detect if we're in "listing mode" (when onSaveListingConfig is provided)
  const isListingMode = Boolean(onSaveListingConfig);

  // Owner selection state
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const useManagedOwner = managedOwnerId !== undefined;
  const requiresInternalOwnerPicker = useMemo(() => isAdmin && owners && owners.length > 0 && !isListingMode && !useManagedOwner, [isAdmin, owners, isListingMode, useManagedOwner]);
  const ownerIdForApi = useManagedOwner ? managedOwnerId || undefined : requiresInternalOwnerPicker ? selectedOwnerId || undefined : undefined;
  const ownerScopeReady = !blockLoad && (useManagedOwner ? Boolean(managedOwnerId) : !requiresInternalOwnerPicker || Boolean(selectedOwnerId));

  // City selection state (only for admin mode, not listing mode)
  const [cities, setCities] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Service data
  const [transportServices, setTransportServices] = useState([]);
  const [groceryServices, setGroceryServices] = useState([]);
  const [customServices, setCustomServices] = useState([]);

  // Original data for dirty checking
  const [originalTransportServices, setOriginalTransportServices] = useState([]);
  const [originalGroceryServices, setOriginalGroceryServices] = useState([]);
  const [originalCustomServices, setOriginalCustomServices] = useState([]);

  // Ref to track if we're currently saving to prevent flicker
  const isSavingRef = useRef(false);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    return JSON.stringify(transportServices) !== JSON.stringify(originalTransportServices) || JSON.stringify(groceryServices) !== JSON.stringify(originalGroceryServices) || JSON.stringify(customServices) !== JSON.stringify(originalCustomServices);
  }, [transportServices, groceryServices, customServices, originalTransportServices, originalGroceryServices, originalCustomServices]);

  // Fetch cities
  const fetchCities = useCallback(async () => {
    setLoadingCities(true);
    try {
      const response = await getcities(0, 100, false, [], '', true);
      // API returns array directly in response.data when paged=false
      if (response?.data && Array.isArray(response.data)) {
        setCities(response.data);
        // Auto-select Casablanca by default, or first city if not found
        if (response.data.length > 0 && !selectedCityId) {
          const casablanca = response.data.find(c => c.name?.toLowerCase().includes('casa'));
          setSelectedCityId(casablanca?._id || response.data[0]._id);
        }
      } else if (response?.data?.cities && Array.isArray(response.data.cities)) {
        // Fallback for paged response
        setCities(response.data.cities);
        if (response.data.cities.length > 0 && !selectedCityId) {
          const casablanca = response.data.cities.find(c => c.name?.toLowerCase().includes('casa'));
          setSelectedCityId(casablanca?._id || response.data.cities[0]._id);
        }
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des villes');
    } finally {
      setLoadingCities(false);
    }
  }, [selectedCityId]);

  // Filtered services by city
  // No filtering needed - backend already filters by cityId
  const filteredTransportServices = useMemo(() => {
    return transportServices;
  }, [transportServices]);
  const filteredGroceryServices = useMemo(() => {
    return groceryServices;
  }, [groceryServices]);
  const filteredCustomServices = useMemo(() => {
    return customServices;
  }, [customServices]);

  // Get cities with active services - only shows currently selected city
  // TODO: Add backend endpoint to get all cities with services for better UX
  const citiesWithServices = useMemo(() => {
    if (!selectedCityId) return [];
    const selectedCity = cities.find(c => c._id === selectedCityId);
    return selectedCity ? [selectedCity] : [];
  }, [selectedCityId, cities]);

  // Migrate old clientFields format (boolean) to new format (objects)
  const migrateClientFields = clientFields => {
    if (!clientFields || typeof clientFields !== 'object') {
      return {};
    }
    const migrated = {};
    for (const [key, value] of Object.entries(clientFields)) {
      // If already an object with 'required' field, keep it
      if (typeof value === 'object' && value !== null && 'required' in value) {
        migrated[key] = value;
      }
      // If it's a boolean, migrate it
      else if (typeof value === 'boolean') {
        const fieldLabels = {
          numberOfPeople: {
            fr: 'Nombre de personnes',
            en: 'Number of people',
            ar: 'عدد الأشخاص'
          },
          arrivalDateTime: {
            fr: 'Date et heure d\'arrivée',
            en: 'Arrival date and time',
            ar: 'تاريخ ووقت الوصول'
          },
          flightNumber: {
            fr: 'Numéro de vol',
            en: 'Flight number',
            ar: 'رقم الرحلة'
          },
          customRequest: {
            fr: 'Demande personnalisée',
            en: 'Custom request',
            ar: 'طلب مخصص'
          },
          shoppingList: {
            fr: 'Liste de courses',
            en: 'Shopping list',
            ar: 'قائمة التسوق'
          }
        };
        migrated[key] = {
          required: value,
          type: key === 'shoppingList' || key === 'customRequest' ? 'textarea' : 'text',
          label: fieldLabels[key] || {
            fr: key,
            en: key,
            ar: key
          }
        };
      }
    }
    return migrated;
  };

  // Fetch services from API
  const fetchServices = useCallback(async () => {
    if (blockLoad) {
      return;
    }
    if (useManagedOwner ? !managedOwnerId : requiresInternalOwnerPicker && !selectedOwnerId) {
      return;
    }

    // Only fetch if a city is selected
    if (!selectedCityId) {
      return;
    }
    setLoading(true);
    try {
      const params = ownerIdForApi ? {
        ownerId: ownerIdForApi,
        cityId: selectedCityId,
        token
      } : {
        cityId: selectedCityId,
        token
      };
      const response = await getOwnerConciergeServices(params);
      if (response && response.success && response.data) {
        const {
          transportServices: ts,
          groceryServices: gs,
          customServices: cs
        } = response.data;
        // Migrate old clientFields format to new format
        // Note: cityId is already filtered by backend, no need to set it here
        const migratedTransport = (ts || []).map(service => ({
          ...service,
          clientFields: migrateClientFields(service.clientFields),
          // Ensure pricing.type exists for transport services
          pricing: {
            type: service.pricing?.type || 'total',
            ...service.pricing
          }
        }));
        const migratedGrocery = (gs || []).map(service => ({
          ...service,
          clientFields: migrateClientFields(service.clientFields),
          // Ensure pricing.type exists for grocery services
          pricing: {
            type: service.pricing?.type || 'service_fee_only',
            ...service.pricing
          }
        }));
        const migratedCustom = (cs || []).map(service => ({
          ...service,
          clientFields: migrateClientFields(service.clientFields),
          // Ensure pricing.type exists for custom services
          pricing: {
            type: service.pricing?.type || 'quote',
            ...service.pricing
          }
        }));
        setTransportServices(migratedTransport);
        setGroceryServices(migratedGrocery);
        setCustomServices(migratedCustom);
        setOriginalTransportServices(JSON.parse(JSON.stringify(migratedTransport)));
        setOriginalGroceryServices(JSON.parse(JSON.stringify(migratedGrocery)));
        setOriginalCustomServices(JSON.parse(JSON.stringify(migratedCustom)));
        setHasLoadedOnce(true);
      } else {
        // Invalid response or no data - just start with empty arrays

        setTransportServices([]);
        setGroceryServices([]);
        setCustomServices([]);
        setOriginalTransportServices([]);
        setOriginalGroceryServices([]);
        setOriginalCustomServices([]);
        setHasLoadedOnce(true);
      }
    } catch (error) {
      // Error fetching - just start with empty arrays, don't show error message

      setTransportServices([]);
      setGroceryServices([]);
      setCustomServices([]);
      setOriginalTransportServices([]);
      setOriginalGroceryServices([]);
      setOriginalCustomServices([]);
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [blockLoad, useManagedOwner, managedOwnerId, requiresInternalOwnerPicker, selectedOwnerId, ownerIdForApi, selectedCityId, token, t]);

  // Save services
  const handleSave = async () => {
    if (useManagedOwner ? !managedOwnerId : requiresInternalOwnerPicker && !selectedOwnerId) {
      toast.error(t('please_select_owner', {
        defaultValue: 'Veuillez sélectionner un propriétaire'
      }));
      return;
    }
    if (!isListingMode && !selectedCityId) {
      toast.error('Veuillez sélectionner une ville avant de sauvegarder');
      return;
    }
    setSaving(true);
    isSavingRef.current = true;
    try {
      // In listing mode, don't set cityId (it's already determined by the listing)
      // In admin mode, ensure all services have a cityId set
      // ALSO ensure pricing.type is always present for validation
      const normalizedTransportServices = transportServices.map(s => ({
        ...s,
        cityId: isListingMode ? s.cityId : s.cityId || selectedCityId || undefined,
        pricing: {
          type: s.pricing?.type || 'total',
          ...s.pricing
        }
      }));
      const normalizedGroceryServices = groceryServices.map(s => ({
        ...s,
        cityId: isListingMode ? s.cityId : s.cityId || selectedCityId || undefined,
        pricing: {
          type: s.pricing?.type || 'service_fee_only',
          serviceFee: s.pricing?.serviceFee ?? 0,
          currency: s.pricing?.currency || 'MAD',
          ...s.pricing
        }
      }));
      const normalizedCustomServices = customServices.map(s => ({
        ...s,
        cityId: isListingMode ? s.cityId : s.cityId || selectedCityId || undefined,
        pricing: {
          type: s.pricing?.type || 'quote',
          ...s.pricing
        }
      }));
      const params = {
        transportServices: normalizedTransportServices,
        groceryServices: normalizedGroceryServices,
        customServices: normalizedCustomServices,
        token
      };
      if (ownerIdForApi) {
        params.ownerId = ownerIdForApi;
      }
      // 🔍 DEBUG: Log FULL transport service data to check if route.journeyTag exists

      // 🔍 DEBUG: Check if journeyTag is present in each service
      normalizedTransportServices.forEach((s, idx) => {});
      let response = null;
      if (onSaveListingConfig) {
        // Listing-level mode: delegate save to parent
        await onSaveListingConfig({
          transportServices: normalizedTransportServices,
          groceryServices: normalizedGroceryServices,
          customServices: normalizedCustomServices
        });
        response = {
          success: true
        };
      } else {
        // Owner-level mode: call admin API
        response = await updateOwnerConciergeServices(params);
      }
      if (response.success) {
        toast.success(t('concierge_services_updated', {
          defaultValue: 'Services de conciergerie mis à jour avec succès'
        }));

        // Use the data returned from backend (after save to DB) as the source of truth
        if (response.data) {
          const {
            transportServices: ts,
            groceryServices: gs,
            customServices: cs
          } = response.data;
          // IMPORTANT: Filter by cityId if we're in admin mode with city selection
          // Backend returns ALL services (multi-city), but frontend shows only selected city
          const filterByCityIfNeeded = services => {
            if (!isListingMode && selectedCityId) {
              return services.filter(s => s.cityId === selectedCityId);
            }
            return services;
          };
          // Migrate clientFields if needed and filter by city
          const migratedTransport = filterByCityIfNeeded(ts || []).map(service => ({
            ...service,
            clientFields: migrateClientFields(service.clientFields)
          }));
          const migratedGrocery = filterByCityIfNeeded(gs || []).map(service => ({
            ...service,
            clientFields: migrateClientFields(service.clientFields)
          }));
          const migratedCustom = filterByCityIfNeeded(cs || []).map(service => ({
            ...service,
            clientFields: migrateClientFields(service.clientFields)
          }));
          // Update current state with what was actually saved in DB
          setTransportServices(migratedTransport);
          setGroceryServices(migratedGrocery);
          setCustomServices(migratedCustom);

          // Update original state to mark as clean
          setOriginalTransportServices(JSON.parse(JSON.stringify(migratedTransport)));
          setOriginalGroceryServices(JSON.parse(JSON.stringify(migratedGrocery)));
          setOriginalCustomServices(JSON.parse(JSON.stringify(migratedCustom)));
        }
      } else {
        throw new Error(response.message || 'Failed to update concierge services');
      }
    } catch (error) {
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        error.response.data.errors.forEach((err, index) => {});
      }

      // Build detailed error message
      let errorMessage = t('failed_to_save_concierge_services', {
        defaultValue: 'Échec de la sauvegarde des services'
      });
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Show validation errors
        const validationErrors = error.response.data.errors.map(err => err.message).join(', ');
        errorMessage += `: ${validationErrors}`;
      } else if (error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else {
        errorMessage += `: ${error.message}`;
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);

      // Keep isSavingRef true for a short delay to block refetch updates
      setTimeout(() => {
        isSavingRef.current = false;
      }, 500); // 500ms delay to ensure all refetch complete
    }
  };

  // Reset to defaults
  const handleResetToDefaults = async () => {
    if (useManagedOwner ? !managedOwnerId : requiresInternalOwnerPicker && !selectedOwnerId) {
      toast.error(t('please_select_owner', {
        defaultValue: 'Veuillez sélectionner un propriétaire'
      }));
      return;
    }
    if (!window.confirm(t('confirm_reset_concierge', {
      defaultValue: 'Êtes-vous sûr de vouloir réinitialiser aux valeurs par défaut ?'
    }))) {
      return;
    }
    setLoading(true);
    try {
      const params = ownerIdForApi ? {
        ownerId: ownerIdForApi,
        token
      } : {
        token
      };
      const response = await resetOwnerConciergeServices(params);
      if (response.success) {
        toast.success(t('concierge_services_reset', {
          defaultValue: 'Services réinitialisés aux valeurs par défaut'
        }));
        await fetchServices(); // Reload
      } else {
        throw new Error(response.message || 'Failed to reset concierge services');
      }
    } catch (error) {
      toast.error(t('failed_to_reset_concierge', {
        defaultValue: 'Échec de la réinitialisation'
      }) + ': ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Load cities on mount (only in admin mode, not listing mode)
  useEffect(() => {
    if (!isListingMode) {
      fetchCities();
    }
  }, [fetchCities, isListingMode]);

  // In listing mode, load data from initialData prop
  useEffect(() => {
    if (isListingMode && initialData) {
      const {
        transportServices: ts,
        groceryServices: gs,
        customServices: cs
      } = initialData;
      const migratedTransport = (ts || []).map(service => ({
        ...service,
        clientFields: migrateClientFields(service.clientFields)
      }));
      const migratedGrocery = (gs || []).map(service => ({
        ...service,
        clientFields: migrateClientFields(service.clientFields)
      }));
      const migratedCustom = (cs || []).map(service => ({
        ...service,
        clientFields: migrateClientFields(service.clientFields)
      }));
      setTransportServices(migratedTransport);
      setGroceryServices(migratedGrocery);
      setCustomServices(migratedCustom);
      setOriginalTransportServices(JSON.parse(JSON.stringify(migratedTransport)));
      setOriginalGroceryServices(JSON.parse(JSON.stringify(migratedGrocery)));
      setOriginalCustomServices(JSON.parse(JSON.stringify(migratedCustom)));
      setHasLoadedOnce(true);
    }
  }, [isListingMode, initialData]);

  // Track the last processed initialData to detect real backend changes
  const lastProcessedDataRef = useRef(null);

  // Update services and original values when initialData changes (e.g., after save/sync)
  // Don't update during save to prevent flicker
  useEffect(() => {
    if (isListingMode && initialData && hasLoadedOnce && !isSavingRef.current) {
      // Check if this is the same data we already processed
      const currentDataString = JSON.stringify(initialData);
      if (lastProcessedDataRef.current === currentDataString) {
        return;
      }
      const ts = initialData.transportServices || [];
      const gs = initialData.groceryServices || [];
      const cs = initialData.customServices || [];
      const migratedTransport = ts.map(service => ({
        ...service,
        clientFields: migrateClientFields(service.clientFields)
      }));
      const migratedGrocery = gs.map(service => ({
        ...service,
        clientFields: migrateClientFields(service.clientFields)
      }));
      const migratedCustom = cs.map(service => ({
        ...service,
        clientFields: migrateClientFields(service.clientFields)
      }));
      setTransportServices(migratedTransport);
      setGroceryServices(migratedGrocery);
      setCustomServices(migratedCustom);
      setOriginalTransportServices(JSON.parse(JSON.stringify(migratedTransport)));
      setOriginalGroceryServices(JSON.parse(JSON.stringify(migratedGrocery)));
      setOriginalCustomServices(JSON.parse(JSON.stringify(migratedCustom)));

      // Mark this data as processed
      lastProcessedDataRef.current = currentDataString;
    }
  }, [isListingMode, initialData, hasLoadedOnce]);

  // Handle owner selection change - WAIT for cities to load first
  // Also refetch when selectedCityId changes (only in admin mode)
  useEffect(() => {
    if (blockLoad) return;
    const ownerOk = useManagedOwner ? Boolean(managedOwnerId) : selectedOwnerId || !requiresInternalOwnerPicker;
    if (!isListingMode && ownerOk && cities.length > 0 && selectedCityId) {
      fetchServices();
    }
  }, [blockLoad, useManagedOwner, managedOwnerId, selectedOwnerId, requiresInternalOwnerPicker, cities.length, selectedCityId, fetchServices, isListingMode]);

  // Service update handlers - using functional update like SupportCategoriesTemplate
  const handleTransportServiceChange = (index, updatedService) => {
    setTransportServices(prev => {
      const updated = [...prev];
      updated[index] = updatedService;
      return updated;
    });
  };
  const handleGroceryServiceChange = (index, updatedService) => {
    setGroceryServices(prev => {
      const updated = [...prev];
      updated[index] = updatedService;
      return updated;
    });
  };
  const handleCustomServiceChange = (index, updatedService) => {
    setCustomServices(prev => {
      const updated = [...prev];
      updated[index] = updatedService;
      return updated;
    });
  };

  // Add new service handlers
  const handleAddTransportService = () => {
    if (!isListingMode && !selectedCityId) {
      toast.warning('Veuillez sélectionner une ville');
      return;
    }
    const newService = {
      id: `transport_${Date.now()}`,
      enabled: true,
      cityId: isListingMode ? undefined : selectedCityId,
      name: {
        fr: 'Nouveau transport',
        en: 'New transport',
        ar: 'نقل جديد'
      },
      description: {
        fr: 'Service de transport pour vos déplacements',
        en: 'Transportation service',
        ar: 'خدمة النقل'
      },
      route: {
        departureType: 'from_external',
        arrivalType: 'to_property',
        from: '',
        to: 'Le logement'
      },
      pricing: {
        type: 'total',
        amount: 0,
        currency: 'MAD'
      },
      capacity: {
        maxPassengers: 4,
        errorMessage: {
          fr: 'Maximum {max} passagers',
          en: 'Maximum {max} passengers',
          ar: 'الحد الأقصى {max} ركاب'
        }
      },
      clientFields: {
        date: {
          required: true,
          type: 'date',
          label: {
            fr: 'Date',
            en: 'Date',
            ar: 'التاريخ'
          }
        },
        time: {
          required: true,
          type: 'time',
          label: {
            fr: 'Heure',
            en: 'Time',
            ar: 'الوقت'
          }
        },
        passengers: {
          required: true,
          type: 'number',
          min: 1,
          max: 4,
          label: {
            fr: 'Nombre de passagers',
            en: 'Number of passengers',
            ar: 'عدد الركاب'
          }
        },
        notes: {
          required: false,
          type: 'textarea',
          label: {
            fr: 'Remarques',
            en: 'Notes',
            ar: 'ملاحظات'
          },
          placeholder: {
            fr: 'Informations complémentaires',
            en: 'Additional information',
            ar: 'معلومات إضافية'
          }
        }
      },
      availability: {
        type: 'always'
      },
      images: []
    };
    setTransportServices([...transportServices, newService]);
  };
  const handleAddGroceryService = () => {
    if (!isListingMode && !selectedCityId) {
      toast.warning('Veuillez sélectionner une ville');
      return;
    }
    const newService = {
      id: `grocery_${Date.now()}`,
      enabled: true,
      cityId: isListingMode ? undefined : selectedCityId,
      name: {
        fr: 'Nouveau service de courses',
        en: 'New grocery service',
        ar: 'خدمة تسوق جديدة'
      },
      description: {
        fr: 'Service de courses à domicile',
        en: 'Grocery delivery service',
        ar: 'خدمة التسوق'
      },
      pricing: {
        type: 'service_fee_only',
        serviceFee: 0,
        currency: 'MAD',
        explanation: {
          fr: 'Frais de service uniquement (produits payés séparément)',
          en: 'Service fee only (products paid separately)',
          ar: 'رسوم الخدمة فقط (المنتجات تدفع بشكل منفصل)'
        }
      },
      clientFields: {
        deliveryDate: {
          required: true,
          type: 'date',
          label: {
            fr: 'Date de livraison',
            en: 'Delivery date',
            ar: 'تاريخ التسليم'
          }
        },
        shoppingList: {
          required: true,
          type: 'textarea',
          label: {
            fr: 'Liste de courses',
            en: 'Shopping list',
            ar: 'قائمة التسوق'
          },
          placeholder: {
            fr: 'Ex: Pain, Lait, Eau...',
            en: 'Ex: Bread, Milk, Water...',
            ar: 'مثال: خبز، حليب، ماء...'
          }
        }
      },
      availability: {
        type: 'always'
      },
      images: []
    };
    setGroceryServices([...groceryServices, newService]);
  };
  const handleAddCustomService = () => {
    if (!isListingMode && !selectedCityId) {
      toast.warning('Veuillez sélectionner une ville');
      return;
    }
    const newService = {
      id: `custom_${Date.now()}`,
      enabled: true,
      cityId: isListingMode ? undefined : selectedCityId,
      name: {
        fr: 'Nouveau service personnalisé',
        en: 'New custom service',
        ar: 'خدمة مخصصة جديدة'
      },
      description: {
        fr: 'Service personnalisé sur demande',
        en: 'Custom service on request',
        ar: 'خدمة مخصصة حسب الطلب'
      },
      pricing: {
        type: 'quote',
        explanation: {
          fr: 'Prix sur devis selon votre demande',
          en: 'Price quoted based on your request',
          ar: 'السعر بناءً على عرض أسعار حسب طلبك'
        }
      },
      clientFields: {
        requestDescription: {
          required: true,
          type: 'textarea',
          label: {
            fr: 'Description de votre demande',
            en: 'Request description',
            ar: 'وصف طلبك'
          },
          placeholder: {
            fr: 'Décrivez en détail le service dont vous avez besoin...',
            en: 'Describe in detail the service you need...',
            ar: 'صف بالتفصيل الخدمة التي تحتاجها...'
          }
        },
        preferredDate: {
          required: false,
          type: 'date',
          label: {
            fr: 'Date souhaitée (optionnel)',
            en: 'Preferred date (optional)',
            ar: 'التاريخ المفضل (اختياري)'
          }
        }
      },
      availability: {
        type: 'always'
      },
      requiresPMValidation: false,
      images: []
    };
    setCustomServices([...customServices, newService]);
  };

  // Delete service handlers
  const handleDeleteTransportService = index => {
    if (window.confirm(t('confirm_delete_service', {
      defaultValue: 'Êtes-vous sûr de vouloir supprimer ce service ?'
    }))) {
      const updated = transportServices.filter((_, i) => i !== index);
      setTransportServices(updated);
    }
  };
  const handleDeleteGroceryService = index => {
    if (window.confirm(t('confirm_delete_service', {
      defaultValue: 'Êtes-vous sûr de vouloir supprimer ce service ?'
    }))) {
      const updated = groceryServices.filter((_, i) => i !== index);
      setGroceryServices(updated);
    }
  };
  const handleDeleteCustomService = index => {
    if (window.confirm(t('confirm_delete_service', {
      defaultValue: 'Êtes-vous sûr de vouloir supprimer ce service ?'
    }))) {
      const updated = customServices.filter((_, i) => i !== index);
      setCustomServices(updated);
    }
  };
  const saveButton = <ActionButton variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={!isDirty || loading || saving || !ownerScopeReady}>
      {saving ? t('saving', {
      defaultValue: 'Enregistrement...'
    }) : t('save', {
      defaultValue: 'Enregistrer'
    })}
    </ActionButton>;
  return <Box>
      {/* Header with owner selector and actions */}
      {isListingMode && listingHeaderActions ? <Box sx={{
      mb: 2
    }}>
          <Stack direction="row" spacing={1} useFlexGap columnGap={1} rowGap={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              {listingHeaderActions}
            </Stack>
            {saveButton}
          </Stack>
        </Box> : <Box sx={{
      mb: 3
    }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flex: 1
        }}>
              {requiresInternalOwnerPicker && <FormControl sx={{
            minWidth: 300
          }}>
                  <InputLabel>
                    {t('select_owner', {
                defaultValue: 'Sélectionner un propriétaire'
              })}
                  </InputLabel>
                  <Select value={selectedOwnerId} onChange={e => setSelectedOwnerId(e.target.value)} label={t('select_owner', {
              defaultValue: 'Sélectionner un propriétaire'
            })}>
                    {owners.map(owner => <MenuItem key={owner._id} value={owner._id}>
                        {owner.firstName} {owner.lastName} ({owner.email})
                      </MenuItem>)}
                  </Select>
                </FormControl>}

              {/* City selector with quick access tabs (only in admin mode, not listing mode) */}
              {!isListingMode && <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
                  <FormControl sx={{
              minWidth: 250
            }}>
                    <InputLabel>Sélectionner une ville</InputLabel>
                    <Select value={selectedCityId} onChange={e => setSelectedCityId(e.target.value)} label="Sélectionner une ville" disabled={loadingCities}>
                      {cities.map(city => <MenuItem key={city._id} value={city._id}>
                          {city.name?.fr || city.name}
                        </MenuItem>)}
                    </Select>
                  </FormControl>

                  {citiesWithServices.length > 0 && <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
                      <Typography variant="caption" color="text.secondary">
                        Villes actives:
                      </Typography>
                      {citiesWithServices.map(city => <Chip key={city._id} label={city.name?.fr || city.name} onClick={() => setSelectedCityId(city._id)} color={selectedCityId === city._id ? 'primary' : 'default'} variant={selectedCityId === city._id ? 'filled' : 'outlined'} size="small" />)}
                    </Box>}
                </Box>}
            </Box>

            <Stack direction="row" spacing={1}>
              {/* Hide refresh/reset buttons in listing mode (handled by parent component) */}
              {!isListingMode && <>
                  <ActionButton variant="outlined" startIcon={<RefreshIcon />} onClick={fetchServices} disabled={loading || saving || !ownerScopeReady}>
                    {t('refresh', {
                defaultValue: 'Actualiser'
              })}
                  </ActionButton>

                  <ActionButton variant="outlined" startIcon={<RestoreIcon />} onClick={handleResetToDefaults} disabled={loading || saving || !ownerScopeReady}>
                    {t('reset_to_defaults', {
                defaultValue: 'Réinitialiser'
              })}
                  </ActionButton>
                </>}

              {saveButton}
            </Stack>
          </Stack>
        </Box>}

      {/* Main content */}
      {blockLoad ? null : requiresInternalOwnerPicker && !selectedOwnerId ? <Alert severity="info">
          {t('select_owner_to_configure', {
        defaultValue: 'Veuillez sélectionner un propriétaire pour configurer ses services de conciergerie.'
      })}
        </Alert> : loading && !hasLoadedOnce ? <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 300
    }}>
          <CircularProgress />
        </Box> : <Card>
          <CardContent>
            {/* Tabs */}
            <StyledTabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <StyledTab icon={<DirectionsCarIcon />} iconPosition="start" label={`Transport (${filteredTransportServices.length})`} />
              <StyledTab icon={<ShoppingCartIcon />} iconPosition="start" label={`Courses (${filteredGroceryServices.length})`} />
              <StyledTab icon={<ChatIcon />} iconPosition="start" label={`Personnalisés (${filteredCustomServices.length})`} />
            </StyledTabs>

            {/* Tab panels */}
            <Box>
              {activeTab === 0 && <Stack spacing={2}>
                  <Box sx={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
                    <ActionButton variant="contained" onClick={handleAddTransportService} startIcon={<AddIcon />}>
                      {t('add_transport_service', {
                  defaultValue: 'Ajouter un transport'
                })}
                    </ActionButton>
                  </Box>
                  {transportServices.length === 0 ? <Alert severity="info">
                      {t('no_transport_services', {
                defaultValue: 'Aucun service de transport configuré'
              })}
                    </Alert> : filteredTransportServices.map((service, index) => {
              const actualIndex = transportServices.findIndex(s => s.id === service.id);
              return <TransportServiceCard key={service.id || index} service={service} onChange={updated => handleTransportServiceChange(actualIndex, updated)} onDelete={() => handleDeleteTransportService(actualIndex)} />;
            })}
                </Stack>}

              {activeTab === 1 && <Stack spacing={2}>
                  <Box sx={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
                    <ActionButton variant="contained" onClick={handleAddGroceryService} startIcon={<AddIcon />}>
                      {t('add_grocery_service', {
                  defaultValue: 'Ajouter un service de courses'
                })}
                    </ActionButton>
                  </Box>
                  {groceryServices.length === 0 ? <Alert severity="info">
                      {t('no_grocery_services', {
                defaultValue: 'Aucun service de courses configuré'
              })}
                    </Alert> : filteredGroceryServices.map((service, index) => {
              const actualIndex = groceryServices.findIndex(s => s.id === service.id);
              return <GroceryServiceCard key={service.id || index} service={service} onChange={updated => handleGroceryServiceChange(actualIndex, updated)} onDelete={() => handleDeleteGroceryService(actualIndex)} />;
            })}
                </Stack>}

              {activeTab === 2 && <Stack spacing={2}>
                  <Box sx={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
                    <ActionButton variant="contained" onClick={handleAddCustomService} startIcon={<AddIcon />}>
                      {t('add_custom_service', {
                  defaultValue: 'Ajouter un service personnalisé'
                })}
                    </ActionButton>
                  </Box>
                  {customServices.length === 0 ? <Alert severity="info">
                      {t('no_custom_services', {
                defaultValue: 'Aucun service personnalisé configuré'
              })}
                    </Alert> : filteredCustomServices.map((service, index) => {
              const actualIndex = customServices.findIndex(s => s.id === service.id);
              return <CustomServiceCard key={service.id || index} service={service} onChange={updated => handleCustomServiceChange(actualIndex, updated)} onDelete={() => handleDeleteCustomService(actualIndex)} />;
            })}
                </Stack>}
            </Box>
          </CardContent>
        </Card>}
    </Box>;
};
export default ConciergeServicesTemplate;
