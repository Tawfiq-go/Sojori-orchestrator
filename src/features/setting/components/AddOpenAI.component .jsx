import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { createOpenAiInit } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const validationSchema = Yup.object().shape({
  type: Yup.string().required('Type is required'),
  api_key: Yup.string().required('API Key is required'),
  embedding_model: Yup.string().required('Embedding Model is required'),
});

const AddCountryDialog = ({ open, onClose, addOpenAiInit }) => {
  const { t } = useTranslation('common');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    const dataToSend = {
        type: values.type,
        api_key: values.api_key,
        embedding_model: values.embedding_model,
    };
    createOpenAiInit(dataToSend)
      .then((data) => {
        addOpenAiInit(data);
        setSubmitting(false);
        onClose();
        toast.success(t('OpenAI added successfully'));
      })
      .catch(error => {
        setErrorMessage(t(error.message));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog PaperProps={{ style: { width: 500 } }} open={open} onClose={onClose}>
      <DialogTitle sx={{ padding: '30px', textAlign: 'center' }}>{t('Add OpenAI Init')}</DialogTitle>
      <DialogContent>
        {errorMessage && <h5 className='text-center text-danger'>{errorMessage}</h5>}
        <Formik
          initialValues={{ type: '', api_key: '', embedding_model: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, isValid, dirty }) => (
            <Form encType="multipart/form-data">
              <div className="mb-3">
                <label htmlFor="type" className="form-label">
                  {t('Type')}
                </label>
                <Field
                  type="text"
                  id="type"
                  name="type"
                  className="form-control"
                  autoComplete="off"
                />
                <ErrorMessage name="type" component="div" className="text-danger" />
              </div>
              <div className="mb-3">
                <label htmlFor="api_key" className="form-label">
                  {t('API Key')}
                </label>
                <Field
                  type="text"
                  id="api_key"
                  name="api_key"
                  className="form-control"
                  autoComplete="off"
                />
                <ErrorMessage name="api_key" component="div" className="text-danger" />
              </div>
              <div className="mb-3">
                <label htmlFor="embedding_model" className="form-label">
                  {t('Embedding Model')}
                </label>
                <Field
                  type="text"
                  id="embedding_model"
                  name="embedding_model"
                  className="form-control"
                  autoComplete="off"
                />
                <ErrorMessage name="embedding_model" component="div" className="text-danger" />
              </div>
              <DialogActions>
                <Button onClick={onClose} color="secondary">
                  {t('Cancel')}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting || !isValid || !dirty}>
                  {isLoading ? t('Adding') : t('Add')}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default AddCountryDialog;