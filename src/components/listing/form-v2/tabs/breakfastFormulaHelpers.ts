/**
 * Formules « PDJ Inclus » — helpers purs (testés sans DOM).
 * Une formule = PartnerService kind room_service porté par le propriétaire
 * (partnerId null). Créée et modifiée depuis l'onglet listing, plus par script.
 */
import type {
  PartnerService,
  PartnerServiceFormule,
  PartnerServiceOptionGroup,
} from '../../../../services/partnersApi';

export const BREAKFAST_CATEGORY = 'Food';
export const MAX_FORMULA_PHOTOS = 3;

export type BreakfastFormulaDraft = {
  id: string;
  title: string;
  description: string;
  priceMad: number;
  photos: string[];
  optionGroups: PartnerServiceOptionGroup[];
  /** Formules nommées (ambiances : Essentiel / Chic / Signature) — éditées telles quelles. */
  formules?: PartnerServiceFormule[];
};

export function formulaPriceMad(dish: Pick<PartnerService, 'formules'>): number {
  const first = (dish.formules || [])[0];
  const n = Number(first?.priceMad ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Catalogue affiché : jamais un service retiré (active=false). */
export function activeDishesOfKind(rows: PartnerService[], kind: string): PartnerService[] {
  return rows.filter((r) => (r.kind || '') === kind && r.active !== false);
}

export function activeBreakfastDishes(rows: PartnerService[]): PartnerService[] {
  return activeDishesOfKind(rows, 'room_service');
}

export function normalizeWhatsapp(raw: string): string {
  let digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  return `+${digits}`;
}

export type NewBreakfastFormulaInput = {
  ownerId: string;
  title: string;
  description?: string;
  priceMad: number;
  whatsapp: string;
};

export type NewPartnerServiceInput = NewBreakfastFormulaInput & {
  kind: PartnerServiceCreateKind;
  category: string;
  /** Fiche provider (obligatoire côté API sauf room_service). */
  partnerId?: string | null;
  /** Libellé de la 1re formule (ambiance : « Essentiel ») — défaut : le titre. */
  formuleLabel?: string;
};

export type PartnerServiceCreateKind = 'room_service' | 'villa_experience' | 'experience' | 'transport';

export type NewPartnerServiceBody = {
  ownerId: string;
  partnerId?: string;
  category: string;
  kind: PartnerServiceCreateKind;
  title: string;
  description: string;
  whatsapp: string;
  cityIds: 'all';
  photos: string[];
  formules: PartnerServiceFormule[];
  optionGroups: PartnerServiceOptionGroup[];
  keywords: string[];
  active: true;
};

/** Corps POST /partners/experiences (schéma Joi : title, category, whatsapp, formules ≥ 1). */
export function newPartnerServiceBody(
  input: NewPartnerServiceInput,
): NewPartnerServiceBody | { error: string } {
  const title = String(input.title || '').trim();
  if (!title) return { error: 'Le nom est obligatoire.' };
  const whatsapp = normalizeWhatsapp(input.whatsapp);
  if (!/^\+\d{8,15}$/.test(whatsapp)) {
    return { error: 'WhatsApp de notification obligatoire, au format international (+212…).' };
  }
  const priceMad = Number(input.priceMad);
  if (!Number.isFinite(priceMad) || priceMad < 0) return { error: 'Prix invalide.' };
  const partnerId = String(input.partnerId || '').trim();
  return {
    ownerId: input.ownerId,
    ...(partnerId ? { partnerId } : {}),
    category: input.category,
    kind: input.kind,
    title,
    description: String(input.description || '').trim(),
    whatsapp,
    cityIds: 'all',
    photos: [],
    formules: [
      { label: input.formuleLabel || title, priceMad: Math.round(priceMad) } as PartnerServiceFormule,
    ],
    optionGroups: [],
    keywords: [],
    active: true,
  };
}

/** Nouvelle formule PDJ / plat room service. */
export function newBreakfastFormulaBody(
  input: NewBreakfastFormulaInput,
): NewPartnerServiceBody | { error: string } {
  const body = newPartnerServiceBody({ ...input, kind: 'room_service', category: BREAKFAST_CATEGORY });
  if ('error' in body && body.error === 'Le nom est obligatoire.') {
    return { error: 'Le nom de la formule est obligatoire.' };
  }
  if ('error' in body && body.error.startsWith('WhatsApp')) {
    return { error: 'WhatsApp cuisine obligatoire, au format international (+212…).' };
  }
  return body;
}

/**
 * Le schéma Joi n'accepte que label / priceMad / city : les formules seedées
 * (Nommos) portent parfois d'autres clés (`title`…) qui feraient rejeter le PUT.
 */
export function cleanFormule(f: PartnerServiceFormule): PartnerServiceFormule {
  const city = typeof f.city === 'string' && f.city.trim() ? f.city.trim() : undefined;
  return { label: f.label, priceMad: f.priceMad ?? null, ...(city ? { city } : {}) };
}

/**
 * Différence entre la formule en base et le brouillon → corps PUT, ou null si rien
 * n'a changé. Le titre suit la 1re formule (label) pour rester lisible côté WhatsApp.
 */
export function breakfastFormulaPatch(
  dish: PartnerService,
  draft: BreakfastFormulaDraft,
  sanitizeGroups: (g: PartnerServiceOptionGroup[]) => PartnerServiceOptionGroup[],
  opts: { formulesEditable?: boolean } = {},
): Partial<PartnerService> | null {
  const patch: Partial<PartnerService> = {};
  const title = (draft.title || '').trim() || dish.title;
  if (title !== dish.title) patch.title = title;
  const desc = (draft.description || '').trim();
  if (desc !== (dish.description || '').trim()) patch.description = desc;
  const groups = sanitizeGroups(draft.optionGroups || []);
  if (JSON.stringify(groups) !== JSON.stringify(dish.optionGroups || [])) patch.optionGroups = groups;
  const currentFormules = (dish.formules || []).map(cleanFormule);
  if (opts.formulesEditable) {
    // Ambiances : formules nommées éditées une à une, le titre ne pilote pas le label.
    const next = (draft.formules || [])
      .map(cleanFormule)
      .filter((f) => String(f.label || '').trim())
      .map((f) => ({
        ...f,
        label: f.label.trim(),
        priceMad: Math.max(0, Math.round(Number(f.priceMad) || 0)),
      }));
    if (next.length && JSON.stringify(next) !== JSON.stringify(currentFormules)) {
      patch.formules = next;
    }
  } else {
    const price = Math.max(0, Math.round(Number(draft.priceMad) || 0));
    if (price !== formulaPriceMad(dish) || title !== dish.title) {
      const first = currentFormules[0] || { label: title, priceMad: price };
      patch.formules = [{ ...first, label: title, priceMad: price }, ...currentFormules.slice(1)];
    }
  }
  const photos = (draft.photos || []).filter(Boolean).slice(0, MAX_FORMULA_PHOTOS);
  if (JSON.stringify(photos) !== JSON.stringify((dish.photos || []).slice(0, MAX_FORMULA_PHOTOS))) {
    patch.photos = photos;
  }
  if (!Object.keys(patch).length) return null;
  // Formules seedées sans `category` : Mongoose refuse le save tant qu'elle manque.
  if (!String(dish.category || '').trim()) patch.category = defaultCategory(dish);
  return patch;
}

function defaultCategory(dish: Partial<Pick<PartnerService, 'kind'>>): string {
  return dish.kind === 'villa_experience' ? 'Ambiance' : BREAKFAST_CATEGORY;
}

/** Retirer = active:false (jamais de suppression) — avec la même rustine `category`. */
export function retireFormulaPatch(
  dish: Pick<PartnerService, 'category'> & Partial<Pick<PartnerService, 'kind'>>,
): Partial<PartnerService> {
  const patch: Partial<PartnerService> = { active: false };
  if (!String(dish.category || '').trim()) patch.category = defaultCategory(dish);
  return patch;
}
