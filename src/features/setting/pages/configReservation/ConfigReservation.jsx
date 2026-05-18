import React, { useState } from "react";
import { useTranslation } from 'react-i18next'; 
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import Tab from "@mui/material/Tab";
import TabList from "@mui/lab/TabList";
import Box from "@mui/material/Box";
import TabContext from "@mui/lab/TabContext";
import Stories from "features/setting/components/Stories";
import TabPanel from "@mui/lab/TabPanel";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfigReservationComponent from "features/setting/components/ConfigReservationComponent";

function ConfigReservation() {
    const { t } = useTranslation('common'); 
    const [value, setValue] = useState("1");

    return (
        <DashboardLayout>
            
            <ToastContainer />
            <Box className="!bg-white py-0">
                <TabContext value={value}>
                    <Box className="relative">
                        <TabList  aria-label="tabs" sx={{
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
                            <Tab label={t('Reservation Configuration')} value="1" />
                        </TabList>
                        <TabPanel value="1" sx={{ px: '0 !important' }}><ConfigReservationComponent /></TabPanel>

                    </Box>
                </TabContext>
            </Box>
        </DashboardLayout>
    )
}

export default ConfigReservation