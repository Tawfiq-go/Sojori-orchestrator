import axios from 'axios';
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';

export function getListings(params = {}) {
  const {
    page = 0,
    limit = 20,
    name = '',
    city = '',
    country = '',
    sortingBy = '',
    staging = false,
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
  return axios.get(`${MICROSERVICE_BASE_URL.LISTING}/listings?${q}`);
}

export async function getOneListing(listingId, staging = false) {
  const res = await axios.get(
    `${MICROSERVICE_BASE_URL.LISTING}/listings/${encodeURIComponent(String(listingId))}?staging=${staging}`,
  );
  return res.data?.data ?? res.data;
}
