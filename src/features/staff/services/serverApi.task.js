import axios from 'axios';
import { AUTH_CONFIG } from 'config/auth.config';
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';

const TEAM_API = MICROSERVICE_BASE_URL.SRV_FULLTASK;

/** Sans intercepteurs : login + register avec le JWT du compte élevé uniquement (ne touche pas à la session courante). */
const ownerCreateAuthClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
});
export function CreateStaff(data) {
  return axios.post(`${TEAM_API}/staff-simplified`, data);
}
// export function deleteStaff(clerkId) {
//     return axios.delete(`${MICROSERVICE_BASE_URL.SRV_TASK}/user/delete-user/${clerkId}`);
// }

export function updateStaff(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/staff/update-staff/${id}`, data);
}
export function deleteStaff(staffCode) {
  // Use staff-simplified endpoint with staffCode
  return axios.delete(`${TEAM_API}/staff-simplified/${staffCode}`);
}
export function getCurrencies() {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/currency?page=0&limit=20&paged=false&search_text=&forTranslate=false`);
}
export function getStaff(params = {}) {
  const {
    page = 0,
    limit = 25,
    search_text = '',
    types,
    languages,
    listings
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    search_text
  });
  if (types && Array.isArray(types) && types.length > 0) {
    types.forEach(type => queryParams.append('types[]', type));
  }
  if (languages && Array.isArray(languages) && languages.length > 0) {
    languages.forEach(langName => queryParams.append('languages[]', langName));
  }
  if (listings && Array.isArray(listings) && listings.length > 0) {
    listings.forEach(listing => queryParams.append('listings[]', listing));
  }
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_TASK}/staff/approved-staff?${queryParams.toString()}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
/** Normalise la réponse langues admin (tableau plat attendu par les filtres legacy). */
export function normalizeLanguageList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.languages)) return payload.languages;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
}

export function getLanguage() {
  return axios
    .get(`${MICROSERVICE_BASE_URL.LANGUAGE}?page=0&limit=20&paged=false&search_text=`)
    .then((response) => ({
      ...response,
      data: normalizeLanguageList(response.data),
    }));
}

//----------------------------------Admin--------------------------------------------

export function getAdmins(params = {}) {
  const {
    page = 0,
    limit = 25,
    username = '',
    deleted = false,
    banned = false
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    username,
    deleted,
    banned
  }).toString();
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/admin/get-admins?${queryParams}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function getClientWhiteList(params = {}) {
  const {
    page = 0,
    limit = 25,
    phone = '',
    searchTerm = '',
    reservations,
    communication,
    status,
    reservationStatus,
    listing = '',
    listings = [],
    languages = [],
    ownerId = '',
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true
  });

  // Use searchTerm (multi-criteria) if provided, otherwise fallback to phone (legacy)
  if (searchTerm) {
    queryParams.append('searchTerm', searchTerm);
  } else if (phone) {
    queryParams.append('phone', phone);
  }
  if (reservations !== undefined && reservations !== '') {
    queryParams.append('reservations', reservations);
  }
  if (communication !== undefined && communication !== '') {
    queryParams.append('communication', communication);
  }
  if (status !== undefined && status !== '') {
    queryParams.append('status', status);
  }
  if (reservationStatus !== undefined && reservationStatus !== '') {
    queryParams.append('reservationStatus', reservationStatus);
  }

  // Support both single listing (legacy) and multiple listings (new)
  if (listings && Array.isArray(listings) && listings.length > 0) {
    listings.forEach(listingName => queryParams.append('listings[]', listingName));
  } else if (listing) {
    queryParams.append('listing', listing);
  }

  // Support multiple languages
  if (languages && Array.isArray(languages) && languages.length > 0) {
    languages.forEach(lang => queryParams.append('languages[]', lang));
  }
  if (ownerId) {
    queryParams.append('ownerId', String(ownerId));
  }
  const fullUrl = `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/client/get-client-white-list?${queryParams}`;
  return axios.get(fullUrl).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function blocClientWhiteList(id = {}) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/client/block-phone/${id}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function updateClientWhiteList(id, body) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/client/update-phone/${id}`, body).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function deleteClientWhiteList(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/client/delete-phone/${id}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function getClient(params = {}) {
  const {
    page = 0,
    limit = 25,
    username = '',
    deleted = false,
    banned = false
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    username,
    deleted,
    banned
  }).toString();
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/client/get-clients?${queryParams}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}

//----------------------------------Reservation--------------------------------------------

export function getReservation(params = {}) {
  const {
    page = 0,
    limit = 10,
    reservationNumber = '',
    staging = false,
    reservationId = []
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    reservationNumber,
    staging
  });
  reservationId.forEach(id => {
    queryParams.append('reservationId[]', id);
  });
  return axios.get(`${MICROSERVICE_BASE_URL.RESERVATION}?${queryParams.toString()}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function getCheckinStatus(reservationNumber) {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/api/v1/whitelist/checkin-status/${reservationNumber}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}

// -------------------------- strat admin Whatsapp
export function getAdminWhatsapp(params = {}) {
  const {
    page = 0,
    limit = 25,
    search_text = '',
    types,
    languages,
    listings,
    access,
    owner_id: ownerIdParam
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    search_text
  });
  if (ownerIdParam) {
    queryParams.set('owner_id', String(ownerIdParam));
  }
  if (types && Array.isArray(types) && types.length > 0) {
    types.forEach(type => queryParams.append('types[]', type));
  }
  if (languages && Array.isArray(languages) && languages.length > 0) {
    languages.forEach(langName => queryParams.append('languages[]', langName));
  }
  if (listings && Array.isArray(listings) && listings.length > 0) {
    listings.forEach(listing => queryParams.append('listings[]', listing));
  }
  if (access && Array.isArray(access) && access.length > 0) {
    access.forEach(accessType => queryParams.append('access[]', accessType));
  }
  return axios.get(`${TEAM_API}/admin-whatsapp/get?${queryParams.toString()}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function CreateAdminWhatsapp(data) {
  return axios.post(`${TEAM_API}/admin-whatsapp/create`, data);
}
export function updateAdminWhatsapp(id, data) {
  return axios.put(`${TEAM_API}/admin-whatsapp/update/${id}`, data);
}
/** Récupère un admin WhatsApp par id (pour afficher les permissions à jour dans le modal). */
export function getAdminWhatsappById(id) {
  return axios.get(`${TEAM_API}/admin-whatsapp/get`, {
    params: {
      id,
      paged: true,
      page: 0,
      limit: 1
    }
  }).then(res => res.data?.data?.[0] ?? null);
}
export function deleteAdminWhatsapp(id) {
  return axios.delete(`${TEAM_API}/admin-whatsapp/delete/${id}`);
}
// -------------------------- end admin Whatsapp
// -------------------------- start staff Planning
export function getStaffPlannig(params = {}) {
  const {
    page = 0,
    limit = 25,
    search_text = '',
    search = '',
    types,
    languages,
    listings,
    ownerId,
    cityIds
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    search: search || search_text
  });
  if (ownerId) queryParams.set('ownerId', ownerId);
  if (types && Array.isArray(types) && types.length > 0) {
    types.forEach(type => queryParams.append('types', type));
  }
  if (languages && Array.isArray(languages) && languages.length > 0) {
    languages.forEach(lang => queryParams.append('languages', lang));
  }
  if (listings && Array.isArray(listings) && listings.length > 0) {
    listings.forEach(lid => queryParams.append('listings', lid));
  }
  if (cityIds && Array.isArray(cityIds) && cityIds.length > 0) {
    cityIds.forEach(cid => queryParams.append('cityIds', cid));
  }
  return axios.get(`${TEAM_API}/staff-simplified?${queryParams.toString()}`);
}
export function updateStaffPlannig(payload) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/staff/update-staff-planning`, payload);
}
// -------------------------- end staff Planning

// -------------------------- owner

export function getOwners(params = {}) {
  const {
    page = 0,
    limit = 20,
    deleted = false,
    banned = false,
    search_text = '',
    listings
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    roles: 'Owner',
    deleted,
    banned,
    search_text
  });
  if (listings && Array.isArray(listings) && listings.length > 0) {
    listings.forEach(listing => queryParams.append('listings[]', listing));
  }
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/get-account?${queryParams.toString()}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}

/**
 * Fetches all Owner-role accounts (paginated) so admin owner filters are not limited to a single page (e.g. 20/500).
 * @param {object} [params] - passed to getOwners (e.g. search_text, listings)
 * @returns {Promise<Array>} owner rows
 */
export async function getOwnersAllPages(params = {}) {
  const pageSize = 200;
  const maxPages = 500;
  const { search_text = '', listings, ...rest } = params;
  const acc = [];
  for (let page = 0; page < maxPages; page += 1) {
    let res;
    try {
      res = await getOwners({
        page,
        limit: pageSize,
        paged: true,
        deleted: false,
        banned: false,
        search_text,
        listings,
        ...rest
      });
    } catch {
      if (page === 0) return [];
      break;
    }
    const batch = Array.isArray(res?.data) ? res.data : [];
    acc.push(...batch);
    const total = typeof res?.total === 'number' ? res.total : null;
    if (batch.length < pageSize) break;
    if (total != null && acc.length >= total) break;
  }
  return acc;
}

/**
 * Login Super admin / Admin via client sans intercepteur → JWT pour une requête ciblée.
 * @param {{ email: string, password: string }} elevatedAuth
 * @param {{ missingMessage?: string, forbiddenMessage?: string }} messages
 * @returns {Promise<string>} access token
 */
async function loginElevatedAdminTokenOrThrow(elevatedAuth, messages = {}) {
  const email = elevatedAuth?.email?.trim();
  const password = elevatedAuth?.password;
  if (!email || password == null || String(password).length === 0) {
    const err = new Error('Elevated credentials required');
    err.response = {
      data: {
        message:
          messages.missingMessage ||
          'Super admin / Admin email and password are required to authorize this action.',
      },
    };
    throw err;
  }
  let loginRes;
  try {
    loginRes = await ownerCreateAuthClient.post(`${AUTH_CONFIG.API_URL}/login`, { email, password });
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Login failed';
    const wrapped = new Error(msg);
    wrapped.response = err.response;
    throw wrapped;
  }
  const token = loginRes.data?.token;
  const role = loginRes.data?.user?.role;
  if (!token) {
    const e = new Error('No token after login.');
    e.response = { data: { message: 'No token after login.' } };
    throw e;
  }
  if (role !== 'SuperAdmin' && role !== 'Admin') {
    const msg =
      messages.forbiddenMessage ||
      'Only Super admin or Admin accounts can authorize this action.';
    const e = new Error(msg);
    e.response = { data: { message: msg } };
    throw e;
  }
  return token
}

/**
 * Crée un propriétaire (POST /auth/register).
 * @param {object} data — champs du nouvel owner (firstName, email, password du **nouveau** compte, etc.)
 * @param {{ email: string, password: string }} elevatedAuth — identifiants **Super admin ou Admin** Sojori (connexion séparée pour obtenir le JWT d’autorisation)
 */
export async function createOwner(data) {
  const { role: _r, ...ownerFields } = data
  return axios.post(
    `${MICROSERVICE_BASE_URL.SRV_USER}/auth/register`,
    { ...ownerFields, role: 'Owner' },
  )
}

/**
 * Met à jour un propriétaire (PUT /auth/update-account/:id).
 * @param {string} id
 * @param {object} data — corps JSON
 * @param {{ email: string, password: string } | null | undefined} elevatedAuth — si fourni (email + mot de passe), login séparé puis PUT avec ce JWT (ex. canal RU sans id RU lié).
 */
export async function updateOwner(id, data, elevatedAuth) {
  const email = elevatedAuth?.email?.trim()
  const password = elevatedAuth?.password
  const useElevated = !!(email && password != null && String(password).length > 0)
  if (useElevated) {
    const token = await loginElevatedAdminTokenOrThrow(
      { email, password },
      {
        missingMessage: 'Super admin / Admin email and password are required for this update.',
        forbiddenMessage: 'Only Super admin or Admin accounts can authorize this owner update.',
      },
    )
    return ownerCreateAuthClient.put(
      `${MICROSERVICE_BASE_URL.SRV_USER}/auth/update-account/${encodeURIComponent(String(id))}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } },
    )
  }
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_USER}/auth/update-account/${id}`, data)
}

/** Admin : email + mot de passe R.U. (extranet Rentals United), distinct du mot de passe Sojori. */
export function getOwnerRuLoginCredentials(ownerId) {
  return axios
    .get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/owner/${encodeURIComponent(String(ownerId))}/ru-login-credentials`)
    .then((r) => r.data)
    .catch((e) => {
      const msg = e?.response?.data?.error || e?.message || 'Request failed';
      throw new Error(msg);
    });
}
export function deleteOwner(id) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_USER}/user/update-owner-status/${id}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}

export async function syncOwnersRuIds() {
  console.log('[FRONTEND] syncOwnersRuIds - START - New workflow: channels→user');

  try {
    // 1. Appeler srv-channels pour Pull_ListMyUsers_RQ (save dans ChannelRuApiCall)
    console.log('[FRONTEND] Step 1: Fetching RU owners from srv-channels...');
    const { fetchChannelsRuUserOwners } = await import('../../../services/channelsDashboardApi');
    const channelsRes = await fetchChannelsRuUserOwners();
    console.log('[FRONTEND] Step 1: RU owners response:', channelsRes.data);

    if (!channelsRes.data?.success) {
      throw new Error(channelsRes.data?.message || 'Failed to fetch RU owners from channels');
    }

    const ruOwners = channelsRes.data.data?.ruOwners || [];
    console.log('[FRONTEND] Step 1: RU owners count:', ruOwners.length);

    // 2. Appeler srv-user pour récupérer les owners MongoDB
    console.log('[FRONTEND] Step 2: Fetching Sojori owners from srv-user...');
    const userRes = await axios.get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/get-sojori-owners`);
    console.log('[FRONTEND] Step 2: Sojori owners response:', userRes.data);

    if (!userRes.data?.success) {
      throw new Error(userRes.data?.message || 'Failed to fetch Sojori owners from user');
    }

    const sojoriOwners = userRes.data.data?.sojoriOwners || [];
    console.log('[FRONTEND] Step 2: Sojori owners count:', sojoriOwners.length);

    // 3. Créer map des emails Sojori pour recherche inverse
    const sojoriEmailMap = new Map();
    for (const owner of sojoriOwners) {
      const email = (owner.email || '').toLowerCase().trim();
      if (email) sojoriEmailMap.set(email, owner);
    }

    // 4. Comparer et créer le tableau COMPLET avec TOUS les owners (RU + Sojori)
    console.log('[FRONTEND] Step 3: Comparing RU owners vs Sojori owners...');
    const allOwners = [];
    const processedEmails = new Set();

    // A) Owners Sojori (verts, oranges)
    for (const sojoriOwner of sojoriOwners) {
      const email = (sojoriOwner.email || '').toLowerCase().trim();
      if (!email) continue;
      processedEmails.add(email);

      const ruMatch = ruOwners.find(ru => ru.Email === email);
      const hasRuOwnerId = !!sojoriOwner.ruOwnerId;
      const foundInRu = !!ruMatch;
      const isDeleted = sojoriOwner.isDeleted === true;

      let status, action;
      if (hasRuOwnerId && foundInRu && !isDeleted) {
        status = 'synced'; // 🟢 Vert: synced et actif
        action = null;
      } else if (hasRuOwnerId && foundInRu && isDeleted) {
        status = 'deleted_in_sojori_still_in_ru'; // 🟣 Violet: archivé Sojori mais encore dans RU
        action = 'delete'; // ✅ Permettre archivage RU
      } else if (!hasRuOwnerId && foundInRu) {
        status = 'needs_add'; // 🟠 Orange: ajouter ruOwnerId dans MongoDB
        action = 'add';
      } else {
        status = 'not_in_ru'; // ⚪ Gris: pas dans RU (pas d'action possible)
        action = null;
      }

      allOwners.push({
        accountId: sojoriOwner.accountId,
        email: sojoriOwner.email,
        firstName: sojoriOwner.firstName,
        lastName: sojoriOwner.lastName,
        currentRuOwnerId: sojoriOwner.ruOwnerId,
        matchedRuOwnerId: ruMatch?.OwnerID || null,
        status,
        action,
        isDeleted,
      });
    }

    // B) Owners RU uniquement (rouges - à supprimer)
    for (const ruOwner of ruOwners) {
      const email = ruOwner.Email.toLowerCase().trim();
      if (processedEmails.has(email)) continue; // Déjà traité

      // Existe dans RU mais PAS dans notre MongoDB → à supprimer de RU
      allOwners.push({
        accountId: null,
        email: ruOwner.Email,
        firstName: ruOwner.FirstName,
        lastName: ruOwner.LastName,
        currentRuOwnerId: null,
        matchedRuOwnerId: ruOwner.OwnerID,
        status: 'only_in_ru', // 🔴 Rouge: supprimer de RU
        action: 'delete',
      });
    }

    const ownersToAdd = allOwners.filter(o => o.action === 'add').length;
    const ownersToDelete = allOwners.filter(o => o.action === 'delete').length;

    console.log('[FRONTEND] Step 3: Comparison done:', {
      totalRuOwners: ruOwners.length,
      totalSojoriOwners: sojoriOwners.length,
      allOwners: allOwners.length,
      ownersToAdd,
      ownersToDelete,
    });

    // 5. Retourner format compatible avec UI
    return {
      success: true,
      data: {
        totalRuOwners: ruOwners.length,
        totalSojoriOwners: sojoriOwners.length,
        allOwners,
        ownersToAdd,
        ownersToDelete,
      },
    };
  } catch (e) {
    console.error('[FRONTEND] syncOwnersRuIds - Error:', e);
    const msg = e?.response?.data?.message || e?.message || 'Request failed';
    throw new Error(msg);
  }
}

export function applyOwnersRuIdsSync(ownerIds) {
  return axios
    .post(`${MICROSERVICE_BASE_URL.SRV_USER}/user/apply-owners-ru-ids-sync`, { ownerIds })
    .then((r) => r.data)
    .catch((e) => {
      const msg = e?.response?.data?.message || e?.message || 'Request failed';
      throw new Error(msg);
    });
}

// -------------------------- adminV2
export function getAdminsV2(params = {}) {
  const {
    page = 0,
    limit = 20,
    deleted = false,
    banned = false,
    search_text = ''
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    roles: 'Admin',
    deleted,
    banned,
    search_text
  }).toString();
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/get-account?${queryParams}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function createAdminV2(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_USER}/auth/register`, {
    ...data,
    role: 'Admin'
  });
}
export function updateAdminV2(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_USER}/auth/update-account/${id}`, data);
}

// -------------------------- worker
export function getWorkers(params = {}) {
  const {
    page = 0,
    limit = 20,
    deleted = false,
    banned = false,
    search_text = '',
    listings,
    workerTypeOwner = false,
    ownerId
  } = params;
  const queryParams = new URLSearchParams({
    page,
    limit,
    paged: true,
    roles: 'Worker',
    deleted,
    banned,
    search_text,
    workerTypeOwner
  });
  if (ownerId) {
    queryParams.append('ownerId', ownerId);
  }
  if (listings && Array.isArray(listings) && listings.length > 0) {
    listings.forEach(listing => queryParams.append('listings[]', listing));
  }
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/get-account?${queryParams.toString()}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function inviteWorker(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_USER}/auth/invite-woker`, data);
}
export function updateWorker(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_USER}/auth/update-account/${id}`, data);
}
/** Réponse GET `/city` : tableau direct (paged=false) ou `{ cities, total }` (paged=true). */
export function normalizeCitiesApiResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.cities)) return data.cities;
  return [];
}

export function getCities(params = {}) {
  const {
    page = 0,
    limit = 200,
    paged = false,
    search_text = '',
    allCities = false,
  } = params;
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    paged: String(paged),
    search_text: search_text ?? '',
  });
  if (allCities) queryParams.set('allCities', 'true');
  return axios
    .get(`${MICROSERVICE_BASE_URL.CITY}?${queryParams.toString()}`)
    .then((response) => {
      if (response.data == null) return [];
      return normalizeCitiesApiResponse(response.data);
    })
    .catch((error) => {
      if (error?.response?.status === 404) return [];
      throw error;
    });
}
export function updateFillCompany(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_USER}/user/update-fill-company/${id}`, data).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function getAccounById(id) {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/get-account-by-id/${id}`);
}
export function getNotificationEvent() {
  return axios.get(`${TEAM_API}/notification/notification-events`);
}
export function getGroups(ownerId) {
  const qs = ownerId != null && ownerId !== '' ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_USER}/group/list-groups${qs}`);
}
export function createGroup(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_USER}/group/group-created`, data);
}
export function updateGroup(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_USER}/group/group-update/${id}`, data);
}
export function deleteGroup(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.SRV_USER}/group/group-delete/${id}`);
}
