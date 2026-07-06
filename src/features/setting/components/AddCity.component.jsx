import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { createCity, getcountries, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const AddCityDialog = ({
  open,
  onClose,
  addCity
}) => {
  const {
    t
  } = useTranslation('common');
  const upload = useSelector(state => state.uploadData);
  const {
    iconUrl
  } = upload;
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  useEffect(() => {
    fetchCountriesData();
    fetchLanguages();
  }, []);
  useEffect(() => {
    if (iconUrl) {
      setImageUrl(iconUrl);
    }
  }, [iconUrl]);
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    setIsLoading(true);
    const formData = {
      name: values.name,
      countryId: values.countryId,
      imageUrl: imageUrl?.url,
      description: values.description,
      toDisplayedInMainScreen: values.toDisplayedInMainScreen,
      gpsPosition: values.gpsPosition
    };
    try {
      const data = await createCity(formData);
      addCity(data?.data?.city);
      setSubmitting(false);
      onClose();
      toast.success(t("City added successfully"));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
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
    }} className="!bg-medium-aquamarine !text-white mb-4">{t('Add City')}</DialogTitle>
      <DialogContent>
        {errorMessage && <h5 className='text-center text-danger'>{errorMessage}</h5>}
        <Formik initialValues={{
        name: '',
        countryId: '',
        description: {},
        toDisplayedInMainScreen: true,
        gpsPosition: {
          lat: '',
          lng: ''
        }
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          isValid,
          dirty,
          values
        }) => <Form encType="multipart/form-data">
              <div className="mb-3 text-center">
                <label htmlFor="name" className="form-label">
                  {t('City Name')}
                </label>
                <Field type="text" id="name" name="name" className="form-control" autoComplete="off" />
                <ErrorMessage name="name" component="div" className="text-danger" />
              </div>

              <div className="mb-3 text-center">
                <label htmlFor="countryId" className="form-label">
                  {t('Country')}
                </label>
                {countries && countries.length > 0 && <Autocomplete disablePortal id="countryId" options={countries} getOptionLabel={option => option.name} onChange={(event, value) => {
              if (value) {
                setFieldValue('countryId', value._id);
              } else {
                setFieldValue('countryId', '');
              }
            }} renderInput={params => <TextField {...params} label={t('Country')} />} />}
                <ErrorMessage name="countryId" component="div" className="text-danger" />
              </div>
              <FieldArray name="languages">
                {({
              push,
              remove
            }) => <div className=''>
                    {Object.entries(values.description).map(([langId, descValue], index) => <div key={langId}>
                        <div className=''>
                          <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.description).includes(lang._id))} getOptionLabel={option => option.name} value={languages.find(lang => lang._id === langId) || null} onChange={(event, value) => {
                    if (value) {
                      const newDescription = {
                        ...values.description
                      };
                      delete newDescription[langId];
                      newDescription[value._id] = '';
                      setFieldValue('description', newDescription);
                    }
                  }} renderInput={params => <TextField margin="normal" className="!w-full" {...params} label={t('Select Language')} />} />
                        </div>
                        <Field name={`description.${langId}`} as={TextField} label={t('Description')} fullWidth margin="normal" multiline rows={4} />
                        <div className='text-center'>
                          <Button variant="outlined" className="!my-1 !bg-red-400 !text-white !rounded-md" onClick={() => {
                    const newDescription = {
                      ...values.description
                    };
                    delete newDescription[langId];
                    setFieldValue('description', newDescription);
                  }}>
                            <CloseIcon />
                          </Button>
                        </div>
                      </div>)}
                    <div className='text-center'>
                    <Button className='!bg-medium-aquamarine !text-white !rounded-md' onClick={() => {
                  const availableLanguages = languages.filter(lang => !Object.keys(values.description).includes(lang._id));
                  if (availableLanguages.length > 0) {
                    const newLangId = availableLanguages[0]._id;
                    setFieldValue(`description.${newLangId}`, '');
                  }
                }}>
                      <AddIcon className='!text-white' />
                    </Button>
                    </div> 
                  </div>}
              </FieldArray>

              <div className="mb-3">
                <label className="form-label">{t('GPS Position')}</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Field as={TextField} fullWidth label={t('Latitude')} name="gpsPosition.lat" type="number" slotProps={{
                  htmlInput: {
                    step: "any"
                  }
                }} />
                    <ErrorMessage name="gpsPosition.lat" component="div" className="text-danger" />
                  </div>
                  <div>
                    <Field as={TextField} fullWidth label={t('Longitude')} name="gpsPosition.lng" type="number" slotProps={{
                  htmlInput: {
                    step: "any"
                  }
                }} />
                    <ErrorMessage name="gpsPosition.lng" component="div" className="text-danger" />
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="image" className="form-label">
                  {t('Image')}
                </label>
                <ImageUpload style={{
              img: {
                height: '300px',
                width: '100%'
              }
            }} label={t('Select image')} folder="city" avatar />
              </div>



              <div className="mb-3 text-center">
                <label htmlFor="toDisplayedInMainScreen" className="form-label">
                  {t('Main Screen')}
                </label>
                <div>
                  <Field as={Switch} type="checkbox" id="toDisplayedInMainScreen" name="toDisplayedInMainScreen" className="form-check-input" />
                </div>
                <ErrorMessage name="toDisplayedInMainScreen" component="div" className="text-danger" />
              </div>

              <DialogActions>
                <Button onClick={onClose} color="secondary">
                  {t('Cancel')}
                </Button>
                <Button type="submit" className="!bg-medium-aquamarine text-white" disabled={isSubmitting || !isValid || !dirty}>
                  {isLoading ? t('Adding...') : t('Add')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default AddCityDialog;
