import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { createLanguage, updateLanguage, deleteLanguage } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControlLabel, Checkbox } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmationDialog from './ConfirmationDialog';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector } from 'react-redux';
const LanguageDialog = ({
  showDialog,
  onClose,
  language,
  onLanguageChange
}) => {
  const {
    t
  } = useTranslation('common');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [languageToDelete, setLanguageToDelete] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(t('Name is required')),
    languageCode: Yup.string().required(t('Language code is required')),
    imageUrl: Yup.string().nullable(),
    useInTranslate: Yup.boolean()
  });
  const upload = useSelector(state => state.uploadData);
  const {
    iconUrl
  } = upload;
  useEffect(() => {
    if (iconUrl) {
      setImageUrl(iconUrl);
    }
  }, [iconUrl]);
  useEffect(() => {
    setImageUrl(language ? language.imageUrl : '');
  }, [showDialog, language]);
  const initialValues = {
    name: language ? language.name : '',
    languageCode: language ? language.languageCode : '',
    imageUrl: language ? language.imageUrl : '',
    useInTranslate: language ? language.useInTranslate : false
  };
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    setSubmitting(true);
    try {
      let formData = {
        ...values
      };
      if (!imageUrl) {
        delete formData.imageUrl;
      } else if (imageUrl?.url) {
        formData.imageUrl = imageUrl.url;
      }
      let response;
      if (language) {
        response = await updateLanguage(language._id, formData);
        toast.success(t('Language updated successfully'));
      } else {
        response = await createLanguage(formData);
        toast.success(t('Language created successfully'));
      }
      onLanguageChange(response.language, false);
      onClose();
    } catch (error) {
      toast.error(t(error.message));
    }
    setSubmitting(false);
  };
  const handleDeleteLanguage = language => {
    setLanguageToDelete(language);
    setShowConfirmation(true);
  };
  const confirmDeleteLanguage = async () => {
    try {
      await deleteLanguage(languageToDelete._id);
      onLanguageChange(languageToDelete, true);
      setShowConfirmation(false);
      toast.success(t('Language deleted successfully!'));
      onClose();
    } catch (error) {
      toast.error(t('Error deleting language'));
    }
  };
  return <>
            <Dialog open={showDialog} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle className='text-white bg-medium-aquamarine'>
                    {language && language._id ? t('Update Language') : t('Create Language')}
                </DialogTitle>
                <DialogContent>
                    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
                        {({
            isSubmitting,
            values
          }) => <Form>
                                <div className="px-4 pt-4">
                                    <Field name="name" className="w-full px-3 py-2 leading-tight text-gray-700 border rounded focus:outline-none focus:shadow-outline" placeholder={t('Name')} />
                                    <ErrorMessage name="name" component="div" className="text-xs italic text-red-500" />
                                </div>
                                <div className="px-4 pt-4">
                                    <Field name="languageCode" className="w-full px-3 py-2 leading-tight text-gray-700 border rounded focus:outline-none focus:shadow-outline" placeholder={t('Language Code')} />
                                    <ErrorMessage name="languageCode" component="div" className="text-xs italic text-red-500" />
                                </div>
                                <div className="px-4 pt-4">
                                    <ImageUpload style={{
                img: {
                  width: '10rem',
                  height: '10rem',
                  borderRadius: '100%',
                  margin: 'auto'
                }
              }} label={t('Select image')} folder="other" avatar defaultImage={values.imageUrl} allowClear={true} />
                                    <ErrorMessage name="imageUrl" component="div" className="text-xs italic text-red-500" />
                                </div>
                                <div className="px-4 pt-4">
                                    <FormControlLabel control={<Field name="useInTranslate" type="checkbox" as={Checkbox} checked={values.useInTranslate} />} label={t('Use in Translate')} />
                                    <ErrorMessage name="useInTranslate" component="div" className="text-xs italic text-red-500" />
                                </div>
                                <DialogActions>
                                    <div className="flex justify-between w-full px-4">
                                        <div>
                                            {language && language._id && <Button onClick={() => handleDeleteLanguage(language)} color="secondary" startIcon={<DeleteIcon />} className="!bg-red-500 text-white">
                                                </Button>}
                                        </div>
                                        <div>
                                            <Button onClick={onClose} color="secondary">
                                                {t('Cancel')}
                                            </Button>
                                            <Button type="submit" variant="contained" className="!bg-medium-aquamarine text-white" disabled={isSubmitting}>
                                                {isSubmitting ? t('Loading...') : language && language._id ? t('Update') : t('Create')}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogActions>
                            </Form>}
                    </Formik>
                </DialogContent>
            </Dialog>
            <ConfirmationDialog open={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={confirmDeleteLanguage} />
        </>;
};
export default LanguageDialog;
