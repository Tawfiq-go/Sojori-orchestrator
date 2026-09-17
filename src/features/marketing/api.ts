// ════════════════════════════════════════════════════════════════════════════
// Marketing Intelligence — client API
// ────────────────────────────────────────────────────────────────────────────
// RÈGLES DU MODULE (agent futur, lis ça d'abord) :
//
// - Les types sont le miroir du contrat de srv-agents. Si le backend ne le
//   produit pas, l'UI ne l'affiche pas — pas de champ « enrichi » côté front.
//
// - Vocabulaire à l'écran : on ne dit JAMAIS « la campagne a généré X
//   réservations » tant que l'attribution est au niveau 0. On dit « signal
//   observé ». Le lien entre un clic et une réservation n'existe pas encore :
//   pas d'UTM, et la majorité des réservations arrive par une OTA où la
//   publicité est invisible. Une UI qui affirmerait la causalité mentirait.
//   Voir docs/patterns/10-couche-agents.md §4 (dépôt backend).
//
// - Les montants arrivent déjà convertis en MAD par le collecteur, avec le
//   taux et sa date. Ne jamais reconvertir côté front.
// ════════════════════════════════════════════════════════════════════════════
import { MICROSERVICE_BASE_URL } from "../../config/authConfig";
import apiClient from "../../services/apiClient";

const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/marketing`;

/** Fiabilité du lien entre dépense publicitaire et réservation. */
export type AttributionLevel = 0 | 1 | 2 | 3;

export type MarketingConnection = {
  tenantId: string;
  provider: "meta" | "google";
  adAccountId: string;
  accountName?: string;
  currency?: string;
  status: "pending" | "active" | "revoked" | "expired";
  connectedAt?: string;
  lastSyncAt?: string;
};

export type CampaignRow = {
  campaignId: string;
  campaignName: string;
  objective?: string;
  /** Pays de diffusion réel (breakdown Meta), pas le ciblage déclaré. */
  country?: string;
  spend: number;
  currency: string;
  spendMad: number;
  impressions: number;
  clicks: number;
  ctr?: number;
  cpc?: number;
  frequency?: number;
};

export type DailyPoint = {
  day: string;
  spendMad: number;
  clicks: number;
  /** Réservations créées ce jour-là — jamais présentées comme causées par la pub. */
  reservations?: number;
  revenueMad?: number;
};

export type MarketingOverview = {
  tenantId: string;
  from: string;
  to: string;
  attributionLevel: AttributionLevel;
  totals: {
    spendMad: number;
    clicks: number;
    impressions: number;
    reservations?: number;
    revenueMad?: number;
    directReservations?: number;
    otaReservations?: number;
  };
  daily: DailyPoint[];
  campaigns: CampaignRow[];
  byCountry?: Array<{
    country: string;
    spendMad: number;
    clicks: number;
    ctr?: number;
    reservations?: number;
    revenueMad?: number;
  }>;
};

/**
 * Comptes publicitaires suivis.
 *
 * `tenantId` est requis : la passerelle refuse un appel qui ne nomme aucun
 * client plutôt que de retomber sur l'ensemble d'entre eux.
 */
export async function fetchMarketingConnections(
  tenantId: string,
): Promise<MarketingConnection[]> {
  const res = await apiClient.get<{
    success: boolean;
    connections: MarketingConnection[];
  }>(`${BASE}/connections`, { params: { tenantId } });
  return res.data?.connections ?? [];
}

export async function fetchMarketingOverview(params: {
  tenantId: string;
  from: string;
  to: string;
}): Promise<MarketingOverview> {
  const res = await apiClient.get<{
    success: boolean;
    data: MarketingOverview;
  }>(`${BASE}/overview`, { params });
  return res.data.data;
}

/**
 * Contribution estimée d'une campagne — **pas une attribution**.
 *
 * Aucun identifiant ne relie un clic Meta à une réservation Booking, et 91 %
 * des réservations en viennent. Le chiffre est l'écart entre les réservations
 * observées pendant la diffusion et ce que le marché produisait avant, corrigé
 * de la saison. `confidence` dit ce qu'il vaut ; l'interface doit le montrer
 * plutôt que d'afficher un nombre net.
 */
export type CampaignScore = {
  campaignId: string;
  campaignName: string;
  country: string;
  from: string;
  to: string;
  days: number;

  spendMad: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;

  reservations: number;
  otaReservations: number;
  directReservations: number;
  revenueMad: number;
  averageBasketMad: number;

  expectedWithoutAds: number;
  /**
   * Écart brut en réservations. **Ne jamais l'afficher seul** : un nombre
   * négatif se lit comme « la publicité a détruit des réservations », ce qui
   * n'a pas de sens. Sert au calcul du coût par réservation ; pour
   * l'affichage, préférer `lift` et `liftPercent`.
   */
  attributed: number;
  attributedShare: number;
  /** Observé ÷ attendu : `2.6` = « 2,6 fois plus que d'habitude ». */
  lift?: number | null;
  /** Le même écart en pourcentage : `+155` ou `-79`. */
  liftPercent?: number | null;

  costPerReservationMad: number;
  /** `null` quand la contribution est nulle ou négative : diviser n'a pas de sens. */
  costPerAttributedMad: number | null;
  /** À comparer aux 15–18 % d'une commission OTA. */
  costShareOfRevenue: number | null;

  /**
   * Activité du site. Ne mesure pas les réservations — le site en produit deux
   * pour 54 186 visiteurs — mais la qualité du trafic acheté.
   */
  ga4: {
    sessions: number;
    engagedSessions: number;
    engagementPerSession: number;
    itemsViewed: number;
    addToCarts: number;
    purchases: number;
  } | null;

  verdict: "accelerate" | "keep" | "stop" | "inconclusive";
  confidence: "low" | "medium" | "high";
  reason: string;
};

export type CampaignScores = {
  listingId: string;
  from: string;
  to: string;
  baselineFrom: string;
  baselineTo: string;
  seasonalFactor: number;
  /** `false` quand le coefficient a été plafonné : les témoins manquaient de volume. */
  seasonalTrustworthy: boolean;
  controlMarkets: string[];
  ga4Error: string | null;
  campaigns: CampaignScore[];
  totals: {
    spendMad: number;
    reservations: number;
    expectedWithoutAds: number;
    attributed: number;
    revenueMad: number;
    attributedRevenueMad: number;
    /** Dépense ÷ CA total. Flatteur : inclut ce qui serait arrivé sans publicité. */
    grossCostShare: number;
    /** Dépense ÷ CA estimé de la contribution. C'est celui qui se compare à une OTA. */
    netCostShare: number | null;
  };
};

export async function fetchCampaignScores(params: {
  tenantId: string;
  listingId: string;
  from: string;
  to: string;
  ga4PropertyId?: string;
}): Promise<CampaignScores> {
  const res = await apiClient.get<{ success: boolean; data: CampaignScores }>(
    `${BASE}/campaign-scores`,
    { params },
  );
  return res.data.data;
}

// ════════════════════════════════════════════════════════════════════════════
// LECTURE DU TABLEAU DE BORD
// ────────────────────────────────────────────────────────────────────────────
// Ces appels lisent la base Sojori, jamais Meta ni Google Analytics : le
// calcul tourne une fois par nuit côté serveur. Interroger les régies à chaque
// affichage rendrait la page lente et consommerait des quotas dont le
// dépassement bloquerait le compte publicitaire du client.
// ════════════════════════════════════════════════════════════════════════════

/** Une campagne telle que le job nocturne l'a figée. */
export type ScoredCampaign = {
  day: string;
  campaignId: string;
  campaignName: string;
  country: string;
  windowFrom: string;
  windowTo: string;

  spendMad: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;

  reservations: number;
  otaReservations: number;
  directReservations: number;
  revenueMad: number;
  averageBasketMad: number;

  expectedWithoutAds: number;
  attributed: number;
  attributedShare: number;
  /** Observé ÷ attendu. Afficher celui-ci, pas `attributed` seul. */
  lift?: number | null;
  /** Même écart en % : `+155` ou `-79`. */
  liftPercent?: number | null;

  costPerReservationMad: number;
  costPerAttributedMad: number | null;
  costShareOfRevenue: number | null;

  /**
   * Comportement du marché visé sur le site, que la campagne porte ou non un
   * paramètre d'URL — ce qui couvre les campagnes invisibles autrement.
   */
  marketSessions?: number;
  marketSessionsBefore?: number;
  marketAverageSessionDuration?: number;
  /**
   * Ajouts au panier du marché. Signal d'intention le plus proche d'une
   * réservation : dates et villa choisies. Ces visiteurs n'achèteront pas ici
   * — le site enregistre trois achats pour quarante-deux mille visiteurs —
   * mais ils sont prêts à réserver.
   */
  marketAddToCarts?: number;
  /**
   * Paniers pour cent sessions. Un taux, pas un nombre : 76 paniers marocains
   * contre 12 britanniques ne disent rien tant qu'on ignore que le premier
   * marché a reçu deux fois plus de visiteurs.
   */
  marketAddToCartRate?: number;
  marketAddToCartsBefore?: number;
  marketAddToCartRateBefore?: number;

  ga4Sessions?: number;
  ga4EngagedSessions?: number;
  /**
   * Durée réelle d'une session, en secondes — pas le temps d'onglet actif.
   * Ce dernier ne démarre quasiment jamais dans le navigateur intégré de
   * Facebook et rendait une seconde là où la session en dure quatre-vingt-
   * quinze.
   */
  ga4AverageSessionDuration?: number;
  /** Part des sessions que Google classe comme réellement investies. */
  ga4EngagementRate?: number;
  ga4AddToCarts?: number;
  ga4Purchases?: number;

  verdict: "accelerate" | "keep" | "stop" | "inconclusive";
  confidence: "low" | "medium" | "high";
  reason: string;
  seasonalFactor: number;
  seasonalTrustworthy: boolean;
};

export type MarketingDashboard = {
  listingId: string;
  listingName: string | null;
  /** `null` tant que le job nocturne n'a pas tourné une première fois. */
  day: string | null;
  windowFrom: string | null;
  windowTo: string | null;
  /** `true` quand aucun instantané n'existe encore — à dire, pas à masquer. */
  pending: boolean;
  campaigns: ScoredCampaign[];
  totals: {
    campaigns: number;
    accelerate: number;
    stop: number;
    spendMad: number;
    reservations: number;
    attributed: number;
    attributedRevenueMad: number;
    /** Dépense ÷ CA estimé de la contribution. À comparer aux 15–18 % d'une OTA. */
    netCostShare: number | null;
  } | null;
};

export async function fetchMarketingDashboard(params: {
  tenantId: string;
  listingId: string;
  day?: string;
}): Promise<MarketingDashboard> {
  const res = await apiClient.get<{
    success: boolean;
    data: MarketingDashboard;
  }>(`${BASE}/dashboard`, { params });
  return res.data.data;
}

export async function fetchCampaignHistory(params: {
  tenantId: string;
  listingId: string;
  campaignId: string;
  limit?: number;
}): Promise<ScoredCampaign[]> {
  const res = await apiClient.get<{
    success: boolean;
    history: ScoredCampaign[];
  }>(`${BASE}/campaign-history`, { params });
  return res.data?.history ?? [];
}

export type TrackedListing = {
  tenantId: string;
  listingId: string;
  listingName?: string;
  ga4PropertyId?: string;
  baselineFrom?: string;
  baselineTo?: string;
  active: boolean;
};

export async function fetchTrackedListings(
  tenantId: string,
): Promise<TrackedListing[]> {
  const res = await apiClient.get<{
    success: boolean;
    listings: TrackedListing[];
  }>(`${BASE}/listings`, { params: { tenantId } });
  return res.data?.listings ?? [];
}

/**
 * Détail d'une campagne au jour le jour.
 *
 * La diffusion se lit quotidiennement — Meta facture par jour. La
 * contribution, non : sur cet établissement un marché produit entre zéro et
 * quatre réservations par jour, et l'écart face à une ligne de base n'y
 * signifie rien. Elle reste celle de la fenêtre, rendue à part.
 */
export type CampaignDay = {
  day: string;
  spendMad: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  /** Activité du marché visé sur le site — `null` sans propriété Analytics. */
  sessions: number | null;
  averageSessionDuration: number | null;
  /** Réservations du marché ce jour-là, toutes origines. */
  reservations: number;
  otaReservations: number;
  revenueMad: number;
};

export type CampaignDays = {
  listingId: string;
  campaignId: string;
  campaignName: string;
  country: string | null;
  /**
   * Ce que ce marché réserve par jour **hors publicité**, mesuré sur la
   * période de référence de l'établissement. Sans cette normale, quatre
   * réservations un mardi ne veulent rien dire.
   */
  dailyNormal: number | null;
  days: CampaignDay[];
  window: {
    day: string;
    from: string;
    to: string;
    reservations: number;
    otaReservations: number;
    expectedWithoutAds: number;
    attributed: number;
    costPerAttributedMad: number | null;
    costShareOfRevenue: number | null;
    verdict: ScoredCampaign["verdict"];
    confidence: ScoredCampaign["confidence"];
  } | null;
};

export async function fetchCampaignDays(params: {
  tenantId: string;
  listingId: string;
  campaignId: string;
  from?: string;
  to?: string;
}): Promise<CampaignDays> {
  const res = await apiClient.get<{ success: boolean; data: CampaignDays }>(
    `${BASE}/campaign-days`,
    { params },
  );
  return res.data.data;
}
