import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import AddCircle from "@mui/icons-material/AddCircle";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import EditNoteIcon from "@mui/icons-material/EditNote";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import { Box, Button, Card, CardContent, Chip, Paper, Stack, Switch, ToggleButtonGroup, ToggleButton, Typography, Container, IconButton, Tooltip, ListItemSecondaryAction, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField } from "@mui/material";
import { PlusCircle, Eye, EyeOff } from "lucide-react";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getSlides, getLanguages, createSlide, updateSlide, deleteSlide } from "../services/serverApi.adminConfig";
import AddSlideDialog from "./AddSlide-new.component";
import ModifySlideTopDialog from "./ModifySlideTop-new.component";
import ModifySlideDialog from "./ModifySlide-new.component";
import UpdateSlideDialog from "./UpdateSlideDialog-new";
import defaultImage from 'assets/images/image_placeholder.jpg';
const MainContentSection = ({
  slideShow,
  setSlideShow,
  languages
}) => {
  const {
    t
  } = useTranslation("common");
  const [title, setTitle] = useState(slideShow.title || {});
  const [description, setDescription] = useState(slideShow.description || {});
  const englishLang = languages.find(lang => lang.languageCode.toLowerCase() === 'en') || languages[0] || {};
  const frenchLang = languages.find(lang => lang.languageCode.toLowerCase() === 'fr') || languages[1] || {};
  const [isFrench, setIsFrench] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openModifyDialog, setOpenModifyDialog] = useState(false);
  const [openModifySlideDialog, setOpenModifySlideDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(null);
  const selectedLanguage = isFrench ? frenchLang?._id : englishLang?._id;
  useEffect(() => {
    setTitle(slideShow.title || {});
    setDescription(slideShow.description || {});
  }, [slideShow, languages]);
  const handleUpdateSlideField = (index, field, value) => {
    const updatedSlides = [...(slideShow.slides || [])];
    updatedSlides[index][field] = {
      ...updatedSlides[index][field],
      [selectedLanguage]: value
    };
    setSlideShow(prev => ({
      ...prev,
      slides: updatedSlides
    }));
  };
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  const handleOpenModifyDialog = () => {
    setOpenModifyDialog(true);
  };
  const handleCloseModifyDialog = () => {
    setOpenModifyDialog(false);
  };
  const handleOpenModifySlideDialog = (slide, slideIndex) => {
    setSelectedSlide(slide);
    setSelectedSlideIndex(slideIndex);
    setOpenModifySlideDialog(true);
  };
  const handleCloseModifySlideDialog = () => {
    setOpenModifySlideDialog(false);
    setSelectedSlide(null);
    setSelectedSlideIndex(null);
  };
  const handleOpenUpdateDialog = () => {
    setOpenUpdateDialog(true);
  };
  const handleCloseUpdateDialog = () => {
    setOpenUpdateDialog(false);
  };
  const handleCreateSlide = async newSlideData => {
    try {
      const response = await createSlide(newSlideData);
      if (response.data && response.data.slideShowConfig) {
        const newSlide = response.data.slideShowConfig;
        setSlideShow(prev => ({
          ...prev,
          slides: [...(prev.slides || []), newSlide]
        }));
        toast.success(t("Slide created successfully"));
      }
    } catch (error) {
      toast.error(t("Failed to create slide"));
    } finally {
      handleCloseDialog();
    }
  };
  const handleSlideEnabledToggle = async (slide, slideIndex) => {
    try {
      const updatedSlides = [...(slideShow.slides || [])];
      updatedSlides[slideIndex] = {
        ...slide,
        enabled: !slide.enabled
      };
      const updatedSlideShow = {
        ...slideShow,
        slides: updatedSlides
      };
      const response = await updateSlide(slideShow._id, updatedSlideShow);
      if (response.data && response.data.slideShowConfig) {
        setSlideShow(response.data.slideShowConfig);
        toast.success(t(slide.enabled ? "Slide disabled successfully" : "Slide enabled successfully"));
      }
    } catch (error) {
      toast.error(t("Failed to toggle slide enabled status"));
    }
  };
  const handleIsMainToggle = async () => {
    try {
      const updatedSlideShow = {
        ...slideShow,
        isMain: !slideShow.isMain
      };
      const response = await updateSlide(slideShow._id, updatedSlideShow);
      if (response.data && response.data.slideShowConfig) {
        setSlideShow(response.data.slideShowConfig);
        toast.success(t("Main status updated successfully"));
      }
    } catch (error) {
      toast.error(t("Failed to update main status"));
    }
  };
  const confirmDelete = () => {
    setDeleteConfirmOpen(true);
  };
  const handleDelete = async () => {
    try {
      await deleteSlide(slideShow._id);
      setSlideShow({
        title: {},
        description: {},
        slides: [],
        isMain: true
      });
      toast.success(t("Slide show deleted successfully"));
    } catch (error) {
      toast.error(t("Failed to delete slideshow"));
    } finally {
      setDeleteConfirmOpen(false);
    }
  };
  const confirmSlideDelete = async (slideId, slideIndex) => {
    if (window.confirm(t("Are you sure you want to delete this slide?"))) {
      try {
        const updatedSlides = (slideShow.slides || []).filter((_, i) => i !== slideIndex);
        const updatedSlideShow = {
          ...slideShow,
          slides: updatedSlides
        };
        const response = await updateSlide(slideShow._id, updatedSlideShow);
        if (response.data && response.data.slideShowConfig) {
          setSlideShow(response.data.slideShowConfig);
          toast.success(t("Slide deleted successfully"));
        }
      } catch (error) {
        toast.error(t("Failed to delete slide"));
      }
    }
  };
  const renderMultiLanguageContent = (content, fallback) => {
    if (typeof content !== "object") {
      const value = content || fallback;
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    const selected = content[selectedLanguage] || Object.values(content)[0] || fallback;
    return selected.charAt(0).toUpperCase() + selected.slice(1);
  };
  return <Paper elevation={1} sx={{
    maxWidth: 976,
    width: "100%",
    mx: "auto",
    borderRadius: 2,
    border: "1px solid",
    borderColor: "grey.300",
    overflow: "hidden"
  }}>
      <Box sx={{
      background: "linear-gradient(90deg, rgba(18,161,144,0.15) 0%, rgba(18,161,144,0.05) 50%, rgba(18,161,144,0) 100%)",
      borderBottom: "1px solid",
      borderColor: "grey.300",
      p: 2
    }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={600} color="text.primary">
            {t("Hero Slider Editor")}
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
              py: 0.5
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
            <Button variant="contained" className="!bg-medium-aquamarine text-white" endIcon={<AddCircle />} onClick={handleOpenDialog} sx={{
            textTransform: "none",
            fontWeight: 500,
            height: 36
          }}>
              {t("Create Slide")}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{
      p: 3
    }}>
        <Stack spacing={3}>
          <Box sx={{
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: 2,
          p: 2
        }}>
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
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1
            }}>
                <Tooltip title={t("Add new slide")}>
                  <IconButton sx={{
                  backgroundColor: "#00B4B4",
                  color: "white",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  "&:hover": {
                    backgroundColor: "#0e8a7a"
                  },
                  mr: 1
                }} onClick={handleOpenUpdateDialog} aria-label={t("Add new slide")}>
                    <PlusCircle size={20} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("Edit slideshow")}>
                  <IconButton sx={{
                  backgroundColor: "#00B4B4",
                  color: "white",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  "&:hover": {
                    backgroundColor: "#0e8a7a"
                  },
                  mr: 1
                }} onClick={handleOpenModifyDialog} aria-label={t("Edit slideshow")}>
                    <EditNoteIcon sx={{
                    fontSize: 20
                  }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("Delete slideshow")}>
                  <IconButton sx={{
                  backgroundColor: "#00B4B4",
                  color: "white",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  "&:hover": {
                    backgroundColor: "#0e8a7a"
                  },
                  mr: 1
                }} onClick={confirmDelete} aria-label={t("Delete slideshow")}>
                    <DeleteForeverIcon sx={{
                    fontSize: 20
                  }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={slideShow.isMain ? t("Set as secondary") : t("Set as main")}>
                  <Switch checked={slideShow.isMain} onChange={handleIsMainToggle} sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#00B4B4"
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#00B4B4"
                  }
                }} icon={<EyeOff size={20} />} checkedIcon={<Eye size={20} />} inputProps={{
                  'aria-label': t('Set as main')
                }} />
                </Tooltip>
              </Box>
              <Stack direction="column" spacing={1}>
                <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                  <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                  width: 80
                }}>
                    {t("Title")}:
                  </Typography>
                  <Box sx={{
                  flexGrow: 1,
                  maxWidth: 600
                }}>
                    <TextField value={renderMultiLanguageContent(title, "")} variant="outlined" size="small" multiline maxRows={4} InputProps={{
                    readOnly: true
                  }} sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: 'text.primary',
                      cursor: 'pointer',
                      borderRadius: 1
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'grey.300'
                    }
                  }} inputProps={{
                    'aria-label': t('Title')
                  }} />
                  </Box>
                </Box>
                <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                  <Typography variant="body2" fontWeight={700} color="text.primary" sx={{
                  width: 80
                }}>
                    {t("Description")}:
                  </Typography>
                  <Box sx={{
                  flexGrow: 1,
                  maxWidth: 600
                }}>
                    <TextField value={renderMultiLanguageContent(description, "")} variant="outlined" size="small" multiline maxRows={4} InputProps={{
                    readOnly: true
                  }} sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: 'text.primary',
                      cursor: 'pointer',
                      borderRadius: 1
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'grey.300'
                    }
                  }} inputProps={{
                    'aria-label': t('Description')
                  }} />
                  </Box>
                </Box>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: 2,
          p: 2
        }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <ImageIcon sx={{
                fontSize: 20,
                color: "#00B4B4"
              }} />
                <Typography variant="body2" fontWeight={500} color="text.primary">
                  {t("Slides")}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t("PNG/JPG")}
              </Typography>
            </Stack>
            <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 3,
            mt: 2
          }}>
              {(slideShow.slides || []).map((slide, index) => <Card key={slide._id || index} sx={{
              background: "linear-gradient(90deg, rgba(18,161,144,0.05) 0%, rgba(18,161,144,0) 100%)",
              border: "1px solid",
              borderColor: "grey.300",
              borderRadius: 3,
              position: "relative"
            }}>
                  <CardContent sx={{
                p: 1
              }}>
                    <Box sx={{
                  position: "relative",
                  mb: 1
                }}>
                      <Box sx={{
                    height: 112,
                    width: "100%",
                    maxWidth: "100%",
                    backgroundColor: "rgba(241, 245, 249, 0.4)",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(18, 161, 144, 0.2)",
                    backgroundImage: `url(${slide.imageUrl || defaultImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}>
                        <CameraAltIcon sx={{
                      fontSize: 20,
                      color: "grey.500"
                    }} />
                      </Box>
                      <Chip label={renderMultiLanguageContent(slide.title, `Slide ${index + 1}`)} size="small" sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    backgroundColor: "rgba(18, 161, 144, 0.9)",
                    color: "white",
                    fontSize: "0.6rem",
                    fontWeight: 400,
                    height: 19
                  }} />
                    </Box>
                    <Stack spacing={1} sx={{
                  mt: 2
                }}>
                      <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {t("Title")}:
                        </Typography>
                        <Typography variant="body2" fontWeight={400} color="text.primary">
                          {renderMultiLanguageContent(slide.title, "No Title")}
                        </Typography>
                      </Box>
                      <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {t("Description")}:
                        </Typography>
                        <Typography variant="body2" fontWeight={400} color="text.primary">
                          {renderMultiLanguageContent(slide.description, "No Description")}
                        </Typography>
                      </Box>
                    </Stack>
                    <ListItemSecondaryAction sx={{
                  position: "absolute",
                  top: 8,
                  right: 8
                }}>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={slide.enabled ? t("Disable slide") : t("Enable slide")}>
                          <IconButton sx={{
                        backgroundColor: "#00B4B4",
                        color: "white",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        "&:hover": {
                          backgroundColor: "#0e8a7a"
                        }
                      }} onClick={() => handleSlideEnabledToggle(slide, index)} aria-label={slide.enabled ? t("Disable slide") : t("Enable slide")}>
                            {slide.enabled ? <ToggleOnIcon sx={{
                          fontSize: 20
                        }} /> : <ToggleOffIcon sx={{
                          fontSize: 20
                        }} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("Edit slide")}>
                          <IconButton sx={{
                        backgroundColor: "#00B4B4",
                        color: "white",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        "&:hover": {
                          backgroundColor: "#0e8a7a"
                        }
                      }} aria-label={t("Edit slide")} onClick={() => handleOpenModifySlideDialog(slide, index)}>
                            <EditNoteIcon sx={{
                          fontSize: 20
                        }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("Delete slide")}>
                          <IconButton sx={{
                        backgroundColor: "#00B4B4",
                        color: "white",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        "&:hover": {
                          backgroundColor: "#0e8a7a"
                        }
                      }} aria-label={t("Delete slide")} onClick={() => confirmSlideDelete(slide._id, index)}>
                            <DeleteForeverIcon sx={{
                          fontSize: 20
                        }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </ListItemSecondaryAction>
                  </CardContent>
                </Card>)}
            </Box>
          </Box>
        </Stack>
      </Box>

      <AddSlideDialog open={openDialog} onClose={handleCloseDialog} onSave={handleCreateSlide} languages={languages} selectedLanguage={selectedLanguage} />
      <ModifySlideTopDialog open={openModifyDialog} onClose={handleCloseModifyDialog} slidesItems={[slideShow]} setSlidesItems={([newSlide]) => setSlideShow(newSlide)} selectedTop={slideShow} topIndex={0} />
      <ModifySlideDialog open={openModifySlideDialog} onClose={handleCloseModifySlideDialog} slidesItems={[slideShow]} setSlidesItems={([newSlide]) => setSlideShow(newSlide)} selectedM={selectedSlide} mIndex={selectedSlideIndex} mainIndex={0} />
      <UpdateSlideDialog open={openUpdateDialog} onClose={handleCloseUpdateDialog} slideData={slideShow} setSlidesItems={newSlide => setSlideShow(newSlide)} slideIndex={0} />
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">{t("Confirm Deletion")}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("Are you sure you want to delete this slideshow? This action cannot be undone.")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>{t('Cancel')}</Button>
          <Button onClick={handleDelete} autoFocus>{t('Confirm')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>;
};
function SliderBlock() {
  const {
    t
  } = useTranslation("common");
  const [slideShow, setSlideShow] = useState({
    title: {},
    description: {},
    slides: [],
    isMain: true
  });
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [slidesData, languagesData] = await Promise.all([getSlides(), getLanguages()]);
        const mainSlideShow = slidesData?.data?.slideShowConfig.find(s => s.isMain) || {
          title: {},
          description: {},
          slides: [],
          isMain: true
        };
        setSlideShow(mainSlideShow);
        setLanguages(languagesData || []);
      } catch (error) {
        toast.error(t("Failed to load data. Please try again."));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
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
          maxWidth: 1423,
          px: 0
        }}>
            <Stack spacing={7} sx={{
            py: 7
          }}>
              <ToastContainer position="top-right" autoClose={3000} />
              {loading && <Typography variant="body1" align="center">
                  {t("Loading...")}
                </Typography>}
              {!loading && <MainContentSection slideShow={slideShow} setSlideShow={setSlideShow} languages={languages} />}
            </Stack>
          </Container>
        </MDBox>
      </Box>
    </DashboardLayout>;
}
export default SliderBlock;
