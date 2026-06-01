const buildReference = (moment, event) => {
  if (moment === 'on_day') return `on_${event}_day`;
  return `${moment}_${event}`;
};

const parseReference = (reference) => {
  if (!reference) return { moment: 'before', event: 'checkin' };
  if (reference.includes('before')) {
    return { moment: 'before', event: reference.includes('checkout') ? 'checkout' : 'checkin' };
  }
  if (reference.includes('after')) {
    return { moment: 'after', event: reference.includes('checkout') ? 'checkout' : 'checkin' };
  }
  if (reference.includes('on_')) {
    return { moment: 'on_day', event: reference.includes('checkout') ? 'checkout' : 'checkin' };
  }
  return { moment: 'before', event: 'checkin' };
};

function normalizeBoundary(boundary, fallback) {
  if (!boundary) return null;
  const parsed = boundary.reference && !boundary.moment ? parseReference(boundary.reference) : {};
  const moment = boundary.moment || parsed.moment || fallback.moment;
  const event = boundary.event || parsed.event || fallback.event;
  const unit = boundary.unit || fallback.unit;
  const val = typeof boundary.value === 'number' && !Number.isNaN(boundary.value) ? boundary.value : fallback.value;
  return {
    unit,
    value: val,
    moment,
    event,
    reference: buildReference(moment, event),
  };
}

/** Type effectif (BD peut n’avoir que requires / from / to sans type). */
export function resolveAvailabilityType(availability) {
  if (!availability || typeof availability !== 'object') return 'always';
  if (availability.type) return availability.type;
  if (availability.requires) return 'conditional_and_time';
  if (availability.from || availability.to) return 'time_window';
  return 'always';
}

/** Normalise avant affichage ou avant PUT template / overrides. */
export function normalizeMenuOptionAvailability(availability) {
  if (!availability || typeof availability !== 'object') return { type: 'always' };
  const type = resolveAvailabilityType(availability);
  const base = { ...availability, type };

  if (type === 'always' || type === 'after_booking_confirmed') {
    return { type };
  }

  const from = normalizeBoundary(base.from, { unit: 'days', value: 7, moment: 'before', event: 'checkin' });
  const to = normalizeBoundary(base.to, { unit: 'days', value: 1, moment: 'after', event: 'checkout' });
  const out = { type, from, to };

  if (type === 'conditional_and_time') {
    out.requires = base.requires || 'E_completed,D1_completed';
  }

  return out;
}

export function normalizeMenuOptionsList(options = []) {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => {
    if (!opt || typeof opt !== 'object') return opt;
    return {
      ...opt,
      availability: normalizeMenuOptionAvailability(opt.availability),
    };
  });
}
