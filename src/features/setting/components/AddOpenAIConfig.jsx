import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, Box, DialogActions, Button, Switch, TextField } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createOpenAiConfig } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from 'utils/rbac.utils';
const AddOpenAIConfigDialog = ({
  open,
  onClose,
  addAiConfig,
  owners,
  openAiConfigs
}) => {
  const {
    t
  } = useTranslation('common');
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);
  const initialValues = {
    type: '',
    description_openai: '',
    enable: false,
    ownerId: isAdmin ? '' : user.role === 'Worker' ? user.ownerId : user._id,
    configuration: [
      // {
      //   field: '',
      //   value: '',
      //   agent: '',
      //   enable: false,
      //   RequireReservation: false,
      // },
    ]
  };
  const validationSchema = isAdmin => Yup.object({
    type: Yup.string().required(t('Type is required')),
    description_openai: Yup.string().required(t('Description OpenAI is required')),
    enable: Yup.boolean().required(t('Enable is required')),
    ownerId: isAdmin ? Yup.string().required(t('Owner is required')) : Yup.string(),
    configuration: Yup.array().of(Yup.object().shape({
      field: Yup.string().required(t('Field is required')),
      value: Yup.string().required(t('Value is required')),
      agent: Yup.string().required(t('Agent is required')),
      enable: Yup.boolean().required(t('Enable is required')),
      RequireReservation: Yup.boolean().required(t('RequireReservation is required'))
    })).optional().default([])
  });
  const formik = useFormik({
    initialValues,
    validationSchema: validationSchema(isAdmin),
    onSubmit: async (values, {
      resetForm,
      setSubmitting
    }) => {
      if (values.type === "About Us") {
        const alreadyExists = openAiConfigs.some(config => config.type === "About Us" && config.ownerId === values.ownerId);
        if (alreadyExists) {
          toast.error(t('This owner already has an About Us configuration.'));
          setSubmitting(false);
          return;
        }
      }
      try {
        const response = await createOpenAiConfig(values);
        const data = response?.data?.openAiConfig;
        addAiConfig(data);
        toast.success(t('Addition Successful'));
        onClose();
        resetForm();
      } catch (error) {
        toast.error(t('Error adding configuration'));
      } finally {
        setSubmitting(false);
      }
    }
  });
  const handleRemoveConfig = index => {
    const updatedConfiguration = [...formik.values.configuration];
    updatedConfiguration.splice(index, 1);
    formik.setFieldValue('configuration', updatedConfiguration);
  };
  return <Dialog PaperProps={{
    style: {
      width: 500
    }
  }} open={open} onClose={onClose}>
      <DialogTitle sx={{
      padding: '30px',
      textAlign: 'center'
    }}>
        {t('Add AI Configuration')}
      </DialogTitle>
      <DialogContent>
        <form onSubmit={formik.handleSubmit}>
          <div className="mb-3 text-center">
            <label htmlFor="type" className="form-label">
              {t('Type')}
            </label>
            <TextField fullWidth id="type" name="type" label={t('Type')} value={formik.values.type} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.type && Boolean(formik.errors.type)} helperText={formik.touched.type && formik.errors.type} />
          </div>
          {isAdmin && <div className="mb-3 text-center">
              <label htmlFor="ownerId" className="form-label">{t('Owner')}</label>
              <select id="ownerId" name="ownerId" value={formik.values.ownerId} onChange={formik.handleChange} className="w-full px-2 py-2 text-sm border rounded">
                <option value="">{t('Select Owner')}</option>
                {owners && owners.map(owner => <option key={owner._id} value={owner._id}>
                    {owner.email}
                  </option>)}
              </select>
            </div>}
          <div className="mb-3 text-center">
            <label htmlFor="description_openai" className="form-label">
              {t('Description')}
            </label>
            <TextField fullWidth id="description_openai" name="description_openai" label={t('Description OpenAI')} multiline rows={8} value={formik.values.description_openai} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.description_openai && Boolean(formik.errors.description_openai)} helperText={formik.touched.description_openai && formik.errors.description_openai} />
          </div>
          <div className="mb-3 text-center">
            <label htmlFor="enable" className="form-label">
              {t('Enable')}
            </label>
            <div>
              <Switch id="enable" name="enable" checked={formik.values.enable} onChange={formik.handleChange} />
            </div>
          </div>
          <Box mt={2}>
            {/* {formik.values.configuration.map((config, index) => (
              <div key={index} className="mb-3 text-center">
                <div>
                  <label className="form-label">{t('Config N° {index}', { index: index + 1 })}</label>
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.field`} className="form-label">{t('Field')}</label>
                  <TextField
                    fullWidth
                    id={`configuration.${index}.field`}
                    name={`configuration.${index}.field`}
                    label={t('Configuration Field {index}', { index: index + 1 })}
                    value={formik.values.configuration[index].field}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.configuration?.[index]?.field && Boolean(formik.errors.configuration?.[index]?.field)}
                    helperText={formik.touched.configuration?.[index]?.field && formik.errors.configuration?.[index]?.field}
                  />
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.value`} className="form-label">{t('Value')}</label>
                  <TextField
                    fullWidth
                    id={`configuration.${index}.value`}
                    name={`configuration.${index}.value`}
                    label={t('Configuration Value {index}', { index: index + 1 })}
                    value={formik.values.configuration[index].value}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.configuration?.[index]?.value && Boolean(formik.errors.configuration?.[index]?.value)}
                    helperText={formik.touched.configuration?.[index]?.value && formik.errors.configuration?.[index]?.value}
                  />
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.agent`} className="form-label">{t('Agent')}</label>
                  <TextField
                    fullWidth
                    id={`configuration.${index}.agent`}
                    name={`configuration.${index}.agent`}
                    label={t('Configuration Agent {index}', { index: index + 1 })}
                    value={formik.values.configuration[index].agent}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.configuration?.[index]?.agent && Boolean(formik.errors.configuration?.[index]?.agent)}
                    helperText={formik.touched.configuration?.[index]?.agent && formik.errors.configuration?.[index]?.agent}
                  />
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.enable`} className="form-label">{t('Enable')}</label>
                  <div>
                    <Switch
                      id={`configuration.${index}.enable`}
                      name={`configuration.${index}.enable`}
                      checked={formik.values.configuration[index].enable}
                      onChange={formik.handleChange}
                    />
                    {formik.touched.configuration?.[index]?.enable && formik.errors.configuration?.[index]?.enable && (
                      <div>{formik.errors.configuration[index].enable}</div>
                    )}
                  </div>
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.RequireReservation`} className="form-label">{t('RequireReservation')}</label>
                  <div>
                    <Switch
                      id={`configuration.${index}.RequireReservation`}
                      name={`configuration.${index}.RequireReservation`}
                      checked={formik.values.configuration[index].RequireReservation}
                      onChange={formik.handleChange}
                    />
                    {formik.touched.configuration?.[index]?.RequireReservation && formik.errors.configuration?.[index]?.RequireReservation && (
                      <div>{formik.errors.configuration[index].RequireReservation}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  style={{ margin: '12px auto 4px auto', display: 'block' }}
                  className="btn btn-danger"
                  onClick={() => handleRemoveConfig(index)}
                >
                  {t('Remove')}
                </button>
              </div>
             ))} */}
            <button type="button" style={{
            margin: '12px auto 4px auto',
            display: 'block'
          }} className="btn btn-primary" onClick={() => formik.setFieldValue('configuration', [...formik.values.configuration, {
            field: '',
            value: '',
            agent: '',
            enable: false,
            RequireReservation: false
          }])}>
              {t('Add')}
            </button>
          </Box>
          <DialogActions>
            <Button onClick={onClose} color="secondary">
              {t('Cancel')}
            </Button>
            <Button type="submit" color="primary" disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}>
              {formik.isSubmitting ? t('Adding...') : t('Add')}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>;
};
export default AddOpenAIConfigDialog;
