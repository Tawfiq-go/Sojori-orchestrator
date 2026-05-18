import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { updateCitiesMapping, getcities } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
const AddCityMappingDialog = ({
  open,
  onClose,
  cities,
  func
}) => {
  const {
    t
  } = useTranslation('common');
  const [citiesMapping, setCitiesMapping] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const validationSchema = Yup.object().shape({
    cityId: Yup.string().required(t('cityId is required'))
  });
  const fetchCitiesData = async () => {
    try {
      const data = await getcities();
      setCitiesMapping(data.data.cities);
    } catch (error) {}
  };
  useEffect(() => {
    fetchCitiesData();
  }, []);
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    const newMapping = cities.map(city => city.city._id);
    const formData = {
      citiesMapping: [...newMapping, values?.cityId]
    };
    updateCitiesMapping(formData).then(data => {
      func();
      setSubmitting(false);
      onClose();
      toast.success(t("City added successfully"));
    }).catch(error => {
      setErrorMessage(error.message);
    });
  };
  return <Dialog PaperProps={{
    style: {
      width: 500
    }
  }} open={open} onClose={onClose}>
      <DialogTitle sx={{
      padding: '30px',
      textAlign: 'center'
    }}>{t('Add City')}</DialogTitle>
      <DialogContent>
        {errorMessage && <h5 className="text-center text-danger">{errorMessage}</h5>}
        <Formik initialValues={{
        cityId: ''
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          isValid,
          dirty
        }) => <Form encType="multipart/form-data">
              <div className="mb-3 text-center">
                <label htmlFor="cityId" className="form-label">{t('City')}</label>
                {citiesMapping && citiesMapping?.length > 0 && <Autocomplete disablePortal id="cityId" options={citiesMapping} getOptionLabel={option => option.name} filterOptions={(options, {
              inputValue
            }) => {
              const idsToFilter = cities.map(item => item?.city?._id);
              return options.filter(city => !idsToFilter.includes(city?._id));
            }} onChange={(event, value) => {
              setFieldValue('cityId', value ? value._id : '');
            }} renderInput={params => <TextField {...params} label={t('City')} />} />}
                <ErrorMessage name="cityId" component="div" className="text-danger" />
              </div>
              <DialogActions>
                <Button onClick={onClose} color="secondary">
                  {t('Cancel')}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting || !isValid || !dirty}>
                  {t('Add')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default AddCityMappingDialog;
