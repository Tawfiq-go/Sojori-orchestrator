import React, { useState } from 'react'; import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateCountry } from '../services/serverApi.adminConfig';

const ModifyCountryManDialog = ({ open, onClose, onUpdateCountry, dataCountry }) => {
  const { t } = useTranslation('common'); const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(t('Name is required')),
    currency: Yup.string().required(t('Currency is required')),
    countryCode: Yup.string().required(t('Country Code is required')),
    rentalCountryId: Yup.number().typeError(t('Must be a number')).nullable(),
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setIsLoading(true);
    setErrorMessage('');
    const dataToSend = {
      country: {
        name: values.name,
        currency: values.currency,
        countryCode: values.countryCode,
        rentalCountryId: values.rentalCountryId || null,
      }
    };
    try {
      const response = await updateCountry(dataCountry?._id, dataToSend);
      onUpdateCountry(response.data.country);
      toast.success(t("Country updated successfully"));
      resetForm();
      onClose();
    } catch (error) {
      setErrorMessage(error.message || t('Error updating country'));
      toast.error(error.message || t('Error updating country'));
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <Dialog PaperProps={{ style: { width: 500 } }} open={open} onClose={onClose}>
      <DialogTitle sx={{ padding: '30px', textAlign: 'center' }} className="!bg-medium-aquamarine !text-white mb-4"
      >{t('Modify Country')}</DialogTitle>
      <DialogContent>
        <Formik
          initialValues={{
            name: dataCountry?.name || '',
            currency: dataCountry?.currency || '',
            countryCode: dataCountry?.countryCode || '',
            rentalCountryId: dataCountry?.rentalCountryId || '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="mb-3">
                <label htmlFor="name" className="form-label">{t('Name')}</label>
                <Field type="text" name="name" className="form-control" />
                <ErrorMessage name="name" component="div" className="text-danger" />
              </div>
              
              <div className="mb-3">
                <label htmlFor="currency" className="form-label">{t('Currency')}</label>
                <Field type="text" name="currency" className="form-control" />
                <ErrorMessage name="currency" component="div" className="text-danger" />
              </div>

              <div className="mb-3">
                <label htmlFor="countryCode" className="form-label">{t('Country Code')}</label>
                <Field type="text" name="countryCode" className="form-control" />
                <ErrorMessage name="countryCode" component="div" className="text-danger" />
              </div>

              <div className="mb-3">
                <label htmlFor="rentalCountryId" className="form-label">{t('Rental Country ID (Optional)')}</label>
                <Field type="number" name="rentalCountryId" className="form-control" />
                <ErrorMessage name="rentalCountryId" component="div" className="text-danger" />
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
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default ModifyCountryManDialog;