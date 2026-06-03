import axios from 'axios';
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';
import { getToken as getAuthToken } from '../../../utils/auth.utils';

const API_URL = `${MICROSERVICE_BASE_URL.SRV_FULLTASK}/staff-simplified`;

const axiosConfig = () => ({
  headers: {
    Authorization: `Bearer ${getAuthToken()}`,
  },
});

export const getStaffSimplified = async (params = {}) => {
  const response = await axios.get(API_URL, {
    params,
    ...axiosConfig(),
  });
  return response.data;
};

export const getStaffSimplifiedByCode = async (staffCode) => {
  const response = await axios.get(`${API_URL}/${staffCode}`, axiosConfig());
  return response.data.staff;
};

export const createStaffSimplified = async (data) => {
  const response = await axios.post(API_URL, data, axiosConfig());
  return response.data.staff;
};

export const updateStaffSimplified = async (staffCode, data) => {
  const response = await axios.put(`${API_URL}/${staffCode}`, data, axiosConfig());
  return response.data.staff;
};

export const deleteStaffSimplified = async (staffCode) => {
  const response = await axios.delete(`${API_URL}/${staffCode}`, axiosConfig());
  return response.data.staff;
};

export const getStaffTasksToday = async (staffCode) => {
  const response = await axios.get(`${API_URL}/${staffCode}/tasks/today`, axiosConfig());
  return response.data;
};

export const getStaffTasksWeek = async (staffCode) => {
  const response = await axios.get(`${API_URL}/${staffCode}/tasks/week`, axiosConfig());
  return response.data;
};

export const getStaffWorkload = async (staffCode) => {
  const response = await axios.get(`${API_URL}/${staffCode}/workload`, axiosConfig());
  return response.data.workload;
};

export const checkStaffAvailability = async (staffCode, date, startTime, endTime) => {
  const response = await axios.get(`${API_URL}/${staffCode}/availability`, {
    params: { date, startTime, endTime },
    ...axiosConfig(),
  });
  return response.data.data;
};

export const getStaffAssignments = async (staffCode, startDate, endDate) => {
  const response = await axios.get(`${API_URL}/${staffCode}/assignments`, {
    params: { startDate, endDate },
    ...axiosConfig(),
  });
  return response.data;
};

export const createStaffException = async (staffCode, exceptionData) => {
  const response = await axios.post(`${API_URL}/${staffCode}/exceptions`, exceptionData, axiosConfig());
  return response.data.data;
};

export const getStaffExceptions = async (staffCode, startDate, endDate) => {
  const response = await axios.get(`${API_URL}/${staffCode}/exceptions`, {
    params: { startDate, endDate },
    ...axiosConfig(),
  });
  return response.data;
};
