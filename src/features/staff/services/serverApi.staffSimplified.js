import axios from 'axios';
import { API_BASE_URL } from 'config/backendServer.config';
import { getToken as getAuthToken } from '../../../utils/auth.utils';
const API_URL = `${API_BASE_URL}/api/v1/task/staff-simplified`;

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

// ============================================
// AVAILABILITY & ASSIGNMENTS
// ============================================

/**
 * Check if a staff member is available for a specific time slot
 * @param {string} staffCode - Staff identifier
 * @param {string} date - ISO date format (YYYY-MM-DD)
 * @param {string} startTime - Time in HH:mm format
 * @param {string} endTime - Time in HH:mm format
 * @returns {Promise<{available: boolean, reason?: string, workingHours?: Array, remainingCapacity?: number}>}
 */
export const checkStaffAvailability = async (staffCode, date, startTime, endTime) => {
  const response = await axios.get(`${API_URL}/${staffCode}/availability`, {
    params: { date, startTime, endTime },
    ...axiosConfig(),
  });
  return response.data.data;
};

/**
 * Get all assignments (workload) for a staff member within a date range
 * @param {string} staffCode - Staff identifier
 * @param {string} startDate - ISO date format (YYYY-MM-DD)
 * @param {string} endDate - ISO date format (YYYY-MM-DD)
 * @returns {Promise<{data: Array, stats: {totalTasks: number, tasksByDay: Object}}>}
 */
export const getStaffAssignments = async (staffCode, startDate, endDate) => {
  const response = await axios.get(`${API_URL}/${staffCode}/assignments`, {
    params: { startDate, endDate },
    ...axiosConfig(),
  });
  return response.data;
};

// ============================================
// EXCEPTIONS (Congés, absences, etc.)
// ============================================

/**
 * Create an availability exception (vacation, sick leave, custom hours, etc.)
 * @param {string} staffCode - Staff identifier
 * @param {Object} exceptionData - Exception details
 * @param {string} exceptionData.startDate - ISO date format
 * @param {string} exceptionData.endDate - ISO date format
 * @param {string} exceptionData.type - 'vacation' | 'sick_leave' | 'special_leave' | 'custom_hours' | 'public_holiday'
 * @param {boolean} exceptionData.isAvailable - Default: false
 * @param {Object} exceptionData.customSchedule - Optional for custom_hours type
 * @param {string} exceptionData.reason - Optional reason/note
 * @returns {Promise<Object>} Created exception
 */
export const createStaffException = async (staffCode, exceptionData) => {
  const response = await axios.post(
    `${API_URL}/${staffCode}/exceptions`,
    exceptionData,
    axiosConfig()
  );
  return response.data.data;
};

/**
 * Get all exceptions for a staff member within a date range
 * @param {string} staffCode - Staff identifier
 * @param {string} startDate - ISO date format (YYYY-MM-DD), optional
 * @param {string} endDate - ISO date format (YYYY-MM-DD), optional
 * @returns {Promise<{data: Array, count: number}>}
 */
export const getStaffExceptions = async (staffCode, startDate, endDate) => {
  const response = await axios.get(`${API_URL}/${staffCode}/exceptions`, {
    params: { startDate, endDate },
    ...axiosConfig(),
  });
  return response.data;
};
