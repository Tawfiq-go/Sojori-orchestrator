import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Reorder, AnimatePresence } from 'framer-motion';
import { Box, Grid, Card, CardContent, Typography, TableContainer, Paper, CircularProgress, IconButton, Button } from '@mui/material';
import { getcitiesMappig, updateCitiesMapping, getLanguages } from '../services/serverApi.adminConfig';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import AddCityDialog from './AddCityMapping.component';
import TitleDescriptionEditor from './TitleDescriptionEditor';
import { ToastContainer, toast } from 'react-toastify';
import EditButton from './EditButton';
function CitiesMap() {
  const {
    t
  } = useTranslation('common');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTitleDescEditor, setOpenTitleDescEditor] = useState(false);
  const [titleDesc, setTitleDesc] = useState({
    title: {},
    description: {}
  });
  const [languages, setLanguages] = useState([]);
  const fetchCities = async () => {
    try {
      const response = await getcitiesMappig();
      setCities(response?.data?.citiesMapping);
      setTitleDesc({
        title: response?.data?.title || {},
        description: response?.data?.description || {}
      });
    } catch (error) {
      toast.error(t("Failed to fetch cities data"));
    } finally {
      setLoading(false);
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
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);
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
  return <Grid>
      <ToastContainer position="top-right" autoClose={3000} />
      <Box sx={{
      width: '100%',
      padding: 3
    }}>
        <Card elevation={3} sx={{
        padding: 3,
        marginBottom: 3
      }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
            <Typography variant="h4" fontWeight="bold" className="text-black">
              {t('Cities Mapping')}
            </Typography>
            <Box>
              <Button startIcon={<AddIcon />} variant="contained" className="!bg-medium-aquamarine !text-white" onClick={handleOpenDialog}>
                {t('Add City')}
              </Button>
            </Box>
          </Box>
          <EditButton onClick={handleOpenTitleDescEditor} sx={{
          marginRight: 2
        }} className="!mb-2" />


          {loading ? <Box display="flex" justifyContent="center" padding={4}>
              <CircularProgress />
            </Box> : <TableContainer component={Paper} elevation={0} sx={{
          bgcolor: 'transparent',
          '& .css-15g8l2o-MuiCardContent-root': {
            padding: '16px !important'
          }
        }}>
              <AnimatePresence>
                <Reorder.Group axis="y" values={cities} onReorder={handleReorder}>
                  {cities.map((item, index) => <Item key={item.city._id} item={item} index={index} onDelete={deleteItem} />)}
                </Reorder.Group>
              </AnimatePresence>
            </TableContainer>}
        </Card>
      </Box>
      <AddCityDialog open={openDialog} onClose={handleCloseDialog} setCities={setCities} cities={cities} func={fetchCities} />
      <TitleDescriptionEditor open={openTitleDescEditor} onClose={handleCloseTitleDescEditor} onSave={handleSaveTitleDesc} initialData={titleDesc} languages={languages} />
    </Grid>;
}
const Item = ({
  item,
  onDelete,
  index
}) => {
  const isTopCity = index <= 2;
  return <Reorder.Item value={item} initial={{
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
      <Card elevation={1} sx={{
      marginBottom: 2,
      backgroundColor: isTopCity ? '#e3f2fd' : 'white',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: 3
      }
    }}>
        <CardContent sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
          <Typography variant="body1" sx={{
          fontWeight: isTopCity ? 'bold' : 'normal'
        }}>
            {item.city.name}
          </Typography>
          <IconButton onClick={() => onDelete(item.city._id)} color="error" size="small">
            <DeleteIcon />
          </IconButton>
        </CardContent>
      </Card>
    </Reorder.Item>;
};
export default CitiesMap;
