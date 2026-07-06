import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Card, CardContent, Typography, Button, Grid, Switch, IconButton, Divider, List, ListItem, ListItemText, ListItemSecondaryAction, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tooltip, CircularProgress, Skeleton, useMediaQuery, useTheme } from '@mui/material';
import { PlusCircle, Edit, Trash2, Eye, EyeOff, ImagePlus, House } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddSlideDialog from './AddSlide.component';
import ModifySlideTopDialog from './ModifySlideTop.component';
import ModifySlideDialog from './ModifySlide.component';
import UpdateSlideDialog from './UpdateSlideDialog';
import { getSlides, getcities, updateSlide, deleteSlide, getLanguages } from '../services/serverApi.adminConfig';
const SlidesTable = () => {
  const {
    t
  } = useTranslation('common');
  const [slidesItems, setSlidesItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDialogTop, setOpenDialogTop] = useState(false);
  const [openDialogM, setOpenDialogM] = useState(false);
  const [topIndex, setTopIndex] = useState(null);
  const [mIndex, setMIndex] = useState(null);
  const [selectedTop, setSelectedTop] = useState(null);
  const [selectedM, setSelectedM] = useState(null);
  const [cities, setCities] = useState([]);
  const [mainIndex, setMainIndex] = useState(null);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [selectedSlideShow, setSelectedSlideShow] = useState(null);
  const [selectedSlideShowIndex, setSelectedSlideShowIndex] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [languages, setLanguages] = useState([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [slidesData, citiesData, languagesData] = await Promise.all([getSlides(), getcities(), getLanguages()]);
        setSlidesItems(slidesData?.data?.slideShowConfig || []);
        setCities(citiesData?.data.cities || []);
        setLanguages(languagesData || []);
      } catch (error) {
        toast.error(t("Failed to load data. Please try again."));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);
  const handleOpenDialogTop = (data, index) => {
    setOpenDialogTop(true);
    setSelectedTop(data);
    setTopIndex(index);
  };
  const handleCloseDialogTop = () => setOpenDialogTop(false);
  const handleOpenDialogM = (data, index, mainIndex) => {
    setOpenDialogM(true);
    setSelectedM(data);
    setMIndex(index);
    setMainIndex(mainIndex);
  };
  const handleCloseDialogM = () => setOpenDialogM(false);
  const handleOpenUpdateDialog = (slideShow, index) => {
    setOpenUpdateDialog(true);
    setSelectedSlideShow(slideShow);
    setSelectedSlideShowIndex(index);
  };
  const handleCloseUpdateDialog = () => {
    setOpenUpdateDialog(false);
    setSelectedSlideShow(null);
    setSelectedSlideShowIndex(null);
  };
  const handleIsMainToggle = async (item, index) => {
    try {
      const updatedItem = {
        ...item,
        isMain: !item.isMain
      };
      const response = await updateSlide(item._id, updatedItem);
      if (response.data && response.data.slideShowConfig) {
        const newSlidesItems = [...slidesItems];
        newSlidesItems[index] = response.data.slideShowConfig;
        setSlidesItems(newSlidesItems);
        toast.success(t("Main status updated successfully"));
      }
    } catch (error) {
      toast.error(t("Failed to update main status"));
    }
  };
  const handleSlideEnabledToggle = async (slideItem, slideIndex, mainIndex) => {
    try {
      const updatedSlidesItems = [...slidesItems];
      const updatedSlide = {
        ...slideItem,
        enabled: !slideItem.enabled
      };
      updatedSlidesItems[mainIndex].slides[slideIndex] = updatedSlide;
      const response = await updateSlide(updatedSlidesItems[mainIndex]._id, updatedSlidesItems[mainIndex]);
      if (response.data && response.data.slideShowConfig) {
        setSlidesItems(prevState => {
          const newState = [...prevState];
          newState[mainIndex] = response.data.slideShowConfig;
          return newState;
        });
        toast.success(t("Slide status updated successfully"));
      }
    } catch (error) {
      toast.error(t("Failed to update slide status"));
    }
  };
  const confirmDelete = (id, type) => {
    setItemToDelete({
      id,
      type
    });
    setDeleteConfirmOpen(true);
  };
  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'slideshow') {
        await deleteSlide(itemToDelete.id);
        setSlidesItems(prevSlides => prevSlides.filter(slide => slide._id !== itemToDelete.id));
        toast.success(t("Slide show deleted successfully"));
      } else if (itemToDelete.type === 'slide') {
        const slideShow = slidesItems.find(item => item.slides.some(slide => slide._id === itemToDelete.id));
        if (slideShow) {
          const updatedSlides = slideShow.slides.filter(slide => slide._id !== itemToDelete.id);
          const updatedSlideShow = {
            ...slideShow,
            slides: updatedSlides
          };
          const response = await updateSlide(slideShow._id, updatedSlideShow);
          if (response.data && response.data.slideShowConfig) {
            setSlidesItems(prevState => prevState.map(item => item._id === slideShow._id ? response.data.slideShowConfig : item));
            toast.success(t("Slide deleted successfully"));
          }
        }
      }
    } catch (error) {
      toast.error(t("Failed to delete item"));
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };
  const addSlide = newSlide => {
    setSlidesItems(prevSlides => [...prevSlides, newSlide]);
    handleCloseDialog();
  };
  const renderMultiLanguageContent = content => {
    if (typeof content !== 'object') {
      return <span>{content}</span>;
    }
    const descriptions = Object.entries(content).map(([langId, text]) => {
      const language = languages.find(lang => lang._id === langId);
      const truncatedText = text.length > 50 ? `${text.substring(0, 40)}...` : text;
      const fullText = `${language ? language.name : 'Unknown'}: ${text}`;
      return <Tooltip key={langId} title={fullText} arrow>
          <span style={{
          display: 'inline-block',
          marginRight: '8px'
        }}>
            <span className="text-sm font-bold">{language ? language.name : 'Unknown'}:</span> {truncatedText}
          </span>
        </Tooltip>;
    });
    return <span>{descriptions.reduce((prev, curr) => [prev, '| ', curr])}</span>;
  };
  const renderSlideItem = (slide, slideIndex, mainIndex) => <ListItem key={slideIndex} divider>
      <Box sx={{
      display: 'flex',
      alignItems: 'center',
      width: '100%'
    }}>
        <Box sx={{
        flexShrink: 0,
        m: 1
      }}>
          {slide.imageUrl ? <img src={slide.imageUrl} alt={typeof slide.title === 'object' ? Object.values(slide.title)[0] : slide.title} style={{
          width: '100px',
          height: '60px',
          objectFit: 'cover',
          borderRadius: '4px'
        }} /> : <Box sx={{
          width: '100px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.200',
          borderRadius: '4px'
        }}>
              <ImagePlus size={24} color={theme.palette.text.secondary} />
            </Box>}
        </Box>
        <Box sx={{
        flexGrow: 1
      }}>
          <Box className="flex items-center">
          <Typography color="textSecondary" className="!font-medium !text-base">
              {renderMultiLanguageContent(slide.title)}
            </Typography>
          </Box>

          <Box className='flex items-center gap-1'>
            <House size={14} className='text-green-500' />
            <span className='text-xs text-green-600'>{cities.find(city => city._id === slide.cityId)?.name || '-'}</span>
          </Box>
          
          <Typography color="textSecondary" className="!text-sm">
            {renderMultiLanguageContent(slide.description)}
          </Typography>
        </Box>
      </Box>
      <ListItemSecondaryAction>
        <Tooltip title={slide.enabled ? t("Disable slide") : t("Enable slide")}>
          <IconButton edge="end" onClick={() => handleSlideEnabledToggle(slide, slideIndex, mainIndex)} aria-label={slide.enabled ? t("Disable slide") : t("Enable slide")}>
            {slide.enabled ? <Eye size={20} /> : <EyeOff size={20} />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t("Edit slide")}>
          <IconButton edge="end" aria-label={t("Edit slide")} onClick={() => handleOpenDialogM(slide, slideIndex, mainIndex)}>
            <Edit size={20} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t("Delete slide")}>
          <IconButton edge="end" aria-label={t("Delete slide")} onClick={() => confirmDelete(slide._id, 'slide')}>
            <Trash2 size={20} />
          </IconButton>
        </Tooltip>
      </ListItemSecondaryAction>
    </ListItem>;
  const renderSlideShow = (item, index) => <Grid item xs={12} key={index}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography color="textSecondary" className="!font-medium !text-base">
              {renderMultiLanguageContent(item.title)}
            </Typography>
            <Box>
              <Tooltip title={t("Add new slide")}>
                <IconButton onClick={() => handleOpenUpdateDialog(item, index)} aria-label={t("Add new slide")}>
                  <PlusCircle size={24} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("Edit slideshow")}>
                <IconButton onClick={() => handleOpenDialogTop(item, index)} aria-label={t("Edit slideshow")}>
                  <Edit size={24} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("Delete slideshow")}>
                <IconButton onClick={() => confirmDelete(item._id, 'slideshow')} aria-label={t("Delete slideshow")}>
                  <Trash2 size={24} />
                </IconButton>
              </Tooltip>
              <Tooltip title={item.isMain ? t("Set as secondary") : t("Set as main")}>
                <Switch checked={item.isMain} onChange={() => handleIsMainToggle(item, index)} slotProps={{
              htmlInput: { 'aria-label': t('Set as main') }
            }} />
              </Tooltip>
              </Box>
          </Box>
          <Typography color="textSecondary" className="!text-sm">
            {renderMultiLanguageContent(item.description)}
          </Typography>
          <Divider />
          <List>
            {item.slides.map((slide, slideIndex) => renderSlideItem(slide, slideIndex, index))}
          </List>
        </CardContent>
    </Grid>;
  return <Card sx={{
    padding: 3
  }}>
      <Grid container justifyContent="space-between" alignItems="center" sx={{
      mb: 3
    }}>
        <Typography variant="h4" component="h1">{t('SlideShow Management')}</Typography>
        <Button variant="contained" className="!bg-medium-aquamarine text-white" endIcon={<PlusCircle />} onClick={handleOpenDialog}>
          {t('Create SlideShow')}
        </Button>
      </Grid>

      <ToastContainer position="top-right" autoClose={3000} />

      {loading ? <Grid container spacing={3}>
          {[1, 2, 3].map(item => <Grid item xs={12} key={item}>
              <Skeleton variant="rectangular" width="100%" height={200} />
            </Grid>)}
        </Grid> : slidesItems.length > 0 ? <Grid container spacing={3}>
          {slidesItems.map((item, index) => renderSlideShow(item, index))}
        </Grid> : <Typography variant="body1" align="center">{t('No slideshows available. Create one to get started!')}</Typography>}

      <AddSlideDialog open={openDialog} onClose={handleCloseDialog} addSlide={addSlide} />
      <ModifySlideTopDialog open={openDialogTop} onClose={handleCloseDialogTop} slidesItems={slidesItems} setSlidesItems={setSlidesItems} selectedTop={selectedTop} topIndex={topIndex} />
      <ModifySlideDialog open={openDialogM} onClose={handleCloseDialogM} slidesItems={slidesItems} setSlidesItems={setSlidesItems} selectedM={selectedM} mIndex={mIndex} mainIndex={mainIndex} />
      <UpdateSlideDialog open={openUpdateDialog} onClose={handleCloseUpdateDialog} slideData={selectedSlideShow} setSlidesItems={setSlidesItems} slideIndex={selectedSlideShowIndex} />

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">{t("Confirm Deletion")}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t(`Are you sure you want to delete this ${itemToDelete?.type}? This action cannot be undone.`)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            {t('Cancel')}
          </Button>
          <Button onClick={handleDelete} color="primary" autoFocus>
            {t('Confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>;
};
export default SlidesTable;
