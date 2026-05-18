import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch, TextField, Autocomplete } from '@mui/material';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateSlide, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const ModifySlideTopDialog = ({
  open,
  onClose,
  slidesItems,
  setSlidesItems,
  selectedTop,
  topIndex
}) => {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [languages, setLanguages] = useState([]);
  const validationSchema = Yup.object({
    title: Yup.object().test('requiredTitle', t('At least one title is required'), obj => {
      return obj && Object.values(obj).some(value => !!value);
    }),
    description: Yup.object().test('requiredDescription', t('At least one description is required'), obj => {
      return obj && Object.values(obj).some(value => !!value);
    }),
    isMain: Yup.boolean().required(t('IsMain is required'))
  });
  useEffect(() => {
    fetchLanguages();
  }, []);
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {}
  };
  const initialValues = {
    title: selectedTop?.title || {},
    description: selectedTop?.description || {},
    isMain: selectedTop?.isMain || false
  };
  const handleSubmit = (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    const dataNew = {
      ...selectedTop,
      title: values.title,
      description: values.description,
      isMain: values.isMain
    };
    updateSlide(selectedTop?._id, dataNew).then(data => {
      let newSlide = [...slidesItems];
      newSlide[topIndex] = data?.data?.slideShowConfig;
      setSlidesItems(newSlide);
      resetForm();
      onClose();
      toast.success(t("Modification Successful"));
    }).catch(error => {
      setErrorMessage(error.message);
    }).finally(() => {
      setIsLoading(false);
      setSubmitting(false);
    });
  };
  return <Dialog PaperProps={{
    style: {
      width: 500
    }
  }} open={open} onClose={onClose}>
      <DialogTitle sx={{
      padding: '30px',
      textAlign: 'center'
    }}>{t('Modify slide')}</DialogTitle>
      <DialogContent>
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          values,
          setFieldValue,
          isValid,
          isSubmitting
        }) => <Form>
              <FieldArray name="languages">
                {({
              push,
              remove
            }) => <div className='p-1 border-gray-200 border-dashed border-1'>
                    {Object.entries(values.title).map(([langId, titleValue], index) => <div key={langId}>
                        <div className='!flex gap-1'>
                          <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.title).includes(lang._id) || lang._id === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang._id === langId) || null} onChange={(event, value) => {
                    if (value) {
                      const newTitle = {
                        ...values.title
                      };
                      const newDescription = {
                        ...values.description
                      };
                      delete newTitle[langId];
                      delete newDescription[langId];
                      newTitle[value._id] = '';
                      newDescription[value._id] = '';
                      setFieldValue('title', newTitle);
                      setFieldValue('description', newDescription);
                    }
                  }} renderInput={params => <TextField margin="normal" className="!w-36" {...params} label={t('Select Language')} />} />
                          <Field name={`title.${langId}`} as={TextField} label={t('Title')} fullWidth margin="normal" />
                        </div>
                        <Field name={`description.${langId}`} as={TextField} label={t('Description')} fullWidth multiline rows={4} />
                        <Button variant="outlined" color="error" className='my-1' onClick={() => {
                  const newTitle = {
                    ...values.title
                  };
                  const newDescription = {
                    ...values.description
                  };
                  delete newTitle[langId];
                  delete newDescription[langId];
                  setFieldValue('title', newTitle);
                  setFieldValue('description', newDescription);
                }}>
                          <CloseIcon className='text-red-500' />
                        </Button>
                        <span className='p-1 text-sm text-red-400'>{t('remove')}</span>
                      </div>)}
                    <Button className='!bg-green-500' onClick={() => {
                const availableLanguages = languages.filter(lang => !Object.keys(values.title).includes(lang._id));
                if (availableLanguages.length > 0) {
                  const newLangId = availableLanguages[0]._id;
                  setFieldValue(`title.${newLangId}`, '');
                  setFieldValue(`description.${newLangId}`, '');
                }
              }}>
                      <AddIcon className='!text-white' />
                    </Button>
                    <span className='p-1 text-sm'>{t('Add Title and Description')}</span>
                  </div>}
              </FieldArray>

              <div className="mb-3 text-center">
                <label htmlFor='isMain' className="form-label">
                  {t('Is Main')}
                </label>
                <div>
                  <Field as={Switch} name="isMain" checked={values.isMain} onChange={event => {
                setFieldValue('isMain', event.target.checked);
              }} />
                </div>
              </div>

              <DialogActions>
                <Button onClick={onClose} color="secondary">
                  {t('Cancel')}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting || !isValid}>
                  {isLoading ? t('Updating...') : t('Update')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default ModifySlideTopDialog;
