import axios from "axios";
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';

export const getNotificationPreferences = async () => {
  const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_TASK}/notification/notification-preferences`);
  return response.data;
};

export const updateNotificationPreferences = async (payload) => {
  const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/notification/notification-preferences`, payload);
  return response.data;
};
export const getNotification = async (page, limit, paged, bell) => {
  const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_TASK}/notification/get-all-notification?page=${page}&limit=${limit}&paged=${paged}&bell=${bell}`);
  return response.data;
};
export const markNotificationAsRead = async (body) => {
  const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/notification/mark-notification-as-read`, body);
  return response.data;
};
