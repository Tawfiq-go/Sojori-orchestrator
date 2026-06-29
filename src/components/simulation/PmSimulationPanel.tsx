import {
  Alert,
  Autocomplete,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import StopRounded from '@mui/icons-material/StopRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import { usePmSimulation } from '../../context/PmSimulationContext';
import { getOwners } from '../../services/teamDashboardApi';
import { getOwnerListLabel } from '../../utils/ownerDisplay.utils';

type OwnerRow = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  fillCompany?: { companyName?: string };
};

function ownerRowId(o: OwnerRow | null | undefined): string {
  if (!o) return '';
  return String(o._id ?? o.id ?? '').trim();
}

function ownerRowSecondary(o: OwnerRow): string {
  const email = o.email?.trim();
  const company = o.fillCompany?.companyName?.trim() || o.companyName?.trim();
  return [email, company].filter(Boolean).join(' · ');
}

export function PmSimulationPanel() {
  const {
    canSimulate,
    isActive,
    snapshot,
    startSimulation,
    stopSimulation,
  } = usePmSimulation();

  const [inputValue, setInputValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState<OwnerRow[]>([]);
  const [picked, setPicked] = useState<OwnerRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const fetchOwners = useCallback(async (q: string) => {
    setLoading(true);
    setLoadError('');
    try {
      const res = (await getOwners({
        page: 0,
        limit: 100,
        deleted: false,
        banned: false,
        search_text: q.trim(),
      })) as { data?: OwnerRow[]; total?: number };
      const rows = Array.isArray(res?.data) ? res.data : [];
      const filtered = rows.filter((o) => ownerRowId(o));
      setOptions(filtered);
      if (!filtered.length) {
        setLoadError(
          q.trim()
            ? `Aucun Property Manager pour « ${q.trim()} ».`
            : 'Aucun Property Manager trouvé — vérifiez votre compte admin.',
        );
      }
    } catch {
      setOptions([]);
      setLoadError('Impossible de charger les Property Managers — vérifiez votre session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canSimulate) return;
    const delay = searchText ? 280 : 0;
    const t = setTimeout(() => void fetchOwners(searchText), delay);
    return () => clearTimeout(t);
  }, [canSimulate, searchText, fetchOwners]);

  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        getOwnerListLabel(a).localeCompare(getOwnerListLabel(b), 'fr', { sensitivity: 'base' }),
      ),
    [options],
  );

  if (!canSimulate) {
    return (
      <Typography variant="body2" color="text.secondary">
        Réservé aux comptes SuperAdmin / Admin.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: T.text }}>
        Simulation Property Manager
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Visualisez l&apos;application comme un hôte (sidebar PM, données scopées). Votre session
        reste admin — chaque démarrage / arrêt est journalisé côté serveur.
      </Typography>

      <Alert
        icon={<InfoOutlined fontSize="inherit" />}
        severity="info"
        sx={{ mb: 3, maxWidth: 720 }}
      >
        <strong>Retour mode admin :</strong> cliquez sur le bandeau ambre en haut de l&apos;écran
        → <strong>Quitter simulation</strong> (ou <strong>Arrêter la simulation</strong> ci-dessous).
        Les pages <code>/admin</code> et monitor restent accessibles pendant la simulation.
      </Alert>

      {isActive && snapshot ? (
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: '2px solid #F59E0B',
            bgcolor: 'rgba(245,158,11,0.08)',
            mb: 3,
            maxWidth: 720,
          }}
        >
          <Typography fontWeight={700} sx={{ color: '#B45309', mb: 0.5 }}>
            Simulation active
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {snapshot.ownerLabel}
            {snapshot.ownerEmail ? ` · ${snapshot.ownerEmail}` : ''}
          </Typography>
          <Button
            variant="contained"
            color="warning"
            startIcon={<StopRounded />}
            onClick={stopSimulation}
          >
            Retour mode admin
          </Button>
        </Box>
      ) : null}

      <Box sx={{ maxWidth: 560 }}>
        <Autocomplete
          openOnFocus
          autoHighlight
          clearOnBlur={false}
          disabled={isActive}
          loading={loading}
          options={sortedOptions}
          value={picked}
          inputValue={inputValue}
          onInputChange={(_, next, reason) => {
            setInputValue(next);
            if (reason === 'input') setSearchText(next);
            if (reason === 'clear') {
              setSearchText('');
              setPicked(null);
            }
          }}
          onChange={(_, option) => {
            setPicked(option);
            setInputValue(option ? getOwnerListLabel(option) : '');
            if (!option) setSearchText('');
          }}
          filterOptions={(rows) => rows}
          getOptionLabel={(o) => getOwnerListLabel(o)}
          isOptionEqualToValue={(a, b) => ownerRowId(a) === ownerRowId(b)}
          noOptionsText={loading ? 'Chargement…' : 'Aucun Property Manager'}
          loadingText="Chargement des Property Managers…"
          slotProps={{
            listbox: { style: { maxHeight: 360 } },
            popper: { placement: 'bottom-start', sx: { zIndex: 1400 } },
          }}
          sx={{ width: '100%' }}
          renderOption={(props, option) => {
            const { key, ...rest } = props as { key?: string };
            const secondary = ownerRowSecondary(option);
            return (
              <Box component="li" key={key ?? ownerRowId(option)} {...rest} sx={{ py: 1, px: 1.5 }}>
                <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                  {getOwnerListLabel(option)}
                </Typography>
                {secondary ? (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                    {secondary}
                  </Typography>
                ) : null}
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Choisir un Property Manager"
              placeholder="Cliquez pour ouvrir la liste ou tapez pour rechercher…"
              helperText={
                loadError
                  ? undefined
                  : sortedOptions.length > 0
                    ? `${sortedOptions.length} PM — liste déroulante + recherche par nom, email, société`
                    : 'Ouvrez la liste pour afficher les Property Managers'
              }
            />
          )}
        />

        {loadError ? (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {loadError}
          </Alert>
        ) : null}

        <Button
          variant="contained"
          disabled={!picked || isActive}
          startIcon={<PlayArrowRounded />}
          onClick={() => {
            if (!picked) return;
            const id = ownerRowId(picked);
            if (!id) return;
            startSimulation(id, {
              label: getOwnerListLabel(picked),
              email: picked.email?.trim() || undefined,
            });
          }}
          sx={{ mt: 2, fontWeight: 700 }}
        >
          Démarrer simulation
        </Button>
      </Box>
    </Box>
  );
}

export default PmSimulationPanel;
