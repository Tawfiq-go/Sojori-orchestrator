import React, { useState } from "react"; import { useTranslation } from 'react-i18next';
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import MDBox from "components/MDBox";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import Coutries from "../components/countries";
import Cities from "../components/cities";
import CitiesMapping from "../components/CitiesMapping";
import BlogsMapping from "../components/BlogsMapping";
import Blogs from "../components/Blogs";
import Slides from "../components/slides";
import Languages from "../components/Languages";
// import Tags from "../components/Tags";

function AdminConfigPage() {
  const { t } = useTranslation('common'); const [value, setValue] = React.useState('1');

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
            <Tab label={t('Countries')} value="1" />
            <Tab label={t('Cities')} value="2" />
            <Tab label={t('Cities Mapping')} value="3" />
            <Tab label={t('Blogs')} value="4" />
            <Tab label={t('blogs Mapping')} value="5" />
            <Tab label={t('Slides')} value="6" />
            <Tab label={t('Languages')} value="7" />
            {/* <Tab label={t('Tags')} value="8" /> */}
          </TabList>
        </Box>
        <TabPanel value="1" sx={{ px: '0 !important' }}><Coutries/></TabPanel>
        <TabPanel value="2" sx={{ px: '0 !important' }}><Cities/></TabPanel>
        <TabPanel value="3" sx={{ px: '0 !important' }}><CitiesMapping/></TabPanel>
        <TabPanel value="4" sx={{ px: '0 !important' }}><Blogs/></TabPanel>
        <TabPanel value="5" sx={{ px: '0 !important' }}><BlogsMapping /></TabPanel>
        <TabPanel value="6" sx={{ px: '0 !important' }}><Slides /> </TabPanel>
        <TabPanel value="7" sx={{ px: '0 !important' }}><Languages /> </TabPanel>
        {/* <TabPanel value="8"><Tags /> </TabPanel> */}
        
      </TabContext>
    </Box>      
      </MDBox>
    </DashboardLayout>
  );
}

export default AdminConfigPage;