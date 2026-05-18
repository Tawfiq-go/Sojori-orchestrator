import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ChannelDialog from './ChannelDialog';
import { getChannels } from '../services/serverApi.adminConfig';
import { Box, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ToastContainer, toast } from 'react-toastify';
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
const Channels = () => {
  const {
    t
  } = useTranslation('common');
  const [channels, setChannels] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const data = await getChannels();
      setChannels(data || []);
    } catch (error) {
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateChannel = () => {
    setSelectedChannel(null);
    setShowDialog(true);
  };
  const handleUpdateChannel = channel => {
    setSelectedChannel(channel);
    setShowDialog(true);
  };
  const handleChannelChange = (updatedChannel, isDeleted) => {
    if (isDeleted) {
      setChannels(prevChannels => prevChannels.filter(ch => ch._id !== updatedChannel._id));
    } else if (selectedChannel) {
      setChannels(prevChannels => prevChannels.map(ch => ch._id === updatedChannel._id ? updatedChannel : ch));
    } else {
      setChannels(prevChannels => [...prevChannels, updatedChannel]);
    }
  };
  return <>
            <ToastContainer />
            <div className="card p-4 !border-none">
                <Box className="mb-4 text-center">
                    <CreateButton variant="contained" endIcon={<AddIcon />} onClick={handleCreateChannel}>
                        {t('Add Channel')}
                    </CreateButton>
                </Box>
                {isLoading ? <div className="flex items-center justify-center h-full">
                        <CircularProgress style={{
          color: '#00b4b4'
        }} />
                    </div> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 sm:gap-4">
                        {channels.map(channel => <div key={channel._id} onClick={() => handleUpdateChannel(channel)} className="border rounded p-2 sm:p-4 flex justify-center text-black flex-col w-full min-h-[3rem] items-center cursor-pointer hover:text-white hover:shadow-md hover:bg-medium-aquamarine transition duration-300 hover:animate-pulse">
                                <h6 className="m-0 text-xs font-bold text-center sm:text-sm">{channel.name}</h6>
                            </div>)}
                    </div>}
                <ChannelDialog showDialog={showDialog} onClose={() => setShowDialog(false)} channel={selectedChannel} onChannelChange={handleChannelChange} />
            </div>
        </>;
};
export default Channels;
