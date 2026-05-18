import React, { useState } from "react"; import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import MDBox from "components/MDBox";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import Referrals from "features/setting/components/Referrals";

function ReferralPage() {
    const { t } = useTranslation('common'); const [value, setValue] = useState("1");

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
                                <Tab label={t('Referral')} value="1" />
                            </TabList>
                        </Box>
                        <TabPanel value="1" sx={{ px: '0 !important' }}><Referrals /></TabPanel>
                    </TabContext>
                </Box>
            </MDBox>
        </DashboardLayout>
    );
}

export default ReferralPage;