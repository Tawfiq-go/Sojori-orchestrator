import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateSlide, getcities, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const ModifySlideDialog = ({
  open,
  onClose,
  slidesItems,
  setSlidesItems,
  selectedM,
  mIndex,
  mainIndex
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
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayImage, setDisplayImage] = useState(false);
  const validationSchema = Yup.object().shape({
    title: Yup.object().test('requiredTitle', t('At least one title is required'), obj => {
      return obj && Object.values(obj).some(value => !!value);
    }),
    description: Yup.object().test('requiredDescription', t('At least one description is required'), obj => {
      return obj && Object.values(obj).some(value => !!value);
    }),
    enabled: Yup.boolean().required(t('Enabled is required')),
    cityId: Yup.string().required(t('City ID is required'))
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
      setImageUrl(iconUrl?.url);
    }
  }, [iconUrl]);
  useEffect(() => {
    setDisplayImage(false);
  }, [onClose]);
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    const formData = {
      ...values,
      imageUrl: displayImage ? imageUrl : selectedM?.imageUrl
    };
    const dataItems = [...slidesItems];
    dataItems[mainIndex].slides[mIndex] = formData;
    try {
      const data = await updateSlide(dataItems[mainIndex]._id, dataItems[mainIndex]);
      let newSlide = [...slidesItems];
      newSlide[mainIndex] = data?.data?.slideShowConfig;
      setSlidesItems(newSlide);
      setSubmitting(false);
      onClose();
      resetForm();
      toast.success(t("Modification Successful"));
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
    }}>{t('Modify slide')}</DialogTitle>
      <DialogContent>
        {errorMessage && <h5 className='text-center text-danger'>{errorMessage}</h5>}
        <Formik initialValues={{
        title: selectedM?.title || {},
        description: selectedM?.description || {},
        enabled: selectedM?.enabled || false,
        cityId: selectedM?.cityId || ''
      }} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
          {({
          isSubmitting,
          setFieldValue,
          isValid,
          values
        }) => <Form encType="multipart/form-data">
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
                <label htmlFor="cityId" className="form-label">{t('City')}</label>
                {cities && cities.length > 0 && <Autocomplete disablePortal id='cityId' options={cities} getOptionLabel={option => option.name} onChange={(event, value) => {
              if (value) {
                setFieldValue('cityId', value._id);
              } else {
                setFieldValue('cityId', '');
              }
            }} value={cities.find(city => city._id === values.cityId) || null} renderInput={params => <TextField {...params} label={t('City')} />} />}
                <ErrorMessage name="cityId" component="div" className="text-danger" />
              </div>

              <div className="mb-3 text-center">
                <label htmlFor="image" className="form-label">{t('Image')}</label>
                <div>
                  {!displayImage && <span>{t('You need to upload a new image')}</span>}
                  <Switch color='primary' checked={displayImage} onChange={e => setDisplayImage(e.target.checked)} />
                </div>
                {displayImage ? <ImageUpload label={t('Select image')} avatar folder="slide" /> : <img src={selectedM?.imageUrl || ''} alt="img" height="100" width="120" />}
              </div>

              <div className="mb-3 text-center">
                <label htmlFor='enabled' className="form-label">{t('Enabled')}</label>
                <div>
                  <Field as={Switch} type="checkbox" id="enabled" name="enabled" className="form-check-input" />
                </div>
                <ErrorMessage name="enabled" component="div" className="text-danger" />
              </div>

              <DialogActions>
                <Button onClick={onClose} color="secondary">{t('Cancel')}</Button>
                <Button type="submit" color="primary" disabled={isSubmitting || !isValid}>
                  {isLoading ? t('Updating...') : t('Update')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default ModifySlideDialog;
