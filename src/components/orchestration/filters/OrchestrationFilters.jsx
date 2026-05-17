// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Atelier 2026
// OrchestrationFilters.jsx — barre horizontale compacte, focus ambre.
// Version simplifiée pour les samples.
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { TextField, InputAdornment, Button } from '@mui/material';
import { Search as SearchIcon, RestartAlt as ResetIcon } from '@mui/icons-material';

const OrchestrationFilters = ({
  searchQuery, setSearchQuery,
  status, setStatus,
  selectedListings, setSelectedListings,
  planStatuses, setPlanStatuses,
  sortBy, setSortBy,
  listings = [],
  onReset,
}) => {
  return (
    <div style={{
      background: 'var(--bg-paper)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '10px 12px',
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    }}>
      <TextField
        placeholder="Rechercher SJ-XXXXXXXX, voyageur, logement…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        sx={{
          flex: 1, minWidth: 220,
          '& .MuiOutlinedInput-root': {
            height: 34, fontSize: 12.5, background: 'var(--bg-sub)',
            '& fieldset':                          { borderColor: 'var(--border)' },
            '&:hover fieldset':                    { borderColor: 'var(--border-strong)' },
            '&.Mui-focused fieldset':              { borderColor: 'var(--accent)', borderWidth: 1.5, boxShadow: '0 0 0 3px rgba(184,133,26,0.16)' },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 16, color: 'var(--text-muted)' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* TODO: Ajouter les filtres multi-select quand les composants seront disponibles */}
      {/* OrchestrationListingFilter, OrchestrationStatusFilter, etc. */}

      <Button
        size="small"
        onClick={onReset}
        startIcon={<ResetIcon sx={{ fontSize: 14 }} />}
        sx={{
          height: 32, padding: '0 10px', borderRadius: '8px',
          fontSize: 11.5, fontWeight: 600, textTransform: 'none',
          color: 'var(--text-muted)',
          border: '1px dashed var(--border)',
          '&:hover': { color: 'var(--error)', borderColor: 'rgba(200,30,30,0.30)', background: 'transparent' },
        }}
      >
        Reset
      </Button>
    </div>
  );
};

export default OrchestrationFilters;
