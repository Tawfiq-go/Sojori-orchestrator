/**
 * crmService.ts
 * Service pour les fonctionnalités CRM dans Sojori Orchestrator
 * Endpoints: https://dev.sojori.com/api/v1/crm/* et /api/v1/demo/*
 *
 * Backend: sojori-production/apps/srv-crm
 * Legacy ref: sojori-dashboard/src/features/{demo,lead,support-team}
 */

import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

const CRM_BASE = MICROSERVICE_BASE_URL.SRV_CRM;
const DEMO_BASE = MICROSERVICE_BASE_URL.SRV_CRM_DEMO;

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

export interface DemoRequest {
  id: string;
  _id?: string; // Keep for backward compatibility
  source: string;
  email: string;
  phone?: string;
  countryCode?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  numberOfProperties?: string | number;
  timeline?: string;
  currentPMS?: string;
  currentChannelManager?: string;
  currentDynamicPricing?: string;
  currentWhatsApp?: string;
  requestType?: string;
  status: 'pending' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  qualificationCompleted?: boolean;
  roleType?: string;
  propertyTypes?: string[];
  newPropertiesNext12Months?: number;
  biggestChallenges?: string;
  expectations?: string;
  hearAboutUs?: string;
  promoCode?: string;
  ipAddress?: string;
  userAgent?: string;
  calendarVisitedAt?: string;
  linkedDemoAppointment?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DemoRequestsResponse {
  success: boolean;
  data: DemoRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Lead {
  _id: string;
  email: string;
  phone?: string;
  fullName?: string;
  company?: string;
  source?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeadDetail {
  _id: string;
  leadId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  companyName?: string;
  roleInCompany?: string;
  numberOfProperties?: number;
  currentPMS?: string;
  currentChannelManager?: string;
  timeline?: string;
  notes?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupportAgent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  _id: string;
  agentId: string;
  demoRequestId?: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ════════════════════════════════════════════════════════════════════
// DEMO REQUESTS (Public funnel + Dashboard)
// ════════════════════════════════════════════════════════════════════

/**
 * Récupère la liste des demandes de démo avec filtres
 * GET /api/v1/demo/requests
 */
export async function getDemoRequests(params?: {
  page?: number;
  limit?: number;
  status?: string;
  qualificationCompleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<DemoRequestsResponse> {
  const { data } = await apiClient.get(`${DEMO_BASE}/requests`, { params });
  return data;
}

/**
 * Met à jour le statut d'une demande de démo
 * PATCH /api/v1/demo/request/:id/qualify
 */
export async function updateDemoRequestStatus(
  id: string,
  status: DemoRequest['status'],
): Promise<{ success: boolean; data: DemoRequest }> {
  const { data } = await apiClient.patch(`${DEMO_BASE}/request/${id}/qualify`, { status });
  return data;
}

/**
 * Met à jour les données de qualification d'une demande
 * PATCH /api/v1/demo/request/:id/qualify
 */
export async function updateDemoRequestQualification(
  id: string,
  qualificationData: Partial<DemoRequest>,
): Promise<{ success: boolean; data: DemoRequest }> {
  const { data } = await apiClient.patch(`${DEMO_BASE}/request/${id}/qualify`, qualificationData);
  return data;
}

/**
 * Supprime une demande de démo et tous ses RDV liés
 * DELETE /api/v1/demo/request/:id
 */
export async function deleteDemoRequest(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${DEMO_BASE}/request/${id}`);
  return data;
}

// ════════════════════════════════════════════════════════════════════
// LEADS (CRM Dashboard)
// ════════════════════════════════════════════════════════════════════

/**
 * Récupère la liste des leads
 * GET /api/v1/crm/lead/get
 */
export async function getLeads(queryString?: string): Promise<{ success: boolean; data: Lead[] }> {
  const url = `${CRM_BASE}/lead/get${queryString ? `?${queryString}` : ''}`;
  const { data } = await apiClient.get(url);
  return data;
}

/**
 * Crée un nouveau lead
 * POST /api/v1/crm/lead/create
 */
export async function createLead(leadData: Partial<Lead>): Promise<{ success: boolean; data: Lead }> {
  const { data } = await apiClient.post(`${CRM_BASE}/lead/create`, leadData);
  return data;
}

/**
 * Met à jour un lead
 * PUT /api/v1/crm/lead/update/:id
 */
export async function updateLead(id: string, leadData: Partial<Lead>): Promise<{ success: boolean; data: Lead }> {
  const { data } = await apiClient.put(`${CRM_BASE}/lead/update/${id}`, leadData);
  return data;
}

/**
 * Supprime un lead
 * DELETE /api/v1/crm/lead/delete/:id
 */
export async function deleteLead(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${CRM_BASE}/lead/delete/${id}`);
  return data;
}

// ════════════════════════════════════════════════════════════════════
// LEAD DETAILS (Fiches détaillées)
// ════════════════════════════════════════════════════════════════════

/**
 * Récupère la liste des fiches détails
 * GET /api/v1/crm/lead_details/get
 */
export async function getLeadDetails(queryString?: string): Promise<{ success: boolean; data: LeadDetail[] }> {
  const url = `${CRM_BASE}/lead_details/get${queryString ? `?${queryString}` : ''}`;
  const { data } = await apiClient.get(url);
  return data;
}

/**
 * Récupère les options de filtrage pour les leads avec détails
 * GET /api/v1/crm/lead_details/filter-options
 */
export async function getLeadDetailFilterOptions(): Promise<{ success: boolean; data: Lead[] }> {
  const { data } = await apiClient.get(`${CRM_BASE}/lead_details/filter-options`);
  return data;
}

/**
 * Crée une nouvelle fiche détail
 * POST /api/v1/crm/lead_details/create
 */
export async function createLeadDetail(
  detailData: Partial<LeadDetail>,
): Promise<{ success: boolean; data: LeadDetail }> {
  const { data } = await apiClient.post(`${CRM_BASE}/lead_details/create`, detailData);
  return data;
}

/**
 * Met à jour une fiche détail
 * PUT /api/v1/crm/lead_details/update/:id
 */
export async function updateLeadDetail(
  id: string,
  detailData: Partial<LeadDetail>,
): Promise<{ success: boolean; data: LeadDetail }> {
  const { data } = await apiClient.put(`${CRM_BASE}/lead_details/update/${id}`, detailData);
  return data;
}

/**
 * Supprime une fiche détail
 * DELETE /api/v1/crm/lead_details/delete/:id
 */
export async function deleteLeadDetail(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${CRM_BASE}/lead_details/delete/${id}`);
  return data;
}

// ════════════════════════════════════════════════════════════════════
// SUPPORT TEAM (Agents & Appointments)
// ════════════════════════════════════════════════════════════════════

/**
 * Récupère la liste des agents support
 * GET /api/v1/crm/support-agents
 */
export async function getSupportAgents(): Promise<{ success: boolean; data: SupportAgent[] }> {
  const { data } = await apiClient.get(`${CRM_BASE}/support-agents`);
  return data;
}

/**
 * Crée un nouvel agent support
 * POST /api/v1/crm/support-agents
 */
export async function createSupportAgent(
  agentData: Partial<SupportAgent>,
): Promise<{ success: boolean; data: SupportAgent }> {
  const { data } = await apiClient.post(`${CRM_BASE}/support-agents`, agentData);
  return data;
}

/**
 * Met à jour un agent support
 * PUT /api/v1/crm/support-agents/:id
 */
export async function updateSupportAgent(
  id: string,
  agentData: Partial<SupportAgent>,
): Promise<{ success: boolean; data: SupportAgent }> {
  const { data } = await apiClient.put(`${CRM_BASE}/support-agents/${id}`, agentData);
  return data;
}

/**
 * Supprime un agent support
 * DELETE /api/v1/crm/support-agents/:id
 */
export async function deleteSupportAgent(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${CRM_BASE}/support-agents/${id}`);
  return data;
}

/**
 * Récupère la liste des rendez-vous
 * GET /api/v1/crm/appointments
 */
export async function getAppointments(params?: {
  agentId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; data: Appointment[] }> {
  const { data } = await apiClient.get(`${CRM_BASE}/appointments`, { params });
  return data;
}

/**
 * Supprime un rendez-vous (libère les créneaux)
 * DELETE /api/v1/crm/appointments/:id
 */
export async function deleteAppointment(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${CRM_BASE}/appointments/${id}`);
  return data;
}

/**
 * Récupère la disponibilité des agents pour une semaine
 * GET /api/v1/crm/availability/week
 */
export async function getWeekAvailability(params?: {
  agentId?: string;
  startDate?: string;
}): Promise<{ success: boolean; data: any }> {
  const { data } = await apiClient.get(`${CRM_BASE}/availability/week`, { params });
  return data;
}

/**
 * Met à jour la disponibilité d'un agent
 * POST /api/v1/crm/availability/update
 */
export async function updateAvailability(availabilityData: {
  agentId: string;
  date: string;
  timeSlots: Array<{ startTime: string; endTime: string; available: boolean }>;
}): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`${CRM_BASE}/availability/update`, availabilityData);
  return data;
}

// ════════════════════════════════════════════════════════════════════
// ONBOARDING
// ════════════════════════════════════════════════════════════════════

export interface OwnerOnboarding {
  _id: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  currentStep: string;
  completedSteps: string[];
  listings: Array<{
    ruPropertyId?: number;
    sojoriListingId?: string;
    listingName?: string;
    steps: Record<string, boolean>;
    metadata?: Record<string, unknown>;
  }>;
  assignedAgent?: string;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  leadId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStats {
  total: number;
  byStatus: Record<string, number>;
  recentEventsLast7d: Array<{ _id: string; count: number }>;
  steps: readonly string[];
}

/**
 * Récupère la liste de tous les onboardings (avec filtres)
 * GET /api/v1/crm/onboarding
 */
export async function getOnboardings(params?: {
  status?: string;
  ownerId?: string;
  assignedAgent?: string;
  _skip?: number;
  _limit?: number;
}): Promise<{ success: boolean; data: OwnerOnboarding[]; total: number }> {
  const { data } = await apiClient.get(`${CRM_BASE}/onboarding`, { params });
  return data;
}

/**
 * Récupère les statistiques d'onboarding (KPIs)
 * GET /api/v1/crm/onboarding/stats/summary
 */
export async function getOnboardingStats(): Promise<{ success: boolean; data: OnboardingStats }> {
  const { data } = await apiClient.get(`${CRM_BASE}/onboarding/stats/summary`);
  return data;
}

/**
 * Récupère un onboarding par son ID avec sa timeline
 * GET /api/v1/crm/onboarding/:id
 */
export async function getOnboardingById(id: string): Promise<{ success: boolean; data: OwnerOnboarding & { events: any[] } }> {
  const { data } = await apiClient.get(`${CRM_BASE}/onboarding/${id}`);
  return data;
}

/**
 * Récupère l'onboarding d'un owner par son ownerId
 * GET /api/v1/crm/onboarding/by-owner/:ownerId
 */
export async function getOnboardingByOwnerId(ownerId: string): Promise<{ success: boolean; data: OwnerOnboarding & { events: any[] } }> {
  const { data } = await apiClient.get(`${CRM_BASE}/onboarding/by-owner/${ownerId}`);
  return data;
}

/**
 * Récupère les événements d'onboarding pour un utilisateur/listing
 * GET /api/v1/crm/onboarding/events
 */
export async function getOnboardingEvents(params?: {
  userId?: string;
  listingId?: string;
  limit?: number;
}): Promise<{ success: boolean; data: any[] }> {
  const { data } = await apiClient.get(`${CRM_BASE}/onboarding/events`, { params });
  return data;
}
