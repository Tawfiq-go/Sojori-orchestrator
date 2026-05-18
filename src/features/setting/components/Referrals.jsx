import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReferralDialog from './ReferralDialog';
import { getReferrals } from '../services/serverApi.adminConfig';
import { Box, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import { AddCircleOutline as AddIcon } from '@mui/icons-material';
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
const CreateButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: '8px 16px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
  }
});
const Referrals = () => {
  const {
    t
  } = useTranslation('common');
  const [referrals, setReferrals] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const data = await getReferrals();
      setReferrals(Array.isArray(data) ? data : []);
    } catch (error) {
      setReferrals([]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateReferral = () => {
    setShowDialog(true);
  };
  const handleReferralChange = newReferral => {
    setReferrals(prevReferrals => [...prevReferrals, newReferral]);
    setShowDialog(false);
  };
  return <>
            <ToastContainer />
            <div className="card p-4 !border-none">
                <Box className="mb-4 text-center">
                    <CreateButton variant="contained" endIcon={<AddIcon />} onClick={handleCreateReferral}>
                        {t('Add Referral Code')}
                    </CreateButton>
                </Box>
                {isLoading ? <div className="flex items-center justify-center h-full">
                        <CircularProgress style={{
          color: SOJORI_COLORS.primary
        }} />
                    </div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {referrals.map(referral => <div key={referral._id} className="flex flex-col items-center justify-center p-4 text-black transition-all duration-300 border rounded hover:bg-[#FF6B35] hover:text-white">
                                <h6 className="m-0 text-sm font-bold text-center">{referral.code}</h6>
                                <p className="text-xs opacity-70 mt-1 !mb-0">
                                    {new Date(referral.createdAt).toLocaleDateString()}
                                </p>
                            </div>)}
                    </div>}
                <ReferralDialog showDialog={showDialog} onClose={() => setShowDialog(false)} onReferralChange={handleReferralChange} />
            </div>
        </>;
};
export default Referrals;
