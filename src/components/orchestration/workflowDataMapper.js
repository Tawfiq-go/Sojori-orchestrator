// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Atelier 2026
// workflowDataMapper.js — Mapper pour transformer les données backend
// vers le format attendu par les renderers Config/Audit
// ════════════════════════════════════════════════════════════════════

/**
 * Formate une date Casablanca depuis un timestamp
 */
function formatCasablancaDate(dateInput, format = 'dd/MM/yyyy à HH:mm') {
  if (!dateInput) return null;

  try {
    const date = new Date(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return format
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', year)
      .replace('HH', hours)
      .replace('mm', minutes);
  } catch (e) {
    return dateInput;
  }
}

/**
 * Extrait le label de moment depuis la config action
 */
function extractMomentLabel(action, workflow) {
  const pl = workflow?.actions?.requestTimeslot?.payload;
  const clientRem = pl?.categoryConfig?.orchestration?.clientReminder || action?.config?.clientReminder;
  const createTaskBefore = pl?.categoryConfig?.orchestration?.createTaskBefore || action?.config?.createTaskBefore || {};
  const trigger = action?.config?.trigger || createTaskBefore?.trigger || action?.trigger;
  const timing = action?.config?.timing || action?.timing;
  const value = timing?.value ?? timing?.daysBeforeExecution;
  const unit = (timing?.unit || '').toLowerCase();

  const valueLabel = value != null && unit
    ? unit === 'hours' || unit === 'hour'
      ? `${value} heure${Number(value) > 1 ? 's' : ''}`
      : unit === 'days' || unit === 'day'
        ? `${value} jour${Number(value) > 1 ? 's' : ''}`
        : `${value} ${unit}`
    : value != null && !unit
      ? `${value} jour${Number(value) > 1 ? 's' : ''}`
      : null;

  const momentTextFallback = trigger === 'AFTER_RESERVATION'
    ? valueLabel ? `${valueLabel} après réservation` : 'Après réservation'
    : trigger === 'BEFORE_ARRIVAL'
      ? valueLabel ? `${valueLabel} avant arrivée` : 'Avant arrivée'
      : trigger === 'BEFORE_DEPARTURE'
        ? valueLabel ? `${valueLabel} avant départ` : 'Avant départ'
        : trigger === 'BEFORE_EXECUTION'
          ? valueLabel ? `${valueLabel} avant exécution` : 'Avant exécution'
          : valueLabel || trigger || '—';

  return action?.config?.momentLabel ?? momentTextFallback;
}

/**
 * Extrait le label de condition
 */
function extractConditionLabel(action) {
  const sendCondition = action?.config?.sendCondition || action?.sendCondition;

  if (sendCondition === 'ALWAYS') return 'Toujours';
  if (sendCondition === 'IF_REGISTRATION_INCOMPLETE') return 'INCOMPLETE_REGISTRATION';

  return sendCondition || 'Toujours';
}

/**
 * Extrait les infos de canal et message
 */
function extractChannelInfo(action, workflow) {
  const channelPriority = action?.config?.channelPriority || action?.channelPriority;
  const otaSource = action?.config?.otaSource || action?.otaSource;
  const atSojoriDirect = action?.config?.atSojoriDirect || action?.atSojoriDirect;

  // Label canal (simplifié)
  let channelLabel = 'Email';
  if (channelPriority === 'WHATSAPP_PRIORITY') channelLabel = 'WhatsApp (priorité)';
  else if (channelPriority === 'EMAIL_PRIORITY') channelLabel = 'Email (priorité)';
  else if (atSojoriDirect) channelLabel = 'Email (résa directe)';

  // Source réelle
  let channelSource = 'Email';
  if (otaSource === 'sojori') channelSource = 'Email-OTA (sojori)';
  else if (otaSource === 'booking') channelSource = 'Booking.com';
  else if (otaSource === 'airbnb') channelSource = 'Airbnb';

  // Message label
  const messageLabel = action?.config?.messageLabel || action?.messageLabel || action?.label || 'Message bienvenue';

  return { channelLabel, channelSource, messageLabel };
}

/**
 * Enrichit les données sub-step avec les informations extraites du workflow complet
 */
export function enrichSubStepConfig(sub, workflow, action) {
  if (!sub || !sub.config) return sub;

  const enrichedConfig = { ...sub.config };

  // Extraire les infos si pas déjà présentes
  if (!enrichedConfig.moment && action) {
    enrichedConfig.moment = extractMomentLabel(action, workflow);
  }

  if (!enrichedConfig.scheduledFor && action?.scheduledFor) {
    enrichedConfig.scheduledFor = formatCasablancaDate(action.scheduledFor);
  }

  if (!enrichedConfig.condition && action) {
    enrichedConfig.condition = extractConditionLabel(action);
  }

  if (action) {
    const channelInfo = extractChannelInfo(action, workflow);
    if (!enrichedConfig.channel) enrichedConfig.channel = channelInfo.channelLabel;
    if (!enrichedConfig.channelSource) enrichedConfig.channelSource = channelInfo.channelSource;
    if (!enrichedConfig.messageLabel) enrichedConfig.messageLabel = channelInfo.messageLabel;
  }

  // Rappels
  const pl = workflow?.actions?.requestTimeslot?.payload;
  const clientRem = pl?.categoryConfig?.orchestration?.clientReminder || action?.config?.clientReminder;
  const createTaskBefore = pl?.categoryConfig?.orchestration?.createTaskBefore || action?.config?.createTaskBefore || {};

  if (clientRem || createTaskBefore) {
    const preferredHoursFromConfig = clientRem?.preferredHours || createTaskBefore?.preferredHours || action?.config?.preferredHours || action?.preferredHours;
    const debutRappel = clientRem?.daysBeforeDeadline ?? clientRem?.startDaysBefore ?? action?.config?.remindXDaysBefore;
    const deadlineRappel = clientRem?.deadline ?? clientRem?.deadlineDaysBefore ?? action?.config?.deadline;

    if (debutRappel != null) enrichedConfig.reminderStart = debutRappel;
    if (deadlineRappel != null) enrichedConfig.reminderDeadline = deadlineRappel;
    if (preferredHoursFromConfig) enrichedConfig.preferredHours = preferredHoursFromConfig;
  }

  return {
    ...sub,
    config: enrichedConfig,
  };
}

export default enrichSubStepConfig;
