
import React, { useState } from "react";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import Tab from "@mui/material/Tab";
import TabList from "@mui/lab/TabList";
import Box from "@mui/material/Box";
import TabContext from "@mui/lab/TabContext";
import CancellationPolicy from "features/setting/components/CancellationPolicy";
import TabPanel from "@mui/lab/TabPanel";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



function CancellationPage() {
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
                            <Tab label="Cancellation Policy" value="1" />
                        </TabList>
                        <TabPanel value="1" sx={{ px: '0 !important' }}><CancellationPolicy /></TabPanel>

                    </Box>
                </TabContext>
            </Box>
        </DashboardLayout>
    )
}
export default CancellationPage
