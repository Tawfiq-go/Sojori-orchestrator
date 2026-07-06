/**
 * Profil PM — vue Owner (sans actions admin RU / Config IA).
 */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import UpdateOwnerSidebar from '../features/staff/components/UpdateOwnerSidebar';
import { getAccounById } from '../features/staff/services/serverApi.task';
import { mergeOwnerWithFetchedDetail } from '../features/staff/utils/fillCompanyFormUtils';
import { useAuth } from '../hooks/useAuth';
import { hasAdminAccess } from '../utils/rbac.utils';
import { MICROSERVICE_BASE_URL } from '../config/backendServer.config';

async function fetchOwnerSelfProfile(userId: string) {
  const [accountRes, fillRes] = await Promise.all([
    getAccounById(userId),
    axios.get(`${MICROSERVICE_BASE_URL.SRV_USER}/user/fill-company`),
  ]);
  const account = accountRes.data?.account;
  const fillPayload = fillRes.data?.data;
  const fillCompany =
    fillPayload?.ContactInfo || fillPayload?.CompanyInfo ? fillPayload : fillPayload;
  return mergeOwnerWithFetchedDetail(account, { ...account, fillCompany });
}

export function OwnerSelfProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [owner, setOwner] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const userId = String(user?._id || user?.id || '');

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const profile = await fetchOwnerSelfProfile(userId);
        if (active) setOwner(profile);
      } catch (err) {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Chargement profil impossible');
          setOwner({ ...user, _id: userId });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, user]);

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (hasAdminAccess(user?.role)) {
    return <Navigate to="/admin/equipe/owners?tab=list" replace />;
  }
  if (!authLoading && String(user?.role || '').toLowerCase() !== 'owner') {
    return <Navigate to="/admin/equipe?tab=worker" replace />;
  }

  return (
    <DashboardWrapper breadcrumb={['Mon profil PM']}>
      <LegacyReduxProvider>
        <div className="so-staff-root" style={{ padding: 0, minHeight: 0, background: 'transparent' }}>
          {loading ? (
            <div style={{ padding: 24, color: '#64748b' }}>Chargement du profil…</div>
          ) : (
            <>
              {loadError ? (
                <div className="owner-form-alert" style={{ margin: 16 }}>
                  {loadError} — affichage partiel.
                </div>
              ) : null}
              <UpdateOwnerSidebar
                inline
                open
                selfService
                owner={owner}
                onClose={() => navigate('/dashboard')}
                onOwnerUpdated={(updated) =>
                  setOwner((prev) => (prev ? { ...prev, ...updated } : updated))
                }
              />
            </>
          )}
        </div>
      </LegacyReduxProvider>
    </DashboardWrapper>
  );
}

export default OwnerSelfProfilePage;
