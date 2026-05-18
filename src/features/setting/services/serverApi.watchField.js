import axios from "axios";
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';

export const fetchWatchList = async () => {
  const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_TASK}/field-watch-config/get`);
  return response.data;
};

export const updateWatchList = async (payload) => {
  const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/field-watch-config/update`, payload);
  return response.data;
};

