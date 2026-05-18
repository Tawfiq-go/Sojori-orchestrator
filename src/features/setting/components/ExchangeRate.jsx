import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Added for translations
import { TextField, Button, Typography, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import { getExchangeRates, updateExchangeRate } from '../services/serverApi.adminConfig';
import { ToastContainer, toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const StyledButton = styled(Button)({
  background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
  color: 'white',
  padding: '8px 24px',
  borderRadius: '8px',
  height: '42px',
  fontWeight: 600,
  fontSize: '14px',
  textTransform: 'none',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
    background: 'linear-gradient(135deg, #E55A2B 0%, #FF6B35 100%)'
  },
  '&:active': {
    transform: 'translateY(0)'
  }
});
const ExchangeRateComponent = () => {
  const {
    t
  } = useTranslation('common'); // Added for translations
  const [initialValues, setInitialValues] = useState({
    rate: ''
  });
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(true);
  const validationSchema = Yup.object({
    rate: Yup.number().positive(t('Rate must be greater than 0')).required(t('Rate is required'))
  });
  useEffect(() => {
    fetchRate();
  }, []);
  const fetchRate = async () => {
    try {
      const response = await getExchangeRates();
      setInitialValues({
        rate: response.data.rate
      });
      setId(response.data._id);
    } catch (error) {} finally {
      setLoading(false);
    }
  };
  const handleSave = async values => {
    try {
      await updateExchangeRate(id, {
        rate: values.rate
      });
      toast.success(t('Exchange rate updated successfully'));
    } catch (error) {
      toast.error(t('Failed to update exchange rate: ') + error.message);
    }
  };
  return <div className="card p-4 !border-none">
            <ToastContainer />

            <Typography variant="h4" gutterBottom>
                {t('Exchange Rate')}
            </Typography>
            {loading ? <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%'
    }}>
                    <CircularProgress style={{
        color: '#00b4b4'
      }} />
                </div> : <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSave} enableReinitialize={true}>
                {({
        setFieldValue,
        isSubmitting
      }) => <Form className="flex gap-4 flex-row p-4 items-center">
                        <span className="text-lg">{t('Exchange Rate')}</span>

                        <Field name="rate">
                            {({
            field,
            form
          }) => <div>
                                    <TextField type="number" {...field} error={Boolean(form.errors.rate && form.touched.rate)} helperText={<ErrorMessage name="rate" />} inputProps={{
              min: 1
            }} onChange={e => setFieldValue('rate', e.target.value)} />
                                </div>}
                        </Field>

                        <StyledButton type="submit" className="!text-white" disabled={isSubmitting} startIcon={<SaveIcon />}>
                            {t('Save')}
                        </StyledButton>
                    </Form>}
            </Formik>}
        </div>;
};
export default ExchangeRateComponent;
