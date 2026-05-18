import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FormControlLabel, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { createCron, getCrons } from '../services/serverApi.adminConfig';
import { CustomSwitch } from '../custom/CustomSwitch';
import { toast, ToastContainer } from 'react-toastify';
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
const SaveButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: '8px 16px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
  }
});

/** Aligné sur apps/srv-cron CronSetting (sans champs retirés du backend, ex. sendMessageCron). */
const CRON_SETTING_KEYS = ['amenitiesCron', 'retrieveAccessToken', 'bedTypesCron', 'propertyTypesCron', 'customFieldCron', 'listingsCron', 'rerservationsCron', 'calendarCron', 'tasksCron', 'timelineCron', 'syncChannexBookingCron', 'ruPullReservationsCron', 'syndicCron', 'checkoutCron', 'autoCompleteReservationsCron', 'dispatchTaskCron', 'createTask', 'dynamicPriceCron', 'syncMessageCron', 'syncReviewCron', 'timeslotOrchestrationCron'];
const CRON_DEFAULT_TRUE = new Set(['autoCompleteReservationsCron', 'timeslotOrchestrationCron']);
const initialCronState = Object.fromEntries(CRON_SETTING_KEYS.map(key => [key, CRON_DEFAULT_TRUE.has(key)]));
const cronValidationSchema = Yup.object(CRON_SETTING_KEYS.reduce((acc, key) => {
  acc[key] = Yup.boolean().required();
  return acc;
}, {}));
const Cron = () => {
  const {
    t
  } = useTranslation('common');
  const [cronSettings, setCronSettings] = useState(initialCronState);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    fetchCronSettings();
  }, []);
  const filterCronSettings = settings => Object.fromEntries(CRON_SETTING_KEYS.map(key => {
    const v = settings[key];
    if (v === true || v === false) return [key, v];
    return [key, CRON_DEFAULT_TRUE.has(key)];
  }));
  const fetchCronSettings = async () => {
    try {
      const response = await getCrons();
      if (response && response.cronSetting) {
        const filteredSettings = filterCronSettings(response.cronSetting);
        setCronSettings(filteredSettings);
      }
    } catch (error) {} finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = async values => {
    try {
      const response = await createCron(values);
      if (response && response.message) {
        toast.success(response.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  const formik = useFormik({
    initialValues: cronSettings,
    enableReinitialize: true,
    validationSchema: cronValidationSchema,
    onSubmit: handleSubmit
  });
  return <div className="card p-4 !border-none">
      <ToastContainer position="top-right" autoClose={3000} />
      {isLoading ? <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%'
    }}>
          <CircularProgress style={{
        color: '#00b4b4'
      }} />
        </div> : <form onSubmit={formik.handleSubmit} className="flex flex-col items-center">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Object.keys(cronSettings).map(key => <CronSwitch key={key} name={key} formik={formik} t={t} />)}
          </div>
          <SaveButton type="submit" variant="contained" className="mt-4">
            {t('Save')}
          </SaveButton>
        </form>}
    </div>;
};
const CronSwitch = ({
  name,
  formik,
  t
}) => <FormControlLabel control={<CustomSwitch checked={formik.values[name]} onChange={formik.handleChange} name={name} />} label={<span className="text-sm text-gray-400 sm:text-base">{t(name)}</span>} className="p-2 bg-white border rounded" />;
export default Cron;
