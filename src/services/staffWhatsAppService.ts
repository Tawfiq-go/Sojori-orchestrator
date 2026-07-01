import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../config/backendServer.config';

/** Via srv-admin → srv-fulltask (ingress /api/v1/admin always routé ; /api/v1/fulltask/staff-whatsapp peut manquer). */
const STAFF_WA_BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/fulltask/staff-whatsapp`;
const THREADS_ENDPOINT = `${STAFF_WA_BASE}/get`;
const UPDATE_MSG_ENDPOINT = (idOrWamid: string) =>
  `${STAFF_WA_BASE}/update-message/${idOrWamid}`;
const SEND_MSG_ENDPOINT = `${STAFF_WA_BASE}/send-message`;

const TASKS_BY_STAFF_ENDPOINT = (staffId: string) =>
  `${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/get-tasks-by-staff?staffIds=${staffId}`;

interface GetThreadsParams {
  page?: number;
  limit?: number;
  paged?: boolean;
  messagesLimit?: number;
  sortBy?: string;
  search_text?: string;
  workerWaNumber?: string;
}

interface SendMessageParams {
  to: string;
  text: string;
  workerWaName?: string;
}

function normalizeStaffWaPhone(phone?: string): string {
  return String(phone || '').replace(/\D/g, '');
}

function parseStaffWaRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: unknown[] }).data;
  }
  return [];
}

export async function getStaffWaThreads(params: GetThreadsParams = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null),
  ) as Record<string, unknown>;
  if (typeof clean.workerWaNumber === 'string') {
    const digits = normalizeStaffWaPhone(clean.workerWaNumber);
    if (digits) clean.workerWaNumber = digits;
  }
  const { data } = await axios.get(THREADS_ENDPOINT, { params: clean });
  const rows = parseStaffWaRows(data);
  const total =
    data && typeof data === 'object' && !Array.isArray(data)
      ? Number((data as { total?: number }).total) || rows.length
      : rows.length;
  return { total, rows };
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
