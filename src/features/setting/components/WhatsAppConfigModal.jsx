import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, IconButton, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateWhatsappConfig } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import ImageUpload from 'components/CustomUpload/UploadV2';
import defaultAvatar from 'assets/images/placeholder.jpg';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
const WhatsAppConfigModal = ({
  open,
  onClose,
  setWhatsappConfig,
  config,
  configId,
  featureOrder,
  languages,
  activeTab
}) => {
  const {
    t
  } = useTranslation('common');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const updatedConfig = {
        ...config,
        ...values
      };
      const response = await updateWhatsappConfig(configId, updatedConfig);
      if (response && response.data && response.data.whatsappConfig) {
        setWhatsappConfig(response.data.whatsappConfig);
        setSubmitting(false);
        onClose();
        toast.success(t('WhatsApp configuration updated successfully'));
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      setErrorMessage(error.message || t('An error occurred while processing your request.'));
      setSubmitting(false);
      toast.error(t('Error updating WhatsApp configuration'));
    } finally {
      setIsLoading(false);
    }
  };
  const getInitialValues = () => {
    switch (activeTab) {
      case 0:
        return {
          title: config.title,
          description: config.description
        };
      case 1:
        return {
          blogTitle: config.blogTitle,
          blogDescription: config.blogDescription
        };
      case 2:
        return {
          vdUrl: config.vdUrl
        };
      case 3:
        return {
          imageUrl: config.imageUrl,
          imageTitle: config.imageTitle,
          imageDescription: config.imageDescription
        };
      case 4:
        return {
          features: featureOrder
        };
      default:
        return {};
    }
  };
  const getValidationSchema = () => {
    switch (activeTab) {
      case 0:
        return Yup.object().shape({
          title: Yup.object().test('at-least-one-title', t('At least one title is required'), obj => Object.keys(obj).length > 0),
          description: Yup.object().test('at-least-one-description', t('At least one description is required'), obj => Object.keys(obj).length > 0)
        });
      case 1:
        return Yup.object().shape({
          blogTitle: Yup.object().test('at-least-one-blog-title', t('At least one blog title is required'), obj => Object.keys(obj).length > 0),
          blogDescription: Yup.object().test('at-least-one-blog-description', t('At least one blog description is required'), obj => Object.keys(obj).length > 0)
        });
      case 2:
        return Yup.object().shape({
          vdUrl: Yup.string().required(t('Video URL is required'))
        });
      case 3:
        return Yup.object().shape({
          imageUrl: Yup.string().required(t('Image URL is required')),
          imageTitle: Yup.object().test('at-least-one-image-title', t('At least one image title is required'), obj => Object.keys(obj).length > 0),
          imageDescription: Yup.object().test('at-least-one-image-description', t('At least one image description is required'), obj => Object.keys(obj).length > 0)
        });
      case 4:
        return Yup.object().shape({
          features: Yup.array().of(Yup.object().shape({
            txt: Yup.object().test('at-least-one-feature-text', t('At least one feature text is required'), obj => Object.keys(obj).length > 0),
            iconUrl: Yup.string().required(t('Feature icon URL is required'))
          }))
        });
      default:
        return Yup.object();
    }
  };
  const renderFormFields = (values, errors, setFieldValue) => {
    const isVideo = values.vdUrl && values.vdUrl.includes('/MS/videos/');
    const isImage = values.vdUrl && values.vdUrl.includes('/MS/images/');
    switch (activeTab) {
      case 0:
        return <>
                        <Typography variant="h6">{t('Title')}</Typography>
                        <MultiLingualField t={t} name="title" values={values.title} errors={errors.title} setFieldValue={setFieldValue} languages={languages} />
                        <Typography variant="h6">{t('Description')}</Typography>
                        <MultiLingualField t={t} name="description" values={values.description} errors={errors.description} setFieldValue={setFieldValue} languages={languages} multiline />
                    </>;
      case 1:
        return <>
                        <Typography variant="h6">{t('Blog Title')}</Typography>
                        <MultiLingualField t={t} name="blogTitle" values={values.blogTitle} errors={errors.blogTitle} setFieldValue={setFieldValue} languages={languages} />
                        <Typography variant="h6">{t('Blog Description')}</Typography>
                        <MultiLingualField t={t} name="blogDescription" values={values.blogDescription} errors={errors.blogDescription} setFieldValue={setFieldValue} languages={languages} multiline />
                    </>;
      case 2:
        return <div className="flex flex-col items-center">
                        <Typography variant="h6" className="mb-2">
                            {t(isVideo ? 'Video' : 'Image')}
                        </Typography>
                        {isVideo ? <video src={values.vdUrl} controls className="w-full mt-2 mb-2 max-w-[400px] max-h-[300px]">
                                Your browser does not support the video tag.
                            </video> : <img src={isImage ? values.vdUrl : defaultAvatar} alt={t('Uploaded media')} className="w-full mt-2 mb-2 max-w-[400px] max-h-[300px] object-contain" />}
                        <ImageUpload fieldName="vdUrl" setFieldValue={setFieldValue} folder="other" />
                    </div>;
      case 3:
        return <>
                        <div className="flex flex-col items-center">
                            <Typography variant="h6" className="mb-2">{t('Image')}</Typography>
                            <img src={values.imageUrl || defaultAvatar} alt="Uploaded" className="w-full mt-2 mb-2" style={{
              maxWidth: '400px',
              maxHeight: '300px'
            }} />
                            <ImageUpload fieldName="imageUrl" setFieldValue={setFieldValue} folder="other" />
                        </div>
                        <Typography variant="h6">{t('Image Title')}</Typography>
                        <MultiLingualField t={t} name="imageTitle" values={values.imageTitle} errors={errors.imageTitle} setFieldValue={setFieldValue} languages={languages} />
                        <Typography variant="h6">{t('Image Description')}</Typography>
                        <MultiLingualField t={t} name="imageDescription" values={values.imageDescription} errors={errors.imageDescription} setFieldValue={setFieldValue} languages={languages} multiline />
                    </>;
      case 4:
        return <FieldArray name="features">
                        {({
            push,
            remove
          }) => <>
                                {values.features.map((feature, index) => <Box key={index} sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mb: 2
            }}>
                                        <div className="flex items-center justify-between">
                                            <Typography variant="subtitle1">{t('Feature {number}', {
                    number: index + 1
                  })}</Typography>
                                            <Button onClick={() => remove(index)}>
                                                <DeleteIcon className="text-gray-400 !w-8 !h-8" />
                                            </Button>
                                        </div>
                                        <MultiLingualField t={t} name={`features.${index}.txt`} values={feature.txt} errors={errors.features?.[index]?.txt} setFieldValue={setFieldValue} languages={languages} />
                                        <div className="flex flex-col items-center">
                                            <Typography variant="h6" className="mb-2">{t('Icon')}</Typography>
                                            <img src={feature.iconUrl || defaultAvatar} alt="Uploaded" className="h-20 mb-2 w-30" />
                                            <ImageUpload fieldName={`features.${index}.iconUrl`} setFieldValue={setFieldValue} folder="other" />
                                        </div>
                                    </Box>)}
                                <div className="text-center">
                                    <Button className="!bg-[#ffcc00] !text-white flex items-center gap-1" onClick={() => push({
                txt: {},
                iconUrl: ''
              })}>
                                        <AddCircleOutlineIcon className="!w-4 !h-4 !font-bold" />
                                        {t('Add Feature')}
                                    </Button>
                                </div>
                            </>}
                    </FieldArray>;
      default:
        return null;
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{t('Update WhatsApp Configuration')}</DialogTitle>
            <DialogContent>
                {errorMessage && <Typography color="error">{errorMessage}</Typography>}
                <Formik initialValues={getInitialValues()} validationSchema={getValidationSchema()} onSubmit={handleSubmit}>
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
                                {renderFormFields(values, errors, setFieldValue)}
                            </Box>
                            <DialogActions>
                                <Button onClick={onClose} className="!text-gray-500" disabled={isLoading}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" color="primary" className="!bg-medium-aquamarine !text-white" disabled={isLoading}>
                                    {isLoading ? <CircularProgress size={12} /> : <span>{t('Update')}</span>}
                                </Button>
                            </DialogActions>
                        </Form>}
                </Formik>
            </DialogContent>
        </Dialog>;
};
const MultiLingualField = ({
  t,
  name,
  values,
  errors,
  setFieldValue,
  languages,
  multiline = false
}) => {
  return <FieldArray name={name}>
            {({
      remove
    }) => <>
                    {Object.entries(values).map(([langId, value]) => <Box key={langId} sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
                            <TextField fullWidth multiline={multiline} rows={multiline ? 4 : 1} label={`${languages.find(lang => lang._id === langId)?.name || 'Unknown'}`} value={value} onChange={e => setFieldValue(`${name}.${langId}`, e.target.value)} error={Boolean(errors?.[langId])} helperText={errors?.[langId]} />
                            <IconButton onClick={() => {
          const newValues = {
            ...values
          };
          delete newValues[langId];
          setFieldValue(name, newValues);
        }}>
                                <DeleteIcon />
                            </IconButton>
                        </Box>)}
                    <FormControl fullWidth>
                        <InputLabel>{t('Add Language')}</InputLabel>
                        <Select value="" onChange={e => {
          const langId = e.target.value;
          if (!values[langId]) {
            setFieldValue(`${name}.${langId}`, "");
          }
        }}>
                            {languages.map(lang => <MenuItem key={lang._id} value={lang._id} disabled={lang._id in values}>
                                    {lang.name}
                                </MenuItem>)}
                        </Select>
                    </FormControl>
                </>}
        </FieldArray>;
};
export default WhatsAppConfigModal;
