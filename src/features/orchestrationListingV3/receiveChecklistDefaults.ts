/**
 * Checklist staff Accueil — miroir srv-fulltask receiveChecklistDefaults.
 * Langues : FR · DA (Darija) · AR · EN
 */

export type ReceiveChecklistItem = {
  id: string;
  label: string;
  labelDa?: string;
  labelEn?: string;
  labelAr?: string;
  required: boolean;
  order: number;
};

export type ReceiveChecklistCategory = {
  id: string;
  label: string;
  labelDa?: string;
  labelEn?: string;
  labelAr?: string;
  emoji?: string;
  order: number;
  items: ReceiveChecklistItem[];
};

export const DEFAULT_RECEIVE_ARRIVAL_CATEGORY: ReceiveChecklistCategory = {
  id: 'rcv_arrival',
  label: 'Arrivée',
  labelDa: 'الوصول',
  labelEn: 'Arrival',
  labelAr: 'الوصول',
  emoji: '🛬',
  order: 0,
  items: [
    {
      id: 'rcv_reg',
      label: 'Vérifier enregistrement voyageurs (si pas encore fait)',
      labelDa: 'تأكد من تسجيل المسافرين ( إلا ما تسجلوش )',
      labelEn: 'Check guest registration (if not done yet)',
      labelAr: 'تحقق من تسجيل المسافرين إن لم يتم بعد',
      required: true,
      order: 0,
    },
    {
      id: 'rcv_tax',
      label: 'Récupérer / encaisser la taxe de séjour',
      labelDa: 'جيب / خلّص ضريبة الإقامة',
      labelEn: 'Collect / cash the tourist tax',
      labelAr: 'تحصيل / قبض ضريبة الإقامة',
      required: true,
      order: 1,
    },
    {
      id: 'rcv_keys',
      label: 'Remettre clés / codes d’accès',
      labelDa: 'عطي المفاتيح / كودات الدخول',
      labelEn: 'Hand over keys / access codes',
      labelAr: 'تسليم المفاتيح / رموز الدخول',
      required: true,
      order: 2,
    },
    {
      id: 'rcv_wifi',
      label: 'Expliquer WiFi et consignes du logement',
      labelDa: 'شرح الوايفاي و قوانين الدار',
      labelEn: 'Explain WiFi and house rules',
      labelAr: 'شرح الواي فاي وتعليمات السكن',
      required: false,
      order: 3,
    },
    {
      id: 'rcv_declare',
      label: 'Confirmer l’arrivée réelle (déclarer si besoin)',
      labelDa: 'أكد الوصول الحقيقي ( صرّح إلا خاص )',
      labelEn: 'Confirm actual arrival (declare if needed)',
      labelAr: 'تأكيد الوصول الفعلي (التصريح إن لزم)',
      required: false,
      order: 4,
    },
  ],
};

export const DEFAULT_RECEIVE_DEPARTURE_CATEGORY: ReceiveChecklistCategory = {
  id: 'rcv_departure',
  label: 'Départ',
  labelDa: 'المشية',
  labelEn: 'Departure',
  labelAr: 'المغادرة',
  emoji: '🛫',
  order: 0,
  items: [
    {
      id: 'rcv_keys_back',
      label: 'Récupérer les clés',
      labelDa: 'رجع المفاتيح',
      labelEn: 'Collect the keys',
      labelAr: 'استرجاع المفاتيح',
      required: true,
      order: 0,
    },
    {
      id: 'rcv_quick',
      label: 'État des lieux rapide (dégâts / oubliés)',
      labelDa: 'شوف الدار بسرعة ( أضرار / حاجات منسية )',
      labelEn: 'Quick inspection (damage / left behind)',
      labelAr: 'معاينة سريعة (أضرار / أغراض منسية)',
      required: true,
      order: 1,
    },
    {
      id: 'rcv_tax_out',
      label: 'Vérifier taxe de séjour soldée',
      labelDa: 'تأكد ضريبة الإقامة تسدات',
      labelEn: 'Check tourist tax is settled',
      labelAr: 'التحقق من سداد ضريبة الإقامة',
      required: false,
      order: 2,
    },
    {
      id: 'rcv_declare_out',
      label: 'Confirmer le départ réel (déclarer si besoin)',
      labelDa: 'أكد المشية الحقيقية ( صرّح إلا خاص )',
      labelEn: 'Confirm actual departure (declare if needed)',
      labelAr: 'تأكيد المغادرة الفعلية (التصريح إن لزم)',
      required: false,
      order: 3,
    },
  ],
};

/** @deprecated flat — préférer categories */
export const DEFAULT_RECEIVE_ARRIVAL_CHECKLIST: ReceiveChecklistItem[] =
  DEFAULT_RECEIVE_ARRIVAL_CATEGORY.items;

export const DEFAULT_RECEIVE_DEPARTURE_CHECKLIST: ReceiveChecklistItem[] =
  DEFAULT_RECEIVE_DEPARTURE_CATEGORY.items;

function newId(): string {
  return `rcv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultReceiveChecklist(
  kind: 'arrival' | 'departure',
): ReceiveChecklistItem[] {
  const base =
    kind === 'arrival'
      ? DEFAULT_RECEIVE_ARRIVAL_CATEGORY.items
      : DEFAULT_RECEIVE_DEPARTURE_CATEGORY.items;
  return base.map((item, i) => ({ ...item, order: i }));
}

export function defaultReceiveCategories(
  kind: 'arrival' | 'departure',
): ReceiveChecklistCategory[] {
  const cat =
    kind === 'arrival'
      ? DEFAULT_RECEIVE_ARRIVAL_CATEGORY
      : DEFAULT_RECEIVE_DEPARTURE_CATEGORY;
  return [{ ...cat, items: cat.items.map((row, i) => ({ ...row, order: i })) }];
}

export function normalizeReceiveChecklist(
  raw: unknown,
  kind: 'arrival' | 'departure',
): ReceiveChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultReceiveChecklist(kind);
  }
  const defaultsById = new Map(defaultReceiveChecklist(kind).map((d) => [d.id, d]));
  return raw
    .map((row, i) => {
      const r = row as Record<string, unknown>;
      const label = String(r.label || '').trim();
      if (!label) return null;
      const id = String(r.id || newId());
      const def = defaultsById.get(id);
      return {
        id,
        label,
        labelDa: r.labelDa ? String(r.labelDa) : def?.labelDa,
        labelEn: r.labelEn ? String(r.labelEn) : def?.labelEn,
        labelAr: r.labelAr ? String(r.labelAr) : def?.labelAr,
        required: r.required !== false,
        order: typeof r.order === 'number' ? r.order : i,
      } satisfies ReceiveChecklistItem;
    })
    .filter((x): x is ReceiveChecklistItem => Boolean(x))
    .sort((a, b) => a.order - b.order)
    .map((item, i) => ({ ...item, order: i }));
}

export function defaultReceiveGestion(kind: 'arrival' | 'departure'): {
  durationMinutes: number;
  checklist: ReceiveChecklistItem[];
  checklistCategories: ReceiveChecklistCategory[];
} {
  return {
    durationMinutes: 30,
    checklist: defaultReceiveChecklist(kind),
    checklistCategories: defaultReceiveCategories(kind),
  };
}
