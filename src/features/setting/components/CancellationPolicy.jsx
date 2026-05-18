import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Added for translations
import { toast } from 'react-toastify';
import { CircularProgress, Typography, Button, Card, CardContent, CardActions, Divider, Box, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import TranslateIcon from '@mui/icons-material/Translate';
import { getCancellationPolicy, getLanguages } from '../services/serverApi.adminConfig';
import CancellationPolicyModal from './CancellationPolicyModal';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const StyledButton = styled(Button)({
  background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
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
    background: 'linear-gradient(135deg, #E55A2B 0%, #FF6B35 100%)'
  },
  '&:active': {
    transform: 'translateY(0)'
  }
});
const CancellationPolicy = () => {
  const {
    t
  } = useTranslation('common'); // Added for translations
  const [isLoading, setIsLoading] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [languages, setLanguages] = useState([]);
  useEffect(() => {
    fetchCancellationPolicy();
    fetchLanguages();
  }, []);
  const fetchCancellationPolicy = async () => {
    setIsLoading(true);
    try {
      const response = await getCancellationPolicy();
      if (response.data.sucess) {
        setPolicy(response.data.data);
      } else {
        toast.error(response.data.message || t('Failed to fetch cancellation policy'));
        setPolicy(null);
      }
    } catch (error) {
      toast.error(t('Failed to fetch cancellation policy'));
      setPolicy(null);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t('Failed to fetch languages'));
    }
  };
  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);
  if (isLoading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>;
  }
  return <Box sx={{}}>
            {policy ? <>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            {t('Cancellation Policy')}
                        </Typography>
                        <Divider sx={{
          my: 2
        }} />
                        <Typography variant="subtitle1" gutterBottom>
                            {t('Days Before Check-in: ')}{policy.daysBeforCheckin || t('N/A')}
                        </Typography>
                        <Typography variant="h6" sx={{
          mt: 2,
          mb: 1
        }}>
                            {t('Description:')}
                        </Typography>
                        {Object.entries(policy.cancellationDescription).map(([langId, text]) => <Box key={langId} sx={{
          mb: 1
        }}>
                                <Chip icon={<TranslateIcon />} className='text-gray-600' label={languages.find(lang => lang._id === langId)?.name || t('Unknown')} color={"default"} sx={{
            mr: 1
          }} />
                                <Typography variant="body2" sx={{
            mt: 1
          }}>
                                    {text}
                                </Typography>
                            </Box>)}
                    </CardContent>
                    <CardActions className="justify-center">
                        <StyledButton startIcon={<EditIcon />} onClick={handleOpenModal} className="!text-white">
                            {t('Edit Policy')}
                        </StyledButton>
                    </CardActions>
                </> : <Card elevation={3}>
                    <CardContent>
                        <Typography variant="h6" align="center" gutterBottom>
                            {t('No Cancellation Policy Set')}
                        </Typography>
                        <Box display="flex" justifyContent="center" mt={2}>
                            <StyledButton onClick={handleOpenModal} className="!text-white">
                                {t('Create Policy')}
                            </StyledButton>
                        </Box>
                    </CardContent>
                </Card>}
            <CancellationPolicyModal open={modalOpen} onClose={handleCloseModal} setPolicy={setPolicy} policy={policy} policyId={policy?._id} languages={languages} />
        </Box>;
};
export default CancellationPolicy;
