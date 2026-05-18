import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FormControlLabel, Button, CircularProgress, Typography, Box, Card, Avatar } from '@mui/material';
import { ViewCarousel, LocationCity, PhoneAndroid, Article, PlayCircle, FormatQuote, People } from '@mui/icons-material';
import { createWebSiteBlock, getWebSiteBlocks } from '../services/serverApi.adminConfig';
import { toast, ToastContainer } from 'react-toastify';
import IOSSwitch from './IOSSwitch';
const initialWebSiteBlockState = {
  sliderBlock: false,
  citiesBlock: false,
  applicationBlock: false,
  blogBlock: false,
  videoBlock: false,
  storyTxtBlock: false,
  storiesBlock: false
};
const webSiteBlockValidationSchema = Yup.object(Object.keys(initialWebSiteBlockState).reduce((acc, key) => {
  acc[key] = Yup.boolean().required();
  return acc;
}, {}));
const WebSite = () => {
  const {
    t
  } = useTranslation('common');
  const [webSiteBlockSettings, setWebSiteBlockSettings] = useState(initialWebSiteBlockState);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    fetchWebSiteBlockSettings();
  }, []);
  const filterWebSiteBlockSettings = settings => {
    const {
      _id,
      createdAt,
      updatedAt,
      __v,
      ...relevantSettings
    } = settings;
    return relevantSettings;
  };
  const fetchWebSiteBlockSettings = async () => {
    try {
      const response = await getWebSiteBlocks();
      if (response && response.webSiteBlock) {
        const filteredSettings = filterWebSiteBlockSettings(response.webSiteBlock);
        setWebSiteBlockSettings(filteredSettings);
      }
    } catch (error) {} finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = async values => {
    try {
      const response = await createWebSiteBlock(values);
      if (response && response.message) {
        toast.success(response.message);
      }
    } catch (error) {}
  };
  const handleEnableAll = () => {
    const enabledValues = Object.keys(webSiteBlockSettings).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    formik.setValues(enabledValues);
  };
  const handleDisableAll = () => {
    const disabledValues = Object.keys(webSiteBlockSettings).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {});
    formik.setValues(disabledValues);
  };
  const formik = useFormik({
    initialValues: webSiteBlockSettings,
    enableReinitialize: true,
    validationSchema: webSiteBlockValidationSchema,
    onSubmit: handleSubmit
  });
  const getBlockIcon = blockName => {
    const iconMap = {
      sliderBlock: ViewCarousel,
      citiesBlock: LocationCity,
      applicationBlock: PhoneAndroid,
      blogBlock: Article,
      videoBlock: PlayCircle,
      storyTxtBlock: FormatQuote,
      storiesBlock: People
    };
    return iconMap[blockName] || Article;
  };
  const getBlockLabel = blockName => {
    const labelMap = {
      sliderBlock: t('sliderBlock'),
      citiesBlock: t('citiesBlock'),
      applicationBlock: t('applicationBlock'),
      blogBlock: t('blogBlock'),
      videoBlock: t('videoBlock'),
      storyTxtBlock: t('storyTxtBlock'),
      storiesBlock: t('storiesBlock')
    };
    return labelMap[blockName] || t(blockName);
  };
  const allEnabled = Object.values(formik.values).every(value => value === true);
  const allDisabled = Object.values(formik.values).every(value => value === false);
  return <Box sx={{
    maxWidth: 1200,
    margin: '0 auto',
    padding: 3
  }}>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <Box sx={{
      marginBottom: 4
    }}>
        <Typography variant="h4" sx={{
        fontWeight: 'bold',
        marginBottom: 1,
        color: '#1a1a1a'
      }}>
          {t('webSite Blocks Config')}
        </Typography>
        
        <Box sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 3
      }}>
          <Typography variant="body1" sx={{
          color: '#6b7280'
        }}>
            {t('webSiteBlocksConfig')}
          </Typography>
          
          <Box sx={{
          display: 'flex',
          gap: 2
        }}>
            <Button variant={allEnabled ? "outlined" : "text"} onClick={handleEnableAll} sx={{
            borderColor: allEnabled ? '#e5e7eb' : 'transparent',
            color: '#374151',
            '&:hover': {
              borderColor: allEnabled ? '#d1d5db' : 'transparent',
              backgroundColor: '#f9fafb',
              color: '#00b4b4'
            }
          }}>
              {t('enable')} {t('all')}
            </Button>
            <Button variant={allDisabled ? "outlined" : "text"} onClick={handleDisableAll} sx={{
            borderColor: allDisabled ? '#e5e7eb' : 'transparent',
            color: '#374151',
            '&:hover': {
              borderColor: allDisabled ? '#d1d5db' : 'transparent',
              backgroundColor: '#f9fafb',
              color: '#00b4b4'
            }
          }}>
              {t('disabled')} {t('all')}
            </Button>
          </Box>
        </Box>
      </Box>

      {isLoading ? <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px'
    }}>
          <CircularProgress sx={{
        color: '#00b4b4'
      }} />
        </Box> : <form onSubmit={formik.handleSubmit}>
          <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(2, 1fr)'
        },
        gap: 3,
        marginBottom: 4
      }}>
            {Object.keys(webSiteBlockSettings).map(key => {
          const IconComponent = getBlockIcon(key);
          return <WebSiteBlockCard key={key} name={key} formik={formik} icon={IconComponent} label={getBlockLabel(key)} />;
        })}
          </Box>
          
          <Box sx={{
        display: 'flex',
        justifyContent: 'center'
      }}>
            <Button type="submit" variant="contained" sx={{
          backgroundColor: '#00b4b4',
          color: 'white !important',
          padding: '12px 48px',
          fontSize: '16px',
          fontWeight: 600,
          textTransform: 'uppercase',
          '&:hover': {
            backgroundColor: '#008080'
          }
        }}>
              {t('save')}
            </Button>
          </Box>
        </form>}
    </Box>;
};
const WebSiteBlockCard = ({
  name,
  formik,
  icon: IconComponent,
  label
}) => <Card sx={{
  padding: 3,
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  boxShadow: 'none',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: '80px',
  width: '100%',
  '&:hover': {
    borderColor: '#d1d5db',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  }
}}>
    <Box sx={{
    display: 'flex',
    alignItems: 'center',
    gap: 2
  }}>
      <Box sx={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      backgroundColor: '#e6fffa',
      border: '1px solid #d1edea',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
        <IconComponent sx={{
        color: '#00b4b4',
        fontSize: 24
      }} />
      </Box>
      <Typography variant="h6" sx={{
      fontWeight: 600,
      color: '#1f2937',
      fontSize: '16px'
    }}>
        {label}
      </Typography>
    </Box>

    
    <IOSSwitch checked={formik.values[name]} onChange={formik.handleChange} name={name} />
  </Card>;
const WebSiteSwitch = ({
  name,
  formik,
  t
}) => <FormControlLabel control={<IOSSwitch checked={formik.values[name]} onChange={formik.handleChange} name={name} />} label={<span className="text-sm text-gray-400 sm:text-base">{t(name)}</span>} className="p-2 bg-white border rounded" />;
export default WebSite;
