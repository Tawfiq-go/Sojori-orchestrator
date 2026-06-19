// BasicInfoTab.tsx - Full form with identification, description multilingual, status toggles
import { Box, Stack, Typography, TextField, Select, MenuItem, Chip } from '@mui/material';
import { tokens } from '../ListingFormV2';
import { SectionCard, AIField, AIBanner, SaveBar, FormPager } from '../ListingFormHelpers';

interface BasicInfoTabProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

export function BasicInfoTab({ data, onChange }: BasicInfoTabProps) {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: tokens.primaryTint, color: tokens.primaryDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              🏠
            </Box>
            Informations de base
          </Typography>
          <Typography sx={{ color: tokens.text3, fontSize: 13.5, lineHeight: 1.5, maxWidth: 640 }}>
            L'identité de votre logement. Ces informations sont synchronisées avec Airbnb, Booking et les autres canaux.
          </Typography>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.125, py: 0.5, borderRadius: '99px', bgcolor: tokens.successTint, color: tokens.success, border: `1px solid rgba(16,185,129,0.25)`, fontFamily: 'Geist Mono', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          ● Complet · 12/12
        </Box>
      </Box>

      {/* AI Banner */}
      <AIBanner
        title="Importation depuis Airbnb détectée."
        hint="L'agent IA a peuplé 8 champs sur 12. Les champs en violet attendent votre validation."
        actions={[
          { label: 'Re-scanner', onClick: () => {} },
          { label: 'Valider tout', onClick: () => {}, primary: true },
        ]}
      />

      {/* Identification */}
      <SectionCard title="Identification" required description="Visible sur tous les canaux de distribution.">
        <Stack spacing={2.25}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
            <AIField label="Nom de la propriété" required hint="3-50 caractères. Inclure ville et caractéristique distinctive.">
              <TextField
                fullWidth
                value={data?.name || ''}
                onChange={(e) => onChange('name', e.target.value)}
              />
            </AIField>
            <AIField label="Type de propriété" required aiFilled hint="Détecté depuis les photos et l'adresse.">
              <Select fullWidth value={data?.propertyType || 'Villa'} onChange={(e) => onChange('propertyType', e.target.value)}>
                <MenuItem value="Villa">Villa</MenuItem>
                <MenuItem value="Appartement">Appartement</MenuItem>
                <MenuItem value="Maison">Maison</MenuItem>
                <MenuItem value="Studio">Studio</MenuItem>
              </Select>
            </AIField>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
            <AIField label="Chambres" required>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: tokens.bg1, border: `1px solid ${tokens.border}`, borderRadius: '9px', overflow: 'hidden' }}>
                <Box component="button" onClick={() => onChange('bedrooms', Math.max(0, (data?.bedrooms || 0) - 1))} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: tokens.text2, transition: 'background 0.12s', '&:hover': { bgcolor: tokens.bg2 }, border: 0, cursor: 'pointer', bgcolor: 'transparent' }}>−</Box>
                <Box sx={{ px: 2, fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'center', fontFamily: 'Geist Mono' }}>{data?.bedrooms || 4}</Box>
                <Box component="button" onClick={() => onChange('bedrooms', (data?.bedrooms || 0) + 1)} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: tokens.text2, transition: 'background 0.12s', '&:hover': { bgcolor: tokens.bg2 }, border: 0, cursor: 'pointer', bgcolor: 'transparent' }}>+</Box>
              </Box>
            </AIField>
            <AIField label="Salles de bain" required>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: tokens.bg1, border: `1px solid ${tokens.border}`, borderRadius: '9px', overflow: 'hidden' }}>
                <Box component="button" onClick={() => onChange('bathrooms', Math.max(0, (data?.bathrooms || 0) - 1))} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: tokens.text2, transition: 'background 0.12s', '&:hover': { bgcolor: tokens.bg2 }, border: 0, cursor: 'pointer', bgcolor: 'transparent' }}>−</Box>
                <Box sx={{ px: 2, fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'center', fontFamily: 'Geist Mono' }}>{data?.bathrooms || 3}</Box>
                <Box component="button" onClick={() => onChange('bathrooms', (data?.bathrooms || 0) + 1)} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: tokens.text2, transition: 'background 0.12s', '&:hover': { bgcolor: tokens.bg2 }, border: 0, cursor: 'pointer', bgcolor: 'transparent' }}>+</Box>
              </Box>
            </AIField>
            <AIField label="Capacité (guests)" required>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: tokens.bg1, border: `1px solid ${tokens.border}`, borderRadius: '9px', overflow: 'hidden' }}>
                <Box component="button" onClick={() => onChange('capacity', Math.max(0, (data?.capacity || 0) - 1))} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: tokens.text2, transition: 'background 0.12s', '&:hover': { bgcolor: tokens.bg2 }, border: 0, cursor: 'pointer', bgcolor: 'transparent' }}>−</Box>
                <Box sx={{ px: 2, fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'center', fontFamily: 'Geist Mono' }}>{data?.capacity || 8}</Box>
                <Box component="button" onClick={() => onChange('capacity', (data?.capacity || 0) + 1)} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: tokens.text2, transition: 'background 0.12s', '&:hover': { bgcolor: tokens.bg2 }, border: 0, cursor: 'pointer', bgcolor: 'transparent' }}>+</Box>
              </Box>
            </AIField>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
            <AIField label="Surface (m²)" aiFilled hint="Estimé depuis les photos.">
              <TextField
                fullWidth
                value={data?.surface || '240'}
                onChange={(e) => onChange('surface', e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: <Box sx={{ px: 1.5, bgcolor: tokens.bg2, borderLeft: `1px solid ${tokens.border}`, fontSize: 12, fontWeight: 600, color: tokens.text3 }}>m²</Box>,
                  },
                }}
              />
            </AIField>
            <AIField label="Lits">
              <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: tokens.bg1, border: `1px solid ${tokens.border}`, borderRadius: '9px', overflow: 'hidden' }}>
                <Box component="button" onClick={() => onChange('beds', Math.max(0, (data?.beds || 0) - 1))} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: tokens.text2, transition: 'background 0.12s', '&:hover': { bgcolor: tokens.bg2 }, border: 0, cursor: 'pointer', bgcolor: 'transparent' }}>−</Box>
                <Box sx={{ px: 2, fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'center', fontFamily: 'Geist Mono' }}>{data?.beds || 5}</Box>
                <Box component="button" onClick={() => onChange('beds', (data?.beds || 0) + 1)} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: tokens.text2, transition: 'background 0.12s', '&:hover': { bgcolor: tokens.bg2 }, border: 0, cursor: 'pointer', bgcolor: 'transparent' }}>+</Box>
              </Box>
            </AIField>
          </Stack>
        </Stack>
      </SectionCard>

      {/* Description multilingue */}
      <SectionCard title="Description multilingue" required description="Auto-traduit en EN/ES/IT après publication.">
        <Stack spacing={1.75} sx={{ mb: 1.75 }} direction="row">
          <Chip label="FR · principal" sx={{ bgcolor: tokens.primary, color: tokens.text, fontWeight: 600, borderRadius: '99px' }} />
          <Chip label="EN →" variant="outlined" />
          <Chip label="ES →" variant="outlined" />
          <Chip label="IT →" variant="outlined" />
          <Chip label="+ Ajouter" variant="outlined" sx={{ borderStyle: 'dashed', color: tokens.text3 }} />
        </Stack>

        <Stack spacing={1.75}>
          <AIField label="Description courte (140 c. max)" aiFilled hint="Apparaît dans les résultats de recherche OTA.">
            <TextField
              fullWidth
              multiline
              rows={2}
              value={data?.shortDescription || 'Villa contemporaine avec vue mer panoramique sur Nice, piscine privée chauffée, et jardin méditerranéen.'}
              onChange={(e) => onChange('shortDescription', e.target.value)}
            />
          </AIField>

          <AIField label="Description longue" aiFilled hint="Sera traduite automatiquement.">
            <TextField
              fullWidth
              multiline
              rows={6}
              value={data?.longDescription || 'Nichée sur les hauteurs de Nice, cette villa contemporaine de 240m² offre une vue panoramique imprenable sur la baie...'}
              onChange={(e) => onChange('longDescription', e.target.value)}
            />
          </AIField>
        </Stack>
      </SectionCard>

      {/* Statut & visibilité */}
      <SectionCard title="Statut & visibilité">
        <Stack spacing={0}>
          {[
            { key: 'active', label: 'Listing actif', hint: 'Visible sur les canaux. Désactivez pour cacher partout en 1 clic.', value: true },
          ].map((toggle, idx) => (
            <Box key={toggle.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.75, py: 1.5, ...(idx > 0 && { borderTop: `1px solid ${tokens.border}` }) }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.text }}>{toggle.label}</Typography>
                <Typography sx={{ fontSize: 11.5, color: tokens.text3, mt: 0.25, lineHeight: 1.4 }}>{toggle.hint}</Typography>
              </Box>
              <Box
                component="button"
                onClick={() => onChange(toggle.key, !data?.[toggle.key])}
                sx={{
                  position: 'relative', width: 38, height: 22,
                  bgcolor: (data?.[toggle.key] ?? toggle.value) ? tokens.success : tokens.borderStrong,
                  borderRadius: '99px', transition: 'background 0.2s', flexShrink: 0,
                  border: 0, cursor: 'pointer',
                  '&::after': {
                    content: '""', position: 'absolute', top: '2px', left: '2px',
                    width: 18, height: 18, borderRadius: '50%',
                    bgcolor: '#fff', transition: 'transform 0.2s',
                    transform: (data?.[toggle.key] ?? toggle.value) ? 'translateX(16px)' : 'translateX(0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }
                }}
              />
            </Box>
          ))}
        </Stack>
      </SectionCard>

      {/* Pager */}
      <FormPager
        prevLabel="Onglet précédent"
        nextLabel="Adresse"
        currentIndex={1}
        total={24}
        onPrev={() => {}}
        onNext={() => {}}
      />

      {/* Save Bar */}
      <SaveBar onCancel={() => {}} onSave={() => {}} />
    </Box>
  );
}
