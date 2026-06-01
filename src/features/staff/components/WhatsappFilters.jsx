import React from 'react';
import {
  Paper,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { TEAM_T } from '../../../components/team/teamHubTokens';

const selectSx = {
  fontSize: 12.5,
  bgcolor: TEAM_T.bg1,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: TEAM_T.border },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: TEAM_T.borderStrong },
};

const WhatsappFilters = ({
  searchText,
  setSearchText,
  listings,
  selectedListings,
  setSelectedListings,
  selectedTypes,
  setSelectedTypes,
  selectedAccess,
  setSelectedAccess,
  selectedLanguages,
  setSelectedLanguages,
  types = [],
  languages = [],
  onReset,
  onFilterChange,
  showFilters = true,
  addButton = null,
}) => {
  const { t } = useTranslation('common');

  if (!showFilters) return null;

  const listingOptions = (listings || []).map((l) => ({
    id: l.id || l._id || l.name,
    name: l.name,
  }));
  const typeOptions = (types || []).map((tItem) => ({ id: tItem.task, name: tItem.task }));
  const accessOptions = [
    { id: 'Read', name: 'Read' },
    { id: 'Write', name: 'Write' },
  ];
  const languageOptions = (Array.isArray(languages) ? languages : []).map((l) => ({
    id: l?.name ?? l,
    name: l?.name ?? String(l ?? ''),
  }));

  const bumpPage = () => {
    if (onFilterChange) onFilterChange();
  };

  const handleReset = () => {
    onReset();
    if (onFilterChange) onFilterChange('reset', null);
  };

  const hasActiveFilters =
    Boolean(searchText?.trim()) ||
    selectedListings?.length > 0 ||
    selectedTypes?.length > 0 ||
    selectedAccess?.length > 0 ||
    selectedLanguages?.length > 0;

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 1.5,
        border: `1px solid ${TEAM_T.border}`,
        borderRadius: 1.5,
        bgcolor: TEAM_T.bg1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={t('Rechercher username, téléphone…', { defaultValue: 'Rechercher username, téléphone…' })}
          value={searchText || ''}
          onChange={(e) => {
            setSearchText(e.target.value);
            bumpPage();
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: TEAM_T.text3 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            minWidth: 180,
            maxWidth: 320,
            '& .MuiOutlinedInput-root': {
              bgcolor: TEAM_T.bg1,
              '& fieldset': { borderColor: TEAM_T.border },
            },
          }}
        />

        {addButton}

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            multiple
            displayEmpty
            value={selectedListings || []}
            onChange={(e) => {
              setSelectedListings(e.target.value);
              bumpPage();
            }}
            renderValue={(s) => `Annonces · ${(s).length || 'toutes'}`}
            sx={selectSx}
          >
            {listingOptions.map((lst) => (
              <MenuItem key={lst.id} value={lst.id}>
                <Checkbox checked={(selectedListings || []).indexOf(lst.id) > -1} size="small" />
                <ListItemText primary={lst.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            multiple
            displayEmpty
            value={selectedTypes || []}
            onChange={(e) => {
              setSelectedTypes(e.target.value);
              bumpPage();
            }}
            renderValue={(s) => `Types · ${(s).length || 'tous'}`}
            sx={selectSx}
          >
            {typeOptions.map((tp) => (
              <MenuItem key={tp.id} value={tp.id}>
                <Checkbox checked={(selectedTypes || []).indexOf(tp.id) > -1} size="small" />
                <ListItemText primary={tp.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            multiple
            displayEmpty
            value={selectedAccess || []}
            onChange={(e) => {
              setSelectedAccess(e.target.value);
              bumpPage();
            }}
            renderValue={(s) => `Accès · ${(s).length || 'tous'}`}
            sx={selectSx}
          >
            {accessOptions.map((acc) => (
              <MenuItem key={acc.id} value={acc.id}>
                <Checkbox checked={(selectedAccess || []).indexOf(acc.id) > -1} size="small" />
                <ListItemText primary={acc.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select
            multiple
            displayEmpty
            value={selectedLanguages || []}
            onChange={(e) => {
              setSelectedLanguages(e.target.value);
              bumpPage();
            }}
            renderValue={(s) => `Langue · ${(s).length || 'toutes'}`}
            sx={selectSx}
          >
            {languageOptions.map((lang) => (
              <MenuItem key={lang.id} value={lang.id}>
                <Checkbox checked={(selectedLanguages || []).indexOf(lang.id) > -1} size="small" />
                <ListItemText primary={lang.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tooltip title="Réinitialiser tous les filtres">
          <span>
            <IconButton
              size="small"
              onClick={handleReset}
              disabled={!hasActiveFilters}
              sx={{ color: TEAM_T.text3 }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Paper>
  );
};

export default WhatsappFilters;
