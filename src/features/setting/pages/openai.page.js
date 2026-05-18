import React, { useState } from "react"; import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import MDBox from "components/MDBox";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import OpenAiInit from "../components/OpenAiInit";
import OpenAiInitConfig from "../components/OpenAiConfig";
import { useLocation } from "react-router-dom";
import { useSelector } from 'react-redux';
import { hasAdminAccess } from 'utils/rbac.utils';

function AdminConfigPage() {
  const { t } = useTranslation('common'); const location = useLocation();
  const numb= location?.state?.data;

  const { user } = useSelector((state) => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);

  const defaultTab = numb || (isAdmin ? "1" : "2");
  const [value, setValue] = useState(defaultTab);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  
  return (
    <DashboardLayout>
      
      <MDBox py={3} className="!bg-white py-0">
      <Box sx={{ width: '100%', typography: 'body1' }}>
      <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList onChange={handleChange} aria-label="tabs" sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#00b4b4',
            },
            '& .MuiTab-root': {
              color: 'black',
              fontWeight: 600,
            },
            '& .Mui-selected': {
              color: '#00b4b4 !important',
            },
          }}>
            {isAdmin && (
        <Tab label={t('OpenAi init')} value="1" />
      )}
            
            <Tab label={t('Configuration')} value="2" />

           
          </TabList>
        </Box>
        {isAdmin && (
        <TabPanel value="1" sx={{ px: '0 !important' }}><OpenAiInit/></TabPanel>
      )}
        <TabPanel value="2" sx={{ px: '0 !important' }}><OpenAiInitConfig/></TabPanel>

        
      </TabContext>
    </Box>      
      </MDBox>
    </DashboardLayout>
  );
}

export default AdminConfigPage;