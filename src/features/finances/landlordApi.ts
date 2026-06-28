import { isAxiosError } from 'axios';
import apiClient from '../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import type { LandlordAccount, LandlordContract } from './types';
import type { FeatureGrant } from '../../utils/ownerRoutePermissions';

const SRV_USER = MICROSERVICE_BASE_URL.SRV_USER;

function parseLandlordRows(data: unknown): LandlordAccount[] {
  if (Array.isArray(data)) return data as LandlordAccount[];
  const obj = data as { data?: unknown; accounts?: unknown };
  if (Array.isArray(obj?.data)) return obj.data as LandlordAccount[];
  if (Array.isArray(obj?.accounts)) return obj.accounts as LandlordAccount[];
  return [];
}

export async function listLandlords(search = '', ownerId?: string | null): Promise<LandlordAccount[]> {
  const q = new URLSearchParams({
    page: '0',
    limit: '200',
    paged: 'true',
    roles: 'Landlord',
    deleted: 'false',
    banned: 'false',
    search_text: search,
  });
  if (ownerId) q.set('ownerId', ownerId);
  try {
    const { data } = await apiClient.get(`${SRV_USER}/user/get-account?${q}`);
    return parseLandlordRows(data);
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) {
      return [];
    }
    if (isAxiosError(e)) {
      const body = e.response?.data as { error?: string; message?: string } | undefined;
      const msg = body?.error || body?.message;
      if (msg) throw new Error(msg);
    }
    throw e;
  }
}

export async function getLandlordById(id: string): Promise<LandlordAccount> {
  const { data } = await apiClient.get(
    `${SRV_USER}/user/get-account-by-id/${encodeURIComponent(id)}`,
  );
  const row = (data?.data ?? data?.account ?? data) as LandlordAccount;
  if (!row?._id) throw new Error('Propriétaire introuvable');
  if (row.role && row.role !== 'Landlord') throw new Error('Compte invalide');
  return row;
}

export async function inviteLandlord(body: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  whatsapp?: string;
  ownerId?: string | null;
  listingIds?: string[];
  listingCityIds?: string[];
  landlordContract?: LandlordContract;
  featureGrants?: FeatureGrant[];
  dashboardAccess?: boolean;
  banned?: boolean;
}) {
  try {
    const { data } = await apiClient.post(`${SRV_USER}/auth/invite-landlord`, body);
    if (data?.success === false) throw new Error(data.error || data.message || 'Invitation failed');
    return data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 409) {
      const body409 = e.response.data as {
        error?: string;
        message?: string;
        existingRole?: string;
      };
      if (body409.error === 'owner is required' || body409.message === 'owner is required') {
        throw new Error(
          'Propriétaire PM requis — sélectionnez un owner dans le filtre en haut de page.',
        );
      }
      if (body409.error === 'Email already in use') {
        throw new Error(
          body409.existingRole === 'Owner'
            ? 'Cet email est déjà un compte Owner — utilisez une autre adresse.'
            : 'Cet email est déjà utilisé — modifiez le compte existant ou choisissez une autre adresse.',
        );
      }
      throw new Error(body409.error || body409.message || 'Conflit (409)');
    }
    throw e;
  }
}

export async function updateLandlordAccount(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${SRV_USER}/auth/update-account/${encodeURIComponent(id)}`, body);
  if (data?.success === false) throw new Error(data.error || 'Update failed');
  return data;
}
