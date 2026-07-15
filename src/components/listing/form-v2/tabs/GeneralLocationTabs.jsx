// ════════════════════════════════════════════════════════════════════
// Sojori · Listing Form V2 — Atelier 2026
// GeneralTab.jsx & LocationTab.jsx — pilotes complets
// Tous les champs sont typés (text / number / select / textarea / toggle
// / counter / chips / multilingue / map). Branche-les dans le `renderTab`
// du ListingFormShell livré précédemment.
// ════════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from 'react';
import {
  DESC_LANG_UI,
  findDescIndexForLang,
  formatListingLocationLine,
  getDescEntryForLang,
} from '../../../../utils/listingFormV2ApiAdapter';
import listingsService from '../../../../services/listingsService';
import ListingLocationMap from '../ListingLocationMap';
import { FieldIndicator } from '../components/FieldIndicator';
import { useListingFormStructure } from '../ListingFormStructureContext';
import { RuFormLegend } from './_shared';
import {
  InfoSectionField,
  LocalizedRowsField,
  rulesListToText,
  textToRulesList,
} from '../utils/ruImportFieldHelpers';
import { createEmptyRoomType } from '../../multi/multiTypes';
import {
  Box, Stack, Typography, TextField, Select, MenuItem, FormControl,
  Switch, IconButton, Chip, Button,
} from '@mui/material';

const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a', primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.08)', aiBorder: 'rgba(124,58,237,0.20)',
  success: '#0a8f5e', warning: '#c46506', error: '#c81e1e', info: '#0673b3',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};

const PROPERTY_TYPE_OPTIONS = ['Villa', 'Appartement', 'Maison', 'Riad', 'Studio', 'Chalet', 'Loft'];

/** Valeurs RU / legacy anglaises → libellés du select français. */
const PROPERTY_TYPE_FROM_API = {
  Apartment: 'Appartement',
  'Vacation home': 'Maison',
  House: 'Maison',
  Home: 'Maison',
  Villa: 'Villa',
  Riad: 'Riad',
  Studio: 'Studio',
  Chalet: 'Chalet',
  Loft: 'Loft',
};

function resolvePropertyTypeSelectValue(raw) {
  if (!raw || typeof raw !== 'string') return 'Villa';
  if (PROPERTY_TYPE_FROM_API[raw]) return PROPERTY_TYPE_FROM_API[raw];
  if (PROPERTY_TYPE_OPTIONS.includes(raw)) return raw;
  return 'Villa';
}

/* ─── Primitives ────────────────────────────────────────────────── */
const sxInput = {
  '& .MuiOutlinedInput-root': {
    fontSize: 13, bgcolor: T.bg1,
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: T.borderStrong },
    '&.Mui-focused fieldset': { borderColor: T.primary, borderWidth: 1.5, boxShadow: '0 0 0 3px rgba(184,133,26,0.16)' },
  },
};
const sxInputAI = {
  '& .MuiOutlinedInput-root': {
    fontSize: 13, bgcolor: T.aiTint,
    '& fieldset': { borderColor: T.aiBorder },
  },
};

function Label({ children, required, ai, charCount, ruField, listingStructure: lsProp, inferRuWhenMissing = false }) {
  const listingStructure = lsProp ?? useListingFormStructure();
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: 10.5,
        color: T.text3,
        fontFamily: '"Geist Mono", monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 700,
        mb: 0.5,
      }}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        {children}
        {required && <Box component="span" sx={{ color: T.error }}>*</Box>}
        {ruField ? (
          <FieldIndicator
            field={ruField}
            listingStructure={listingStructure}
            inferRuWhenMissing={inferRuWhenMissing}
            dense
          />
        ) : null}
      </Box>
      {ai && (
        <Box sx={{ bgcolor: T.aiTint, color: T.ai, px: 0.625, py: '1px', borderRadius: '3px', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.04em' }}>
          ✨ AI
        </Box>
      )}
      {charCount && (
        <Box sx={{ ml: 'auto', fontSize: 9.5, color: T.text3, textTransform: 'none' }}>{charCount}</Box>
      )}
    </Stack>
  );
}

function Field({ label, required, ai, charCount, hint, children, fullWidth, ruField, inferRuWhenMissing }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625, flex: fullWidth ? 1 : 'initial' }}>
      <Label
        required={required}
        ai={ai}
        charCount={charCount}
        ruField={ruField}
        inferRuWhenMissing={inferRuWhenMissing}
      >
        {label}
      </Label>
      {children}
      {hint && <Typography sx={{ fontSize: 10.5, color: T.text4, mt: 0.25 }}>{hint}</Typography>}
    </Box>
  );
}

function Card({ title, meta, children }) {
  return (
    <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, p: 2.25, mb: 1.75 }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1.75 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>{title}</Typography>
        {meta && <Typography sx={{ ml: 'auto', fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>{meta}</Typography>}
      </Stack>
      {children}
    </Box>
  );
}

function Counter({ value, onChange, min = 0, max = 99 }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', border: `1.5px solid ${T.borderStrong}`, borderRadius: 1.2, bgcolor: T.bg1, width: 'fit-content' }}>
      <IconButton size="small" onClick={() => onChange(Math.max(min, value - 1))} sx={{ width: 36, height: 36, color: T.text, fontSize: 18, fontWeight: 700 }}>−</IconButton>
      <Box sx={{ px: 1.75, fontFamily: '"Geist Mono", monospace', fontWeight: 800, fontSize: 15, minWidth: 56, textAlign: 'center', color: T.text }}>{value}</Box>
      <IconButton size="small" onClick={() => onChange(Math.min(max, value + 1))} sx={{ width: 36, height: 36, color: T.text, fontSize: 18, fontWeight: 700 }}>+</IconButton>
    </Stack>
  );
}

function ToggleRow({ title, desc, checked, onChange, ruField }) {
  const listingStructure = useListingFormStructure();
  return (
    <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', py: 1.25, '&:not(:last-child)': { borderBottom: `1px dashed ${T.border}` } }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {title}
          {ruField ? <FieldIndicator field={ruField} listingStructure={listingStructure} dense /> : null}
        </Typography>
        <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.25 }}>{desc}</Typography>
      </Box>
      <Switch checked={checked} onChange={(_, v) => onChange(v)}
        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary }, '& .MuiSwitch-track.Mui-checked, & .Mui-checked + .MuiSwitch-track': { bgcolor: T.primary } }} />
    </Stack>
  );
}

function LangSwitcher({ value, onChange, languages = ['🇫🇷 FR', '🇬🇧 EN', '🇪🇸 ES', '🇮🇹 IT'] }) {
  return (
    <Stack direction="row" spacing={0.625} sx={{ mb: 1.25 }}>
      {languages.map(l => (
        <Box key={l} component="button" onClick={() => onChange(l)} sx={{
          all: 'unset', cursor: 'pointer', px: 1.25, py: 0.625, borderRadius: 0.75,
          border: `1px solid ${T.border}`, bgcolor: value === l ? T.primary : T.bg1,
          color: value === l ? T.text : T.text2, fontSize: 11, fontWeight: 600,
          '&:hover': { borderColor: T.borderStrong },
        }}>{l}</Box>
      ))}
    </Stack>
  );
}

function ChipsRow({ items, value, onToggle }) {
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {items.map(item => {
        const active = value.includes(item.id);
        return (
          <Chip key={item.id} label={item.label} clickable size="small" onClick={() => onToggle(item.id)}
            sx={{
              bgcolor: active ? T.primaryTint : T.bg1,
              color: active ? T.primaryDeep : T.text2,
              border: '1px solid', borderColor: active ? T.primary : T.border,
              fontWeight: active ? 600 : 500, fontSize: 11.5,
              '&:hover': { borderColor: T.borderStrong },
            }} />
        );
      })}
    </Stack>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GeneralTab
   ════════════════════════════════════════════════════════════════════ */
export function GeneralTab({
  values,
  onChange,
  aiFilled = new Set(),
  roomTypeConfigs = [],
}) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const isAI = (k) => aiFilled.has(k);
  const isMulti = values?.propertyUnit === 'Multi';
  const roomTypesList = Array.isArray(values?.roomTypes) ? values.roomTypes : [];
  const multiUnits = roomTypesList.reduce(
    (s, rt) => s + Math.max(0, Number(rt?.roomNumber) || 0),
    0,
  );

  const patchRoomTypeField = (index, patch) => {
    const next = roomTypesList.map((rt, i) => {
      if (i !== index) return { ...rt };
      const merged = { ...rt, ...patch };
      if (patch.roomNumber != null) {
        const roomNumber = Math.max(1, Number(patch.roomNumber) || 1);
        merged.roomNumber = roomNumber;
        const existingRooms = Array.isArray(rt.rooms) ? rt.rooms : [];
        if (existingRooms.length !== roomNumber) {
          const name = String(rt.roomTypeName || `Type ${i + 1}`);
          merged.rooms = Array.from({ length: roomNumber }, (_, ri) => {
            const old = existingRooms[ri] || {};
            return {
              ...old,
              roomNumber: ri + 1,
              roomName: old.roomName || `${name} ${ri + 1}`,
              roomCode: old.roomCode || `RT${i + 1}-${ri + 1}`,
              enabled: old.enabled !== false,
            };
          });
        }
      }
      if (patch.personCapacity != null) {
        const cap = Math.max(1, Number(patch.personCapacity) || 1);
        merged.personCapacity = cap;
        if (
          merged.personCapacityMax == null ||
          Number(merged.personCapacityMax) < cap
        ) {
          merged.personCapacityMax = cap;
        }
      }
      return merged;
    });
    onChange?.({ ...values, roomTypes: next });
  };

  const patchRoomTypeConfig = (configId) => {
    const selected = roomTypeConfigs.find((t) => t._id === configId);
    const roomTypes = Array.isArray(values.roomTypes) ? values.roomTypes.map((rt) => ({ ...rt })) : [{}];
    roomTypes[0] = {
      ...roomTypes[0],
      roomTypeConfigId: configId,
      roomTypeName: selected?.type ?? roomTypes[0]?.roomTypeName,
    };
    onChange?.({ ...values, roomTypeConfigId: configId, roomTypes });
  };

  /** Form roomType row from Multi draft (sans images — gérées dans Photos). */
  const draftToFormRoomType = (draft, ranking) => {
    const roomNumber = Math.max(1, Number(draft.roomNumber) || 1);
    const name = String(draft.roomTypeName || `Type ${ranking + 1}`);
    return {
      roomTypeName: name,
      roomNumber,
      personCapacity: Math.max(1, Number(draft.personCapacity) || 2),
      personCapacityMax: Math.max(
        Number(draft.personCapacity) || 2,
        Number(draft.personCapacityMax) || Number(draft.personCapacity) || 2,
      ),
      bedroomsNumber: Math.max(0, Number(draft.bedroomsNumber) || 1),
      bedsNumber: Math.max(0, Number(draft.bedsNumber) || 1),
      bathroomsNumber: Math.max(0, Number(draft.bathroomsNumber) || 1),
      surface: Number(draft.surface) || 0,
      basePrice: Number(draft.basePrice) || 0,
      roomTypeImages: [],
      rooms: Array.from({ length: roomNumber }, (_, ri) => ({
        roomNumber: ri + 1,
        roomName: `${name} ${ri + 1}`,
        roomCode: `RT${ranking + 1}-${ri + 1}`,
        enabled: true,
      })),
    };
  };

  const addRoomType = () => {
    const draft = createEmptyRoomType({
      roomTypeName: `Type ${roomTypesList.length + 1}`,
      roomNumber: 1,
    });
    onChange?.({
      ...values,
      roomTypes: [...roomTypesList, draftToFormRoomType(draft, roomTypesList.length)],
    });
  };

  const duplicateRoomType = (index) => {
    const src = roomTypesList[index];
    if (!src) return;
    const draft = createEmptyRoomType({
      roomTypeName: `${src.roomTypeName || 'Type'} (copie)`,
      roomNumber: Math.max(1, Number(src.roomNumber) || 1),
      personCapacity: src.personCapacity,
      personCapacityMax: src.personCapacityMax,
      bedroomsNumber: src.bedroomsNumber,
      bedsNumber: src.bedsNumber,
      bathroomsNumber: src.bathroomsNumber,
      surface: src.surface,
      basePrice: src.basePrice,
    });
    const next = [...roomTypesList];
    next.splice(index + 1, 0, draftToFormRoomType(draft, index + 1));
    onChange?.({ ...values, roomTypes: next });
  };

  const removeRoomType = (index) => {
    if (roomTypesList.length <= 1) return;
    onChange?.({
      ...values,
      roomTypes: roomTypesList.filter((_, i) => i !== index),
    });
  };

  const descLang = values._descLang || '🇫🇷 FR';
  const descriptions = useMemo(
    () => (Array.isArray(values.description) ? values.description.map((d) => ({ ...d })) : []),
    [values.description],
  );
  const activeDesc = getDescEntryForLang(descriptions, descLang);

  const setDescLang = (langUi) => {
    const entry = getDescEntryForLang(descriptions, langUi);
    onChange?.({
      ...values,
      _descLang: langUi,
      shortDescription: entry.headline ?? '',
      longDescription: entry.value ?? '',
    });
  };

  const patchActiveDescription = (patch) => {
    const next = descriptions.map((d) => ({ ...d }));
    let idx = findDescIndexForLang(next, descLang);
    if (idx < 0) {
      next.push({
        languageRuId: { '🇫🇷 FR': '4', '🇬🇧 EN': '1', '🇪🇸 ES': '2', '🇮🇹 IT': '3' }[descLang],
        languageId: '',
        headline: '',
        value: '',
      });
      idx = next.length - 1;
    }
    next[idx] = { ...next[idx], ...patch };
    onChange?.({
      ...values,
      description: next,
      shortDescription: patch.headline !== undefined ? patch.headline : values.shortDescription,
      longDescription: patch.value !== undefined ? patch.value : values.longDescription,
    });
  };

  return (
    <Box>
      <RuFormLegend />
      {aiFilled.size > 0 && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            background: `linear-gradient(135deg, rgba(124,58,237,0.06), rgba(184,133,26,0.04))`,
            border: `1px solid ${T.aiBorder}`,
            borderRadius: 1.5,
            p: '12px 14px',
            mb: 1.75,
          }}
        >
          <Box sx={{
            width: 32, height: 32, borderRadius: 1, color: '#fff', fontSize: 14,
            background: `linear-gradient(135deg, #9669f7, ${T.ai})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(124,58,237,0.3)', flexShrink: 0,
          }}>✨</Box>
          <Typography sx={{ flex: 1, fontSize: 12.5, color: T.text2 }}>
            <strong style={{ color: T.text }}>Import Airbnb détecté</strong> · L'IA a pré-rempli {aiFilled.size} champs. Champs en violet pâle = à valider.
          </Typography>
          <Button size="small" sx={{ textTransform: 'none', fontSize: 11.5, bgcolor: T.ai, color: '#fff', '&:hover': { bgcolor: '#6d29d1' } }}>
            Valider tout
          </Button>
        </Stack>
      )}

      <Card title="📌 Informations générales" meta="R = Rentals United">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            gap: 1.75,
          }}
        >
          <Field
            fullWidth
            label="External Listing Name"
            ruField="name"
            charCount={`${(values.name || '').length}/60`}
            hint="Nom visible sur les OTA (RU)."
          >
            <TextField
              size="small"
              fullWidth
              value={values.name || ''}
              onChange={(e) => upd('name', e.target.value)}
              sx={sxInput}
            />
          </Field>

          <Field
            fullWidth
            label="Property Type"
            ruField="propertyType"
            ai={isAI('propertyType')}
          >
            <FormControl size="small" fullWidth>
              <Select
                value={resolvePropertyTypeSelectValue(values.propertyType)}
                onChange={(e) => upd('propertyType', e.target.value)}
                sx={isAI('propertyType') ? sxInputAI['& .MuiOutlinedInput-root'] : sxInput['& .MuiOutlinedInput-root']}
              >
                {PROPERTY_TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Field>

          {roomTypeConfigs.length > 0 && !isMulti && (
            <Field
              fullWidth
              label="Room Type"
              required
              ruField="roomTypeConfigId"
            >
              <FormControl size="small" fullWidth>
                <Select
                  value={values.roomTypeConfigId || values.roomTypes?.[0]?.roomTypeConfigId || ''}
                  onChange={(e) => patchRoomTypeConfig(e.target.value)}
                  displayEmpty
                  sx={sxInput['& .MuiOutlinedInput-root']}
                >
                  <MenuItem value="">Sélectionner…</MenuItem>
                  {roomTypeConfigs.map((rt) => (
                    <MenuItem key={rt._id} value={rt._id}>{rt.type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Field>
          )}

          <Field
            fullWidth
            label="Étage du logement"
            ruField="floor"
          >
            <TextField
              size="small"
              type="number"
              fullWidth
              placeholder="N/A"
              value={values.floor ?? ''}
              onChange={(e) => upd('floor', e.target.value === '' ? null : +e.target.value)}
              sx={sxInput}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Field>

          <Field
            fullWidth
            label="Nombre d'étages (immeuble)"
            ruField="totalFloor"
          >
            <TextField
              size="small"
              type="number"
              fullWidth
              placeholder="N/A"
              value={values.totalFloor ?? ''}
              onChange={(e) => upd('totalFloor', e.target.value === '' ? null : +e.target.value)}
              sx={sxInput}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Field>

          {!isMulti && (
            <Field
              fullWidth
              label="Person Capacity"
              required
              ruField="personCapacity"
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={values.personCapacity ?? ''}
                onChange={(e) => {
                  const n = e.target.value === '' ? undefined : +e.target.value;
                  upd('personCapacity', n);
                }}
                sx={sxInput}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Field>
          )}

          {!isMulti && (
            <Field
              fullWidth
              label="Max Person Capacity"
              ruField="personCapacityMax"
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={values.personCapacityMax ?? values.guests ?? ''}
                onChange={(e) => {
                  const n = e.target.value === '' ? undefined : +e.target.value;
                  onChange?.({ ...values, personCapacityMax: n, guests: n });
                }}
                sx={sxInput}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Field>
          )}

          {!isMulti && (
            <Field
              fullWidth
              label="StandardGuests (RU)"
              ruField="standardGuests"
              hint="RU StandardGuests · capacité « standard » OTA"
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={values.standardGuests ?? ''}
                onChange={(e) =>
                  upd('standardGuests', e.target.value === '' ? undefined : +e.target.value)
                }
                sx={sxInput}
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Field>
          )}

          <Field
            fullWidth
            label="Fuseau horaire"
            ruField="timeZoneName"
            hint="RU timeZoneName"
          >
            <TextField
              size="small"
              fullWidth
              value={values.timeZoneName || ''}
              onChange={(e) => upd('timeZoneName', e.target.value)}
              placeholder="ex: Africa/Casablanca"
              sx={sxInput}
            />
          </Field>

          {!isMulti && (
            <Field
              fullWidth
              label="Surface (m²)"
              ruField="surface"
              ai={isAI('sqm')}
            >
              <TextField
                size="small"
                type="number"
                fullWidth
                value={values.sqm ?? ''}
                onChange={(e) => upd('sqm', e.target.value === '' ? undefined : +e.target.value)}
                sx={isAI('sqm') ? sxInputAI : sxInput}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Field>
          )}
        </Box>

        <Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${T.border}` }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}>
            <Field fullWidth label="Unité de propriété">
              <FormControl size="small" fullWidth>
                <Select value={values.propertyUnit || 'Single'} onChange={(e) => upd('propertyUnit', e.target.value)}>
                  <MenuItem value="Single">Single</MenuItem>
                  <MenuItem value="Multi">Multi-unit</MenuItem>
                </Select>
              </FormControl>
            </Field>
          </Stack>
        </Box>
      </Card>

      {isMulti ? (
        <Card
          title="🛏 Types de chambres"
          meta={`${roomTypesList.length} types · ${multiUnits} unités`}
        >
          <Typography sx={{ fontSize: 12.5, color: T.text2, mb: 1.75, lineHeight: 1.45 }}>
            Ici : <b>nom</b>, <b>stock</b> et <b>capacité</b>. Photos → onglet <b>Photos</b> ·
            Prix → <b>Pricing (par type)</b>. Sur RU : 1 Property par type · U = unités.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {roomTypesList.map((rt, i) => (
              <Box
                key={String(rt._id || rt.roomTypeName || i)}
                sx={{
                  p: 1.75,
                  borderRadius: '12px',
                  border: `1px solid ${T.borderStrong}`,
                  bgcolor: T.bg1,
                  boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1.5 }}
                >
                  <TextField
                    size="small"
                    label="Nom du type"
                    value={rt.roomTypeName || ''}
                    onChange={(e) => patchRoomTypeField(i, { roomTypeName: e.target.value })}
                    sx={{ ...sxInput, flex: 1, minWidth: 180 }}
                  />
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <Chip
                      label={`×${Math.max(1, Number(rt.roomNumber) || 1)}`}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        bgcolor: T.primaryTint,
                        color: T.primaryDeep,
                        border: '1px solid rgba(184,133,26,0.3)',
                      }}
                    />
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => duplicateRoomType(i)}
                      sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0, px: 1 }}
                    >
                      Dupliquer
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      disabled={roomTypesList.length <= 1}
                      onClick={() => removeRoomType(i)}
                      sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0, px: 1 }}
                    >
                      Supprimer
                    </Button>
                  </Stack>
                </Stack>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr 1fr',
                      md: 'repeat(3, 1fr)',
                      lg: 'repeat(6, 1fr)',
                    },
                    gap: 1.5,
                  }}
                >
                  <Field label="Unités (stock)" required ruField="roomNumber">
                    <Counter
                      value={Math.max(1, Number(rt.roomNumber) || 1)}
                      min={1}
                      max={99}
                      onChange={(v) => patchRoomTypeField(i, { roomNumber: v })}
                    />
                  </Field>
                  <Field label="Pers. capacity" required ruField="personCapacity">
                    <Counter
                      value={Math.max(1, Number(rt.personCapacity) || 1)}
                      min={1}
                      max={30}
                      onChange={(v) => patchRoomTypeField(i, { personCapacity: v })}
                    />
                  </Field>
                  <Field label="Pers. max" ruField="personCapacityMax">
                    <Counter
                      value={Math.max(
                        Number(rt.personCapacity) || 1,
                        Number(rt.personCapacityMax) || Number(rt.personCapacity) || 1,
                      )}
                      min={1}
                      max={40}
                      onChange={(v) =>
                        patchRoomTypeField(i, {
                          personCapacityMax: Math.max(v, Number(rt.personCapacity) || 1),
                        })
                      }
                    />
                  </Field>
                  <Field label="Chambres" ruField="bedroomsNumber">
                    <Counter
                      value={Math.max(0, Number(rt.bedroomsNumber) || 0)}
                      min={0}
                      max={20}
                      onChange={(v) => patchRoomTypeField(i, { bedroomsNumber: v })}
                    />
                  </Field>
                  <Field label="Lits" ruField="bedsNumber">
                    <Counter
                      value={Math.max(0, Number(rt.bedsNumber) || 0)}
                      min={0}
                      max={30}
                      onChange={(v) => patchRoomTypeField(i, { bedsNumber: v })}
                    />
                  </Field>
                  <Field label="SDB" ruField="bathroomsNumber">
                    <Counter
                      value={Math.max(0, Number(rt.bathroomsNumber) || 0)}
                      min={0}
                      max={20}
                      onChange={(v) => patchRoomTypeField(i, { bathroomsNumber: v })}
                    />
                  </Field>
                </Box>
                <Box sx={{ mt: 1.5, maxWidth: 180 }}>
                  <Field label="Surface (m²)" ruField="surface">
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={rt.surface ?? ''}
                      onChange={(e) =>
                        patchRoomTypeField(i, {
                          surface: e.target.value === '' ? 0 : +e.target.value,
                        })
                      }
                      sx={sxInput}
                      slotProps={{ htmlInput: { min: 0 } }}
                    />
                  </Field>
                </Box>
              </Box>
            ))}
            {roomTypesList.length === 0 && (
              <Typography sx={{ fontSize: 12.5, color: T.text3 }}>
                Aucun type — cliquez sur « Ajouter un type ».
              </Typography>
            )}
            <Button
              variant="outlined"
              onClick={addRoomType}
              sx={{
                alignSelf: 'flex-start',
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: '10px',
                borderColor: T.borderStrong,
                color: T.primaryDeep,
              }}
            >
              + Ajouter un type
            </Button>
          </Box>
        </Card>
      ) : (
        <Card title="🛏 Chambres & lits">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            <Field label="Chambres" required ruField="bedroomsNumber"><Counter value={values.bedrooms ?? 0} onChange={(v) => upd('bedrooms', v)} /></Field>
            <Field label="Salles de bain" required ruField="bathroomsNumber"><Counter value={values.bathrooms ?? 0} onChange={(v) => upd('bathrooms', v)} /></Field>
            <Field label="Lits" ruField="bedsNumber"><Counter value={values.beds ?? 0} onChange={(v) => upd('beds', v)} /></Field>
          </Box>
        </Card>
      )}

      <Card title="📝 Descriptions" meta={`Multilingue · ${descriptions.length} langue(s)`}>
        <LangSwitcher
          value={descLang}
          onChange={(v) => setDescLang(v)}
          languages={[...DESC_LANG_UI]}
        />
        <Field
          label="Résumé court (headline)"
          ruField="headline"
          inferRuWhenMissing
          charCount={`${(activeDesc.headline ?? values.shortDescription ?? '').length}/140`}
          hint="Titre accrocheur · champ legacy description[].headline"
        >
          <TextField
            size="small"
            multiline
            rows={2}
            fullWidth
            value={activeDesc.headline ?? values.shortDescription ?? ''}
            onChange={(e) =>
              patchActiveDescription({ headline: e.target.value.slice(0, 140) })
            }
            sx={sxInput}
          />
        </Field>
        <Box sx={{ mt: 1.75 }}>
          <Field
            label="Description longue"
            ruField="description"
            inferRuWhenMissing
            ai={isAI('longDescription')}
            hint="Texte principal · champ legacy description[].value"
          >
            <TextField
              size="small"
              multiline
              rows={5}
              fullWidth
              value={activeDesc.value ?? values.longDescription ?? ''}
              onChange={(e) => patchActiveDescription({ value: e.target.value })}
              sx={isAI('longDescription') ? sxInputAI : sxInput}
            />
          </Field>
        </Box>
        <Box sx={{ mt: 1.75 }}>
          <Field
            label="airbnbSummary"
            ruField="airbnbSummary"
            charCount="spécifique Airbnb"
            hint="Optionnel · remplace la description courte sur Airbnb (Sojori / channel manager)"
          >
            <TextField size="small" multiline rows={2} fullWidth placeholder="Optionnel · remplace la description courte sur Airbnb" value={values.airbnbSummary || ''} onChange={e => upd('airbnbSummary', e.target.value)} sx={sxInput} />
          </Field>
        </Box>
      </Card>

      <Card title="📋 Règles du séjour (RU)" meta="houseRule · note · rulesAndInfo">
        <InfoSectionField
          label="Règlement intérieur (houseRule)"
          ruField="houseRule"
          value={values.houseRule}
          onChange={(v) => upd('houseRule', v)}
          minRows={3}
        />
        <Box sx={{ mt: 1.5 }}>
          <InfoSectionField
            label="Notes voyageurs (note)"
            ruField="note"
            value={values.note}
            onChange={(v) => upd('note', v)}
            minRows={2}
          />
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <Field
            label="Règles structurées (rulesAndInfo.Rules)"
            ruField="houseRule"
            fullWidth
            hint="Import RU · une ligne = une règle"
          >
            <TextField
              size="small"
              multiline
              rows={3}
              fullWidth
              value={rulesListToText(values.rulesAndInfo, 'Rules')}
              onChange={(e) =>
                onChange?.({
                  ...values,
                  rulesAndInfo: {
                    ...(values.rulesAndInfo && typeof values.rulesAndInfo === 'object' ? values.rulesAndInfo : {}),
                    Rules: textToRulesList(e.target.value),
                  },
                })
              }
              sx={sxInput}
            />
          </Field>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <Field label="Infos utiles (rulesAndInfo.InfoUtils)" ruField="note" fullWidth>
            <TextField
              size="small"
              multiline
              rows={3}
              fullWidth
              value={rulesListToText(values.rulesAndInfo, 'InfoUtils')}
              onChange={(e) =>
                onChange?.({
                  ...values,
                  rulesAndInfo: {
                    ...(values.rulesAndInfo && typeof values.rulesAndInfo === 'object' ? values.rulesAndInfo : {}),
                    InfoUtils: textToRulesList(e.target.value),
                  },
                })
              }
              sx={sxInput}
            />
          </Field>
        </Box>
      </Card>

      <Card title="⚙️ Statut & visibilité">
        <ToggleRow
          title="Listing actif"
          ruField="active"
          desc="Visible sur tous les canaux. Décocher pour masquer partout en 1 clic."
          checked={values.active !== false}
          onChange={(v) => upd('active', v)}
        />
      </Card>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LocationTab — aligné legacy dashboard Address.jsx
   ════════════════════════════════════════════════════════════════════ */
export function LocationTab({ values, onChange }) {
  const [cities, setCities] = useState([]);
  const [rentalsMapping, setRentalsMapping] = useState(null);
  const [mapKey, setMapKey] = useState(0);

  const ownerId =
    values.ownerId ||
    (values.owner && typeof values.owner === 'object' ? values.owner._id : null);

  const patch = (partial) => {
    const next = { ...values, ...partial };
    if ('city' in partial || 'country' in partial) {
      next.locationLine = formatListingLocationLine({
        city: next.city,
        country: next.country,
      });
    }
    onChange?.(next);
  };

  const upd = (k, v) => patch({ [k]: v });

  const setCoords = ({ lat, lng }) => patch({ lat, lng });

  const parseCoord = (raw) => {
    if (raw === '' || raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  useEffect(() => {
    let cancelled = false;
    listingsService.getCities({ allCities: true, limit: 2000 }).then((rows) => {
      if (!cancelled) setCities(rows || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ownerId) {
      setRentalsMapping(null);
      return undefined;
    }
    let cancelled = false;
    listingsService.getRentalsCitiesCurrencyMapping(String(ownerId)).then((data) => {
      if (!cancelled) setRentalsMapping(data);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  useEffect(() => {
    const cityId = values.cityId;
    const city = values.city;
    if (!cityId || !city || !rentalsMapping?.hasMapping) return;
    const row = (rentalsMapping.rentalsCitiesAndCurrencyMapping || []).find(
      (m) => m.cityId === cityId || m.cityName === city,
    );
    if (row?.currency && row.currency !== values.currencyCode) {
      patch({ currencyCode: row.currency });
    }
  }, [values.cityId, values.city, rentalsMapping]);

  const citySelectValue =
    values.city && cities.some((c) => c.name === values.city) ? values.city : '';

  return (
    <Box>
      <RuFormLegend />
      <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1.5 }}>
        Carte OpenStreetMap — cliquez ou déplacez le pin pour définir lat/lng (comme le dashboard legacy).
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.25, mb: 1.75 }}>
        <Card title="🌍 Région & ville">
          <Field label="État / région" ruField="state">
            <TextField
              size="small"
              fullWidth
              value={values.state || ''}
              onChange={(e) => upd('state', e.target.value)}
              sx={sxInput}
            />
          </Field>
          <Box sx={{ mt: 1.5 }}>
            <Field label="Ville" required ruField="city">
              <FormControl size="small" fullWidth>
                <Select
                  displayEmpty
                  value={citySelectValue}
                  onChange={(e) => {
                    const name = e.target.value;
                    const selected = cities.find((c) => c.name === name);
                    patch({
                      city: name,
                      cityId: selected?._id || '',
                    });
                  }}
                  sx={sxInput}
                >
                  <MenuItem value="" disabled>
                    <em>Sélectionner une ville</em>
                  </MenuItem>
                  {cities.map((c) => (
                    <MenuItem key={c._id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Field>
          </Box>
        </Card>

        <Card title="📍 Rue & détails">
          <Field label="Adresse" required ruField="address">
            <TextField
              size="small"
              fullWidth
              value={values.address || ''}
              onChange={(e) => upd('address', e.target.value)}
              sx={sxInput}
            />
          </Field>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
            <Field label="Code postal" ruField="zipcode">
              <TextField
                size="small"
                fullWidth
                value={values.zipcode || ''}
                onChange={(e) => upd('zipcode', e.target.value)}
                sx={sxInput}
              />
            </Field>
            <Field label="Place / zone" ruField="place">
              <TextField
                size="small"
                fullWidth
                value={values.place || ''}
                onChange={(e) => upd('place', e.target.value)}
                sx={sxInput}
              />
            </Field>
            <Field label="Pays" ruField="country">
              <TextField
                size="small"
                fullWidth
                value={values.country || ''}
                onChange={(e) => upd('country', e.target.value)}
                sx={sxInput}
              />
            </Field>
          </Box>
        </Card>
      </Box>

      <Card title="🗺 Carte" meta="OpenStreetMap">
        <Box
          sx={{
            height: 300,
            borderRadius: 1,
            overflow: 'hidden',
            border: `1px solid ${T.border}`,
          }}
        >
          <ListingLocationMap
            key={mapKey}
            lat={values.lat}
            lng={values.lng}
            height={300}
            onCoordsChange={setCoords}
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setMapKey((k) => k + 1)}
            sx={{ textTransform: 'none', fontSize: 11.5, borderColor: T.border, color: T.text2 }}
          >
            Rafraîchir la carte
          </Button>
          {values.lat && values.lng ? (
            <Typography sx={{ fontSize: 11, color: T.text3, alignSelf: 'center', fontFamily: '"Geist Mono", monospace' }}>
              {Number(values.lat).toFixed(5)}, {Number(values.lng).toFixed(5)}
            </Typography>
          ) : null}
        </Stack>
      </Card>

      <Card title="🎯 Coordonnées GPS" meta="Saisie manuelle ou via la carte">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <Field label="Latitude" required ruField="lat">
            <TextField
              size="small"
              type="number"
              slotProps={{ htmlInput: { step: 0.0001 } }}
              value={values.lat ?? ''}
              onChange={(e) => {
                const n = parseCoord(e.target.value);
                if (n != null) upd('lat', n);
              }}
              sx={sxInput}
            />
          </Field>
          <Field label="Longitude" required ruField="lng">
            <TextField
              size="small"
              type="number"
              slotProps={{ htmlInput: { step: 0.0001 } }}
              value={values.lng ?? ''}
              onChange={(e) => {
                const n = parseCoord(e.target.value);
                if (n != null) upd('lng', n);
              }}
              sx={sxInput}
            />
          </Field>
        </Box>
      </Card>

      <Card title="🧭 Quartier & environnement">
        <LocalizedRowsField
          label="Description du quartier"
          ruField="zoneDescription"
          value={values.zoneDescription}
          onChange={(v) => upd('zoneDescription', v)}
          minRows={3}
        />
        <Box sx={{ mt: 1.5 }}>
          <InfoSectionField
            label="Quartier / voisinage"
            ruField="center"
            value={values.center}
            onChange={(v) => upd('center', v)}
            minRows={2}
          />
        </Box>
      </Card>
    </Box>
  );
}

export default { GeneralTab, LocationTab };
