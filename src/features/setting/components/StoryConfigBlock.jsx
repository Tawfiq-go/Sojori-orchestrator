import React, { useState, useEffect, Component } from "react";
import { useTranslation } from "react-i18next";
import AppsIcon from "@mui/icons-material/Apps";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { Box, Container, Paper, Stack, TextField, Typography, ToggleButton, ToggleButtonGroup, CircularProgress, IconButton, Tooltip } from "@mui/material";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getStorySectionConfig } from "../services/serverApi.adminConfig";
import UpdateStoryConfigDialog from "./UpdateStoryConfigDialog";
class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null
  };
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  render() {
    if (this.state.hasError) {
      return <Box sx={{
        p: 3,
        color: "red"
      }}>
          <Typography variant="h6">{this.props.t("ErrorInStoryConfigBlock")}</Typography>
          <Typography>{this.state.error?.message || this.props.t("UnknownError")}</Typography>
        </Box>;
    }
    return this.props.children;
  }
}
function StoryConfigBlock() {
  const {
    t
  } = useTranslation("common");
  const [isLoading, setIsLoading] = useState(true);
  const [storySectionConfig, setStorySectionConfig] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [openDialog, setOpenDialog] = useState(false);
  useEffect(() => {
    const fetchStorySectionConfig = async () => {
      setIsLoading(true);
      try {
        const response = await getStorySectionConfig(null);
        if (response.success && response.storySectionConfig) {
          setStorySectionConfig(response.storySectionConfig);
        } else {
          setStorySectionConfig(null);
          toast.info(t("NoStorySectionConfigFound"));
        }
      } catch (error) {
        toast.error(t("FailedToFetchStorySectionConfig"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchStorySectionConfig();
  }, [t]);
  const handleLanguageChange = (event, newValue) => {
    if (newValue !== null) {
      setSelectedLanguage(newValue);
    }
  };
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  const handleUpdateConfig = newConfig => {
    setStorySectionConfig(newConfig);
    setOpenDialog(false);
    toast.success(t("StorySectionUpdatedSuccessfully"));
  };
  const renderTranslatedText = textObj => {
    return textObj?.[selectedLanguage] || textObj?.en || t("NoTextAvailable");
  };
  return <DashboardLayout>
      <ErrorBoundary t={t}>
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
            maxWidth: 1423,
            px: 0
          }}>
              <Stack spacing={7} sx={{
              py: 7
            }}>
                <Paper elevation={1} sx={{
                maxWidth: 976,
                width: "100%",
                mx: "auto",
                border: 1,
                borderColor: "grey.200",
                borderRadius: 2,
                overflow: "hidden"
              }}>
                
                  <Box sx={{
                  background: "linear-gradient(90deg, rgba(18,161,144,0.1) 0%, rgba(18,161,144,0) 50%, rgba(18,161,144,0) 100%)",
                  borderBottom: 1,
                  borderColor: "grey.200",
                  p: 3
                }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AppsIcon sx={{
                        fontSize: 16,
                        color: "#12a190"
                      }} />
                        <Typography variant="h6" sx={{
                        fontWeight: 600,
                        fontSize: 17,
                        letterSpacing: "-0.45px",
                        color: "#131a20"
                      }}>
                          {t("StoryConfigEditor")}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ToggleButtonGroup value={selectedLanguage} exclusive onChange={handleLanguageChange} size="small" sx={{
                        "& .MuiToggleButton-root": {
                          border: "1px solid",
                          borderColor: "grey.300",
                          color: "#131a20",
                          fontWeight: 500,
                          fontSize: "0.75rem",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 4
                        },
                        "& .MuiToggleButton-root.Mui-selected": {
                          backgroundColor: "#12a190",
                          color: "white",
                          "&:hover": {
                            backgroundColor: "#0f8a7a"
                          }
                        }
                      }}>
                          <ToggleButton value="en">{t("EN")}</ToggleButton>
                          <ToggleButton value="fr">{t("FR")}</ToggleButton>
                          <ToggleButton value="ar">{t("AR")}</ToggleButton>
                        </ToggleButtonGroup>
                        <Tooltip title={t("UpdateStorySection")}>
                          <IconButton sx={{
                          backgroundColor: "#12a190",
                          color: "white !important",
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          "&:hover": {
                            backgroundColor: "#0f8a7a"
                          }
                        }} onClick={handleOpenDialog}>
                            <EditNoteIcon sx={{
                            fontSize: 20
                          }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>

                  <Box sx={{
                  p: 3
                }}>
                    {isLoading ? <Box sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200
                  }}>
                        <CircularProgress sx={{
                      color: "#12a190"
                    }} />
                      </Box> : storySectionConfig ? <Stack direction="row" spacing={4}>

                        <Stack spacing={2} sx={{
                      flex: 1
                    }}>
                          <Typography variant="body2" sx={{
                        fontWeight: 500,
                        fontSize: 13,
                        color: "#131a20",
                        mb: 0.5
                      }}>
                            {t("StorySection")}
                          </Typography>
                          <TextField fullWidth label={t("Title")} value={renderTranslatedText(storySectionConfig.storySection.title)} size="small" InputProps={{
                        readOnly: true
                      }} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13.2,
                          color: "grey.400"
                        }
                      }} />
                          <TextField fullWidth multiline rows={4} label={t("Description")} value={renderTranslatedText(storySectionConfig.storySection.description)} InputProps={{
                        readOnly: true
                      }} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 12.9,
                          color: "grey.400"
                        }
                      }} />
                          <TextField fullWidth label={t("ButtonText")} value={renderTranslatedText(storySectionConfig.storySection.btn)} size="small" InputProps={{
                        readOnly: true
                      }} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13.2,
                          color: "grey.400"
                        }
                      }} />
                          <TextField fullWidth label={t("ButtonURL")} value={storySectionConfig.storySection.btnUrl} size="small" InputProps={{
                        readOnly: true
                      }} sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: 13.2,
                          color: "grey.400"
                        }
                      }} />
                        </Stack>

                        <Stack spacing={2} sx={{
                      flex: 1
                    }}>
                          <Typography variant="body2" sx={{
                        fontWeight: 500,
                        fontSize: 13.6,
                        color: "#131a20"
                      }}>
                            {t("Listings")}
                          </Typography>
                          {storySectionConfig.listings.map(listing => <Stack key={listing.id} spacing={2}>
                              <TextField fullWidth label={t("ListingTitle")} value={renderTranslatedText(listing.title)} size="small" InputProps={{
                          readOnly: true
                        }} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13.2,
                            color: "grey.400"
                          }
                        }} />
                              <Box>
                                <Typography variant="body2" sx={{
                            fontWeight: 500,
                            fontSize: 13.6,
                            color: "#131a20"
                          }}>
                                  {t("Image")}
                                </Typography>
                                <Typography variant="caption" sx={{
                            fontSize: 10.9,
                            color: "grey.500"
                          }}>
                                  {t("ImageURL")}
                                </Typography>
                              </Box>
                              <TextField fullWidth label={t("ImageURL")} value={listing.imageUrl} size="small" InputProps={{
                          readOnly: true
                        }} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13.2,
                            color: "grey.400"
                          }
                        }} />
                              <TextField fullWidth label={t("LinkText")} value={renderTranslatedText(listing.linkText)} size="small" InputProps={{
                          readOnly: true
                        }} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13.2,
                            color: "grey.400"
                          }
                        }} />
                              <TextField fullWidth label={t("LinkURL")} value={listing.linkUrl} size="small" InputProps={{
                          readOnly: true
                        }} sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: 13.2,
                            color: "grey.400"
                          }
                        }} />
                            </Stack>)}
                       
                        </Stack>
                      </Stack> : <Box sx={{
                    textAlign: "center",
                    py: 3
                  }}>
                        <Typography variant="body1" color="text.secondary">
                          {t("NoStorySectionConfigAvailable")}
                        </Typography>
                      </Box>}
                  </Box>
                </Paper>
              </Stack>
            </Container>
            <ToastContainer position="top-right" autoClose={3000} />
            <UpdateStoryConfigDialog open={openDialog} onClose={handleCloseDialog} onUpdate={handleUpdateConfig} storySectionConfig={storySectionConfig} />
          </MDBox>
        </Box>
      </ErrorBoundary>
    </DashboardLayout>;
}
export default StoryConfigBlock;
