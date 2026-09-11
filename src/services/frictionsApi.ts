/**
 * Monitor → Frictions — les moments où quelqu'un n'a PAS pu faire ce qu'il voulait.
 *
 * Ce n'est pas un monitoring technique de plus. Les 17 autres pages Monitor
 * répondent à « est-ce que le service tourne ? ». Celle-ci répond à « est-ce
 * que quelqu'un est resté bloqué ? » — un PM qui n'arrive pas à se connecter,
 * une femme de ménage dont les photos ne partent pas, un client qui ne peut
 * pas choisir son heure d'arrivée.
 *
 * Les logs disent « HTTP 500 » ; ils ne disent pas qui a renoncé. D'où le
 * classement par ACTEUR et par CAUSE plutôt que par service.
 *
 * L'API cloisonne par propriétaire à partir du token : un Owner ne voit que
 * ses propres frictions, sans que le front ait à le demander.
 */
import apiClient from './apiClient';

/** Issue d'une action. Un événement sans issue est un succès implicite. */
export type FrictionOutcome = 'failed' | 'abandoned' | 'success';

/**
 * Nature de la cause — c'est elle qui décide de la réponse.
 * infra  : vient de nous (token expiré, service indisponible) → alerter
 * config : vient d'un réglage (listing mal configuré)         → ticket
 * field  : vient du terrain (réseau faible, photo illisible)  → agréger
 * unknown: abandon silencieux, ni erreur ni cause identifiée  → enquêter
 */
export type FrictionCause = 'infra' | 'field' | 'config' | 'unknown';

export type FrictionActor =
  | 'client'
  | 'staff'
  | 'admin'
  | 'owner'
  | 'system'
  | 'orchestrator'
  | 'ota';

export interface FrictionEvent {
  _id: string;
  eventType: string;
  eventCategory: string;
  timestamp: string;
  actorType?: FrictionActor;
  actorId?: string;
  outcome?: FrictionOutcome;
  causeClass?: FrictionCause;
  cause?: string;
  reservationNumber?: string | null;
  listingId?: string | null;
  listingName?: string | null;
  ownerId?: string | null;
  payload?: Record<string, unknown>;
}

export interface FrictionsResponse {
  events: FrictionEvent[];
  byActor: { actorType: string; count: number }[];
  byCause: { causeClass: string; count: number }[];
  /**
   * État de la collecte. `active: false` signifie qu'aucun point d'émission
   * n'est branché : une liste vide veut alors dire « on ne mesure pas encore »,
   * et surtout pas « il n'y a pas de friction ». La page doit le dire
   * explicitement — un écran vert qui ne prouve rien serait pire que rien.
   */
  collection: {
    active: boolean;
    qualifiedEvents: number;
    note?: string;
  };
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

export interface FrictionsQuery {
  actorType?: string;
  causeClass?: string;
  outcome?: string;
  listingId?: string;
  eventCategory?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/** Libellés côté terrain : on nomme les gens, pas les enums. */
export const ACTOR_LABELS: Record<string, string> = {
  client: 'Voyageur',
  staff: 'Équipe terrain',
  owner: 'Propriétaire',
  admin: 'Admin',
  system: 'Système',
  orchestrator: 'Orchestrateur',
  ota: 'Plateforme (OTA)',
  unknown: 'Inconnu',
};

export const CAUSE_LABELS: Record<string, string> = {
  infra: 'Notre infrastructure',
  config: 'Un réglage',
  field: 'Le terrain',
  unknown: 'Non identifiée',
};

/** Ce qu'il faut faire de chaque classe — affiché tel quel dans l'interface. */
export const CAUSE_ACTIONS: Record<string, string> = {
  infra: 'Alerter — plusieurs personnes touchées en même temps',
  config: 'Ouvrir un ticket sur le listing concerné',
  field: 'Agréger — isolé tant que le volume reste bas',
  unknown: 'Enquêter — abandon sans erreur',
};

export const OUTCOME_LABELS: Record<string, string> = {
  failed: 'Échec',
  abandoned: 'Abandon',
  success: 'Succès',
};

export async function fetchFrictions(query: FrictionsQuery = {}): Promise<FrictionsResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '' && v !== null) params.append(k, String(v));
  }
  const qs = params.toString();
  const { data } = await apiClient.get<{ success: boolean; data: FrictionsResponse }>(
    `/api/events/frictions${qs ? `?${qs}` : ''}`,
  );
  return data.data;
}
