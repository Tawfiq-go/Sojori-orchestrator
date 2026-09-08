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
};

export function formulaPriceMad(dish: Pick<PartnerService, 'formules'>): number {
  const first = (dish.formules || [])[0];
  const n = Number(first?.priceMad ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Catalogue affiché : jamais une formule retirée (active=false). */
export function activeBreakfastDishes(rows: PartnerService[]): PartnerService[] {
  return rows.filter((r) => (r.kind || '') === 'room_service' && r.active !== false);
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

/** Corps POST /partners/experiences pour une nouvelle formule (schéma Joi : title, category, whatsapp, formules ≥ 1). */
export function newBreakfastFormulaBody(input: NewBreakfastFormulaInput): {
  ownerId: string;
  category: string;
  kind: 'room_service';
  title: string;
  description: string;
  whatsapp: string;
  cityIds: 'all';
  photos: string[];
  formules: PartnerServiceFormule[];
  optionGroups: PartnerServiceOptionGroup[];
  keywords: string[];
  active: true;
} | { error: string } {
  const title = String(input.title || '').trim();
  if (!title) return { error: 'Le nom de la formule est obligatoire.' };
  const whatsapp = normalizeWhatsapp(input.whatsapp);
  if (!/^\+\d{8,15}$/.test(whatsapp)) {
    return { error: 'WhatsApp cuisine obligatoire, au format international (+212…).' };
  }
  const priceMad = Number(input.priceMad);
  if (!Number.isFinite(priceMad) || priceMad < 0) return { error: 'Prix invalide.' };
  return {
    ownerId: input.ownerId,
    category: BREAKFAST_CATEGORY,
    kind: 'room_service',
    title,
    description: String(input.description || '').trim(),
    whatsapp,
    cityIds: 'all',
    photos: [],
    formules: [{ label: title, priceMad: Math.round(priceMad) } as PartnerServiceFormule],
    optionGroups: [],
    keywords: [],
    active: true,
  };
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
): Partial<PartnerService> | null {
  const patch: Partial<PartnerService> = {};
  const title = (draft.title || '').trim() || dish.title;
  if (title !== dish.title) patch.title = title;
  const desc = (draft.description || '').trim();
  if (desc !== (dish.description || '').trim()) patch.description = desc;
  const groups = sanitizeGroups(draft.optionGroups || []);
  if (JSON.stringify(groups) !== JSON.stringify(dish.optionGroups || [])) patch.optionGroups = groups;
  const price = Math.max(0, Math.round(Number(draft.priceMad) || 0));
  const currentFormules = (dish.formules || []).map(cleanFormule);
  if (price !== formulaPriceMad(dish) || title !== dish.title) {
    const first = currentFormules[0] || { label: title, priceMad: price };
    patch.formules = [{ ...first, label: title, priceMad: price }, ...currentFormules.slice(1)];
  }
  const photos = (draft.photos || []).filter(Boolean).slice(0, MAX_FORMULA_PHOTOS);
  if (JSON.stringify(photos) !== JSON.stringify((dish.photos || []).slice(0, MAX_FORMULA_PHOTOS))) {
    patch.photos = photos;
  }
  if (!Object.keys(patch).length) return null;
  // Formules seedées sans `category` : Mongoose refuse le save tant qu'elle manque.
  if (!String(dish.category || '').trim()) patch.category = BREAKFAST_CATEGORY;
  return patch;
}

/** Retirer = active:false (jamais de suppression) — avec la même rustine `category`. */
export function retireFormulaPatch(dish: Pick<PartnerService, 'category'>): Partial<PartnerService> {
  const patch: Partial<PartnerService> = { active: false };
  if (!String(dish.category || '').trim()) patch.category = BREAKFAST_CATEGORY;
  return patch;
}
