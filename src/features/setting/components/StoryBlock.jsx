import { useState, useEffect, Component } from "react";
import { useTranslation } from "react-i18next";
import AppsIcon from "@mui/icons-material/Apps";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { Box, Container, Paper, Stack, Typography, Card, CardContent, CardActions, CircularProgress, Pagination, ToggleButton, ToggleButtonGroup, IconButton, Tooltip, TextField } from "@mui/material";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
import { getStories, deleteStory, getLanguages } from "../services/serverApi.adminConfig";
import StoriesModal from "./StoriesModal-new";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
          <Typography variant="h6">Error in StoryBlock</Typography>
          <Typography>{this.state.error?.message || "Unknown error"}</Typography>
        </Box>;
    }
    return this.props.children;
  }
}
function StoryBlock() {
  const {
    t
  } = useTranslation("common");
  const [isLoading, setIsLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isFrench, setIsFrench] = useState(false);
  useEffect(() => {
    fetchStories();
    fetchLanguages();
  }, [page, limit, isFrench]);
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t("FailedToFetchLanguages"));
    }
  };
  const fetchStories = async () => {
    try {
      const response = await getStories(page, limit, true);
      if (response.storys && Array.isArray(response.storys)) {
        setStories(response.storys);
        setTotal(response.total);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      setError(t("FailedToFetchStories"));
    } finally {
      setIsLoading(false);
    }
  };
  const handleOpenModal = (story = null) => {
    setSelectedStory(story);
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setSelectedStory(null);
    setModalOpen(false);
  };
  const handleDeleteStory = async storyId => {
    if (window.confirm(t("ConfirmDeleteStory"))) {
      try {
        await deleteStory(storyId);
        setStories(prevStories => prevStories.filter(story => story._id !== storyId));
        toast.success(t("StoryDeletedSuccessfully"));
      } catch (error) {
        toast.error(t("FailedToDeleteStory"));
      }
    }
  };
  const handlePageChange = (event, newPage) => {
    setPage(newPage - 1);
  };
  const handleLimitChange = event => {
    const newLimit = Number(event.target.value);
    setLimit(newLimit);
    setPage(0);
  };
  const handleLanguageChange = (event, newValue) => {
    if (newValue !== null) {
      setIsFrench(newValue === "fr");
    }
  };
  if (error) {
    return <DashboardLayout>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </DashboardLayout>;
  }
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
                          {t("StoryBlockEditor")}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ToggleButtonGroup value={isFrench ? "fr" : "en"} exclusive onChange={handleLanguageChange} size="small" sx={{
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
                          backgroundColor: "#00B4B4",
                          color: "white",
                          "&:hover": {
                            backgroundColor: "#0e8a7a"
                          }
                        }
                      }}>
                          <ToggleButton value="en">{t("EN")}</ToggleButton>
                          <ToggleButton value="fr">{t("FR")}</ToggleButton>
                        </ToggleButtonGroup>
                        <Tooltip title={t("CreateNewStory")}>
                          <IconButton sx={{
                          backgroundColor: "#12a190",
                          color: "white !important",
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          "&:hover": {
                            backgroundColor: "#0f8a7a"
                          }
                        }} onClick={() => handleOpenModal()}>
                            <AddCircleIcon sx={{
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
                      {t("StoriesManagement")}
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
                      </Box> : <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 3,
                    mt: 3
                  }}>
                        {stories.map(story => {
                      const frenchLangId = languages.find(l => l.languageCode === "FR")?._id;
                      const englishLangId = languages.find(l => l.languageCode === "en")?._id;
                      const selectedLangId = isFrench ? frenchLangId : englishLangId;
                      const descriptionText = story.description[selectedLangId] || story.description[englishLangId] || "No description available";
                      return <Card key={story._id} sx={{
                        position: "relative",
                        borderRadius: 3,
                        overflow: "hidden",
                        background: "linear-gradient(135deg, #ffffff 0%, #f8fdfd 100%)",
                        border: "2px solid transparent",
                        backgroundClip: "padding-box",
                        boxShadow: "0 8px 32px rgba(0, 180, 180, 0.08)",
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
                                <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            mb: 1
                          }}>
                                  <Box sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "linear-gradient(45deg, #00B4B4, #12a190)",
                              boxShadow: "0 2px 8px rgba(0, 180, 180, 0.3)"
                            }} />
                                  <Typography variant="h6" sx={{
                              fontWeight: 700,
                              fontSize: "1.1rem",
                              background: "linear-gradient(135deg, #131a20 0%, #2c3e50 100%)",
                              backgroundClip: "text",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              letterSpacing: "-0.02em"
                            }}>
                                    {story.name}
                                  </Typography>
                                </Box>

                                <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                          }}>
                                  <Box sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              background: "rgba(0, 180, 180, 0.08)",
                              border: "1px solid rgba(0, 180, 180, 0.15)"
                            }}>
                                    <Box sx={{
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                backgroundColor: "#00B4B4"
                              }} />
                                    <Typography variant="body2" sx={{
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: "#00B4B4",
                                letterSpacing: "0.02em"
                              }}>
                                      {story.city}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>

                              <CardContent sx={{
                          p: 2.5
                        }}>
                                <Typography variant="body2" sx={{
                            fontSize: "0.9rem",
                            lineHeight: 1.6,
                            color: "#4a5568",
                            display: "-webkit-box",
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minHeight: "5.6rem"
                          }}>
                                  {descriptionText}
                                </Typography>
                              </CardContent>

                              <CardActions sx={{
                          justifyContent: "flex-end",
                          p: 2.5,
                          pt: 0,
                          gap: 1.5
                        }}>
                                <IconButton sx={{
                            background: "linear-gradient(135deg, #00B4B4 0%, #12a190 100%)",
                            color: "white",
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            boxShadow: "0 4px 16px rgba(0, 180, 180, 0.25)",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              background: "linear-gradient(135deg, #0e8a7a 0%, #0f7a6b 100%)",
                              transform: "translateY(-2px)",
                              boxShadow: "0 6px 20px rgba(0, 180, 180, 0.35)"
                            }
                          }} onClick={() => handleOpenModal(story)}>
                                  <EditNoteIcon sx={{
                              fontSize: 20
                            }} />
                                </IconButton>
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
                          }} onClick={() => handleDeleteStory(story._id)}>
                                  <DeleteForeverIcon sx={{
                              fontSize: 20
                            }} />
                                </IconButton>
                              </CardActions>
                            </Card>;
                    })}
                      </Box>}

                    {!isLoading && stories.length > 0 && <Box sx={{
                    mt: 3,
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 2
                  }}>
                        <Pagination count={Math.ceil(total / limit)} page={page + 1} onChange={handlePageChange} sx={{
                      "& .MuiPaginationItem-root": {
                        fontSize: 12.7,
                        color: "#131a20",
                        "&.Mui-selected": {
                          backgroundColor: "#12a190",
                          color: "white",
                          "&:hover": {
                            backgroundColor: "#0f8a7a"
                          }
                        }
                      }
                    }} />
                        <TextField select value={limit} onChange={handleLimitChange} size="small" sx={{
                      width: 80
                    }} SelectProps={{
                      native: true
                    }}>
                          {[10, 20, 50].map(option => <option key={option} value={option}>
                              {option}
                            </option>)}
                        </TextField>
                      </Box>}
                  </Box>
                </Paper>
              </Stack>
            </Container>
            <ToastContainer position="top-right" autoClose={3000} />
            <StoriesModal open={modalOpen} onClose={handleCloseModal} setStories={setStories} story={selectedStory} />
          </MDBox>
        </Box>
      </ErrorBoundary>
    </DashboardLayout>;
}
export default StoryBlock;
