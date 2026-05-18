import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import MDBox from "components/MDBox";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";

import WebSite from "../components/webSiteConfig";
import SliderBlock from "../components/SliderBlock";
import CitiesBlock from "../components/CitiesBlock";
import ApplicationBlock from "../components/ApplicationBlock";
import VideoBlock from "../components/VideoBlock";
import StoryBlock from "../components/StoryBlock";
import FooterBlock from "../components/FooterBlock";
import CitiesMappingBlock from "../components/CitiesMappingBlock";
import StoryConfigBlock from "../components/StoryConfigBlock";


const navigationItems = [
  { label: "show/hide", value: "show-hide" },
  { label: "SliderBlock", value: "slider-block" },
  { label: "CitiesBlock", value: "cities-block" },
  { label: "ApplicationBlock", value: "application-block" },
  { label: "VideoBlock", value: "video-block" },
  { label: "StoryBlock", value: "story-block" },
  { label: "FooterBlock", value: "footer-block" },
  { label: "CitiesMappingBlock", value: "cities-mapping-block" },
  { label: "StoryConfigBlock", value: "story-config-block" },
];

function WebSiteBlockConfig() {
  const { t } = useTranslation("common");
  const [value, setValue] = useState("show-hide");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <DashboardLayout>
      <MDBox py={3} className="!bg-white py-0">
        <Box sx={{ width: "100%", typography: "body1" }}>
          <TabContext value={value}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList
                onChange={handleChange}
                aria-label="website blocks config tabs"
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#00b4b4",
                  },
                  "& .MuiTab-root": {
                    color: "black",
                    fontWeight: 600,
                    textTransform: "none",
                    fontSize: "14px",
                    fontFamily: "Inter, Helvetica, sans-serif",
                    px: 1.5,
                    py: 1.4,
                  },
                  "& .Mui-selected": {
                    color: "#00b4b4 !important",
                  },
                }}
              >
                {navigationItems.map((item) => (
                  <Tab key={item.value} label={t(item.label)} value={item.value} />
                ))}
              </TabList>
            </Box>

            <TabPanel value="show-hide" sx={{ px: "0 !important" }}>
              <WebSite />
            </TabPanel>
            <TabPanel value="slider-block" sx={{ px: "0 !important" }}>
              <SliderBlock />
            </TabPanel>
            <TabPanel value="cities-block" sx={{ px: "0 !important" }}>
              <CitiesBlock />
            </TabPanel>
            <TabPanel value="application-block" sx={{ px: "0 !important" }}>
              <ApplicationBlock />
            </TabPanel>
            <TabPanel value="video-block" sx={{ px: "0 !important" }}>
              <VideoBlock />
            </TabPanel>
            <TabPanel value="story-block" sx={{ px: "0 !important" }}>
              <StoryBlock />
            </TabPanel>
            <TabPanel value="footer-block" sx={{ px: "0 !important" }}>
              <FooterBlock />
            </TabPanel>
            <TabPanel value="cities-mapping-block" sx={{ px: "0 !important" }}>
              <CitiesMappingBlock />
            </TabPanel>
              <TabPanel value="story-config-block" sx={{ px: "0 !important" }}>
              <StoryConfigBlock />
            </TabPanel>
          </TabContext>
        </Box>
      </MDBox>
    </DashboardLayout>
  );
}

export default WebSiteBlockConfig;