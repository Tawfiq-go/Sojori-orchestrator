export const ACCESS_STEP_TITLES = ['Parking', 'Immeuble', 'Appartement'] as const;

export type AccessInstructionStep = {
  title: string;
  description: { enabled: boolean; value: string };
  code: { enabled: boolean; value: string; description?: string };
};

export type AccessFormState = {
  listingId: string;
  listingName: string;
  receptionMode: {
    type: 'automatic' | 'assisted';
    assistedGuestMessage: string;
    codeSendSchedule: {
      reference: 'before_checkin';
      daysBefore: number;
      time: string;
    };
  };
  instructions: AccessInstructionStep[];
};

export function defaultAccessInstructions(): AccessInstructionStep[] {
  return ACCESS_STEP_TITLES.map((title) => ({
    title,
    description: { enabled: false, value: '' },
    code: { enabled: false, value: '', description: '' },
  }));
}

export function defaultAccessForm(listingId: string, listingName: string): AccessFormState {
  return {
    listingId,
    listingName: listingName || '',
    receptionMode: {
      type: 'automatic',
      assistedGuestMessage: '',
      codeSendSchedule: { reference: 'before_checkin', daysBefore: 2, time: '11:00' },
    },
    instructions: defaultAccessInstructions(),
  };
}

export function normalizeAccessFromApi(
  data: Record<string, unknown> | null,
  listingId: string,
  listingName: string,
): AccessFormState {
  const base = defaultAccessForm(listingId, listingName);
  if (!data) return base;

  const rm = (data.receptionMode || {}) as Record<string, unknown>;
  const sched = (rm.codeSendSchedule || {}) as Record<string, unknown>;

  const byTitle = new Map<string, AccessInstructionStep>();
  for (const step of defaultAccessInstructions()) {
    byTitle.set(step.title, { ...step });
  }
  const rawInstr = Array.isArray(data.instructions) ? data.instructions : [];
  for (const inst of rawInstr as Record<string, unknown>[]) {
    const title = String(inst.title || '');
    const match = byTitle.get(title);
    if (!match) continue;
    const desc = inst.description as { enabled?: boolean; value?: string } | undefined;
    const code = inst.code as { enabled?: boolean; value?: string } | undefined;
    match.description = {
      enabled: desc?.enabled === true,
      value: String(desc?.value || ''),
    };
    match.code = {
      enabled: code?.enabled === true || Boolean(code?.value),
      value: String(code?.value || ''),
      description: '',
    };
  }

  return {
    listingId,
    listingName: String(data.listingName || listingName || ''),
    receptionMode: {
      type: rm.type === 'assisted' ? 'assisted' : 'automatic',
      assistedGuestMessage: String(rm.assistedGuestMessage || ''),
      codeSendSchedule: {
        reference: 'before_checkin',
        daysBefore: Number(sched.daysBefore ?? 2),
        time: String(sched.time || '11:00'),
      },
    },
    instructions: ACCESS_STEP_TITLES.map((t) => byTitle.get(t)!),
  };
}
