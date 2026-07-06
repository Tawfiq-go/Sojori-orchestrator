import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Popover,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Paper,
  TextField,
  InputAdornment,
  Zoom,
} from '@mui/material';
import { Close, Search, Check } from '@mui/icons-material';

const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryLight: '#FF8F6B',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  hover: 'rgba(255, 107, 53, 0.08)',
  gray: {
    200: '#EEEEEE',
    300: '#E0E0E0',
    600: '#757575',
    700: '#616161',
  },
};


const ChipMultiSelect = ({
  options = [],
  selected = [],
  onChange,
  placeholder = 'Select',
  width = 'auto',
  height = 42,
  borderRadius = 8,
  searchPlaceholder = 'Search...',
  textAlign = 'center',
  t,
}) => {
  const translate = (key) => (typeof t === 'function' ? t(key) : key);

  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState(selected);

  const handleClick = (event) => {
    setTempSelected(selected);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery('');
    setTempSelected(selected);
  };

  const handleToggle = (optionId) => {
    const exists = tempSelected.includes(optionId);
    const next = exists
      ? tempSelected.filter((id) => id !== optionId)
      : [...tempSelected, optionId];
    setTempSelected(next);
  };

  const handleApplyChanges = () => {
    onChange(Array.from(new Set(tempSelected)));
    setAnchorEl(null);
    setSearchQuery('');
  };

  const handleClearTemp = () => {
    setTempSelected([]);
  };

  const filteredOptions = options.filter((option) =>
    (option?.name || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const open = Boolean(anchorEl);
  const id = open ? 'chip-multiselect-popover' : undefined;

  const getChipLabel = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const found = options.find((o) => o.id === selected[0]);
      return found ? found.name : selected[0];
    }
    if (selected.length === 2) {
      const names = selected.map((id) => options.find((o) => o.id === id)?.name || id);
      return `${names[0]}, ${names[1]}`;
    }
    const unit = translate('selected');
    return `${selected.length} ${unit}`;
  };

  useEffect(() => {
    if (!open) {
      setTempSelected(selected);
    }
  }, [selected, open]);

  return (
    <Box>
      <Chip
        label={getChipLabel()}
        onClick={handleClick}
        onDelete={selected.length > 0 ? () => onChange([]) : undefined}
        deleteIcon={selected.length > 0 ? <Close style={{ fontSize: '18px' }} /> : undefined}
        variant="outlined"
        sx={{
          minWidth: { xs: '100%', sm: width },
          maxWidth: { xs: '100%', sm: width },
          width: { xs: '100%', sm: width },
          height: `${height}px`,
          borderRadius: `${borderRadius}px`,
          backgroundColor: 'white',
          transition: 'all 0.2s ease',
          borderColor: selected.length > 0 ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[300],
          borderWidth: selected.length > 0 ? '2px' : '1px',
          justifyContent: textAlign === 'left' ? 'flex-start' : 'center',
          '& .MuiChip-label': {
            fontSize: '13px',
            fontWeight: selected.length > 0 ? 600 : 500,
            color: selected.length > 0 ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.gray[700],
            paddingLeft: textAlign === 'left' ? '8px' : '8px',
            paddingRight: selected.length > 0 ? '8px' : '4px',
            maxWidth: { xs: '100%', sm: '160px' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: textAlign,
            width: '100%',
            display: 'flex',
            justifyContent: textAlign === 'left' ? 'flex-start' : 'center',
            alignItems: 'center',
          },
          '&:hover': {
            borderColor: SOJORI_COLORS.primary,
            backgroundColor: SOJORI_COLORS.primaryPale,
            transform: 'scale(1.02)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          },
          '& .MuiChip-deleteIcon': {
            color: SOJORI_COLORS.primary,
            '&:hover': { color: SOJORI_COLORS.primaryDark },
          },
        }}
      />

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        TransitionComponent={Zoom}
        TransitionProps={{ timeout: 200 }}
        PaperProps={{
          sx: {
            marginTop: '8px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            border: `1px solid ${SOJORI_COLORS.gray[200]}`,
            overflow: 'hidden',
            maxWidth: 'calc(100vw - 40px)',
            maxHeight: 'calc(100vh - 150px)',
          },
        }}
        marginThreshold={20}
        anchorPosition={{ top: 200, left: 400 }}
        anchorReference="anchorEl"
        container={() => document.body}
        disablePortal={false}
        keepMounted={false}
      >
        <Paper elevation={0}>
          <Box sx={{
            padding: '12px 16px',
            borderBottom: `1px solid ${SOJORI_COLORS.gray[200]}`,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
          }}>
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  fontSize: '13px',
                  '&:hover': { '& fieldset': { borderColor: SOJORI_COLORS.primary } },
                  '&.Mui-focused': { '& fieldset': { borderColor: SOJORI_COLORS.primary, borderWidth: '2px' } },
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" style={{ color: SOJORI_COLORS.gray[600] }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box sx={{
              marginTop: '8px',
              fontSize: '11px',
              color: SOJORI_COLORS.gray[600],
              fontWeight: 500,
            }}>
              {tempSelected.length} / {options.length} {translate('selected')}
              {tempSelected.length !== selected.length && (
                <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '10px' }}>
                  ({translate('unsaved')})
                </span>
              )}
            </Box>
          </Box>

          <List sx={{
            width: 260,
            maxHeight: 320,
            overflowY: 'auto',
            padding: '8px',
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { background: SOJORI_COLORS.gray[200], borderRadius: '10px' },
            '&::-webkit-scrollbar-thumb': { background: SOJORI_COLORS.primary, borderRadius: '10px' },
          }}>
            {filteredOptions.length === 0 ? (
              <Box sx={{ padding: '20px', textAlign: 'center', color: SOJORI_COLORS.gray[600], fontSize: '13px' }}>
                {translate('No items found')}
              </Box>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = tempSelected.includes(option.id);
                return (
                  <ListItem
                    key={option.id}
                    dense
                    button
                    onClick={() => handleToggle(option.id)}
                    sx={{
                      borderRadius: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.2s ease',
                      backgroundColor: isSelected ? `${SOJORI_COLORS.primary}15` : 'transparent',
                      '&:hover': { backgroundColor: isSelected ? `${SOJORI_COLORS.primary}25` : SOJORI_COLORS.hover },
                      padding: '8px 12px',
                    }}
                  >
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                      sx={{
                        padding: '4px',
                        marginRight: '8px',
                        color: SOJORI_COLORS.gray[300],
                        '&.Mui-checked': { color: SOJORI_COLORS.primary },
                        '& .MuiSvgIcon-root': { fontSize: '18px' },
                      }}
                    />
                    <ListItemText
                      primary={option.name}
                      primaryTypographyProps={{
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.gray[700],
                      }}
                    />
                    {isSelected && (
                      <Check style={{ fontSize: '16px', color: SOJORI_COLORS.primary, marginLeft: 'auto' }} />
                    )}
                  </ListItem>
                );
              })
            )}
          </List>

          <Box sx={{
            padding: '8px 16px',
            borderTop: `1px solid ${SOJORI_COLORS.gray[200]}`,
            background: 'linear-gradient(180deg, #FAFAFA 0%, #F5F5F5 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <button
              onClick={handleClearTemp}
              style={{
                fontSize: '12px',
                color: SOJORI_COLORS.gray[600],
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = SOJORI_COLORS.hover;
                e.target.style.color = SOJORI_COLORS.primaryDark;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = SOJORI_COLORS.gray[600];
              }}
            >
              {translate('Clear all')}
            </button>

            <button
              onClick={handleApplyChanges}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                background: `linear-gradient(135deg, ${SOJORI_COLORS.primary}, ${SOJORI_COLORS.primaryDark})`,
                border: 'none',
                cursor: 'pointer',
                padding: '6px 16px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
            >
              {translate('Done')}
            </button>
          </Box>
        </Paper>
      </Popover>
    </Box>
  );
};

export default ChipMultiSelect;


