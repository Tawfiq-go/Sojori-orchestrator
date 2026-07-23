import axios from 'axios';
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';
export function getcountries(page, limit, paged) {
  return axios.get(`${MICROSERVICE_BASE_URL.COUNTRY}?page=${page || 0}&limit=${limit || 10}&paged=false`);
}
export function createCountry(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.COUNTRY}`, data);
}
export function updateCountry(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.COUNTRY}/${id}`, data);
}
export function removeCountry(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.COUNTRY}/${id}`);
}
export function getCountry(id) {
  return axios.get(`${MICROSERVICE_BASE_URL.COUNTRY}/${id}`);
}
// ---------------------------cities ----------------------------
export function getcities(page, limit, paged = true, countryIds = [], search_text = '', allCities = false) {
  let url = `${MICROSERVICE_BASE_URL.CITY}?page=${page || 0}&limit=${limit || 20}&paged=${paged}&allCities=${allCities}`;
  if (countryIds && countryIds.length > 0) {
    countryIds.forEach(id => {
      url += `&country_ids[]=${id}`;
    });
  }
  if (search_text) {
    url += `&search_text=${encodeURIComponent(search_text)}`;
  }
  return axios.get(url);
}
export function createCity(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.CITY}`, data);
}
export function updateCity(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.CITY}/${id}`, data);
}
export function removeCity(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.CITY}/${id}`);
}
// ----------------------citiesMapping-----------------

export function getcitiesMappig() {
  return axios.get(`${MICROSERVICE_BASE_URL.CITIESMAPPING}/get-cities-mapping`);
}
export function updateCitiesMapping(data) {
  return axios.put(`${MICROSERVICE_BASE_URL.CITIESMAPPING}/update-cities-mapping`, data);
}
// ----------------------BlogMapping-----------------

export function getBlogsMappig() {
  return axios.get(`${MICROSERVICE_BASE_URL.CITIESMAPPING}/get-blog-mapping`);
}
export function updateBlogsMapping(data) {
  return axios.put(`${MICROSERVICE_BASE_URL.CITIESMAPPING}/update-blog-mapping`, data);
}

// ----------------------Blogs----------------

export function getblogs(page, limit, paged) {
  return axios.get(`${MICROSERVICE_BASE_URL.BLOGS}?page=${page || 0}&limit=${limit || 20}&paged=false`);
}
export function createblog(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.BLOGS}`, data);
}
export function updateblog(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.BLOGS}/${id}`, data);
}
export function removeblog(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.BLOGS}/${id}`);
}

// ----------------------Slides----------------

export function getSlides() {
  return axios.get(`${MICROSERVICE_BASE_URL.SLIDES}/slide-config`);
}
export function createSlide(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SLIDES}`, data);
}
export function updateSlide(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SLIDES}/${id}`, data);
}
export function deleteSlide(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/slide-show/${id}`);
}

// ----------------------OpenAi----------------

export function getOpenAiInit() {
  return axios.get(`${MICROSERVICE_BASE_URL.OPENAI}?page=${0}&limit=${50}&paged=false&search_text=${''}`);
}
export function createOpenAiInit(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.OPENAI}`, data);
}
export function removeOpenAiInit(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.OPENAI}/${id}`);
}
export function updateOpenAiInig(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.OPENAI}/${id}`, data);
}
// ----------------------OpenAi----------------

export function getOpenAiConfig(page, limit, search) {
  return axios.get(`${MICROSERVICE_BASE_URL.OPENAICONFIG}?page=${page || 0}&limit=${limit || 20}&paged=true&search_text=${search || ''}`);
}
export function createOpenAiConfig(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.OPENAICONFIG}`, data);
}
export function removeOpenAiConfig(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.OPENAICONFIG}/${id}`);
}
export function updateOpenAiConfig(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.OPENAICONFIG}/${id}`, data);
}
export function getOpenAiConfigById(id) {
  return axios.get(`${MICROSERVICE_BASE_URL.OPENAICONFIG}/${id}`);
}

// ----------------------Language----------------

export const getLanguages = async () => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.LANGUAGE}?page=0&limit=20&paged=false&search_text=`);
    return response.data;
  } catch (error) {
    throw new Error('Error fetching languages');
  }
};
export const createLanguage = async data => {
  try {
    const response = await axios.post(`${MICROSERVICE_BASE_URL.LANGUAGE}`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};
export const updateLanguage = async (id, data) => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.LANGUAGE}/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};
export const deleteLanguage = async id => {
  try {
    const response = await axios.delete(`${MICROSERVICE_BASE_URL.LANGUAGE}/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};
// ----------------------Tag----------------

export const getTags = async () => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.TAG}?page=0&limit=20&paged=false&search_text=`);
    return response.data;
  } catch (error) {
    throw new Error('Error fetching tags');
  }
};
export const createTag = async data => {
  try {
    const response = await axios.post(`${MICROSERVICE_BASE_URL.TAG}`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};
export const updateTag = async (id, data) => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.TAG}/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};
export const getChannels = async () => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.CHANNELMANAGER}?page=0&limit=20&paged=false&search_text=`);
    return response.data;
  } catch (error) {
    throw new Error('Error fetching channels');
  }
};
export const createChannel = async data => {
  try {
    const response = await axios.post(MICROSERVICE_BASE_URL.CHANNELMANAGER, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};
export const updateChannel = async (id, data) => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.CHANNELMANAGER}/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};
export const deleteChannel = async id => {
  try {
    const response = await axios.delete(`${MICROSERVICE_BASE_URL.CHANNELMANAGER}/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};

// ----------------------WebSiteBlock----------------

export const getWebSiteBlocks = async () => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/webSite-block`);
    return response.data;
  } catch (error) {
    throw new Error('Error fetching website blocks');
  }
};
export const createWebSiteBlock = async data => {
  try {
    const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/webSite-block`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};

// ----------------------Currency----------------
export function getCurrencies() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/currency?page=0&limit=20&paged=false&search_text=&forTranslate=false`);
}
export const createCurrency = async data => {
  try {
    const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/currency`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};
export const updateCurrency = async (id, data) => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/currency/${id}`, data);
    if (response && response.data) {
      return response.data;
    } else {
      throw new Error('Unexpected response structure from server');
    }
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('An error occurred while updating the currency');
    }
  }
};
export const deleteCurrency = async id => {
  try {
    const response = await axios.delete(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/currency/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message);
  }
};

// ----------------------Stories----------------

// export function getStories() {
//   return axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story?page=0&limit=20&paged=true`);
// }
export const getStories = async (page, limit, paged) => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story?page=${page}&limit=${limit}&paged=${paged}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export function createStory(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story`, data).then(response => response.data);
}
export function updateStory(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story/${id}`, data).then(response => response.data);
}
export function deleteStory(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story/${id}`);
}

// ----------------------Synchroniser----------------

export function getSyncListings() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/sync-listings`);
}
export function getSyncAmenities() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/amenities/sync-amenities`);
}
export function getSyncPropertyTypes() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/propertyTypes/sync-property-types`);
}
export function getSyncBedTypes() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/BedTypes/sync-bed-types`);
}
export function getSyncCalendar() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_CALENDAR}/calendar/sync-calendar`);
}
export function getSyncReservation() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/sync-reservations`);
}
export function getSyncMinutHomes() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/minut/fetch-and-save-minut-homes`);
}
// ----------------------ChatInbox----------------

export function getChatInbox(page, limit) {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/chat-inbox?page=${page}&limit=${limit}&paged=true`);
}

// ----------------------ExchangeRate----------------

export function getExchangeRates() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/exchange-rate`);
}
export function updateExchangeRate(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_LISTING}/exchange-rate/${id}`, data);
}

// ----------------------Stay More----------------
export const getStayMore = async () => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/stay-more`);
    return response.data;
  } catch (error) {
    throw new Error('Error fetching stay more');
  }
};
export const updateStayMore = async (id, data) => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_LISTING}/stay-more/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error('Error update stay more');
  }
};
// ----------------------WhatsAppConfig----------------

export function getWhatsappConfig() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/whatsapp-config`);
}
export function updateWhatsappConfig(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/whatsapp-config/${id}`, data);
}

// ----------------------useFulNumber----------------

export function getUsefulNumber() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/useful-number`);
}
export function updateUsefulNumber(data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/useful-number`, data);
}

// ----------------------Cancellation Policy----------------

export function getCancellationPolicy() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/cancellation-policy/get`);
}
export function updateCancellationPolicy(policyId, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/cancellation-policy/update`, data);
}

// ----------------------Template----------------

export function getMailTemplate() {
  // REVERTED: Using reservations service (original location)
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate`);
}
export function getReservation(limit = 1, page = 0) {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations?page=${page}&limit=${limit}`);
}
export function getMailTemplateById(id) {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate/${id}`);
}
export function createMailTemplate(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate`, data);
}
export function updateMailTemplate(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate/${id}`, data);
}
export function deleteMailTemplate(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate/${id}`);
}
export function getConfigReservation() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/config-reservation/get`);
}
export function updateConfigReservation(data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/config-reservation/update`, data);
}
export function translateText(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/ai/translate-txt`, data);
}

/** Batch translate FR → guest WhatsApp langs (Claude Haiku). */
export function translateGuestLangs(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/ai/translate-guest-langs`, data);
}
export function sendMailTemplate(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate/send-mail-template`, data);
}
export function initializeOwnerTemplates() {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate/initialize-owner`);
}
export function initializeSingleTemplate(messageName) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate/initialize-single`, {
    messageName
  });
}
export async function configureOrchestratorWithAI(answers, ownerId) {
  const url = `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/mailTemplate/configure-with-ai`;
  const payload = ownerId != null && String(ownerId).trim() !== '' ? {
    ...answers,
    ownerId: String(ownerId).trim()
  } : answers;
  try {
    const response = await axios.post(url, payload);
    return response;
  } catch (error) {
    throw error;
  }
}

//________________________________________referrals_________________________________

export const getReferrals = async () => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/referral-code/get?paged=true&page=0&limit=50`);
    return response.data.data || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching referrals');
  }
};
export const createReferral = async data => {
  try {
    const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_LISTING}/referral-code/add`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error creating referral');
  }
};

// ----------------------RoomComposite----------------

export function getRoomComposites() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/composition-rooms/get`);
}
export function updateRoomComposite(data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_LISTING}/composition-rooms/update`, data);
}
export function createRoomComposite() {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_LISTING}/composition-rooms/create`);
}

// ----------------------Listing Template----------------

export const getListingTemplate = async (token, ownerId) => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listing-template`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      ...(ownerId ? {
        params: {
          ownerId
        }
      } : {})
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching listing template');
  }
};
export const updateListingTemplate = async (data, token, ownerId) => {
  try {
    const payload = ownerId != null && String(ownerId).trim() !== '' ? {
      ...data,
      ownerId: String(ownerId).trim()
    } : data;
    const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listing-template`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error updating listing template');
  }
};
export const getFooterConfig = async token => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/footer-config`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching footer config');
  }
};
export const updateFooterConfig = async (data, token) => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/footer-config`, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error updating footer config');
  }
};
export const getStorySectionConfig = async token => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story-section-config`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching story section config');
  }
};
export const updateStorySectionConfig = async (token, data) => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story-section-config`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && {
          Authorization: `Bearer ${token}`
        })
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error updating story section config');
  }
};
export const createStorySectionListing = async (token, listingData) => {
  try {
    const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story-section-config/listing`, listingData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error creating story section listing');
  }
};
export const deleteStorySectionListing = async (token, listingId) => {
  try {
    const response = await axios.delete(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/story-section-config/listing/${listingId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error deleting story section listing');
  }
};

// ----------------------Chatbot Menu Templates----------------

const CHATBOT_SETTINGS_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/chatbot-settings`;
const buildAuthConfig = token => token ? {
  headers: {
    Authorization: `Bearer ${token}`
  }
} : {};
export const getOwnerChatbotSettings = async ({
  ownerId,
  token
} = {}) => {
  const response = await axios.get(CHATBOT_SETTINGS_URL, {
    ...(ownerId ? {
      params: {
        ownerId
      }
    } : {}),
    ...buildAuthConfig(token)
  });
  return response.data;
};
export const updateOwnerChatbotSettings = async ({
  ownerId,
  menuOptions,
  token
}) => {
  const payload = ownerId ? {
    ownerId,
    menuOptions
  } : {
    menuOptions
  };
  const response = await axios.put(CHATBOT_SETTINGS_URL, payload, buildAuthConfig(token));
  return response.data;
};
export const resetOwnerChatbotSettings = async ({
  ownerId,
  token
} = {}) => {
  const payload = ownerId ? {
    ownerId
  } : {};
  const response = await axios.post(`${CHATBOT_SETTINGS_URL}/reset-default`, payload, buildAuthConfig(token));
  return response.data;
};

/**
 * Propagate owner chatbot settings (template) to ALL listings of the owner.
 * POST srv-listing /listing-chatbot-config/sync-all
 */
export const propagateChatbotConfigToAllListings = async ({
  ownerId,
  token
} = {}) => {
  const payload = ownerId ? {
    ownerId
  } : {};
  const url = `${MICROSERVICE_BASE_URL.SRV_LISTING}/listing-chatbot-config/sync-all`;
  const response = await axios.post(url, payload, buildAuthConfig(token));
  return response.data;
};

// ----------------------Concierge Services----------------

const CONCIERGE_SERVICES_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/concierge-services`;
const SUPPORT_CATEGORIES_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/support-categories`;
export const getOwnerConciergeServices = async ({
  ownerId,
  cityId,
  token
} = {}) => {
  try {
    const params = {};
    if (ownerId) params.ownerId = ownerId;
    if (cityId) params.cityId = cityId;
    const response = await axios.get(CONCIERGE_SERVICES_URL, {
      ...(Object.keys(params).length > 0 ? {
        params
      } : {}),
      ...buildAuthConfig(token)
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const updateOwnerConciergeServices = async ({
  ownerId,
  transportServices,
  groceryServices,
  customServices,
  token
}) => {
  try {
    const payload = ownerId ? {
      ownerId,
      transportServices,
      groceryServices,
      customServices
    } : {
      transportServices,
      groceryServices,
      customServices
    };
    const response = await axios.put(CONCIERGE_SERVICES_URL, payload, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const resetOwnerConciergeServices = async ({
  ownerId,
  token
} = {}) => {
  try {
    const payload = ownerId ? {
      ownerId
    } : {};
    const response = await axios.post(`${CONCIERGE_SERVICES_URL}/reset-default`, payload, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ================== SUPPORT CATEGORIES ==================
export const getOwnerSupportCategories = async (token, ownerId) => {
  try {
    const config = {
      ...buildAuthConfig(token),
      ...(ownerId ? {
        params: {
          ownerId
        }
      } : {})
    };
    const response = await axios.get(SUPPORT_CATEGORIES_URL, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const updateOwnerSupportCategories = async (token, {
  categories
}, ownerId) => {
  try {
    const body = ownerId != null && String(ownerId).trim() !== '' ? {
      categories,
      ownerId: String(ownerId).trim()
    } : {
      categories
    };
    const response = await axios.put(SUPPORT_CATEGORIES_URL, body, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    if (error.response?.data?.errors) {}
    throw error;
  }
};
export const resetOwnerSupportCategories = async (token, ownerId) => {
  try {
    const body = ownerId != null && String(ownerId).trim() !== '' ? {
      ownerId: String(ownerId).trim()
    } : {};
    const response = await axios.post(`${SUPPORT_CATEGORIES_URL}/reset-default`, body, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ================== OWNER RULES AND INFO ==================
const OWNER_RULES_AND_INFO_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/rules-and-info`;
export const getOwnerRulesAndInfo = async (token, ownerId) => {
  try {
    const response = await axios.get(OWNER_RULES_AND_INFO_URL, {
      ...buildAuthConfig(token),
      ...(ownerId ? {
        params: {
          ownerId
        }
      } : {})
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update owner_rules_and_info (srv-admin DB). Pass any of:
 * - { rulesAndInfo: { Rules, InfoUtils } }
 * - { listingDescription: { interaction, houseRules, ownerListingStory } }
 * - both (single PUT merges on server)
 * Same host as getOwnerRulesAndInfo — avoids srv-listing proxy / ADMIN_API_URL drift.
 */
export const updateOwnerRulesAndInfo = async (token, payload, ownerId) => {
  try {
    const body = {
      ...payload
    };
    if (ownerId != null && String(ownerId).trim() !== '') {
      body.ownerId = String(ownerId).trim();
    }
    const response = await axios.put(OWNER_RULES_AND_INFO_URL, body, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ================== TASK TEMPLATES ==================
// REVERTED: Using admin service (original location)
const TASK_TEMPLATES_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/task-templates`;
export const getOwnerTaskTemplate = async token => {
  try {
    const response = await axios.get(TASK_TEMPLATES_URL, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const updateOwnerTaskTemplate = async (token, {
  categories,
  propagateToListings = false
}) => {
  try {
    const response = await axios.put(TASK_TEMPLATES_URL, {
      categories,
      propagateToListings
    }, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const resetOwnerTaskTemplate = async token => {
  try {
    const response = await axios.post(`${TASK_TEMPLATES_URL}/reset-default`, {}, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ========== SAVED TASK TEMPLATES ==========

const SAVED_TASK_TEMPLATES_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/saved-task-templates`;
export const getSavedTaskTemplates = async token => {
  try {
    const response = await axios.get(SAVED_TASK_TEMPLATES_URL, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const createSavedTaskTemplate = async (token, {
  name,
  description,
  categories
}) => {
  try {
    const response = await axios.post(SAVED_TASK_TEMPLATES_URL, {
      name,
      description,
      categories
    }, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const updateSavedTaskTemplate = async (token, templateId, {
  name,
  description,
  categories
}) => {
  try {
    const response = await axios.put(`${SAVED_TASK_TEMPLATES_URL}/${templateId}`, {
      name,
      description,
      categories
    }, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const deleteSavedTaskTemplate = async (token, templateId) => {
  try {
    const response = await axios.delete(`${SAVED_TASK_TEMPLATES_URL}/${templateId}`, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const applySavedTaskTemplate = async (token, templateId) => {
  try {
    const response = await axios.post(`${SAVED_TASK_TEMPLATES_URL}/${templateId}/apply`, {}, buildAuthConfig(token));
    return response.data;
  } catch (error) {
    throw error;
  }
};
