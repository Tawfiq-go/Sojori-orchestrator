import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import { createOwnerAccount, getCities } from '../../../services/teamDashboardApi';
import {
  defaultActivationsAllOff,
  initializeOwnerOrchestrationFromActivations,
} from '../../orchestrationListingV3/ownerCapabilityActivation';
import { WHATSAPP_AI_TIER_OPTIONS, tierOptionDropdownLabel } from '../../../constants/whatsappAiTier';
import { applyOwnerIdToSearchParams } from '../onboardingOwnerUrl';

type CityRow = { _id: string; name?: string; rentalCityId?: number | string };

type CreateOwnerResult = {
  accountId: string;
  ruOwnerId: string | null;
  email: string;
};

type Props = {
  onCreated?: (result: CreateOwnerResult) => void;
};

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  whatsapp: '',
  channelManager: 'RU',
  cityId: '',
  whatsappConversationalTier: 2,
};

/** Création PM inline — même API que /admin/equipe/owners (register + provision RU si CM=RU). */
export function OnboardingCreateOwnerForm({ onCreated }: Props) {
  const { setSelectedOwnerId } = useAdminOwnerFilter();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const [ruResult, setRuResult] = useState<{
    ruOwnerId: string | null;
    email: string;
    accountId: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingCities(true);
    getCities({ limit: 200, paged: false })
      .then((rows) => {
        if (!cancelled) setCities(Array.isArray(rows) ? (rows as CityRow[]) : []);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key: keyof typeof initialForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = useCallback(async () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const password = form.password;
    const phone = form.phone.trim();
    if (!firstName || !lastName || !email || !password || password.length < 6 || !phone || !form.cityId) {
      setError('Prénom, nom, email, mot de passe (6+ car.), téléphone et ville sont obligatoires.');
      return;
    }
    if (!form.channelManager) {
      setError('Channel manager requis (RU recommandé pour import Airbnb).');
      return;
    }

    const selectedCity = cities.find((c) => String(c._id) === String(form.cityId));
    const rentalCityId = selectedCity?.rentalCityId;
    if (!rentalCityId) {
      setError('Ville Sojori invalide — choisissez une ville avec rentalCityId RU.');
      return;
    }

    setSubmitting(true);
    setError('');
    setRuResult(null);
    try {
      const res = await createOwnerAccount({
        firstName,
        lastName,
        email,
        password,
        phone,
        whatsapp: form.whatsapp.trim(),
        channelManager: form.channelManager,
        cityId: form.cityId,
        rentalCityId: String(rentalCityId),
        whatsappConversationalTier: Number(form.whatsappConversationalTier) || 2,
      });

      const accountId = res?.data?.accountId?.trim();
      if (!accountId) {
        throw new Error(res?.error || res?.message || 'Création échouée — identifiant owner manquant');
      }

      try {
        await initializeOwnerOrchestrationFromActivations(accountId, defaultActivationsAllOff());
      } catch (initErr) {
        console.warn('[onboarding] orchestration init after owner create', initErr);
      }

      const ruOwnerId = res.data?.ruOwnerId ?? null;
      setCreatedAccountId(accountId);
      setRuResult({ ruOwnerId, email: res.data?.email || email, accountId });
      setForm(initialForm);
      toast.success(
        ruOwnerId
          ? `PM créé (RU #${ruOwnerId}) — on-boarding quand vous voulez via cette page ou la sidebar`
          : 'Property manager créé — on-boarding optionnel, à faire quand vous êtes prêt',
      );
      onCreated?.({ accountId, ruOwnerId, email: res.data?.email || email });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Impossible de créer le property manager',
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, cities, onCreated]);

  const startOnboardingForCreated = () => {
    const id = createdAccountId || ruResult?.accountId;
    if (id) {
      setSelectedOwnerId(id);
      setSearchParams(applyOwnerIdToSearchParams(searchParams, id), { replace: true });
    }
  };

  return (
    <Box className="ob-create-owner-form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="info" sx={{ fontSize: 13 }}>
        Même flux que{' '}
        <strong>Équipe & Rôles → Property managers → Créer</strong>. Si le channel manager est{' '}
        <strong>RU</strong>, srv-user génère un mot de passe RU et appelle srv-channels pour créer le
        compte Rentals United (<code>ruOwnerId</code>).
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <TextField
          label="Prénom"
          size="small"
          required
          value={form.firstName}
          onChange={(e) => setField('firstName', e.target.value)}
        />
        <TextField
          label="Nom"
          size="small"
          required
          value={form.lastName}
          onChange={(e) => setField('lastName', e.target.value)}
        />
        <TextField
          label="Email"
          size="small"
          required
          type="email"
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
        />
        <TextField
          label="Mot de passe Sojori"
          size="small"
          required
          type="password"
          value={form.password}
          onChange={(e) => setField('password', e.target.value)}
          helperText="6 caractères minimum"
        />
        <TextField
          label="Téléphone"
          size="small"
          required
          value={form.phone}
          onChange={(e) => setField('phone', e.target.value)}
        />
        <TextField
          label="WhatsApp (optionnel)"
          size="small"
          value={form.whatsapp}
          onChange={(e) => setField('whatsapp', e.target.value)}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <FormControl size="small" required>
          <InputLabel id="ob-cm-label">Channel manager</InputLabel>
          <Select
            labelId="ob-cm-label"
            label="Channel manager"
            value={form.channelManager}
            onChange={(e) => setField('channelManager', e.target.value)}
          >
            <MenuItem value="RU">
              <Chip label="Rentals United (RU)" size="small" sx={{ bgcolor: '#FFA500', color: '#fff' }} />
            </MenuItem>
            <MenuItem value="Channex">
              <Chip label="Channex" size="small" sx={{ bgcolor: '#3b82f6', color: '#fff' }} />
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" required disabled={loadingCities}>
          <InputLabel id="ob-city-label">Ville principale</InputLabel>
          <Select
            labelId="ob-city-label"
            label="Ville principale"
            value={form.cityId}
            onChange={(e) => setField('cityId', e.target.value)}
          >
            {cities.map((city) => (
              <MenuItem key={city._id} value={city._id}>
                {city.name || city._id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <FormControl size="small" sx={{ maxWidth: 420 }}>
        <InputLabel id="ob-wa-tier-label">IA WhatsApp invités</InputLabel>
        <Select
          labelId="ob-wa-tier-label"
          label="IA WhatsApp invités"
          value={form.whatsappConversationalTier}
          onChange={(e) => setField('whatsappConversationalTier', Number(e.target.value))}
        >
          {WHATSAPP_AI_TIER_OPTIONS.map((opt) => (
            <MenuItem key={opt.tier} value={opt.tier}>
              {tierOptionDropdownLabel(opt)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {ruResult ? (
        <Alert
          severity={ruResult.ruOwnerId ? 'success' : 'warning'}
          action={
            <Button color="inherit" size="small" onClick={startOnboardingForCreated} sx={{ fontWeight: 700 }}>
              Configurer l&apos;on-boarding
            </Button>
          }
        >
          Compte <strong>{ruResult.email}</strong> créé — le PM peut se connecter tout de suite.
          {ruResult.ruOwnerId ? (
            <>
              {' '}
              RU owner ID : <strong>{ruResult.ruOwnerId}</strong>.
            </>
          ) : (
            <> Provision RU à vérifier depuis Property managers si besoin.</>
          )}{' '}
          L&apos;on-boarding (équipe, import, orchestration) est <strong>optionnel</strong> : lancez-le quand
          vous voulez via le bouton ou l&apos;onglet PM existant.
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={() => void handleSubmit()}
          sx={{ bgcolor: '#B8851A', '&:hover': { bgcolor: '#9a6f15' }, textTransform: 'none', fontWeight: 700 }}
        >
          {submitting ? (
            <>
              <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
              Création…
            </>
          ) : (
            'Créer le property manager'
          )}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Ou gérer la liste complète →{' '}
          <a href="/admin/equipe/owners?tab=list" style={{ fontWeight: 700 }}>
            Property managers
          </a>
        </Typography>
      </Box>
    </Box>
  );
}

export default OnboardingCreateOwnerForm;
