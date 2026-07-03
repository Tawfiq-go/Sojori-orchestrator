type TimeBoundary = { unit: 'days' | 'hours'; value: number; reference: string };

function daysBoundary(value: number, reference: string): TimeBoundary {
  return { unit: 'days', value, reference };
}

/** Convertit les libellés J-X du wizard en objets availability menu WhatsApp (schéma listing). */
export function wizardJxLabelToAvailability(
  label: string,
  opts?: { codesAfterRegistration?: boolean },
): Record<string, unknown> {
  const t = (label || '').trim();
  if (!t || t === 'Toujours disponible' || t === 'Dès la réservation') {
    return { type: 'always' };
  }
  if (t === 'À la réservation') {
    return { type: 'after_booking_confirmed' };
  }

  const fromJ = t.match(/À partir de J-(\d+)/i);
  if (fromJ) {
    const days = Number(fromJ[1]);
    return {
      type: 'time_window',
      from: daysBoundary(days, 'before_checkin'),
      to: daysBoundary(0, 'after_checkout'),
    };
  }

  const jBefore = t.match(/J-(\d+)\s+avant arrivée/i);
  if (jBefore) {
    const days = Number(jBefore[1]);
    return {
      type: 'time_window',
      from: daysBoundary(days, 'before_checkin'),
      to: daysBoundary(0, 'on_checkin_day'),
    };
  }

  if (
    t.includes("Jour d'arrivée") ||
    t === 'J0' ||
    t === "Jour d'arrivée (J0)" ||
    t === "Jour d'arrivée uniquement"
  ) {
    return {
      type: 'time_window',
      from: daysBoundary(0, 'on_checkin_day'),
      to: daysBoundary(0, 'on_checkin_day'),
    };
  }

  if (t === 'Jour de départ uniquement') {
    return {
      type: 'time_window',
      from: daysBoundary(0, 'on_checkout_day'),
      to: daysBoundary(0, 'on_checkout_day'),
    };
  }

  if (t === 'Dès la veille du départ') {
    return {
      type: 'time_window',
      from: daysBoundary(1, 'before_checkout'),
      to: daysBoundary(0, 'on_checkout_day'),
    };
  }

  if (t.includes('Après enregistrement')) {
    const requires =
      opts?.codesAfterRegistration !== false ? 'E_completed,D1_completed' : 'E_completed';
    return {
      type: 'conditional_and_time',
      requires,
      from: daysBoundary(0, 'on_checkin_day'),
      to: daysBoundary(0, 'on_checkout_day'),
    };
  }

  // Fenêtre sans borne de début = disponible dès la réservation (le moteur chatbot
  // n'applique que la borne `to` quand `from` est absent).
  if (/^De la réservation à J-1$/i.test(t)) {
    return {
      type: 'time_window',
      to: daysBoundary(1, 'before_checkin'),
    };
  }
  if (/^De la réservation à veille départ$/i.test(t)) {
    return {
      type: 'time_window',
      to: daysBoundary(1, 'before_checkout'),
    };
  }

  const deVeille = t.match(/De J-(\d+)\s+à veille départ/i);
  if (deVeille) {
    return {
      type: 'time_window',
      from: daysBoundary(Number(deVeille[1]), 'before_checkin'),
      to: daysBoundary(1, 'before_checkout'),
    };
  }

  const deToJ1 = t.match(/De J-(\d+)\s+à J-1/i);
  if (deToJ1) {
    return {
      type: 'time_window',
      from: daysBoundary(Number(deToJ1[1]), 'before_checkin'),
      to: daysBoundary(1, 'before_checkin'),
    };
  }

  if (t === "Jusqu'à J-1") {
    return {
      type: 'time_window',
      from: daysBoundary(14, 'before_checkin'),
      to: daysBoundary(1, 'before_checkin'),
    };
  }

  const windowMatch = t.match(/De J-(\d+)/i);
  if (windowMatch) {
    return {
      type: 'time_window',
      from: daysBoundary(Number(windowMatch[1]), 'before_checkin'),
      to: daysBoundary(1, 'before_checkin'),
    };
  }

  return { type: 'always' };
}

/** JX row key → capability registry key */
export const JX_KEY_TO_CAPABILITY: Partial<Record<string, string>> = {
  menuActive: 'menu_navigation',
  registration: 'registration',
  arrivalChoose: 'arrival_choose',
  departureChoose: 'departure_choose',
  arrivalDeclare: 'arrival_declare',
  departureDeclare: 'departure_declare',
  support: 'support',
  serviceClient: 'service_client',
  transport: 'transport',
  groceries: 'groceries',
  concierge: 'concierge',
  cleaning: 'cleaning_free',
  accessCodes: 'access',
  wifi: 'property_wifi',
  rules: 'house_rules',
};
