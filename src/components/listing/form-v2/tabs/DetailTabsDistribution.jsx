// ════════════════════════════════════════════════════════════════════
// DetailTabsDistribution.jsx — Distribution · Rooms · License
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, TextField, Typography, Stack, Button } from '@mui/material';
import { sxInput, Field, Card, ToggleRow, ChipsRow, NumberInput, SelectField, RuFormLegend, T } from './_shared';
import {
  OtaChannelsSnapshotTable,
  RuExternalListingDisplay,
} from '../utils/ruImportFieldHelpers';
import { RoomsTab } from './RoomsTabComposition';
export { RoomsTab };

const DIRECT_PAYMENT_METHODS = [
  { id: 'card', label: '💳 Carte bancaire' },
  { id: 'wire', label: '🏦 Virement' },
  { id: 'cash', label: "💵 Espèces à l'arrivée" },
];

function DistributionSubTabs({ active, onChange }) {
  const tabs = [
    { id: 'ota', label: 'OTA' },
    { id: 'direct', label: 'Direct booking' },
  ];
  return (
    <Stack direction="row" gap={0.75} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <Button
            key={tab.id}
            size="small"
            onClick={() => onChange(tab.id)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: 1,
              px: 1.75,
              py: 0.75,
              color: selected ? T.primaryDeep : T.text2,
              bgcolor: selected ? T.primaryTint : T.bg2,
              border: `1px solid ${selected ? T.primary : T.border}`,
              '&:hover': { bgcolor: selected ? T.primaryTint : T.bg3 },
            }}
          >
            {tab.label}
          </Button>
        );
      })}
    </Stack>
  );
}

/* ════════════════════ OTA ════════════════════ */
export function OtaDistributionTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const externalListing =
    values.ruExternalListing || values.preporteyInformation?.ruExternalListing;
  const hasOtaLink = Boolean(
    externalListing &&
      (externalListing.Property?.ExternalListing?.Url ||
        externalListing.Property?.externalListing?.url ||
        externalListing.ExternalListing?.Url ||
        externalListing.url),
  );
  const linkedOta =
    values.syncToRentalUnited === true ||
    (Array.isArray(values.rentalUnitedIds) && values.rentalUnitedIds.length > 0) ||
    hasOtaLink ||
    Boolean(values.otaChannelsSnapshot?.channels?.length);

  return (
    <Box>
      <Card title="📡 Canaux OTA">
        <ToggleRow
          title="Synchroniser avec les OTA"
          desc="Active la diffusion et la synchronisation vers Airbnb et les autres canaux connectés."
          ruField="syncToRentalUnited"
          checked={values.syncToRentalUnited === true}
          onChange={(v) => upd('syncToRentalUnited', v)}
        />

        <Box sx={{ mt: 1.5 }}>
          <RuExternalListingDisplay value={externalListing} ruField="ruExternalListing" clientView />
        </Box>

        {values.otaChannelsSnapshot ? (
          <Box sx={{ mt: 1.5 }}>
            <Field label="Canaux connectés" ruField="rentalUnitedIds" fullWidth>
              <OtaChannelsSnapshotTable snapshot={values.otaChannelsSnapshot} clientView />
            </Field>
          </Box>
        ) : linkedOta ? (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 1.5 }}>
            Aucun détail canal disponible pour le moment. Lancez une synchronisation depuis le menu
            publication.
          </Typography>
        ) : (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 1.5 }}>
            Aucun canal OTA connecté. Importez ou synchronisez le listing pour activer la distribution.
          </Typography>
        )}
      </Card>
    </Box>
  );
}

/* ════════════════════ Direct booking ════════════════════ */
export function DirectBookingTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const slug = values.slug || '';
  const directPaymentMethods = Array.isArray(values.directPaymentMethods)
    ? values.directPaymentMethods
    : ['card', 'wire'];

  return (
    <Box>
      <Card title="🌐 Portail Sojori">
        <ToggleRow
          title="Activer la réservation directe"
          desc={
            slug
              ? `Le listing apparaît sur sojori.com/villa-${slug} et accepte les réservations sans intermédiaire.`
              : 'Le listing apparaît sur sojori.com et accepte les réservations sans intermédiaire.'
          }
          checked={values.directEnabled === true}
          onChange={(v) => upd('directEnabled', v)}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5, mt: 1.5 }}>
          <Field label="Slug URL" hint="sojori.com/villa-{slug}">
            <TextField
              size="small"
              value={slug}
              onChange={(e) => upd('slug', e.target.value)}
              placeholder="ex: belvedere-nice"
              sx={sxInput}
            />
          </Field>
          <Field label="Remise direct booking" hint="Réduction sur le portail Sojori">
            <NumberInput
              value={values.directDiscount ?? ''}
              suffix="%"
              onChange={(v) => upd('directDiscount', v)}
            />
          </Field>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <ToggleRow
            title="Remise client récurrent"
            desc="−10% pour les voyageurs ayant déjà séjourné dans un de tes listings"
            checked={!!values.returningGuestDiscount}
            onChange={(v) => upd('returningGuestDiscount', v)}
          />
        </Box>
      </Card>

      <Card title="💳 Paiement portail direct">
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 1.25 }}>
          Moyens acceptés sur <strong>sojori.com</strong> uniquement. Les moyens de paiement OTA sont
          visibles dans l&apos;onglet <strong>Frais</strong>.
        </Typography>
        <ChipsRow
          value={directPaymentMethods}
          onToggle={(v) => {
            const next = directPaymentMethods.includes(v)
              ? directPaymentMethods.filter((x) => x !== v)
              : [...directPaymentMethods, v];
            upd('directPaymentMethods', next);
          }}
          items={DIRECT_PAYMENT_METHODS}
        />
      </Card>
    </Box>
  );
}

/* ════════════════════ Distribution (parent) ════════════════════ */
export function DistributionTab({ values = {}, onChange }) {
  const [subTab, setSubTab] = useState('ota');
  const common = { values, onChange };

  return (
    <Box>
      <RuFormLegend />
      <DistributionSubTabs active={subTab} onChange={setSubTab} />
      {subTab === 'ota' ? <OtaDistributionTab {...common} /> : <DirectBookingTab {...common} />}
    </Box>
  );
}

/** @deprecated utiliser DistributionTab */
export const DirectBookingTabLegacy = DistributionTab;

/* ════════════════════ License ════════════════════ */
export function LicenseTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  return (
    <Box>
      <RuFormLegend />

      <Card title="📄 Licence touristique">
        <ToggleRow
          title="Cette propriété n'a pas besoin de licence"
          desc="Cocher si pas de licence requise (ex: Airbnb Maroc, certaines villes)"
          checked={!!values.licenceIsExempt}
          onChange={(v) => upd('licenceIsExempt', v)}
          ruField="licenceInfo"
        />

        {!values.licenceIsExempt && (
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            <Field label="Numéro de licence" required ruField="licenceNumber">
              <TextField size="small" value={values.licenseNumber || ''} onChange={(e) => upd('licenseNumber', e.target.value)} placeholder="ex: 06088-MEUB-2024" sx={sxInput} />
            </Field>
            <Field label="Type de licence" ruField="licenceType">
              <SelectField value={values.licenseType || 'meuble_tourisme'} onChange={(v) => upd('licenseType', v)}
                options={[
                  { value: 'meuble_tourisme', label: 'Meublé de tourisme' },
                  { value: 'chambres_hotes', label: "Chambres d'hôtes" },
                  { value: 'gite_rural', label: 'Gîte rural' },
                  { value: 'residence_secondaire', label: 'Résidence secondaire' },
                ]} />
            </Field>
            <Field label="Date d'émission" ruField="issueDate">
              <TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={values.licenseIssueDate || ''} onChange={(e) => upd('licenseIssueDate', e.target.value)} sx={sxInput} />
            </Field>
            <Field label="Date d'expiration" required ruField="expirationDate">
              <TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={values.licenseExpiryDate || ''} onChange={(e) => upd('licenseExpiryDate', e.target.value)} sx={sxInput} />
            </Field>
          </Box>
        )}
      </Card>

      {!values.licenceIsExempt && (
        <>
          <Card title="🏛 Mairie & autorités">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
              <Field label="Mairie de rattachement">
                <TextField size="small" value={values.cityHall || ''} onChange={(e) => upd('cityHall', e.target.value)} placeholder="ex: Mairie de Nice" sx={sxInput} />
              </Field>
              <Field label="Référent administratif">
                <TextField size="small" value={values.adminContact || ''} onChange={(e) => upd('adminContact', e.target.value)} sx={sxInput} />
              </Field>
            </Box>
          </Card>

          <Card title="🛂 Enregistrement police / hôtelière">
            <ToggleRow title="Enregistrement obligatoire" desc="Transmission automatique des fiches voyageurs aux autorités" checked={!!values.policeRegistrationRequired} onChange={(v) => upd('policeRegistrationRequired', v)} />
            <Box sx={{ mt: 1.5 }}>
              <Field label="Endpoint API police"><TextField size="small" fullWidth value={values.policeApiEndpoint || ''} onChange={(e) => upd('policeApiEndpoint', e.target.value)} placeholder="ex: https://api.police.gov.fr/v1/registration" sx={sxInput} /></Field>
            </Box>
          </Card>
        </>
      )}
    </Box>
  );
}
