// ════════════════════════════════════════════════════════════════════
// ConfigTabsWorkflow.jsx — Orchestration + Ménage & Service
// Aligné sur CONFIG_TABS_SPEC.md (Claude Code · 16 mai 2026)
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Stack, Typography, TextField, Button, IconButton } from '@mui/material';
import { T, sxInput, Field, Card, SectionH, ToggleRow, Counter, ChipsRow, NumberInput, SelectField } from './_shared';

/* ════════════════════ Orchestration ════════════════════ */
const ORCHESTRATION_GROUPS = [
  { label: 'Arrivée / Départ', items: [
    { id: 'orchestration_choose_arrival',    title: '🎫 Choisir arrivée',    desc: 'Le voyageur choisit son créneau d\'arrivée via WhatsApp', badges: [{ tone: 'info', label: '📱 WhatsApp' }, { tone: 'success', label: '→ TS_CHECKIN[]' }] },
    { id: 'orchestration_choose_departure',  title: '🛫 Choisir départ',     desc: 'Le voyageur choisit son créneau de départ · J-2 avant checkout', badges: [{ tone: 'info', label: '📱 WhatsApp' }, { tone: 'success', label: '→ TS_CHECKOUT[]' }] },
    { id: 'orchestration_declare_arrival',   title: '✅ Déclarer arrivée',   desc: 'Voyageur confirme son arrivée le jour J · boutons "J\'arrive" / "Retard"', badges: [{ tone: 'info', label: '📱 WhatsApp' }] },
    { id: 'orchestration_declare_departure', title: '👋 Déclarer départ',    desc: 'Voyageur confirme son départ le jour J', badges: [{ tone: 'info', label: '📱 WhatsApp' }] },
  ]},
  { label: 'Enregistrement', items: [
    { id: 'orchestration_registration',      title: '📄 Enregistrement voyageurs', desc: 'Check-in en ligne · scan passeport AI · timeslot dédié dans le workflow', badges: [{ tone: 'info', label: '📱 WhatsApp' }, { tone: 'ai', label: 'srv-chatbot' }] },
  ]},
  { label: 'Ménage', items: [
    { id: 'orchestration_cleaning_free',     title: '🧹 Ménage gratuit',     desc: 'Crée les tâches selon frequency[] configurée', badges: [{ tone: 'success', label: '→ frequency, TS_CLEAN[]' }] },
    { id: 'orchestration_cleaning_paid',     title: '💰 Ménage payant',      desc: 'Proposition WhatsApp · flow sélection + paiement', badges: [{ tone: 'info', label: '📱 WhatsApp' }, { tone: 'success', label: '→ paidCleaningConfig' }] },
  ]},
  { label: 'Conciergerie', items: [
    { id: 'orchestration_transport', title: '🚗 Transport',                 desc: 'Option transport dans menu chatbot WhatsApp',     badges: [{ tone: 'ai', label: 'srv-chatbot' }] },
    { id: 'orchestration_grocery',   title: '🛒 Courses',                   desc: 'Option courses / épicerie dans menu chatbot',     badges: [{ tone: 'ai', label: 'srv-chatbot' }] },
    { id: 'orchestration_custom',    title: '✨ Personnalisé',              desc: 'Catégorie "Autre demande" dans menu chatbot',     badges: [{ tone: 'ai', label: 'srv-chatbot' }] },
  ]},
  { label: 'Support', items: [
    { id: 'orchestration_support',   title: '🎧 Support',                   desc: 'Demandes support technique / urgence via chatbot · création ticket auto', badges: [{ tone: 'ai', label: 'srv-task' }] },
  ]},
];

export function OrchestrationTab({ values = {}, onChange }) {
  const upd = (k, v) => onChange?.({ ...values, [k]: v });
  const globalOff = values.orchestrationEnabled === false;
  return (
    <Box>
      <Card title="⚡ Orchestration globale" accent="primary">
        <ToggleRow title="Activer l'orchestration pour ce listing"
          desc="Si désactivé, aucun workflow automatique ne se lance. Toutes les options ci-dessous sont mises en pause."
          checked={values.orchestrationEnabled !== false} onChange={v => upd('orchestrationEnabled', v)} />
      </Card>

      {ORCHESTRATION_GROUPS.map(g => (
        <Box key={g.label} sx={{ mb: 2 }}>
          <SectionH>{g.label}</SectionH>
          {g.items.map(it => (
            <ToggleRow key={it.id} title={it.title} desc={it.desc} badges={it.badges}
              checked={values[it.id] !== false} disabled={globalOff}
              onChange={v => upd(it.id, v)} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

/* ════════════════════ Ménage & Service ════════════════════ */
const CLEANING_SUB_TABS = [
  { id: 'free',     label: 'Ménages gratuits' },
  { id: 'paid',     label: 'Ménages payants' },
  { id: 'timeslots', label: 'Créneaux arrivée/départ' },
  { id: 'reg',       label: 'Registration' },
  { id: 'checkout',  label: 'Instructions départ' },
  { id: 'sojori',    label: 'Ménage Sojori' },
];

export function CleaningTab({ values = {}, onChange }) {
  const [sub, setSub] = useState('free');
  const upd = (k, v) => onChange?.({ ...values, [k]: v });

  return (
    <Box>
      <Stack direction="row" gap={0.625} sx={{ flexWrap: 'wrap', pb: 1, mb: 2.25, borderBottom: `1px solid ${T.border}` }} useFlexGap>
        {CLEANING_SUB_TABS.map(t => (
          <Box key={t.id} component="button" onClick={() => setSub(t.id)} sx={{
            all: 'unset', cursor: 'pointer', px: 1.625, py: 0.875, borderRadius: 1,
            bgcolor: sub === t.id ? T.primary : T.bg1, color: sub === t.id ? T.text : T.text2,
            border: `1px solid ${sub === t.id ? T.primaryDeep : T.border}`,
            fontSize: 11.5, fontWeight: 600,
          }}>{t.label}</Box>
        ))}
      </Stack>

      {sub === 'free' && (
        <>
          <Card title="🧹 Ménages gratuits" meta="freeCleaningEnabled · frequency[]">
            <ToggleRow title="Activer les ménages gratuits" desc="Inclus dans le prix du séjour"
              checked={values.freeCleaningEnabled !== false} onChange={v => upd('freeCleaningEnabled', v)} />
            <SectionH>Fréquence selon durée séjour</SectionH>
            <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {(values.frequency || [
                { startDay: 1, endDay: 7, numberOfCleaning: 2 },
                { startDay: 8, endDay: 14, numberOfCleaning: 3 },
                { startDay: 15, endDay: 21, numberOfCleaning: 4 },
                { startDay: 22, endDay: 30, numberOfCleaning: 6 },
              ]).map((p, i) => (
                <Box key={i} sx={{ p: '10px 14px', border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg1, minWidth: 100, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontFamily: '"Geist Mono", monospace', color: T.text3 }}>J {p.startDay}–{p.endDay}</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.primaryDeep, fontFamily: '"Geist Mono", monospace' }}>{p.numberOfCleaning}</Typography>
                  <Typography sx={{ fontSize: 9.5, color: T.text3 }}>ménages</Typography>
                </Box>
              ))}
              <Box component="button" sx={{ all: 'unset', cursor: 'pointer', p: '10px 14px', border: `1px dashed ${T.borderStrong}`, borderRadius: 1, color: T.text3, fontSize: 11.5 }}>+ Ajouter palier</Box>
            </Stack>
          </Card>

          <Card title="🕒 Créneaux horaires" meta="TS_CLEAN[]">
            <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1.25 }}>Le voyageur choisira son créneau via WhatsApp.</Typography>
            <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
              {(values.TS_CLEAN || [
                { start: 10, end: 12, price: 0, default: true },
                { start: 14, end: 16, price: 0 },
                { start: 16, end: 18, price: 0 },
              ]).map((ts, i) => (
                <Box key={i} sx={{
                  px: 1.375, py: 0.75, border: `1px solid ${ts.default ? T.primary : T.border}`,
                  bgcolor: ts.default ? T.primaryTint : T.bg1, color: ts.default ? T.primaryDeep : T.text2,
                  borderRadius: 1, fontSize: 11.5, fontWeight: 600, fontFamily: '"Geist Mono", monospace',
                }}>
                  {String(ts.start).padStart(2, '0')}:00 → {String(ts.end).padStart(2, '0')}:00 {ts.default && '· défaut'}
                </Box>
              ))}
              <Box component="button" sx={{ all: 'unset', cursor: 'pointer', px: 1.375, py: 0.75, border: `1px dashed ${T.borderStrong}`, borderRadius: 1, color: T.text3, fontSize: 11.5 }}>+ Ajouter créneau</Box>
            </Stack>
          </Card>
        </>
      )}

      {sub === 'paid' && (
        <Card title="💰 Ménages payants" meta="paidCleaningConfig">
          <ToggleRow title="Activer les ménages payants" desc="Propose des ménages supplémentaires à tes voyageurs"
            checked={!!values.paidCleaningConfig?.enabled} onChange={v => upd('paidCleaningConfig', { ...(values.paidCleaningConfig || {}), enabled: v })} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
            <Field label="Fréquence">
              <SelectField value={values.paidCleaningConfig?.frequency || 'all_days'} onChange={v => upd('paidCleaningConfig', { ...(values.paidCleaningConfig || {}), frequency: v })}
                options={[{ value: 'all_days', label: 'Tous les jours' }, { value: 'per_week', label: 'Par semaine' }]} />
            </Field>
            <Field label="Par semaine (si applicable)">
              <Counter value={values.paidCleaningConfig?.perWeekCount ?? 2} onChange={v => upd('paidCleaningConfig', { ...(values.paidCleaningConfig || {}), perWeekCount: v })} min={1} max={7} />
            </Field>
          </Box>

          <SectionH>Types de ménages proposés · serviceTypes[]</SectionH>
          {[
            { id: 'express', emoji: '🧹', name: 'Ménage Express', price: 150, dur: 2, mode: 'Dynamic' },
            { id: 'complet', emoji: '🧼', name: 'Ménage Complet', price: 350, dur: 4, mode: '3 créneaux' },
          ].map(s => (
            <Box key={s.id} sx={{ p: 1.5, border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg1, mb: 0.75 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Box sx={{ fontSize: 18 }}>{s.emoji}</Box>
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{s.name}</Typography>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1.5, fontSize: 11, color: T.text3 }}>
                  <span><b style={{ color: T.text2 }}>{s.price} MAD</b></span>
                  <span>{s.dur}h</span>
                  <span>{s.mode}</span>
                </Box>
              </Stack>
            </Box>
          ))}
          <Button fullWidth sx={{ mt: 1, borderStyle: 'dashed', border: `1px dashed ${T.borderStrong}`, color: T.text3 }}>+ Nouveau type</Button>
        </Card>
      )}

      {sub === 'timeslots' && (
        <>
          <Card title="🛬 Créneaux d'arrivée" meta="TS_CHECKIN[]">
            <ToggleRow title="Activer les créneaux d'arrivée" checked={values.checkinTimeslotsEnabled !== false} onChange={v => upd('checkinTimeslotsEnabled', v)} />
            <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.5 }} useFlexGap>
              <Box sx={{ px: 1.375, py: 0.75, border: `1px solid ${T.primary}`, bgcolor: T.primaryTint, color: T.primaryDeep, borderRadius: 1, fontSize: 11.5, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>14:00 → 15:00 · Normal · défaut</Box>
              <Box sx={{ px: 1.375, py: 0.75, border: `1px solid ${T.info}40`, bgcolor: T.infoTint, color: T.info, borderRadius: 1, fontSize: 11.5, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>12:00 → 13:00 · Early · +50 MAD</Box>
              <Box sx={{ px: 1.375, py: 0.75, border: `1px dashed ${T.borderStrong}`, borderRadius: 1, color: T.text3, fontSize: 11.5 }}>+ Ajouter</Box>
            </Stack>
          </Card>
          <Card title="🛫 Créneaux de départ" meta="TS_CHECKOUT[]">
            <ToggleRow title="Activer les créneaux de départ" checked={values.checkoutTimeslotsEnabled !== false} onChange={v => upd('checkoutTimeslotsEnabled', v)} />
            <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.5 }} useFlexGap>
              <Box sx={{ px: 1.375, py: 0.75, border: `1px solid ${T.primary}`, bgcolor: T.primaryTint, color: T.primaryDeep, borderRadius: 1, fontSize: 11.5, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>10:00 → 11:00 · Normal · défaut</Box>
              <Box sx={{ px: 1.375, py: 0.75, border: `1px solid ${T.warning}40`, bgcolor: T.warningTint, color: T.warning, borderRadius: 1, fontSize: 11.5, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>12:00 → 13:00 · Late · +50 MAD</Box>
              <Box sx={{ px: 1.375, py: 0.75, border: `1px dashed ${T.borderStrong}`, borderRadius: 1, color: T.text3, fontSize: 11.5 }}>+ Ajouter</Box>
            </Stack>
          </Card>
        </>
      )}

      {sub === 'reg' && (
        <Card title="📄 Registration" meta="requiresOnlineCheckin">
          <ToggleRow title="Enregistrement en ligne (check-in online)" desc="Crée automatiquement un timeslot de type 'registration' lors de chaque réservation. Statuts: not_started → in_progress → completed"
            checked={!!values.requiresOnlineCheckin} onChange={v => upd('requiresOnlineCheckin', v)} />
          <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 1.5 }}>
            💡 Le voyageur recevra un lien WhatsApp pour scanner son passeport et compléter ses informations (assisté par AI dans <code>srv-chatbot</code>).
          </Typography>
        </Card>
      )}

      {sub === 'checkout' && (
        <>
          <Card title="📝 Instructions de départ" meta="messageCheckout[] · FR + EN">
            <Field label="Instructions départ · Français">
              <TextField size="small" multiline rows={4} fullWidth placeholder="Avant votre départ, merci de : • Vider le réfrigérateur • Fermer toutes les fenêtres ..."
                value={values.messageCheckout?.[0] || ''} onChange={e => upd('messageCheckout', [e.target.value, values.messageCheckout?.[1] || ''])} sx={sxInput} />
            </Field>
            <Box sx={{ mt: 1.5 }}>
              <Field label="Departure instructions · English">
                <TextField size="small" multiline rows={4} fullWidth placeholder="Before your departure, please: • Empty the refrigerator • Close all windows ..."
                  value={values.messageCheckout?.[1] || ''} onChange={e => upd('messageCheckout', [values.messageCheckout?.[0] || '', e.target.value])} sx={sxInput} />
              </Field>
            </Box>
          </Card>
          <Card title="💶 Taxe de séjour" meta="cityTaxEnabled">
            <ToggleRow title="Taxe de séjour activée" checked={!!values.cityTaxEnabled} onChange={v => upd('cityTaxEnabled', v)} />
            {values.cityTaxEnabled && (
              <Box sx={{ mt: 1.5 }}>
                <Field label="Montant par adulte / nuit (MAD)">
                  <NumberInput value={values.cityTaxPerAdultPerNight ?? 3.5} suffix="MAD" onChange={v => upd('cityTaxPerAdultPerNight', v)} />
                </Field>
              </Box>
            )}
          </Card>
        </>
      )}

      {sub === 'sojori' && (
        <Card title="🧼 Ménage Sojori automatique" meta="cleaningOrchestration">
          <ToggleRow title="Créer automatiquement les ménages Sojori après checkout"
            desc="Sojori prend en charge le ménage entre 2 séjours. Activé = workflow auto avec filet de sécurité."
            checked={!!values.cleaningOrchestration?.enabled}
            onChange={v => upd('cleaningOrchestration', { ...(values.cleaningOrchestration || {}), enabled: v })} />
          {values.cleaningOrchestration?.enabled && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
              <Field label="Jours après checkout" hint="0 = jour J, 1 = J+1, etc.">
                <SelectField value={values.cleaningOrchestration?.preferredDayAfterCheckout ?? 0}
                  onChange={v => upd('cleaningOrchestration', { ...(values.cleaningOrchestration || {}), preferredDayAfterCheckout: v })}
                  options={[
                    { value: 0, label: 'J (jour checkout)' },
                    { value: 1, label: 'J+1' },
                    { value: 2, label: 'J+2' },
                    { value: 3, label: 'J+3' },
                  ]} />
              </Field>
              <Field label="🛡 Max jours en statut DIRTY" hint="Au-delà → ménage urgence auto">
                <SelectField value={values.cleaningOrchestration?.safetyMaxDirtyDays ?? 4}
                  onChange={v => upd('cleaningOrchestration', { ...(values.cleaningOrchestration || {}), safetyMaxDirtyDays: v })}
                  options={[
                    { value: 1, label: '1 jour' }, { value: 2, label: '2 jours' },
                    { value: 3, label: '3 jours' }, { value: 4, label: '4 jours' },
                  ]} />
              </Field>
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}
