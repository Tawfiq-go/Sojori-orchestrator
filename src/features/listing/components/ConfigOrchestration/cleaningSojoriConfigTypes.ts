/**
 * Checklist ménage par catégories — pattern Sojori (FR → DA → AR → EN).
 *
 * Pattern à respecter :
 * - Stockage : cleaningOrchestration.checklistCategories[]
 * - Chaque catégorie = thème (Chambres, SDB, Cuisine…) avec items
 * - UI PM : compacte (font 11–12), 1 bloc / catégorie
 * - WA Terminer (Meta) : 1 CheckboxGroup / catégorie sur le même écran
 *   (multi-select supporté ; ~4–7 options / groupe — OK Meta)
 * - label = FR canonique ; labelDa (Darija) / labelAr / labelEn pour staff lang
 */

export type CleaningChecklistItem = {
  id: string;
  label: string;
  labelDa?: string;
  labelEn?: string;
  labelAr?: string;
  required: boolean;
  photoRequired: boolean;
  order: number;
};

export type CleaningChecklistCategory = {
  id: string;
  /** FR */
  label: string;
  labelDa?: string;
  labelEn?: string;
  labelAr?: string;
  emoji?: string;
  order: number;
  items: CleaningChecklistItem[];
};

/** Déclarations problèmes FdM (liste plate, multi-langue). */
export type CleaningDeclareOption = {
  id: string;
  label: string;
  labelDa?: string;
  labelEn?: string;
  labelAr?: string;
  order: number;
};

export type CleaningSojoriConfig = {
  enabled: boolean;
  preferredDayAfterCheckout: number;
  safetyMaxDirtyDays: number;
  /** Canonical — par catégories */
  checklistCategories: CleaningChecklistCategory[];
  /** Flat dérivé (compat lecture / tâches) */
  checklist: CleaningChecklistItem[];
  /** Déclarations WA Terminer */
  declareOptions: CleaningDeclareOption[];
};

/** Tokens typo du pattern checklist PM (petite police). */
export const CHECKLIST_UI = {
  catTitle: { fontSize: 12, fontWeight: 800, letterSpacing: '0.02em' },
  catMeta: { fontSize: 10.5, fontWeight: 600 },
  fieldLabel: { fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em' },
  input: { fontSize: 11.5, padding: '6px 8px' },
  hint: { fontSize: 11, lineHeight: 1.4 },
  pill: { fontSize: 9.5 },
} as const;

function item(
  id: string,
  label: string,
  labelDa: string,
  labelEn: string,
  labelAr: string,
  order: number,
  opts?: { required?: boolean; photoRequired?: boolean },
): CleaningChecklistItem {
  return {
    id,
    label,
    labelDa,
    labelEn,
    labelAr,
    required: opts?.required !== false,
    photoRequired: opts?.photoRequired === true,
    order,
  }
}

export const DEFAULT_CLEANING_CHECKLIST_CATEGORIES: CleaningChecklistCategory[] = [
  {
    id: 'cat_chambres',
    label: 'Chambres',
    labelDa: 'الغرف',
    labelEn: 'Bedrooms',
    labelAr: 'الغرف',
    emoji: '🛏️',
    order: 0,
    items: [
      item(
        'chk_bed_room',
        'Draps changés, lits faits et serviettes selon le nombre de voyageurs ?',
        'تبدلات الأغطية، تواجدات السراير والمناشف حسب عدد الزبناء؟',
        'Sheets changed, beds made and towels for all guests?',
        'هل غُيِّرت الأغطية والأسرّة والمناشف حسب عدد النزلاء؟',
        0,
      ),
    ],
  },
  {
    id: 'cat_sdb',
    label: 'Salle de bain',
    labelDa: 'الحمام',
    labelEn: 'Bathroom',
    labelAr: 'الحمام',
    emoji: '🚿',
    order: 1,
    items: [
      item(
        'chk_bath_all',
        'Douche, WC, savon, shampoing et papier — tout propre et disponible ?',
        'الدوش، المرحاض، الصابون، الشامبو وورق المرحاض كلشي نقي ومتوفر؟',
        'Shower, toilet, soap, shampoo and paper — all clean and stocked?',
        'الدش والمرحاض والصابون والشامبو وورق المرحاض — هل كل شيء نظيف ومتوفر؟',
        0,
      ),
    ],
  },
  {
    id: 'cat_cuisine',
    label: 'Cuisine',
    labelDa: 'المطبخ',
    labelEn: 'Kitchen',
    labelAr: 'المطبخ',
    emoji: '🍽️',
    order: 2,
    items: [
      item(
        'chk_kit_all',
        'Vaisselle, évier, plaque, cafetière et frigo — tout propre ?',
        'الماعِن، المغسلة، البلاكة، آلة القهوة والثلاجة كلشي نقي؟',
        'Dishes, sink, hob, coffee machine and fridge — all clean?',
        'الأواني والمغسلة والموقد وآلة القهوة والثلاجة — هل كل شيء نظيف؟',
        0,
      ),
    ],
  },
  {
    id: 'cat_logement',
    label: 'Appartement',
    labelDa: 'الشقة',
    labelEn: 'Apartment',
    labelAr: 'الشقة',
    emoji: '🧹',
    order: 3,
    items: [
      item(
        'chk_apt_all',
        'Sols, poussière, surfaces et miroirs — tout propre ?',
        'الأرضية، الغبرة، السطوح والمرايات كلشي نقي؟',
        'Floors, dust, surfaces and mirrors — all clean?',
        'الأرضية والغبار والأسطح والمرايا — هل كل شيء نظيف؟',
        0,
      ),
    ],
  },
  {
    id: 'cat_exit',
    label: 'Avant de partir',
    labelDa: 'قبل ما تخرج',
    labelEn: 'Before leaving',
    labelAr: 'قبل المغادرة',
    emoji: '🔌',
    order: 4,
    items: [
      item(
        'chk_exit_all',
        'Clim et lumières éteintes ? Poubelle sortie ? Fenêtres et portes fermées ?',
        'طفيتي المكيفات والضو؟ خرجتي الزبل؟ تسدو الشرجم والبيبان؟',
        'AC and lights off? Trash out? Windows and doors closed?',
        'المكيف والإضاءة مطفأة؟ الزبالة خارج؟ النوافذ والأبواب مغلقة؟',
        0,
      ),
    ],
  },
  {
    id: 'cat_final',
    label: 'Contrôle final',
    labelDa: 'المراقبة الأخيرة',
    labelEn: 'Final check',
    labelAr: 'المراقبة الأخيرة',
    emoji: '📸',
    order: 5,
    items: [
      item(
        'chk_final_ready',
        'Logement prêt pour le prochain client ? Photos envoyées ?',
        'الشقة واجدة للزبون الجاي؟ وصيفطتي التصاور؟',
        'Property ready for the next guest? Photos sent?',
        'هل الشقة جاهزة للنزيل القادم؟ هل أرسلت الصور؟',
        0,
        { photoRequired: true },
      ),
    ],
  },
];


export const DEFAULT_CLEANING_CHECKLIST: CleaningChecklistItem[] = flattenCategories(
  DEFAULT_CLEANING_CHECKLIST_CATEGORIES,
);

export function flattenCategories(cats: CleaningChecklistCategory[]): CleaningChecklistItem[] {
  const sorted = [...cats].sort((a, b) => a.order - b.order);
  const out: CleaningChecklistItem[] = [];
  let n = 0;
  for (const cat of sorted) {
    const items = [...(cat.items || [])].sort((a, b) => a.order - b.order);
    for (const it of items) {
      out.push({ ...it, order: n++ });
    }
  }
  return out;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function strOpt(v: unknown): string {
  return String(v ?? '').trim();
}

function normalizeItem(row: unknown, i: number): CleaningChecklistItem | null {
  const r = row as Record<string, unknown>;
  const label = strOpt(r.label);
  if (!label) return null;
  return {
    id: String(r.id || newId('chk')),
    label,
    labelDa: strOpt(r.labelDa),
    labelEn: strOpt(r.labelEn),
    labelAr: strOpt(r.labelAr),
    required: r.required !== false,
    photoRequired: r.photoRequired === true,
    order: typeof r.order === 'number' ? r.order : i,
  };
}

function normalizeCategory(row: unknown, i: number): CleaningChecklistCategory | null {
  const r = row as Record<string, unknown>;
  const label = strOpt(r.label);
  if (!label) return null;
  const rawItems = Array.isArray(r.items) ? r.items : [];
  const items = rawItems
    .map((it, j) => normalizeItem(it, j))
    .filter((x): x is CleaningChecklistItem => x != null)
    .map((it, j) => ({ ...it, order: j }));
  return {
    id: String(r.id || newId('cat')),
    label,
    labelDa: strOpt(r.labelDa),
    labelEn: strOpt(r.labelEn),
    labelAr: strOpt(r.labelAr),
    emoji: strOpt(r.emoji) || undefined,
    order: typeof r.order === 'number' ? r.order : i,
    items,
  };
}

/** Migre flat checklist legacy → 1 catégorie « Général » (sans seed DEFAULT). */
function categoriesFromFlat(flat: unknown): CleaningChecklistCategory[] {
  if (!Array.isArray(flat) || flat.length === 0) {
    return [];
  }
  const items = flat
    .map((it, i) => normalizeItem(it, i))
    .filter((x): x is CleaningChecklistItem => x != null)
    .map((it, i) => ({ ...it, order: i }));
  return [
    {
      id: 'cat_general',
      label: 'Général',
      labelDa: 'عام',
      labelEn: 'General',
      labelAr: 'عام',
      emoji: '📋',
      order: 0,
      items,
    },
  ];
}

export function normalizeChecklistCategories(raw: unknown, flatFallback?: unknown): CleaningChecklistCategory[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const cats = raw
      .map((c, i) => normalizeCategory(c, i))
      .filter((x): x is CleaningChecklistCategory => x != null)
      .sort((a, b) => a.order - b.order)
      .map((c, i) => ({ ...c, order: i }));
    if (cats.length) return cats;
  }
  return categoriesFromFlat(flatFallback);
}

export const DEFAULT_CLEANING_DECLARE_OPTIONS: CleaningDeclareOption[] = [
  { id: 'broken_missing', label: 'Objet cassé ou manquant', labelDa: 'شي حاجة مكسورة ولا ناقصة', labelEn: 'Broken or missing item', labelAr: 'شيء مكسور أو ناقص', order: 0 },
  { id: 'stain_sofa', label: 'Tache salon / tapis', labelDa: 'شي بقعة فالصالون ولا الزربية', labelEn: 'Stain on sofa or rug', labelAr: 'بقعة في الصالون أو السجاد', order: 1 },
  { id: 'stain_bed', label: 'Tache lit / literie', labelDa: 'شي بقعة فالسرير ولا الفرش', labelEn: 'Stain on bed or linen', labelAr: 'بقعة في السرير أو الفرش', order: 2 },
  { id: 'ac_issue', label: 'Problème climatisation', labelDa: 'مشكل فالمكيف', labelEn: 'A/C problem', labelAr: 'مشكلة في المكيف', order: 3 },
  { id: 'water_leak', label: 'Fuite eau', labelDa: 'تسريب ديال الما', labelEn: 'Water leak', labelAr: 'تسرب الماء', order: 4 },
  { id: 'equipment', label: 'Équipement en panne', labelDa: 'شي جهاز ما خدامش', labelEn: 'Equipment not working', labelAr: 'جهاز لا يعمل', order: 5 },
  { id: 'degraded', label: 'Appartement dégradé', labelDa: 'الشقة فيها تخسار', labelEn: 'Damaged apartment', labelAr: 'الشقة متضررة', order: 6 },
  { id: 'guest_left', label: 'Objet client oublié', labelDa: 'شي حاجة ديال الزبون منسية', labelEn: 'Guest left an item', labelAr: 'غرض نسي الزبون', order: 7 },
  { id: 'linen_missing', label: 'Serviette ou literie manquante', labelDa: 'شي منشفة ولا فراش ناقص', labelEn: 'Missing towel or linen', labelAr: 'منشفة أو فراش ناقص', order: 8 },
  { id: 'other', label: 'Autre problème', labelDa: 'مشكل آخر', labelEn: 'Other issue', labelAr: 'مشكلة أخرى', order: 9 },
  { id: 'no_problem', label: 'Aucun problème', labelDa: 'ما كاين حتى مشكل', labelEn: 'No problem', labelAr: 'لا توجد مشكلة', order: 10 },
];

export function normalizeDeclareOptions(raw: unknown): CleaningDeclareOption[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const out: CleaningDeclareOption[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i] as Record<string, unknown>;
    const id = strOpt(r.id).slice(0, 40);
    const label = strOpt(r.label) || strOpt(r.title);
    if (!id || !label) continue;
    if (!/^[a-z0-9_]{1,40}$/i.test(id)) continue;
    out.push({
      id,
      label,
      labelDa: strOpt(r.labelDa),
      labelEn: strOpt(r.labelEn),
      labelAr: strOpt(r.labelAr),
      order: typeof r.order === 'number' ? r.order : i,
    });
    if (out.length >= 20) break;
  }
  return out.length
    ? out.sort((a, b) => a.order - b.order).map((o, i) => ({ ...o, order: i }))
    : [];
}

export function mapListingToCleaningSojoriConfig(raw: Record<string, unknown>): CleaningSojoriConfig {
  const orch = (raw.cleaningOrchestration as Record<string, unknown>) || {};
  const enabled = orch.enabled === true || raw.orchestration_cleaning_sojori === true;
  const preferred = typeof orch.preferredDayAfterCheckout === 'number' ? orch.preferredDayAfterCheckout : 0;
  const safety =
    typeof orch.safetyMaxDirtyDays === 'number'
      ? Math.min(4, Math.max(1, orch.safetyMaxDirtyDays))
      : 4;

  const checklistCategories = normalizeChecklistCategories(orch.checklistCategories, orch.checklist);
  return {
    enabled,
    preferredDayAfterCheckout: Math.min(3, Math.max(0, preferred)),
    safetyMaxDirtyDays: safety,
    checklistCategories,
    checklist: flattenCategories(checklistCategories),
    declareOptions: normalizeDeclareOptions(orch.declareOptions),
  };
}

function existingCleaningOrch(raw?: Record<string, unknown>): Record<string, unknown> {
  const orch = raw?.cleaningOrchestration;
  return orch && typeof orch === 'object' && !Array.isArray(orch)
    ? { ...(orch as Record<string, unknown>) }
    : {};
}

function serializeCategories(cats: CleaningChecklistCategory[]) {
  return [...cats]
    .sort((a, b) => a.order - b.order)
    .map((cat, i) => ({
      id: cat.id,
      label: cat.label,
      labelDa: strOpt(cat.labelDa),
      labelEn: strOpt(cat.labelEn),
      labelAr: strOpt(cat.labelAr),
      emoji: strOpt(cat.emoji) || undefined,
      order: i,
      items: [...(cat.items || [])]
        .sort((a, b) => a.order - b.order)
        .map((item, j) => ({
          id: item.id,
          label: item.label,
          labelDa: strOpt(item.labelDa),
          labelEn: strOpt(item.labelEn),
          labelAr: strOpt(item.labelAr),
          required: item.required,
          photoRequired: item.photoRequired,
          order: j,
        })),
    }));
}

export function mapCleaningSojoriToListingPatch(
  cfg: CleaningSojoriConfig,
  listingValues?: Record<string, unknown>,
): Record<string, unknown> {
  const existing = existingCleaningOrch(listingValues);
  const checklistCategories = serializeCategories(cfg.checklistCategories);
  const declareOptions = normalizeDeclareOptions(cfg.declareOptions).map((o, i) => ({
    id: o.id,
    label: o.label,
    labelDa: strOpt(o.labelDa),
    labelEn: strOpt(o.labelEn),
    labelAr: strOpt(o.labelAr),
    order: i,
  }));
  return {
    orchestration_cleaning_sojori: cfg.enabled,
    cleaningOrchestration: {
      ...existing,
      enabled: cfg.enabled,
      preferredDayAfterCheckout: cfg.preferredDayAfterCheckout,
      safetyMaxDirtyDays: cfg.safetyMaxDirtyDays,
      checklistCategories,
      checklist: flattenCategories(cfg.checklistCategories),
      declareOptions,
    },
  };
}

export function mapCleaningSojoriTriggersPatch(
  cfg: Pick<CleaningSojoriConfig, 'enabled' | 'preferredDayAfterCheckout' | 'safetyMaxDirtyDays'>,
  listingValues?: Record<string, unknown>,
): Record<string, unknown> {
  const existing = existingCleaningOrch(listingValues);
  return {
    orchestration_cleaning_sojori: cfg.enabled,
    cleaningOrchestration: {
      ...existing,
      enabled: cfg.enabled,
      preferredDayAfterCheckout: cfg.preferredDayAfterCheckout,
      safetyMaxDirtyDays: cfg.safetyMaxDirtyDays,
    },
  };
}

export function mapCleaningChecklistPatch(
  checklistCategories: CleaningChecklistCategory[],
  listingValues?: Record<string, unknown>,
): Record<string, unknown> {
  const existing = existingCleaningOrch(listingValues);
  const cats = serializeCategories(checklistCategories);
  return {
    cleaningOrchestration: {
      ...existing,
      checklistCategories: cats,
      checklist: flattenCategories(checklistCategories),
    },
  };
}

export function mapCleaningDeclarePatch(
  declareOptions: CleaningDeclareOption[],
  listingValues?: Record<string, unknown>,
): Record<string, unknown> {
  const existing = existingCleaningOrch(listingValues);
  const opts = normalizeDeclareOptions(declareOptions).map((o, i) => ({
    id: o.id,
    label: o.label,
    labelDa: strOpt(o.labelDa),
    labelEn: strOpt(o.labelEn),
    labelAr: strOpt(o.labelAr),
    order: i,
  }));
  return {
    cleaningOrchestration: {
      ...existing,
      declareOptions: opts,
    },
  };
}

export function createEmptyDeclareOption(order: number): CleaningDeclareOption {
  return {
    id: newId('decl'),
    label: '',
    labelDa: '',
    labelEn: '',
    labelAr: '',
    order,
  };
}

export function canPersistListingConfig(listingId: string, templateMode: boolean): boolean {
  return templateMode || Boolean(String(listingId || '').trim());
}

export function createEmptyChecklistItem(order: number): CleaningChecklistItem {
  return {
    id: newId('chk'),
    label: '',
    labelDa: '',
    labelEn: '',
    labelAr: '',
    required: true,
    photoRequired: false,
    order,
  };
}

export function createEmptyChecklistCategory(order: number): CleaningChecklistCategory {
  return {
    id: newId('cat'),
    label: '',
    labelDa: '',
    labelEn: '',
    labelAr: '',
    emoji: '📋',
    order,
    items: [createEmptyChecklistItem(0)],
  };
}

export function cleaningChecklistLabel(
  item: Pick<CleaningChecklistItem, 'label' | 'labelDa' | 'labelEn' | 'labelAr'>,
  lang: 'fr' | 'da' | 'ar' | 'en' = 'fr',
): string {
  if (lang === 'da') {
    return (
      item.labelDa?.trim() ||
      item.labelAr?.trim() ||
      String(item.label || '').trim() ||
      item.labelEn?.trim() ||
      ''
    );
  }
  if (lang === 'en' && item.labelEn?.trim()) return item.labelEn.trim();
  if (lang === 'ar' && item.labelAr?.trim()) return item.labelAr.trim();
  return String(item.label || '').trim() || item.labelDa?.trim() || item.labelEn?.trim() || item.labelAr?.trim() || '';
}

/**
 * Pattern Meta — écran Terminer (pour l’agent flow) :
 * - 1 screen, N CheckboxGroup (name = cat_{id}), data-source = items de la cat
 * - required=false au début (non bloquant)
 * - Footer « Terminer » → data_exchange complete + checklistDone[]
 */
export const MENAGE_FINISH_SCREEN_PATTERN = {
  screenId: 'MENAGE_CHECKLIST_FINISH',
  component: 'CheckboxGroup',
  oneGroupPerCategory: true,
  sameScreen: true,
  requiredInitially: false,
  maxRecommendedOptionsPerGroup: 10,
} as const;
