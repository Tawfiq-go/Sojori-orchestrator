/**
 * Admin config — uniquement Pays & Villes (sous-ensemble legacy admin.page.js).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Coutries from '../components/countries';
import Cities from '../components/cities';

export default function AdminCountriesCitiesPage() {
  const { t } = useTranslation('common');
  const [value, setValue] = React.useState('1');

  const handleChange = (_event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ py: 3 }} className="!bg-white py-0">
      <Box sx={{ width: '100%', typography: 'body1' }}>
        <TabContext value={value}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList
              onChange={handleChange}
              aria-label="admin-countries-cities"
              sx={{
                '& .MuiTabs-indicator': { backgroundColor: '#FF6B35' },
                '& .MuiTab-root': { color: 'black', fontWeight: 600 },
                '& .Mui-selected': { color: '#FF6B35 !important' },
              }}
            >
              <Tab label={t('Countries')} value="1" />
              <Tab label={t('Cities')} value="2" />
            </TabList>
          </Box>
          <TabPanel value="1" sx={{ px: '0 !important' }}>
            <Coutries />
          </TabPanel>
          <TabPanel value="2" sx={{ px: '0 !important' }}>
            <Cities />
          </TabPanel>
        </TabContext>
      </Box>
    </Box>
  );
}
