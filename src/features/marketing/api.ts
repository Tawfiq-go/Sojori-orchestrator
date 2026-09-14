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

export async function fetchMarketingConnections(): Promise<
  MarketingConnection[]
> {
  const res = await apiClient.get<{
    success: boolean;
    connections: MarketingConnection[];
  }>(`${BASE}/connections`);
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
  attributed: number;
  attributedShare: number;

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
