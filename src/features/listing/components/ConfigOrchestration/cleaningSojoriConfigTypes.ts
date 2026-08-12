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
    labelAr: 'غرف النوم',
    emoji: '🛏️',
    order: 0,
    items: [
      item(
        'chk_bed_sheets',
        'Changer les draps et faire les lits',
        'بدل الدراپ ودير السرير',
        'Change the bed sheets and make the beds',
        'تغيير المفارش وترتيب الأسرّة',
        0,
      ),
      item(
        'chk_bed_towels',
        'Mettre des serviettes propres',
        'حط مناشف نقيين',
        'Put out clean towels',
        'وضع مناشف نظيفة',
        1,
      ),
      item(
        'chk_bed_under',
        'Nettoyer sous les lits et sous les tapis',
        'نقي تحت السرير وتحت الزرابي',
        'Clean under the beds and rugs',
        'تنظيف تحت الأسرّة والسجاد',
        2,
      ),
      item(
        'chk_bed_mirrors',
        'Nettoyer les miroirs',
        'نقي المرايات',
        'Clean the mirrors',
        'تنظيف المرايا',
        3,
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
        'chk_bath_shower',
        'Nettoyer la douche et le lavabo',
        'نقي الدوش والمغسلة',
        'Clean the shower and sink',
        'تنظيف الدش والمغسلة',
        0,
      ),
      item(
        'chk_bath_toilet',
        'Nettoyer les toilettes',
        'نقي الطواليط',
        'Clean the toilet',
        'تنظيف المرحاض',
        1,
      ),
      item(
        'chk_bath_soap',
        'Vérifier le savon et le shampoing',
        'شوف واش الصابون والشامبو كاينين',
        'Check that soap and shampoo are available',
        'التحقق من الصابون والشامبو',
        2,
        { required: false },
      ),
      item(
        'chk_bath_tp',
        'Vérifier le papier toilette',
        'شوف واش ورق الطواليط كافي',
        'Check that there is enough toilet paper',
        'التحقق من ورق المرحاض',
        3,
        { required: false },
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
        'chk_kit_dishes',
        'Laver et ranger la vaisselle',
        'غسل ورد المواعن',
        'Wash and put away the dishes',
        'غسل الأواني وترتيبها',
        0,
      ),
      item(
        'chk_kit_sink',
        'Nettoyer l’évier, le plan de travail et la plaque',
        'نقي المجلى وطابلة الخدمة والبلاك',
        'Clean the sink, countertop, and stovetop',
        'تنظيف المغسلة وسطح العمل والموقد',
        1,
      ),
      item(
        'chk_kit_coffee',
        'Nettoyer la machine à café',
        'نقي ماكينة القهوة',
        'Clean the coffee machine',
        'تنظيف آلة القهوة',
        2,
      ),
      item(
        'chk_kit_capsules',
        'Mettre 6 capsules de café',
        'حط 6 كبسولات ديال القهوة',
        'Refill with 6 coffee capsules',
        'وضع 6 كبسولات قهوة',
        3,
      ),
      item(
        'chk_kit_fridge',
        'Vérifier le réfrigérateur et le congélateur',
        'شوف الثلاجة والفريزر نقيين',
        'Check and clean the refrigerator and freezer',
        'التحقق من الثلاجة والفريزر',
        4,
      ),
      item(
        'chk_kit_trash',
        'Sortir les poubelles et mettre des sacs propres',
        'خرج الزبل وحط كيسان جداد',
        'Empty the trash and replace the garbage bags',
        'إخراج القمامة ووضع أكياس نظيفة',
        5,
      ),
    ],
  },
  {
    id: 'cat_logement',
    label: 'Logement',
    labelDa: 'الدار',
    labelEn: 'Entire Property',
    labelAr: 'المنزل',
    emoji: '🏠',
    order: 3,
    items: [
      item('chk_home_dust', 'Enlever la poussière', 'حيد الغبرة', 'Dust all surfaces', 'إزالة الغبار', 0),
      item(
        'chk_home_vacuum',
        'Aspirer ou balayer tous les sols',
        'دوز السبيراتور ولا الكنس فكل البلايص',
        'Vacuum or sweep all floors',
        'شفط أو كنس جميع الأرضيات',
        1,
      ),
      item('chk_home_floors', 'Laver les sols', 'غسل الارض', 'Mop the floors', 'غسل الأرضيات', 2),
      item(
        'chk_home_windows',
        'Nettoyer les vitres et les traces visibles',
        'نقي الزجاج وحيد اي بقع باينة',
        'Clean windows and remove visible marks or fingerprints',
        'تنظيف النوافذ والآثار الظاهرة',
        3,
      ),
      item('chk_home_air', 'Aérer le logement', 'هوي الدار', 'Air out the property', 'تهوية المنزل', 4, {
        required: false,
      }),
      item(
        'chk_home_scent',
        'Mettre un peu de parfum, sans excès',
        'رش شوية ديال المعطر بلا ما تكثر',
        'Add a light air freshener (do not overdo it)',
        'وضع عطر خفيف دون مبالغة',
        5,
        { required: false },
      ),
    ],
  },
  {
    id: 'cat_depart',
    label: 'Avant de partir',
    labelDa: 'قبل ما تخرج',
    labelEn: 'Before Leaving',
    labelAr: 'قبل المغادرة',
    emoji: '🚪',
    order: 4,
    items: [
      item(
        'chk_leave_lights',
        'Vérifier les lumières et signaler les problèmes',
        'جرب الضو وخبر الى كاين شي مشكل',
        'Check all lights and report any issues',
        'التحقق من الإنارة والإبلاغ عن المشاكل',
        0,
      ),
      item(
        'chk_leave_ac',
        'Vérifier la climatisation',
        'شوف الكليم كايخدم',
        'Check that the air conditioning is working',
        'التحقق من المكيّف',
        1,
        { required: false },
      ),
      item(
        'chk_leave_forgot',
        'Vérifier qu’aucun objet n’a été oublié',
        'شوف واش ما بقا حتى غرض ديال الضيف',
        'Make sure no guest belongings have been left behind',
        'التأكد من عدم نسيان أي غرض',
        2,
      ),
      item(
        'chk_leave_close',
        'Fermer les fenêtres et la porte',
        'سد الشرجم والباب',
        'Close all windows and lock the door',
        'إغلاق النوافذ والباب',
        3,
      ),
      item(
        'chk_leave_photo',
        'Envoyer une photo du logement terminé',
        'صيفط تصويرة ديال الدار من بعد ما تسالي',
        'Send photos of the cleaned property',
        'إرسال صورة للمنزل بعد التنظيف',
        4,
        { photoRequired: true },
      ),
      item(
        'chk_leave_report',
        'Signaler tout produit manquant ou objet cassé',
        'خبر الى ناقص شي منتوج ولا كاين شي حاجة مكسورة',
        'Report any missing supplies or damaged items',
        'الإبلاغ عن أي منتج ناقص أو غرض مكسور',
        5,
        { required: false },
      ),
    ],
  },
]


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
  { id: 'broken_missing', label: 'Objet cassé ou manquant', labelDa: 'حاجة مكسورة ولا ناقصة', labelEn: 'Broken or missing item', labelAr: 'شيء مكسور أو ناقص', order: 0 },
  { id: 'degraded', label: 'Appartement dégradé', labelDa: 'الشقة فيها تخسار', labelEn: 'Damaged apartment', labelAr: 'شقة متضررة', order: 1 },
  { id: 'stain_sofa', label: 'Tache canapé / fauteuil', labelDa: 'بقعة فالصالون ولا فالكنبة', labelEn: 'Stain on sofa', labelAr: 'بقعة على الكنبة', order: 2 },
  { id: 'stain_bed', label: 'Tache lit / matelas / linge', labelDa: 'بقعة فالسرير ولا فالماتلا', labelEn: 'Stain on bed/linen', labelAr: 'بقعة على السرير', order: 3 },
  { id: 'linen_missing', label: 'Linge/serviette manquant', labelDa: 'مناشف ولا بياضات ناقصين', labelEn: 'Missing linen/towel', labelAr: 'بياضات ناقصة', order: 4 },
  { id: 'ac_issue', label: 'Problème climatisation', labelDa: 'مشكل فالكليماتيزور', labelEn: 'A/C problem', labelAr: 'مشكلة تكييف', order: 5 },
  { id: 'water_leak', label: 'Fuite eau / plomberie', labelDa: 'تسريب الما / السباكة', labelEn: 'Water leak / plumbing', labelAr: 'تسرب ماء / سباكة', order: 6 },
  { id: 'equipment', label: 'Équipement en panne', labelDa: 'جهاز ما خدامش', labelEn: 'Equipment not working', labelAr: 'جهاز معطل', order: 7 },
  { id: 'glass_damage', label: 'Vitre/miroir abîmé', labelDa: 'زجاج ولا مرآة مكسورين', labelEn: 'Broken glass/mirror', labelAr: 'زجاج أو مرآة تالف', order: 8 },
  { id: 'guest_left', label: 'Objet client oublié', labelDa: 'حاجة الزبون نساها', labelEn: 'Guest left an item', labelAr: 'غرض نزيل', order: 9 },
  { id: 'extra_clean', label: 'Nettoyage exceptionnel', labelDa: 'خاص تنظيف إضافي', labelEn: 'Extra cleaning needed', labelAr: 'تنظيف إضافي', order: 10 },
  { id: 'other', label: 'Autre problème', labelDa: 'مشكل آخر', labelEn: 'Other issue', labelAr: 'مشكلة أخرى', order: 11 },
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
