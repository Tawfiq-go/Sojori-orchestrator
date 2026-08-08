// ════════════════════════════════════════════════════════════════════════════
// Pricing v2 — client API (BFF srv-admin /pricing-v2 → srv-pricing-v2:4017)
// ────────────────────────────────────────────────────────────────────────────
// RÈGLE DU MODULE pricing-v2 (agent futur, lis ça d'abord) :
// - AUCUN import depuis features/dynamic-pricing (le pricing v1). Ce module est
//   greenfield ; si tu as besoin d'un composant v1, RECOPIE-le ici.
// - Les types ci-dessous sont le MIROIR EXACT du contrat de sortie du moteur
//   (apps/srv-pricing-v2/src/engine/types.ts, spec v2.7). Ne les « enrichis »
//   pas côté front : si le moteur ne le produit pas, l'UI ne l'affiche pas.
// - Vocabulaire à l'écran : on dit « MARCHÉ », jamais « concurrents ». Décision
//   produit de Tawfiq : le client final veut un prix, point ; le PM veut
//   comprendre — et il raisonne en marché. « Concurrent » suggère qu'on épie des
//   voisins nommément. Ne pas réintroduire le mot, même dans une infobulle.
// - Vocabulaire à l'écran : JAMAIS de jargon nu (p25, ADR, momentum…) — voir la
//   table de traduction dans docs/dynamicprice/BRIEF_DESIGN_PRICING_V2.md §2.
// ════════════════════════════════════════════════════════════════════════════
import apiClient from '../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import { getPersistedUser } from '../../data/mockAuth';

const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/pricing-v2`;

// ⚠️ Le proxy srv-admin exige `ownerId` sur chaque appel pricing-v2 (voir
// apps/srv-admin/src/routes/pricingV2Dashboard/index.ts pour l'historique
// complet) : tant que DISABLE_AUTH=true reste actif en prod, `req.user` côté
// serveur ne peut JAMAIS porter le vrai JWT — c'est toujours un utilisateur
// factice. Le front est donc la seule source fiable de « qui est connecté »,
// exactement comme fulltaskApi.ts le fait déjà avec son paramètre `ownerId`.
//
// Un intercepteur local (pas sur `apiClient` global, qui sert tout le
// dashboard) pose `ownerId` sur CHAQUE requête pricing-v2 — en query pour un
// GET/DELETE, dans le corps sinon. Ça évite de faire porter ce paramètre à
// chacun des ~15 appels ci-dessous et à leurs appelants.
apiClient.interceptors.request.use((config) => {
  if (!config.url?.includes('/pricing-v2/')) return config;
  const ownerId = getPersistedUser()?.id;
  if (!ownerId) return config; // le backend renverra 400 OWNER_ID_REQUIRED, explicite
  if (config.method?.toUpperCase() === 'GET' || config.method?.toUpperCase() === 'DELETE') {
    config.params = { ...config.params, ownerId };
  } else {
    config.data = { ...(config.data ?? {}), ownerId };
  }
  return config;
});

// ── Miroir du contrat moteur (spec v2.7 §7) ──
export type PricingV2Day = {
  date: string; // YYYY-MM-DD
  price: number; // MAD, borné, arrondi
  comp: number; // marché BRUT du jour (repère « vous vs marché »)
  /** État réel de la nuit : vendue / fermée par le PM / à vendre. */
  status?: 'booked' | 'blocked' | 'free';
  /** Prix RÉELLEMENT payé, figé à la réservation (null si non vendue). */
  bookedPriceMad?: number | null;
  /**
   * Nuit invendable : suite libre plus courte que le minStay, coincée entre deux
   * nuits occupées. `minStay` = celui à appliquer ce jour-là (taille du trou),
   * sinon la remise ne sert à rien — personne ne peut réserver.
   */
  gap?: { size: number; minStay: number; adjustPct: number };
  breakdown: {
    base: number;
    seasonal: number;
    dow: number;
    pacing: number;
    override: number;
    clamped: 'floor' | 'ceil' | null;
  };
  mode?: 'override';
};
export type PricingV2Result = {
  days: PricingV2Day[]; // 182 jours
  /** Valeurs EFFECTIVES des leviers (config du PM sinon marché) pour l'UI. */
  levers?: {
    seasonalCoefs: number[]; // 12, moyenne 1
    dowMult: number[]; // 7, index 0 = dimanche
    seasonalEdited: boolean;
    dowEdited: boolean;
  };
  minStay: number;
  suggestedBounds: { low: number; high: number };
  meta: {
    gamme: string;
    mode: string;
    currencyIn: string;
    outputCurrency: string;
    fxToOutput: number;
    asOfDate: string;
    benchmark: number;
    benchmarkRaw: number;
    momentum: number; // tendance 90 j (1.05 = « marché +5 % »)
    base: number;
    floor: number;
    ceil: number;
    compsetSize: number; // < 3 → afficher « faible confiance »
  };
};
export type PricingV2Config = {
  listingId: string;
  shadowEnabled: boolean;
  // 'premium' manquait ici alors que le moteur le gère (GAMME_OFFSET) — le type
  // front était plus étroit que le contrat réel.
  gamme: 'economique' | 'normal' | 'premium' | 'luxe';
  mode: 'prudent' | 'equilibre' | 'agressif';
  minPrice?: number | null;
  maxPrice?: number | null;
  /**
   * Réglage fin continu du prix de base (1 = neutre). C'est ce que pilote le
   * curseur doré « VISÉ » : le PM raisonne en MAD, on convertit en multiplicateur.
   */
  annualTilt?: number | null;
  /** Remise sur les nuits invendables (trou < minStay). Négatif = remise. */
  gapAdjustPct?: number | null;
  /**
   * Publication RÉELLE vers le calendrier — distinct de `shadowEnabled`, qui
   * n'est que le calcul nocturne. false par défaut ; l'allowlist d'ownerId côté
   * backend reste le verrou maître, ce booléen ne suffit pas à publier.
   */
  publishEnabled?: boolean;
  /** Overrides datés posés par le PM (sélection de plage au drag). */
  dailyOverrides?: Record<string, { type: 'fixed' | 'mult'; value: number }> | null;
  /** Leviers édités par le PM. null = valeurs du marché. */
  seasonalCoefs?: number[] | null;
  dowMult?: Record<string, number> | null;
  /**
   * Méthode de pacing — choix explicite, 3 états. Absent/'threshold' (défaut) :
   * les seuils ci-dessous sont RÉELLEMENT actifs, même à leurs valeurs par
   * défaut (85 % / 70 % / ±15 %). Décidé le 08/08/2026.
   */
  pacingMethod?: 'threshold' | 'dynamic' | 'off';
  /** Pacing fin (option B) — actifs quand pacingMethod='threshold'. */
  pacingHighThreshold?: number | null;
  pacingHighMax?: number | null;
  pacingLowThreshold?: number | null;
  pacingLowMax?: number | null;
};

// ── Mode EXPERT : distribution du marché + comparables ──
// (route backend /market/:id — MÊMES comps que ceux qui font le prix)
export type PricingV2Comp = {
  listingId: string;
  /** Nom de l'annonce, tel qu'affiché sur Airbnb. */
  name?: string | null;
  /** Photo de couverture (CDN Airbnb). */
  photoUrl?: string | null;
  /**
   * Lien Airbnb — null si l'id vrai n'a pas pu être récupéré. ⚠️ L'id stocké
   * est tronqué (> 2^53) pour 18 comps sur 25 : le backend le reconstruit
   * depuis les URLs de photos. Ne JAMAIS fabriquer ce lien côté front à partir
   * de `listingId`, il mènerait à un 404.
   */
  airbnbUrl?: string | null;
  similarity: number;
  bedrooms: number;
  guests: number;
  rating: number | null;
  superhost: boolean;
  minNights: number | null;
  locality: string;
  /** Distance à vol d'oiseau (km) vs votre bien — null si un point GPS manque. */
  distanceKm: number | null;
  adrMad: number; // ce qu'il encaisse réellement (12 mois)
  adr90dMad: number; // tendance récente
  occupancy: number | null;
  adjustedMad: number; // ajusté à la qualité de VOTRE bien
  qualityScore: number;
  advantages: string[]; // aménités premium qu'il a et pas vous
  missing: string[]; // aménités premium que vous avez et pas lui
};
export type PricingV2Market = {
  success: boolean;
  error?: string;
  outputCurrency: string;
  subject: {
    bedrooms: number;
    guests: number;
    bathrooms: number | null;
    locality: string;
    rating: number;
    qualityScore: number;
    premiumAmenities: string[];
  };
  /** Échelle PERSONNELLE du bien (sur ses comps). null si aucun comp. */
  scale: { p25: number; p50: number; p75: number; p90: number } | null;
  /** Marché large AirROI — contexte uniquement, bien plus étalé. */
  marketWide: { p25: number; p50: number; p75: number; p90: number };
  compsetSize: number;
  comps: PricingV2Comp[];
};

// ── Historique shadow + comparateur ancien/nouveau ──
export type PricingV2Shadow = {
  success: boolean;
  runs: Array<{
    asOfDate: string;
    computedAt: string;
    engineVersion: string;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    compsetSize: number;
  }>;
  comparison: Array<{ date: string; v2: number; v1: number | null; deltaPct: number | null }>;
};

// ── Page d'atterrissage : tous les biens + KPI ──
// ⚡ Servi depuis les résultats shadow DÉJÀ stockés (aucun recalcul côté service).
export type PricingV2PortfolioRow = {
  listingId: string;
  /**
   * MULTI-ROOMTYPE (Nommos et consorts) — null sur un listing single. Présent
   * = cette ligne est UNE villa d'un listing multi ; à retransmettre en query
   * `roomTypeId` sur tous les appels /market, /preview, /config, /shadow de
   * cette ligne, sinon le backend refuse avec 409 ROOMTYPE_REQUIRED.
   */
  roomTypeId: string | null;
  name: string;
  city: string;
  district: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  dynamicEnabled: boolean;
  tonightMad: number | null;
  spark: number[]; // 30 prix pour la courbe miniature
  floor: number | null;
  ceil: number | null;
  gamme: string;
  occupancy30: number | null; // 0–1
  lastComputedAt: string | null;
  status: 'ok' | 'stale' | 'never_computed' | 'paused';
  staleHours: number | null;
};
export type PricingV2Portfolio = {
  success: boolean;
  error?: string;
  /**
   * Propriétaire dont on regarde le parc, imposé par srv-admin depuis le JWT.
   * `null` = vue admin sur TOUT le parc — l'UI doit le dire explicitement,
   * sinon on présente les biens des autres comme « vos biens ».
   */
  scope: string | null;
  kpis: {
    listings: number;
    cities: number;
    dynamicEnabled: number;
    paused: number;
    alerts: number;
    avgTonightMad: number | null;
    avgOccupancy30: number | null;
  };
  rows: PricingV2PortfolioRow[];
};
export async function fetchPricingV2Portfolio() {
  return apiClient.get<PricingV2Portfolio>(`${BASE}/portfolio`);
}

// MULTI-ROOMTYPE (Nommos) — `roomTypeId` undefined sur un listing single
// (immense majorité) : comportement identique à avant. Sur un listing multi,
// son absence fait renvoyer un 409 { code:'ROOMTYPE_REQUIRED', roomTypeIds }
// par le backend — PricingV2Page gère ce cas avec un sélecteur de villa.
export type MultiRoomTypeRequiredError = {
  success: false;
  code: 'ROOMTYPE_REQUIRED';
  roomTypeIds: string[];
  error: string;
};

export async function fetchPricingV2Market(listingId: string, roomTypeId?: string) {
  return apiClient.get<PricingV2Market>(`${BASE}/market/${listingId}`, {
    params: roomTypeId ? { roomTypeId } : undefined,
  });
}
export async function fetchPricingV2Shadow(listingId: string, roomTypeId?: string) {
  return apiClient.get<PricingV2Shadow>(`${BASE}/shadow/${listingId}`, {
    params: roomTypeId ? { roomTypeId } : undefined,
  });
}

export async function fetchPricingV2Preview(listingId: string, roomTypeId?: string) {
  return apiClient.get<
    | {
        success: true;
        asOfDate: string;
        result: PricingV2Result;
      }
    | (MultiRoomTypeRequiredError & { asOfDate?: undefined; result?: undefined })
    | {
        success: false;
        error?: string;
        /** 'SNAPSHOT_STALE' = prix de marché trop vieux, calcul volontairement refusé. */
        code?: string;
        ageDays?: number | null;
        maxAgeDays?: number;
      }
  >(`${BASE}/preview/${listingId}`, { params: roomTypeId ? { roomTypeId } : undefined });
}
export async function fetchPricingV2Config(listingId: string, roomTypeId?: string) {
  return apiClient.get<{ success: boolean; config: PricingV2Config }>(`${BASE}/config/${listingId}`, {
    params: roomTypeId ? { roomTypeId } : undefined,
  });
}
export async function savePricingV2Config(
  listingId: string,
  patch: Partial<PricingV2Config>,
  roomTypeId?: string,
) {
  return apiClient.put<{ success: boolean; config: PricingV2Config }>(
    `${BASE}/config/${listingId}`,
    patch,
    { params: roomTypeId ? { roomTypeId } : undefined },
  );
}

// ── Publication réelle vers le calendrier ───────────────────────────────────
// ⚠️ Les SEULS appels de ce module à changer les prix vus par les voyageurs.
// Le backend porte les verrous (allowlist d'ownerId, interrupteur du bien,
// fraîcheur du marché) — le front ne fait que demander, il n'autorise rien.

export type PricingV2PushEligibility = {
  success: boolean;
  /** Ce propriétaire a-t-il le droit de publier ? (déploiement progressif) */
  allowed: boolean;
  /** La publication est-elle activée sur ce bien ? */
  publishEnabled: boolean;
  horizonDays: number;
};

export async function fetchPricingV2PushEligibility(listingId: string) {
  return apiClient.get<PricingV2PushEligibility>(`${BASE}/push/${listingId}/eligibility`);
}

export type PricingV2PushResult = {
  success: boolean;
  error?: string;
  code?: string;
  /** Nuits effectivement publiées. */
  pushed?: number;
  /** Nuits sautées car vendues ou fermées — jamais touchées. */
  skippedBooked?: number;
  skippedNoPrice?: number;
};

/** Publie les 182 jours vers le calendrier. Effet RÉEL : à confirmer avant. */
export async function pushPricingV2ToCalendar(listingId: string) {
  return apiClient.post<PricingV2PushResult>(`${BASE}/push/${listingId}`, {
    triggerSource: 'manual-force',
  });
}
