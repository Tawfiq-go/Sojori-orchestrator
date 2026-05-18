import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { getcities, getLanguages, updateSlide } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const UpdateSlideDialog = ({
  open,
  onClose,
  slideData,
  setSlidesItems
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
  const [isLoading, setIsLoading] = useState(false);
  const [displayImage, setDisplayImage] = useState({});
  const [slideImages, setSlideImages] = useState({});
  const validationSchema = Yup.object().shape({
    slides: Yup.array().of(Yup.object({
      title: Yup.object().test('atLeastOneTitle', t('At least one title is required'), obj => Object.keys(obj).length > 0),
      description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
      enabled: Yup.boolean().required(t('Enabled is required')),
      cityId: Yup.string().required(t('City ID is required'))
    }).required())
  });
  useEffect(() => {
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
    fetchCitiesData();
    fetchLanguages();
  }, []);
  useEffect(() => {
    if (iconUrl) {
      setSlideImages(prev => ({
        ...prev,
        [Object.keys(displayImage).find(key => displayImage[key])]: iconUrl.url
      }));
    }
  }, [iconUrl, displayImage]);
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    const updatedValues = {
      ...values,
      slides: values.slides.map((slide, index) => ({
        ...slide,
        imageUrl: slideImages[index] || slide.imageUrl
      }))
    };
    try {
      const data = await updateSlide(slideData._id, updatedValues);
      setSlidesItems(prevState => prevState.map(slide => slide._id === slideData._id ? data.data.slideShowConfig : slide));
      setSubmitting(false);
      onClose();
      resetForm();
      toast.success(t("Update Successful"));
      setDisplayImage({});
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
    }}>{t('Add Slide')}</DialogTitle>
            <DialogContent>
                {errorMessage && <h5 className='text-center text-danger'>{errorMessage}</h5>}
                <Formik initialValues={slideData} validationSchema={validationSchema} onSubmit={handleSubmit}>
                    {({
          isSubmitting,
          setFieldValue,
          isValid,
          values
        }) => <Form encType="multipart/form-data">
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
                                                                        <CloseIcon className='!text-red-600' />
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
                                                            <span className='p-1 text-sm'>{t('Add Title and Description')}</span>
                                                        </div>}
                                                </FieldArray>

                                                <div className="mb-3">
                                                    <label htmlFor={`slides[${index}].enabled`} className="form-label">
                                                        {t('Enabled')}
                                                    </label>
                                                    <div>
                                                        <Field as={Switch} type="checkbox" id={`slides[${index}].enabled`} name={`slides[${index}].enabled`} className="form-check-input" />
                                                    </div>
                                                    <ErrorMessage name={`slides[${index}].enabled`} component="div" className="text-danger" />
                                                </div>

                                                <FieldArray name={`slides[${index}].cityId`}>
                                                    {() => <div className='my-2'>
                                                            <Autocomplete disablePortal id="cityId" options={cities} value={cities.find(city => city._id === slide.cityId) || null} getOptionLabel={option => option.name} onChange={(event, value) => setFieldValue(`slides[${index}].cityId`, value?._id)} renderInput={params => <TextField {...params} label={t('Select City')} />} />
                                                            <ErrorMessage name={`slides[${index}].cityId`} component="div" className="text-danger" />
                                                        </div>}
                                                </FieldArray>

                                                <div className="my-2">
                                                    <label htmlFor={`slides[${index}].imageUrl`} className="form-label">
                                                        {t('Image')}
                                                    </label>
                                                    <div>
                                                        <Switch color='primary' checked={displayImage[index] || false} onChange={e => setDisplayImage(prev => ({
                      ...prev,
                      [index]: e.target.checked
                    }))} />
                                                        <span>{displayImage[index] ? t('Upload new image') : t('Use existing image')}</span>
                                                    </div>
                                                    {displayImage[index] ? <ImageUpload label={t('Select image')} avatar folder="slide" onChange={url => setSlideImages(prev => ({
                    ...prev,
                    [index]: url
                  }))} /> : <img src={slide.imageUrl || ''} alt="slide" height="100" width="120" />}
                                                </div>
                                                <Button variant="outlined" color="error" onClick={() => remove(index)}>
                                                    <CloseIcon className='!text-red-600' />
                                                </Button>
                                                <span className='p-1 text-sm text-red-400'>{t('remove slide')}</span>
                                            </div>)}
                                        <Button variant="contained" color="primary" onClick={() => push({
                title: {},
                description: {},
                enabled: false,
                cityId: '',
                imageUrl: ''
              })}>
                                            <AddIcon className='!text-white' />
                                        </Button>
                                        <span className='p-1 text-sm'>{t('Add Slide')}</span>
                                    </div>}
                            </FieldArray>

                            <DialogActions>
                                <Button onClick={onClose} disabled={isSubmitting}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" color="primary" disabled={isSubmitting || !isValid}>
                                    {isLoading ? t('Loading...') : t('Submit')}
                                </Button>
                            </DialogActions>
                        </Form>}
                </Formik>
            </DialogContent>
        </Dialog>;
};
export default UpdateSlideDialog;
