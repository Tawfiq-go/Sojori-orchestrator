import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch, TextField, Autocomplete } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateblog, getcities, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector } from 'react-redux';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const ModifyBlogDialog = ({
  open,
  onClose,
  onUpdateBlog,
  dataBlog
}) => {
  const {
    t
  } = useTranslation('common');
  const [cities, setCities] = useState([]);
  const [languages, setLanguages] = useState([]);
  const upload = useSelector(state => state.uploadData);
  const {
    iconUrl
  } = upload;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [displayImage, setDisplayImage] = useState(false);
  const validationSchema = Yup.object().shape({
    cityName: Yup.string().required(t('City name is required')),
    ZoneName: Yup.string().required(t('Zone name is required')),
    cityId: Yup.string().required(t('City is required')),
    title: Yup.object().test('atLeastOneTitle', t('At least one title is required'), obj => Object.keys(obj).length > 0),
    description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
    displayed: Yup.boolean().required(t('Display flag is required'))
  });
  useEffect(() => {
    fetchCitiesData();
    fetchLanguages();
  }, []);
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
    if (iconUrl) {
      setImageUrl(iconUrl);
    }
  }, [iconUrl]);
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    const formData = {
      cityName: values.cityName,
      ZoneName: values.ZoneName,
      cityId: values.cityId,
      title: values.title,
      description: values.description,
      displayed: values.displayed,
      imageUrl: imageUrl?.url || dataBlog?.imageUrl
    };
    try {
      const response = await updateblog(dataBlog?._id, formData);
      onUpdateBlog(response.data.blog);
      toast.success(t("Blog updated successfully"));
      onClose();
    } catch (error) {
      setErrorMessage(error.message || t('An error occurred while updating the blog'));
      toast.error(error.message || t('An error occurred while updating the blog'));
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
    }} className="!bg-medium-aquamarine !text-white mb-4">{t('Modify Blog')}</DialogTitle>
      <DialogContent>
        <Formik initialValues={{
        cityName: dataBlog?.cityName || '',
        ZoneName: dataBlog?.ZoneName || '',
        cityId: dataBlog?.cityId || '',
        title: dataBlog?.title || {},
        description: dataBlog?.description || {},
        displayed: dataBlog?.displayed || false
      }} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
          {({
          isSubmitting,
          setFieldValue,
          values
        }) => <Form>
              <div className="mb-3">
                <Autocomplete disablePortal id="cityId" options={cities} getOptionLabel={option => option.name} value={cities.find(city => city._id === values.cityId) || null} onChange={(event, value) => {
              setFieldValue('cityId', value?._id || '');
              setFieldValue('cityName', value?.name || '');
            }} renderInput={params => <TextField {...params} label={t('City')} margin="normal" />} />
                <ErrorMessage name="cityId" component="div" className="text-danger" />
              </div>

              <div className="mb-3">
                <Field as={TextField} fullWidth label={t('Zone Name')} name="ZoneName" margin="normal" />
                <ErrorMessage name="ZoneName" component="div" className="text-danger" />
              </div>

              <FieldArray name="title">
                {({
              push,
              remove
            }) => <div className='p-3 mb-3 border-gray-200 border-dashed border-1'>
                    {Object.entries(values.title).map(([langId, titleValue], index) => <div key={langId} className="mb-2 text-center">
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
                    newTitle[value._id] = titleValue;
                    newDescription[value._id] = values.description[langId] || '';
                    setFieldValue('title', newTitle);
                    setFieldValue('description', newDescription);
                  }
                }} renderInput={params => <TextField {...params} label={t('Language')} margin="normal" />} />
                        <Field as={TextField} fullWidth label={t('Title')} name={`title.${langId}`} margin="normal" />
                        <Field as={TextField} fullWidth label={t('Description')} name={`description.${langId}`} multiline rows={4} margin="normal" />


                        <Button variant="outlined" className="!bg-red-400 !text-white !rounded-md" onClick={() => {
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
                      </div>)}
                    <div className="flex items-center justify-center">
                      <Button variant="contained" className="!bg-medium-aquamarine !text-white !rounded-md" startIcon={<AddIcon />} onClick={() => {
                  const availableLanguages = languages.filter(lang => !Object.keys(values.title).includes(lang._id));
                  if (availableLanguages.length > 0) {
                    const newLangId = availableLanguages[0]._id;
                    setFieldValue(`title.${newLangId}`, '');
                    setFieldValue(`description.${newLangId}`, '');
                  }
                }}>
                      </Button>
                    </div>
                  </div>}
              </FieldArray>

              <div className="mb-3">
                <label htmlFor="image">{t('Image')}</label>
                <Switch checked={displayImage} onChange={() => setDisplayImage(!displayImage)} />
                {displayImage ? <ImageUpload style={{
              img: {
                height: '300px',
                width: '100%'
              }
            }} label={t('Select image')} folder="blog" avatar /> : <img src={dataBlog?.imageUrl || ''} alt="Blog" />}
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
export default ModifyBlogDialog;
