// ════════════════════════════════════════════════════════════════════
// DetailTabsCommercial.jsx — Pricing · Availability · Fees & Deposits
// À brancher dans `renderTab` du ListingFormShell.
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, TextField, Button, IconButton } from '@mui/material';
import { hourNumberToTimeInput } from '../../../../utils/listingTimeHelpers';
import { T, sxInput, Field, Card, SectionH, ToggleRow, Counter, ChipsRow, NumberInput, MoneyInput, SelectField, AiBanner, RuFormLegend } from './_shared';

/* ════════════════════ Pricing ════════════════════ */
export function PricingTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  return (
    <Box>
      <RuFormLegend />
      <AiBanner title="Suggestion AI" body="basePrice 220 €/nuit pour ce type de villa à Nice en mai (+12% vs marché)." ctaLabel="Appliquer" />
      <Card title="💰 Prix de base">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          <Field label="Prix par nuit" required ai ruField="basePrice">
            <MoneyInput value={values.basePrice ?? 220} onChange={v => upd('basePrice', v)} currency={values.currency || '€'} />
          </Field>
          <Field label="Devise" required ruField="currencyCode">
            <SelectField value={values.currency || 'EUR'} onChange={v => upd('currency', v)}
              options={[{ value: 'EUR', label: '€ EUR' }, { value: 'MAD', label: 'DH MAD' }, { value: 'USD', label: '$ USD' }, { value: 'GBP', label: '£ GBP' }]} />
          </Field>
          <Field label="Prix week-end" ruField="extra" hint="Override Ven/Sam">
            <MoneyInput value={values.weekendPrice ?? 260} onChange={v => upd('weekendPrice', v)} currency={values.currency || '€'} />
          </Field>
        </Box>
      </Card>

      <Card title="📅 Discounts longue durée">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          <Field label="Hebdo (7+ nuits)"><NumberInput value={values.weeklyDiscount ?? 10} suffix="%" onChange={v => upd('weeklyDiscount', v)} /></Field>
          <Field label="Mensuel (28+ nuits)"><NumberInput value={values.monthlyDiscount ?? 25} suffix="%" onChange={v => upd('monthlyDiscount', v)} /></Field>
          <Field label="Early-bird (60+ jours)"><NumberInput value={values.earlyBirdDiscount ?? 5} suffix="%" onChange={v => upd('earlyBirdDiscount', v)} /></Field>
        </Box>
      </Card>

      <Card title="📊 Calendrier de prix" meta="Last-minute · saisonnier · événements">
        <ToggleRow title="Pricing dynamique" desc="L'IA ajuste les prix selon demande, jours fériés, occupation locale." checked={!!values.dynamicPricing} onChange={v => upd('dynamicPricing', v)} badges={[{ tone: 'ai', label: 'AI' }]} />
        <ToggleRow title="Last-minute discount" desc="−15% si réservation < 3 jours avant arrivée." checked={!!values.lastMinuteDiscount} onChange={v => upd('lastMinuteDiscount', v)} />
        <ToggleRow title="Prix saisonnier" desc="Override haute/basse saison (configuré dans Availability)." checked={!!values.seasonalPricing} onChange={v => upd('seasonalPricing', v)} />
      </Card>
    </Box>
  );
}

/* ════════════════════ Availability ════════════════════ */
export function AvailabilityTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  return (
    <Box>
      <RuFormLegend />
      <Card title="🚪 Check-in / Check-out" meta="checkInTimeStart · checkOutTime">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          <Field
            label="Heure check-in"
            required
            ruField="checkInTimeStart"
            hint="Heure d’arrivée (RU CheckInFrom). Fin de plage auto +2h si besoin."
          >
            <TextField
              size="small"
              type="time"
              value={hourNumberToTimeInput(values.checkInTime ?? values.checkInTimeStart)}
              onChange={(e) => upd('checkInTime', e.target.value)}
              sx={sxInput}
              inputProps={{ step: 3600 }}
            />
          </Field>
          <Field label="Heure check-out" required ruField="checkOutTime" hint="Heure de départ (RU CheckOutUntil)">
            <TextField
              size="small"
              type="time"
              value={hourNumberToTimeInput(values.checkOutTime)}
              onChange={(e) => upd('checkOutTime', e.target.value)}
              sx={sxInput}
              inputProps={{ step: 3600 }}
            />
          </Field>
        </Box>
      </Card>

      <Card title="📆 Règles de réservation">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 1.5 }}>
          <Field label="Nuits min" ruField="minStay"><Counter value={values.minNights ?? 2} onChange={v => upd('minNights', v)} /></Field>
          <Field label="Nuits max" ruField="maxStay"><Counter value={values.maxNights ?? 30} onChange={v => upd('maxNights', v)} /></Field>
          <Field label="Préavis arrivée (h)"><NumberInput value={values.advanceNotice ?? 24} suffix="h" onChange={v => upd('advanceNotice', v)} /></Field>
        </Box>
        <ToggleRow title="Instant booking" ruField="instantBookable" desc="Réservation immédiate sans approbation manuelle (recommandé Airbnb Plus)" checked={!!values.instantBooking} onChange={v => upd('instantBooking', v)} />
        <ToggleRow title="Same-day booking" desc="Autorise les réservations le jour même" checked={!!values.sameDayBooking} onChange={v => upd('sameDayBooking', v)} />
      </Card>

      <Card title="📅 Disponibilité avancée">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
          <Field label="Window de réservation (jours)" hint="Combien de jours à l'avance"><NumberInput value={values.bookingWindow ?? 365} suffix="j" onChange={v => upd('bookingWindow', v)} /></Field>
          <Field label="Préparation entre séjours (jours)" hint="Buffer obligatoire"><NumberInput value={values.preparationDays ?? 0} suffix="j" onChange={v => upd('preparationDays', v)} /></Field>
        </Box>
      </Card>
    </Box>
  );
}

/* ════════════════════ Fees & Deposits ════════════════════ */
export function FeesTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  return (
    <Box>
      <RuFormLegend />
      <Card title="🧹 Frais de ménage">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Field label="Frais ménage (forfaitaire)" ruField="cleaningFee" hint="Inclus dans le prix total"><MoneyInput value={values.cleaningFee ?? 80} onChange={v => upd('cleaningFee', v)} currency="€" /></Field>
          <Field label="Mode de facturation"><SelectField value={values.cleaningFeeMode || 'flat'} onChange={v => upd('cleaningFeeMode', v)}
            options={[{ value: 'flat', label: 'Forfaitaire' }, { value: 'per_night', label: 'Par nuit' }, { value: 'per_guest', label: 'Par voyageur' }]} /></Field>
        </Box>
      </Card>

      <Card title="💳 Caution / Dépôt de garantie">
        <ToggleRow title="Caution requise" desc="Pré-autorisation CB ou virement avant arrivée" checked={!!values.depositRequired} onChange={v => upd('depositRequired', v)} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1 }}>
          <Field label="Montant caution" ruField="securityDeposit"><MoneyInput value={values.securityDeposit ?? 500} onChange={v => upd('securityDeposit', v)} currency="€" /></Field>
          <Field label="Type de prélèvement"><SelectField value={values.depositType || 'preauth'} onChange={v => upd('depositType', v)}
            options={[{ value: 'preauth', label: 'Pré-autorisation CB' }, { value: 'wire', label: 'Virement' }, { value: 'cash', label: 'Espèces à l\'arrivée' }]} /></Field>
        </Box>
      </Card>

      <Card title="🧾 Taxes & frais supplémentaires">
        <ToggleRow title="Taxe de séjour" desc="Ajoutée au total · variable selon ville" checked={!!values.cityTaxEnabled} onChange={v => upd('cityTaxEnabled', v)} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mt: 1 }}>
          <Field label="Taxe par adulte/nuit"><MoneyInput value={values.cityTaxPerAdult ?? 3.5} onChange={v => upd('cityTaxPerAdult', v)} currency="€" /></Field>
          <Field label="TVA (%)"><NumberInput value={values.vatRate ?? 10} suffix="%" onChange={v => upd('vatRate', v)} /></Field>
          <Field label="Frais service additionnels"><MoneyInput value={values.additionalServiceFee ?? 0} onChange={v => upd('additionalServiceFee', v)} currency="€" /></Field>
        </Box>
      </Card>

      <Card title="📋 Politique d'annulation" meta="cancellationPolicies[]">
        <Field label="Type d'annulation" ruField="cancellation">
        <ChipsRow single value={values.cancellationPolicy || 'flexible'} onToggle={v => upd('cancellationPolicy', v)}
          items={[
            { id: 'flexible', label: 'Flexible · 24h avant' },
            { id: 'moderate', label: 'Modérée · 5 jours avant' },
            { id: 'strict', label: 'Strict · 14 jours avant' },
            { id: 'super_strict', label: 'Super strict · 30 j' },
            { id: 'non_refundable', label: 'Non remboursable' },
          ]} />
        </Field>
      </Card>
    </Box>
  );
}
