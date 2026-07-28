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
  const tokenRequestRef = useRef(0);
  const inFlightTokenRef = useRef(null);
  const loadedOwnerRef = useRef(null);
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
      const ruOwners = rows
        .filter((owner) => owner.channelManager === 'RU')
        .slice()
        .sort((a, b) => {
          // Owners avec compte RU réel d’abord (évite admin@sojori sans ruOwnerId → 403 widget)
          const aOk = a.ruOwnerId ? 0 : 1;
          const bOk = b.ruOwnerId ? 0 : 1;
          if (aOk !== bOk) return aOk - bOk;
          const an = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
          const bn = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
          return an.localeCompare(bn, 'fr');
        });
      setOwners(ruOwners);
      console.info('[RU-widget] owners loaded', {
        total: ruOwners.length,
        withRuId: ruOwners.filter((o) => o.ruOwnerId).length,
        list: ruOwners.map((o) => ({
          id: String(o._id ?? o.id),
          name: `${o.firstName || ''} ${o.lastName || ''}`.trim(),
          ruOwnerId: o.ruOwnerId || null,
          ruEmail: o.ruEmail || null,
        })),
      });
      if (ruOwners.length > 0) {
        const preferred =
          ruOwners.find((o) => o.ruOwnerId) || ruOwners[0];
        setSelectedOwnerId((prev) => {
          const next = prev || String(preferred._id ?? preferred.id ?? '');
          console.info('[RU-widget] selectedOwnerId', { prev: prev || null, next, preferredName: `${preferred.firstName || ''} ${preferred.lastName || ''}`.trim() });
          return next;
        });
      }
    } catch (err) {
      setOwners([]);
      setOwnersError(
        err?.response?.data?.message || err?.message || 'Impossible de charger la liste des owners',
      );
      console.error('[RU-widget] fetchOwners FAIL', err);
    } finally {
      setLoadingOwners(false);
      setOwnersLoaded(true);
    }
  };
  const refreshToken = async (forceRotate = false) => {
    if (!user) {
      console.warn('[RU-widget] refreshToken skip — no user');
      return;
    }
    const adminStatus = hasAdminAccess(user.role);
    if (adminStatus && !selectedOwnerId) {
      console.warn('[RU-widget] refreshToken skip — admin sans selectedOwnerId');
      return;
    }
    const currentOwnerId = adminStatus
      ? selectedOwnerId
      : user.role == 'Owner'
        ? user._id || user.id
        : user?.ownerId;
    if (!currentOwnerId) {
      console.warn('[RU-widget] refreshToken skip — currentOwnerId vide', {
        role: user.role,
        _id: user._id,
        id: user.id,
        ownerId: user.ownerId,
      });
      return;
    }
    try {
      const currentLanguage = getCurrentLanguage();
      const languageId = getLanguageId(currentLanguage);
      // force dans la clé : un refresh forcé (widget en erreur) ne doit pas être
      // avalé par un appel non-forcé déjà en vol
      const flightKey = `${currentOwnerId}:${languageId}:${forceRotate ? 'f' : 'c'}`;
      if (inFlightTokenRef.current?.key === flightKey && inFlightTokenRef.current.promise) {
        return inFlightTokenRef.current.promise;
      }
      // Claim the slot synchronously to collapse Strict Mode / multi-effect races
      const slot = { key: flightKey, promise: null };
      inFlightTokenRef.current = slot;
      const reqId = ++tokenRequestRef.current;
      // ⚠️ force=1 fait TOURNER le token côté RU → tue toute autre instance ouverte
      // (autre onglet, reload). Jamais au montage : cache backend d'abord ; le
      // refresh forcé n'arrive que via onWidgetError (iframe en « OOOPS »).
      const force = Boolean(forceRotate);
      console.info('[RU-widget] getUserToken →', { currentOwnerId, languageId, lang: currentLanguage, force });
      slot.promise = RentalUnitedApi.getUserToken(currentOwnerId, languageId, force)
        .then((response) => {
          if (reqId !== tokenRequestRef.current) return;
          console.info('[RU-widget] getUserToken ←', {
            success: response?.success,
            hasScriptUrl: !!response?.scriptUrl,
            scriptUrlHead: response?.scriptUrl ? String(response.scriptUrl).slice(0, 120) : null,
            ruLoginEmail: response?.ruLoginEmail || null,
            dashboardEmail: response?.dashboardEmail || null,
            message: response?.message || response?.error || null,
          });
          if (response.success && response.scriptUrl) {
            setTokenData(response);
            setScriptUrl((prev) => (prev === response.scriptUrl ? prev : response.scriptUrl));
            loadedOwnerRef.current = String(currentOwnerId);
            setError(null);
          } else {
            const msg = 'Token Rental United indisponible (scriptUrl absent). Vérifiez la config RU du owner.';
            setError(msg);
            console.error('[RU-widget] getUserToken OK HTTP mais pas de scriptUrl', response);
          }
        })
        .finally(() => {
          if (inFlightTokenRef.current === slot) {
            inFlightTokenRef.current = null;
          }
        });
      await slot.promise;
    } catch (err) {
      const msg = formatRuError(err, 'Failed to refresh Rental United token');
      setError(msg);
      console.error('[RU-widget] getUserToken FAIL', {
        message: msg,
        status: err?.response?.status,
        data: err?.response?.data,
        err,
      });
    }
  };
  // Auto-guérison : l'iframe signale « OOOPS » (token mort — rotation par une
  // autre instance ou refresh interne RU) → un refresh forcé, max 1 / 90s.
  const refreshTokenRef = useRef(null);
  refreshTokenRef.current = refreshToken;
  const lastAutoHealRef = useRef(0);
  const handleWidgetError = useMemo(
    () => () => {
      const now = Date.now();
      if (now - lastAutoHealRef.current < 90 * 1000) {
        console.warn('[RU-widget] auto-heal ignoré (cooldown 90s)');
        return;
      }
      lastAutoHealRef.current = now;
      console.info('[RU-widget] auto-heal → refresh forcé du token');
      refreshTokenRef.current?.(true);
    },
    [],
  );
  const handleOwnerChange = event => {
    const newOwnerId = event.target.value;
    console.info('[RU-widget] owner change', { from: selectedOwnerId, to: newOwnerId });
    setSelectedOwnerId(newOwnerId);
    setScriptUrl(null);
    setTokenData(null);
    setError(null);
    loadedOwnerRef.current = null;
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
    let cancelled = false;
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
        if (cancelled) return;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          refreshToken();
        }, 55 * 60 * 1000);
      } catch (err) {
        if (!cancelled) {
          setError(formatRuError(err, 'Failed to load Rental United White Label'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (user && (!hasAdminAccess(user.role) || hasAdminAccess(user.role) && selectedOwnerId)) {
      loadRentalUnitedScript();
    }
    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user?._id || user?.id, user?.role, selectedOwnerId]);
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
  if (loading && !scriptUrl) {
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
  if (error && !scriptUrl) {
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
        onWidgetError={handleWidgetError}
      />
    </RentalUnitedErrorBoundary>
  );
};
export default RentalUnitedWhiteLabelV2;
