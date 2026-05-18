import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Select, MenuItem, FormControl, InputLabel, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import { createStory, updateStory, getLanguages, getcities } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name_required'),
  city: Yup.string().required('City_required'),
  description: Yup.object().test('at-least-one-description', 'At_least_one_description_required', obj => Object.keys(obj).length > 0)
});
const StoriesModal = ({
  open,
  onClose,
  setStories,
  story
}) => {
  const {
    t
  } = useTranslation('common');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [languages, setLanguages] = useState([]);
  useEffect(() => {
    fetchLanguages();
  }, []);
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t('Failed_to_fetch_languages'));
    }
  };
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      let response;
      if (story) {
        response = await updateStory(story._id, values);
      } else {
        response = await createStory(values);
      }
      if (response && response.story) {
        setStories(prevStories => {
          if (!prevStories) return [response.story];
          if (story) {
            return prevStories.map(s => s._id === story._id ? response.story : s);
          } else {
            return [...prevStories, response.story];
          }
        });
        setSubmitting(false);
        onClose();
        toast.success(t(story ? 'Story_updated_successfully' : 'Story_created_successfully'));
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred while processing your request.');
      setSubmitting(false);
      toast.error(t(story ? 'Error_updating_story' : 'Error_creating_story'));
    } finally {
      setIsLoading(false);
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{t(story ? 'Update_Story' : 'Create_New_Story')}</DialogTitle>
            <DialogContent>
                {errorMessage && <Typography color="error">{errorMessage}</Typography>}
                <Formik initialValues={{
        name: story ? story.name : '',
        city: story ? story.city : '',
        description: story ? story.description : {}
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
                    {({
          values,
          errors,
          setFieldValue
        }) => <Form className="mt-2">
                            <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
                                <Field name="name">
                                    {({
                field
              }) => <TextField {...field} label={t('Name')} fullWidth error={Boolean(errors.name)} helperText={t(errors.name)} />}
                                </Field>
                                <Field name="city">
                                    {({
                field
              }) => <TextField {...field} label={t('City')} fullWidth error={Boolean(errors.city)} helperText={t(errors.city)} />}
                                </Field>
                                <FieldArray name="description">
                                    {({
                push,
                remove
              }) => <>
                                            {Object.entries(values.description).map(([langId, value]) => <Box key={langId} sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                                                    <TextField fullWidth multiline rows={4} label={`Description (${languages.find(lang => lang._id === langId)?.name || 'Unknown'})`} value={value} onChange={e => setFieldValue(`description.${langId}`, e.target.value)} error={Boolean(errors.description?.[langId])} helperText={errors.description?.[langId]} />
                                                    <IconButton onClick={() => {
                    const newDescription = {
                      ...values.description
                    };
                    delete newDescription[langId];
                    setFieldValue('description', newDescription);
                  }}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Box>)}
                                            <FormControl fullWidth>
                                                <InputLabel>{t('Add_Language')}</InputLabel>
                                                <Select value="" onChange={e => {
                    const langId = e.target.value;
                    if (!values.description[langId]) {
                      setFieldValue(`description.${langId}`, "");
                    }
                  }}>
                                                    {languages.map(lang => <MenuItem key={lang._id} value={lang._id} disabled={lang._id in values.description}>
                                                            {lang.name}
                                                        </MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </>}
                                </FieldArray>
                            </Box>
                            <DialogActions>
                                <Button onClick={onClose} color="primary">
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" color="primary" disabled={isLoading}>
                                    {t(story ? 'Update' : 'Create')}
                                </Button>
                            </DialogActions>
                        </Form>}
                </Formik>
            </DialogContent>
        </Dialog>;
};
export default StoriesModal;
