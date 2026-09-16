// ════════════════════════════════════════════════════════════════════════════
// Sales B2B — client API de la politique commerciale
// ────────────────────────────────────────────────────────────────────────────
// Le contrat est le miroir de `srv-reservations/routes/internal/b2bPolicy.ts`.
// Si le backend ne produit pas un champ, l'UI ne l'affiche pas.
//
// `ownerId` est requis sur chaque appel : le proxy srv-admin refuse une requête
// qui ne nomme aucun établissement plutôt que de retomber sur « tous les
// clients ». Voir l'en-tête de `srv-admin/routes/b2bPolicy/index.ts` pour ce
// que cela garantit — et ce que cela ne garantit pas.
// ════════════════════════════════════════════════════════════════════════════
import { MICROSERVICE_BASE_URL } from "../../config/authConfig";
import apiClient from "../../services/apiClient";
import type { B2bPolicy } from "./policy";

/**
 * Message lisible par un PM plutôt que « Request failed with status code 404 ».
 * Une erreur technique brute à l'écran n'aide personne à savoir quoi faire.
 */
function readable(error: unknown, fallback: string): Error {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const serverMessage = (
    error as { response?: { data?: { error?: string } } }
  )?.response?.data?.error;
  if (serverMessage) return new Error(serverMessage);
  if (status === 404)
    // Volontairement neutre : ce helper sert la politique, la file et la
    // messagerie. Nommer l'une des trois induit en erreur sur les deux autres.
    return new Error(
      "Service indisponible : le module B2B n'est pas encore déployé sur cet environnement.",
    );
  if (status === 401 || status === 403)
    return new Error("Accès refusé à la politique de cet établissement.");
  return new Error(fallback);
}

const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/b2b`;

/**
 * La file d'actions vit dans srv-agents, pas dans srv-reservations.
 *
 * Rédiger un message et choisir un canal sont des gestes d'agent commercial.
 * srv-reservations détecte l'échéance — il tient les calendriers et les
 * paiements — puis dépose l'action ici. Deux passerelles donc, une par service.
 */
const AGENTS_BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/marketing/commercial`;

/** Ce que renvoie le serveur : la politique, plus deux méta-données. */
export interface StoredB2bPolicy extends B2bPolicy {
  ownerId: string;
  /** `false` = le PM n'a jamais enregistré : ce sont les valeurs par défaut. */
  isConfigured: boolean;
  updatedAt: string | null;
}

export async function fetchB2bPolicy(ownerId: string): Promise<StoredB2bPolicy> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: StoredB2bPolicy }>(
      `${BASE}/policy`,
      { params: { ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement de la politique impossible.");
  }
}

export async function saveB2bPolicy(
  ownerId: string,
  policy: B2bPolicy,
): Promise<StoredB2bPolicy> {
  try {
    const { data } = await apiClient.put<{ success: boolean; data: StoredB2bPolicy }>(
      `${BASE}/policy`,
      { ...policy, ownerId },
      { params: { ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Enregistrement de la politique impossible.");
  }
}

/* ────────────────────────── File de sortie ────────────────────────── */

/**
 * Un message à relancer.
 *
 * ⚠️ `pending` signifie « il faudrait relancer », JAMAIS « le client a été
 * relancé ». Aucun envoi automatique n'existe : c'est le PM qui envoie depuis
 * sa boîte, puis marque la ligne traitée.
 */
export interface OutboxMessage {
  id: string;
  kind: "payment_reminder" | "quote_expiring";
  status: "pending" | "sent" | "sent_manually" | "dismissed" | "failed";
  /** Contexte lisible : « Séminaire Axa — mars 2027 ». */
  label: string | null;
  recipientEmail: string | null;
  subject: string;
  body: string;
  reason: string;
  amountMad: number;
  dueAt: string | null;
  sentAt: string | null;
  /** Renseigné quand un envoi a été tenté et a échoué. */
  lastError: string | null;
  attempts: number;
  createdAt: string;
}

export async function fetchB2bOutbox(
  ownerId: string,
  status: "open" | "all" = "open",
): Promise<OutboxMessage[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: OutboxMessage[] }>(
      `${AGENTS_BASE}/outbox`,
      { params: { ownerId, tenantId: ownerId, status } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement de la file impossible.");
  }
}

/** `sent_manually` = le PM a envoyé lui-même. `dismissed` = relance inutile. */
export async function handleOutboxMessage(
  ownerId: string,
  id: string,
  status: "sent_manually" | "dismissed",
): Promise<void> {
  try {
    await apiClient.post(
      `${AGENTS_BASE}/outbox/${id}/handle`,
      { status, ownerId },
      { params: { ownerId, tenantId: ownerId } },
    );
  } catch (error) {
    throw readable(error, "Mise à jour du message impossible.");
  }
}

/* ────────────────────────── Inbox commerciale ────────────────────────── */

const INBOX_BASE = `${AGENTS_BASE}/inbox`;

/** Un fil de discussion avec un interlocuteur. */
export interface InboxThread {
  id: string;
  channel: "email" | "whatsapp";
  contactAddress: string;
  contactName: string | null;
  subject: string | null;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  lastPreview: string | null;
  unreadCount: number;
}

export interface InboxMessage {
  id: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  subject: string | null;
  body: string;
  sentAt: string;
  /** Renseigné quand l'envoi a échoué — la ligne reste visible malgré tout. */
  error: string | null;
}

export interface InboxThreadDetail {
  id: string;
  channel: "email" | "whatsapp";
  contactAddress: string;
  contactName: string | null;
  subject: string | null;
  messages: InboxMessage[];
}

export interface ThreadQuery {
  q?: string;
  /** `1` = seulement les fils avec des messages non lus. */
  unread?: "1";
  page?: number;
  limit?: number;
}

export async function fetchInboxThreads(
  ownerId: string,
  query: ThreadQuery = {},
): Promise<Paged<InboxThread>> {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      data: InboxThread[];
      total: number;
    }>(`${INBOX_BASE}/threads`, {
      params: { ownerId, tenantId: ownerId, ...query },
    });
    return { rows: data.data, total: data.total ?? data.data.length };
  } catch (error) {
    throw readable(error, "Chargement de la messagerie impossible.");
  }
}

export async function fetchInboxThread(
  ownerId: string,
  threadId: string,
): Promise<InboxThreadDetail> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: InboxThreadDetail }>(
      `${INBOX_BASE}/threads/${threadId}`,
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Ouverture du fil impossible.");
  }
}

/**
 * Envoie une réponse.
 *
 * ⚠️ Ce message part VRAIMENT au client depuis b2b@sojori.com. C'est le seul
 * geste de cet écran dont l'effet sort de Sojori et ne se rattrape pas.
 */
export async function replyToInboxThread(
  ownerId: string,
  threadId: string,
  body: string,
): Promise<void> {
  try {
    await apiClient.post(
      `${INBOX_BASE}/threads/${threadId}/reply`,
      { body, ownerId },
      { params: { ownerId, tenantId: ownerId } },
    );
  } catch (error) {
    throw readable(error, "Envoi de la réponse impossible.");
  }
}

/** Relève la boîte maintenant, sans attendre le passage automatique. */
export async function collectInbox(ownerId: string): Promise<{ imported: number; unresolved: number }> {
  try {
    const { data } = await apiClient.post<{
      success: boolean;
      data: { imported: number; unresolved: number };
    }>(`${INBOX_BASE}/collect`, { ownerId }, { params: { ownerId, tenantId: ownerId } });
    return data.data;
  } catch (error) {
    throw readable(error, "Relève de la boîte impossible.");
  }
}

/* ──────────────────────────── Pipeline ──────────────────────────── */

const PIPELINE_BASE = `${AGENTS_BASE}/pipeline`;

export type OpportunityStage =
  | "to_contact"
  | "contacted"
  | "discussing"
  | "quote_sent"
  | "deposit_paid"
  | "won"
  | "lost";

export interface Prospect {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  segment: string | null;
  notes: string | null;
  status: "new" | "contacted" | "replied" | "discarded";
  companyId: string | null;
  lastContactedAt: string | null;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  label: string;
  stage: OpportunityStage;
  /** `false` = étape dérivée du devis réel, non déplaçable à la main. */
  stageIsManual: boolean;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  estimatedValueMad: number | null;
  expectedArrival: string | null;
  expectedGuests: number | null;
  nextActionAt: string | null;
  nextAction: string | null;
  lostReason: string | null;
  reservationGroupId: string | null;
  updatedAt: string;
}

export interface ProspectQuery {
  /** Recherche : nom, contact, email, ville, segment. */
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/** Une page de résultats, avec le total pour savoir ce qui n'est pas montré. */
export interface Paged<T> {
  rows: T[];
  total: number;
}

export async function fetchProspects(
  ownerId: string,
  query: ProspectQuery = {},
): Promise<Paged<Prospect>> {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      data: Prospect[];
      total: number;
    }>(`${PIPELINE_BASE}/prospects`, {
      params: { ownerId, tenantId: ownerId, ...query },
    });
    return { rows: data.data, total: data.total ?? data.data.length };
  } catch (error) {
    throw readable(error, "Chargement des prospects impossible.");
  }
}

export async function createProspect(
  ownerId: string,
  prospect: Partial<Prospect> & { companyName: string },
): Promise<{ id: string }> {
  try {
    const { data } = await apiClient.post<{ success: boolean; data: { id: string } }>(
      `${PIPELINE_BASE}/prospects`,
      { ...prospect, ownerId },
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Création du prospect impossible.");
  }
}

export async function fetchOpportunities(ownerId: string): Promise<Opportunity[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: Opportunity[] }>(
      `${PIPELINE_BASE}/opportunities`,
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement du pipeline impossible.");
  }
}

export async function createOpportunity(
  ownerId: string,
  payload: { label: string; prospectId?: string; estimatedValueMad?: number },
): Promise<{ id: string }> {
  try {
    const { data } = await apiClient.post<{ success: boolean; data: { id: string } }>(
      `${PIPELINE_BASE}/opportunities`,
      { ...payload, ownerId },
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Création de l'affaire impossible.");
  }
}

/**
 * Déplace une affaire.
 *
 * ⚠️ Le serveur refuse les étapes dérivées du devis réel (`quote_sent`,
 * `deposit_paid`, `won`) : elles reflètent un acompte encaissé, pas une
 * intention. L'écran ne doit pas les proposer.
 */
export async function moveOpportunity(
  ownerId: string,
  id: string,
  stage: OpportunityStage,
  lostReason?: string,
): Promise<void> {
  try {
    await apiClient.post(
      `${PIPELINE_BASE}/opportunities/${id}/stage`,
      { stage, lostReason, ownerId },
      { params: { ownerId, tenantId: ownerId } },
    );
  } catch (error) {
    throw readable(error, "Déplacement impossible.");
  }
}

/* ─────────────────── File « à rattacher » — admin seul ─────────────────── */

/**
 * Un fil qu'aucun signal n'a permis de rattacher à un établissement.
 *
 * ⚠️ Ces messages n'apparaissent chez AUCUN property manager. Sans cet écran,
 * un email de prospect dort sans que personne ne le sache.
 */
export interface UnassignedThread {
  id: string;
  channel: "email" | "whatsapp";
  contactAddress: string;
  contactName: string | null;
  subject: string | null;
  lastPreview: string | null;
  lastInboundAt: string | null;
  /** Pourquoi la cascade n'a pas tranché — aide à décider. */
  matchReason: string | null;
}

export async function fetchUnassignedThreads(
  ownerId: string,
): Promise<UnassignedThread[]> {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      data: UnassignedThread[];
    }>(`${INBOX_BASE}/unassigned`, { params: { ownerId, tenantId: ownerId } });
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement des messages non rattachés impossible.");
  }
}

export async function assignThread(
  ownerId: string,
  threadId: string,
  tenantId: string,
): Promise<void> {
  try {
    await apiClient.post(
      `${INBOX_BASE}/unassigned/${threadId}/assign`,
      { tenantId, ownerId },
      { params: { ownerId, tenantId: ownerId } },
    );
  } catch (error) {
    throw readable(error, "Rattachement impossible.");
  }
}

/* ──────────────────────────── Indicateurs ──────────────────────────── */

export interface B2bKpis {
  /** Affaires ni gagnées ni perdues — celles qui demandent encore du travail. */
  openOpportunities: number;
  /** Somme des montants espérés. ⚠️ Une estimation saisie, pas un engagement. */
  pipelineValueMad: number;
  /** Combien portent réellement un montant — dit ce que vaut le total. */
  opportunitiesWithValue: number;
}

export async function fetchB2bKpis(ownerId: string): Promise<B2bKpis> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: B2bKpis }>(
      `${PIPELINE_BASE}/kpis`,
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement des indicateurs impossible.");
  }
}

/* ─────────────────── Modèles de devis et de contrat ─────────────────── */

const DOCS_BASE = `${AGENTS_BASE}/documents`;

export type BlockType =
  | "text"
  | "line_items"
  | "totals"
  | "installments"
  | "commission"
  | "signatures";

export interface TemplateBlock {
  type: BlockType;
  title: string | null;
  body: string | null;
  /**
   * Le bloc figure-t-il dans la version destinée au CLIENT FINAL ?
   *
   * ⚠️ C'est ce drapeau qui évite de montrer au client la marge de son agence.
   */
  visibleForClient: boolean;
}

export interface TemplateSignatory {
  side: string;
  name: string | null;
  role: string | null;
}

export interface DocumentTemplate {
  id: string;
  kind: "quote" | "contract";
  name: string;
  blocks: TemplateBlock[];
  signatories: TemplateSignatory[];
  isDefault: boolean;
  updatedAt: string;
}

export interface VariableDefinition {
  key: string;
  label: string;
  sample: string;
}

export interface VariableFamily {
  family: string;
  variables: VariableDefinition[];
}

export async function fetchVariableCatalog(
  ownerId: string,
): Promise<VariableFamily[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: VariableFamily[] }>(
      `${DOCS_BASE}/variables`,
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement des variables impossible.");
  }
}

export async function fetchTemplates(ownerId: string): Promise<DocumentTemplate[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: DocumentTemplate[] }>(
      `${DOCS_BASE}/templates`,
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement des modèles impossible.");
  }
}

/** Renvoie les variables mal orthographiées — non bloquantes, mais à savoir. */
export async function saveTemplate(
  ownerId: string,
  template: Partial<DocumentTemplate> & { name: string; kind: "quote" | "contract" },
): Promise<{ id: string; unknownVariables: string[] }> {
  try {
    const { data } = await apiClient.put<{
      success: boolean;
      data: { id: string; unknownVariables: string[] };
    }>(`${DOCS_BASE}/templates/${template.id ?? ""}`, template, {
      params: { ownerId, tenantId: ownerId },
    });
    return data.data;
  } catch (error) {
    throw readable(error, "Enregistrement du modèle impossible.");
  }
}

export async function deleteTemplate(ownerId: string, id: string): Promise<void> {
  try {
    await apiClient.delete(`${DOCS_BASE}/templates/${id}`, {
      params: { ownerId, tenantId: ownerId },
    });
  } catch (error) {
    throw readable(error, "Suppression impossible.");
  }
}

export interface RenderedBlock {
  type: BlockType;
  title: string | null;
  body: string | null;
}

export interface TemplatePreview {
  name: string;
  kind: "quote" | "contract";
  /** Ce que reçoit le partenaire — tous les blocs. */
  partner: RenderedBlock[];
  /** Ce que reçoit le client final — sans les blocs masqués. */
  client: RenderedBlock[];
  hiddenForClient: number;
}

export async function previewTemplate(
  ownerId: string,
  id: string,
): Promise<TemplatePreview> {
  try {
    const { data } = await apiClient.post<{ success: boolean; data: TemplatePreview }>(
      `${DOCS_BASE}/templates/${id}/preview`,
      {},
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Aperçu impossible.");
  }
}
