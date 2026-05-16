// ════════════════════════════════════════════════════════════════════
// DetailTabsDistribution.jsx — Channel Mgmt · Direct Booking · Rooms · License
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, TextField, Button, IconButton, Avatar } from '@mui/material';
import { T, sxInput, Field, Card, ToggleRow, Counter, ChipsRow, NumberInput, SelectField, GlobalBanner } from './_shared';

/* ════════════════════ Channel Management ════════════════════ */
const OTA_PROVIDERS = [
  { id: 'airbnb',  name: 'Airbnb',     color: '#FF5A5F', logo: 'A' },
  { id: 'booking', name: 'Booking.com', color: '#003580', logo: 'B' },
  { id: 'vrbo',    name: 'Vrbo',       color: '#0E64A4', logo: 'V' },
  { id: 'expedia', name: 'Expedia',    color: '#FECC00', logo: 'E' },
];
const SYNC_STATUS_META = {
  ok:      { label: 'Synced', color: T.success, dot: T.success },
  pending: { label: 'En cours', color: T.warning, dot: T.warning },
  error:   { label: 'Erreur', color: T.error, dot: T.error },
  off:     { label: 'Désactivé', color: T.text3, dot: T.text4 },
};

// Rental United OTA Distribution Panel Component
const RentalUnitedOtaPanel = ({ ruPropertyKey, otaChannelsSnapshot, onVerifyClick, verifyLoading }) => {
  const channels = otaChannelsSnapshot?.channels || [];
  const updatedAt = otaChannelsSnapshot?.updatedAt;

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return T.success;
      case 'pending': return T.warning;
      case 'error': return T.error;
      default: return T.text3;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'online': return 'En ligne';
      case 'pending': return 'En attente';
      case 'error': return 'Erreur';
      default: return 'Non connecté';
    }
  };

  const getCmStatusColor = (status) => {
    const s = String(status ?? '').trim().toLowerCase();
    if (s === 'ok') return T.success;
    if (s === 'error') return T.error;
    if (s === 'inactive') return T.text3;
    if (s) return T.warning;
    return T.text3;
  };

  const sortedChannels = [...channels].sort((a, b) => {
    const order = { online: 0, pending: 1, error: 2, not_connected: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return (
    <Card
      title={
        <Stack direction="row" alignItems="center" spacing={1}>
          <span>📡 Distribution Rental United</span>
          {ruPropertyKey && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1, py: 0.25, borderRadius: '99px', ml: 1,
              bgcolor: `${T.accent}15`, color: T.accent,
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
            }}>
              R
            </Box>
          )}
        </Stack>
      }
      meta={ruPropertyKey ? `Clé RU: ${ruPropertyKey}` : 'Connecter via Rental United'}>

      {ruPropertyKey ? (
        <>
          <Typography variant="body2" sx={{ color: T.text3, fontSize: 12, mb: 1.5 }}>
            Rental United synchronise ce listing avec les plateformes OTA ci-dessous.
            {updatedAt && ` Dernière vérification: ${formatDate(updatedAt)}`}
          </Typography>

          <Button
            variant="contained"
            size="small"
            disabled={verifyLoading}
            onClick={onVerifyClick}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12,
              color: '#fff',
              background: `linear-gradient(135deg, #b8851a 0%, #8f6814 100%)`,
              boxShadow: '0 2px 8px rgba(184, 133, 26, 0.3)',
              '&:hover': {
                background: `linear-gradient(135deg, #c99520 0%, #a07518 100%)`,
                boxShadow: '0 3px 10px rgba(184, 133, 26, 0.4)',
              },
              '&.Mui-disabled': { opacity: 0.72, color: '#fff' },
              mb: 2,
            }}>
            {verifyLoading ? '⏳ Vérification...' : '🔄 Vérifier les canaux RU'}
          </Button>

          {sortedChannels.length > 0 && (
            <Box sx={{
              border: `1px solid ${T.border}`,
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: T.bg1
            }}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                gap: 1,
                p: 1,
                bgcolor: T.bg2,
                borderBottom: `1px solid ${T.border}`,
                fontSize: 11,
                fontWeight: 700,
                color: T.text2,
              }}>
                <div>OTA</div>
                <div>Statut</div>
                <div>Contenu</div>
                <div>Prix/Dispo</div>
                <div>Markup</div>
              </Box>
              {sortedChannels.map((ch) => (
                <Box
                  key={ch.channelId}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    gap: 1,
                    p: 1,
                    borderBottom: `1px solid ${T.border}`,
                    fontSize: 12,
                    '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: T.bg2 },
                  }}>
                  <div style={{ fontWeight: 600 }}>{ch.channelName}</div>
                  <div style={{ color: getStatusColor(ch.status), fontWeight: 600 }}>
                    {getStatusLabel(ch.status)}
                  </div>
                  <div style={{ color: getCmStatusColor(ch.contentStatus), fontWeight: 600 }}>
                    {ch.contentStatus || '—'}
                  </div>
                  <div style={{ color: getCmStatusColor(ch.ariStatus), fontWeight: 600 }}>
                    {ch.ariStatus || '—'}
                  </div>
                  <div>{ch.markup != null ? `${ch.markup}%` : '—'}</div>
                </Box>
              ))}
            </Box>
          )}

          {channels.length === 0 && updatedAt && (
            <Typography variant="body2" sx={{ color: T.text3, fontStyle: 'italic', mt: 1 }}>
              Aucun canal OTA connecté pour le moment.
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body2" sx={{ color: T.text3, fontSize: 12 }}>
          Ce listing n'est pas encore connecté à Rental United. Configure la clé RU Property pour activer la distribution multi-OTA.
        </Typography>
      )}
    </Card>
  );
};

export function ChannelsTab({ values = {}, onChange, listingId, onVerifyRuChannels, verifyRuLoading = false }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const updChannel = (id, patch) => upd('channels', { ...(values.channels || {}), [id]: { ...(values.channels?.[id] || {}), ...patch } });

  // Extract Rental United data
  const ruPropertyKey = values.channelManagerPropertyKey || values.ruPropertyKey;
  const otaChannelsSnapshot = values.otaChannelsSnapshot;

  return (
    <Box>
      <GlobalBanner>
        <strong>Channex est l'intégration centrale.</strong> Les credentials API sont gérés au niveau organisation. Ici tu actives/désactives la sync par canal, et tu mappes les IDs spécifiques au listing.
      </GlobalBanner>

      {/* Rental United Distribution Panel */}
      {ruPropertyKey && (
        <RentalUnitedOtaPanel
          ruPropertyKey={ruPropertyKey}
          otaChannelsSnapshot={otaChannelsSnapshot}
          onVerifyClick={onVerifyRuChannels}
          verifyLoading={verifyRuLoading}
        />
      )}

      {OTA_PROVIDERS.map(p => {
        const cfg = values.channels?.[p.id] || {};
        const status = cfg.enabled ? (cfg.syncStatus || 'ok') : 'off';
        const meta = SYNC_STATUS_META[status];
        return (
          <Card key={p.id}
            title={<Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar sx={{ bgcolor: p.color, color: '#fff', width: 28, height: 28, fontSize: 14, fontWeight: 700 }}>{p.logo}</Avatar>
              <span>{p.name}</span>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.25, borderRadius: '99px', ml: 1,
                bgcolor: `${meta.color}15`, color: meta.color,
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: meta.dot }} />
                {meta.label.toUpperCase()}
              </Box>
            </Stack>}
            meta={cfg.lastSync ? `Sync ${cfg.lastSync}` : 'Pas encore connecté'}>
            <ToggleRow title={`Activer ${p.name}`} desc={`Publier ce listing sur ${p.name} via Channex`}
              checked={!!cfg.enabled} onChange={v => updChannel(p.id, { enabled: v })} />
            {cfg.enabled && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5, mt: 1.25 }}>
                <Field label={`Listing ID ${p.name}`}>
                  <TextField size="small" value={cfg.listingId || ''} onChange={e => updChannel(p.id, { listingId: e.target.value })}
                    placeholder={`ex: ${p.id === 'airbnb' ? 'abnb_12345' : p.id === 'booking' ? 'bkg_67890' : 'xxx_xxx'}`} sx={sxInput} />
                </Field>
                <Field label="Channex Property ID">
                  <TextField size="small" value={cfg.channexId || ''} onChange={e => updChannel(p.id, { channexId: e.target.value })} sx={sxInput} />
                </Field>
                {p.id === 'airbnb' && (
                  <>
                    <Field label="airbnbName" hint="Override nom Airbnb spécifique">
                      <TextField size="small" value={cfg.airbnbName || ''} onChange={e => updChannel(p.id, { airbnbName: e.target.value })} sx={sxInput} />
                    </Field>
                    <Field label="airbnbSummary" hint="Override résumé Airbnb">
                      <TextField size="small" multiline rows={2} value={cfg.airbnbSummary || ''} onChange={e => updChannel(p.id, { airbnbSummary: e.target.value })} sx={sxInput} />
                    </Field>
                  </>
                )}
                {p.id === 'booking' && (
                  <Field label="bookingcomPropertyName" hint="Override nom Booking">
                    <TextField size="small" value={cfg.bookingPropertyName || ''} onChange={e => updChannel(p.id, { bookingPropertyName: e.target.value })} sx={sxInput} />
                  </Field>
                )}
              </Box>
            )}
          </Card>
        );
      })}
    </Box>
  );
}

/* ════════════════════ Direct Booking ════════════════════ */
export function DirectBookingTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  return (
    <Box>
      <Card title="🌐 Portail Direct Booking" meta="Réservation sans commission OTA">
        <ToggleRow title="Activer la réservation directe" desc="Le listing apparaît sur sojori.com/villa-belvedere et accepte les réservations sans intermédiaire."
          checked={values.directEnabled !== false} onChange={v => upd('directEnabled', v)} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5, mt: 1.5 }}>
          <Field label="Slug URL" hint="sojori.com/villa-{slug}">
            <TextField size="small" value={values.slug || 'belvedere-nice'} onChange={e => upd('slug', e.target.value)} sx={sxInput} />
          </Field>
          <Field label="Discount direct"><NumberInput value={values.directDiscount ?? 5} suffix="%" onChange={v => upd('directDiscount', v)} /></Field>
        </Box>
      </Card>

      <Card title="💳 Méthodes de paiement acceptées">
        <ChipsRow value={values.paymentMethods || ['card', 'wire']} onToggle={v => {
          const cur = values.paymentMethods || ['card', 'wire'];
          upd('paymentMethods', cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]);
        }}
          items={[
            { id: 'card', label: '💳 Carte bancaire' },
            { id: 'wire', label: '🏦 Virement' },
            { id: 'paypal', label: '💰 PayPal' },
            { id: 'crypto', label: '₿ Crypto' },
            { id: 'cash', label: '💵 Espèces à l\'arrivée' },
          ]} />
      </Card>

      <Card title="🤝 Programmes de fidélité">
        <ToggleRow title="Remise client récurrent" desc="−10% pour les voyageurs ayant déjà séjourné dans un de tes listings" checked={!!values.returningGuestDiscount} onChange={v => upd('returningGuestDiscount', v)} />
        <ToggleRow title="Code promo" desc="Active la saisie de codes promo dans le tunnel de réservation" checked={!!values.promoCodesEnabled} onChange={v => upd('promoCodesEnabled', v)} />
      </Card>
    </Box>
  );
}

/* ════════════════════ Rooms & Beds ════════════════════ */
const BED_TYPES = [
  { id: 'king', label: '🛏 King size' },
  { id: 'queen', label: '🛏 Queen' },
  { id: 'double', label: '🛏 Double' },
  { id: 'single', label: '🛏 Simple' },
  { id: 'sofa', label: '🛋 Canapé-lit' },
  { id: 'crib', label: '👶 Lit bébé' },
];

export function RoomsTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const rooms = values.roomTypes || [
    { id: 'r1', name: 'Chambre principale', beds: [{ type: 'king', count: 1 }], hasEnsuite: true, code: 'M1' },
    { id: 'r2', name: 'Chambre 2', beds: [{ type: 'queen', count: 1 }], code: 'C2' },
    { id: 'r3', name: 'Chambre 3', beds: [{ type: 'single', count: 2 }], code: 'C3' },
    { id: 'r4', name: 'Chambre 4', beds: [{ type: 'queen', count: 1 }], code: 'C4' },
  ];
  const updRoom = (idx, patch) => upd('roomTypes', rooms.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addRoom = () => upd('roomTypes', [...rooms, { id: `r${Date.now()}`, name: `Chambre ${rooms.length + 1}`, beds: [{ type: 'queen', count: 1 }], code: `C${rooms.length + 1}` }]);
  const remRoom = (idx) => upd('roomTypes', rooms.filter((_, i) => i !== idx));

  return (
    <Box>
      <Card title="🛏 Types de chambres" meta={`${rooms.length} chambres · structure roomTypes[]`}>
        {rooms.map((r, idx) => (
          <Box key={r.id} sx={{ border: `1px solid ${T.border}`, borderRadius: 1, p: 1.5, mb: 1, bgcolor: T.bg1 }}>
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
              <Field label="Nom" fullWidth>
                <TextField size="small" fullWidth value={r.name} onChange={e => updRoom(idx, { name: e.target.value })} sx={sxInput} />
              </Field>
              <Field label="Code">
                <TextField size="small" value={r.code} onChange={e => updRoom(idx, { code: e.target.value })} sx={{ ...sxInput, width: 80 }} />
              </Field>
              <IconButton size="small" onClick={() => remRoom(idx)} sx={{ color: T.error, mt: 2 }}>🗑</IconButton>
            </Stack>
            <Field label="Lits">
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                {r.beds.map((bed, bidx) => (
                  <Stack key={bidx} direction="row" gap={0.5} sx={{ border: `1px solid ${T.border}`, borderRadius: 1, p: 0.5, bgcolor: T.bg2 }}>
                    <SelectField sx={{ minWidth: 130 }} value={bed.type} onChange={v => updRoom(idx, { beds: r.beds.map((b, i) => i === bidx ? { ...b, type: v } : b) })}
                      options={BED_TYPES.map(b => ({ value: b.id, label: b.label }))} />
                    <Counter value={bed.count} onChange={v => updRoom(idx, { beds: r.beds.map((b, i) => i === bidx ? { ...b, count: v } : b) })} min={1} max={5} />
                  </Stack>
                ))}
                <Button size="small" onClick={() => updRoom(idx, { beds: [...r.beds, { type: 'queen', count: 1 }] })}
                  sx={{ textTransform: 'none', borderStyle: 'dashed', border: `1px dashed ${T.borderStrong}`, color: T.text3 }}>+ Lit</Button>
              </Stack>
            </Field>
            <ToggleRow title="Salle de bain attenante" desc="Suite parentale / en suite" checked={!!r.hasEnsuite} onChange={v => updRoom(idx, { hasEnsuite: v })} />
          </Box>
        ))}
        <Button onClick={addRoom} fullWidth sx={{ borderStyle: 'dashed', border: `1px dashed ${T.borderStrong}`, color: T.text3, py: 1.5 }}>
          + Ajouter une chambre
        </Button>
      </Card>
    </Box>
  );
}

/* ════════════════════ License ════════════════════ */
export function LicenseTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  return (
    <Box>
      <Card title="📄 Licence touristique" meta="Obligatoire dans certaines villes">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          <Field label="Numéro de licence" required>
            <TextField size="small" value={values.licenseNumber || ''} onChange={e => upd('licenseNumber', e.target.value)} placeholder="ex: 06088-MEUB-2024" sx={sxInput} />
          </Field>
          <Field label="Type de licence">
            <SelectField value={values.licenseType || 'meuble_tourisme'} onChange={v => upd('licenseType', v)}
              options={[
                { value: 'meuble_tourisme', label: 'Meublé de tourisme' },
                { value: 'chambres_hotes', label: 'Chambres d\'hôtes' },
                { value: 'gite_rural', label: 'Gîte rural' },
                { value: 'residence_secondaire', label: 'Résidence secondaire' },
              ]} />
          </Field>
          <Field label="Date d'émission">
            <TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={values.licenseIssueDate || ''} onChange={e => upd('licenseIssueDate', e.target.value)} sx={sxInput} />
          </Field>
          <Field label="Date d'expiration" required>
            <TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={values.licenseExpiryDate || ''} onChange={e => upd('licenseExpiryDate', e.target.value)} sx={sxInput} />
          </Field>
        </Box>
      </Card>

      <Card title="🏛 Mairie & autorités">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          <Field label="Mairie de rattachement">
            <TextField size="small" value={values.cityHall || ''} onChange={e => upd('cityHall', e.target.value)} placeholder="ex: Mairie de Nice" sx={sxInput} />
          </Field>
          <Field label="Référent administratif">
            <TextField size="small" value={values.adminContact || ''} onChange={e => upd('adminContact', e.target.value)} sx={sxInput} />
          </Field>
        </Box>
      </Card>

      <Card title="🛂 Enregistrement police / hôtelière">
        <ToggleRow title="Enregistrement obligatoire" desc="Transmission automatique des fiches voyageurs aux autorités" checked={!!values.policeRegistrationRequired} onChange={v => upd('policeRegistrationRequired', v)} />
        <Box sx={{ mt: 1.5 }}>
          <Field label="Endpoint API police"><TextField size="small" fullWidth value={values.policeApiEndpoint || ''} onChange={e => upd('policeApiEndpoint', e.target.value)} placeholder="ex: https://api.police.gov.fr/v1/registration" sx={sxInput} /></Field>
        </Box>
      </Card>
    </Box>
  );
}
