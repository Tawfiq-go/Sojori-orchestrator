import { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';

const SRV_USER = MICROSERVICE_BASE_URL.SRV_USER;

/**
 * `reportsMode` du PM actuellement regardé — filtre les rapports proposés
 * sur /reports (hôtel vs LCD). Défaut prudent : `lcd` tant que non résolu,
 * pour ne jamais montrer un rapport hôtel à un gestionnaire multi-biens.
 */
export function useReportsMode(): 'hotel' | 'lcd' {
  const { ownerId, owners } = useFinancesOwnerScope();
  const [fetchedMode, setFetchedMode] = useState<'hotel' | 'lcd' | null>(null);

  const fromOwnersList = Array.isArray(owners)
    ? (owners as Array<{ _id?: string; reportsMode?: string }>).find(
        (o) => String(o._id) === String(ownerId),
      )?.reportsMode
    : undefined;

  useEffect(() => {
    if (fromOwnersList || !ownerId) return;
    let cancelled = false;
    apiClient
      .get(`${SRV_USER}/user/get-account-by-id/${encodeURIComponent(ownerId)}`)
      .then(({ data }) => {
        if (cancelled) return;
        const mode = data?.data?.reportsMode || data?.reportsMode;
        setFetchedMode(mode === 'hotel' ? 'hotel' : 'lcd');
      })
      .catch(() => {
        if (!cancelled) setFetchedMode('lcd');
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, fromOwnersList]);

  if (fromOwnersList === 'hotel') return 'hotel';
  if (fromOwnersList === 'lcd') return 'lcd';
  return fetchedMode || 'lcd';
}
