import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import ChatbotListingSummaryHero from './ChatbotListingSummaryHero';
import {
  buildChatbotPropertyResumeDetail,
  boolLabel,
  displayMetric,
  formatSummaryDate,
} from './chatbotListingSummary';
import {
  Card,
  FormRow,
  SectionHeader,
  TYPO,
} from '../listing/components/ConfigOrchestration/SHARED';

type Props = {
  listingId: string;
  formValues: Record<string, unknown>;
  rawDoc?: Record<string, unknown> | null;
  snapshotUpdatedAt?: string;
  menuOptionsCount?: number;
};

function DetailValue({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ ...TYPO.body, whiteSpace: 'pre-wrap' }}>
      {children ?? '—'}
    </Typography>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <FormRow label={label} compact>
      <DetailValue>{children}</DetailValue>
    </FormRow>
  );
}

export default function ChatbotPropertyResumeTab({
  listingId,
  formValues,
  rawDoc,
  snapshotUpdatedAt,
  menuOptionsCount = 0,
}: Props) {
  const d = buildChatbotPropertyResumeDetail(listingId, formValues, rawDoc);

  return (
    <Box className="cb-property-resume">
      <ChatbotListingSummaryHero
        listingId={listingId}
        formValues={formValues}
        rawDoc={rawDoc}
        snapshotUpdatedAt={snapshotUpdatedAt}
        menuOptionsCount={menuOptionsCount}
      />

      <Box sx={{ px: { xs: 1.5, md: 2 }, pb: 2, maxWidth: 1100 }}>
        <SectionHeader
          icon="📌"
          title="Informations générales"
          subtitle="Aligné onglet General Information du catalogue"
        />
        <Card icon="🏠" title="Identité & capacité" subtitle="Données OTA / Rentals United">
          <DetailRow label="Nom annonce (OTA)">{d.name}</DetailRow>
          <DetailRow label="Type de bien">{d.propertyType}</DetailRow>
          <DetailRow label="Unité de propriété">{d.propertyUnit}</DetailRow>
          <DetailRow label="Room type">
            {d.roomTypeName || '—'}
            {d.roomTypeId ? (
              <Box component="span" sx={{ ...TYPO.monoHelp, display: 'block', mt: 0.5 }}>
                {d.roomTypeId}
              </Box>
            ) : null}
          </DetailRow>
          <DetailRow label="Capacité standard">{displayMetric(d.personCapacity)}</DetailRow>
          <DetailRow label="Capacité max">{displayMetric(d.maxGuests)}</DetailRow>
          <DetailRow label="Surface (m²)">{displayMetric(d.surface)}</DetailRow>
          <DetailRow label="Étage / immeuble">
            {d.floor != null || d.totalFloors != null
              ? `${displayMetric(d.floor)} / ${displayMetric(d.totalFloors)}`
              : '—'}
          </DetailRow>
        </Card>

        <Card icon="🛏️" title="Chambres & lits" subtitle="Premier room type du listing">
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ minWidth: 100 }}>
              <Typography sx={TYPO.caps}>Chambres</Typography>
              <Typography sx={{ ...TYPO.bodyBold, fontSize: 18 }}>{displayMetric(d.bedrooms)}</Typography>
            </Box>
            <Box sx={{ minWidth: 100 }}>
              <Typography sx={TYPO.caps}>Salles de bain</Typography>
              <Typography sx={{ ...TYPO.bodyBold, fontSize: 18 }}>{displayMetric(d.bathrooms)}</Typography>
            </Box>
            <Box sx={{ minWidth: 100 }}>
              <Typography sx={TYPO.caps}>Lits</Typography>
              <Typography sx={{ ...TYPO.bodyBold, fontSize: 18 }}>{displayMetric(d.beds)}</Typography>
            </Box>
          </Stack>
        </Card>

        <SectionHeader icon="📍" title="Localisation" subtitle="Adresse & coordonnées" />
        <Card icon="📍" title="Adresse" subtitle={d.locationLine}>
          <DetailRow label="Adresse">{d.address || '—'}</DetailRow>
          <DetailRow label="Ville">{d.city || '—'}</DetailRow>
          <DetailRow label="Région / état">{d.state || '—'}</DetailRow>
          <DetailRow label="Pays">{d.country || '—'}</DetailRow>
          <DetailRow label="Code postal">{d.zipcode || '—'}</DetailRow>
          <DetailRow label="Quartier / place">{d.place || '—'}</DetailRow>
          <DetailRow label="GPS">{d.coordinates}</DetailRow>
        </Card>

        <SectionHeader icon="🔗" title="Distribution" subtitle="Propriétaire & channel managers" />
        <Card icon="👤" title="Propriétaire & IDs">
          <DetailRow label="Propriétaire">{d.ownerName}</DetailRow>
          <DetailRow label="Listing ID">
            <Typography sx={{ ...TYPO.body, fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>
              {d.listingId}
            </Typography>
          </DetailRow>
          {d.rentalUnitedLabel ? (
            <DetailRow label="Rentals United">{d.rentalUnitedLabel}</DetailRow>
          ) : null}
          <DetailRow label="Channel manager">{d.channelManager}</DetailRow>
          <DetailRow label="Statut">{d.active ? 'Actif' : 'Inactif'}</DetailRow>
          <DetailRow label="Réservation instantanée">{boolLabel(d.instantBooking)}</DetailRow>
          <DetailRow label="Staging">{boolLabel(d.staging)}</DetailRow>
          <DetailRow label="OTA only">{boolLabel(d.otaOnly)}</DetailRow>
          <DetailRow label="Dernière maj listing">
            {formatSummaryDate(d.listingUpdatedAt)}
          </DetailRow>
        </Card>

        {(d.shortDescription || d.longDescription) && (
          <>
            <SectionHeader icon="📝" title="Descriptions" />
            <Card icon="📝" title="Textes FR" compact>
              {d.shortDescription ? (
                <DetailRow label="Titre / accroche">{d.shortDescription}</DetailRow>
              ) : null}
              {d.longDescription ? (
                <DetailRow label="Description">{d.longDescription}</DetailRow>
              ) : null}
            </Card>
          </>
        )}

        <SectionHeader
          icon="📱"
          title="WhatsApp (snapshot)"
          subtitle="Cache srv-fullchatbot — relancer Sync si besoin"
        />
        <Card icon="📱" title="Synchronisation FullChatbot">
          <DetailRow label="Snapshot WA">
            {snapshotUpdatedAt ? formatSummaryDate(snapshotUpdatedAt) : 'Non synchronisé'}
          </DetailRow>
          <DetailRow label="Options menu WhatsApp">{menuOptionsCount}</DetailRow>
        </Card>

        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', pt: 1 }}>
          <Link to={`/listings/${listingId}?level=detail&tab=general`} className="cb-link">
            Modifier General Information ↗
          </Link>
          <Link to={`/listings/${listingId}?level=config-new`} className="cb-link cb-link--ghost">
            Config Orch. NEW ↗
          </Link>
        </Stack>
      </Box>
    </Box>
  );
}
