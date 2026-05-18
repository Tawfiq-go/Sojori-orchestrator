import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextField, Grid, IconButton, Typography, Autocomplete, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveIcon from '@mui/icons-material/Save';

const TitleDescriptionEditor = ({ open, onClose, onSave, initialData, languages }) => {
  const { t } = useTranslation('common');
  const [titleDesc, setTitleDesc] = useState(initialData || { title: {}, description: {} });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setTitleDesc(initialData || { title: {}, description: {} });
  }, [initialData]);

  const handleChange = (langId, field, value) => {
    setTitleDesc(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [langId]: value
      }
    }));
  };

  const handleAddLanguage = () => {
    const unusedLanguages = languages.filter(lang => !Object.keys(titleDesc.title).includes(lang.id));
    if (unusedLanguages.length > 0) {
      const newLangId = unusedLanguages[0].id;
      setTitleDesc(prev => ({
        title: { ...prev.title, [newLangId]: '' },
        description: { ...prev.description, [newLangId]: '' }
      }));
    }
  };

  const handleRemoveLanguage = (langId) => {
    setTitleDesc(prev => {
      const newTitle = { ...prev.title };
      const newDesc = { ...prev.description };
      delete newTitle[langId];
      delete newDesc[langId];
      return { title: newTitle, description: newDesc };
    });
  };

  const handleSave = () => {
    if (Object.keys(titleDesc.title).length === 0 || Object.keys(titleDesc.description).length === 0) {
      setErrorMessage(t('At least one title and description are required'));
      return;
    }
    onSave(titleDesc);
    setErrorMessage('');
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1300,
          overflow: 'hidden',
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '600px',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid #d1d5db',
            backgroundColor: '#ffffff',
          }}
        >
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 500,
              color: '#374151',
              margin: 0,
            }}
          >
            {t('Edit Title and Description')}
          </h2>
          <IconButton
            onClick={onClose}
            sx={{
              '&:hover': {
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#00b4b4 #f1f1f1',
          }}
        >
          {errorMessage && (
            <Typography sx={{ color: '#EF4444', fontSize: '14px', fontWeight: 500, textAlign: 'center', marginBottom: '16px' }}>
              {errorMessage}
            </Typography>
          )}
          <Grid container spacing={3}>
            {Object.keys(titleDesc.title).map(langId => (
              <React.Fragment key={langId}>
                <Grid item xs={12}>
                  <div style={{ border: '1px dashed #d1d5db', padding: '16px', marginBottom: '16px' }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                      {t('Language')}
                    </Typography>
                    <Autocomplete
                      value={languages.find(lang => lang.id === langId) || null}
                      options={languages}
                      getOptionLabel={(option) => option.name}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label={t('Language')}
                          sx={{ '& .MuiInputLabel-root': { fontSize: '14px', color: '#374151' } }}
                        />
                      )}
                      disabled
                    />
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginTop: '16px', marginBottom: '8px' }}>
                      {t('Title')}
                    </Typography>
                    <TextField
                      fullWidth
                      label={t('Title')}
                      value={titleDesc.title[langId] || ''}
                      onChange={(e) => handleChange(langId, 'title', e.target.value)}
                      sx={{ '& .MuiInputLabel-root': { fontSize: '14px', color: '#374151' } }}
                    />
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginTop: '16px', marginBottom: '8px' }}>
                      {t('Description')}
                    </Typography>
                    <TextField
                      fullWidth
                      label={t('Description')}
                      value={titleDesc.description[langId] || ''}
                      onChange={(e) => handleChange(langId, 'description', e.target.value)}
                      multiline
                      rows={4}
                      sx={{ '& .MuiInputLabel-root': { fontSize: '14px', color: '#374151' } }}
                    />
                    <Button
                      variant="outlined"
                      sx={{
                        marginTop: '16px',
                        borderColor: '#EF4444',
                        color: '#EF4444',
                        '&:hover': { backgroundColor: '#f3f4f6', borderColor: '#EF4444' },
                        textTransform: 'none'
                      }}
                      startIcon={<CloseIcon sx={{ color: '#EF4444' }} />}
                      onClick={() => handleRemoveLanguage(langId)}
                    >
                      {t('Remove Language')}
                    </Button>
                  </div>
                </Grid>
                <Grid item xs={12}>
                  <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }} />
                </Grid>
              </React.Fragment>
            ))}
          </Grid>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#00b4b4',
              color: '#ffffff',
              '&:hover': { backgroundColor: '#009999' },
              '&:disabled': { backgroundColor: '#e5e7eb', color: '#9ca3af' },
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'none'
            }}
            startIcon={<AddCircleOutlineIcon sx={{ color: '#ffffff' }} />}
            onClick={handleAddLanguage}
            disabled={Object.keys(titleDesc.title).length >= languages.length}
          >
            {t('Add Language')}
          </Button>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            paddingBottom: '20px',
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              flex: 1,
              borderColor: '#d1d5db',
              color: '#6b7280',
              '&:hover': { borderColor: '#9ca3af', backgroundColor: '#f9fafb' },
              '&:disabled': { borderColor: '#e5e7eb', color: '#9ca3af' },
              textTransform: 'none'
            }}
            startIcon={<CloseIcon sx={{ color: '#6b7280' }} />}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              flex: 1,
              backgroundColor: '#00b4b4',
              color: '#ffffff',
              '&:hover': { backgroundColor: '#009999' },
              '&:disabled': { backgroundColor: '#e5e7eb', color: '#9ca3af' },
              textTransform: 'none'
            }}
            startIcon={<SaveIcon sx={{ color: '#ffffff' }} />}
          >
            {t('Save Changes')}
          </Button>
        </div>
      </div>
    </>
  );
};

export default TitleDescriptionEditor;