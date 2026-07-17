// ════════════════════════════════════════════════════════════════════
// DetailTabsCommercial.jsx — Pricing · Availability · Fees & Deposits
// À brancher dans `renderTab` du ListingFormShell.
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Paper,
  IconButton,
  Button,
} from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';
import { hourNumberToTimeInput } from '../../../../utils/listingTimeHelpers';
import {
  buildRuFeeSummaryLine,
  formatCancellationPolicySummary,
  formatDepositRuLabel,
  getOtherRuAdditionalFees,
} from '../../../../utils/listingRuFeesDisplay';
import { CANCELLATION_POLICY_PRESET_LABELS } from '../../../../utils/listingCancellationPolicyPresets';
import { T, sxInput, Field, Card, SectionH, ToggleRow, Counter, ChipsRow, NumberInput, MoneyInput, SelectField, RuFormLegend } from './_shared';
import {
  InfoSectionField,
  LocalizedRowsField,
  RuPaymentMethodsDisplay,
  TimeFeesEditor,
  isRuPaymentMethodsArray,
} from '../utils/ruImportFieldHelpers';

const INSTANT_BOOKING_MODE_OPTIONS = [
  { value: 'everyone', label: 'Tous les voyageurs' },
  { value: 'well_reviewed_guests', label: 'Voyageurs bien notés' },
  { value: 'verified_identity', label: 'Identité vérifiée' },
  { value: 'well_reviewed_verified', label: 'Bien notés + identité vérifiée' },
];

const CHECK_IN_METHOD_OPTIONS = [
  { value: '', label: '— Non défini —' },
  { value: 'host', label: 'Accueil par l\'hôte' },
  { value: 'lockbox', label: 'Boîte à clés' },
  { value: 'keypad', label: 'Clavier / code' },
  { value: 'doorman', label: 'Concierge / gardien' },
  { value: 'smartlock', label: 'Serrure connectée' },
  { value: 'other', label: 'Autre' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function plusYearIso() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function DiscountDateField({ value, onChange }) {
  return (
    <TextField
      size="small"
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      sx={sxInput}
      InputLabelProps={{ shrink: true }}
    />
  );
}

function LongStayDiscountsEditor({ rows = [], onChange }) {
  const updRow = (idx, patch) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx));
  const addRow = () =>
    onChange([
      ...rows,
      {
        from: todayIso(),
        to: plusYearIso(),
        adjustment: -10,
        bigger: 7,
        smaller: 28,
        active: true,
      },
    ]);

  return (
    <Box>
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 1 }}>
          Aucune remise configurée.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((row, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                  <Field label="Date de début">
                    <DiscountDateField value={row.from} onChange={(v) => updRow(idx, { from: v })} />
                  </Field>
                  <Field label="Date de fin">
                    <DiscountDateField value={row.to} onChange={(v) => updRow(idx, { to: v })} />
                  </Field>
                  <Field label="Remise (%)">
                    <NumberInput
                      value={row.adjustment ?? 0}
                      suffix="%"
                      onChange={(v) => updRow(idx, { adjustment: Number(v) || 0 })}
                    />
                  </Field>
                  <Field label="Séjour min. (nuits)">
                    <NumberInput value={row.bigger ?? 7} onChange={(v) => updRow(idx, { bigger: Number(v) || 0 })} />
                  </Field>
                  <Field label="Séjour max. (nuits)">
                    <NumberInput value={row.smaller ?? 28} onChange={(v) => updRow(idx, { smaller: Number(v) || 0 })} />
                  </Field>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.25 }}>
                    <ToggleRow
                      title="Active"
                      checked={row.active !== false}
                      onChange={(v) => updRow(idx, { active: v })}
                    />
                  </Box>
                </Box>
                <IconButton size="small" color="error" onClick={() => removeRow(idx)} aria-label="Supprimer">
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <Button size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1 }}>
        Ajouter une remise long séjour
      </Button>
    </Box>
  );
}

function LastMinuteDiscountsEditor({ rows = [], onChange }) {
  const updRow = (idx, patch) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx));
  const addRow = () =>
    onChange([
      ...rows,
      {
        from: todayIso(),
        to: plusYearIso(),
        adjustment: -15,
        DaysToArrivalFrom: 0,
        DaysToArrivalTo: 3,
        active: true,
      },
    ]);

  return (
    <Box>
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 1 }}>
          Aucune remise configurée.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((row, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                  <Field label="Date de début">
                    <DiscountDateField value={row.from} onChange={(v) => updRow(idx, { from: v })} />
                  </Field>
                  <Field label="Date de fin">
                    <DiscountDateField value={row.to} onChange={(v) => updRow(idx, { to: v })} />
                  </Field>
                  <Field label="Remise (%)">
                    <NumberInput
                      value={row.adjustment ?? 0}
                      suffix="%"
                      onChange={(v) => updRow(idx, { adjustment: Number(v) || 0 })}
                    />
                  </Field>
                  <Field label="Délai min. avant arrivée (j)">
                    <NumberInput
                      value={row.DaysToArrivalFrom ?? 0}
                      suffix="j"
                      onChange={(v) => updRow(idx, { DaysToArrivalFrom: Number(v) || 0 })}
                    />
                  </Field>
                  <Field label="Délai max. avant arrivée (j)">
                    <NumberInput
                      value={row.DaysToArrivalTo ?? 3}
                      suffix="j"
                      onChange={(v) => updRow(idx, { DaysToArrivalTo: Number(v) || 0 })}
                    />
                  </Field>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.25 }}>
                    <ToggleRow
                      title="Active"
                      checked={row.active !== false}
                      onChange={(v) => updRow(idx, { active: v })}
                    />
                  </Box>
                </Box>
                <IconButton size="small" color="error" onClick={() => removeRow(idx)} aria-label="Supprimer">
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <Button size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1 }}>
        Ajouter une remise last minute
      </Button>
    </Box>
  );
}

/* ════════════════════ Pricing ════════════════════ */
export function PricingTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const currency = values.currencyCode || 'MAD';
  const isMulti = values.propertyUnit === 'Multi';
  const roomTypes = Array.isArray(values.roomTypes) ? values.roomTypes : [];

  const patchRoomTypePrice = (index, price) => {
    const next = roomTypes.map((rt, i) =>
      i === index ? { ...rt, basePrice: price } : { ...rt },
    );
    onChange?.({ ...values, roomTypes: next });
  };

  if (isMulti) {
    return (
      <Box>
        <RuFormLegend />
        <Card title="💰 Prix par type de chambre" meta={`${roomTypes.length} types`}>
          <Typography sx={{ fontSize: 12.5, color: T.text2, mb: 1.75, lineHeight: 1.45 }}>
            Chaque <b>RoomType</b> a son tarif (poussé vers la Property RU correspondante).
            Pas de prix unique listing — Standard / Suite / Palace peuvent différer.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {roomTypes.map((rt, i) => (
              <Box
                key={String(rt._id || rt.roomTypeName || i)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr auto' },
                  gap: 1.25,
                  alignItems: 'center',
                  p: 1.25,
                  borderRadius: '10px',
                  border: `1px solid ${T.border}`,
                  bgcolor: T.bg2,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                    {rt.roomTypeName || `Type ${i + 1}`}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
                    ×{Math.max(1, Number(rt.roomNumber) || 1)} unités
                  </Typography>
                </Box>
                <Field label="Prix / nuit" required ruField="basePrice">
                  <MoneyInput
                    value={rt.basePrice}
                    onChange={(v) => patchRoomTypePrice(i, v)}
                    currency={currency}
                  />
                </Field>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.primaryDeep, textAlign: 'right' }}>
                  {Number(rt.basePrice) || 0} {currency}
                </Typography>
              </Box>
            ))}
            {roomTypes.length === 0 && (
              <Typography sx={{ fontSize: 12.5, color: T.text3 }}>
                Aucun type — ajoutez-en dans Infos bâtiment.
              </Typography>
            )}
          </Box>
        </Card>

        <Card title="Devise & pricing dynamique">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
            <Field label="Devise" required ruField="currencyCode">
              <SelectField value={values.currencyCode || ''} onChange={v => upd('currencyCode', v)}
                options={[{ value: 'EUR', label: '€ EUR' }, { value: 'MAD', label: 'DH MAD' }, { value: 'USD', label: '$ USD' }, { value: 'GBP', label: '£ GBP' }]} />
            </Field>
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <ToggleRow
              title="Activer le pricing dynamique"
              desc="Règles calendrier — une ligne par RoomType si le moteur le permet."
              checked={!!values.dynamicPricing}
              onChange={v => upd('dynamicPricing', v)}
            />
          </Box>
        </Card>

        <Card>
          <Field label="Remises long séjour" ruField="longStayDiscounts" fullWidth>
            <LongStayDiscountsEditor
              rows={values.longStayDiscounts || []}
              onChange={(rows) => upd('longStayDiscounts', rows)}
            />
          </Field>
        </Card>

        <Card>
          <Field label="Remises last minute" ruField="lastMinuteDiscount" fullWidth>
            <LastMinuteDiscountsEditor
              rows={values.lastMinuteDiscount || []}
              onChange={(rows) => upd('lastMinuteDiscount', rows)}
            />
          </Field>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <RuFormLegend />
      <Card title="💰 Prix de base">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          <Field label="Prix par nuit" required ruField="basePrice">
            <MoneyInput value={values.basePrice} onChange={v => upd('basePrice', v)} currency={currency} />
          </Field>
          <Field label="Devise" required ruField="currencyCode">
            <SelectField value={values.currencyCode || ''} onChange={v => upd('currencyCode', v)}
              options={[{ value: 'EUR', label: '€ EUR' }, { value: 'MAD', label: 'DH MAD' }, { value: 'USD', label: '$ USD' }, { value: 'GBP', label: '£ GBP' }]} />
          </Field>
          {values.weekendPrice != null && values.weekendPrice > 0 ? (
            <Field label="Prix week-end" ruField="extra" hint="Override Ven/Sam">
              <MoneyInput value={values.weekendPrice} onChange={v => upd('weekendPrice', v)} currency={currency} />
            </Field>
          ) : null}
        </Box>
      </Card>

      <Card title="Pricing dynamique">
        <ToggleRow
          title="Activer le pricing dynamique"
          desc="Applique les règles tarifaires du calendrier sur les canaux."
          checked={!!values.dynamicPricing}
          onChange={v => upd('dynamicPricing', v)}
        />
      </Card>

      <Card>
        <Field label="Remises long séjour" ruField="longStayDiscounts" fullWidth>
          <LongStayDiscountsEditor
            rows={values.longStayDiscounts || []}
            onChange={(rows) => upd('longStayDiscounts', rows)}
          />
        </Field>
      </Card>

      <Card>
        <Field label="Remises last minute" ruField="lastMinuteDiscount" fullWidth>
          <LastMinuteDiscountsEditor
            rows={values.lastMinuteDiscount || []}
            onChange={(rows) => upd('lastMinuteDiscount', rows)}
          />
        </Field>
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
      <Card title="🚪 Check-in / Check-out">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          <Field
            label="Check-in dès"
            required
            ruField="checkInTimeStart"
          >
            <TextField
              size="small"
              type="time"
              value={hourNumberToTimeInput(values.checkInTime ?? values.checkInTimeStart)}
              onChange={(e) => upd('checkInTime', e.target.value)}
              sx={sxInput}
              slotProps={{ htmlInput: { step: 3600 } }}
            />
          </Field>
          <Field
            label="Check-in jusqu'à"
            required
            ruField="checkInTimeEnd"
          >
            <TextField
              size="small"
              type="time"
              value={hourNumberToTimeInput(values.checkInTimeEnd)}
              onChange={(e) => upd('checkInTimeEnd', e.target.value)}
              sx={sxInput}
              slotProps={{ htmlInput: { step: 3600 } }}
            />
          </Field>
          <Field label="Check-out avant" required ruField="checkOutTime">
            <TextField
              size="small"
              type="time"
              value={hourNumberToTimeInput(values.checkOutTime)}
              onChange={(e) => upd('checkOutTime', e.target.value)}
              sx={sxInput}
              slotProps={{ htmlInput: { step: 3600 } }}
            />
          </Field>
        </Box>
      </Card>

      <Card title="🛡️ Règles & réservation">
        <ToggleRow
          title="Réservation instantanée"
          ruField="instantBookable"
          checked={!!values.instantBooking}
          onChange={(v) => {
            onChange?.({
              ...values,
              instantBooking: v,
              instantBookingMode: v ? (values.instantBookingMode && values.instantBookingMode !== 'off' ? values.instantBookingMode : 'everyone') : 'off',
            });
          }}
        />
        {values.instantBooking ? (
          <Box sx={{ mb: 1.5, pl: 0.5 }}>
            <Field label="Éligibilité" ruField="instantBookable">
              <SelectField
                value={values.instantBookingMode || 'everyone'}
                onChange={(v) => upd('instantBookingMode', v)}
                options={INSTANT_BOOKING_MODE_OPTIONS}
              />
            </Field>
          </Box>
        ) : null}
        <Field label="Méthode de check-in" ruField="checkInMethod">
          <SelectField
            value={values.checkInMethod || ''}
            onChange={(v) => upd('checkInMethod', v)}
            options={CHECK_IN_METHOD_OPTIONS}
          />
        </Field>
        <ToggleRow
          title="Animaux acceptés"
          ruField="petsAllowed"
          checked={!!values.petsAllowed}
          onChange={(v) => upd('petsAllowed', v)}
        />
        {values.petsAllowed ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 1 }}>
            <ToggleRow
              title="Animaux payants"
              checked={!!values.petsPaid}
              onChange={(v) => upd('petsPaid', v)}
            />
            {values.petsMax != null ? (
              <Field label="Nombre max d'animaux" ruField="petsMax">
                <Counter value={values.petsMax} onChange={(v) => upd('petsMax', v)} min={1} max={10} />
              </Field>
            ) : null}
          </Box>
        ) : null}
        <ToggleRow
          title="Enfants autorisés"
          ruField="childrenAllowed"
          checked={values.childrenAllowed !== false}
          onChange={(v) => upd('childrenAllowed', v)}
        />
        <ToggleRow
          title="Bébés autorisés"
          ruField="infantsAllowed"
          checked={values.infantsAllowed !== false}
          onChange={(v) => upd('infantsAllowed', v)}
        />
        <ToggleRow
          title="Fumeur autorisé"
          ruField="smokingAllowed"
          checked={!!values.smokingAllowed}
          onChange={(v) => upd('smokingAllowed', v)}
        />
        <ToggleRow
          title="Évènements autorisés"
          ruField="eventsAllowed"
          checked={!!values.eventsAllowed}
          onChange={(v) => upd('eventsAllowed', v)}
        />
      </Card>

      <Card title="📆 Règles de réservation">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 1.5 }}>
          <Field label="Nuits min" ruField="minStay"><Counter value={values.minNights ?? 1} onChange={v => upd('minNights', v)} /></Field>
          <Field label="Nuits max" ruField="maxStay"><Counter value={values.maxNights ?? 365} onChange={v => upd('maxNights', v)} /></Field>
          <Field
            label="Temps de préparation (h)"
            ruField="preparationTimeBeforeArrival"
          >
            <NumberInput value={values.advanceNotice ?? ''} suffix="h" onChange={v => upd('advanceNotice', v)} />
          </Field>
        </Box>
      </Card>

      <Card title="🧳 Instructions d'arrivée">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          <Field label="Jours avant arrivée" ruField="daysBeforeArrival" fullWidth>
            <TextField
              size="small"
              type="number"
              fullWidth
              value={values.daysBeforeArrival ?? ''}
              onChange={(e) =>
                upd('daysBeforeArrival', e.target.value === '' ? 0 : Number(e.target.value))
              }
              sx={sxInput}
            />
          </Field>
          <Field label="Contact sur place" ruField="arrivalLandlord" fullWidth>
            <TextField
              size="small"
              fullWidth
              value={values.arrivalLandlord || ''}
              onChange={(e) => upd('arrivalLandlord', e.target.value)}
              sx={sxInput}
            />
          </Field>
          <Field label="Email arrivée" ruField="arrivalEmail" fullWidth>
            <TextField
              size="small"
              fullWidth
              value={values.arrivalEmail || ''}
              onChange={(e) => upd('arrivalEmail', e.target.value)}
              sx={sxInput}
            />
          </Field>
          <Field label="Téléphone arrivée" ruField="arrivalPhone" fullWidth>
            <TextField
              size="small"
              fullWidth
              value={values.arrivalPhone || ''}
              onChange={(e) => upd('arrivalPhone', e.target.value)}
              sx={sxInput}
            />
          </Field>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <LocalizedRowsField
            label="Comment arriver"
            ruField="howToArrive"
            value={values.howToArrive}
            onChange={(v) => upd('howToArrive', v)}
            minRows={3}
          />
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <LocalizedRowsField
            label="Service de prise en charge"
            ruField="pickupService"
            value={values.pickupService}
            onChange={(v) => upd('pickupService', v)}
            minRows={2}
          />
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <InfoSectionField
            label="Accès & transport"
            ruField="transport"
            value={values.transport}
            onChange={(v) => upd('transport', v)}
            minRows={2}
          />
        </Box>
      </Card>
    </Box>
  );
}

/* ════════════════════ Fees & Deposits ════════════════════ */
export function FeesTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const currency = values.currencyCode || 'MAD';
  const otherRuFees = getOtherRuAdditionalFees(values);

  const patchAdditionalFee = (kind, patch) => {
    const fees = [...(values.additionalFees || [])];
    const idx = fees.findIndex((f) => f.feeTaxType === kind);
    if (idx >= 0) fees[idx] = { ...fees[idx], ...patch };
    else {
      fees.push({
        feeTaxType: kind,
        category: 'fee',
        ruName: kind === 'resort_fee' ? 'ResortFee' : kind,
        discriminatorId: '1',
        value: 0,
        enabled: false,
        ...patch,
      });
    }
    upd('additionalFees', fees);
  };

  const removeAdditionalFee = (kind) => {
    upd(
      'additionalFees',
      (values.additionalFees || []).filter((f) => f.feeTaxType !== kind),
    );
  };

  // Discriminators RU (modes de calcul)
  const discriminatorOptions = [
    { value: '1', label: 'Forfait par séjour' },
    { value: '2', label: 'Par nuit' },
    { value: '5', label: 'Par personne (séjour)' },
    { value: '6', label: 'Par personne/nuit' },
    { value: '7', label: 'Par personne/semaine' },
    { value: '8', label: 'Par semaine' },
  ];

  return (
    <Box>
      <RuFormLegend />

      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 2 }}>
        Activez chaque frais pour l&apos;inclure dans la synchronisation vers les canaux de distribution.
        Les montants importés sont pré-remplis ; vous pouvez les modifier avant enregistrement.
      </Typography>

      <Card title="🧹 Frais de ménage">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 2, alignItems: 'center' }}>
          <ToggleRow
            title="Activer"
            desc="Inclure dans la synchronisation OTA"
            checked={!!values.cleaningFeeEnabled}
            onChange={v => upd('cleaningFeeEnabled', v)}
          />
          {values.cleaningFeeEnabled ? (
            <>
              <Field label="Montant" ruField="additionalFees">
                <MoneyInput
                  value={values.cleaningFee ?? 0}
                  onChange={v => upd('cleaningFee', v)}
                  currency={currency}
                />
              </Field>
              <Field label="Mode de calcul" ruField="additionalFees">
                <SelectField
                  value={values.cleaningFeeDiscriminator || '1'}
                  onChange={v => upd('cleaningFeeDiscriminator', v)}
                  options={discriminatorOptions}
                />
              </Field>
            </>
          ) : (
            <Box sx={{ gridColumn: 'span 2', color: 'text.secondary', fontSize: '0.875rem' }}>
              Désactivé — non synchronisé
            </Box>
          )}
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
          {buildRuFeeSummaryLine(
            'cleaning',
            !!values.cleaningFeeEnabled,
            values.cleaningFeeDiscriminator,
            values.cleaningFee,
            currency,
          )}
        </Typography>
      </Card>

      <Card title="🧾 Taxe de séjour">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 2, alignItems: 'center' }}>
          <ToggleRow
            title="Activer"
            desc="Inclure dans la synchronisation OTA"
            checked={!!values.cityTaxEnabled}
            onChange={v => upd('cityTaxEnabled', v)}
          />
          {values.cityTaxEnabled ? (
            <>
              <Field label="Montant" ruField="additionalFees">
                <MoneyInput
                  value={values.cityTaxPerAdult ?? 0}
                  onChange={v => upd('cityTaxPerAdult', v)}
                  currency={currency}
                />
              </Field>
              <Field label="Mode de calcul" ruField="additionalFees">
                <SelectField
                  value={values.cityTaxDiscriminator || '6'}
                  onChange={v => upd('cityTaxDiscriminator', v)}
                  options={discriminatorOptions}
                />
              </Field>
            </>
          ) : (
            <Box sx={{ gridColumn: 'span 2', color: 'text.secondary', fontSize: '0.875rem' }}>
              Désactivé — non synchronisé
            </Box>
          )}
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
          {buildRuFeeSummaryLine(
            'city_tax',
            !!values.cityTaxEnabled,
            values.cityTaxDiscriminator,
            values.cityTaxPerAdult,
            currency,
          )}
        </Typography>
        {values.cityTaxEnabled && (
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              Mode de collecte :
            </Typography>
            <SelectField
              value={values.cityTaxCollectionMode || 'on_table'}
              onChange={v => upd('cityTaxCollectionMode', v)}
              options={[
                { value: 'on_table', label: 'Sur place' },
                { value: 'pre_paid', label: 'Pré-payé' }
              ]}
            />
          </Box>
        )}
      </Card>

      {otherRuFees.map((row) => (
        <Card key={row.kind} title={`📋 ${row.nameFr}`}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto', gap: 2, alignItems: 'center' }}>
            <ToggleRow
              title="Activer"
              desc="Inclure dans la synchronisation OTA"
              checked={!!row.enabled}
              onChange={(v) => patchAdditionalFee(row.kind, { enabled: v, value: v ? (row.value || 0) : 0 })}
            />
            {row.enabled ? (
              <>
                <Field label="Montant" ruField="additionalFees">
                  <MoneyInput
                    value={row.value ?? 0}
                    onChange={(v) => patchAdditionalFee(row.kind, { enabled: true, value: v })}
                    currency={currency}
                  />
                </Field>
                <Field label="Mode de calcul" ruField="additionalFees">
                  <SelectField
                    value={row.discriminatorId || '1'}
                    onChange={(v) => patchAdditionalFee(row.kind, { discriminatorId: v })}
                    options={discriminatorOptions}
                  />
                </Field>
              </>
            ) : (
              <Box sx={{ gridColumn: 'span 2', color: 'text.secondary', fontSize: '0.875rem' }}>
                Désactivé — non synchronisé
              </Box>
            )}
            <IconButton
              size="small"
              color="error"
              aria-label="Supprimer le frais"
              onClick={() => removeAdditionalFee(row.kind)}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
            {row.nameFr} · {row.calcLabel} · {row.value} {currency} · Lors de la réservation
          </Typography>
        </Card>
      ))}

      <Card title="💰 Arrhes">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, alignItems: 'center' }}>
          <ToggleRow
            title="Activer les arrhes"
            desc="Montant demandé à la réservation"
            checked={!!values.bookingDepositEnabled}
            onChange={(v) => {
              onChange?.({
                ...values,
                bookingDepositEnabled: v,
                bookingDeposit: v ? values.bookingDeposit : 0,
              });
            }}
          />
          {values.bookingDepositEnabled ? (
            <Field label="Montant arrhes" ruField="deposit">
              <MoneyInput
                value={values.bookingDeposit ?? 0}
                onChange={(v) => {
                  onChange?.({
                    ...values,
                    bookingDeposit: v,
                    bookingDepositEnabled: Number(v) > 0,
                  });
                }}
                currency={currency}
              />
            </Field>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              Désactivé — aucun montant à la réservation
            </Typography>
          )}
        </Box>
        {values.bookingDepositEnabled && Number(values.bookingDeposit) > 0 ? (
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
            {formatDepositRuLabel(values.bookingDeposit, currency)}
          </Typography>
        ) : null}
      </Card>

      <Card title="💳 Caution / Dépôt de garantie">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, alignItems: 'center' }}>
          <ToggleRow
            title="Activer la caution"
            desc="Dépôt de garantie sur le séjour"
            checked={!!values.depositRequired}
            onChange={(v) => {
              onChange?.({
                ...values,
                depositRequired: v,
                securityDeposit: v ? values.securityDeposit : 0,
              });
            }}
          />
          {values.depositRequired ? (
            <Field label="Montant caution" ruField="securityDeposit">
              <MoneyInput
                value={values.securityDeposit ?? 0}
                onChange={(v) => {
                  onChange?.({
                    ...values,
                    securityDeposit: v,
                    depositRequired: Number(v) > 0,
                  });
                }}
                currency={currency}
              />
            </Field>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              Désactivé — caution non requise
            </Typography>
          )}
        </Box>
        {values.depositRequired && Number(values.securityDeposit) > 0 ? (
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
            {formatDepositRuLabel(values.securityDeposit, currency)}
          </Typography>
        ) : null}
      </Card>

      <Card title="📋 Politique d'annulation">
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 1.5 }}>
          {formatCancellationPolicySummary(values.cancellationPolicies)}
        </Typography>
        {values.cancellationPolicyIsCustom ? (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 1 }}>
            Politique personnalisée importée depuis Airbnb / Booking — aucun préréglage Sojori ne correspond exactement.
            {values.cancellationPolicySuggested ? (
              <>
                {' '}
                Suggestion :{' '}
                <strong>
                  {CANCELLATION_POLICY_PRESET_LABELS[values.cancellationPolicySuggested] ||
                    values.cancellationPolicySuggested}
                </strong>
                .
              </>
            ) : null}
          </Typography>
        ) : null}
        <Field label="Préréglage" ruField="cancellation">
        <ChipsRow
          single
          value={values.cancellationPolicy === 'custom' ? '' : (values.cancellationPolicy || '')}
          suggested={values.cancellationPolicyIsCustom ? values.cancellationPolicySuggested : null}
          onToggle={v => upd('cancellationPolicy', v)}
          items={[
            { id: 'flexible', label: 'Flexible · 24h avant' },
            { id: 'moderate', label: 'Modérée · 5 jours avant' },
            { id: 'strict', label: 'Strict · 14 jours avant' },
            { id: 'super_strict', label: 'Super strict · 30 j' },
            { id: 'non_refundable', label: 'Non remboursable' },
          ]} />
        </Field>
        <Box sx={{ mt: 1.5 }}>
          <InfoSectionField
            label="Texte d'annulation importé"
            ruField="policy"
            value={values.policy}
            onChange={(v) => upd('policy', v)}
            minRows={2}
          />
        </Box>
      </Card>

      <Card title="⏰ Frais horaires">
        <Field label="Arrivée tardive" ruField="ruLateArrivalFees" fullWidth>
          <TimeFeesEditor
            label=""
            hideHeader
            rows={values.ruLateArrivalFees}
            currency={currency}
            onChange={(rows) => upd('ruLateArrivalFees', rows)}
          />
        </Field>
        <Field label="Départ anticipé" ruField="ruEarlyDepartureFees" fullWidth>
          <TimeFeesEditor
            label=""
            hideHeader
            rows={values.ruEarlyDepartureFees}
            currency={currency}
            onChange={(rows) => upd('ruEarlyDepartureFees', rows)}
          />
        </Field>
      </Card>

      {isRuPaymentMethodsArray(values.paymentMethods) && (
        <Card title="💳 Moyens de paiement OTA" meta="Canal Airbnb / OTA">
          <RuPaymentMethodsDisplay rows={values.paymentMethods} ruField="paymentMethods" />
        </Card>
      )}
    </Box>
  );
}
