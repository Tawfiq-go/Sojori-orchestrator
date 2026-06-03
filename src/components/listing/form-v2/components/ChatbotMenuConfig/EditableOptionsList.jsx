import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import MenuOptionCard from './MenuOptionCard';
import { T, menuBtnPrimary, menuBtnOutlined } from './menuTheme';
import { MENU_DISPLAY_ORDER, ensureMenuOptionsComplete } from './menuDefaults';
import { normalizeMenuOptionsList } from './menuAvailabilityNormalize';

const EditableOptionsList = ({
  menuOptions = [],
  inheritedMenuOptions = [],
  onSave,
  isSaving = false,
  /** overrides = diffs pour listing-chatbot-config ; full = menu complet pour template owner/admin */
  persistMode = 'overrides',
  onSaveStateChange,
}) => {
  const [localOptions, setLocalOptions] = useState(menuOptions);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const saveTimer = useRef(null);
  const skipAutoSave = useRef(true);

  const baseOptions = ensureMenuOptionsComplete(
    inheritedMenuOptions.length > 0 ? inheritedMenuOptions : menuOptions,
  );

  useEffect(() => {
    setLocalOptions(normalizeMenuOptionsList(ensureMenuOptionsComplete(menuOptions)));
    setIsDirty(false);
    setSaveError(null);
    skipAutoSave.current = true;
    const t = window.setTimeout(() => {
      skipAutoSave.current = false;
    }, 400);
    return () => window.clearTimeout(t);
  }, [menuOptions]);

  const persist = useCallback(
    async (optionsToSave, { silent = false } = {}) => {
      setSaveError(null);
      const payload =
        persistMode === 'full' ? normalizeMenuOptionsList(optionsToSave) : optionsToSave;
      try {
        await onSave(payload, { silent });
        setIsDirty(false);
        onSaveStateChange?.('saved');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Enregistrement impossible';
        setSaveError(msg);
        onSaveStateChange?.('error');
        throw e;
      }
    },
    [onSave, persistMode, onSaveStateChange],
  );

  const handleSave = useCallback(async () => {
    if (persistMode === 'full') {
      await persist(localOptions, { silent: false });
      return;
    }
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
      const normLocal = normalizeMenuOptionsList([option])[0]?.availability;
      const normOrig = normalizeMenuOptionsList([original])[0]?.availability;
      if (JSON.stringify(normLocal) !== JSON.stringify(normOrig)) {
        override.availability = normLocal;
        hasChanges = true;
      }
      if (hasChanges) changes.push({ code: option.code, ...override });
    });
    await persist(changes);
  }, [persistMode, localOptions, baseOptions, persist]);

  const scheduleAutoSave = useCallback(
    (nextOptions) => {
      if (persistMode !== 'full' || skipAutoSave.current || isSaving) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void persist(nextOptions, { silent: true }).catch(() => {});
      }, 900);
    },
    [persistMode, isSaving, persist],
  );

  const handleOptionChange = (code, updatedOption) => {
    setLocalOptions((prev) => {
      const next = prev.map((option) => (option.code === code ? updatedOption : option));
      setIsDirty(true);
      onSaveStateChange?.('dirty');
      scheduleAutoSave(next);
      return next;
    });
  };

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

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
        {isSaving ? (
          <Typography sx={{ fontSize: 12, color: T.info, fontWeight: 600 }}>Enregistrement…</Typography>
        ) : isDirty ? (
          <Typography sx={{ fontSize: 12, color: T.info, fontWeight: 600 }}>
            {persistMode === 'full' ? 'Modification en cours (auto-save)' : 'Modifications non enregistrées'}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 12, color: T.text3 }}>Enregistré</Typography>
        )}
        <Stack direction="row" spacing={1}>
          {isDirty && persistMode !== 'full' && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setLocalOptions(normalizeMenuOptionsList(ensureMenuOptionsComplete(menuOptions)));
                setIsDirty(false);
                setSaveError(null);
              }}
              disabled={isSaving}
              sx={menuBtnOutlined}
            >
              Annuler
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleSave()}
            disabled={(persistMode !== 'full' && !isDirty) || isSaving}
            sx={menuBtnPrimary}
          >
            {isSaving ? 'Enregistrement…' : 'Enregistrer maintenant'}
          </Button>
        </Stack>
      </Stack>

      {saveError && (
        <Alert severity="error" sx={{ mb: 1.5, fontSize: 12.5, py: 0.5 }}>
          {saveError}
        </Alert>
      )}

      {isDirty && persistMode === 'full' && (
        <Alert severity="info" sx={{ mb: 1.5, fontSize: 12.5, py: 0.5 }}>
          Sauvegarde automatique ~1 s après modification (template Admin/PM). Ou cliquez « Enregistrer maintenant ».
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
