import React, { useState, useEffect, Component } from "react";
import { useTranslation } from "react-i18next";
import { Box, Container, Paper, Stack, Typography, Card, IconButton, CircularProgress, Tooltip } from "@mui/material";
import AppsIcon from "@mui/icons-material/Apps";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
import { getcitiesMappig, updateCitiesMapping, getLanguages } from "../services/serverApi.adminConfig";
import AddCityDialog from "./AddCityMapping-new.component";
import TitleDescriptionEditor from "./TitleDescriptionEditor-new";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Reorder, AnimatePresence } from "framer-motion";
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
          <Typography variant="h6">Error in CitiesMapping</Typography>
          <Typography>{this.state.error?.message || "Unknown error"}</Typography>
        </Box>;
    }
    return this.props.children;
  }
}
function CitiesMappingBlock() {
  const {
    t
  } = useTranslation("common");
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [openTitleDescEditor, setOpenTitleDescEditor] = useState(false);
  const [titleDesc, setTitleDesc] = useState({
    title: {},
    description: {}
  });
  const [languages, setLanguages] = useState([]);
  const fetchCities = async () => {
    try {
      const response = await getcitiesMappig();
      setCities(response?.data?.citiesMapping || []);
      setTitleDesc({
        title: response?.data?.title || {},
        description: response?.data?.description || {}
      });
    } catch (error) {
      toast.error(t("Failed to fetch cities data"));
    } finally {
      setIsLoading(false);
    }
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response.map(lang => ({
        id: lang._id,
        name: lang.name
      })));
    } catch (error) {
      toast.error(t("Failed to fetch languages"));
    }
  };
  useEffect(() => {
    fetchCities();
    fetchLanguages();
  }, []);
  const handleOpenDialog = (city = null) => {
    setSelectedCity(city);
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setSelectedCity(null);
    setOpenDialog(false);
  };
  const handleOpenTitleDescEditor = () => setOpenTitleDescEditor(true);
  const handleCloseTitleDescEditor = () => setOpenTitleDescEditor(false);
  const deleteItem = async id => {
    try {
      const filteredCities = cities.filter(city => city.city._id !== id);
      const newMapping = filteredCities.map(city => city.city._id);
      setCities(filteredCities);
      await updateCitiesMapping({
        citiesMapping: newMapping,
        title: titleDesc.title,
        description: titleDesc.description
      });
      toast.success(t("City removed successfully"));
    } catch (error) {
      toast.error(t("Failed to delete city"));
    }
  };
  const handleReorder = async newOrder => {
    setCities(newOrder);
    try {
      await updateCitiesMapping({
        citiesMapping: newOrder.map(city => city.city._id),
        title: titleDesc.title,
        description: titleDesc.description
      });
      toast.success(t("City order updated successfully"));
    } catch (error) {
      toast.error(t("Failed to update city order"));
    }
  };
  const handleSaveTitleDesc = async newTitleDesc => {
    setTitleDesc(newTitleDesc);
    try {
      await updateCitiesMapping({
        title: newTitleDesc.title,
        description: newTitleDesc.description,
        citiesMapping: cities.map(city => city.city._id)
      });
      toast.success(t("Title and description updated successfully!"));
    } catch (error) {
      toast.error(t("Failed to update title and description"));
    }
  };
  return <DashboardLayout>
      <ErrorBoundary>
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
                <Paper elevation={1} sx={{
                maxWidth: 976,
                width: "100%",
                mx: "auto",
                border: 1,
                borderColor: "grey.300",
                borderRadius: 2,
                overflow: "hidden"
              }}>
                  <Box sx={{
                  background: "linear-gradient(90deg, rgba(18,161,144,0.1) 0%, rgba(18,161,144,0) 50%, rgba(18,161,144,0) 100%)",
                  borderBottom: 1,
                  borderColor: "grey.300",
                  p: 3
                }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AppsIcon sx={{
                        fontSize: 16,
                        color: "#00B4B4"
                      }} />
                        <Typography variant="h6" sx={{
                        fontWeight: 600,
                        fontSize: 16.6,
                        letterSpacing: "-0.45px",
                        color: "#131a20"
                      }}>
                          {t("Cities Mapping Editor")}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title={t("Edit")}>
                          <IconButton sx={{
                          backgroundColor: "#12a190",
                          color: "white !important",
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          "&:hover": {
                            backgroundColor: "#0f8a7a"
                          }
                        }} onClick={handleOpenTitleDescEditor}>
                            <EditIcon sx={{
                            fontSize: 20
                          }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("Add City")}>
                          <IconButton sx={{
                          backgroundColor: "#12a190",
                          color: "white !important",
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          "&:hover": {
                            backgroundColor: "#0f8a7a"
                          }
                        }} onClick={() => handleOpenDialog()}>
                            <AddIcon sx={{
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
                    <Typography variant="h4" component="h1" gutterBottom sx={{
                    fontSize: 24,
                    fontWeight: 600
                  }}>
                      {t("Cities Management")}
                    </Typography>

                    {isLoading ? <Box sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200
                  }}>
                        <CircularProgress sx={{
                      color: "#00B4B4"
                    }} />
                      </Box> : <AnimatePresence>
                        <Reorder.Group axis="y" values={cities} onReorder={handleReorder} as="div" style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      // Changed to single column
                      gap: "24px",
                      marginTop: "24px"
                    }}>
                          {cities.map((city, index) => <Reorder.Item key={city.city._id} value={city} initial={{
                        opacity: 0,
                        y: 20
                      }} animate={{
                        opacity: 1,
                        y: 0
                      }} exit={{
                        opacity: 0,
                        y: -20
                      }} transition={{
                        duration: 0.2
                      }}>
                              <Card sx={{
                          position: "relative",
                          borderRadius: 3,
                          overflow: "hidden",
                          background: index <= 2 ? "#e3f2fd" : "linear-gradient(135deg, #ffffff 0%, #f8fdfd 100%)",
                          border: "2px solid transparent",
                          backgroundClip: "padding-box",
                          boxShadow: "0 8px 32px rgba(0, 180, 180, 0.08)",
                          cursor: "grab",
                          "&:active": {
                            cursor: "grabbing"
                          },
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "4px",
                            background: `linear-gradient(90deg, #00B4B4 0%, #12a190 50%, #0e8a7a 100%)`,
                            zIndex: 1
                          }
                        }}>
                                <Box sx={{
                            background: "linear-gradient(135deg, rgba(0, 180, 180, 0.05) 0%, rgba(18, 161, 144, 0.02) 100%)",
                            p: 2.5,
                            borderBottom: "1px solid rgba(0, 180, 180, 0.1)"
                          }}>
                                  <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                                    <Box sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5
                              }}>
                                      <Box sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "linear-gradient(45deg, #00B4B4, #12a190)",
                                  boxShadow: "0 2px 8px rgba(0, 180, 180, 0.3)"
                                }} />
                                      <Typography variant="h6" sx={{
                                  fontWeight: index <= 2 ? 700 : 600,
                                  fontSize: "1.1rem",
                                  background: "linear-gradient(135deg, #131a20 0%, #2c3e50 100%)",
                                  backgroundClip: "text",
                                  WebkitBackgroundClip: "text",
                                  WebkitTextFillColor: "transparent",
                                  letterSpacing: "-0.02em"
                                }}>
                                        {city.city.name}
                                      </Typography>
                                    </Box>
                                    <Tooltip title={t("Delete")}>
                                      <IconButton sx={{
                                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                  color: "white",
                                  width: 40,
                                  height: 40,
                                  borderRadius: 2,
                                  boxShadow: "0 4px 16px rgba(239, 68, 68, 0.25)",
                                  transition: "all 0.2s ease",
                                  "&:hover": {
                                    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 6px 20px rgba(239, 68, 68, 0.35)"
                                  }
                                }} onClick={() => deleteItem(city.city._id)}>
                                        <DeleteIcon sx={{
                                    fontSize: 20
                                  }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </Box>
                              </Card>
                            </Reorder.Item>)}
                        </Reorder.Group>
                      </AnimatePresence>}
                  </Box>
                </Paper>
                <ToastContainer position="top-right" autoClose={3000} />
              </Stack>
            </Container>
          </MDBox>

          <AddCityDialog open={openDialog} onClose={handleCloseDialog} setCities={setCities} cities={cities} func={fetchCities} selectedCity={selectedCity} />
          <TitleDescriptionEditor open={openTitleDescEditor} onClose={handleCloseTitleDescEditor} onSave={handleSaveTitleDesc} initialData={titleDesc} languages={languages} />
        </Box>
      </ErrorBoundary>
    </DashboardLayout>;
}
export default CitiesMappingBlock;
