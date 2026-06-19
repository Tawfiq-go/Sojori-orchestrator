// ════════════════════════════════════════════════════════════════════
// Trace import RU — audit / debug admin (données brutes preporteyInformation)
// Les champs éditables sont répartis dans les onglets métier.
// ════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Card, RuFormLegend, SectionH, T } from './_shared';
import { JsonBlock } from '../utils/ruImportFieldHelpers';

export function RuImportDataTab({ values }) {
  const preportey =
    values.preporteyInformation && typeof values.preporteyInformation === 'object'
      ? values.preporteyInformation
      : {};

  const ruRawExcerpt = useMemo(() => {
    const raw = preportey.ruRawProperty;
    if (!raw || typeof raw !== 'object') return null;
    const keys = [
      'OwnerID',
      'PropertyTypeID',
      'StandardGuests',
      'CanSleepMax',
      'Space',
      'Surface',
      'IsActive',
      'BuildingID',
      'PreparationTimeBeforeArrivalInHours',
      'LateArrivalFees',
      'EarlyDepartureFees',
      'DefaultMinStay',
      'DefaultMaxStay',
    ];
    const out = {};
    for (const k of keys) {
      if (raw[k] !== undefined) out[k] = raw[k];
    }
    return Object.keys(out).length ? out : raw;
  }, [preportey.ruRawProperty]);

  const importedAt = preportey.ruImportedAt || preportey.ruImportVersion;

  return (
    <Box>
      <RuFormLegend />
      <Typography sx={{ fontSize: 12.5, color: T.text2, mb: 2, lineHeight: 1.5 }}>
        Audit de l&apos;import Rentals United. Les champs métier sont éditables dans General, Location,
        Fees, Direct Booking, etc. Cet onglet conserve la trace brute pour debug et schéma Airbnb.
      </Typography>

      <Card title="🗄️ Métadonnées import" meta={importedAt ? String(importedAt).slice(0, 19) : '—'}>
        <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1 }}>
          ruImportedFields ({Array.isArray(values.ruImportedFields) ? values.ruImportedFields.length : 0} clés)
        </Typography>
        <JsonBlock
          data={values.ruImportedFields}
          maxHeight={120}
          emptyLabel="(aucune trace — listing non importé RU ou legacy)"
        />
      </Card>

      <Card title="📦 preporteyInformation">
        <SectionH>ruArrivalInstructions</SectionH>
        <JsonBlock data={preportey.ruArrivalInstructions} maxHeight={140} />
        <SectionH>ruCheckInOut</SectionH>
        <JsonBlock data={preportey.ruCheckInOut} maxHeight={100} />
        <SectionH>ruPaymentMethods · deposit · cancellation</SectionH>
        <JsonBlock
          data={{
            ruPaymentMethods: preportey.ruPaymentMethods,
            ruDeposit: preportey.ruDeposit,
            ruSecurityDeposit: preportey.ruSecurityDeposit,
            ruCancellationPolicies: preportey.ruCancellationPolicies,
            ruLateArrivalFees: preportey.ruLateArrivalFees,
            ruEarlyDepartureFees: preportey.ruEarlyDepartureFees,
          }}
          maxHeight={180}
        />
        <SectionH>ruExternalListing</SectionH>
        <JsonBlock data={preportey.ruExternalListing || values.ruExternalListing} maxHeight={160} />
        <SectionH>ruRawProperty (extrait)</SectionH>
        <JsonBlock data={ruRawExcerpt} maxHeight={280} />
      </Card>
    </Box>
  );
}

export default RuImportDataTab;
