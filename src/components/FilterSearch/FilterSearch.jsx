import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Chip,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Paper,
  TextField,
  InputAdornment,
} from '@mui/material';
import { ExpandMore, Close, Search } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const FilterSearch = ({
  selectedItems = [],
  options = [],
  onItemsChange,
  placeholder = 'Select items',
  isMultiple = true,
  idKey = '_id',
  labelKey = 'name',
  width = 'auto',
}) => {
  const { t } = useTranslation('common');
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery('');
  };

  const handleToggle = (value) => {
    const currentId = value[idKey] || value;
    let newSelectedItems;

    if (isMultiple) {
      newSelectedItems = selectedItems.includes(currentId)
        ? selectedItems.filter((id) => id !== currentId)
        : [...selectedItems, currentId];
    } else {
      newSelectedItems = [currentId];
    }

    onItemsChange(newSelectedItems);
    if (!isMultiple) {
      handleClose();
    }
  };

  const filteredOptions = options.filter((option) => {
    const label = (option[labelKey] || option)?.toString() || '';
    return label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const open = Boolean(anchorEl);
  const id = open ? 'search-popover' : undefined;

  const displayValue =
    selectedItems.length > 0
      ? options
          .filter((option) => selectedItems.includes(option[idKey] || option))
          .map((option) => t(option[labelKey]) || t(option))
          .join(', ')
      : t(placeholder);

  return (
    <Box>
      <Box display="flex" alignItems="center">
        <Chip
          label={displayValue}
          onClick={handleClick}
          onDelete={
            selectedItems.length > 0 ? () => onItemsChange([]) : undefined
          }
          deleteIcon={<Close />}
          variant="outlined"
          sx={{
            width: width,
            maxWidth: width,
            overflow: 'hidden',
            borderRadius: '5px',
            height: 41,
            backgroundColor: 'white !important',
          }}
        />
      </Box>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'white !important',
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <Paper elevation={0}>
          <TextField
            size="small"
            placeholder={`${t('Search')}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            sx={{ p: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <List
            sx={{
              width: '250px',
              maxHeight: 300,
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#00b4b4',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#009292',
              },
            }}
          >
            {filteredOptions.map((option) => (
              <ListItem
                key={option[idKey] || option}
                dense
                button
                onClick={() => handleToggle(option)}
              >
                {isMultiple && (
                  <Checkbox
                    edge="start"
                    checked={selectedItems.includes(option[idKey] || option)}
                    tabIndex={-1}
                    disableRipple
                    className="!text-teal-600 !bg-white"
                  />
                )}
                <ListItemText primary={t(option[labelKey]) || t(option)} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Popover>
    </Box>
  );
};

export default FilterSearch;
