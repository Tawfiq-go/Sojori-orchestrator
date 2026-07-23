import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
  Stack,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import { translateGuestLangs } from '../../setting/services/serverApi.adminConfig';

/** Guest WhatsApp languages — keep in sync with srv-fullchatbot GuestIso. */
export const GUEST_LANG_FIELDS = [
  { key: 'fr', label: 'Français', short: 'FR' },
  { key: 'en', label: 'English', short: 'EN' },
  { key: 'es', label: 'Español', short: 'ES' },
  { key: 'de', label: 'Deutsch', short: 'DE' },
  { key: 'it', label: 'Italiano', short: 'IT' },
  { key: 'ar', label: 'العربية', short: 'AR' },
  { key: 'ary', label: 'Darija', short: 'DAR' },
];

const NON_FR_LANGS = GUEST_LANG_FIELDS.filter((l) => l.key !== 'fr');
const CACHE_PREFIX = 'sojori:guestLangI18n:v1:';

export function emptyGuestLangMap(fill = '') {
  return Object.fromEntries(GUEST_LANG_FIELDS.map((l) => [l.key, fill]));
}

/** Merge API / partial objects into a full lang map (never drops unknown keys silently). */
export function mergeGuestLangMap(existing, fallbackFr = '') {
  const base = emptyGuestLangMap('');
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    for (const { key } of GUEST_LANG_FIELDS) {
      if (existing[key] != null && String(existing[key]).trim() !== '') {
        base[key] = String(existing[key]);
      }
    }
  }
  if (!base.fr && fallbackFr) base.fr = String(fallbackFr);
  return base;
}

/**
 * Drop empty strings before save (API often prefers sparse objects).
 * Always keep `fr` if provided (even empty string becomes omitted).
 */
export function cleanGuestLangMap(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const { key } of GUEST_LANG_FIELDS) {
    const v = obj[key];
    if (v != null && String(v).trim() !== '') out[key] = String(v).trim();
  }
  return out;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
  return String(h);
}

function cacheKey(fr, targets) {
  return `${CACHE_PREFIX}${simpleHash(fr)}:${[...targets].sort().join(',')}`;
}

function readCache(fr, targets) {
  try {
    const raw = sessionStorage.getItem(cacheKey(fr, targets));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(fr, targets, translations) {
  try {
    sessionStorage.setItem(cacheKey(fr, targets), JSON.stringify(translations));
  } catch {
    /* ignore quota */
  }
}

/** Empty or stamped FR copy → needs AI translation. */
export function langNeedsTranslation(key, map, frText) {
  if (key === 'fr') return false;
  const fr = String(frText || '').trim();
  const v = String(map?.[key] || '').trim();
  if (!v) return true;
  if (fr && v === fr) return true;
  return false;
}

function missingTargetKeys(map) {
  const fr = String(map?.fr || '').trim();
  if (!fr) return [];
  return NON_FR_LANGS.map((l) => l.key).filter((k) => langNeedsTranslation(k, map, fr));
}

function defaultActiveKeys(map) {
  const keys = ['en'];
  for (const { key } of NON_FR_LANGS) {
    if (key === 'en') continue;
    const v = String(map?.[key] || '').trim();
    if (v && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * Multilingual text for owner templates / orchestration.
 * FR always visible + one other language with arrows / add-language.
 * Optional Claude Haiku generate + auto-fill when missing.
 */
export function GuestLangTextFields({
  fieldLabel,
  value,
  onChange,
  multiline = false,
  rows = 2,
  requiredFr = false,
  maxLength,
  helperText,
  dense = false,
  /** Show sparkles “Générer” (default true). */
  showAiGenerate = true,
  /** On mount/open: translate missing langs from FR (catalog services). */
  autoFillMissing = false,
}) {
  const map = mergeGuestLangMap(value);
  const frText = String(map.fr || '').trim();

  const [activeKeys, setActiveKeys] = useState(() => defaultActiveKeys(map));
  const [secondaryKey, setSecondaryKey] = useState(() => defaultActiveKeys(map)[0] || 'en');
  const [addAnchor, setAddAnchor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /** Auto-fill runs once per mount (when panel opens), not on every FR keystroke. */
  const autoFillStartedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Keep secondary in sync when parent loads new values with extra langs.
  useEffect(() => {
    setActiveKeys((prev) => {
      const next = [...prev];
      let changed = false;
      for (const { key } of NON_FR_LANGS) {
        const v = String(map[key] || '').trim();
        if (v && !next.includes(key)) {
          next.push(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [value]);

  useEffect(() => {
    if (!activeKeys.includes(secondaryKey)) {
      setSecondaryKey(activeKeys[0] || 'en');
    }
  }, [activeKeys, secondaryKey]);

  const secondaryMeta = useMemo(
    () => GUEST_LANG_FIELDS.find((l) => l.key === secondaryKey) || NON_FR_LANGS[0],
    [secondaryKey],
  );

  const secondaryIndex = Math.max(0, activeKeys.indexOf(secondaryKey));

  const goPrev = () => {
    if (activeKeys.length < 2) return;
    const i = (secondaryIndex - 1 + activeKeys.length) % activeKeys.length;
    setSecondaryKey(activeKeys[i]);
  };

  const goNext = () => {
    if (activeKeys.length < 2) return;
    const i = (secondaryIndex + 1) % activeKeys.length;
    setSecondaryKey(activeKeys[i]);
  };

  const addableLangs = NON_FR_LANGS.filter((l) => !activeKeys.includes(l.key));

  const applyTranslations = useCallback(
    (translations) => {
      if (!translations || typeof translations !== 'object') return map;
      const next = { ...map };
      for (const { key } of NON_FR_LANGS) {
        const t = translations[key];
        if (typeof t === 'string' && t.trim()) next[key] = t.trim();
      }
      onChangeRef.current(next);
      return next;
    },
    [map],
  );

  const runTranslate = useCallback(
    async ({ silent = false } = {}) => {
      const fr = String(map.fr || '').trim();
      if (!fr) {
        if (!silent) setError('Remplissez d’abord le français.');
        return;
      }
      const targets = missingTargetKeys(map);
      if (targets.length === 0) {
        if (!silent) setError('');
        return;
      }

      const cached = readCache(fr, targets);
      if (cached) {
        applyTranslations(cached);
        setError('');
        return;
      }

      setLoading(true);
      if (!silent) setError('');
      try {
        const res = await translateGuestLangs({ text: fr, targetLangs: targets, sourceLang: 'fr' });
        const translations = res?.data?.translations || {};
        if (!translations || Object.keys(translations).length === 0) {
          if (!silent) setError('Traduction indisponible. Réessayez.');
          return;
        }
        writeCache(fr, targets, translations);
        const next = applyTranslations(translations);
        // Ensure translated langs appear in the navigator.
        setActiveKeys((prev) => {
          const merged = [...prev];
          for (const k of Object.keys(translations)) {
            if (NON_FR_LANGS.some((l) => l.key === k) && !merged.includes(k)) merged.push(k);
          }
          return merged;
        });
        return next;
      } catch (e) {
        if (!silent) setError(e?.response?.data?.error || 'Échec de la traduction AI.');
      } finally {
        setLoading(false);
      }
    },
    [map, applyTranslations],
  );

  // Auto-fill missing langs once when the panel opens (catalog / existing services).
  useEffect(() => {
    if (!autoFillMissing || !showAiGenerate || autoFillStartedRef.current) return;
    const fr = String(map.fr || '').trim();
    if (!fr) return;
    const targets = missingTargetKeys(map);
    if (targets.length === 0) {
      autoFillStartedRef.current = true;
      return;
    }
    autoFillStartedRef.current = true;
    void runTranslate({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when FR is first available
  }, [autoFillMissing, showAiGenerate, map.fr]);

  const fieldSx = dense
    ? { '& .MuiInputBase-input': { fontSize: 13, py: 0.75 } }
    : undefined;

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: helperText || error ? 0.5 : 1, gap: 1 }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
          {fieldLabel}
        </Typography>
        {showAiGenerate ? (
          <Tooltip title="Générer les traductions (à partir du français)">
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={loading || !frText}
                onClick={() => void runTranslate({ silent: false })}
                aria-label="Générer les traductions"
              >
                {loading ? (
                  <CircularProgress size={16} />
                ) : (
                  <AutoAwesomeOutlinedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
      </Stack>

      {helperText ? (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>{helperText}</Typography>
      ) : null}
      {error ? (
        <Typography sx={{ fontSize: 11, color: 'error.main', mb: 1 }}>{error}</Typography>
      ) : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <TextField
          size="small"
          fullWidth
          label={`${fieldLabel} (Français)${requiredFr ? ' *' : ''}`}
          value={map.fr || ''}
          required={requiredFr}
          multiline={multiline}
          rows={multiline ? rows : undefined}
          inputProps={maxLength ? { maxLength } : undefined}
          sx={fieldSx}
          onChange={(e) => onChange({ ...map, fr: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexWrap: 'wrap',
          }}
        >
          <Tooltip title="Langue précédente">
            <span>
              <IconButton size="small" onClick={goPrev} disabled={activeKeys.length < 2}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {activeKeys.map((key) => {
            const meta = GUEST_LANG_FIELDS.find((l) => l.key === key);
            const filled = String(map[key] || '').trim() && !langNeedsTranslation(key, map, frText);
            return (
              <Chip
                key={key}
                size="small"
                label={meta?.short || key.toUpperCase()}
                color={key === secondaryKey ? 'primary' : 'default'}
                variant={key === secondaryKey ? 'filled' : 'outlined'}
                onClick={() => setSecondaryKey(key)}
                sx={{
                  height: 24,
                  fontSize: 11,
                  opacity: filled ? 1 : 0.7,
                }}
              />
            );
          })}

          <Tooltip title="Langue suivante">
            <span>
              <IconButton size="small" onClick={goNext} disabled={activeKeys.length < 2}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {addableLangs.length > 0 ? (
            <>
              <Tooltip title="Ajouter une langue">
                <IconButton size="small" onClick={(e) => setAddAnchor(e.currentTarget)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={addAnchor}
                open={Boolean(addAnchor)}
                onClose={() => setAddAnchor(null)}
              >
                {addableLangs.map((l) => (
                  <MenuItem
                    key={l.key}
                    onClick={() => {
                      setActiveKeys((prev) => [...prev, l.key]);
                      setSecondaryKey(l.key);
                      setAddAnchor(null);
                    }}
                  >
                    {l.label} ({l.short})
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : null}
        </Box>

        <TextField
          size="small"
          fullWidth
          label={`${fieldLabel} (${secondaryMeta.label})`}
          value={map[secondaryKey] || ''}
          multiline={multiline}
          rows={multiline ? rows : undefined}
          inputProps={{
            ...(maxLength ? { maxLength } : {}),
            dir: secondaryKey === 'ar' ? 'rtl' : 'ltr',
          }}
          sx={fieldSx}
          onChange={(e) => onChange({ ...map, [secondaryKey]: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          helperText={
            langNeedsTranslation(secondaryKey, map, frText)
              ? 'Vide ou copie FR — utilisez ✨ Générer ou saisissez'
              : undefined
          }
        />
      </Box>
    </Box>
  );
}

export default GuestLangTextFields;
