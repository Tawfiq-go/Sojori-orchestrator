// ════════════════════════════════════════════════════════════════════
// DetailTabsDistribution.jsx — Distribution · Rooms · License
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, TextField, Typography, Stack, Button, CircularProgress, Link } from '@mui/material';
import listingsService from '../../../../services/listingsService';
import { useAuth } from '../../../../hooks/useAuth';
import { getAccounById } from '../../../../features/staff/services/serverApi.task';
import { sxInput, Field, Card, ToggleRow, ChipsRow, NumberInput, SelectField, RuFormLegend, T } from './_shared';
import {
  OtaChannelsSnapshotTable,
} from '../utils/ruImportFieldHelpers';
import ListingOwnerSelect from '../components/ListingOwnerSelect';
import { RoomsTab } from './RoomsTabComposition';
export { RoomsTab };

const DIRECT_PAYMENT_METHODS = [
  { id: 'card', label: '💳 Carte bancaire' },
  { id: 'wire', label: '🏦 Virement' },
  { id: 'cash', label: "💵 Espèces à l'arrivée" },
];

const VISIBILITY_CHANNELS = [
  {
    key: 'sojori',
    icon: '🏠',
    title: 'Sojori',
    desc: 'Marketplace sojori.com — visible pour tous les voyageurs Sojori',
  },
  {
    key: 'directBooking',
    icon: '🌐',
    title: 'Direct booking',
    desc: 'Site web du PM (ex. daraway.com) — réservation sans OTA',
  },
  {
    key: 'whatsapp',
    icon: '💬',
    title: 'WhatsApp',
    desc: 'Recherche et réservation via le booking WhatsApp',
  },
  {
    key: 'marketplace',
    icon: '👥',
    title: 'Autres PMs',
    desc: 'Visible dans la vitrine publique pour les autres property managers',
  },
];

function defaultVisibility(values = {}) {
  const vis = values.visibility && typeof values.visibility === 'object' ? values.visibility : {};
  return {
    sojori: vis.sojori !== false,
    directBooking: vis.directBooking !== false,
    whatsapp: vis.whatsapp !== false,
    marketplace: vis.marketplace !== false,
  };
}

function defaultChannelDiscounts(values = {}) {
  const cd =
    values.channelDiscounts && typeof values.channelDiscounts === 'object'
      ? values.channelDiscounts
      : {};
  const legacyDirect = Number(values.directDiscount);
  return {
    sojori: cd.sojori ?? '',
    directBooking:
      cd.directBooking ?? (Number.isFinite(legacyDirect) && legacyDirect > 0 ? legacyDirect : ''),
    whatsapp: cd.whatsapp ?? '',
    marketplace: cd.marketplace ?? '',
  };
}

function normalizePartialMethod(partial = {}) {
  return {
    enabled: partial.enabled === true,
    depositPercent: partial.depositPercent ?? 20,
    allowFullPayment: partial.allowFullPayment !== false,
  };
}

function defaultDirectPayment(values = {}) {
  const dp = values.directPayment && typeof values.directPayment === 'object' ? values.directPayment : {};
  const legacy = Array.isArray(values.directPaymentMethods) ? values.directPaymentMethods : ['card', 'wire', 'cash'];
  const wire = dp.wire && typeof dp.wire === 'object' ? dp.wire : {};
  const partial = dp.partialPayment && typeof dp.partialPayment === 'object' ? dp.partialPayment : {};
  const legacyPartial =
    partial.enabled !== undefined && !partial.card && !partial.wire
      ? normalizePartialMethod(partial)
      : null;
  return {
    methods: Array.isArray(dp.methods) && dp.methods.length ? dp.methods : legacy,
    cashForReturningOnly: dp.cashForReturningOnly === true,
    wire: {
      iban: wire.iban || '',
      bic: wire.bic || '',
      holder: wire.holder || '',
      bankName: wire.bankName || '',
    },
    partialPayment: {
      card: normalizePartialMethod(partial.card || legacyPartial || {}),
      wire: normalizePartialMethod(partial.wire || {}),
    },
  };
}

function PartialPaymentConfig({ title, config, onChange }) {
  return (
    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
      <ToggleRow
        title={title}
        desc="Le client peut payer un pourcentage à la réservation et le reste plus tard"
        checked={config.enabled === true}
        onChange={(v) => onChange({ ...config, enabled: v === true })}
      />
      {config.enabled && (
        <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          <Field label="Acompte à la réservation" hint="% du total">
            <NumberInput
              value={config.depositPercent ?? 20}
              suffix="%"
              onChange={(v) => onChange({ ...config, depositPercent: v })}
            />
          </Field>
          <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <ToggleRow
              title="Le client peut aussi tout payer"
              desc="Sinon, seul l'acompte est proposé à la réservation"
              checked={config.allowFullPayment !== false}
              onChange={(v) => onChange({ ...config, allowFullPayment: v === true })}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

function normalizePmWebsiteUrl(domain) {
  const raw = String(domain || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  return `https://${raw.replace(/\/+$/, '')}`;
}

function listingHasOtaDistribution(values = {}) {
  return (
    values.syncToRentalUnited === true ||
    (Array.isArray(values.rentalUnitedIds) && values.rentalUnitedIds.length > 0)
  );
}

function channelSnapshotKey(ch) {
  return String(ch?.channelId || ch?.channelName || '').trim();
}

/** Conserve les liens saisis à la main si la vérif OTA ne renvoie pas d'URL. */
function mergeOtaSnapshotPreservingManualUrls(previous, incoming) {
  if (!incoming || typeof incoming !== 'object') return incoming;
  const prevChannels = Array.isArray(previous?.channels) ? previous.channels : [];
  const nextChannels = Array.isArray(incoming.channels) ? incoming.channels : [];
  if (!prevChannels.length) return incoming;

  const manualUrls = new Map();
  for (const ch of prevChannels) {
    const url = String(ch?.url || '').trim();
    const key = channelSnapshotKey(ch);
    if (key && url) manualUrls.set(key, url);
  }

  const mergedChannels = nextChannels.length
    ? nextChannels.map((ch) => {
        const key = channelSnapshotKey(ch);
        const incomingUrl = String(ch?.url || '').trim();
        const manualUrl = key ? manualUrls.get(key) : '';
        if (!incomingUrl && manualUrl) return { ...ch, url: manualUrl };
        return ch;
      })
    : [];

  const mergedKeys = new Set(mergedChannels.map(channelSnapshotKey));
  for (const ch of prevChannels) {
    const key = channelSnapshotKey(ch);
    const isManualRow = String(ch?.channelId || '').startsWith('manual-');
    if (isManualRow && key && !mergedKeys.has(key)) {
      mergedChannels.push(ch);
      mergedKeys.add(key);
    }
  }

  return {
    ...incoming,
    channels: mergedChannels.length ? mergedChannels : nextChannels,
  };
}

/* ════════════════════ OTA ════════════════════ */
export function OtaDistributionTab({ values = {}, onChange, listingId }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const otaEnabled = listingHasOtaDistribution(values);
  const [otaRefreshState, setOtaRefreshState] = useState('idle');

  const runOtaChannelVerify = useCallback(async () => {
    if (!listingId || !otaEnabled) return;
    setOtaRefreshState('loading');
    try {
      const result = await listingsService.verifyOtaChannels(listingId);
      const snap =
        result.data && typeof result.data === 'object'
          ? result.data.otaChannelsSnapshot
          : undefined;
      if (result.success && snap && typeof snap === 'object') {
        const merged = mergeOtaSnapshotPreservingManualUrls(values.otaChannelsSnapshot, snap);
        onChange?.({ otaChannelsSnapshot: merged });
        setOtaRefreshState('done');
      } else if (result.success) {
        setOtaRefreshState('done');
      } else {
        setOtaRefreshState('error');
      }
    } catch {
      setOtaRefreshState('error');
    }
  }, [listingId, otaEnabled, onChange, values.otaChannelsSnapshot]);

  const snapshotChannels = values.otaChannelsSnapshot?.channels;
  const hasSnapshot = Array.isArray(snapshotChannels) && snapshotChannels.length > 0;
  const otaLoading = otaRefreshState === 'loading';

  return (
    <Box>
      <Card title="📡 Canaux OTA">
        <ToggleRow
          title="Synchroniser avec les OTA"
          desc="Active la diffusion sur Airbnb, Booking et les autres plateformes connectées."
          ruField="syncToRentalUnited"
          checked={values.syncToRentalUnited === true}
          onChange={(v) => upd('syncToRentalUnited', v)}
        />

        {listingId && otaEnabled ? (
          <Box sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={otaLoading}
              onClick={() => void runOtaChannelVerify()}
              startIcon={otaLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {otaLoading ? 'Vérification en cours…' : 'Vérifier connexion OTA'}
            </Button>
            {otaRefreshState === 'error' ? (
              <Typography sx={{ fontSize: '0.8125rem', color: 'error.main', mt: 1 }}>
                Vérification impossible pour le moment. Réessayez dans quelques instants.
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {hasSnapshot || otaEnabled ? (
          <Box sx={{ mt: 1.5 }}>
            <OtaChannelsSnapshotTable
              snapshot={values.otaChannelsSnapshot}
              clientView
              editable
              onSnapshotChange={(snap) => onChange?.({ otaChannelsSnapshot: snap })}
            />
          </Box>
        ) : (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 1.5 }}>
            La distribution OTA n&apos;est pas encore activée pour cette annonce.
          </Typography>
        )}
      </Card>
    </Box>
  );
}

/* ════════════════════ Direct booking ════════════════════ */
export function DirectBookingTab({ values = {}, onChange, listingId: _listingId }) {
  const { user } = useAuth();
  /** Delta uniquement — handleFormChange fusionne déjà dans le state parent. */
  const upd = (k, v) => onChange?.({ [k]: v });
  const visibility = defaultVisibility(values);
  const channelDiscounts = defaultChannelDiscounts(values);
  const directPayment = defaultDirectPayment(values);
  const directPaymentMethods = directPayment.methods;

  const ownerId = String(values.ownerId || values.owner?._id || user?.id || user?._id || '').trim();

  const [pmWebsite, setPmWebsite] = useState({ domain: '', siteName: '', loading: false });
  const [pmDistributionChannels, setPmDistributionChannels] = useState({
    sojori: true,
    directBooking: true,
    whatsapp: true,
    marketplace: true,
  });

  useEffect(() => {
    if (!ownerId) {
      setPmWebsite({ domain: '', siteName: '', loading: false });
      setPmDistributionChannels({
        sojori: true,
        directBooking: true,
        whatsapp: true,
        marketplace: true,
      });
      return undefined;
    }
    let cancelled = false;
    setPmWebsite((prev) => ({ ...prev, loading: true }));
    void getAccounById(ownerId)
      .then((res) => {
        if (cancelled) return;
        const profile = res?.data?.account?.pmProfile ?? res?.account?.pmProfile ?? {};
        const dc = profile.distributionChannels || {};
        const db = profile.directBooking ?? {};
        setPmDistributionChannels({
          sojori: dc.sojori !== false,
          directBooking: dc.directBooking !== false,
          whatsapp: dc.whatsapp !== false,
          marketplace: dc.marketplace !== false,
        });
        setPmWebsite({
          domain: String(db.domain || '').trim(),
          siteName: String(db.siteName || profile.publicName || '').trim(),
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPmWebsite({ domain: '', siteName: '', loading: false });
          setPmDistributionChannels({
            sojori: true,
            directBooking: true,
            whatsapp: true,
            marketplace: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const websiteUrl = useMemo(() => normalizePmWebsiteUrl(pmWebsite.domain), [pmWebsite.domain]);

  const setVisibility = (key, checked) => {
    const next = { ...visibility, [key]: checked === true };
    upd('visibility', next);
  };

  const setChannelDiscount = (key, value) => {
    const next = { ...channelDiscounts, [key]: value };
    upd('channelDiscounts', next);
  };

  const setDirectPayment = (patch) => {
    const nextPartial = patch.partialPayment
      ? {
          card: patch.partialPayment.card
            ? { ...directPayment.partialPayment.card, ...patch.partialPayment.card }
            : directPayment.partialPayment.card,
          wire: patch.partialPayment.wire
            ? { ...directPayment.partialPayment.wire, ...patch.partialPayment.wire }
            : directPayment.partialPayment.wire,
        }
      : directPayment.partialPayment;
    const next = {
      ...directPayment,
      ...patch,
      wire: { ...directPayment.wire, ...(patch.wire || {}) },
      partialPayment: nextPartial,
    };
    onChange?.({
      directPayment: next,
      ...(Array.isArray(next.methods) ? { directPaymentMethods: next.methods } : {}),
    });
  };

  return (
    <Box>
      <RuFormLegend />
      <ListingOwnerSelect values={values} onChange={onChange} />

      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 2, lineHeight: 1.55 }}>
        Choisissez sur quels canaux ce listing est visible et comment le client peut réserver et payer
        (site PM, Sojori, WhatsApp, catalogue inter-PM).
      </Typography>

      <Card title="📍 Où afficher ce listing ?">
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 1.25 }}>
          Activez chaque canal et définissez une remise dédiée (ex. −5% sur Sojori, −10% en direct booking).
        </Typography>
        <Stack gap={1.25}>
          {VISIBILITY_CHANNELS.map((channel) => {
            const pmAllows = pmDistributionChannels[channel.key] !== false;
            return (
            <Box
              key={channel.key}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 140px' },
                gap: 1,
                alignItems: 'center',
                py: 0.5,
                opacity: pmAllows ? 1 : 0.55,
              }}
            >
              <ToggleRow
                title={`${channel.icon} ${channel.title}`}
                desc={
                  pmAllows
                    ? channel.desc
                    : `${channel.desc} — canal non autorisé pour ce PM (admin → Canaux distribution)`
                }
                checked={pmAllows && visibility[channel.key] !== false}
                onChange={(v) => pmAllows && setVisibility(channel.key, v)}
              />
              <Field label="Remise" hint="0 = aucune">
                <NumberInput
                  value={channelDiscounts[channel.key] ?? ''}
                  suffix="%"
                  onChange={(v) => pmAllows && setChannelDiscount(channel.key, v)}
                />
              </Field>
            </Box>
          );
          })}
        </Stack>
      </Card>

      <Card title="🌍 Site web du PM">
        {pmWebsite.loading ? (
          <Stack direction="row" alignItems="center" gap={1}>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              Chargement du site…
            </Typography>
          </Stack>
        ) : websiteUrl ? (
          <Box>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 0.75 }}>
              {pmWebsite.siteName ? `${pmWebsite.siteName} — ` : ''}
              Site hébergé par Sojori (direct booking)
            </Typography>
            <Link
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ fontWeight: 700, fontSize: '0.9375rem', wordBreak: 'break-all' }}
            >
              {websiteUrl}
            </Link>
            {!visibility.directBooking && (
              <Typography sx={{ fontSize: '0.75rem', color: 'warning.main', mt: 1 }}>
                Ce listing n&apos;apparaîtra pas sur ce site tant que « Direct booking » est désactivé.
              </Typography>
            )}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            Aucun domaine configuré. Configurez le site dans{' '}
            <Link href="/direct-booking/config" target="_blank" rel="noopener noreferrer">
              Direct booking → Configuration
            </Link>
            .
          </Typography>
        )}
      </Card>

      <Card title="💳 Paiement direct booking">
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 1.25 }}>
          Moyens acceptés sur le site PM et sojori.com. Affichés au checkout client.
        </Typography>
        <ChipsRow
          value={directPaymentMethods}
          onToggle={(v) => {
            const next = directPaymentMethods.includes(v)
              ? directPaymentMethods.filter((x) => x !== v)
              : [...directPaymentMethods, v];
            setDirectPayment({ methods: next.length ? next : ['card'] });
          }}
          items={DIRECT_PAYMENT_METHODS}
        />

        <Box sx={{ mt: 1.5 }}>
          <ToggleRow
            title="Cash réservé aux clients récurrents"
            desc="Espèces uniquement pour les voyageurs ayant déjà une réservation confirmée chez ce PM"
            checked={directPayment.cashForReturningOnly === true}
            onChange={(v) => setDirectPayment({ cashForReturningOnly: v === true })}
          />
        </Box>

        {directPaymentMethods.includes('wire') && (
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            <Field label="Titulaire du compte">
              <TextField
                size="small"
                value={directPayment.wire.holder}
                onChange={(e) => setDirectPayment({ wire: { holder: e.target.value } })}
                sx={sxInput}
              />
            </Field>
            <Field label="Banque">
              <TextField
                size="small"
                value={directPayment.wire.bankName}
                onChange={(e) => setDirectPayment({ wire: { bankName: e.target.value } })}
                sx={sxInput}
              />
            </Field>
            <Field label="IBAN" hint="Affiché au client si virement sélectionné">
              <TextField
                size="small"
                value={directPayment.wire.iban}
                onChange={(e) => setDirectPayment({ wire: { iban: e.target.value } })}
                placeholder="MA64 …"
                sx={sxInput}
              />
            </Field>
            <Field label="BIC (optionnel)">
              <TextField
                size="small"
                value={directPayment.wire.bic}
                onChange={(e) => setDirectPayment({ wire: { bic: e.target.value } })}
                sx={sxInput}
              />
            </Field>
          </Box>
        )}

        {directPaymentMethods.includes('card') && (
          <PartialPaymentConfig
            title="Paiement partiel — carte bancaire"
            config={directPayment.partialPayment.card}
            onChange={(cfg) => setDirectPayment({ partialPayment: { card: cfg } })}
          />
        )}

        {directPaymentMethods.includes('wire') && (
          <PartialPaymentConfig
            title="Paiement partiel — virement"
            config={directPayment.partialPayment.wire}
            onChange={(cfg) => setDirectPayment({ partialPayment: { wire: cfg } })}
          />
        )}
      </Card>
    </Box>
  );
}

/* ════════════════════ Distribution OTA (parent) ════════════════════ */
export function DistributionTab({ values = {}, onChange, listingId }) {
  const common = { values, onChange, listingId };

  return (
    <Box>
      <RuFormLegend />
      <ListingOwnerSelect values={values} onChange={onChange} />
      <OtaDistributionTab {...common} />
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
