import axios from 'axios';
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';
import { logWorkerCreate, warnWorkerCreate } from '../../../utils/workerCreateDebug';

export function getListings(params = {}) {
  const {
    page = 0,
    limit = 20,
    name = '',
    city = '',
    cityId = [],
    country = '',
    sortingBy = '',
    staging = false,
    useActiveFilter = false,
    active = true,
    compact = false,
    filterOwnerId,
  } = params;
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    name,
    city,
    country,
    sortingBy,
    staging: String(staging),
  });
  if (useActiveFilter) {
    q.set('useActiveFilter', 'true');
    q.set('active', String(active));
  }
  if (compact) q.set('compact', 'true');
  const ownerFilterIds = Array.isArray(filterOwnerId)
    ? filterOwnerId
    : filterOwnerId
      ? [filterOwnerId]
      : [];
  ownerFilterIds.filter(Boolean).forEach((id) => q.append('filterOwnerId', String(id)));
  const cityIds = Array.isArray(cityId) ? cityId : cityId ? [cityId] : [];
  cityIds.filter(Boolean).forEach((id) => q.append('cityId', String(id)));
  const url = `${MICROSERVICE_BASE_URL.LISTING}/listings?${q}`;
  logWorkerCreate('api:get-listings', { url, cityIds, useActiveFilter, compact });
  return axios.get(url).then((res) => {
    logWorkerCreate('api:get-listings:ok', {
      status: res?.status,
      total: res?.data?.total,
      count: Array.isArray(res?.data?.data) ? res.data.data.length : 0,
    });
    return res;
  }).catch((error) => {
    if (error?.response?.status === 404) {
      warnWorkerCreate('api:get-listings:empty-404', { url, cityIds });
      return { data: { success: true, data: [], total: 0 } };
    }
    warnWorkerCreate('api:get-listings:fail', {
      url,
      status: error?.response?.status,
      message: error?.response?.data?.message || error?.message,
    });
    throw error;
  });
}

export function getCountries() {
  return axios.get(`${MICROSERVICE_BASE_URL.COUNTRY}?page=0&limit=200&paged=false&search_text=`);
}

export async function getListingById(listingId, staging = false) {
  const res = await axios.get(
    `${MICROSERVICE_BASE_URL.LISTING}/listings/by-id/${encodeURIComponent(String(listingId))}?staging=${staging}`,
  );
  const body = res.data ?? {};
  return body.listing ?? body.data ?? body;
}

/** Aligné backend : GET /listings/by-id/:id (pas /listings/:id). */
export async function getOneListing(listingId, staging = false) {
  return getListingById(listingId, staging);
}
