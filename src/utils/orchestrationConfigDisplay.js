// ════════════════════════════════════════════════════════════════════
// Build human-readable orchestration config for WorkflowTimeline
// (plan snapshot + owner task template + listing orchestration flags)
// ════════════════════════════════════════════════════════════════════

import { formatCasablancaDateTime, formatCasablancaDateOnly } from './dateFormatting';
const CHANNEL_LABELS = {
  WHATSAPP_PRIORITY: 'WhatsApp prioritaire',
  EMAIL_PRIORITY: 'Email prioritaire',
  DUAL_CHANNEL: 'WhatsApp + Email',
  whatsapp: 'WhatsApp',
  email: 'Email',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
};

const SEND_CONDITION_LABELS = {
  ALWAYS: 'Toujours',
  IF_NOT_DONE: 'Si non effectué',
  NEVER: 'Jamais',
};

const TRIGGER_LABELS = {
  AFTER_RESERVATION: 'Après réservation',
  BEFORE_ARRIVAL: 'Avant arrivée',
  BEFORE_CHECKIN: 'Avant check-in',
  BEFORE_EXECUTION: 'Avant exécution',
  ON_CHECKIN_DAY: 'Jour check-in',
  PLACEHOLDER: 'Placeholder (catégorie inactive)',
};

/** workflow.category / categoryType → listing orchestration_* field */
const WORKFLOW_TO_LISTING_ORCH = {
  registration: 'orchestration_registration',
  arrival_choice: 'orchestration_choose_arrival',
  arrival_choose: 'orchestration_choose_arrival',
  departure_choice: 'orchestration_choose_departure',
  departure_choose: 'orchestration_choose_departure',
  declare_arrival: 'orchestration_declare_arrival',
  declare_departure: 'orchestration_declare_departure',
  cleaning_free: 'orchestration_cleaning_free',
  cleaning_paid: 'orchestration_cleaning_paid',
  CHOICE_ARRIVAL: 'orchestration_choose_arrival',
  CHOICE_DEPARTURE: 'orchestration_choose_departure',
  DECLARATION_REGISTRATION: 'orchestration_registration',
  DECLARATION_ARRIVAL: 'orchestration_declare_arrival',
  DECLARATION_DEPARTURE: 'orchestration_declare_departure',
  CLEANING_FREE: 'orchestration_cleaning_free',
  CLEANING_PAID: 'orchestration_cleaning_paid',
  CLEANING_SOJORI: 'orchestration_cleaning_sojori',
};

const LISTING_ORCH_LABELS = {
  orchestrationEnabled: 'Orchestration globale',
  orchestration_registration: 'Enregistrement voyageurs',
  orchestration_choose_arrival: 'Choisir arrivée',
  orchestration_choose_departure: 'Choisir départ',
  orchestration_declare_arrival: 'Déclarer arrivée',
  orchestration_declare_departure: 'Déclarer départ',
  orchestration_cleaning_free: 'Ménage gratuit',
  orchestration_cleaning_paid: 'Ménage payant',
  orchestration_cleaning_sojori: 'Ménage Sojori',
  orchestration_transport: 'Transport',
  orchestration_grocery: 'Courses',
  orchestration_custom: 'Personnalisé',
  orchestration_support: 'Support',
  orchestration_service_client: 'Service client',
};

const CR_GROUPING_KEY_TO_CONFIG_KEY = {
  TRANSPORT: 'client_request_transport',
  GROCERIES: 'client_request_grocery',
  GROCERY: 'client_request_grocery',
  CUSTOM: 'client_request_custom',
  SUPPORT: 'client_request_support',
};

function labelChannel(priority) {
  if (!priority) return null;
  return CHANNEL_LABELS[priority] || String(priority);
}

function labelSendCondition(c) {
  if (!c) return null;
  return SEND_CONDITION_LABELS[c] || String(c);
}

function labelTrigger(t) {
  if (!t) return null;
  return TRIGGER_LABELS[t] || String(t);
}

function formatTiming(timing) {
  if (!timing || typeof timing !== 'object') return null;
  const value = timing.value ?? 0;
  const unit = timing.unit === 'DAYS' ? 'jour(s)' : 'heure(s)';
  return `${value} ${unit}`;
}

function formatPreferredHours(h) {
  if (h == null || h === '') return null;
  if (typeof h === 'number') return `${h}h`;
  if (Array.isArray(h)) return h.join(', ');
  return String(h);
}

function getOtaShortLabel(otaSource) {
  if (!otaSource) return '';
  const s = String(otaSource).toLowerCase();
  if (s.includes('sojori')) return 'sojori';
  if (s.includes('booking')) return 'Booking';
  if (s.includes('airbnb')) return 'Airbnb';
  return String(otaSource);
}

function getChannelConfigLabel(channelPriority, otaSource, atSojoriDirect) {
  const ch = (channelPriority || '').toString().toUpperCase();
  const isDirect = atSojoriDirect === true;
  if (!ch) return '—';
  if (ch === 'WHATSAPP_PRIORITY') return 'Priorité WhatsApp';
  if (ch === 'WHATSAPP_ONLY') return 'WhatsApp uniquement';
  if (ch === 'EMAIL_PRIORITY') return 'Priorité Email';
  if (ch === 'EMAIL_ONLY') return 'Email uniquement';
  if (isDirect && (ch === 'OTA_PRIORITY' || ch === 'OTA_ONLY')) return 'Email (résa directe)';
  if (ch === 'OTA_PRIORITY' || ch === 'OTA_ONLY') {
    const label = getOtaShortLabel(otaSource);
    return label ? `Priorité ${label}` : 'Priorité Email-OTA';
  }
  if (ch.includes('WHATSAPP')) return ch.includes('ONLY') ? 'WhatsApp uniquement' : 'Priorité WhatsApp';
  if (ch.includes('EMAIL')) return 'Email';
  return ch;
}

function getChannelSourceDescription(channelPriority, otaSource, atSojoriDirect) {
  const ch = (channelPriority || '').toString().toUpperCase();
  if (ch === 'WHATSAPP_PRIORITY') return 'WhatsApp si règle 72h respectée, sinon Email';
  if (ch === 'WHATSAPP_ONLY') return 'WhatsApp uniquement (nécessite règle 72h)';
  if (ch.startsWith('EMAIL')) return 'Email uniquement';
  if (ch.startsWith('OTA')) {
    const label = getOtaShortLabel(otaSource);
    return `Email-OTA${label ? ` (${label})` : ''}`;
  }
  if (atSojoriDirect) return 'Email (réservation directe Sojori)';
  return 'Selon configuration';
}

function buildMomentText(action, workflow, ownerCategory) {
  const cfg = action?.config || {};
  const orch =
    getOrchestrationFromAction(action) ||
    workflow?.categoryConfig?.orchestration ||
    ownerCategory?.orchestration ||
    {};
  const createTaskBefore = orch.createTaskBefore || {};
  const trigger = cfg.trigger || createTaskBefore.trigger;
  const timing = cfg.timing || createTaskBefore;
  const value = timing?.value ?? timing?.daysBeforeExecution;
  const unit = (timing?.unit || '').toString().toLowerCase();
  let valueLabel = null;
  if (value != null && unit) {
    if (unit === 'hours' || unit === 'hour') {
      valueLabel = `${value} heure${Number(value) > 1 ? 's' : ''}`;
    } else if (unit === 'days' || unit === 'day') {
      valueLabel = `${value} jour${Number(value) > 1 ? 's' : ''}`;
    } else {
      valueLabel = `${value} ${unit}`;
    }
  } else if (value != null) {
    valueLabel = `${value} jour${Number(value) > 1 ? 's' : ''}`;
  }

  if (cfg.momentLabel) return cfg.momentLabel;

  if (trigger === 'AFTER_RESERVATION') {
    return valueLabel ? `${valueLabel} après réservation` : 'Après réservation';
  }
  if (trigger === 'BEFORE_ARRIVAL') {
    return valueLabel ? `${valueLabel} avant arrivée` : 'Avant arrivée';
  }
  if (trigger === 'BEFORE_DEPARTURE') {
    return valueLabel ? `${valueLabel} avant départ` : 'Avant départ';
  }
  if (trigger === 'BEFORE_EXECUTION') {
    return valueLabel ? `${valueLabel} avant exécution` : 'Avant exécution';
  }
  if (trigger === 'PLACEHOLDER') return 'Catégorie en attente (placeholder)';
  return valueLabel || labelTrigger(trigger) || '—';
}

function getReferenceDateLabel(workflow, planMeta) {
  const ct = workflow?.categoryType || '';
  if (ct === 'DECLARATION_REGISTRATION' || workflow?.category === 'registration') {
    return { label: 'enregistrement', date: planMeta?.checkInDate };
  }
  if (ct === 'CHOICE_ARRIVAL' || workflow?.category?.includes('arrival')) {
    return { label: 'arrivée', date: planMeta?.checkInDate };
  }
  if (ct === 'CHOICE_DEPARTURE' || workflow?.category?.includes('departure')) {
    return { label: 'départ', date: planMeta?.checkOutDate };
  }
  return { label: 'échéance', date: planMeta?.checkInDate };
}

function formatRelanceRule(daysBefore, refLabel, refDateRaw, hour) {
  if (daysBefore == null || !refDateRaw) return null;
  const ref = new Date(refDateRaw);
  if (Number.isNaN(ref.getTime())) return null;
  const h = hour != null && hour >= 0 && hour <= 23 ? hour : 11;
  const refDdMm = formatCasablancaDateOnly(refDateRaw);
  const n = Number(daysBefore);
  return `${n} jour${n > 1 ? 's' : ''} avant ${refLabel} (le ${refDdMm}) à ${String(h).padStart(2, '0')}:00`;
}

/**
 * Resolve owner category config (same logic as sojori-dashboard NewWorkflowTimeline).
 */
export function getCategoryConfigFromTemplate(ownerTemplate, workflowCategory) {
  const categories = ownerTemplate?.categories;
  if (!categories) return undefined;
  const key = typeof workflowCategory === 'string' ? workflowCategory.trim() : '';
  if (!key) return undefined;

  const configKey = CR_GROUPING_KEY_TO_CONFIG_KEY[key.toUpperCase()] ?? null;
  if (Array.isArray(categories)) {
    return (
      categories.find((c) => {
        const catKey = (c?.category ?? '').toString().trim();
        const name = (c?.name ?? '').toString().trim();
        const label = (c?.label ?? '').toString().trim();
        return (
          catKey === key ||
          name === key ||
          label === key ||
          (configKey && (catKey === configKey || name === configKey || label === configKey))
        );
      }) ?? undefined
    );
  }
  return categories[key] ?? (configKey ? categories[configKey] : undefined) ?? undefined;
}

function getOrchestrationFromAction(action) {
  return (
    action?.payload?.categoryConfig?.orchestration ??
    action?.payload?.orchestration ??
    action?.config?.orchestration ??
    null
  );
}

function isCleaningSojoriWorkflow(workflow) {
  const cat = String(workflow?.category || '').toLowerCase();
  const ct = String(workflow?.categoryType || '');
  return cat === 'cleaning_sojori' || ct === 'CLEANING_SOJORI';
}

function resolveListingOrchField(workflow) {
  const candidates = [
    workflow?.category,
    workflow?.categoryType,
    workflow?.type,
  ].filter(Boolean);
  for (const c of candidates) {
    const key = String(c);
    if (WORKFLOW_TO_LISTING_ORCH[key]) return WORKFLOW_TO_LISTING_ORCH[key];
    const lower = key.toLowerCase();
    if (WORKFLOW_TO_LISTING_ORCH[lower]) return WORKFLOW_TO_LISTING_ORCH[lower];
  }
  return null;
}

/**
 * Flat key/value config for compact KV list (backward compatible).
 */
export function buildActionConfigEntries(action, actionKey, workflow = {}) {
  if (!action?.config && !action?.payload) return {};

  const cfg = action.config || {};
  const orch = getOrchestrationFromAction(action) || workflow?.categoryConfig?.orchestration || {};
  const entries = {};

  const channel =
    cfg.channelDisplayLabel ||
    labelChannel(cfg.resolvedChannelPriority || cfg.channelPriority) ||
    labelChannel(orch.channelPriority);
  if (channel) entries.Canal = channel;

  const template =
    cfg.templateName ||
    cfg.templateId ||
    orch.messageTemplateId ||
    orch.messageTemplate;
  if (template) entries.Template = template;

  const trigger = labelTrigger(cfg.trigger || orch.createTaskBefore?.trigger);
  if (trigger) entries.Déclencheur = trigger;

  const timing = formatTiming(cfg.timing || orch.createTaskBefore);
  if (timing) entries.Timing = timing;

  const condition = labelSendCondition(cfg.sendCondition || orch.sendNotificationCondition);
  if (condition) entries.Condition = condition;

  const hours = formatPreferredHours(cfg.preferredHours || orch.createTaskBefore?.preferredHours);
  if (hours) entries.Heures = hours;

  if (cfg.deadlineHours != null) entries.Deadline = `${cfg.deadlineHours}h`;
  if (cfg.momentLabel) entries.Moment = cfg.momentLabel;

  const cr = orch.clientReminder;
  if (cr?.enabled) {
    if (cr.daysBeforeDeadline != null) entries['Rappels avant'] = `${cr.daysBeforeDeadline} j`;
    if (cr.maxRemindersPerDay != null) entries['Max rappels/jour'] = cr.maxRemindersPerDay;
    if (cr.preferredHours != null) entries['Heures rappels'] = formatPreferredHours(cr.preferredHours);
  }

  if (actionKey === 'assignStaff') {
    const strategy = cfg.strategy || orch.assignmentStrategy;
    if (strategy) entries.Stratégie = strategy;
    if (cfg.dayJ || orch.dayJLogic) {
      const dj = cfg.dayJ || orch.dayJLogic;
      if (dj.maxRetriesPerDay != null) entries['Jour J — max/jour'] = dj.maxRetriesPerDay;
      if (dj.retryIntervalHours != null) entries['Jour J — intervalle'] = `${dj.retryIntervalHours}h`;
    }
  }

  if (actionKey === 'deadlineEscalation' && cfg.deadlineTiming) {
    const t = cfg.deadlineTiming;
    entries.Échéance = `${t.value} ${t.unit === 'DAYS' ? 'jour(s)' : 'heure(s)'} avant`;
  }

  if ((workflow.workflowId || '').toString().startsWith('PLACEHOLDER-')) {
    entries.Statut = 'Catégorie sans plan actif (placeholder)';
  }

  return entries;
}

export function buildOwnerRulesEntries(ownerCategoryConfig) {
  if (!ownerCategoryConfig) return {};
  const entries = {};

  entries.Activé = ownerCategoryConfig.enabled === false ? 'Non' : 'Oui';
  if (ownerCategoryConfig.mode) {
    const modeLabels = {
      ORCHESTRATION: 'Automatique',
      MANUAL: 'Manuel',
      NOTIFICATION_ONLY: 'Notification seule',
    };
    entries.Mode = modeLabels[ownerCategoryConfig.mode] || ownerCategoryConfig.mode;
  }

  const orch = ownerCategoryConfig.orchestration;
  if (!orch) return entries;

  const channel = labelChannel(orch.channelPriority);
  if (channel) entries.Canal = channel;

  const ctb = orch.createTaskBefore;
  if (ctb) {
    const trig = labelTrigger(ctb.trigger);
    if (trig) entries['Création tâche — déclencheur'] = trig;
    const t = formatTiming(ctb);
    if (t) entries['Création tâche — timing'] = t;
    const h = formatPreferredHours(ctb.preferredHours);
    if (h) entries['Création tâche — heure'] = h;
  }

  const cr = orch.clientReminder;
  if (cr) {
    entries['Rappels client'] = cr.enabled === false ? 'Désactivés' : 'Activés';
    if (cr.enabled !== false) {
      if (cr.daysBeforeDeadline != null) entries['Rappels — jours avant'] = cr.daysBeforeDeadline;
      if (cr.maxRemindersPerDay != null) entries['Rappels — max/jour'] = cr.maxRemindersPerDay;
      if (cr.deadline != null) entries['Rappels — deadline (j)'] = cr.deadline;
    }
  }

  if (orch.assignmentStrategy) entries['Stratégie staff'] = orch.assignmentStrategy;
  if (orch.assignmentType) entries['Type assignation'] = orch.assignmentType;

  const dj = orch.dayJLogic;
  if (dj) {
    if (dj.maxRetriesPerDay != null) entries['Jour J — max/jour'] = dj.maxRetriesPerDay;
    if (dj.retryIntervalHours != null) entries['Jour J — intervalle (h)'] = dj.retryIntervalHours;
  }

  return entries;
}

export function buildListingOrchestrationEntries(workflow, listingDoc) {
  if (!listingDoc) return {};
  const entries = {};

  const global =
    listingDoc.orchestrationEnabled !== false ? 'Activée' : 'Désactivée (listing)';
  entries['Orchestration listing'] = global;

  const field = resolveListingOrchField(workflow);
  if (field) {
    const label = LISTING_ORCH_LABELS[field] || field;
    const on = listingDoc[field] !== false;
    entries[`Catégorie « ${label} »`] = on ? 'Activée sur ce listing' : 'Désactivée sur ce listing';
  }

  return entries;
}

/**
 * User-friendly config cards for WorkflowTimeline (no raw JSON).
 */
export function buildFriendlyConfigCards({
  action,
  actionKey,
  workflow,
  ownerTemplate,
  listingDoc,
  planMeta = {},
}) {
  const ownerCategory =
    getCategoryConfigFromTemplate(ownerTemplate, workflow?.category) ||
    getCategoryConfigFromTemplate(ownerTemplate, workflow?.categoryDisplayLabel);

  const cfg = action?.config || {};
  const orch =
    getOrchestrationFromAction(action) ||
    workflow?.categoryConfig?.orchestration ||
    ownerCategory?.orchestration ||
    {};

  const channelPriority =
    cfg.resolvedChannelPriority || cfg.channelPriority || orch.channelPriority;
  const otaSource = planMeta?.otaSource ?? planMeta?.source;
  const atSojoriDirect = planMeta?.atSojoriDirect === true;

  const templateName =
    cfg.templateName ||
    cfg.templateId ||
    orch.messageTemplateId ||
    ownerCategory?.label ||
    workflow?.categoryDisplayLabel ||
    '—';

  const sendCondition = labelSendCondition(
    cfg.sendCondition || cfg.sendNotificationCondition || orch.sendNotificationCondition,
  );

  const cards = [];
  const isPlaceholder = (workflow?.workflowId || '').toString().startsWith('PLACEHOLDER-');
  const isSojoriMenage = isCleaningSojoriWorkflow(workflow);

  if (isSojoriMenage) {
    const scheduling = workflow?.metadata?.scheduling || workflow?.metadata || {};
    cards.push({
      id: 'sojori-internal',
      icon: '🧹',
      title: 'Ménage Sojori (gestion interne)',
      theme: 'listing',
      bullets: [
        {
          label: 'Propreté logement',
          value: 'CLEAN / DIRTY / OCCUPÉ — modifiable sur la carte « Logement » (pas un template message invité)',
        },
        {
          label: 'Tâche SM-',
          value: workflow?.timeslotCode || 'PENDING-CLEAN-… puis SM- via cron si dirty + vacant',
          mono: true,
        },
        {
          label: 'Planification',
          value: scheduling.cleaningDateIso
            ? `Ménage prévu ${formatCasablancaDateTime(scheduling.cleaningDateIso)}`
            : 'Calculée au checkout',
        },
        {
          label: 'Modèle propriétaire',
          value: ownerCategory
            ? 'Config staff / deadline (assignStaff) — pas de template WhatsApp ménage'
            : 'Catégorie absente du modèle tâches — staff/deadline peuvent être incomplets',
          accent: !ownerCategory,
        },
      ],
    });
  }

  // —— Règle ——
  const ruleBullets = [];
  const momentText = buildMomentText(action, workflow, ownerCategory);
  ruleBullets.push({ label: 'Moment', value: momentText });
  if (action?.scheduledFor) {
    ruleBullets[ruleBullets.length - 1].value += ` (${formatCasablancaDateTime(action.scheduledFor)})`;
  }
  ruleBullets.push({ label: 'Condition', value: sendCondition || 'Toujours' });

  const cr = orch.clientReminder || ownerCategory?.orchestration?.clientReminder;
  const debutRappel = cr?.daysBeforeDeadline ?? cr?.startDaysBefore;
  const finRappel = cr?.deadline ?? cr?.deadlineDaysBefore;
  const preferredHours = cr?.preferredHours ?? cfg.preferredHours ?? orch.createTaskBefore?.preferredHours;
  if (debutRappel != null || finRappel != null) {
    ruleBullets.push({
      label: 'Rappels',
      value: `J-${debutRappel ?? '?'} à J-${finRappel ?? '?'} avant échéance`,
    });
    if (preferredHours != null) {
      ruleBullets.push({ label: 'Heures envoi', value: formatPreferredHours(preferredHours) });
    }
  }

  if (ownerCategory?.mode) {
    const modeLabels = {
      ORCHESTRATION: 'Automatique',
      MANUAL: 'Manuel',
      NOTIFICATION_ONLY: 'Notification seule',
    };
    ruleBullets.push({
      label: 'Mode propriétaire',
      value: modeLabels[ownerCategory.mode] || ownerCategory.mode,
    });
  }

  cards.push({ id: 'rule', icon: '⚙️', title: 'Règle', theme: 'rule', bullets: ruleBullets });

  // —— Canal & Message —— (pas pour Ménage Sojori : gestion interne listing + SM-)
  if (
    !isSojoriMenage &&
    (actionKey === 'sendNotification' || actionKey === 'requestTimeslot' || actionKey === 'createTask')
  ) {
    cards.push({
      id: 'channel',
      icon: '📨',
      title: 'Canal & Message',
      theme: 'channel',
      bullets: [
        { label: 'Canal', value: getChannelConfigLabel(channelPriority, otaSource, atSojoriDirect) },
        {
          label: 'Source réelle',
          value: getChannelSourceDescription(channelPriority, otaSource, atSojoriDirect),
          accent: true,
        },
        { label: 'Message', value: templateName },
      ],
    });
  }

  // —— Condition relance (registration / timeslot) ——
  const isRegistration =
    workflow?.categoryType === 'DECLARATION_REGISTRATION' ||
    workflow?.category === 'registration';
  const showRelanceCard =
    !isSojoriMenage && (isRegistration || actionKey === 'requestTimeslot');

  if (showRelanceCard) {
    const { label: refLabel, date: refDate } = getReferenceDateLabel(workflow, planMeta);
    const relanceBullets = [];
    const hourRaw = preferredHours;
    const hour =
      typeof hourRaw === 'number'
        ? hourRaw
        : parseInt(String(hourRaw || '11').split(',')[0], 10);

    const debutRule = formatRelanceRule(debutRappel, refLabel, refDate, hour);
    const finRule = formatRelanceRule(finRappel, refLabel, refDate, hour);

    if (debutRule) relanceBullets.push({ label: 'Début rappel', value: debutRule });
    if (finRule) relanceBullets.push({ label: 'Fin rappel', value: finRule });
    if (refDate) {
      relanceBullets.push({
        label: `${refLabel.charAt(0).toUpperCase()}${refLabel.slice(1)} prévu`,
        value: formatCasablancaDateOnly(refDate),
        mono: true,
      });
    }
    relanceBullets.push({ label: 'Rappel', value: (sendCondition || 'Toujours').toLowerCase() });
    relanceBullets.push({ label: 'Template', value: templateName });

    if (relanceBullets.length > 0) {
      cards.push({
        id: 'relance',
        icon: '📅',
        title: 'Condition relance',
        theme: 'relance',
        bullets: relanceBullets,
      });
    }
  }

  // —— Assignation staff ——
  if (actionKey === 'assignStaff') {
    const staffBullets = [];
    const strategy = cfg.strategy || orch.assignmentStrategy;
    if (strategy) staffBullets.push({ label: 'Stratégie', value: strategy });
    const dj = cfg.dayJ || orch.dayJLogic;
    if (dj?.maxRetriesPerDay != null) {
      staffBullets.push({ label: 'Max relances / jour (J)', value: dj.maxRetriesPerDay });
    }
    if (dj?.retryIntervalHours != null) {
      staffBullets.push({ label: 'Intervalle', value: `${dj.retryIntervalHours}h` });
    }
    if (staffBullets.length) {
      cards.push({ id: 'staff', icon: '👥', title: 'Assignation staff', theme: 'staff', bullets: staffBullets });
    }
  }

  // —— Listing ——
  if (listingDoc) {
    const listingBullets = [];
    listingBullets.push({
      label: 'Orchestration',
      value: listingDoc.orchestrationEnabled !== false ? 'Activée' : 'Désactivée',
    });
    const field = resolveListingOrchField(workflow);
    if (field) {
      const label = LISTING_ORCH_LABELS[field] || field;
      const on = listingDoc[field] !== false;
      listingBullets.push({
        label: label,
        value: on ? '✓ Activée sur ce listing' : '✗ Désactivée sur ce listing',
      });
    }
    cards.push({ id: 'listing', icon: '🏠', title: 'Listing', theme: 'listing', bullets: listingBullets });
  }

  if (isPlaceholder) {
    cards.unshift({
      id: 'placeholder',
      icon: 'ℹ️',
      title: 'Statut',
      theme: 'muted',
      bullets: [
        {
          label: 'Plan',
          value:
            'Catégorie affichée sans workflow actif — activez-la sur le listing et dans le modèle propriétaire.',
        },
      ],
    });
  }

  return cards;
}

/**
 * Structured sections for WorkflowTimeline (legacy flat merge).
 */
export function buildConfigSections({
  action,
  actionKey,
  workflow,
  ownerTemplate,
  listingDoc,
  planMeta,
}) {
  const ownerCategory =
    getCategoryConfigFromTemplate(ownerTemplate, workflow?.category) ||
    getCategoryConfigFromTemplate(ownerTemplate, workflow?.categoryDisplayLabel);

  const planEntries = buildActionConfigEntries(action, actionKey, workflow);
  const ownerEntries = buildOwnerRulesEntries(ownerCategory);
  const listingEntries = buildListingOrchestrationEntries(workflow, listingDoc);
  const configCards = buildFriendlyConfigCards({
    action,
    actionKey,
    workflow,
    ownerTemplate,
    listingDoc,
    planMeta,
  });

  const flatConfig = { ...planEntries, ...ownerEntries, ...listingEntries };

  return { configCards, flatConfig };
}
