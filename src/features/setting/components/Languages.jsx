import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageDialog from './LanguageDialog';
import { getLanguages } from '../services/serverApi.adminConfig';
import { Box, Button, CircularProgress } from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import { AddCircleOutline as AddIcon } from '@mui/icons-material';
const Languages = () => {
  const {
    t
  } = useTranslation('common');
  const [languages, setLanguages] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const data = await getLanguages();
      setLanguages(data || []);
    } catch (error) {
      setLanguages([]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateLanguage = () => {
    setSelectedLanguage(null);
    setShowDialog(true);
  };
  const handleUpdateLanguage = language => {
    setSelectedLanguage(language);
    setShowDialog(true);
  };
  const handleLanguageChange = (updatedLanguage, isDeleted) => {
    if (isDeleted) {
      setLanguages(prevLanguages => prevLanguages.filter(lang => lang._id !== updatedLanguage._id));
    } else if (selectedLanguage) {
      setLanguages(prevLanguages => prevLanguages.map(lang => lang._id === updatedLanguage._id ? updatedLanguage : lang));
    } else {
      setLanguages(prevLanguages => [...prevLanguages, updatedLanguage]);
    }
  };
  return <>
            <ToastContainer />
            <div className="card p-4 !border-none">
                <Box className="mb-4 text-center">
                    <Button variant="contained" className="!bg-medium-aquamarine text-white" endIcon={<AddIcon />} onClick={handleCreateLanguage}>
                        {t('Create Language')}
                    </Button>
                </Box>
                {isLoading ? <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%'
      }}>
                        <CircularProgress style={{
          color: '#00b4b4'
        }} />
                    </div> : <div className="grid grid-cols-8 gap-4">
                        {languages.map(language => <div key={language._id} onClick={() => handleUpdateLanguage(language)} className={`border rounded p-4 flex gap-1 justify-center text-black w-[7.5rem] h-[3rem] items-center cursor-pointer hover:text-white hover:shadow-md transition duration-300 hover:animate-pulse ${language.useInTranslate ? 'bg-teal-300' : 'hover:bg-medium-aquamarine'}`}>
                                {language.imageUrl ? <img src={language.imageUrl} alt={language.name} className="w-[20px] h-[20px] object-cover rounded-full" /> : null}
                                <h6 className="m-0 font-bold" style={{
            fontSize: '13px !important'
          }}>{language.name}</h6>
                            </div>)}
                    </div>}
                <LanguageDialog showDialog={showDialog} onClose={() => setShowDialog(false)} language={selectedLanguage} onLanguageChange={handleLanguageChange} />
            </div>
        </>;
};
export default Languages;
