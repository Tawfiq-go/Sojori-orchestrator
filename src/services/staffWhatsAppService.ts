import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../config/backendServer.config';

const THREADS_ENDPOINT = `${MICROSERVICE_BASE_URL.SRV_TASK}/staff-whatsapp/get`;
const UPDATE_MSG_ENDPOINT = (idOrWamid: string) =>
  `${MICROSERVICE_BASE_URL.SRV_TASK}/staff-whatsapp/update-message/${idOrWamid}`;
const SEND_MSG_ENDPOINT = `${MICROSERVICE_BASE_URL.SRV_TASK}/staff-whatsapp/send-message`;

const TASKS_BY_STAFF_ENDPOINT = (staffId: string) =>
  `${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/get-tasks-by-staff?staffIds=${staffId}`;

interface GetThreadsParams {
  page?: number;
  limit?: number;
  paged?: boolean;
  messagesLimit?: number;
  sortBy?: string;
  search_text?: string;
}

interface SendMessageParams {
  to: string;
  text: string;
  workerWaName?: string;
}

export async function getStaffWaThreads(params: GetThreadsParams = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  );
  const { data } = await axios.get(THREADS_ENDPOINT, { params: clean });
  const rows = data?.data || data || [];
  return { total: data?.total ?? rows.length, rows };
}

export async function updateStaffWaMessage(idOrWamid: string, payload: any) {
  const { data } = await axios.put(UPDATE_MSG_ENDPOINT(idOrWamid), payload);
  return data?.data || data;
}

export async function sendStaffWaText({ to, text, workerWaName }: SendMessageParams) {
  return axios.put(SEND_MSG_ENDPOINT, { to, text, workerWaName });
}

export async function getTasksByStaff(staffId: string) {
  const { data } = await axios.get(TASKS_BY_STAFF_ENDPOINT(staffId));
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return data?.[staffId] || [];
}
