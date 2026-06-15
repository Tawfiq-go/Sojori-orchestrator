import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Added for translations
import { getStayMore, updateStayMore } from '../services/serverApi.adminConfig';
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import { TextField, Button, Typography, Paper, Grid, Snackbar, CircularProgress, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const StyledButton = styled(Button)({
  background: 'linear-gradient(135deg, #E6B022 0%, #B8881A 100%)',
  color: 'white',
  padding: '8px 24px',
  borderRadius: '8px',
  height: '42px',
  fontWeight: 600,
  fontSize: '14px',
  textTransform: 'none',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
    background: 'linear-gradient(135deg, #B8881A 0%, #E6B022 100%)'
  },
  '&:active': {
    transform: 'translateY(0)'
  },
  '&:disabled': {
    background: SOJORI_COLORS.gray[500],
    color: 'white',
    transform: 'none',
    boxShadow: 'none'
  }
});
const AddButton = styled(Button)({
  borderColor: SOJORI_COLORS.primary,
  color: SOJORI_COLORS.primary,
  padding: '8px 24px',
  borderRadius: '8px',
  height: '42px',
  fontWeight: 600,
  fontSize: '14px',
  textTransform: 'none',
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: SOJORI_COLORS.primaryDark,
    backgroundColor: SOJORI_COLORS.primaryPale,
    transform: 'translateY(-1px)'
  }
});
const StayMore = () => {
  const {
    t
  } = useTranslation('common'); // Added for translations
  const [stayMoreDiscounts, setStayMoreDiscounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: ''
  });
  const [stayMoreId, setStayMoreId] = useState(null);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const data = await getStayMore();
      setStayMoreDiscounts(data.stayMore || []);
      setStayMoreId(data._id);
    } catch (error) {
      setStayMoreDiscounts([]);
      setSnackbar({
        open: true,
        message: t('Error fetching data. Please try again.')
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddStayMoreDiscount = () => {
    setStayMoreDiscounts([...stayMoreDiscounts, {
      night: 0,
      discount: 0
    }]);
  };
  const handleDeleteStayMoreDiscount = index => {
    const updatedDiscounts = stayMoreDiscounts.filter((_, i) => i !== index);
    setStayMoreDiscounts(updatedDiscounts);
  };
  const handleStayMoreDiscountChange = (index, field, value) => {
    const updatedDiscounts = [...stayMoreDiscounts];
    updatedDiscounts[index][field] = Number(value);
    setStayMoreDiscounts(updatedDiscounts);
  };
  const handleSave = async () => {
    if (!stayMoreId) {
      setSnackbar({
        open: true,
        message: t('Error: No ID available for update.')
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateStayMore(stayMoreId, {
        stayMore: stayMoreDiscounts
      });
      setSnackbar({
        open: true,
        message: t('Changes saved successfully!')
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: t('Error saving changes. Please try again.')
      });
    } finally {
      setIsSaving(false);
    }
  };
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  if (isLoading) {
    return <div>{t('Loading...')}</div>;
  }
  return <DashboardLayout>
            
            <div>
                <Paper elevation={3} sx={{
        p: 3,
        mb: 4
      }}>
                <Box className="flex justify-end items-center !mb-[50px]">
                    <Box className="flex gap-2">
                        <AddButton startIcon={<AddIcon />} onClick={handleAddStayMoreDiscount} variant="outlined" size="small">
                            {t('Add Discount')}
                        </AddButton>
                        <StyledButton startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} onClick={handleSave} className="!text-white" disabled={isSaving}>
                            {isSaving ? t('Saving...') : t('Save Changes')}
                        </StyledButton>

                    </Box>
                </Box>
                    {stayMoreDiscounts.map((discount, index) => <Grid container spacing={2} className='flex justify-center w-full' key={index} sx={{
          mb: 2
        }}>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth type="number" label={t('Nights')} variant="outlined" value={discount.night} onChange={e => handleStayMoreDiscountChange(index, 'night', e.target.value)} inputProps={{
              min: 0
            }} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth type="number" label={t('Discount (%)')} variant="outlined" value={discount.discount} onChange={e => handleStayMoreDiscountChange(index, 'discount', e.target.value)} inputProps={{
              min: 0,
              max: 100
            }} />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <Button onClick={() => handleDeleteStayMoreDiscount(index)} variant="contained" color="error" startIcon={<DeleteIcon />}>
                                </Button>
                            </Grid>
                        </Grid>)}

                    

                </Paper>
            </div>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} message={snackbar.message} />
        </DashboardLayout>;
};
export default StayMore;
