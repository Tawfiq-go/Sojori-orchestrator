import React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import MDBox from "components/MDBox";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import RoomComposite from "../components/RoomComposite";
import { useTranslation } from 'react-i18next'; // Added for translations

function RoomCompositePage() {
  const { t } = useTranslation('common'); // Use common namespace
  const [value, setValue] = React.useState('1');

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
                  backgroundColor: '#66cdaa',
                },
                '& .MuiTab-root': {
                  color: 'black',
                  fontWeight: 600,
                },
                '& .Mui-selected': {
                  color: '#66cdaa !important',
                },
              }}>
                <Tab label={t('RoomCompositesTab')} value="1" />
              </TabList>
            </Box>
            <TabPanel value="1"><RoomComposite/></TabPanel>
          </TabContext>
        </Box>      
      </MDBox>
    </DashboardLayout>
  );
}

export default RoomCompositePage;