export const LISTING_CONFIG_TABS = ['whatsapp', 'concierge', 'support', 'rules', 'access'] as const;

export type ListingConfigTab = (typeof LISTING_CONFIG_TABS)[number];

const MONGO_OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function isMongoListingId(value: string): boolean {
  return MONGO_OBJECT_ID_RE.test(value.trim());
}

export function isListingConfigTab(value: string): value is ListingConfigTab {
  return (LISTING_CONFIG_TABS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildListingConfigPutBody(
  tab: ListingConfigTab,
  parsed: unknown,
): { ok: true; body: unknown } | { ok: false; error: string } {
  const r = isRecord(parsed) ? parsed : {};

  switch (tab) {
    case 'whatsapp': {
      const overrides = r.overrides;
      if (!Array.isArray(overrides)) {
        return {
          ok: false,
          error:
            'JSON invalide : propriété "overrides" (tableau) obligatoire. Le PUT srv-listing n’enregistre que les overrides du menu WhatsApp.',
        };
      }
      return { ok: true, body: { overrides } };
    }
    case 'concierge': {
      return {
        ok: true,
        body: {
          transportServices: Array.isArray(r.transportServices) ? r.transportServices : [],
          groceryServices: Array.isArray(r.groceryServices) ? r.groceryServices : [],
          customServices: Array.isArray(r.customServices) ? r.customServices : [],
        },
      };
    }
    case 'support': {
      const categories = r.categories;
      if (!Array.isArray(categories)) {
        return { ok: false, error: 'JSON invalide : "categories" (tableau) obligatoire.' };
      }
      return { ok: true, body: { categories } };
    }
    case 'rules': {
      const rulesAndInfo = r.rulesAndInfo;
      if (!isRecord(rulesAndInfo)) {
        return { ok: false, error: 'JSON invalide : "rulesAndInfo" (objet) obligatoire.' };
      }
      return { ok: true, body: { rulesAndInfo } };
    }
    case 'access': {
      const body: Record<string, unknown> = {};
      if (typeof r.listingName === 'string') {
        body.listingName = r.listingName;
      }
      if (isRecord(r.receptionMode)) {
        const t = r.receptionMode.type;
        if (t === 'automatic' || t === 'assisted') {
          body.receptionMode = { ...r.receptionMode, type: t };
        }
      }
      if (Array.isArray(r.instructions)) {
        body.instructions = r.instructions;
      }
      if (Object.keys(body).length === 0) {
        return {
          ok: false,
          error:
            'Corps PUT vide : définissez au moins listingName, receptionMode { type } ou instructions (tableau).',
        };
      }
      return { ok: true, body };
    }
    default:
      return { ok: false, error: 'Onglet inconnu.' };
  }
}

/** Corps POST création accès (srv-listing listing-access). */
export function buildListingAccessCreateBody(
  parsed: unknown,
  listingId: string,
  listingNameFallback: string,
): { ok: true; body: unknown } | { ok: false; error: string } {
  const r = isRecord(parsed) ? parsed : {};
  const lid = typeof r.listingId === 'string' && r.listingId.trim() ? r.listingId.trim() : listingId;
  const name =
    typeof r.listingName === 'string' && r.listingName.trim()
      ? r.listingName.trim()
      : listingNameFallback.trim() || 'Listing';
  if (!isRecord(r.receptionMode)) {
    return { ok: false, error: 'receptionMode { type: "automatic" | "assisted" } obligatoire.' };
  }
  const t = r.receptionMode.type;
  if (t !== 'automatic' && t !== 'assisted') {
    return { ok: false, error: 'receptionMode.type doit être "automatic" ou "assisted".' };
  }
  if (!Array.isArray(r.instructions)) {
    return { ok: false, error: 'instructions (tableau) obligatoire (peut être []).' };
  }
  return {
    ok: true,
    body: {
      listingId: lid,
      listingName: name,
      receptionMode: isRecord(r.receptionMode) ? { ...r.receptionMode, type: t } : { type: t },
      instructions: r.instructions,
    },
  };
}
