import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Box, Alert, CircularProgress, Typography } from '@mui/material';
import { RentalUnitedApi } from '../services/RentalUnitedApi';
import RentalUnitedDependencies from './RentalUnitedDependencies';
import { getOwners } from '../../staff/services/serverApi.task';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import OwnerSelector from './OwnerSelector';
import RentalUnitedContainer from './RentalUnitedContainer';
const RentalUnitedWhiteLabel = () => {
  const {
    user
  } = useSelector(state => state.auth);
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
  const [isAdmin, setIsAdmin] = useState(false);
  const getLanguageId = dashboardLanguage => {
    const languageMap = {
      'en': '1',
      'fr': '4',
      'es': '5'
    };
    return languageMap[dashboardLanguage] || '1';
  };
  const getCurrentLanguage = () => {
    const i18nLanguage = i18n.language;
    const userLanguage = user?.settings?.language;
    const userLang = user?.lang;
    const currentLang = i18nLanguage || userLanguage || userLang || 'en';

    //   i18nLanguage,
    //   userLanguage,
    //   userLang,
    //   selectedLanguage: currentLang
    // });

    return currentLang;
  };
  const getCurrentOwnerId = () => {
    if (isAdmin) {
      return selectedOwnerId;
    }
    return user?._id;
  };
  const fetchOwners = async () => {
    if (!isAdmin) return;
    setLoadingOwners(true);
    try {
      const response = await getOwners({
        page: 0,
        limit: 100,
        deleted: false,
        banned: false,
        search_text: ''
      });
      if (response && response.data) {
        const ruOwners = response.data.filter(owner => owner.channelManager === 'RU');
        setOwners(ruOwners);
      }
    } catch (err) {} finally {
      setLoadingOwners(false);
    }
  };
  const refreshToken = async () => {
    if (!user) return;
    const adminStatus = hasAdminAccess(user.role);
    if (adminStatus && !selectedOwnerId) {
      return;
    }
    const currentOwnerId = adminStatus ? selectedOwnerId : user._id;
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
        setError(null);
      } else {
        setError('Failed to refresh Rental United tokens');
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh Rental United token');
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
    if (user) {
      setIsAdmin(hasAdminAccess(user.role));
    }
  }, [user]);
  useEffect(() => {
    if (isAdmin) {
      fetchOwners();
    }
  }, [isAdmin]);
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
      } else {}
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
        setError(err.message || 'Failed to load Rental United White Label');
      } finally {
        setLoading(false);
      }
    };
    if (user && (!hasAdminAccess(user.role) || hasAdminAccess(user.role) && selectedOwnerId)) {
      loadRentalUnitedScript();
    } else {}
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, selectedOwnerId]); // Remove isAdmin from dependencies

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
    if (scriptUrl) {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.id = 'rental-united-script';
      const existingScript = document.getElementById('rental-united-script');
      if (existingScript) {
        existingScript.remove();
      }
      document.head.appendChild(script);
      return () => {
        const scriptToRemove = document.getElementById('rental-united-script');
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
      };
    }
  }, [scriptUrl]);
  if (isAdmin && !selectedOwnerId) {
    if (loadingOwners) {
      return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Box textAlign="center">
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{
            mt: 2
          }}>
              Loading owners...
            </Typography>
          </Box>
        </Box>;
    }
    if (owners.length === 0) {
      return <Box sx={{
        p: 3
      }}>
          <Alert severity="info">
            <Typography variant="body1" fontWeight="bold">
              No Rental United Owners Found
            </Typography>
            <Typography variant="body2">
              No owners with Rental United channel manager configuration were found.
            </Typography>
          </Alert>
        </Box>;
    }
    return <OwnerSelector owners={owners} selectedOwnerId={selectedOwnerId} onOwnerChange={handleOwnerChange} />;
  }
  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Box textAlign="center">
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{
          mt: 2
        }}>
            Loading Rental United Channel Manager...
          </Typography>
        </Box>
      </Box>;
  }
  if (error) {
    return <Box sx={{}}>
        {isAdmin && owners.length > 0 && <OwnerSelector owners={owners} selectedOwnerId={selectedOwnerId} onOwnerChange={handleOwnerChange} title="Owner Selection" subtitle="" />}

        <Alert severity="error" sx={{
        my: 1
      }}>
          <Typography variant="body1" fontWeight="bold">
            Error Loading Rental United
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Box>;
  }
  return <>
      <RentalUnitedDependencies />
      <RentalUnitedContainer isAdmin={isAdmin} owners={owners} selectedOwnerId={selectedOwnerId} onOwnerChange={handleOwnerChange} />
    </>;
};
export default RentalUnitedWhiteLabel;
