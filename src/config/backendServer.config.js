/** Shim legacy dashboard imports → microservice URLs orchestrator */
import { MICROSERVICE_BASE_URL as BASE, AUTH_CONFIG } from './authConfig';

export { AUTH_CONFIG };

export const API_BASE_URL = BASE.API_BASE_URL;

export const MICROSERVICE_BASE_URL = {
  ...BASE,
  LISTING: BASE.SRV_LISTING,
  COUNTRY: `${BASE.SRV_ADMIN}/country`,
  LANGUAGE: `${BASE.SRV_ADMIN}/language`,
};
