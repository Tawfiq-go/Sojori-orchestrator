// ════════════════════════════════════════════════════════════════════
// Sojori — Column Filters
// Dropdown multi-select pour afficher/cacher les colonnes du calendrier
// Réplication exacte de sojori-dashboard/ColumnFilters.jsx
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, MenuList, MenuItem, InputBase, FormControl } from '@mui/material';

const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FFE5DD',
  primaryHover: '#FFD4C4',
  gray: {
    100: '#F5F5F5',
    200: '#EEEEEE',
    600: '#757575',
    700: '#6e7275',
    800: '#7b809a',
  },
};

export const COLUMNS_OPTIONS = [
  { id: 'availableRoom', label: 'Chambre disponible' },
  { id: 'rate', label: 'Tarif (avec détails)' },
  { id: 'basePrice', label: 'Prix de base' },
  { id: 'manualPrice', label: 'Prix manuel' },
  { id: 'dynamicPrice', label: 'Prix Dynamique' },
  { id: 'reservations', label: 'Réservations' },
  { id: 'stopSell', label: 'Arrêt des ventes' },
  { id: 'minStay', label: 'Séjour minimum' },
  { id: 'maxStay', label: 'Séjour maximum' },
  { id: 'closedArrival', label: 'Arrivée fermée' },
  { id: 'closedDeparture', label: 'Départ fermé' },
] as const;

export type ColumnId = typeof COLUMNS_OPTIONS[number]['id'];

interface ColumnFiltersProps {
  selectedColumns: ColumnId[];
  onSelectedColumnsChange: (columns: ColumnId[]) => void;
}

export function ColumnFilters({ selectedColumns, onSelectedColumnsChange }: ColumnFiltersProps) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [filteredColumns, setFilteredColumns] = useState(COLUMNS_OPTIONS);
  const selectRef = useRef<HTMLDivElement>(null);
  const limit = 2; // Show max 2 tags before "+N"

  useEffect(() => {
    const value = inputValue.toLowerCase();
    const filtered = COLUMNS_OPTIONS.filter((col) =>
      col.label.toLowerCase().includes(value)
    );
    setFilteredColumns(filtered);
  }, [inputValue]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleDeleteTag = (event: React.MouseEvent, columnId: ColumnId) => {
    event.stopPropagation();
    const updatedColumns = selectedColumns.filter((id) => id !== columnId);
    onSelectedColumnsChange(updatedColumns);
  };

  const handleToggleColumn = (columnId: ColumnId) => {
    const isSelected = selectedColumns.includes(columnId);
    const updatedColumns = isSelected
      ? selectedColumns.filter((id) => id !== columnId)
      : [...selectedColumns, columnId];
    onSelectedColumnsChange(updatedColumns);
  };

  const handleClearAll = () => {
    onSelectedColumnsChange([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getColumnLabel = (columnId: ColumnId) => {
    return COLUMNS_OPTIONS.find((col) => col.id === columnId)?.label || columnId;
  };

  return (
    <Box ref={selectRef} sx={{ width: '100%' }}>
      <FormControl sx={{ width: '100%' }}>
        <Paper
          onClick={() => setOpen(!open)}
          elevation={0}
          sx={{
            minHeight: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1,
            border: '1px solid',
            borderRadius: '6px',
            borderColor: open ? COLORS.primary : '#d2d6da',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            boxShadow: 'none',
            flexWrap: 'wrap',
            gap: 0.5,
            transition: 'border-color 0.2s',
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 0.5, flex: 1, overflow: 'hidden', alignItems: 'center' }}>
            {selectedColumns.length > 0 ? (
              <>
                {selectedColumns.slice(0, limit).map((columnId) => (
                  <Box
                    key={columnId}
                    onClick={(event) => handleDeleteTag(event, columnId)}
                    sx={{
                      backgroundColor: COLORS.primaryLight,
                      borderRadius: '5px',
                      padding: '4px 8px',
                      fontSize: 12,
                      color: COLORS.primary,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      '&:hover': {
                        backgroundColor: COLORS.primaryHover,
                      },
                    }}
                  >
                    {getColumnLabel(columnId)}
                    <Box component="span" sx={{ fontSize: 10 }}>✕</Box>
                  </Box>
                ))}
                {selectedColumns.length > limit && (
                  <Typography sx={{ fontSize: 12, color: COLORS.gray[600], flexShrink: 0 }}>
                    +{selectedColumns.length - limit}
                  </Typography>
                )}
              </>
            ) : (
              <Typography sx={{ fontSize: 15, color: COLORS.gray[800] }}>
                Sélectionner les colonnes...
              </Typography>
            )}
          </Box>
          <Box component="span" sx={{ fontSize: 20, color: COLORS.gray[700] }}>
            {!open ? '▼' : '▲'}
          </Box>
        </Paper>

        {open && (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              zIndex: 9999,
              top: 'calc(100% + 3px)',
              left: 0,
              width: '100%',
              borderRadius: 1,
              mt: 1,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ flex: 1, borderBottom: '1px solid', p: '0px 4px' }}>
              <InputBase
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Rechercher une colonne..."
                startAdornment={
                  <Box component="span" sx={{ fontSize: 18, color: 'grey', mr: 1 }}>
                    🔍
                  </Box>
                }
                sx={{ fontSize: 15, fontFamily: 'inherit', lineHeight: 1.15, m: 0 }}
              />
            </Box>
            <MenuList sx={{ maxHeight: 300, overflowY: 'auto', overflowX: 'hidden', p: 0 }}>
              {filteredColumns.map((column) => (
                <MenuItem
                  key={column.id}
                  onClick={() => handleToggleColumn(column.id)}
                  sx={{
                    p: '8px 16px',
                    mb: '2px',
                    borderRadius: 0,
                    cursor: 'pointer',
                    bgcolor: selectedColumns.includes(column.id) ? COLORS.primaryLight : 'transparent',
                    color: selectedColumns.includes(column.id) ? COLORS.primary : 'inherit',
                    fontWeight: selectedColumns.includes(column.id) ? 600 : 400,
                    '&:hover': {
                      bgcolor: '#FFF5F2',
                    },
                  }}
                >
                  {column.label}
                </MenuItem>
              ))}
            </MenuList>
            <Box
              sx={{
                p: '8px 16px',
                borderTop: '1px solid #EEEEEE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box
                component="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                sx={{
                  fontSize: 12,
                  color: COLORS.gray[600],
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  textTransform: 'none',
                  '&:hover': {
                    color: COLORS.primary,
                  },
                }}
              >
                Tout effacer
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.gray[600] }}>
                {selectedColumns.length} / {COLUMNS_OPTIONS.length} sélectionné(s)
              </Typography>
            </Box>
          </Paper>
        )}
      </FormControl>
    </Box>
  );
}

export default ColumnFilters;
