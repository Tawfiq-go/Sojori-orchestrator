/**
 * API Client for Orchestrator Configuration
 *
 * This is SEPARATE from serverApi.adminConfig.js
 * Used by /admin/orchestrator/config (new interface)
 * While /admin/setting/template continues to use the old APIs
 */

import apiClient from '../../../config/axios';
import { MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../../../constants/orchestrationAdmin';
function ownerIdMatches(oid, idStr) {
  if (oid == null || idStr == null) return false;
  const s = String(idStr).trim();
  if (typeof oid === 'object' && oid !== null && oid._id != null) return String(oid._id) === s;
  return String(oid) === s;
}
const deep = v => JSON.parse(JSON.stringify(v));

// ================== MAIL TEMPLATES (ORCHESTRATOR) ==================

export function getOrchestratorMailTemplates(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/message-templates${query ? `?${query}` : ''}`);
}
export function getOrchestratorMailTemplateById(id) {
  return apiClient.get(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/message-template/${id}`);
}
export function createOrchestratorMailTemplate(data) {
  return apiClient.post(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/message-template`, data);
}
export function updateOrchestratorMailTemplate(id, data) {
  return apiClient.put(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/message-template/${id}`, data);
}

/** Met à jour le nom affiché (description) du template – utilise PUT (route déjà déployée) */
export function updateMessageTemplateDescription(id, description) {
  return apiClient.put(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/message-template/${id}`, {
    description: description?.trim() ?? ''
  });
}
export function deleteOrchestratorMailTemplate(id) {
  return apiClient.delete(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/message-template/${id}`);
}
export async function previewMessageTemplate({
  templateId,
  mode = 'normal',
  city,
  reservation,
  aiPrompt
}) {
  const response = await apiClient.post(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/message-template/preview`, {
    templateId,
    mode,
    city,
    reservation,
    aiPrompt
  });
  return response.data;
}

// ================== TASK TEMPLATES (ORCHESTRATOR) ==================

export const getOrchestratorTaskTemplate = async ownerId => {
  try {
    const response = await apiClient.get(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/task-template/${ownerId}`);
    return response.data;
  } catch (error) {
    // 404 = pas encore de OwnerTaskTemplate en base (normal) — le PUT fait upsert à la première sauvegarde
    if (error?.response?.status === 404) {
      return {
        success: true,
        notFound: true,
        data: {
          ownerId: ownerId != null ? String(ownerId) : '',
          categories: []
        }
      };
    }
    throw error;
  }
};
export const updateOrchestratorTaskTemplate = async (ownerId, {
  categories,
  propagateToListings = false
}) => {
  try {
    const payload = {
      categories,
      propagateToListings
    };
    const response = await apiClient.put(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/task-template/${ownerId}`, payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ================== MIGRATION ENDPOINTS ==================

export const migrateMailTemplates = async () => {
  try {
    const response = await apiClient.post(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/migrate/mail-templates`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const migrateTaskTemplates = async () => {
  try {
    const response = await apiClient.post(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/migrate/task-templates`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ================== SYNC TEMPLATE NAMES ==================

export const syncTemplateNames = async () => {
  try {
    const response = await apiClient.post(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/sync-template-names`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ================== RESTORE CONFIG NAMES ==================

/** Restaure les noms de config (Message bienvenue, Rappel X jours, etc.) pour l'owner courant. Utilise PUT task-template avec restoreNames: true (route déjà déployée). */
export const restoreConfigNames = async (ownerId, dryRun = false) => {
  try {
    if (dryRun) {
      return {
        success: true,
        message: 'Dry run non disponible via PUT'
      };
    }
    const response = await apiClient.put(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/task-template/${ownerId}`, {
      restoreNames: true
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ================== CLEANUP ENDPOINTS ==================

export const cleanupDuplicateTemplates = async () => {
  try {
    const response = await apiClient.post(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/cleanup/duplicates`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Overwrite target owner with the admin default template using only routes that already exist on dev:
 * GET/PUT srv-admin (rules, descriptions, chatbot, concierge, support, OpenAI) + PUT orchestrator task-template.
 * Does not call POST /owner-config/apply-admin-template or POST .../clone-from-admin (optional server shortcuts).
 */
export const applyAdminDefaultTemplateToOwner = async targetOwnerId => {
  const tid = String(targetOwnerId ?? '').trim();
  if (!tid) {
    throw new Error('Owner is required');
  }
  const adminId = String(ORCHESTRATION_ADMIN_OWNER_ID || '').trim();
  if (!adminId) {
    throw new Error('Admin template owner id is not configured');
  }
  if (tid === adminId) {
    throw new Error('Cannot apply admin template onto the admin template owner');
  }
  const base = MICROSERVICE_BASE_URL.SRV_ADMIN;

  // 1) Rules + descriptions (same API as Settings → Rules / Descriptions)
  const rulesRes = await apiClient.get(`${base}/rules-and-info`, {
    params: {
      ownerId: adminId
    }
  });
  const rulesData = rulesRes.data?.data;
  if (!rulesRes.data?.success || !rulesData?.rulesAndInfo) {
    throw new Error(rulesRes.data?.message || 'Could not load admin template rules-and-info');
  }
  await apiClient.put(`${base}/rules-and-info`, {
    ownerId: tid,
    rulesAndInfo: deep(rulesData.rulesAndInfo),
    listingDescription: deep(rulesData.listingDescription || {
      interaction: '',
      houseRules: '',
      ownerListingStory: ''
    })
  });

  // 2) Chatbot menu
  const chatRes = await apiClient.get(`${base}/chatbot-settings`, {
    params: {
      ownerId: adminId
    }
  });
  const chatPayload = chatRes.data?.data;
  const menuOptions = chatPayload?.menuOptions;
  if (Array.isArray(menuOptions) && menuOptions.length > 0) {
    await apiClient.put(`${base}/chatbot-settings`, {
      ownerId: tid,
      menuOptions: deep(menuOptions)
    });
  }

  // 3) Concierge
  try {
    const concRes = await apiClient.get(`${base}/concierge-services`, {
      params: {
        ownerId: adminId
      }
    });
    const conc = concRes.data?.data;
    if (conc) {
      await apiClient.put(`${base}/concierge-services`, {
        ownerId: tid,
        transportServices: deep(conc.transportServices || []),
        groceryServices: deep(conc.groceryServices || []),
        customServices: deep(conc.customServices || [])
      });
    }
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
  }

  // 4) Support categories
  try {
    const supRes = await apiClient.get(`${base}/support-categories`, {
      params: {
        ownerId: adminId
      }
    });
    const sup = supRes.data?.data;
    if (sup && Array.isArray(sup.categories)) {
      await apiClient.put(`${base}/support-categories`, {
        ownerId: tid,
        categories: deep(sup.categories)
      });
    }
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
  }

  // 5) OpenAI configs (admin list may include all owners — filter by admin template ownerId)
  try {
    const oaRes = await apiClient.get(`${base}/open-ai-config`, {
      params: {
        page: 0,
        limit: 500,
        paged: false,
        search_text: ''
      }
    });
    const list = oaRes.data?.openAiConfigs || [];
    const adminCfgs = list.filter(c => ownerIdMatches(c.ownerId, adminId));
    const targetCfgs = list.filter(c => ownerIdMatches(c.ownerId, tid));
    for (const src of adminCfgs) {
      const body = {
        type: src.type,
        description_openai: src.description_openai ?? '',
        enable: false,
        configuration: Array.isArray(src.configuration) ? deep(src.configuration) : [],
        ownerId: tid
      };
      const existing = targetCfgs.find(t => t.type === src.type);
      if (existing?._id) {
        await apiClient.put(`${base}/open-ai-config/${existing._id}`, body);
      } else {
        await apiClient.post(`${base}/open-ai-config`, body);
      }
    }
  } catch (e) {
    if (e?.response?.status !== 404) {
      throw e;
    }
  }

  // 6) Orchestration categories (same API as orchestrator config UI)
  const ttRes = await apiClient.get(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/task-template/${encodeURIComponent(adminId)}`);
  const ttPayload = ttRes.data;
  const categories = ttPayload?.data?.categories ?? ttPayload?.categories;
  if (categories == null) {
    throw new Error('No orchestration template found for admin template owner');
  }
  const orch = await apiClient.put(`${MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR}/config/task-template/${encodeURIComponent(tid)}`, {
    categories: deep(categories),
    propagateToListings: false
  });
  return orch.data;
};
