import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Added for translations
import { TextField, IconButton, Typography, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { getConfigReservation, updateConfigReservation } from '../services/serverApi.adminConfig';
import { ToastContainer, toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
const ConfigReservationComponent = () => {
  const {
    t
  } = useTranslation('common'); // Added for translations
  const [initialValues, setInitialValues] = useState({
    beforeCheckinDays: ''
  });
  const [loading, setLoading] = useState(true);
  const validationSchema = Yup.object({
    beforeCheckinDays: Yup.number().positive(t('Days must be greater than 0')).required(t('Days are required'))
  });
  useEffect(() => {
    fetchConfig();
  }, []);
  const fetchConfig = async () => {
    try {
      const response = await getConfigReservation();
      setInitialValues({
        beforeCheckinDays: response.data.data.beforeCheckinDays
      });
    } catch (error) {
      toast.error(t('Failed to fetch configuration'));
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async values => {
    try {
      await updateConfigReservation({
        beforeCheckinDays: Number(values.beforeCheckinDays)
      });
      toast.success(t('Reservation configuration updated successfully'));
    } catch (error) {
      toast.error(t('Failed to update configuration: ') + error.message);
    }
  };
  return <div className="card p-4 !border-none">
            <ToastContainer />

            <Typography variant="h4" gutterBottom>
                {t('Reservation Configuration')}
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
                            <span className="text-lg">{t('Before Checkin Days')}</span>

                            <Field name="beforeCheckinDays">
                                {({
            field,
            form
          }) => <div>
                                        <TextField type="number" {...field} error={Boolean(form.errors.beforeCheckinDays && form.touched.beforeCheckinDays)} helperText={<ErrorMessage name="beforeCheckinDays" />} inputProps={{
              min: 1
            }} onChange={e => setFieldValue('beforeCheckinDays', e.target.value)} />
                                    </div>}
                            </Field>

                            <IconButton type="submit" className="!bg-medium-aquamarine text-white" disabled={isSubmitting}>
                                <SaveIcon />
                            </IconButton>
                        </Form>}
                </Formik>}
        </div>;
};
export default ConfigReservationComponent;
