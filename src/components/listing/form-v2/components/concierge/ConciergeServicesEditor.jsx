import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ChatIcon from '@mui/icons-material/Chat';
import SaveIcon from '@mui/icons-material/Save';
import { toast } from 'react-toastify';
import { T, menuBtnPrimary } from '../ChatbotMenuConfig/menuTheme';
import TransportServiceCard from './TransportServiceCard';
import GroceryServiceCard from './GroceryServiceCard';
import CustomServiceCard from './CustomServiceCard';
import { migrateServiceList } from './migrateClientFields';

function normalizeForSave(transportServices, groceryServices, customServices) {
  return {
    transportServices: transportServices.map((s) => ({
      ...s,
      pricing: { type: s.pricing?.type || 'total', ...s.pricing },
    })),
    groceryServices: groceryServices.map((s) => ({
      ...s,
      pricing: {
        type: s.pricing?.type || 'service_fee_only',
        serviceFee: s.pricing?.serviceFee ?? 0,
        currency: s.pricing?.currency || 'MAD',
        ...s.pricing,
      },
    })),
    customServices: customServices.map((s) => ({
      ...s,
      pricing: { type: s.pricing?.type || 'quote', ...s.pricing },
    })),
  };
}

function loadFromInitial(initialData) {
  if (!initialData) return null;
  return {
    transport: migrateServiceList(initialData.transportServices, 'total'),
    grocery: migrateServiceList(initialData.groceryServices, 'service_fee_only'),
    custom: migrateServiceList(initialData.customServices, 'quote'),
  };
}

export default function ConciergeServicesEditor({ initialData, onSave, saving = false }) {
  const [activeTab, setActiveTab] = useState(0);
  const [transportServices, setTransportServices] = useState([]);
  const [groceryServices, setGroceryServices] = useState([]);
  const [customServices, setCustomServices] = useState([]);
  const [original, setOriginal] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const isSavingRef = useRef(false);
  const lastProcessedRef = useRef(null);

  const applyLoaded = (loaded) => {
    if (!loaded) return;
    setTransportServices(loaded.transport);
    setGroceryServices(loaded.grocery);
    setCustomServices(loaded.custom);
    setOriginal(JSON.stringify(loaded));
    setHasLoadedOnce(true);
  };

  useEffect(() => {
    const loaded = loadFromInitial(initialData);
    if (loaded) applyLoaded(loaded);
  }, []);

  useEffect(() => {
    if (!hasLoadedOnce || isSavingRef.current || !initialData) return;
    const key = JSON.stringify(initialData);
    if (lastProcessedRef.current === key) return;
    lastProcessedRef.current = key;
    const loaded = loadFromInitial(initialData);
    if (loaded) applyLoaded(loaded);
  }, [initialData, hasLoadedOnce]);

  const isDirty = useMemo(() => {
    if (!original) return false;
    const current = JSON.stringify({
      transport: transportServices,
      grocery: groceryServices,
      custom: customServices,
    });
    return current !== original;
  }, [transportServices, groceryServices, customServices, original]);

  const handleSave = async () => {
    if (!onSave || !isDirty) return;
    isSavingRef.current = true;
    try {
      const payload = normalizeForSave(transportServices, groceryServices, customServices);
      await onSave(payload);
      toast.success('Conciergerie enregistrée');
      setOriginal(JSON.stringify({
        transport: payload.transportServices,
        grocery: payload.groceryServices,
        custom: payload.customServices,
      }));
    } catch (e) {
      toast.error(e?.message || 'Échec de la sauvegarde');
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 400);
    }
  };

  const handleAddTransport = () => {
    setTransportServices((prev) => [
      ...prev,
      {
        id: `transport_${Date.now()}`,
        enabled: true,
        name: { fr: 'Nouveau transport', en: 'New transport', ar: 'نقل جديد' },
        description: { fr: 'Service de transport pour vos déplacements' },
        route: {
          departureType: 'from_external',
          arrivalType: 'to_property',
          from: '',
          to: 'Le logement',
          journeyTag: 'arrival',
        },
        pricing: { type: 'total', amount: 0, currency: 'MAD' },
        capacity: { maxPassengers: 4 },
        clientFields: {},
        availability: { type: 'always' },
        images: [],
      },
    ]);
  };

  const handleAddGrocery = () => {
    setGroceryServices((prev) => [
      ...prev,
      {
        id: `grocery_${Date.now()}`,
        enabled: true,
        name: { fr: 'Nouveau service de courses', en: 'New grocery service', ar: 'خدمة تسوق جديدة' },
        description: { fr: 'Service de courses à domicile' },
        pricing: {
          type: 'service_fee_only',
          serviceFee: 0,
          currency: 'MAD',
          explanation: { fr: 'Frais de service uniquement (produits payés séparément)' },
        },
        clientFields: {},
        availability: { type: 'always' },
        images: [],
      },
    ]);
  };

  const handleAddCustom = () => {
    setCustomServices((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        enabled: true,
        name: { fr: 'Nouveau service personnalisé', en: 'New custom service', ar: 'خدمة مخصصة جديدة' },
        description: { fr: 'Service personnalisé sur demande' },
        pricing: {
          type: 'quote',
          explanation: { fr: 'Prix sur devis selon votre demande' },
        },
        clientFields: {},
        availability: { type: 'always' },
        requiresPMValidation: false,
        images: [],
      },
    ]);
  };

  const confirmDelete = () =>
    window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?');

  if (!hasLoadedOnce) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
      </Box>
    );
  }

  return (
    <Card sx={{ border: `1px solid ${T.border}`, borderRadius: 1.5, boxShadow: 'none', bgcolor: T.bg1 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 40,
              '& .MuiTabs-indicator': { bgcolor: T.primary, height: 3 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                minHeight: 40,
                color: T.text2,
                '&.Mui-selected': { color: T.primaryDeep },
              },
            }}
          >
            <Tab
              icon={<DirectionsCarIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Transport (${transportServices.length})`}
            />
            <Tab
              icon={<ShoppingCartIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Courses (${groceryServices.length})`}
            />
            <Tab
              icon={<ChatIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Personnalisés (${customServices.length})`}
            />
          </Tabs>
          <Button
            variant="contained"
            size="small"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            disabled={!isDirty || saving}
            onClick={handleSave}
            sx={menuBtnPrimary}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </Stack>

        {activeTab === 0 && (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddTransport} sx={menuBtnPrimary}>
                Ajouter un transport
              </Button>
            </Box>
            {transportServices.length === 0 ? (
              <Alert severity="info">Aucun service de transport configuré</Alert>
            ) : (
              transportServices.map((service, index) => (
                <TransportServiceCard
                  key={service.id || index}
                  service={service}
                  onChange={(updated) => {
                    setTransportServices((prev) => prev.map((s, i) => (i === index ? updated : s)));
                  }}
                  onDelete={() => {
                    if (confirmDelete()) setTransportServices((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              ))
            )}
          </Stack>
        )}

        {activeTab === 1 && (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddGrocery} sx={menuBtnPrimary}>
                Ajouter un service de courses
              </Button>
            </Box>
            {groceryServices.length === 0 ? (
              <Alert severity="info">Aucun service de courses configuré</Alert>
            ) : (
              groceryServices.map((service, index) => (
                <GroceryServiceCard
                  key={service.id || index}
                  service={service}
                  onChange={(updated) => {
                    setGroceryServices((prev) => prev.map((s, i) => (i === index ? updated : s)));
                  }}
                  onDelete={() => {
                    if (confirmDelete()) setGroceryServices((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              ))
            )}
          </Stack>
        )}

        {activeTab === 2 && (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddCustom} sx={menuBtnPrimary}>
                Ajouter un service personnalisé
              </Button>
            </Box>
            {customServices.length === 0 ? (
              <Alert severity="info">Aucun service personnalisé configuré</Alert>
            ) : (
              customServices.map((service, index) => (
                <CustomServiceCard
                  key={service.id || index}
                  service={service}
                  onChange={(updated) => {
                    setCustomServices((prev) => prev.map((s, i) => (i === index ? updated : s)));
                  }}
                  onDelete={() => {
                    if (confirmDelete()) setCustomServices((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              ))
            )}
          </Stack>
        )}

        <Typography sx={{ fontSize: 11, color: T.text3, mt: 2 }}>
          Description éditée en français ; noms multilingues conservés pour WhatsApp.
        </Typography>
      </CardContent>
    </Card>
  );
}
