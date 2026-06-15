import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStories, deleteStory, getLanguages } from '../services/serverApi.adminConfig';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import StoriesModal from './StoriesModal';
import { toast } from 'react-toastify';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { CircularProgress, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
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
  height: '42px',
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '14px',
  padding: '8px 24px',
  background: 'linear-gradient(135deg, #E6B022 0%, #B8881A 100%)',
  color: 'white',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
    background: 'linear-gradient(135deg, #B8881A 0%, #E6B022 100%)'
  },
  '&:active': {
    transform: 'translateY(0)'
  }
});
function Stories() {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    fetchStories();
    fetchLanguages();
  }, [page, limit]);
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t('Failed_to_fetch_languages'));
    }
  };
  const fetchStories = async () => {
    try {
      const response = await getStories(page, limit, true);
      if (response.storys && Array.isArray(response.storys)) {
        setStories(response.storys);
        setTotal(response.total);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      setError(t('Failed_to_fetch_stories'));
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
    if (window.confirm(t('Confirm_delete_story'))) {
      try {
        await deleteStory(storyId);
        setStories(prevStories => prevStories.filter(story => story._id !== storyId));
        toast.success(t('Story_deleted_successfully'));
      } catch (error) {
        toast.error(t('Failed_to_delete_story'));
      }
    }
  };
  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleLimitChange = newLimit => {
    setLimit(newLimit);
    setPage(0);
  };
  const columns = [{
    header: t('Name'),
    body: rowData => <span>{rowData.name}</span>
  }, {
    header: t('City'),
    body: rowData => <span>{rowData.city}</span>
  }, {
    header: t('Description'),
    body: rowData => <div>
                    {Object.entries(rowData.description).map(([langId, text]) => <div key={langId}>
                            <strong>{languages.find(lang => lang._id === langId)?.name || 'Unknown'}:</strong>
                            {text.substring(0, 200)}...
                        </div>)}
                </div>
  }, {
    header: t('Action'),
    body: rowData => <div className="flex gap-1">
                    <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleOpenModal(rowData)}>
                        <EditOffIcon className="text-white" />
                    </button>
                    <button className="px-2 py-1 bg-[#df5454] !rounded-md" onClick={() => handleDeleteStory(rowData._id)}>
                        <DeleteSweepIcon className="text-white" />
                    </button>
                </div>
  }];
  if (error) {
    return <div className="flex items-center justify-center w-full h-64 text-red-500">{error}</div>;
  }
  return <div className="card px-4 pb-4 !border-none">
            {/* <Typography variant="h4" component="h1" className="mb-4" gutterBottom>
                {t('Stories_Management')}
             </Typography> */}
            <div className="flex justify-end my-2">
                <StyledButton onClick={() => handleOpenModal()}>
                    {t('Create_New_Story')}
                </StyledButton>
            </div>
            <div>
                <div className="w-full">
                    {isLoading ? <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
                            <CircularProgress style={{
            color: '#00b4b4'
          }} />
                        </div> : <GlobalTable data={stories} columns={columns} hasPagination={true} page={page} onPageChange={handlePageChange} limit={limit} onLimitChange={handleLimitChange} isNextDisabled={page >= Math.ceil(total / limit) - 1} rowsPerPageOptions={[10, 20, 50]} />}
                </div>
            </div>
            <StoriesModal open={modalOpen} onClose={handleCloseModal} setStories={setStories} story={selectedStory} />
        </div>;
}
export default Stories;
