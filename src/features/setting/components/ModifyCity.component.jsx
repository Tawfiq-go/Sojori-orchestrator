import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch, TextField, Autocomplete } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateCity, getcountries, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector, useDispatch } from 'react-redux';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const ModifyCityDialog = ({
  open,
  onClose,
  onUpdateCity,
  dataCity
}) => {
  const {
    t
  } = useTranslation('common');
  const upload = useSelector(state => state.uploadData);
  const {
    iconUrl,
    error,
    loading,
    newUpload
  } = upload;
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [displayImage, setDisplayImage] = useState(false);
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(t('City name is required')),
    countryId: Yup.string().required(t('Country is required')),
    description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
    toDisplayedInMainScreen: Yup.boolean().required(t('Display flag is required')),
    gpsPosition: Yup.object().shape({
      lat: Yup.number().required(t('Latitude is required')).min(-90).max(90),
      lng: Yup.number().required(t('Longitude is required')).min(-180).max(180)
    })
  });
  useEffect(() => {
    fetchCountriesData();
    fetchLanguages();
  }, []);
  useEffect(() => {
    if (iconUrl) {
      setImageUrl(iconUrl);
    }
  }, [iconUrl]);
  const fetchCountriesData = async () => {
    try {
      const data = await getcountries();
      setCountries(data.data);
    } catch (error) {}
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {}
  };
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    const formData = {
      name: values.name,
      countryId: values.countryId,
      imageUrl: imageUrl?.url || dataCity?.imageUrl,
      description: values.description,
      toDisplayedInMainScreen: values.toDisplayedInMainScreen,
      usedInSojoriSysytem: values.usedInSojoriSysytem,
      gpsPosition: values.gpsPosition
    };
    try {
      const response = await updateCity(dataCity?._id, formData);
      onUpdateCity(response.data.city);
      toast.success(t("City updated successfully"));
      resetForm();
      onClose();
    } catch (error) {
      setErrorMessage(error.message || t('An error occurred while updating the city'));
      toast.error(error.message || t('An error occurred while updating the city'));
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };
  return <Dialog PaperProps={{
    style: {
      width: 800
    }
  }} open={open} onClose={onClose}>
      <DialogTitle sx={{
      padding: '30px',
      textAlign: 'center'
    }} className="!bg-medium-aquamarine !text-white mb-4">{t('Modify City')}</DialogTitle>
      <DialogContent>
        <Formik initialValues={{
        name: dataCity?.name || '',
        countryId: dataCity?.countryId || '',
        description: dataCity?.description || {},
        toDisplayedInMainScreen: dataCity?.toDisplayedInMainScreen || false,
        usedInSojoriSysytem: dataCity?.usedInSojoriSysytem || false,
        gpsPosition: dataCity?.gpsPosition || {
          lat: '',
          lng: ''
        }
      }} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
          {({
          isSubmitting,
          setFieldValue,
          values
        }) => <Form>
              <div className="mb-3">
                <Field as={TextField} fullWidth label={t('City Name')} name="name" margin="normal" />
                <ErrorMessage name="name" component="div" className="text-danger" />
              </div>

              <div className="mb-3">
                <Autocomplete disablePortal id="countryId" options={countries} getOptionLabel={option => option.name} value={countries.find(country => country._id === values.countryId) || null} onChange={(event, value) => setFieldValue('countryId', value?._id || '')} renderInput={params => <TextField {...params} label={t('Country')} margin="normal" />} />
                <ErrorMessage name="countryId" component="div" className="text-danger" />
              </div>

              <FieldArray name="description">
                {({
              push,
              remove
            }) => <div className='p-3 mb-3 border-gray-200 border-dashed border-1'>
                    {Object.entries(values.description).map(([langId, descValue], index) => <div key={langId} className="mb-2 text-center">
                        <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.description).includes(lang._id) || lang._id === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang._id === langId) || null} onChange={(event, value) => {
                  if (value) {
                    const newDescription = {
                      ...values.description
                    };
                    delete newDescription[langId];
                    newDescription[value._id] = descValue;
                    setFieldValue('description', newDescription);
                  }
                }} renderInput={params => <TextField {...params} label={t('Language')} margin="normal" />} />
                        <Field as={TextField} fullWidth label={t('Description')} name={`description.${langId}`} multiline rows={4} margin="normal" />
                        <Button variant="outlined" className="!bg-red-400 !text-white !rounded-md" onClick={() => {
                  const newDescription = {
                    ...values.description
                  };
                  delete newDescription[langId];
                  setFieldValue('description', newDescription);
                }}>
                          <CloseIcon />
                        </Button>
                      </div>)}
                    <div className="flex items-center justify-center">
                      <Button variant="contained" className="!bg-medium-aquamarine !text-white !rounded-md" startIcon={<AddIcon />} onClick={() => {
                  const availableLanguages = languages.filter(lang => !Object.keys(values.description).includes(lang._id));
                  if (availableLanguages.length > 0) {
                    const newLangId = availableLanguages[0]._id;
                    setFieldValue(`description.${newLangId}`, '');
                  }
                }}>
                      </Button>
                    </div>

                  </div>}
              </FieldArray>

              <div className="mb-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Field as={TextField} fullWidth label={t('Latitude')} name="gpsPosition.lat" type="number" slotProps={{
                  htmlInput: {
                    step: "any"
                  }
                }} margin="normal" />
                    <ErrorMessage name="gpsPosition.lat" component="div" className="text-danger" />
                  </div>
                  <div>
                    <Field as={TextField} fullWidth label={t('Longitude')} name="gpsPosition.lng" type="number" slotProps={{
                  htmlInput: {
                    step: "any"
                  }
                }} margin="normal" />
                    <ErrorMessage name="gpsPosition.lng" component="div" className="text-danger" />
                  </div>
                </div>
              </div>


              <div className="mb-3">
                <label htmlFor="image">{t('Image')}</label>
                <Switch checked={displayImage} onChange={() => setDisplayImage(!displayImage)} />
                {displayImage ? <ImageUpload label={t('Select image')} style={{
              img: {
                height: '300px',
                width: '100%'
              }
            }} avatar folder="city" /> : <img src={dataCity?.imageUrl || ''} alt="img" />}
              </div>
              <div className="flex items-center justify-around gap-4 mb-3 ">
                <div className="mb-3 text-center">
                  <label htmlFor="toDisplayedInMainScreen" className="form-label">{t('Main Screen')}</label>
                  <div>
                    <Field as={Switch} type="checkbox" id="toDisplayedInMainScreen" name="toDisplayedInMainScreen" className="form-check-input" />
                  </div>
                  <ErrorMessage name="toDisplayedInMainScreen" component="div" className="text-danger" />
                </div>

                <div className="mb-3 text-center">
                  <label htmlFor="usedInSojoriSysytem" className="form-label">{t('Active')}</label>
                  <div>
                    <Field as={Switch} type="checkbox" id="usedInSojoriSysytem" name="usedInSojoriSysytem" className="form-check-input" />
                  </div>
                  <ErrorMessage name="usedInSojoriSysytem" component="div" className="text-danger" />
                </div>
              </div>
              {errorMessage && <div className="mb-3 text-danger">{errorMessage}</div>}

              <DialogActions>
                <Button onClick={onClose} color="secondary">
                  {t('Cancel')}
                </Button>
                <Button type="submit" className="!bg-medium-aquamarine text-white" disabled={isSubmitting || isLoading}>
                  {isLoading ? t('Updating...') : t('Update')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default ModifyCityDialog;
