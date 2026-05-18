import axios from "axios";
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';

export const fetchCompanyProfile = async () => {
  const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/fill-company/`);
  return response.data;
};

export const updateCompanyProfile = async (ownerId, payload) => {
  const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_USER}/user/update-fill-company-local/${ownerId}`, payload);
  return response.data;
}; 


export const syncCompanyProfile = async (ownerId) => {
  const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_USER}/user/sync-fill-company/${ownerId}`);
  return response.data;
}