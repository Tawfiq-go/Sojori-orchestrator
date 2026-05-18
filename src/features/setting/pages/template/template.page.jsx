
import React, { useState } from "react";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import Box from "@mui/material/Box";
import MailTemplates from "features/setting/components/MailTemplates";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



function WhatsAppConfig() {
    return (
        <DashboardLayout>
            
            <ToastContainer />
            <Box>
                <MailTemplates />
            </Box>
        </DashboardLayout>
    )
}
export default WhatsAppConfig
