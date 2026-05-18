import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { createblog, getcities, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const AddBlogDialog = ({
  open,
  onClose,
  addBlog
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
  const validationSchema = Yup.object().shape({
    cityName: Yup.string().required(t('City name is required')),
    ZoneName: Yup.string().required(t('Country is required')),
    cityId: Yup.string().required(t('cityId is required')),
    title: Yup.object().test('atLeastOneTitle', t('At least one title is required'), obj => Object.keys(obj).length > 0),
    description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
    displayed: Yup.boolean().required(t('Display flag is required'))
  });
  const fetchCountriesData = async () => {
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
    fetchLanguages();
    fetchCountriesData();
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
      title: values.title,
      description: values.description,
      cityName: values.cityName,
      ZoneName: values.ZoneName,
      cityId: values.cityId,
      displayed: values.displayed,
      imageUrl: imageUrl?.url
    };
    try {
      const data = await createblog(formData);
      addBlog(data?.data?.blog);
      setSubmitting(false);
      onClose();
      toast.success(t("Blog added successfully"));
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
    }} className="!bg-medium-aquamarine !text-white mb-4">{t('Add Blog')}</DialogTitle>
      <DialogContent>
        {errorMessage && <h5 className='text-center text-danger'>{errorMessage}</h5>}
        <Formik initialValues={{
        cityName: "",
        ZoneName: "",
        cityId: "",
        title: {},
        description: {},
        displayed: true
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          isValid,
          dirty,
          values
        }) => <Form encType="multipart/form-data">
              <div className="mb-3 text-center">
                <label htmlFor="cityName" className="form-label">
                  {t('City Name')}
                </label>
                {cities && cities.length > 0 && <Autocomplete disablePortal id="cityName" options={cities} getOptionLabel={option => option.name} onChange={(event, value) => {
              if (value) {
                setFieldValue('cityName', value.name);
                setFieldValue('cityId', value._id);
              } else {
                setFieldValue('cityName', '');
                setFieldValue('cityId', '');
              }
            }} renderInput={params => <TextField {...params} label={t('City Name')} />} />}
                <ErrorMessage name="cityId" component="div" className="text-danger" />
              </div>

              <div className="mb-3 text-center">
                <label htmlFor="ZoneName" className="form-label">
                  {t('Zone Name')}
                </label>
                <Field type="text" id="ZoneName" name="ZoneName" className="form-control" autoComplete="off" />
                <ErrorMessage name="ZoneName" component="div" className="text-danger" />
              </div>
              
              <FieldArray name="languages">
                {({
              push,
              remove
            }) => <div className=''>
                    {Object.entries(values.title).map(([langId, titleValue], index) => <div key={langId}>
                        <div className=''>
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
                  }} renderInput={params => <TextField margin="normal" className="!w-full" {...params} label={t('Select Language')} />} />
                        <Field name={`title.${langId}`} as={TextField} label={t('Title')} fullWidth margin="normal" />
                        </div>
                        <Field name={`description.${langId}`} as={TextField} label={t('Description')} fullWidth multiline rows={4} />
                        <div className='text-center'>
                          <Button variant="outlined" className="!my-1 !bg-red-400 !text-white !rounded-md" onClick={() => {
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
                            <CloseIcon />
                          </Button>
                        </div>
                      </div>)}
                    <div className='text-center'>
                    <Button className='!bg-medium-aquamarine !text-white !rounded-md' onClick={() => {
                  const availableLanguages = languages.filter(lang => !Object.keys(values.title).includes(lang._id));
                  if (availableLanguages.length > 0) {
                    const newLangId = availableLanguages[0]._id;
                    setFieldValue(`title.${newLangId}`, '');
                    setFieldValue(`description.${newLangId}`, '');
                  }
                }}>
                      <AddIcon className='!text-white' />
                    </Button>
                    </div> 
                  </div>}
              </FieldArray>

              <div className="mb-3">
                <label htmlFor="image" className="form-label">
                  {t('Image')}
                </label>
                <ImageUpload style={{
              img: {
                height: '300px',
                width: '100%'
              }
            }} label={t('Select image')} folder="blog" avatar />
              </div>

              <div className="mb-3 text-center">
                <label htmlFor="displayed" className="form-label">
                  {t('Displayed')}
                </label>
                <div>
                  <Field as={Switch} type="checkbox" id="displayed" name="displayed" className="form-check-input" />
                </div>
                <ErrorMessage name="displayed" component="div" className="text-danger" />
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
export default AddBlogDialog;
