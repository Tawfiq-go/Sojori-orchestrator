import React, { useState, useEffect } from 'react'; import { useTranslation } from 'react-i18next';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, IconButton, Typography, Divider } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { PlusCircle, X, Save, Languages, Type, FileText } from 'lucide-react';

const TitleDescriptionEditor = ({ open, onClose, onSave, initialData, languages }) => {
  const { t } = useTranslation('common'); const [titleDesc, setTitleDesc] = useState(initialData || { title: {}, description: {} });

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
    onSave(titleDesc);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Languages size={24} />
        <Typography variant="h6">{t('Edit Title and Description')}</Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={3}>
          {Object.keys(titleDesc.title).map(langId => (
            <React.Fragment key={langId}>
              <Grid item xs={12}>
                <Autocomplete
                  value={languages.find(lang => lang.id === langId) || null}
                  options={languages}
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label={t('Language')} 
                      fullWidth 
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <Languages size={20} style={{ marginRight: 8 }} />
                            {params.InputProps.startAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('Title')}
                  value={titleDesc.title[langId] || ''}
                  onChange={(e) => handleChange(langId, 'title', e.target.value)}
                  InputProps={{
                    startAdornment: <Type size={20} style={{ marginRight: 8 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('Description')}
                  value={titleDesc.description[langId] || ''}
                  onChange={(e) => handleChange(langId, 'description', e.target.value)}
                  multiline
                  rows={4}
                  InputProps={{
                    startAdornment: <FileText className='text-gray-200' size={20} style={{ marginRight: 8, marginTop: 16 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  color="error"
                  className='!text-red-500'
                  startIcon={<X size={20} />}
                  onClick={() => handleRemoveLanguage(langId)}
                >
                  {t('Remove Language')}
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Divider />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
        <Button
          variant="contained"
          color="primary"
          className='!text-white'
          startIcon={<PlusCircle size={20} />}
          onClick={handleAddLanguage}
          disabled={Object.keys(titleDesc.title).length >= languages.length}
          sx={{ mt: 3 }}
        >
          {t('Add Language')}
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<X size={20} />}>
          {t('Cancel')}
        </Button>
        <Button onClick={handleSave} color="primary" className='!text-white' variant="contained" startIcon={<Save size={20} />}>
          {t('Save Changes')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TitleDescriptionEditor;