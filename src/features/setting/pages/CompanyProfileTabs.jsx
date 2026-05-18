import React, { useState, useEffect } from 'react';
import { Box, Tab, Tabs, Card, Button } from '@mui/material';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'components/Navbars/DashboardNavbar';
import CompanyProfilePage from './CompanyProfilePage';
import CompanyAndLegalInfoPage from './CompanyAndLegalInfoPage';
import {
  fetchCompanyProfile,
  syncCompanyProfile,
} from '../services/serverApi.profilEntreprise';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SyncIcon from '@mui/icons-material/Sync';
import { Global } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { can } from '../../../utils/permissions';

const CompanyProfileTabs = () => {
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [canUpdate] = useState(can('update'));
  const { t } = useTranslation('common');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetchCompanyProfile();
        setProfile(res.data);
      } catch (e) {
        toast.error('Error loading profile');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleSync = async () => {
    if (!profile?.ownerId) return;
    setSyncLoading(true);
    try {
      await syncCompanyProfile(profile.ownerId);
      toast.success('Profile synced successfully');
      const res = await fetchCompanyProfile();
      setProfile(res.data);
    } catch (e) {
      toast.error('Error syncing profile');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <ToastContainer position="top-right" autoClose={3000} />
      <Global
        styles={`@keyframes spin { 100% { transform: rotate(360deg); } }`}
      />
      <Box sx={{ width: '100%', background: '#f4f6f8' }}>
        <Card
          sx={{
            mx: 'auto',
            background: '#fff',
            p: { xs: 2, sm: 4 },
            minHeight: 600,
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Tabs
              value={tab}
              onChange={handleChange}
              aria-label="Company Profile Tabs"
              sx={{
                mb: 0,
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  color: '#6b7280',
                  px: 3,
                  borderBottom: '3px solid #e0e0e0',
                },
                '& .MuiTab-root.Mui-selected': {
                  color: '#FF6B35 !important',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#FF6B35',
                  height: 3,
                  borderRadius: 2,
                },
              }}
            >
              <Tab label={t('My Profile')} />
              <Tab label={t('Company & Legal Info')} />
            </Tabs>
            {canUpdate && (
              <Button
                variant="contained"
                color="primary"
                className="!bg-[#FF6B35] !text-white hover:!bg-[#E55A2B]"
                onClick={handleSync}
                disabled={!!profile?.RUSync || syncLoading}
                sx={{
                  fontWeight: 600,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
                aria-label="Sync Info"
              >
                <SyncIcon
                  sx={
                    syncLoading ? { animation: 'spin 1s linear infinite' } : {}
                  }
                />
                <span>{t('Sync Info')}</span>
              </Button>
            )}
          </Box>
          <Box>
            {tab === 0 && (
              <CompanyProfilePage
                profile={profile}
                setProfile={setProfile}
                canUpdate={canUpdate}
              />
            )}
            {tab === 1 && (
              <CompanyAndLegalInfoPage
                profile={profile}
                setProfile={setProfile}
                canUpdate={canUpdate}
              />
            )}
          </Box>
        </Card>
      </Box>
    </DashboardLayout>
  );
};

export default CompanyProfileTabs;
