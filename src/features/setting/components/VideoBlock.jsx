import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Box, Paper, Stack, Typography, Container, Tabs, Tab, CircularProgress, CardMedia, IconButton, Tooltip, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { styled } from "@mui/material/styles";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import ListIcon from "@mui/icons-material/List";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Edit } from "lucide-react";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
import { getWhatsappConfig, getLanguages, updateWhatsappConfig } from "../services/serverApi.adminConfig";
import WhatsAppConfigModal from "./WhatsAppConfigModal-new";
import defaultAvatar from "assets/images/placeholder.jpg";
const StyledTab = styled(Tab)(({
  theme
}) => ({
  minWidth: 120,
  "&.Mui-selected": {
    color: "#00B4B4",
    fontWeight: 600
  },
  fontSize: "0.875rem",
  fontWeight: 500,
  textTransform: "none",
  border: "1px solid",
  borderColor: "grey.300",
  borderRadius: 4,
  margin: theme.spacing(0.5),
  "&:hover": {
    backgroundColor: "rgba(18, 161, 144, 0.05)"
  }
}));
const ContentWrapper = styled(Box)(({
  theme
}) => ({
  padding: theme.spacing(3),
  border: "1px solid",
  borderColor: "grey.300",
  borderRadius: 4,
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  minHeight: 200
}));
const FeatureItem = styled(Box)(({
  theme
}) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: "rgba(241, 245, 249, 0.6)",
  borderRadius: 4,
  border: "1px solid",
  borderColor: "grey.300",
  transition: "background-color 0.3s",
  "&:hover": {
    backgroundColor: "rgba(241, 245, 249, 0.8)"
  },
  minHeight: 100
}));
const VideoBlock = () => {
  const {
    t
  } = useTranslation("common");
  const [isLoading, setIsLoading] = useState(true);
  const [whatsappConfig, setWhatsappConfig] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [whatsappConfigId, setWhatsappConfigId] = useState(null);
  const [featureOrder, setFeatureOrder] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isFrench, setIsFrench] = useState(false);
  const englishLang = languages.find(lang => lang.languageCode?.toLowerCase() === 'en') || languages[0] || {};
  const frenchLang = languages.find(lang => lang.languageCode?.toLowerCase() === 'fr') || languages[1] || {};
  const selectedLanguage = isFrench ? frenchLang?._id : englishLang?._id;
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getWhatsappConfig();
      const {
        whatsappConfig
      } = response.data;
      setWhatsappConfig(whatsappConfig);
      setWhatsappConfigId(whatsappConfig._id);
      setFeatureOrder(whatsappConfig.features);
    } catch (error) {
      setError(t("Failed to fetch WhatsApp configuration. Please try again later."));
    } finally {
      setIsLoading(false);
    }
  }, [t]);
  const fetchLanguages = useCallback(async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t("Failed to fetch languages"));
    }
  }, [t]);
  useEffect(() => {
    fetchData();
    fetchLanguages();
  }, [fetchData, fetchLanguages]);
  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);
  const handleOnDragEnd = useCallback(async result => {
    if (!result.destination) return;
    const items = Array.from(featureOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFeatureOrder(items);
    try {
      const updatedConfig = {
        ...whatsappConfig,
        features: items
      };
      await updateWhatsappConfig(whatsappConfigId, updatedConfig);
      setWhatsappConfig(updatedConfig);
      toast.success(t("Order updated successfully!"));
    } catch (error) {
      toast.error(t("Failed to update order."));
    }
  }, [featureOrder, whatsappConfig, whatsappConfigId, t]);
  const handleUpdateConfig = useCallback(updatedConfig => {
    setWhatsappConfig(updatedConfig);
    setFeatureOrder(updatedConfig.features);
  }, []);
  const renderMultiLanguageContent = (content, fallback) => {
    if (typeof content !== "object") {
      const value = content || fallback;
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    const selected = content[selectedLanguage] || Object.values(content)[0] || fallback;
    return selected.charAt(0).toUpperCase() + selected.slice(1);
  };
  if (error) {
    return <DashboardLayout>
        <Box sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "white",
        px: "11%",
        py: "2%"
      }}>
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        </Box>
      </DashboardLayout>;
  }
  if (isLoading) {
    return <DashboardLayout>
        <Box sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "white",
        px: "11%",
        py: "2%"
      }}>
          <CircularProgress sx={{
          color: "#00B4B4"
        }} />
        </Box>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <Box sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      bgcolor: "white",
      px: "11%",
      py: "2%"
    }}>
        <MDBox py={3} className="!bg-white py-0">
          <Container maxWidth={false} sx={{
          maxWidth: 976,
          px: 0
        }}>
            <Stack spacing={7} sx={{
            py: 7
          }}>
              <Paper sx={{
              width: "100%",
              maxWidth: 976,
              mx: "auto",
              borderRadius: 4,
              border: "1px solid",
              borderColor: "grey.300",
              boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
              overflow: "hidden",
              minHeight: 600
            }}>
                {/* Header */}
                <Box sx={{
                p: 3,
                borderBottom: "1px solid",
                borderColor: "grey.300",
                background: "linear-gradient(90deg, rgba(18,161,144,0.15) 0%, rgba(18,161,144,0.05) 50%, rgba(18,161,144,0) 100%)"
              }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{
                    fontSize: "16.6px",
                    fontWeight: 600,
                    color: "text.primary",
                    letterSpacing: "-0.45px",
                    lineHeight: 1.75
                  }}>
                      {t("VideoBlock Editor")}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <ToggleButtonGroup value={isFrench ? "fr" : "en"} exclusive onChange={(e, value) => {
                      if (value !== null) setIsFrench(value === "fr");
                    }} size="small" sx={{
                      "& .MuiToggleButton-root": {
                        border: "1px solid",
                        borderColor: "grey.300",
                        color: "text.primary",
                        fontWeight: 500,
                        fontSize: "0.75rem",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 4
                      },
                      "& .MuiToggleButton-root.Mui-selected": {
                        backgroundColor: "#00B4B4",
                        color: "white",
                        "&:hover": {
                          backgroundColor: "#00B4B4"
                        }
                      }
                    }}>
                        <ToggleButton value="en">EN</ToggleButton>
                        <ToggleButton value="fr">FR</ToggleButton>
                      </ToggleButtonGroup>
                      <Tooltip title={t("Edit configuration")}>
                        <IconButton sx={{
                        backgroundColor: "#00B4B4",
                        color: "white",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        "&:hover": {
                          backgroundColor: "#0e8a7a"
                        }
                      }} onClick={handleOpenModal} aria-label={t("Edit configuration")}>
                          <Edit size={20} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>

                {/* Body */}
                <Box sx={{
                p: 4
              }}>
                  <Tabs value={activeTab} onChange={handleTabChange} aria-label="VideoBlock configuration tabs" variant="scrollable" scrollButtons="auto" sx={{
                  borderBottom: "1px solid",
                  borderColor: "grey.300",
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#00B4B4"
                  },
                  "& .MuiTabs-flexContainer": {
                    gap: 8
                  },
                  bgcolor: "rgba(241, 245, 249, 0.2)",
                  borderRadius: 4,
                  p: 1
                }}>
                    <StyledTab label={t("WhatsApp Info")} id="videoblock-tab-0" aria-controls="videoblock-tabpanel-0" />
                    <StyledTab label={t("Blog Info")} id="videoblock-tab-1" aria-controls="videoblock-tabpanel-1" />
                    <StyledTab label={t("WhatsApp Media")} id="videoblock-tab-2" aria-controls="videoblock-tabpanel-2" />
                    <StyledTab label={t("Image Info")} id="videoblock-tab-3" aria-controls="videoblock-tabpanel-3" />
                    <StyledTab label={t("Features")} id="videoblock-tab-4" aria-controls="videoblock-tabpanel-4" />
                  </Tabs>
                  <Box sx={{
                  p: 3
                }}>
                    <TabPanel value={activeTab} index={0}>
                      <ContentWrapper>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <DescriptionIcon sx={{
                            fontSize: 20,
                            color: "#00B4B4"
                          }} />
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {t("Title and Description")}
                            </Typography>
                          </Stack>
                          <Box sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          pt: 0.5
                        }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                            width: 100
                          }}>
                              {t("Title")}:
                            </Typography>
                            <Typography variant="body2" fontWeight={400} color="text.primary" sx={{
                            flex: 1,
                            maxWidth: 600
                          }}>
                              {renderMultiLanguageContent(whatsappConfig.title, "No Title")}
                            </Typography>
                          </Box>
                          <Box sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          pt: 0.5
                        }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                            width: 100
                          }}>
                              {t("Description")}:
                            </Typography>
                            <Typography variant="body2" fontWeight={400} color="text.primary" sx={{
                            flex: 1,
                            maxWidth: 600
                          }}>
                              {renderMultiLanguageContent(whatsappConfig.description, "No Description")}
                            </Typography>
                          </Box>
                        </Stack>
                      </ContentWrapper>
                    </TabPanel>
                    <TabPanel value={activeTab} index={1}>
                      <ContentWrapper>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <DescriptionIcon sx={{
                            fontSize: 20,
                            color: "#00B4B4"
                          }} />
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {t("Blog Info")}
                            </Typography>
                          </Stack>
                          <Box sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          pt: 0.5
                        }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                            width: 100
                          }}>
                              {t("Title")}:
                            </Typography>
                            <Typography variant="body2" fontWeight={400} color="text.primary" sx={{
                            flex: 1,
                            maxWidth: 600
                          }}>
                              {renderMultiLanguageContent(whatsappConfig.blogTitle || {}, "No Blog Title")}
                            </Typography>
                          </Box>
                          <Box sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          pt: 0.5
                        }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                            width: 100
                          }}>
                              {t("Description")}:
                            </Typography>
                            <Typography variant="body2" fontWeight={400} color="text.primary" sx={{
                            flex: 1,
                            maxWidth: 600
                          }}>
                              {renderMultiLanguageContent(whatsappConfig.blogDescription || {}, "No Blog Description")}
                            </Typography>
                          </Box>
                        </Stack>
                      </ContentWrapper>
                    </TabPanel>
                    <TabPanel value={activeTab} index={2}>
                      <ContentWrapper>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <ImageIcon sx={{
                            fontSize: 20,
                            color: "#00B4B4"
                          }} />
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {t("WhatsApp Media")}
                            </Typography>
                          </Stack>
                          <CardMedia component={whatsappConfig.vdUrl?.includes("/MS/videos/") ? "video" : "img"} src={whatsappConfig.vdUrl || defaultAvatar} controls={whatsappConfig.vdUrl?.includes("/MS/videos/")} alt={t("WhatsApp Media")} sx={{
                          height: 400,
                          borderRadius: 4,
                          border: "1px solid",
                          borderColor: "grey.300",
                          backgroundColor: "rgba(241, 245, 249, 0.6)",
                          backgroundSize: "contain",
                          backgroundPosition: "left",
                          width: "100%",
                          maxWidth: 600
                        }} />
                        </Stack>
                      </ContentWrapper>
                    </TabPanel>
                    <TabPanel value={activeTab} index={3}>
                      <ContentWrapper>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <ImageIcon sx={{
                            fontSize: 20,
                            color: "#00B4B4"
                          }} />
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {t("Image Info")}
                            </Typography>
                          </Stack>
                          <CardMedia component="img" image={whatsappConfig.imageUrl || defaultAvatar} alt={t("WhatsApp Config")} sx={{
                          height: 200,
                          borderRadius: 4,
                          border: "1px solid",
                          borderColor: "grey.300",
                          backgroundColor: "rgba(241, 245, 249, 0.6)",
                          backgroundSize: "contain",
                          backgroundPosition: "center",
                          width: "100%",
                          maxWidth: 600,
                          mx: "auto"
                        }} />
                          <Box sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          pt: 0.5
                        }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                            width: 100
                          }}>
                              {t("Title")}:
                            </Typography>
                            <Typography variant="body2" fontWeight={400} color="text.primary" sx={{
                            flex: 1,
                            maxWidth: 600
                          }}>
                              {renderMultiLanguageContent(whatsappConfig.imageTitle || {}, "No Image Title")}
                            </Typography>
                          </Box>
                          <Box sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          pt: 0.5
                        }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                            width: 100
                          }}>
                              {t("Description")}:
                            </Typography>
                            <Typography variant="body2" fontWeight={400} color="text.primary" sx={{
                            flex: 1,
                            maxWidth: 600
                          }}>
                              {renderMultiLanguageContent(whatsappConfig.imageDescription || {}, "No Image Description")}
                            </Typography>
                          </Box>
                        </Stack>
                      </ContentWrapper>
                    </TabPanel>
                    <TabPanel value={activeTab} index={4}>
                      <ContentWrapper>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <ListIcon sx={{
                            fontSize: 20,
                            color: "#00B4B4"
                          }} />
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {t("Features")}
                            </Typography>
                          </Stack>
                          <FeaturesList t={t} featureOrder={featureOrder} handleOnDragEnd={handleOnDragEnd} languages={languages} selectedLanguage={selectedLanguage} renderMultiLanguageContent={renderMultiLanguageContent} />
                        </Stack>
                      </ContentWrapper>
                    </TabPanel>
                  </Box>
                  {whatsappConfig && <WhatsAppConfigModal open={modalOpen} onClose={handleCloseModal} setWhatsappConfig={handleUpdateConfig} config={whatsappConfig} configId={whatsappConfigId} featureOrder={featureOrder} languages={languages} activeTab={activeTab} selectedLanguage={selectedLanguage} />}
                </Box>
              </Paper>
            </Stack>
          </Container>
          <ToastContainer position="top-right" autoClose={3000} />
        </MDBox>
      </Box>
    </DashboardLayout>;
};
function TabPanel(props) {
  const {
    children,
    value,
    index,
    ...other
  } = props;
  return <div role="tabpanel" hidden={value !== index} id={`videoblock-tabpanel-${index}`} aria-labelledby={`videoblock-tab-${index}`} {...other}>
      {value === index && children}
    </div>;
}
function FeaturesList({
  t,
  featureOrder,
  handleOnDragEnd,
  languages,
  selectedLanguage,
  renderMultiLanguageContent
}) {
  return <DragDropContext onDragEnd={handleOnDragEnd}>
      <Droppable droppableId="features">
        {provided => <div {...provided.droppableProps} ref={provided.innerRef}>
            {featureOrder.map((feature, index) => <Draggable key={feature._id} draggableId={feature._id} index={index}>
                {provided => <Box {...provided.dragHandleProps}>
                    <FeatureItem ref={provided.innerRef} {...provided.draggableProps}>
                      <IconButton {...provided.dragHandleProps} sx={{
                color: "#00B4B4",
                "&:hover": {
                  backgroundColor: "rgba(18, 161, 144, 0.1)"
                }
              }}>
                        <DragIndicatorIcon />
                      </IconButton>
                      <Box flexGrow={1}>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {t("Feature {number}", {
                    number: index + 1
                  })}
                        </Typography>
                        <Box sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  pt: 0.5
                }}>
                          <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                    width: 100
                  }}>
                            {t("Text")}:
                          </Typography>
                          <Typography variant="body2" fontWeight={400} color="text.primary" sx={{
                    flex: 1,
                    maxWidth: 600
                  }}>
                            {renderMultiLanguageContent(feature.txt, "No Text")}
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <img src={feature.iconUrl || defaultAvatar} alt="icon" style={{
                  width: 48,
                  height: 48,
                  objectFit: "contain",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "grey.300"
                }} />
                      </Box>
                    </FeatureItem>
                  </Box>}
              </Draggable>)}
            {provided.placeholder}
          </div>}
      </Droppable>
    </DragDropContext>;
}
export default VideoBlock;
