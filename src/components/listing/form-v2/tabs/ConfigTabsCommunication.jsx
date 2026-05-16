// ════════════════════════════════════════════════════════════════════
// ConfigTabsCommunication.jsx — Access · WhatsApp · Concierge · Support · Rules
// Aligné sur CONFIG_TABS_SPEC.md (Claude Code · 16 mai 2026)
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Stack, Typography, TextField, Button, IconButton, Chip } from '@mui/material';
import { T, sxInput, Field, Card, SectionH, ToggleRow, ChipsRow, NumberInput, SelectField, LangSwitcher, GlobalBanner } from './_shared';

/* ════════════════════ Access ════════════════════ */
const ACCESS_MODES = [
  { id: 'physical_key',         icon: '🔑', label: 'Clé physique',        desc: 'Remise en main propre · staff sur place' },
  { id: 'lockbox',              icon: '📦', label: 'Lockbox / boîte à clés', desc: 'Code à 4-8 caractères pour ouvrir la boîte' },
  { id: 'numeric_code',         icon: '🔢', label: 'Code numérique',       desc: 'Code sur clavier · option dynamique par séjour' },
  { id: 'physical_reception',   icon: '🛎',  label: 'Accueil physique',     desc: 'Gardien / réceptionniste sur place' },
  { id: 'RECEPT',               icon: '⭐', label: 'Mode RECEPT',          desc: 'Workflow Sojori spécifique · staff dédié à l\'arrivée' },
];

export function AccessTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const [lang, setLang] = useState('🇫🇷 FR');
  const mode = values.accessMode || 'lockbox';

  return (
    <Box>
      <Card title="🚪 Mode d'accès" meta="accessMode · required">
        <Stack gap={0.75}>
          {ACCESS_MODES.map(m => {
            const active = mode === m.id;
            return (
              <Box key={m.id} onClick={() => upd('accessMode', m.id)} sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                p: '10px 12px', border: '1px solid', borderColor: active ? T.primary : T.border,
                borderRadius: 1, bgcolor: active ? T.primaryTint : T.bg1, cursor: 'pointer',
                '&:hover': { borderColor: T.borderStrong },
              }}>
                <Box sx={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: `2px solid ${active ? T.primaryDeep : T.borderStrong}`,
                  position: 'relative', flexShrink: 0,
                  '&::after': active ? { content: '""', position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, borderRadius: '50%', bgcolor: T.primary } : {},
                }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{m.icon} {m.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.25 }}>{m.desc}</Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>

        {(mode === 'lockbox' || mode === 'numeric_code') && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 2 }}>
            <Field label="Code d'accès" required hint="4–8 caractères alphanumériques">
              <TextField size="small" value={values.accessCode || ''} onChange={e => upd('accessCode', e.target.value)} sx={sxInput} />
            </Field>
            {mode === 'numeric_code' && (
              <Box sx={{ pt: 1.5 }}>
                <ToggleRow title="Code dynamique par séjour" desc="Génère un nouveau code à chaque réservation" checked={!!values.dynamicCode} onChange={v => upd('dynamicCode', v)} />
              </Box>
            )}
            {mode === 'lockbox' && (
              <Field label="Emplacement lockbox">
                <TextField size="small" value={values.lockboxLocation || ''} onChange={e => upd('lockboxLocation', e.target.value)} placeholder="ex: Entrée principale, colonne droite" sx={sxInput} />
              </Field>
            )}
          </Box>
        )}
      </Card>

      <Card title="📝 Instructions d'arrivée" meta="howToArrive · FR / EN / AR">
        <LangSwitcher value={lang} onChange={setLang} />
        <Field label="Comment arriver" hint="Envoyé automatiquement 24h avant le check-in via WhatsApp.">
          <TextField size="small" multiline rows={5} fullWidth
            value={lang === '🇫🇷 FR' ? values.howToArrive : lang === '🇬🇧 EN' ? values.howToArriveEn : values.howToArriveAr || ''}
            onChange={e => upd(lang === '🇫🇷 FR' ? 'howToArrive' : lang === '🇬🇧 EN' ? 'howToArriveEn' : 'howToArriveAr', e.target.value)}
            sx={sxInput} />
        </Field>
      </Card>

      <Card title="📞 Contacts d'arrivée">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          <Field label="Email · arrivalEmail"><TextField size="small" type="email" value={values.arrivalEmail || ''} onChange={e => upd('arrivalEmail', e.target.value)} sx={sxInput} /></Field>
          <Field label="Téléphone · arrivalPhone"><TextField size="small" value={values.arrivalPhone || ''} onChange={e => upd('arrivalPhone', e.target.value)} placeholder="+33 6 ..." sx={sxInput} /></Field>
          <Field label="Nom · arrivalLandlord"><TextField size="small" value={values.arrivalLandlord || ''} onChange={e => upd('arrivalLandlord', e.target.value)} sx={sxInput} /></Field>
        </Box>
      </Card>
    </Box>
  );
}

/* ════════════════════ WhatsApp ════════════════════ */
const WA_TEMPLATES = [
  { id: 'welcome',      icon: '✉️', name: 'Welcome Message',      trigger: 'booking_confirmed + 5 min',     vars: '{guestName}, {checkInDate}, {checkOutDate}, {listingName}, {howToArrive}' },
  { id: 'instructions', icon: '🚪', name: 'Instructions Arrivée', trigger: 'J-3 avant checkin à 10:00',      vars: '{howToArrive}, {accessCode}, {arrivalPhone}, {wifiUsername}, {wifiPassword}' },
  { id: 'midstay',      icon: '🛌', name: 'Mid-Stay Check',       trigger: 'J+2 après checkin à 11:00',      vars: '{guestName}, {wifiPassword}, {supportPhone}' },
  { id: 'checkout',     icon: '🛫', name: 'Checkout Reminder',    trigger: 'J-1 avant checkout à 18:00',     vars: '{messageCheckout}, {cityTax}, {checkoutTime}' },
  { id: 'review',       icon: '⭐', name: 'Review Request',       trigger: 'J+1 après checkout à 14:00',     vars: '{guestName}, {reviewLink}' },
];

export function WhatsAppTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  return (
    <Box>
      <GlobalBanner>
        <strong>Le numéro WhatsApp Business est global</strong> (1 seul pour toute la propriété management). Configurable dans <a href="#" style={{ color: T.info, fontWeight: 600 }}>⚙️ Paramètres organisation</a> · pas géré au niveau du listing.
      </GlobalBanner>

      <Card title="📱 Templates héritage" meta={`${WA_TEMPLATES.length} templates · whatsappTemplates[]`}>
        {WA_TEMPLATES.map(tpl => {
          const override = (values.whatsappTemplates || []).find(t => t.id === tpl.id)?.isOverride;
          return (
            <Box key={tpl.id} sx={{ p: 1.5, border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg1, mb: 1 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.625 }}>
                <Box sx={{ fontSize: 18 }}>{tpl.icon}</Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{tpl.name}</Typography>
                <Box sx={{ ml: 'auto', fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700, px: 0.75, py: '1px', borderRadius: 0.5,
                  bgcolor: override ? T.aiTint : T.successTint, color: override ? T.ai : T.success, letterSpacing: '0.04em',
                }}>
                  {override ? 'override listing' : 'hérité gabarit'}
                </Box>
              </Stack>
              <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>⏱ {tpl.trigger}</Typography>
              <Typography sx={{ fontSize: 10.5, color: T.ai, fontFamily: '"Geist Mono", monospace', mt: 0.5 }}>📌 {tpl.vars}</Typography>
            </Box>
          );
        })}
        <Button fullWidth sx={{ mt: 1, borderStyle: 'dashed', border: `1px dashed ${T.borderStrong}`, color: T.text3 }}>+ Ajouter un template personnalisé</Button>
      </Card>

      <Card title="📶 WiFi" meta="Variables dans templates">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Field label="SSID · wifiUsername"><TextField size="small" fullWidth value={values.wifiUsername || ''} onChange={e => upd('wifiUsername', e.target.value)} sx={sxInput} /></Field>
          <Field label="Mot de passe · wifiPassword"><TextField size="small" fullWidth value={values.wifiPassword || ''} onChange={e => upd('wifiPassword', e.target.value)} sx={sxInput} /></Field>
        </Box>
        <Typography sx={{ fontSize: 11, color: T.text3, mt: 1 }}>Inséré automatiquement via <code>{`{wifiUsername}`}</code> / <code>{`{wifiPassword}`}</code> dans les templates.</Typography>
      </Card>
    </Box>
  );
}

/* ════════════════════ Concierge ════════════════════ */
const CONCIERGE_SERVICES = [
  { id: 'transport', icon: '🚗', name: 'Transport',                  sub: 'Aéroport, gare, transferts personnalisés' },
  { id: 'grocery',   icon: '🛒', name: 'Courses / Épicerie',         sub: 'Livraison de courses commandées par le voyageur' },
  { id: 'restaurant', icon: '🍽️', name: 'Restaurant',                 sub: 'Réservations dans restaurants partenaires' },
  { id: 'activities', icon: '🎭', name: 'Activités',                  sub: 'Excursions, visites guidées, tours' },
  { id: 'custom',    icon: '✨', name: 'Services personnalisés',     sub: 'Massage, baby-sitting, chef à domicile, autre' },
];

export function ConciergeTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const updSvc = (id, patch) => upd('concierge', { ...(values.concierge || {}), [id]: { ...(values.concierge?.[id] || {}), ...patch } });

  return (
    <Box>
      <GlobalBanner>
        <strong>L'équipe d'assignation est globale</strong> (gérée dans <a href="#" style={{ color: T.info, fontWeight: 600 }}>⚙️ Admin · Équipes</a>). Ici on choisit juste laquelle est responsable de ce listing pour chaque service.
      </GlobalBanner>

      {CONCIERGE_SERVICES.map(svc => {
        const cfg = values.concierge?.[svc.id] || {};
        return (
          <Card key={svc.id} title={<>{svc.icon} {svc.name}</>}>
            <ToggleRow title={svc.sub} checked={!!cfg.enabled} onChange={v => updSvc(svc.id, { enabled: v })} />

            {cfg.enabled && svc.id === 'transport' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mt: 1.5 }}>
                <Field label="Zone géographique"><SelectField value={cfg.zone || 'Marrakech'} onChange={v => updSvc(svc.id, { zone: v })} options={['Marrakech', 'Casablanca', 'Agadir', 'Nice', 'Calvi']} /></Field>
                <Field label="Tarif aéroport"><NumberInput value={cfg.airportPrice ?? 150} suffix="MAD" onChange={v => updSvc(svc.id, { airportPrice: v })} /></Field>
                <Field label="SLA réponse (h)"><NumberInput value={cfg.maxResponseTime ?? 2} suffix="h" onChange={v => updSvc(svc.id, { maxResponseTime: v })} /></Field>
              </Box>
            )}
            {cfg.enabled && svc.id === 'grocery' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
                <Field label="Providers (multi-select)"><ChipsRow value={cfg.providers || []} onToggle={(v) => updSvc(svc.id, { providers: (cfg.providers || []).includes(v) ? cfg.providers.filter(x => x !== v) : [...(cfg.providers || []), v] })}
                  items={[{ id: 'carrefour', label: 'Carrefour' }, { id: 'marjane', label: 'Marjane' }, { id: 'atacadao', label: 'Atacadao' }]} /></Field>
                <Field label="Frais livraison (0 = gratuit)"><NumberInput value={cfg.deliveryFee ?? 0} suffix="MAD" onChange={v => updSvc(svc.id, { deliveryFee: v })} /></Field>
              </Box>
            )}
            {cfg.enabled && svc.id === 'custom' && (
              <Box sx={{ mt: 1.5 }}>
                <Field label="Catégories proposées"><ChipsRow value={cfg.categories || ['Autre']} onToggle={(v) => updSvc(svc.id, { categories: (cfg.categories || []).includes(v) ? cfg.categories.filter(x => x !== v) : [...(cfg.categories || ['Autre']), v] })}
                  items={[{ id: 'Massage', label: 'Massage' }, { id: 'Baby-sitting', label: 'Baby-sitting' }, { id: 'Chef à domicile', label: 'Chef à domicile' }, { id: 'Ménage suppl.', label: 'Ménage suppl.' }, { id: 'Autre', label: 'Autre' }]} /></Field>
              </Box>
            )}
          </Card>
        );
      })}
    </Box>
  );
}

/* ════════════════════ Support ════════════════════ */
const SUPPORT_CATEGORIES = [
  { id: 'technical', icon: '🔧', name: 'Problème technique', desc: 'Wifi, électroménager, plomberie, chauffage…', defaultSla: 30,  channel: 'whatsapp', team: 'Équipe Technique', urgent: false },
  { id: 'urgency',   icon: '🚨', name: 'Urgence',            desc: 'Fuite, intrusion, panne majeure, danger immédiat', defaultSla: 10, channel: 'phone',   team: 'Urgence 24/7', urgent: true },
  { id: 'complaint', icon: '😠', name: 'Plainte',            desc: 'Insatisfaction, problème de service, demande de remboursement', defaultSla: 120, channel: 'email_wa', team: 'Service Client', urgent: false },
  { id: 'question',  icon: '❓', name: 'Question générale',  desc: 'Horaires, équipements, restaurants, transport…', defaultSla: 240, channel: 'whatsapp', team: 'Support Général', urgent: false },
  { id: 'other',     icon: '✨', name: 'Autre',              desc: 'Catégorie fallback pour demandes non-classifiées', defaultSla: 1440, channel: 'whatsapp', team: 'Support Général', urgent: false },
];

export function SupportTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const updCat = (id, patch) => upd('support', { ...(values.support || {}), categories: (values.support?.categories || []).map(c => c.id === id ? { ...c, ...patch } : c) });
  const cats = values.support?.categories || SUPPORT_CATEGORIES.map(c => ({
    id: c.id, code: c.id, label: { fr: c.name }, enabled: true,
    sla: { responseTime: c.defaultSla }, preferredChannel: c.channel, assignedTeam: c.team,
    escalation: { enabled: c.urgent || c.id === 'technical', threshold: 60, escalateTo: 'Manager' },
  }));

  return (
    <Box>
      <GlobalBanner>
        <strong>Les équipes d'escalation sont globales</strong> (admin · ops · 24/7). Ici on choisit juste qui est responsable de chaque catégorie pour CE listing.
      </GlobalBanner>

      {cats.map(cat => {
        const meta = SUPPORT_CATEGORIES.find(c => c.id === cat.id) || SUPPORT_CATEGORIES[0];
        return (
          <Card key={cat.id}
            title={<><span style={{ fontSize: 18 }}>{meta.icon}</span> {cat.label?.fr || meta.name}</>}
            accent={meta.urgent ? undefined : undefined}>
            <ToggleRow title={meta.desc} checked={cat.enabled !== false} onChange={v => updCat(cat.id, { enabled: v })} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mt: 1.5 }}>
              <Field label="SLA réponse (min)"><NumberInput value={cat.sla?.responseTime ?? meta.defaultSla} suffix="min" onChange={v => updCat(cat.id, { sla: { ...cat.sla, responseTime: v } })} /></Field>
              <Field label="Canal préféré">
                <SelectField value={cat.preferredChannel || meta.channel} onChange={v => updCat(cat.id, { preferredChannel: v })}
                  options={[
                    { value: 'whatsapp', label: '📱 WhatsApp' }, { value: 'email', label: '📧 Email' },
                    { value: 'phone', label: '📞 Téléphone' }, { value: 'email_wa', label: 'Email + WhatsApp' },
                  ]} />
              </Field>
              <Field label="Équipe assignée">
                <SelectField value={cat.assignedTeam || meta.team} onChange={v => updCat(cat.id, { assignedTeam: v })}
                  options={['Équipe Technique', 'Urgence 24/7', 'Service Client', 'Support Général', 'Ops']} />
              </Field>
            </Box>
            {cat.escalation?.enabled && (
              <Box sx={{ mt: 1.5, p: 1.25, bgcolor: T.warningTint, border: `1px solid ${T.warning}40`, borderRadius: 1, fontSize: 11.5, color: T.warning }}>
                <strong>Escalation auto</strong> → {cat.escalation.escalateTo} si non résolu en {cat.escalation.threshold} min
              </Box>
            )}
          </Card>
        );
      })}

      <Card title="👁 Visibilité voyageur" meta="support.guestTracking">
        <ToggleRow title="Lien de suivi de demande"
          desc="Le voyageur reçoit un lien personnalisé pour suivre l'avancement (expire après 72h)"
          checked={values.support?.guestTracking?.enabled !== false}
          onChange={v => upd('support', { ...(values.support || {}), guestTracking: { ...(values.support?.guestTracking || {}), enabled: v } })} />
      </Card>
    </Box>
  );
}

/* ════════════════════ Rules ════════════════════ */
const RULE_FIELDS = ['numberOfNights', 'checkInDate.dayOfWeek', 'checkOutDate.dayOfWeek', 'guest.age', 'guest.country', 'guest.previousBookings', 'totalPrice', 'numberOfGuests', 'instantBooking', 'source'];

export function RulesTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const rules = values.rules?.list || [
    { id: 'r1', name: 'Validation manuelle week-ends + jeunes voyageurs', priority: 1, enabled: true,
      conditions: { operator: 'AND', items: [
        { field: 'checkInDate.dayOfWeek', operator: 'in', value: 'Friday, Saturday' },
        { field: 'guest.age', operator: '<', value: 25 },
      ]},
      actions: [{ type: 'require_validation', params: { notify: 'owner@email.com' } }, { type: 'block_instant_booking' }] },
    { id: 'r2', name: 'Durée minimum 3 nuits', priority: 2, enabled: true,
      conditions: { operator: 'AND', items: [{ field: 'numberOfNights', operator: '<', value: 3 }] },
      actions: [{ type: 'auto_reject', params: { message: 'min 3 nuits requis' } }] },
    { id: 'r3', name: 'Discount long séjour', priority: 3, enabled: true,
      conditions: { operator: 'AND', items: [{ field: 'numberOfNights', operator: '>=', value: 7 }] },
      actions: [{ type: 'apply_discount', params: { percent: 15 } }] },
  ];

  const ACTION_LABEL = {
    require_validation: '→ require_validation · notifie owner',
    block_instant_booking: '→ block_instant_booking',
    auto_reject: '→ auto_reject',
    auto_accept: '→ auto_accept',
    apply_discount: '→ apply_discount',
    send_notification: '→ send_notification',
    create_task: '→ create_task',
  };

  return (
    <Box>
      <Card title="📋 Règles métier actives" meta={`${rules.length} règles · builder IF/THEN`}>
        {rules.map(rule => (
          <Box key={rule.id} sx={{ p: 1.5, border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg1, mb: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{rule.name}</Typography>
              <Box sx={{ ml: 'auto', fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700, px: 0.75, py: '1px', borderRadius: 0.5,
                bgcolor: T.successTint, color: T.success, letterSpacing: '0.04em',
              }}>priorité {rule.priority}</Box>
              <Box sx={{
                width: 32, height: 18, borderRadius: '99px', bgcolor: rule.enabled ? T.primary : T.borderStrong, cursor: 'pointer',
                position: 'relative', '&::after': { content: '""', position: 'absolute', top: 2, left: rule.enabled ? 16 : 2, width: 14, height: 14, bgcolor: '#fff', borderRadius: '50%', transition: 'left 0.2s' },
              }} />
            </Stack>
            <Box sx={{ p: 1.25, bgcolor: T.bg2, borderRadius: 0.75, mb: 0.75, fontFamily: '"Geist Mono", monospace', fontSize: 11.5 }}>
              <Box component="span" sx={{ color: T.ai, fontWeight: 700 }}>SI </Box>
              {rule.conditions.items.map((c, i) => (
                <span key={i}>
                  {i > 0 && <Box component="span" sx={{ color: T.ai, fontWeight: 700 }}> {rule.conditions.operator} </Box>}
                  {c.field} <Box component="span" sx={{ color: T.primary, fontWeight: 700 }}>{c.operator}</Box> {Array.isArray(c.value) ? c.value.join(', ') : c.value}
                </span>
              ))}
            </Box>
            {rule.actions.map((a, i) => (
              <Box key={i} sx={{ p: '8px 12px', bgcolor: T.successTint, borderLeft: `3px solid ${T.success}`, borderRadius: 0.75, fontSize: 12, color: '#066a44', mb: 0.625, fontWeight: 500 }}>
                {ACTION_LABEL[a.type] || a.type}
                {a.params?.percent && ` · −${a.params.percent}%`}
                {a.params?.notify && ` · ${a.params.notify}`}
                {a.params?.message && ` · "${a.params.message}"`}
              </Box>
            ))}
          </Box>
        ))}
        <Button fullWidth sx={{ borderStyle: 'dashed', border: `1px dashed ${T.borderStrong}`, color: T.text3, py: 1.75 }}>+ Ajouter une règle</Button>
      </Card>

      <Card title="🔧 Champs disponibles pour conditions">
        <Stack direction="row" gap={0.625} flexWrap="wrap" useFlexGap>
          {RULE_FIELDS.map(f => (
            <Box key={f} sx={{
              fontFamily: '"Geist Mono", monospace', fontSize: 11, fontWeight: 600,
              px: 0.75, py: 0.5, borderRadius: 0.625, bgcolor: T.bg2, color: T.text2,
            }}>{f}</Box>
          ))}
        </Stack>
      </Card>

      <Card title="⚡ Actions disponibles">
        <Stack gap={0.625}>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <Typography key={k} sx={{ fontSize: 11.5, color: T.text2, fontFamily: '"Geist Mono", monospace' }}>
              <Box component="span" sx={{ fontWeight: 700, color: T.primary }}>{k}</Box> {v.replace('→', '')}
            </Typography>
          ))}
        </Stack>
      </Card>
    </Box>
  );
}
