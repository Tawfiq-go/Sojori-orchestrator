import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import MenuOptionCard from './MenuOptionCard';
import { T, menuBtnPrimary, menuBtnOutlined } from './menuTheme';

const MENU_DISPLAY_ORDER = ['A', 'B', 'C', 'D', 'D1', 'D2', 'D3', 'D4', 'E', 'F', 'G', 'H', 'I', 'J', 'J1', 'J2', 'J3', 'K'];

const EditableOptionsList = ({
  menuOptions = [],
  inheritedMenuOptions = [],
  onSave,
  isSaving = false,
}) => {
  const [localOptions, setLocalOptions] = useState(menuOptions);
  const [isDirty, setIsDirty] = useState(false);
  const baseOptions = inheritedMenuOptions.length > 0 ? inheritedMenuOptions : menuOptions;

  useEffect(() => {
    setLocalOptions(menuOptions);
    setIsDirty(false);
  }, [menuOptions]);

  const handleOptionChange = (code, updatedOption) => {
    setLocalOptions((prev) => prev.map((option) => (option.code === code ? updatedOption : option)));
    setIsDirty(true);
  };

  const handleSave = () => {
    const changes = [];
    localOptions.forEach((option) => {
      const original = baseOptions.find((o) => o.code === option.code);
      if (!original) return;
      const override = {};
      let hasChanges = false;
      if (option.enabled !== original.enabled) {
        override.enabled = option.enabled;
        hasChanges = true;
      }
      if (JSON.stringify(option.availability) !== JSON.stringify(original.availability)) {
        override.availability = option.availability;
        hasChanges = true;
      }
      if (hasChanges) changes.push({ code: option.code, ...override });
    });
    onSave(changes);
    setIsDirty(false);
  };

  if (!localOptions.length) {
    return (
      <Box sx={{ p: 3, borderRadius: 1.25, border: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
        <Typography sx={{ fontSize: 13, color: T.text3 }}>Aucune option disponible pour le moment.</Typography>
      </Box>
    );
  }

  const byCode = localOptions.reduce((acc, o) => {
    acc[o.code] = o;
    return acc;
  }, {});
  const optionsInOrder = MENU_DISPLAY_ORDER.map((code) => byCode[code]).filter(Boolean);
  const extra = localOptions.filter((o) => !MENU_DISPLAY_ORDER.includes(o.code));

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          py: 1,
          mb: 1.5,
          bgcolor: T.bg1,
          borderBottom: `1px solid ${T.border}`,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        {isDirty ? (
          <Typography sx={{ fontSize: 12, color: T.info, fontWeight: 600 }}>Modifications non enregistrées</Typography>
        ) : (
          <Box />
        )}
        <Stack direction="row" spacing={1}>
          {isDirty && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setLocalOptions(menuOptions);
                setIsDirty(false);
              }}
              disabled={isSaving}
              sx={menuBtnOutlined}
            >
              Annuler
            </Button>
          )}
          <Button variant="contained" size="small" onClick={handleSave} disabled={!isDirty || isSaving} sx={menuBtnPrimary}>
            {isSaving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </Stack>
      </Stack>

      {isDirty && (
        <Alert severity="info" sx={{ mb: 1.5, fontSize: 12.5, py: 0.5 }}>
          Cliquez sur &quot;Enregistrer les modifications&quot; pour appliquer les changements au menu voyageur.
        </Alert>
      )}

      <Stack spacing={1} sx={{ pb: 1 }}>
        {optionsInOrder.map((option) => (
          <MenuOptionCard
            key={option.code}
            option={option}
            onChange={(updated) => handleOptionChange(option.code, updated)}
          />
        ))}
        {extra.map((option) => (
          <MenuOptionCard
            key={option.code}
            option={option}
            onChange={(updated) => handleOptionChange(option.code, updated)}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default EditableOptionsList;
