import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, TextField, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import { getOwners } from '../../../services/teamDashboardApi';
import { getOwnerListLabel } from '../../../utils/ownerDisplay.utils';
import { autocompleteOptionLiProps } from '../../../utils/autocompleteOptionLiProps';
import { applyOwnerIdToSearchParams } from '../onboardingOwnerUrl';

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

/** Liste déroulante admin — recherche serveur par nom, email, société. */
export function OnboardingOwnerPicker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setSelectedOwnerId, selectedOwnerId } = useAdminOwnerFilter();
  const [inputValue, setInputValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fromUrl = searchParams.get('ownerId')?.trim();
    if (fromUrl) setSelectedOwnerId(fromUrl);
  }, [searchParams, setSelectedOwnerId]);

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
      setOptions(rows.filter((o) => ownerRowId(o)));
      if (!rows.length && !q.trim()) {
        setLoadError('Aucun property manager trouvé pour ce compte admin.');
      }
    } catch {
      setOptions([]);
      setLoadError('Impossible de charger les propriétaires — vérifiez votre session et réessayez.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delay = searchText ? 280 : 0;
    const t = setTimeout(() => void fetchOwners(searchText), delay);
    return () => clearTimeout(t);
  }, [searchText, fetchOwners]);

  const value = useMemo(() => {
    if (!selectedOwnerId) return null;
    return options.find((o) => ownerRowId(o) === String(selectedOwnerId)) ?? null;
  }, [options, selectedOwnerId]);

  useEffect(() => {
    if (!value && selectedOwnerId && options.length > 0) {
      const hit = options.find((o) => ownerRowId(o) === String(selectedOwnerId));
      if (hit) setInputValue(getOwnerListLabel(hit));
    }
  }, [value, selectedOwnerId, options]);

  return (
    <Box className="ob-owner-picker" sx={{ width: '100%', maxWidth: 480 }}>
      <Autocomplete
        openOnFocus
        autoHighlight
        clearOnBlur={false}
        loading={loading}
        options={options}
        value={value}
        inputValue={inputValue}
        onInputChange={(_, next, reason) => {
          setInputValue(next);
          if (reason === 'input') setSearchText(next);
          if (reason === 'clear') {
            setSearchText('');
            setSelectedOwnerId('');
          }
        }}
        onChange={(_, option) => {
          const id = ownerRowId(option);
          setSelectedOwnerId(id);
          setInputValue(option ? getOwnerListLabel(option) : '');
          if (!option) setSearchText('');
          setSearchParams(applyOwnerIdToSearchParams(searchParams, id), { replace: true });
        }}
        filterOptions={(rows) => rows}
        getOptionLabel={(o) => getOwnerListLabel(o)}
        isOptionEqualToValue={(a, b) => ownerRowId(a) === ownerRowId(b)}
        noOptionsText={loading ? 'Chargement…' : 'Aucun propriétaire trouvé'}
        loadingText="Chargement des propriétaires…"
        slotProps={{
          listbox: { style: { maxHeight: 340 } },
          popper: { placement: 'bottom-start', sx: { zIndex: 1400 } },
        }}
        sx={{ width: '100%' }}
        renderOption={(props, option) => {
          const { key, liProps } = autocompleteOptionLiProps(props);
          const secondary = ownerRowSecondary(option);
          return (
            <Box component="li" key={key ?? ownerRowId(option)} {...liProps} sx={{ py: 1, px: 1.5 }}>
              <Typography variant="body2" fontWeight={700} lineHeight={1.3}>
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
            label="Propriétaire"
            placeholder="Rechercher par nom, email ou société…"
            helperText={
              loadError
                ? undefined
                : options.length > 0
                  ? `${options.length} PM affiché(s) — ouvrez la liste ou tapez pour filtrer`
                  : 'Ouvrez la liste pour choisir un property manager'
            }
          />
        )}
      />
      {loadError ? (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {loadError}
        </Alert>
      ) : null}
    </Box>
  );
}

export default OnboardingOwnerPicker;
