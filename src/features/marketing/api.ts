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
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import apiClient from '../../services/apiClient';

const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/marketing`;

/** Fiabilité du lien entre dépense publicitaire et réservation. */
export type AttributionLevel = 0 | 1 | 2 | 3;

export type MarketingConnection = {
  tenantId: string;
  provider: 'meta' | 'google';
  adAccountId: string;
  accountName?: string;
  currency?: string;
  status: 'pending' | 'active' | 'revoked' | 'expired';
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

export async function fetchMarketingConnections(): Promise<MarketingConnection[]> {
  const res = await apiClient.get<{ success: boolean; connections: MarketingConnection[] }>(
    `${BASE}/connections`,
  );
  return res.data?.connections ?? [];
}

export async function fetchMarketingOverview(params: {
  tenantId: string;
  from: string;
  to: string;
}): Promise<MarketingOverview> {
  const res = await apiClient.get<{ success: boolean; data: MarketingOverview }>(
    `${BASE}/overview`,
    { params },
  );
  return res.data.data;
}
