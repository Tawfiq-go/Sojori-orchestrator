import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { createSlide, getcities, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const AddSlideDialog = ({
  open,
  onClose,
  addSlide
}) => {
  const {
    t
  } = useTranslation('common');
  const upload = useSelector(state => state.uploadData);
  const {
    iconUrl
  } = upload;
  const [cities, setCities] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [imagesUrl, setImagesUrl] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const validationSchema = Yup.object().shape({
    title: Yup.object().test('atLeastOneTitle', t('At least one title is required'), obj => Object.keys(obj).length > 0),
    description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
    isMain: Yup.boolean().required(t('IsMain is required')),
    slides: Yup.array().of(Yup.object({
      title: Yup.object().test('atLeastOneTitle', t('At least one title is required'), obj => Object.keys(obj).length > 0),
      description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
      enabled: Yup.boolean().required(t('Enabled is required')),
      cityId: Yup.string().required(t('City ID is required'))
    }))
  });
  const fetchCitiesData = async () => {
    try {
      const data = await getcities();
      setCities(data.data.cities);
    } catch (error) {}
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {}
  };
  useEffect(() => {
    fetchCitiesData();
    fetchLanguages();
  }, []);
  useEffect(() => {
    if (iconUrl) {
      setImagesUrl(prevImagesUrl => [...prevImagesUrl, iconUrl?.url]);
    }
  }, [iconUrl]);
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    for (let i = 0; i < values.slides.length; i++) {
      values.slides[i].imageUrl = imagesUrl[i];
    }
    try {
      const data = await createSlide(values);
      addSlide(data?.data?.slideShowConfig);
      setSubmitting(false);
      onClose();
      resetForm();
      toast.success(t("Slide added successfully"));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  return <Dialog PaperProps={{
    style: {
      width: 500
    }
  }} open={open} onClose={onClose}>
      <DialogTitle sx={{
      padding: '30px',
      textAlign: 'center'
    }}>{t('Create slide')}</DialogTitle>
      <DialogContent>
        {errorMessage && <h5 className='text-center text-danger'>{errorMessage}</h5>}
        <Formik initialValues={{
        title: {},
        description: {},
        isMain: false,
        slides: [{
          title: {},
          description: {},
          enabled: true,
          cityId: ''
        }]
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          isValid,
          dirty,
          values
        }) => <Form encType="multipart/form-data">
              <FieldArray name="languages">
                {({
              push,
              remove
            }) => <div className='p-1 border-gray-200 border-dashed border-1'>
                    {Object.entries(values.title).map(([langId, titleValue], index) => <div key={langId}>
                        <div className='!flex gap-1'>
                          <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.title).includes(lang._id))} getOptionLabel={option => option.name} value={languages.find(lang => lang._id === langId) || null} onChange={(event, value) => {
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
                  <Field as={Switch} type="checkbox" id="isMain" name="isMain" className="form-check-input" />
                </div>
                <ErrorMessage name="isMain" component="div" className="text-danger" />
              </div>

              <FieldArray name="slides">
                {({
              push,
              remove
            }) => <div>
                    {values.slides.map((slide, index) => <div key={index} className="mb-3">
                        <h4 className='text-center'>{t('Slide {number}', {
                    number: index + 1
                  })}</h4>
                        <FieldArray name={`slides[${index}].languages`}>
                          {({
                    push: pushLang,
                    remove: removeLang
                  }) => <div className='p-1 border-gray-200 border-dashed border-1'>
                              {Object.entries(slide.title).map(([langId, titleValue], langIndex) => <div key={langId}>
                                  <div className='!flex gap-1'>
                                    <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(slide.title).includes(lang._id))} getOptionLabel={option => option.name} value={languages.find(lang => lang._id === langId) || null} onChange={(event, value) => {
                          if (value) {
                            const newTitle = {
                              ...slide.title
                            };
                            const newDescription = {
                              ...slide.description
                            };
                            delete newTitle[langId];
                            delete newDescription[langId];
                            newTitle[value._id] = '';
                            newDescription[value._id] = '';
                            setFieldValue(`slides[${index}].title`, newTitle);
                            setFieldValue(`slides[${index}].description`, newDescription);
                          }
                        }} renderInput={params => <TextField margin="normal" className="!w-36" {...params} label={t('Select Language')} />} />
                                    <Field name={`slides[${index}].title.${langId}`} as={TextField} label={t('Title')} fullWidth margin="normal" />
                                  </div>
                                  <Field name={`slides[${index}].description.${langId}`} as={TextField} label={t('Description')} fullWidth multiline rows={4} />
                                  <Button variant="outlined" color="error" className='my-1' onClick={() => {
                        const newTitle = {
                          ...slide.title
                        };
                        const newDescription = {
                          ...slide.description
                        };
                        delete newTitle[langId];
                        delete newDescription[langId];
                        setFieldValue(`slides[${index}].title`, newTitle);
                        setFieldValue(`slides[${index}].description`, newDescription);
                      }}>
                                    <CloseIcon className='text-red-500' />
                                  </Button>
                                  <span className='p-1 text-sm text-red-400'>{t('remove')}</span>
                                </div>)}
                              <Button className='!bg-green-500' onClick={() => {
                      const availableLanguages = languages.filter(lang => !Object.keys(slide.title).includes(lang._id));
                      if (availableLanguages.length > 0) {
                        const newLangId = availableLanguages[0]._id;
                        setFieldValue(`slides[${index}].title.${newLangId}`, '');
                        setFieldValue(`slides[${index}].description.${newLangId}`, '');
                      }
                    }}>
                                <AddIcon className='!text-white' />
                              </Button>
                              <span className='p-1 text-sm'>{t('Add Title and Description To slide {number}', {
                        number: index + 1
                      })}</span>
                            </div>}
                        </FieldArray>

                        <div className="my-3">
                          <label htmlFor={`slides[${index}].cityId`} className="form-label">
                            {t('City')}
                          </label>
                          {cities && cities.length > 0 && <Autocomplete disablePortal id={`slides[${index}].cityId`} options={cities} getOptionLabel={option => option.name} onChange={(event, value) => {
                    if (value) {
                      setFieldValue(`slides[${index}].cityId`, value._id);
                    } else {
                      setFieldValue(`slides[${index}].cityId`, '');
                    }
                  }} renderInput={params => <TextField {...params} label={t('City')} />} />}
                          <ErrorMessage name={`slides[${index}].cityId`} component="div" className="text-danger" />
                        </div>

                        <div className="mb-3 text-center">
                          <label htmlFor={`slides[${index}].image`} className="form-label">
                            {t('Image')}
                          </label>
                          <ImageUpload style={{
                    img: {
                      height: '300px',
                      width: '444px'
                    }
                  }} label={t('Select image')} folder='slide' avatar />
                        </div>

                        <div className="mb-3 text-center">
                          <label htmlFor={`slides[${index}].enabled`} className="form-label">
                            {t('Enabled')}
                          </label>
                          <div>
                            <Field as={Switch} type="checkbox" id={`slides[${index}].enabled`} name={`slides[${index}].enabled`} className="form-check-input" />
                          </div>
                          <ErrorMessage name={`slides[${index}].enabled`} component="div" className="text-danger" />
                        </div>

                        <Button className='!my-2' variant="outlined" color="error" onClick={() => remove(index)}>
                          <span className='text-red-500'>{t('Remove Slide')}</span>
                        </Button>
                      </div>)}
                    <Button variant="outlined" color="success" onClick={() => push({
                title: {},
                description: {},
                enabled: true,
                cityId: ''
              })}>
                    <span className='text-green-500'>{t('Add Slide')}</span>
                    </Button>
                  </div>}
              </FieldArray>

              <DialogActions>
                <Button onClick={onClose} color="secondary">
                  {t('Cancel')}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting || !isValid || !dirty}>
                  {isLoading ? t('Adding...') : t('Add')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default AddSlideDialog;
