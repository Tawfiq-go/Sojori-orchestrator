import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RentalUnitedApi } from '../services/RentalUnitedApi';
import RentalUnitedDependenciesV2 from './RentalUnitedDependenciesV2';
import { getOwners } from '../../staff/services/serverApi.task';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { useAuth } from '../../../hooks/useAuth';
import { toLegacyAuthUser } from '../../../utils/legacyAuthUser';
import OwnerSelectorV2 from './OwnerSelectorV2';
import RentalUnitedContainerV2 from './RentalUnitedContainerV2';
import RentalUnitedErrorBoundary from './RentalUnitedErrorBoundary';
import { CmSpinner, CmAlert, CmOwnerPanel, CmHint } from './ChannelManagerUi';
import { formatRuError } from '../utils/formatRuError';

const RentalUnitedWhiteLabelV2 = () => {
  const reduxUser = useSelector((state) => state.auth.user);
  const { user: authUser } = useAuth();
  const user = useMemo(
    () => reduxUser ?? toLegacyAuthUser(authUser),
    [reduxUser, authUser],
  );
  const isAdmin = Boolean(user?.role && hasAdminAccess(user.role));
  const {
    i18n
  } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scriptUrl, setScriptUrl] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const intervalRef = useRef(null);
  const previousLanguageRef = useRef(null);
  const [owners, setOwners] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [ownersLoaded, setOwnersLoaded] = useState(false);
  const [ownersError, setOwnersError] = useState(null);
  const getLanguageId = dashboardLanguage => {
    const languageMap = {
      en: '1',
      fr: '4',
      es: '5'
    };
    return languageMap[dashboardLanguage] || '1';
  };
  const getCurrentLanguage = () => {
    const i18nLanguage = i18n.language;
    const userLanguage = user?.settings?.language;
    const userLang = user?.lang;
    const currentLang = i18nLanguage || userLanguage || userLang || 'en';
    return currentLang;
  };
  const getCurrentOwnerId = () => {
    if (isAdmin) {
      return selectedOwnerId;
    }
    return user.role == 'Owner' ? user?._id : user?.ownerId;
  };
  const fetchOwners = async () => {
    if (!isAdmin) return;
    setLoadingOwners(true);
    setOwnersError(null);
    try {
      const response = await getOwners({
        page: 0,
        limit: 100,
        deleted: false,
        banned: false,
        search_text: '',
      });
      const rows = Array.isArray(response?.data) ? response.data : [];
      const ruOwners = rows.filter((owner) => owner.channelManager === 'RU');
      setOwners(ruOwners);
      if (ruOwners.length > 0) {
        setSelectedOwnerId((prev) => prev || String(ruOwners[0]._id ?? ruOwners[0].id ?? ''));
      }
    } catch (err) {
      setOwners([]);
      setOwnersError(
        err?.response?.data?.message || err?.message || 'Impossible de charger la liste des owners',
      );
    } finally {
      setLoadingOwners(false);
      setOwnersLoaded(true);
    }
  };
  const refreshToken = async () => {
    if (!user) return;
    const adminStatus = hasAdminAccess(user.role);
    if (adminStatus && !selectedOwnerId) {
      return;
    }
    const currentOwnerId = adminStatus ? selectedOwnerId : user.role == 'Owner' ? user._id : user?.ownerId;
    if (!currentOwnerId) {
      return;
    }
    try {
      const currentLanguage = getCurrentLanguage();
      const languageId = getLanguageId(currentLanguage);
      const response = await RentalUnitedApi.getUserToken(currentOwnerId, languageId);
      if (response.success && response.scriptUrl) {
        setTokenData(response);
        setScriptUrl(response.scriptUrl);
        const existingScript = document.getElementById('rental-united-script');
        if (existingScript) {
          if (existingScript.src !== response.scriptUrl) {
            existingScript.src = response.scriptUrl;
          }
        }
        setError(null);
      } else {
        setError('Token Rental United indisponible (scriptUrl absent). Vérifiez la config RU du owner.');
      }
    } catch (err) {
      setError(formatRuError(err, 'Failed to refresh Rental United token'));
    }
  };
  const handleOwnerChange = event => {
    const newOwnerId = event.target.value;
    setSelectedOwnerId(newOwnerId);
    setScriptUrl(null);
    setError(null);
    const existingScript = document.getElementById('rental-united-script');
    if (existingScript) {
      existingScript.remove();
    }
  };
  useEffect(() => {
    if (isAdmin) {
      setOwnersLoaded(false);
      fetchOwners();
    } else {
      setOwners([]);
      setOwnersLoaded(true);
    }
  }, [isAdmin, user?._id]);
  useEffect(() => {
    const loadRentalUnitedScript = async () => {
      if (!user) {
        return;
      }
      const adminStatus = hasAdminAccess(user.role);
      if (adminStatus && !selectedOwnerId) {
        setLoading(false);
        return;
      }
      if (!adminStatus) {
        const currentOwnerId = user._id;
        if (!currentOwnerId) {
          setError('User information not available');
          setLoading(false);
          return;
        }
      }
      try {
        setLoading(true);
        setError(null);
        await refreshToken();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          refreshToken();
        }, 55 * 60 * 1000);
      } catch (err) {
        setError(formatRuError(err, 'Failed to load Rental United White Label'));
      } finally {
        setLoading(false);
      }
    };
    if (user && (!hasAdminAccess(user.role) || hasAdminAccess(user.role) && selectedOwnerId)) {
      loadRentalUnitedScript();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, selectedOwnerId]);
  useEffect(() => {
    const currentLanguage = getCurrentLanguage();
    if (previousLanguageRef.current && previousLanguageRef.current !== currentLanguage) {
      const currentOwnerId = getCurrentOwnerId();
      if (currentOwnerId) {
        refreshToken();
      }
    }
    previousLanguageRef.current = currentLanguage;
  }, [i18n.language, user?.settings?.language, user?.lang]);
  useEffect(() => {
    return () => {
      const scriptToRemove = document.getElementById('rental-united-script');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  if (!user) {
    return (
      <>
        <RentalUnitedDependenciesV2 useIframe={true} />
        <CmSpinner label="Chargement session…" />
      </>
    );
  }

  if (isAdmin && !selectedOwnerId) {
    if (!ownersLoaded || loadingOwners) {
      return <>
          <RentalUnitedDependenciesV2 useIframe={true} />
          <div className="flex justify-center items-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medium-aquamarine mx-auto"></div>
              <p className="mt-2 text-gray-500">Chargement des owners…</p>
            </div>
          </div>
        </>;
    }
    if (ownersError) {
      return (
        <>
          <RentalUnitedDependenciesV2 useIframe={true} />
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h5 className="text-red-800 font-semibold mb-2">Erreur owners</h5>
              <p className="text-red-700">{ownersError}</p>
            </div>
          </div>
        </>
      );
    }
    if (owners.length === 0) {
      return <>
          <RentalUnitedDependenciesV2 useIframe={true} />
          <div className="p-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="text-blue-800 font-semibold mb-2">
                No Rental United Owners Found
              </h5>
              <p className="text-blue-700">
                No owners with Rental United channel manager configuration were
                found.
              </p>
            </div>
          </div>
        </>;
    }
    return (
      <>
        <RentalUnitedDependenciesV2 useIframe={true} />
        <CmOwnerPanel
          title="Choisir un property manager"
          subtitle="Le widget Rental United s’ouvre pour le compte sélectionné."
        >
          <OwnerSelectorV2
            owners={owners}
            selectedOwnerId={selectedOwnerId}
            onOwnerChange={handleOwnerChange}
            title="Owner"
          />
          <CmHint>
            Couleurs et style Sojori sont injectés dans le widget. L’organisation des écrans OTA
            (listes, wizards) reste gérée par Rental United.
          </CmHint>
        </CmOwnerPanel>
      </>
    );
  }
  if (loading) {
    return <>
        <RentalUnitedDependenciesV2 useIframe={true} />
        <div className="flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medium-aquamarine mx-auto"></div>
            <p className="mt-2 text-gray-500">
              Loading Rental United Channel Manager...
            </p>
          </div>
        </div>
      </>;
  }
  if (error) {
    return <>
        <RentalUnitedDependenciesV2 useIframe={true} />
        <div className="w-full">
          {isAdmin && owners.length > 0 && <div className="mb-4">
              <OwnerSelectorV2 owners={owners} selectedOwnerId={selectedOwnerId} onOwnerChange={handleOwnerChange} title="Owner Selection" subtitle="" />
            </div>}

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="text-red-800 font-semibold mb-2">
              Error Loading Rental United
            </h5>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </>;
  }
  return (
    <RentalUnitedErrorBoundary>
      <RentalUnitedDependenciesV2 useIframe={true} />
      <RentalUnitedContainerV2
        isAdmin={isAdmin}
        owners={owners}
        selectedOwnerId={selectedOwnerId}
        onOwnerChange={handleOwnerChange}
        scriptUrl={scriptUrl}
        tokenData={tokenData}
      />
    </RentalUnitedErrorBoundary>
  );
};
export default RentalUnitedWhiteLabelV2;
