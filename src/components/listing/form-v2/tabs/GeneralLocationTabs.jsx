// ════════════════════════════════════════════════════════════════════
// Sojori · Listing Form V2 — Atelier 2026
// GeneralTab.jsx & LocationTab.jsx — pilotes complets
// Tous les champs sont typés (text / number / select / textarea / toggle
// / counter / chips / multilingue / map). Branche-les dans le `renderTab`
// du ListingFormShell livré précédemment.
// ════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import {
  DESC_LANG_UI,
  findDescIndexForLang,
  getDescEntryForLang,
} from '../../../../utils/listingFormV2ApiAdapter';
import { FieldIndicator } from '../components/FieldIndicator';
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

function Label({ children, required, ai, charCount, ruField, listingStructure }) {
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
        {ruField && listingStructure ? (
          <FieldIndicator field={ruField} listingStructure={listingStructure} dense />
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

function Field({ label, required, ai, charCount, hint, children, fullWidth, ruField, listingStructure }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625, flex: fullWidth ? 1 : 'initial' }}>
      <Label
        required={required}
        ai={ai}
        charCount={charCount}
        ruField={ruField}
        listingStructure={listingStructure}
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
    <Stack direction="row" sx={{ alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg1, width: 'fit-content' }}>
      <IconButton size="small" onClick={() => onChange(Math.max(min, value - 1))} sx={{ width: 32, height: 32, color: T.text2 }}>−</IconButton>
      <Box sx={{ px: 1.75, fontFamily: '"Geist Mono", monospace', fontWeight: 700, fontSize: 13, minWidth: 50, textAlign: 'center' }}>{value}</Box>
      <IconButton size="small" onClick={() => onChange(Math.min(max, value + 1))} sx={{ width: 32, height: 32, color: T.text2 }}>+</IconButton>
    </Stack>
  );
}

function ToggleRow({ title, desc, checked, onChange }) {
  return (
    <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', py: 1.25, '&:not(:last-child)': { borderBottom: `1px dashed ${T.border}` } }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{title}</Typography>
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
  listingStructure = null,
  roomTypeConfigs = [],
}) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const isAI = (k) => aiFilled.has(k);

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
            listingStructure={listingStructure}
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
            listingStructure={listingStructure}
            ai={isAI('propertyType')}
          >
            <FormControl size="small" fullWidth>
              <Select
                value={values.propertyType === 'Apartment' ? 'Appartement' : (values.propertyType || 'Villa')}
                onChange={(e) => upd('propertyType', e.target.value)}
                sx={isAI('propertyType') ? sxInputAI['& .MuiOutlinedInput-root'] : sxInput['& .MuiOutlinedInput-root']}
              >
                {['Villa', 'Appartement', 'Maison', 'Riad', 'Studio', 'Chalet', 'Loft'].map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Field>

          {roomTypeConfigs.length > 0 && (
            <Field
              fullWidth
              label="Room Type"
              required
              ruField="roomTypeConfigId"
              listingStructure={listingStructure}
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
            label="number of floors"
            ruField="floor"
            listingStructure={listingStructure}
          >
            <TextField
              size="small"
              type="number"
              fullWidth
              value={values.floor ?? ''}
              onChange={(e) => upd('floor', e.target.value === '' ? undefined : +e.target.value)}
              sx={sxInput}
              inputProps={{ min: 0 }}
            />
          </Field>

          <Field
            fullWidth
            label="Total Floors"
            ruField="totalFloor"
            listingStructure={listingStructure}
          >
            <TextField
              size="small"
              type="number"
              fullWidth
              value={values.totalFloor ?? ''}
              onChange={(e) => upd('totalFloor', e.target.value === '' ? undefined : +e.target.value)}
              sx={sxInput}
              inputProps={{ min: 1 }}
            />
          </Field>

          <Field
            fullWidth
            label="Person Capacity"
            required
            ruField="personCapacity"
            listingStructure={listingStructure}
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
              inputProps={{ min: 0 }}
            />
          </Field>

          <Field
            fullWidth
            label="Max Person Capacity"
            ruField="personCapacityMax"
            listingStructure={listingStructure}
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
              inputProps={{ min: 0 }}
            />
          </Field>

          <Field
            fullWidth
            label="Surface (m²)"
            ruField="surface"
            listingStructure={listingStructure}
            ai={isAI('sqm')}
          >
            <TextField
              size="small"
              type="number"
              fullWidth
              value={values.sqm ?? ''}
              onChange={(e) => upd('sqm', e.target.value === '' ? undefined : +e.target.value)}
              sx={isAI('sqm') ? sxInputAI : sxInput}
              inputProps={{ min: 0 }}
            />
          </Field>
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

      <Card title="🛏 Chambres & lits">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          <Field label="Chambres" required><Counter value={values.bedrooms ?? 0} onChange={(v) => upd('bedrooms', v)} /></Field>
          <Field label="Salles de bain" required><Counter value={values.bathrooms ?? 0} onChange={(v) => upd('bathrooms', v)} /></Field>
          <Field label="Lits"><Counter value={values.beds ?? 0} onChange={(v) => upd('beds', v)} /></Field>
        </Box>
      </Card>

      <Card title="📝 Descriptions" meta={`Multilingue · ${descriptions.length} langue(s)`}>
        <LangSwitcher
          value={descLang}
          onChange={(v) => setDescLang(v)}
          languages={[...DESC_LANG_UI]}
        />
        <Field
          label="Résumé court (headline)"
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
          <Field label="airbnbSummary" charCount="spécifique Airbnb">
            <TextField size="small" multiline rows={2} fullWidth placeholder="Optionnel · remplace la description courte sur Airbnb" value={values.airbnbSummary || ''} onChange={e => upd('airbnbSummary', e.target.value)} sx={sxInput} />
          </Field>
        </Box>
      </Card>

      <Card title="⚙️ Statut & visibilité">
        <ToggleRow title="Listing actif"  desc="Visible sur tous les canaux. Décocher pour masquer partout en 1 clic." checked={values.active !== false} onChange={v => upd('active', v)} />
        <ToggleRow title="OTA only"        desc="Réservable uniquement via Airbnb / Booking. Bloque les réservations directes." checked={!!values.otaOnly} onChange={v => upd('otaOnly', v)} />
        <ToggleRow title="Instant booking" desc="Pas d'approbation manuelle requise (recommandé Airbnb Plus)." checked={!!values.instantBooking} onChange={v => upd('instantBooking', v)} />
        <ToggleRow title="Staging (test)"  desc="Mode brouillon · non synchronisé OTA." checked={!!values.staging} onChange={v => upd('staging', v)} />
      </Card>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LocationTab
   ════════════════════════════════════════════════════════════════════ */
const POIS = [
  { id: 'beach',      label: '🏖 Plage 800m' },
  { id: 'restaurant', label: '🍽 Restaurants' },
  { id: 'tram',       label: '🚇 Tram T2' },
  { id: 'super',      label: '🛒 Supermarché' },
  { id: 'parking',    label: '🅿️ Parking privé' },
  { id: 'hospital',   label: '🏥 Hôpital 3km' },
  { id: 'church',     label: '⛪ Église' },
  { id: 'gym',        label: '💪 Salle de sport' },
  { id: 'golf',       label: '🏌️ Golf' },
];

export function LocationTab({ values, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const togglePoi = (id) => {
    const cur = values.pois || [];
    upd('pois', cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  return (
    <Box>
      {/* Map */}
      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, p: 0,
        overflow: 'hidden', mb: 1.75,
      }}>
        <Box sx={{
          height: 240, position: 'relative',
          background: `linear-gradient(135deg, #e8e3d5, #d4ccb9)`,
          backgroundImage: `
            linear-gradient(rgba(184,133,26,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(184,133,26,0.04) 1px, transparent 1px),
            radial-gradient(circle at 30% 40%, rgba(10,143,94,0.10) 0, transparent 20%),
            radial-gradient(circle at 70% 60%, rgba(6,115,179,0.10) 0, transparent 25%)`,
          backgroundSize: '20px 20px, 20px 20px, auto, auto',
        }}>
          <Stack direction="row" spacing={0.625} sx={{ position: 'absolute', top: 8, left: 8, right: 8 }}>
            <TextField size="small" fullWidth value={values.searchQuery || ''}
              placeholder="Rechercher une adresse…"
              onChange={e => upd('searchQuery', e.target.value)}
              sx={{ bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 0.875, '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
            <Button size="small" variant="outlined" sx={{ bgcolor: '#fff', borderColor: T.border, color: T.text, fontSize: 11.5, textTransform: 'none', whiteSpace: 'nowrap' }}>
              🎯 Centrer
            </Button>
          </Stack>
          <Box sx={{
            position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)',
            width: 48, height: 48, borderRadius: '50%',
            bgcolor: 'rgba(184,133,26,0.20)', border: `2px solid ${T.primary}`,
            animation: 'sojori-pulse-success 2s infinite',
          }} />
          <Box sx={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%, -100%)', fontSize: 32, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))' }}>📍</Box>
          <Typography sx={{ position: 'absolute', bottom: 6, right: 8, fontSize: 9.5, color: 'rgba(20,17,10,0.35)', fontFamily: '"Geist Mono", monospace' }}>
            © OpenStreetMap · Sojori Geo
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.25, mb: 1.75 }}>
        <Card title="🏢 Adresse">
          <Field label="Numéro & rue" required>
            <TextField size="small" fullWidth value={values.street || ''} onChange={e => upd('street', e.target.value)} sx={sxInput} />
          </Field>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
            <Field label="Code postal" required>
              <TextField size="small" value={values.zipcode || ''} onChange={e => upd('zipcode', e.target.value)} sx={sxInput} />
            </Field>
            <Field label="Ville" required>
              <TextField size="small" value={values.city || ''} onChange={e => upd('city', e.target.value)} sx={sxInput} />
            </Field>
            <Field label="État / Région">
              <TextField size="small" value={values.region || ''} onChange={e => upd('region', e.target.value)} sx={sxInput} />
            </Field>
            <Field label="Pays" required>
              <FormControl size="small">
                <Select value={values.country || 'FR'} onChange={e => upd('country', e.target.value)}>
                  <MenuItem value="FR">🇫🇷 France</MenuItem>
                  <MenuItem value="MA">🇲🇦 Maroc</MenuItem>
                  <MenuItem value="IT">🇮🇹 Italie</MenuItem>
                  <MenuItem value="ES">🇪🇸 Espagne</MenuItem>
                </Select>
              </FormControl>
            </Field>
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <Field label="Quartier / zone" hint="Affiché aux voyageurs sur Airbnb / Booking.">
              <TextField size="small" fullWidth value={values.neighborhood || ''} onChange={e => upd('neighborhood', e.target.value)} sx={sxInput} />
            </Field>
          </Box>
        </Card>

        <Card title="🎯 Coordonnées GPS" meta="Drag du pin pour ajuster">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.75 }}>
            <Field label="Latitude" required>
              <TextField size="small" type="number" inputProps={{ step: 0.0001 }} value={values.lat ?? ''} onChange={e => upd('lat', +e.target.value)} sx={sxInput} />
            </Field>
            <Field label="Longitude" required>
              <TextField size="small" type="number" inputProps={{ step: 0.0001 }} value={values.lng ?? ''} onChange={e => upd('lng', +e.target.value)} sx={sxInput} />
            </Field>
          </Box>
          <ToggleRow title="Adresse exacte (vs zone)" desc="Si décoché, Airbnb affichera un cercle approximatif (recommandé pour sécurité)." checked={!!values.exactAddress} onChange={v => upd('exactAddress', v)} />
          <ToggleRow title="Géofencing check-in"    desc="Vérifie que le voyageur est sur place pour l'auto check-in." checked={values.geofencing !== false} onChange={v => upd('geofencing', v)} />
        </Card>
      </Box>

      <Card title="🚪 Instructions d'arrivée" meta="howToArrive · multilingue">
        <LangSwitcher value={values.howToArriveLang || '🇫🇷 FR'} onChange={v => upd('howToArriveLang', v)} />
        <Field label="Comment arriver" hint="Envoyé automatiquement 24h avant le check-in via WhatsApp.">
          <TextField size="small" multiline rows={4} fullWidth value={values.howToArrive || ''} onChange={e => upd('howToArrive', e.target.value)} sx={sxInput} />
        </Field>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mt: 1.75 }}>
          <Field label="Aéroport le plus proche">
            <TextField size="small" value={values.nearestAirport || ''} onChange={e => upd('nearestAirport', e.target.value)} sx={sxInput} />
          </Field>
          <Field label="Distance aéroport (km)">
            <TextField size="small" type="number" value={values.airportDistance ?? ''} onChange={e => upd('airportDistance', +e.target.value)} sx={sxInput} />
          </Field>
          <Field label="Transfert recommandé">
            <FormControl size="small">
              <Select value={values.transferOption || 'Taxi'} onChange={e => upd('transferOption', e.target.value)}>
                <MenuItem value="Taxi">Taxi (~25 €)</MenuItem>
                <MenuItem value="Public">Tram + bus</MenuItem>
                <MenuItem value="Car">Voiture de location</MenuItem>
                <MenuItem value="Sojori">Service Sojori</MenuItem>
              </Select>
            </FormControl>
          </Field>
        </Box>
      </Card>

      <Card title="🏛 Points d'intérêt" meta="Affichés sur la page guest">
        <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1.25 }}>
          Cocher les catégories pertinentes pour le voyageur :
        </Typography>
        <ChipsRow items={POIS} value={values.pois || []} onToggle={togglePoi} />
      </Card>
    </Box>
  );
}

export default { GeneralTab, LocationTab };
