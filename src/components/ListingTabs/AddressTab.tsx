// AddressTab.tsx - Address form with street, city, postal code, country, coordinates
import { Box, Stack, Typography, TextField, Select, MenuItem } from '@mui/material';
import { tokens } from '../ListingFormV2';
import { SectionCard, AIField, SaveBar, FormPager } from '../ListingFormHelpers';

interface AddressTabProps {
  data: any;
  onChange: (field: string, value: any) => void;
}

export function AddressTab({ data, onChange }: AddressTabProps) {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: tokens.primaryTint, color: tokens.primaryDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              📍
            </Box>
            Adresse
          </Typography>
          <Typography sx={{ color: tokens.text3, fontSize: 13.5, lineHeight: 1.5, maxWidth: 640 }}>
            L'adresse complète de votre propriété. Utilisée pour le check-in et la navigation GPS.
          </Typography>
        </Box>
      </Box>

      {/* Adresse complète */}
      <SectionCard title="Adresse complète" required description="Synchronisée avec Google Maps et les OTA.">
        <Stack spacing={2.25}>
          <AIField label="Rue et numéro" required>
            <TextField
              fullWidth
              placeholder="47 Derb El Hammam"
              value={data?.street || ''}
              onChange={(e) => onChange('street', e.target.value)}
            />
          </AIField>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
            <AIField label="Ville" required>
              <TextField
                fullWidth
                placeholder="Nice"
                value={data?.city || ''}
                onChange={(e) => onChange('city', e.target.value)}
              />
            </AIField>
            <AIField label="Code postal" required>
              <TextField
                fullWidth
                placeholder="06000"
                value={data?.postalCode || ''}
                onChange={(e) => onChange('postalCode', e.target.value)}
              />
            </AIField>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
            <AIField label="Pays" required>
              <Select fullWidth value={data?.country || 'France'} onChange={(e) => onChange('country', e.target.value)}>
                <MenuItem value="France">France</MenuItem>
                <MenuItem value="Espagne">Espagne</MenuItem>
                <MenuItem value="Italie">Italie</MenuItem>
                <MenuItem value="Portugal">Portugal</MenuItem>
                <MenuItem value="Maroc">Maroc</MenuItem>
              </Select>
            </AIField>
            <AIField label="Région / État">
              <TextField
                fullWidth
                placeholder="Provence-Alpes-Côte d'Azur"
                value={data?.region || ''}
                onChange={(e) => onChange('region', e.target.value)}
              />
            </AIField>
          </Stack>

          <AIField label="Complément d'adresse" hint="Bâtiment, étage, code d'accès immeuble, etc.">
            <TextField
              fullWidth
              placeholder="Bâtiment A, 3e étage"
              value={data?.addressComplement || ''}
              onChange={(e) => onChange('addressComplement', e.target.value)}
            />
          </AIField>
        </Stack>
      </SectionCard>

      {/* Coordonnées GPS */}
      <SectionCard title="Coordonnées GPS" description="Auto-détectées depuis l'adresse. Ajustez si nécessaire.">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          <AIField label="Latitude" hint="Format décimal (ex: 43.7102)">
            <TextField
              fullWidth
              type="number"
              value={data?.latitude || '43.7102'}
              onChange={(e) => onChange('latitude', e.target.value)}
            />
          </AIField>
          <AIField label="Longitude" hint="Format décimal (ex: 7.2620)">
            <TextField
              fullWidth
              type="number"
              value={data?.longitude || '7.2620'}
              onChange={(e) => onChange('longitude', e.target.value)}
            />
          </AIField>
        </Stack>

        <Box sx={{ mt: 2, p: 2, bgcolor: tokens.bg2, borderRadius: '10px', border: `1px solid ${tokens.border}` }}>
          <Typography sx={{ fontSize: 11.5, color: tokens.text3, lineHeight: 1.4 }}>
            💡 Les coordonnées GPS sont utilisées pour afficher votre propriété sur la carte des OTA et calculer les distances aux points d'intérêt.
          </Typography>
        </Box>
      </SectionCard>

      {/* Pager */}
      <FormPager
        prevLabel="Informations de base"
        nextLabel="Médias"
        currentIndex={2}
        total={24}
        onPrev={() => {}}
        onNext={() => {}}
      />

      {/* Save Bar */}
      <SaveBar onCancel={() => {}} onSave={() => {}} />
    </Box>
  );
}
