import { useMemo } from 'react';
import type {
  WizardCapabilities,
  WizardCleaningFreeTier,
  WizardDeadlines,
  WizardJxSettings,
  WizardPanel3,
  WizardServiceDeadlineOverride,
} from '../types';
import { applyJxPreset } from '../wizardGuestAccess';
import {
  defaultOrchestrationQuickConfig,
  defaultTransportAirportPrices,
} from '../onboardingOrchestrationDashboard';
import { resolveServiceRhythmRows } from '../onboardingWorkflowDefaults';
import { ADMIN_ESCALATION_HOURS } from '../wizardStaffDeadlines';

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
};

const EXPRESS_SERVICES: ExpressService[] = [
  { jxKey: 'welcome', caps: ['welcome'], emoji: '👋', label: 'Message de bienvenue', resaLabel: 'À la réservation', beforeLabel: (d) => `J-${d} avant arrivée` },
  { jxKey: 'registration', caps: ['registration'], emoji: '📝', label: 'Enregistrement voyageurs', resaLabel: 'À la réservation', beforeLabel: (d) => `À partir de J-${d}` },
  { jxKey: 'arrivalChoose', caps: ['arrivalChoose'], emoji: '🕓', label: "Choisir l'heure d'arrivée", resaLabel: 'De la réservation à J-1', beforeLabel: (d) => `De J-${d} à J-1` },
  { jxKey: 'departureChoose', caps: ['departureChoose'], emoji: '🕐', label: "Choisir l'heure de départ", resaLabel: 'De la réservation à veille départ', beforeLabel: (d) => `De J-${d} à veille départ` },
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
  { taskType: 'cleaning_free', emoji: '🧹', label: 'Ménage inclus', capAny: ['cleaningFree'] },
  { taskType: 'cleaning_paid', emoji: '🧹', label: 'Ménage payant', capAny: ['cleaningPaid'] },
];

const BEFORE_DAY_CHOICES = [3, 7] as const;
const ASSIGN_DAY_CHOICES = [3, 7] as const;
const REMINDER_START_CHOICES = [3, 2, 1] as const;

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

  /* ── disponibilité : état courant dérivé du jx ── */
  const availabilityOf = (svc: ExpressService): AvailabilityState => {
    if (!svc.caps.some((c) => caps[c])) return 'off';
    const label = String(jx[svc.jxKey] ?? '');
    if (/réservation|toujours/i.test(label)) return 'resa';
    return 'before';
  };

  /** J global de la section « quelques jours avant » (majorité des lignes). */
  const beforeDays: number = useMemo(() => {
    const found = EXPRESS_SERVICES.map((s) => String(jx[s.jxKey] ?? '').match(/J-(\d+)/)?.[1])
      .filter(Boolean)
      .map(Number)
      .filter((n) => BEFORE_DAY_CHOICES.includes(n as 3 | 7));
    return found.length ? found[0] : 3;
  }, [jx]);

  const setAvailability = (svc: ExpressService, state: AvailabilityState, days = beforeDays) => {
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

  const setBeforeDaysGlobal = (days: number) => {
    const nextJx: WizardJxSettings = { ...jx, preset: 'custom' };
    for (const svc of EXPRESS_SERVICES) {
      if (availabilityOf(svc) === 'before') nextJx[svc.jxKey] = svc.beforeLabel(days) as never;
    }
    onChangePanel3({ jx: nextJx });
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

  const assignStateOf = (taskType: string): 'immediate' | 'days' | 'none' => {
    const row = rowByType.get(taskType);
    if (!row || row.staffAssignStyle === 'none') return 'none';
    if (row.staffAssignStyle === 'immediate') return 'immediate';
    return 'days';
  };

  const assignDays: number = useMemo(() => {
    const found = rows
      .filter((r) => r.staffAssignStyle === 'days_before' && r.staffAssignDaysBefore > 0)
      .map((r) => r.staffAssignDaysBefore)
      .filter((n) => ASSIGN_DAY_CHOICES.includes(n as 3 | 7));
    return found.length ? found[0] : 3;
  }, [rows]);

  const setAssign = (taskType: string, state: 'immediate' | 'days' | 'none') => {
    if (state === 'none') patchService(taskType, { staffAssignStyle: 'none', staffAssignDaysBefore: 0 });
    else if (state === 'immediate') patchService(taskType, { staffAssignStyle: 'immediate', staffAssignDaysBefore: 0 });
    else patchService(taskType, { staffAssignStyle: 'days_before', staffAssignDaysBefore: assignDays });
  };

  const setAssignDaysGlobal = (days: number) => {
    const patches: Record<string, WizardServiceDeadlineOverride> = {};
    for (const svc of STAFF_SERVICES) {
      if (assignStateOf(svc.taskType) === 'days') {
        patches[svc.taskType] = { staffAssignStyle: 'days_before', staffAssignDaysBefore: days };
      }
    }
    patchServices(patches);
  };

  /* ── relances client ── */
  const reminderOn = (taskType: string) => (rowByType.get(taskType)?.clientReminderDays.length ?? 0) > 0;
  const reminderStart: number = useMemo(() => {
    const mins = rows
      .filter((r) => r.clientReminderDays.length > 0)
      .map((r) => Math.abs(Math.min(...r.clientReminderDays)));
    const found = mins.filter((n) => REMINDER_START_CHOICES.includes(n as 1 | 2 | 3));
    return found.length ? Math.max(...found) : 3;
  }, [rows]);

  const reminderRange = (start: number): number[] =>
    Array.from({ length: start }, (_, i) => -(start - i)); // ex. 3 → [-3, -2, -1]

  const toggleReminder = (taskType: string) => {
    patchService(taskType, { clientReminderDays: reminderOn(taskType) ? [] : reminderRange(reminderStart) });
  };

  const setReminderStartGlobal = (start: number) => {
    const patches: Record<string, WizardServiceDeadlineOverride> = {};
    for (const svc of CLIENT_REMINDER_SERVICES) {
      if (reminderOn(svc.taskType)) patches[svc.taskType] = { clientReminderDays: reminderRange(start) };
    }
    patchServices(patches);
  };

  /* ── rappel staff / escalade — globaux ── */
  const staffReminderGlobal = rows.some((r) => r.staffReminderDays.length > 0);
  const setStaffReminderGlobal = (on: boolean) => {
    const patches: Record<string, WizardServiceDeadlineOverride> = {};
    for (const svc of STAFF_SERVICES) {
      patches[svc.taskType] = { staffReminderDays: on ? [-1] : [] };
    }
    // checkout_cleaning : rappel le jour du ménage (J+1 après check-out)
    patches.checkout_cleaning = { staffReminderDays: on ? [1] : [] };
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

  /* ── navette : villes ── */
  const transportCities = Object.keys(quickConfig.transportAirportByCity);
  const toggleTransportCity = (city: string) => {
    const next = { ...quickConfig.transportAirportByCity };
    if (next[city] != null) delete next[city];
    else next[city] = defaultTransportAirportPrices([city])[city] ?? 400;
    onChangePanel3({ quickConfig: { ...quickConfig, transportAirportByCity: next } });
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
            « Quelques jours avant » ={' '}
            <span className="ob-x-inline-choices">
              {BEFORE_DAY_CHOICES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`ob-chip ob-x-day${beforeDays === d ? ' on' : ''}`}
                  onClick={() => setBeforeDaysGlobal(d)}
                >
                  J-{d}
                </button>
              ))}
            </span>{' '}
            avant l&apos;arrivée.
          </p>
          <div className="ob-x-rows">
            {EXPRESS_SERVICES.map((svc) => {
              const state = availabilityOf(svc);
              return (
                <div key={svc.jxKey} className={`ob-x-row${state === 'off' ? ' ob-x-row--off' : ''}`}>
                  <span className="ob-x-row-label">
                    {svc.emoji} {svc.label}
                  </span>
                  <span className="ob-x-seg">
                    {seg(state === 'resa', 'À la réservation', () => setAvailability(svc, 'resa'))}
                    {seg(state === 'before', `J-${beforeDays}`, () => setAvailability(svc, 'before'))}
                    {seg(state === 'off', 'Off', () => setAvailability(svc, 'off'))}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="ob-x-auto">
            Réglé automatiquement : déclaration d&apos;arrivée le jour J · déclaration de départ la veille ·
            codes d&apos;accès après enregistrement + créneau. Modifiable dans « Avancé ».
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
            <p className="ob-x-title">🚐 Navette aéroport — dans quelles villes ?</p>
            <div className="ob-chips">
              {[...new Set([...cities, ...transportCities])].map((city) => {
                const on = quickConfig.transportAirportByCity[city] != null;
                return (
                  <button
                    key={city}
                    type="button"
                    className={`ob-chip${on ? ' on' : ''}`}
                    onClick={() => toggleTransportCity(city)}
                  >
                    {city}
                    {on ? ` · ${quickConfig.transportAirportByCity[city]} MAD` : ''}
                  </button>
                );
              })}
            </div>
            <p className="ob-x-auto">Prix forfaitaires modifiables dans « Avancé ».</p>
          </div>
        </section>
      )}

      {/* ── 4 · Assignation staff ── */}
      <section className="ob-card ob-x-section">
        <div className="ob-card-b">
          <p className="ob-x-title">👷 Quand assigner votre staff ?</p>
          <p className="ob-x-hint">
            « À l&apos;avance » ={' '}
            <span className="ob-x-inline-choices">
              {ASSIGN_DAY_CHOICES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`ob-chip ob-x-day${assignDays === d ? ' on' : ''}`}
                  onClick={() => setAssignDaysGlobal(d)}
                >
                  J-{d}
                </button>
              ))}
            </span>{' '}
            avant la tâche.
          </p>
          <div className="ob-x-rows">
            {STAFF_SERVICES.filter((svc) => svc.capAny.some((c) => caps[c])).map((svc) => {
              const state = assignStateOf(svc.taskType);
              return (
                <div key={svc.taskType} className="ob-x-row">
                  <span className="ob-x-row-label">
                    {svc.emoji} {svc.label}
                  </span>
                  <span className="ob-x-seg">
                    {seg(state === 'immediate', 'Immédiat', () => setAssign(svc.taskType, 'immediate'))}
                    {seg(state === 'days', `J-${assignDays}`, () => setAssign(svc.taskType, 'days'))}
                    {seg(state === 'none', '—', () => setAssign(svc.taskType, 'none'))}
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

      {/* ── 5 · Relances client ── */}
      <section className="ob-card ob-x-section">
        <div className="ob-card-b">
          <p className="ob-x-title">💌 Relancer le voyageur s&apos;il n&apos;a pas répondu ?</p>
          <p className="ob-x-hint">
            Première relance{' '}
            <span className="ob-x-inline-choices">
              {REMINDER_START_CHOICES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`ob-chip ob-x-day${reminderStart === d ? ' on' : ''}`}
                  onClick={() => setReminderStartGlobal(d)}
                >
                  J-{d}
                </button>
              ))}
            </span>{' '}
            puis chaque jour jusqu&apos;à la veille.
          </p>
          <div className="ob-chips">
            {CLIENT_REMINDER_SERVICES.filter((svc) => svc.capAny.some((c) => caps[c])).map((svc) => (
              <button
                key={svc.taskType}
                type="button"
                className={`ob-chip${reminderOn(svc.taskType) ? ' on' : ''}`}
                onClick={() => toggleReminder(svc.taskType)}
              >
                {svc.emoji} {svc.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6 · Rappels & escalade ── */}
      <section className="ob-card ob-x-section">
        <div className="ob-card-b">
          <p className="ob-x-title">🔔 Filet de sécurité</p>
          <div className="ob-x-rows">
            <div className="ob-x-row">
              <span className="ob-x-row-label">Rappel au staff la veille de chaque tâche (J-1)</span>
              <Toggle on={staffReminderGlobal} onChange={setStaffReminderGlobal} />
            </div>
            <div className="ob-x-row">
              <span className="ob-x-row-label">
                Alerter l&apos;admin si rien n&apos;est traité (escalade)
                {escalationGlobal && (
                  <span className="ob-x-inline-choices" style={{ marginLeft: 8 }}>
                    {ADMIN_ESCALATION_HOURS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        className={`ob-chip ob-x-day${(deadlines.adminEscalationHour ?? '11') === h.id ? ' on' : ''}`}
                        onClick={() => onChangeDeadlines({ adminEscalationHour: h.id })}
                      >
                        {h.label}
                      </button>
                    ))}
                  </span>
                )}
              </span>
              <Toggle on={escalationGlobal} onChange={setEscalationGlobal} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
