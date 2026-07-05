import { useMemo } from 'react';
import type {
  WizardCapabilities,
  WizardCleaningFreeTier,
  WizardDeadlines,
  WizardJxSettings,
  WizardPanel3,
  WizardScheduledMessageOverride,
  WizardServiceDeadlineOverride,
} from '../types';
import { applyJxPreset } from '../wizardGuestAccess';
import {
  defaultOrchestrationQuickConfig,
  defaultTransportAirportPrices,
} from '../onboardingOrchestrationDashboard';
import { resolveServiceRhythmRows } from '../onboardingWorkflowDefaults';
import { ADMIN_ESCALATION_DAYS, ADMIN_ESCALATION_HOURS, formatAdminEscalationDayLabel } from '../wizardStaffDeadlines';

/* ─────────────────────────── métadonnées services ─────────────────────────── */

type AvailabilityState = 'resa' | 'before' | 'off';

type ExpressService = {
  jxKey: keyof WizardJxSettings;
  caps: Array<keyof WizardCapabilities>;
  emoji: string;
  label: string;
  /** libellé J-X « dès la réservation » propre au groupe d'options */
  resaLabel: string;
  beforeLabel: (d: number) => string;
  /** Proposition unique (ex. « Jour d'arrivée ») — pas de choix J-7/J-3 */
  soloLabel?: string;
};

const EXPRESS_SERVICES: ExpressService[] = [
  { jxKey: 'registration', caps: ['registration'], emoji: '📝', label: 'Enregistrement voyageurs', resaLabel: 'À la réservation', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'arrivalChoose', caps: ['arrivalChoose'], emoji: '🕓', label: "Choisir l'heure d'arrivée", resaLabel: 'De la réservation à J-1', beforeLabel: (d) => `De J-${d} à J-1` },
  { jxKey: 'departureChoose', caps: ['departureChoose'], emoji: '🕐', label: "Choisir l'heure de départ", resaLabel: 'De la réservation à veille départ', beforeLabel: (d) => `De J-${d} à veille départ` },
  { jxKey: 'arrivalDeclare', caps: ['arrivalDeclare'], emoji: '📍', label: "Déclarer l'arrivée", resaLabel: "Jour d'arrivée (J0)", beforeLabel: () => "Jour d'arrivée (J0)", soloLabel: "Jour d'arrivée (J0)" },
  { jxKey: 'departureDeclare', caps: ['departureDeclare'], emoji: '🚪', label: 'Déclarer le départ', resaLabel: 'Jour de départ uniquement', beforeLabel: () => 'Jour de départ uniquement', soloLabel: 'Jour du départ (J0)' },
  { jxKey: 'support', caps: ['support'], emoji: '🆘', label: 'Support urgence', resaLabel: 'Toujours disponible', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'serviceClient', caps: ['serviceClient'], emoji: '🛎', label: 'Service client', resaLabel: 'Dès la réservation', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'transport', caps: ['transport'], emoji: '🚐', label: 'Navette aéroport', resaLabel: 'Dès la réservation', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'groceries', caps: ['groceries'], emoji: '🛒', label: 'Courses', resaLabel: 'Dès la réservation', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'concierge', caps: ['concierge'], emoji: '✨', label: 'Conciergerie', resaLabel: 'Dès la réservation', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'cleaning', caps: ['cleaningFree', 'cleaningPaid', 'cleaningSojori'], emoji: '🧹', label: 'Ménage', resaLabel: 'Dès la réservation', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'wifi', caps: ['wifi'], emoji: '📶', label: 'Infos WiFi', resaLabel: 'À la réservation', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'rules', caps: ['rules'], emoji: '📋', label: 'Règles du logement', resaLabel: 'À la réservation', beforeLabel: (d) => `À partir de J-${d}` },
];

/** Services avec tâche staff assignable (clé = taskType fulltask). */
const STAFF_SERVICES: Array<{ taskType: string; emoji: string; label: string; capAny: Array<keyof WizardCapabilities> }> = [
  { taskType: 'arrival_choose', emoji: '🕓', label: 'Accueil arrivée', capAny: ['arrivalChoose'] },
  { taskType: 'departure_choose', emoji: '🕐', label: 'Départ', capAny: ['departureChoose'] },
  { taskType: 'cleaning_free', emoji: '🧹', label: 'Ménage inclus', capAny: ['cleaningFree'] },
  { taskType: 'cleaning_paid', emoji: '🧹', label: 'Ménage payant', capAny: ['cleaningPaid'] },
  { taskType: 'transport', emoji: '🚐', label: 'Navette', capAny: ['transport'] },
  { taskType: 'groceries', emoji: '🛒', label: 'Courses', capAny: ['groceries'] },
  { taskType: 'concierge', emoji: '✨', label: 'Conciergerie', capAny: ['concierge'] },
  { taskType: 'support', emoji: '🆘', label: 'Support', capAny: ['support'] },
  { taskType: 'service_client', emoji: '🛎', label: 'Service client', capAny: ['serviceClient'] },
];

/** Services avec relance client possible. */
const CLIENT_REMINDER_SERVICES: Array<{ taskType: string; emoji: string; label: string; capAny: Array<keyof WizardCapabilities> }> = [
  { taskType: 'registration', emoji: '📝', label: 'Enregistrement', capAny: ['registration'] },
  { taskType: 'arrival_choose', emoji: '🕓', label: 'Heure d’arrivée', capAny: ['arrivalChoose'] },
  { taskType: 'departure_choose', emoji: '🕐', label: 'Heure de départ', capAny: ['departureChoose'] },
  { taskType: 'arrival_declare', emoji: '📍', label: 'Déclarer l’arrivée', capAny: ['arrivalDeclare'] },
  { taskType: 'departure_declare', emoji: '🚪', label: 'Déclarer le départ', capAny: ['departureDeclare'] },
  { taskType: 'cleaning_free', emoji: '🧹', label: 'Ménage inclus', capAny: ['cleaningFree'] },
];

const REMINDER_DAY_CHOICES = [-3, -2, -1, 0] as const;

/** Heures d'envoi proposées pour les relances client. */
const REMINDER_HOUR_CHOICES = ['08:00', '09:00', '10:00', '11:00', '14:00', '16:00', '18:00'] as const;

/** Messages planifiés PM — miroir du template fulltask (4 messages du plan). */
type ScheduledMessageDef = {
  messageId: string;
  emoji: string;
  label: string;
  refLabel: string;
  channel: string;
} & (
  | { kind: 'hours'; defaultHours: number; hourChoices: number[] }
  | { kind: 'day'; defaultDay: number; defaultTime: string; dayChoices: number[] }
);

const SCHEDULED_MESSAGE_DEFS: ScheduledMessageDef[] = [
  {
    messageId: 'welcome_sojori_v2', emoji: '👋', label: 'Bienvenu',
    refLabel: 'après la réservation', channel: 'OTA / Email',
    kind: 'hours', defaultHours: 1, hourChoices: [0, 1, 2, 4],
  },
  {
    messageId: 'checkin_feedback', emoji: '☺️', label: 'Comment ça va ?',
    refLabel: 'après l’arrivée', channel: 'WhatsApp',
    kind: 'day', defaultDay: 1, defaultTime: '15:00', dayChoices: [0, 1, 2],
  },
  {
    messageId: 'departure_instructions', emoji: '⭐', label: 'Instructions départ',
    refLabel: 'avant le départ', channel: 'WhatsApp',
    kind: 'day', defaultDay: -1, defaultTime: '11:00', dayChoices: [-2, -1, 0],
  },
  {
    messageId: 'checkout_feedback', emoji: '💌', label: 'Nouvelles après départ',
    refLabel: 'après le départ', channel: 'OTA / Email',
    kind: 'day', defaultDay: 2, defaultTime: '10:00', dayChoices: [1, 2, 3],
  },
];

function scheduledDayLabel(day: number): string {
  return day === 0 ? 'Jour J' : day > 0 ? `J+${day}` : `J${day}`;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`ob-toggle ${on ? 'on' : ''}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    />
  );
}

type Props = {
  panel3: WizardPanel3;
  deadlines: WizardDeadlines;
  cities: string[];
  onChangePanel3: (patch: Partial<WizardPanel3>) => void;
  onChangeDeadlines: (patch: Partial<WizardDeadlines>) => void;
};

export default function OnboardingStepOrchestrationExpress({
  panel3,
  deadlines,
  cities,
  onChangePanel3,
  onChangeDeadlines,
}: Props) {
  const caps = panel3.capabilities;
  const jx = panel3.jx ?? applyJxPreset('standard');
  const quickConfig = panel3.quickConfig ?? defaultOrchestrationQuickConfig(cities);

  /* ── disponibilité : état courant dérivé du jx ('resa' | jour J-X | 'off') ── */
  const availabilityOf = (svc: ExpressService): 'resa' | 'off' | number => {
    if (!svc.caps.some((c) => caps[c])) return 'off';
    const label = String(jx[svc.jxKey] ?? '');
    if (/réservation|toujours/i.test(label)) return 'resa';
    const day = Number(label.match(/J-(\d+)/)?.[1] ?? 3);
    return day;
  };

  const AVAILABILITY_DAYS = [7, 3, 2, 1] as const;

  /** Genre de fin selon le service : arrivée (J-1/J0), départ (veille/jour J) ou générique (J-1/J0/départ). */
  const endKindOf = (svc: ExpressService): 'arrival' | 'departure' | 'generic' =>
    svc.jxKey === 'arrivalChoose' ? 'arrival' : svc.jxKey === 'departureChoose' ? 'departure' : 'generic';

  /** Construit le libellé jx pour un début (resa | J-X) et une fin. */
  const mkJxLabel = (svc: ExpressService, start: 'resa' | number, fin: string): string => {
    const kind = endKindOf(svc);
    if (kind === 'arrival') {
      return start === 'resa' ? `De la réservation à ${fin}` : `De J-${start} à ${fin}`;
    }
    if (kind === 'departure') {
      const suffix = fin === 'jourJ' ? 'au jour du départ' : 'à veille départ';
      return start === 'resa' ? `De la réservation ${suffix}` : `De J-${start} ${suffix}`;
    }
    // générique : fin départ = libellés historiques (résa / À partir de J-X)
    if (fin === 'depart') return start === 'resa' ? svc.resaLabel : svc.beforeLabel(start as number);
    return start === 'resa' ? `De la réservation à ${fin}` : `De J-${start} à ${fin}`;
  };

  /** État courant (toujours | début, fin) dérivé du libellé jx. */
  const parseJxState = (svc: ExpressService, label: string): { toujours: boolean; start: 'resa' | number | null; fin: string } => {
    const kind = endKindOf(svc);
    const defFin = kind === 'departure' ? 'veille' : kind === 'arrival' ? 'J-1' : 'depart';
    if (/^Toujours/i.test(label)) return { toujours: true, start: null, fin: defFin };
    let fin = defFin;
    if (kind === 'departure') fin = /au jour du départ$/i.test(label) ? 'jourJ' : 'veille';
    else if (/à J0$/i.test(label)) fin = 'J0';
    else if (kind === 'generic' && /à J-1$/i.test(label)) fin = 'J-1';
    else if (kind === 'arrival') fin = 'J-1';
    const day = label.match(/(?:De|À partir de) J-(\d+)/i)?.[1];
    if (day) return { toujours: false, start: Number(day), fin };
    if (/réservation/i.test(label)) return { toujours: false, start: 'resa', fin };
    return { toujours: false, start: null, fin };
  };

  const END_SEGS: Record<'arrival' | 'departure' | 'generic', Array<{ ui: string; fin: string }>> = {
    arrival: [{ ui: '→ J-1', fin: 'J-1' }, { ui: '→ J0', fin: 'J0' }],
    departure: [{ ui: '→ veille', fin: 'veille' }, { ui: '→ jour J', fin: 'jourJ' }],
    generic: [{ ui: '→ J-1', fin: 'J-1' }, { ui: '→ J0', fin: 'J0' }, { ui: '→ départ', fin: 'depart' }],
  };

  const setJxLabel = (svc: ExpressService, jxLabel: string) => {
    const nextCaps = { ...caps };
    for (const c of svc.caps) {
      if (svc.jxKey === 'cleaning') {
        nextCaps.cleaningFree = quickConfig.cleaningModes.free || (!quickConfig.cleaningModes.paid && !quickConfig.cleaningModes.sojori) ? true : nextCaps.cleaningFree;
        nextCaps.cleaningPaid = quickConfig.cleaningModes.paid;
        nextCaps.cleaningSojori = quickConfig.cleaningModes.sojori;
      } else {
        nextCaps[c] = true;
      }
    }
    onChangePanel3({ capabilities: nextCaps, jx: { ...jx, [svc.jxKey]: jxLabel, preset: 'custom' } as WizardJxSettings });
  };

  const setAvailability = (svc: ExpressService, state: AvailabilityState, days = 3) => {
    const nextCaps = { ...caps };
    for (const c of svc.caps) {
      // Ménage : « on » ne force que cleaningFree (les modes se règlent dans la section Ménage)
      if (svc.jxKey === 'cleaning' && state !== 'off') {
        nextCaps.cleaningFree = quickConfig.cleaningModes.free || (!quickConfig.cleaningModes.paid && !quickConfig.cleaningModes.sojori) ? true : nextCaps.cleaningFree;
        nextCaps.cleaningPaid = quickConfig.cleaningModes.paid;
        nextCaps.cleaningSojori = quickConfig.cleaningModes.sojori;
      } else {
        nextCaps[c] = state !== 'off';
      }
    }
    const nextJx: WizardJxSettings = { ...jx, preset: 'custom' };
    if (state === 'resa') nextJx[svc.jxKey] = svc.resaLabel as never;
    if (state === 'before') nextJx[svc.jxKey] = svc.beforeLabel(days) as never;
    onChangePanel3({ capabilities: nextCaps, jx: nextJx });
  };

  /* ── rythme équipe : dérivé des rows résolues ── */
  const rows = useMemo(() => resolveServiceRhythmRows(deadlines, caps), [deadlines, caps]);
  const rowByType = useMemo(() => new Map(rows.map((r) => [r.taskType, r])), [rows]);

  const patchService = (taskType: string, patch: WizardServiceDeadlineOverride) => {
    onChangeDeadlines({
      perService: {
        ...(deadlines.perService ?? {}),
        [taskType]: { ...(deadlines.perService?.[taskType] ?? {}), ...patch },
      },
    });
  };

  const patchServices = (patches: Record<string, WizardServiceDeadlineOverride>) => {
    const merged = { ...(deadlines.perService ?? {}) };
    for (const [taskType, patch] of Object.entries(patches)) {
      merged[taskType] = { ...(merged[taskType] ?? {}), ...patch };
    }
    onChangeDeadlines({ perService: merged });
  };

  /** 'immediate' | jour J-X (0 = jour J) | 'none' */
  const assignStateOf = (taskType: string): 'immediate' | 'none' | number => {
    const row = rowByType.get(taskType);
    if (!row || row.staffAssignStyle === 'none') return 'none';
    if (row.staffAssignStyle === 'immediate') return 'immediate';
    return Number.isFinite(row.staffAssignDaysBefore) ? row.staffAssignDaysBefore : 3;
  };

  const assignTimeOf = (taskType: string): string =>
    rowByType.get(taskType)?.staffAssignTime ?? '09:00';

  const setAssign = (taskType: string, state: 'immediate' | 'days' | 'none', days = 3) => {
    if (state === 'none') patchService(taskType, { staffAssignStyle: 'none', staffAssignDaysBefore: 0 });
    else if (state === 'immediate') patchService(taskType, { staffAssignStyle: 'immediate', staffAssignDaysBefore: 0 });
    else patchService(taskType, { staffAssignStyle: 'days_before', staffAssignDaysBefore: days });
  };

  /** Auto-accepté (assignation sans acceptation staff) — défaut : partenaires en Immédiat. */
  const PARTNER_TYPES = ['transport', 'groceries', 'concierge'];
  const autoAssignOf = (taskType: string): boolean => {
    const row = rowByType.get(taskType);
    if (!row) return false;
    return row.staffAutoAssign ?? (row.staffAssignStyle === 'immediate' && PARTNER_TYPES.includes(taskType));
  };
  const toggleAutoAssign = (taskType: string) => {
    patchService(taskType, { staffAutoAssign: !autoAssignOf(taskType) });
  };

  /* ── relances client : jours multi-sélection + heure par service ── */
  const reminderDaysOf = (taskType: string): number[] =>
    rowByType.get(taskType)?.clientReminderDays ?? [];

  const reminderTimeOf = (taskType: string): string =>
    rowByType.get(taskType)?.clientReminderTime ?? '10:00';

  const toggleReminderDay = (taskType: string, day: number) => {
    const current = reminderDaysOf(taskType);
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    patchService(taskType, { clientReminderDays: next });
  };

  /* ── messages planifiés PM (bienvenue, instructions…) ── */
  const msgOverrideOf = (messageId: string): WizardScheduledMessageOverride | undefined =>
    (panel3.scheduledMessages ?? []).find((m) => m.messageId === messageId);

  const patchScheduledMessage = (messageId: string, patch: Partial<WizardScheduledMessageOverride>) => {
    const list = [...(panel3.scheduledMessages ?? [])];
    const i = list.findIndex((m) => m.messageId === messageId);
    if (i >= 0) list[i] = { ...list[i], ...patch };
    else list.push({ messageId, ...patch });
    onChangePanel3({ scheduledMessages: list });
  };

  /* ── rappel staff / escalade — globaux ── */
  const staffReminderGlobal = rows.some((r) => r.staffReminderDays.length > 0);

  /** Jour du rappel relatif à la tâche (-2, -1, 0) — dérivé des rows (défaut J-1). */
  const staffReminderDay = useMemo(() => {
    const withReminder = rows.find(
      (r) => r.taskType !== 'checkout_cleaning' && r.staffReminderDays.length > 0,
    );
    const d = withReminder?.staffReminderDays[0];
    return d != null && [-2, -1, 0].includes(d) ? d : -1;
  }, [rows]);

  const writeStaffReminderDays = (on: boolean, day: number) => {
    const patches: Record<string, WizardServiceDeadlineOverride> = {};
    for (const svc of STAFF_SERVICES) {
      patches[svc.taskType] = { staffReminderDays: on ? [day] : [] };
    }
    // checkout_cleaning : la tâche a lieu J+1 après check-out → décalage +1 (ex. veille = jour du check-out)
    patches.checkout_cleaning = { staffReminderDays: on ? [day + 1] : [] };
    patchServices(patches);
  };

  const setStaffReminderGlobal = (on: boolean) => writeStaffReminderDays(on, staffReminderDay);
  const setStaffReminderDayGlobal = (day: number) => writeStaffReminderDays(true, day);

  const staffReminderTime = useMemo(() => {
    const withReminder = rows.find((r) => r.staffReminderDays.length > 0);
    return withReminder?.staffReminderTime ?? '11:00';
  }, [rows]);

  const setStaffReminderTimeGlobal = (time: string) => {
    const patches: Record<string, WizardServiceDeadlineOverride> = {};
    for (const svc of STAFF_SERVICES) {
      patches[svc.taskType] = { staffReminderTime: time };
    }
    patches.checkout_cleaning = { staffReminderTime: time };
    patchServices(patches);
  };

  const escalationGlobal = rows.some((r) => r.escalationEnabled);
  const setEscalationGlobal = (on: boolean) => {
    const patches: Record<string, WizardServiceDeadlineOverride> = {};
    for (const svc of [...STAFF_SERVICES.map((s) => s.taskType), 'registration', 'checkout_cleaning']) {
      patches[svc] = { escalationEnabled: on };
    }
    patchServices(patches);
  };

  /* ── navette : villes + prix ── */
  const transportCities = Object.keys(quickConfig.transportAirportByCity);
  const toggleTransportCity = (city: string) => {
    const next = { ...quickConfig.transportAirportByCity };
    if (next[city] != null) delete next[city];
    else next[city] = defaultTransportAirportPrices([city])[city] ?? 400;
    onChangePanel3({ quickConfig: { ...quickConfig, transportAirportByCity: next } });
  };
  const setTransportPrice = (city: string, price: number) => {
    onChangePanel3({
      quickConfig: {
        ...quickConfig,
        transportAirportByCity: { ...quickConfig.transportAirportByCity, [city]: price },
      },
    });
  };

  /* ── ménage : modes + paliers ── */
  const setCleaningMode = (mode: 'free' | 'paid' | 'sojori', on: boolean) => {
    const cleaningModes = { ...quickConfig.cleaningModes, [mode]: on };
    onChangePanel3({
      capabilities: {
        ...caps,
        cleaningFree: cleaningModes.free,
        cleaningPaid: cleaningModes.paid,
        cleaningSojori: cleaningModes.sojori,
      },
      quickConfig: { ...quickConfig, cleaningModes },
    });
  };

  const updateTier = (i: number, patch: Partial<WizardCleaningFreeTier>) => {
    const tiers = [...quickConfig.cleaningFreeTiers];
    tiers[i] = { ...tiers[i], ...patch };
    onChangePanel3({ quickConfig: { ...quickConfig, cleaningFreeTiers: tiers } });
  };
  const removeTier = (i: number) =>
    onChangePanel3({
      quickConfig: { ...quickConfig, cleaningFreeTiers: quickConfig.cleaningFreeTiers.filter((_, x) => x !== i) },
    });
  const addTier = () => {
    const last = quickConfig.cleaningFreeTiers[quickConfig.cleaningFreeTiers.length - 1];
    const startDay = last ? last.endDay + 1 : 1;
    onChangePanel3({
      quickConfig: {
        ...quickConfig,
        cleaningFreeTiers: [...quickConfig.cleaningFreeTiers, { startDay, endDay: startDay + 9, numberOfCleaning: 1 }],
      },
    });
  };

  const seg = (
    active: boolean,
    label: string,
    onClick: () => void,
  ) => (
    <button type="button" className={`ob-x-seg-btn${active ? ' on' : ''}`} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <div className="ob-x">
      {/* ── 1 · Quand chaque service est proposé au voyageur ── */}
      <section className="ob-card ob-x-section">
        <div className="ob-card-b">
          <p className="ob-x-title">📱 Quand proposer chaque service au voyageur ?</p>
          <p className="ob-x-hint">
            <strong>Toujours</strong> = de la réservation au départ du client. Sinon : début
            (À la réservation ou J-X avant l&apos;arrivée) → fin (J-1, J0 ou départ).
          </p>
          <div className="ob-x-rows">
            {EXPRESS_SERVICES.map((svc) => {
              const state = availabilityOf(svc);
              const isOn = state !== 'off';
              const curLabel = String(jx[svc.jxKey] ?? '');
              const st = parseJxState(svc, curLabel);
              const kind = endKindOf(svc);
              return (
                <div key={svc.jxKey} className={`ob-x-row${isOn ? '' : ' ob-x-row--off'}`}>
                  <span className="ob-x-row-label">
                    {svc.emoji} {svc.label}
                    <span className="ob-x-tag">Flow</span>
                  </span>
                  <span className="ob-x-inline-choices">
                    <span className="ob-x-seg">
                      {svc.soloLabel ? (
                        seg(isOn, svc.soloLabel, () => setAvailability(svc, 'resa'))
                      ) : (
                        <>
                          {seg(isOn && st.toujours, 'Toujours', () => setJxLabel(svc, 'Toujours disponible'))}
                          {seg(isOn && !st.toujours && st.start === 'resa', 'À la réservation', () =>
                            setJxLabel(svc, mkJxLabel(svc, 'resa', st.fin)))}
                          {AVAILABILITY_DAYS.map((d) =>
                            seg(isOn && !st.toujours && st.start === d, `J-${d}`, () =>
                              setJxLabel(svc, mkJxLabel(svc, d, st.fin))),
                          )}
                        </>
                      )}
                      {seg(!isOn, 'Off', () => setAvailability(svc, 'off'))}
                    </span>
                    {isOn && !svc.soloLabel && !st.toujours && st.start !== null && (
                      <span className="ob-x-seg">
                        {END_SEGS[kind].map((e) =>
                          seg(st.fin === e.fin, e.ui, () =>
                            setJxLabel(svc, mkJxLabel(svc, st.start as 'resa' | number, e.fin))),
                        )}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="ob-x-auto">
            Réglé automatiquement : codes d&apos;accès après enregistrement + créneau. Modifiable
            dans « Avancé ».
          </p>
        </div>
      </section>

      {/* ── 2 · Ménage ── */}
      {(caps.cleaningFree || caps.cleaningPaid || caps.cleaningSojori || availabilityOf(EXPRESS_SERVICES.find((s) => s.jxKey === 'cleaning')!) !== 'off') && (
        <section className="ob-card ob-x-section">
          <div className="ob-card-b">
            <p className="ob-x-title">🧹 Quel ménage proposez-vous ?</p>
            <div className="ob-orch-quick-modes">
              <label className="ob-orch-quick-mode">
                <Toggle on={quickConfig.cleaningModes.free} onChange={(v) => setCleaningMode('free', v)} />
                <span>Inclus (gratuit selon durée)</span>
              </label>
              <label className="ob-orch-quick-mode">
                <Toggle on={quickConfig.cleaningModes.paid} onChange={(v) => setCleaningMode('paid', v)} />
                <span>Payant à la demande</span>
              </label>
              <label className="ob-orch-quick-mode">
                <Toggle on={quickConfig.cleaningModes.sojori} onChange={(v) => setCleaningMode('sojori', v)} />
                <span>Ménage Sojori après chaque départ</span>
              </label>
            </div>
            {quickConfig.cleaningModes.free ? (
              <>
                <p className="ob-x-hint" style={{ marginTop: 10 }}>
                  Ménages inclus — combien selon la durée du séjour ?
                </p>
                <div className="ob-orch-tier-table">
                  {quickConfig.cleaningFreeTiers.map((tier, i) => (
                    <div key={`tier-${i}`} className="ob-orch-tier-row">
                      <label>
                        De
                        <input
                          className="ob-field ob-field--dense"
                          type="number"
                          min={1}
                          value={tier.startDay}
                          onChange={(e) => updateTier(i, { startDay: Number(e.target.value) || 1 })}
                        />
                      </label>
                      <label>
                        à
                        <input
                          className="ob-field ob-field--dense"
                          type="number"
                          min={1}
                          value={tier.endDay}
                          onChange={(e) => updateTier(i, { endDay: Number(e.target.value) || 1 })}
                        />
                        nuits
                      </label>
                      <label>
                        →
                        <input
                          className="ob-field ob-field--dense"
                          type="number"
                          min={0}
                          value={tier.numberOfCleaning}
                          onChange={(e) => updateTier(i, { numberOfCleaning: Number(e.target.value) || 0 })}
                        />
                        ménage(s)
                      </label>
                      <button
                        type="button"
                        className="ob-orch-tier-remove"
                        title="Supprimer cet intervalle"
                        onClick={() => removeTier(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="ob-btn-ghost ob-orch-tier-add" onClick={addTier}>
                  + Ajouter un intervalle
                </button>
              </>
            ) : null}
          </div>
        </section>
      )}

      {/* ── 3 · Navette aéroport ── */}
      {caps.transport && (
        <section className="ob-card ob-x-section">
          <div className="ob-card-b">
            <p className="ob-x-title">🚐 Navette aéroport — dans quelles villes, à quel prix ?</p>
            <div className="ob-x-rows">
              {[...new Set([...cities, ...transportCities])].map((city) => {
                const on = quickConfig.transportAirportByCity[city] != null;
                return (
                  <div key={city} className={`ob-x-row${on ? '' : ' ob-x-row--off'}`}>
                    <span className="ob-x-row-label">
                      <button
                        type="button"
                        className={`ob-chip${on ? ' on' : ''}`}
                        onClick={() => toggleTransportCity(city)}
                      >
                        {city}
                      </button>
                    </span>
                    {on ? (
                      <label className="ob-x-price">
                        <input
                          className="ob-field ob-field--dense"
                          type="number"
                          min={0}
                          step={50}
                          value={quickConfig.transportAirportByCity[city]}
                          onChange={(e) => setTransportPrice(city, Number(e.target.value) || 0)}
                        />
                        MAD
                      </label>
                    ) : (
                      <span className="ob-x-access-hint">non proposée</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 4 · Messages planifiés PM ── */}
      <section className="ob-card ob-x-section">
        <div className="ob-card-b">
          <p className="ob-x-title">💬 Quand envoyer chaque message ?</p>
          <p className="ob-x-hint">
            Messages automatiques du séjour (textes modifiables dans Orchestration · Messages).
            Chaque annonce hérite de la liste — désactivable par annonce.
          </p>
          <div className="ob-x-rows">
            {SCHEDULED_MESSAGE_DEFS.map((def) => {
              const ov = msgOverrideOf(def.messageId);
              const enabled = ov?.enabled ?? true;
              return (
                <div key={def.messageId} className={`ob-x-row${enabled ? '' : ' ob-x-row--off'}`}>
                  <span className="ob-x-row-label">
                    {def.emoji} {def.label}
                    <span className="ob-x-tag">Message</span>
                    <span className="ob-x-access-hint"> — {def.refLabel} · {def.channel}</span>
                  </span>
                  <span className="ob-x-inline-choices">
                    {enabled && def.kind === 'hours' && (
                      <span className="ob-x-inline-choices">
                        {def.hourChoices.map((h) => {
                          const cur = ov?.hours ?? def.defaultHours;
                          return (
                            <button
                              key={h}
                              type="button"
                              className={`ob-chip ob-x-day${cur === h ? ' on' : ''}`}
                              onClick={() => patchScheduledMessage(def.messageId, { hours: h })}
                            >
                              {h === 0 ? 'Immédiat' : `+${h}h`}
                            </button>
                          );
                        })}
                      </span>
                    )}
                    {enabled && def.kind === 'day' && (
                      <>
                        <span className="ob-x-inline-choices">
                          {def.dayChoices.map((d) => {
                            const cur = ov?.day ?? def.defaultDay;
                            return (
                              <button
                                key={d}
                                type="button"
                                className={`ob-chip ob-x-day${cur === d ? ' on' : ''}`}
                                onClick={() => patchScheduledMessage(def.messageId, { day: d })}
                              >
                                {scheduledDayLabel(d)}
                              </button>
                            );
                          })}
                        </span>
                        <select
                          className="ob-field ob-field--dense ob-x-hour"
                          value={ov?.time ?? def.defaultTime}
                          onChange={(e) => patchScheduledMessage(def.messageId, { time: e.target.value })}
                        >
                          {[
                            ...REMINDER_HOUR_CHOICES,
                            ...(REMINDER_HOUR_CHOICES.includes((ov?.time ?? def.defaultTime) as (typeof REMINDER_HOUR_CHOICES)[number])
                              ? []
                              : [ov?.time ?? def.defaultTime]),
                          ].map((h) => (
                            <option key={h} value={h}>
                              {Number(h.slice(0, 2))}h
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <Toggle
                      on={enabled}
                      onChange={(v) => {
                        patchScheduledMessage(def.messageId, { enabled: v });
                        // Bienvenu = capability welcome du modèle owner
                        if (def.messageId === 'welcome_sojori_v2') {
                          onChangePanel3({
                            capabilities: { ...caps, welcome: v },
                            jx: { ...jx, welcome: 'À la réservation', preset: 'custom' },
                          });
                        }
                      }}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5 · Relances client ── */}
      <section className="ob-card ob-x-section">
        <div className="ob-card-b">
          <p className="ob-x-title">💌 Relancer le voyageur s&apos;il n&apos;a pas répondu ?</p>
          <p className="ob-x-hint">
            Choisissez les jours de relance par service — un seul ou plusieurs (J0 = jour de la
            tâche). Aucun jour = pas de relance. L&apos;heure = envoi des relances.
          </p>
          {CLIENT_REMINDER_SERVICES.every((svc) => !svc.capAny.some((c) => caps[c])) && (
            <p className="ob-x-auto">Activez des services dans « Quand proposer chaque service » pour régler les relances.</p>
          )}
          <div className="ob-x-rows">
            {CLIENT_REMINDER_SERVICES.filter((svc) => svc.capAny.some((c) => caps[c])).map((svc) => {
              const days = reminderDaysOf(svc.taskType);
              return (
                <div key={svc.taskType} className={`ob-x-row${days.length === 0 ? ' ob-x-row--off' : ''}`}>
                  <span className="ob-x-row-label">
                    {svc.emoji} {svc.label}
                  </span>
                  <span className="ob-x-inline-choices">
                    {REMINDER_DAY_CHOICES.map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`ob-chip ob-x-day${days.includes(day) ? ' on' : ''}`}
                        onClick={() => toggleReminderDay(svc.taskType, day)}
                      >
                        {day === 0 ? 'J0' : `J${day}`}
                      </button>
                    ))}
                    {days.length > 0 && (
                      <select
                        className="ob-field ob-field--dense ob-x-hour"
                        value={reminderTimeOf(svc.taskType)}
                        onChange={(e) => patchService(svc.taskType, { clientReminderTime: e.target.value })}
                      >
                        {[
                          ...REMINDER_HOUR_CHOICES,
                          ...(REMINDER_HOUR_CHOICES.includes(reminderTimeOf(svc.taskType) as (typeof REMINDER_HOUR_CHOICES)[number])
                            ? []
                            : [reminderTimeOf(svc.taskType)]),
                        ].map((h) => (
                          <option key={h} value={h}>
                            {Number(h.slice(0, 2))}h
                          </option>
                        ))}
                      </select>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6 · Assignation staff ── */}
      <section className="ob-card ob-x-section">
        <div className="ob-card-b">
          <p className="ob-x-title">👷 Quand assigner votre staff ?</p>
          <p className="ob-x-hint">
            Vous choisissez le <strong>début de la fenêtre</strong> et l&apos;heure de la première
            tentative — la fenêtre se termine la veille de la tâche (J-1) à l&apos;heure
            d&apos;escalade ({formatAdminEscalationDayLabel(deadlines.adminEscalationDay ?? -1)} {(deadlines.adminEscalationHour ?? '11')}h). Immédiat = dès la création
            de la tâche · J0 = le jour même (jusqu&apos;à 18h).{' '}
            <strong>Auto-accepté</strong> = assigné directement, sans acceptation du staff.
          </p>
          {STAFF_SERVICES.every((svc) => !svc.capAny.some((c) => caps[c])) && (
            <p className="ob-x-auto">Activez des services dans « Quand proposer chaque service » pour régler l'assignation.</p>
          )}
          <div className="ob-x-rows">
            {STAFF_SERVICES.filter((svc) => svc.capAny.some((c) => caps[c])).map((svc) => {
              const state = assignStateOf(svc.taskType);
              const auto = autoAssignOf(svc.taskType);
              const windowHint =
                typeof state !== 'number'
                  ? null
                  : state === 0
                    ? '→ fin J0 18h'
                    : `→ fin ${formatAdminEscalationDayLabel(deadlines.adminEscalationDay ?? -1)} ${(deadlines.adminEscalationHour ?? '11')}h`;
              return (
                <div key={svc.taskType} className="ob-x-row">
                  <span className="ob-x-row-label">
                    {svc.emoji} {svc.label}
                  </span>
                  <span className="ob-x-inline-choices">
                    <span className="ob-x-seg">
                      {seg(state === 'immediate', 'Immédiat', () => setAssign(svc.taskType, 'immediate'))}
                      {seg(state === 7, 'Dès J-7', () => setAssign(svc.taskType, 'days', 7))}
                      {seg(state === 3, 'Dès J-3', () => setAssign(svc.taskType, 'days', 3))}
                      {seg(state === 1, 'Dès J-1', () => setAssign(svc.taskType, 'days', 1))}
                      {seg(state === 0, 'J0', () => setAssign(svc.taskType, 'days', 0))}
                      {seg(state === 'none', '—', () => setAssign(svc.taskType, 'none'))}
                    </span>
                    {typeof state === 'number' && (
                      <>
                        <select
                          className="ob-field ob-field--dense ob-x-hour"
                          value={assignTimeOf(svc.taskType)}
                          onChange={(e) => patchService(svc.taskType, { staffAssignTime: e.target.value })}
                        >
                          {[
                            ...REMINDER_HOUR_CHOICES,
                            ...(REMINDER_HOUR_CHOICES.includes(assignTimeOf(svc.taskType) as (typeof REMINDER_HOUR_CHOICES)[number])
                              ? []
                              : [assignTimeOf(svc.taskType)]),
                          ].map((h) => (
                            <option key={h} value={h}>
                              {Number(h.slice(0, 2))}h
                            </option>
                          ))}
                        </select>
                        <span className="ob-x-access-hint">{windowHint}</span>
                      </>
                    )}
                    {state !== 'none' && (
                      <button
                        type="button"
                        className={`ob-chip ob-x-day${auto ? ' on' : ''}`}
                        title="Auto-accepté : la tâche est assignée directement, sans acceptation du staff"
                        onClick={() => toggleAutoAssign(svc.taskType)}
                      >
                        Auto-accepté {auto ? '✓' : '✗'}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {caps.cleaningSojori && (
            <p className="ob-x-auto">Ménage Sojori : assigné automatiquement autour du check-out.</p>
          )}
        </div>
      </section>

      {/* ── 7 · Rappels & escalade ── */}
      <section className="ob-card ob-x-section">
        <div className="ob-card-b">
          <p className="ob-x-title">🔔 Filet de sécurité</p>
          <p className="ob-x-hint">
            Défaut : rappel staff J-1 à 11h · escalade admin J-1 à 11h — jour (par rapport à la
            tâche) et heure modifiables pour les deux.
          </p>
          <div className="ob-x-rows">
            <div className="ob-x-row">
              <span className="ob-x-row-label">Rappel au staff avant chaque tâche</span>
              <span className="ob-x-inline-choices">
                {staffReminderGlobal && (
                  <>
                    <span className="ob-x-seg" style={{ marginRight: 4 }}>
                      {ADMIN_ESCALATION_DAYS.map(({ day, label }) =>
                        seg(staffReminderDay === day, label, () => setStaffReminderDayGlobal(day)),
                      )}
                    </span>
                    <select
                      className="ob-field ob-field--dense ob-x-hour"
                      value={staffReminderTime}
                      onChange={(e) => setStaffReminderTimeGlobal(e.target.value)}
                    >
                      {[
                        ...REMINDER_HOUR_CHOICES,
                        ...(REMINDER_HOUR_CHOICES.includes(staffReminderTime as (typeof REMINDER_HOUR_CHOICES)[number])
                          ? []
                          : [staffReminderTime]),
                      ].map((h) => (
                        <option key={h} value={h}>
                          {Number(h.slice(0, 2))}h
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <Toggle on={staffReminderGlobal} onChange={setStaffReminderGlobal} />
              </span>
            </div>
            <div className="ob-x-row">
              <span className="ob-x-row-label">Alerter l&apos;admin si rien n&apos;est traité (escalade)</span>
              <span className="ob-x-inline-choices">
                {escalationGlobal && (
                  <>
                    <span className="ob-x-seg" style={{ marginRight: 4 }}>
                      {ADMIN_ESCALATION_DAYS.map(({ day, label }) =>
                        seg(
                          (deadlines.adminEscalationDay ?? -1) === day,
                          label,
                          () => onChangeDeadlines({ adminEscalationDay: day }),
                        ),
                      )}
                    </span>
                    <select
                      className="ob-field ob-field--dense ob-x-hour"
                      value={deadlines.adminEscalationHour ?? '11'}
                      onChange={(e) => onChangeDeadlines({ adminEscalationHour: e.target.value })}
                    >
                      {ADMIN_ESCALATION_HOURS.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <Toggle on={escalationGlobal} onChange={setEscalationGlobal} />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
