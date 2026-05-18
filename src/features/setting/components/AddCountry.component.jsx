import React, { useState } from 'react'; import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { createCountry } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';

const AddCountryDialog = ({ open, onClose, addCountry }) => {
  const { t } = useTranslation('common'); const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(t('Country name is required')),
    currency: Yup.string().required(t('Currency is required')),
    countryCode: Yup.string().required(t('country Code is required')),
    rentalCountryId: Yup.number().typeError(t('Must be a number')).nullable(),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    const dataToSend = {
      country: {
        name: values.name,
        currency: values.currency,
        countryCode: values.countryCode,
        rentalCountryId: values.rentalCountryId || null,
      }
    };
    createCountry(dataToSend)
      .then((data) => {
        addCountry(data)
        setSubmitting(false);
        onClose();
        toast.success(t("Country added successfully"));
      })
      .catch(error => {
        setErrorMessage(error.message); // Assuming error.message contains error text
      })
      .finally(() => {
        setIsLoading(false); // End loading
      });
  };

  return (
    <Dialog PaperProps={{ style: { width: 800 } }} open={open} onClose={onClose}>
      <DialogTitle sx={{ padding: '30px', textAlign: 'center' }} className="!bg-medium-aquamarine !text-white mb-4"
      >{t('Add Country')}</DialogTitle>
      <DialogContent>
        {errorMessage && <h5 className='text-center text-danger'>{errorMessage}</h5>}
        <Formik
          initialValues={{ name: '', currency: '', countryCode: '', rentalCountryId: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, isValid, dirty }) => (
            <Form encType="multipart/form-data">
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  {t('Country Name')}
                </label>
                <Field
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  autoComplete="off"
                />
                <ErrorMessage name="name" component="div" className="text-danger" />
              </div>
              <div className="mb-3">
                <label htmlFor="currency" className="form-label">
                  {t('Currency')}
                </label>
                <Field
                  type="text"
                  id="currency"
                  name="currency"
                  className="form-control"
                  autoComplete="off"
                />
                <ErrorMessage name="currency" component="div" className="text-danger" />
              </div>
              <div className="mb-3">
                <label htmlFor="country Code" className="form-label">
                  {t('Country Code')}
                </label>
                <Field
                  type="text"
                  id="countryCode"
                  name="countryCode"
                  className="form-control"
                  autoComplete="off"
                />
                <ErrorMessage name="countryCode" component="div" className="text-danger" />
              </div>
              <div className="mb-3">
                <label htmlFor="rentalCountryId" className="form-label">
                  {t('Rental Country ID (Optional)')}
                </label>
                <Field
                  type="number"
                  id="rentalCountryId"
                  name="rentalCountryId"
                  className="form-control"
                  autoComplete="off"
                />
                <ErrorMessage name="rentalCountryId" component="div" className="text-danger" />
              </div>
              <DialogActions>
                <Button onClick={onClose} color="secondary">
                  {t('Cancel')}
                </Button>
                <Button type="submit" className="!bg-medium-aquamarine text-white" disabled={isSubmitting || !isValid || !dirty}>
                  {isLoading ? t('Adding...') : t('Add')}
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