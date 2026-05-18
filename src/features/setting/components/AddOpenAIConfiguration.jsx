import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, DialogActions, Button, Switch, TextField } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createOpenAiConfig, updateOpenAiConfig } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import ImageUpload from 'components/CustomUpload/ImageUpload'; // Import the new image upload component

const validationSchema = Yup.object({
  configuration: Yup.array().of(Yup.object().shape({
    field: Yup.string().required('Field is required'),
    value: Yup.string().required('Value is required'),
    agent: Yup.string().required('Agent is required'),
    enable: Yup.boolean().required('Enable is required'),
    RequireReservation: Yup.boolean().required('RequireReservation is required'),
    useImage: Yup.boolean().required('useImage is required'),
    imageUrl: Yup.string().optional(),
    ranking: Yup.number().optional()
  }))
});
const initialValues = {
  configuration: [{
    field: '',
    value: '',
    agent: '',
    enable: false,
    RequireReservation: false,
    useImage: false,
    imageUrl: '',
    ranking: ''
  }]
};
const AddOpenAIConfigDialog = ({
  open,
  onClose,
  addAiConfig,
  openAiConfigItem
}) => {
  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: async (values, {
      resetForm,
      setSubmitting
    }) => {
      const updatedConfig = {
        ...openAiConfigItem,
        configuration: [...openAiConfigItem.configuration, ...values.configuration]
      };
      try {
        const response = await updateOpenAiConfig(openAiConfigItem?._id, updatedConfig);
        const data = response?.data?.openAiConfig;
        addAiConfig(data);
        toast.success('Addition Successful');
        onClose();
        resetForm();
      } catch (error) {
        toast.error('Error during addition');
      } finally {
        setSubmitting(false);
      }
    }
  });
  const handleRemoveConfig = index => {
    const updatedConfiguration = formik.values.configuration.filter((_, idx) => idx !== index);
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
        Add OpenAI Configuration
      </DialogTitle>
      <DialogContent>
        <form onSubmit={formik.handleSubmit}>
          <Box mt={2}>
            {formik.values.configuration.map((config, index) => <div key={index} className="mb-3 text-center">
                <div>
                  <label className="form-label">Config N° {index + 1}</label>
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.field`} className="form-label">
                    Field
                  </label>
                  <TextField fullWidth id={`configuration.${index}.field`} name={`configuration.${index}.field`} label={`Configuration Field ${index + 1}`} value={formik.values.configuration[index].field} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.configuration?.[index]?.field && Boolean(formik.errors.configuration?.[index]?.field)} helperText={formik.touched.configuration?.[index]?.field && formik.errors.configuration?.[index]?.field} />
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.value`} className="form-label">
                    Value
                  </label>
                  <TextField fullWidth id={`configuration.${index}.value`} name={`configuration.${index}.value`} label={`Configuration Value ${index + 1}`} value={formik.values.configuration[index].value} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.configuration?.[index]?.value && Boolean(formik.errors.configuration?.[index]?.value)} helperText={formik.touched.configuration?.[index]?.value && formik.errors.configuration?.[index]?.value} />
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.agent`} className="form-label">
                    Agent
                  </label>
                  <TextField fullWidth id={`configuration.${index}.agent`} name={`configuration.${index}.agent`} label={`Configuration Agent ${index + 1}`} value={formik.values.configuration[index].agent} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.configuration?.[index]?.agent && Boolean(formik.errors.configuration?.[index]?.agent)} helperText={formik.touched.configuration?.[index]?.agent && formik.errors.configuration?.[index]?.agent} />
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.enable`}>
                    Enable
                  </label>
                  <div>
                    <Switch id={`configuration.${index}.enable`} checked={formik.values.configuration[index].enable} onChange={formik.handleChange} />
                    {formik.touched.configuration?.[index]?.enable && formik.errors.configuration?.[index]?.enable && <div>{formik.errors.configuration[index].enable}</div>}
                  </div>
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.RequireReservation`}>
                    RequireReservation
                  </label>
                  <div>
                    <Switch id={`configuration.${index}.RequireReservation`} checked={formik.values.configuration[index].RequireReservation} onChange={formik.handleChange} />
                    {formik.touched.configuration?.[index]?.RequireReservation && formik.errors.configuration?.[index]?.RequireReservation && <div>
                          {formik.errors.configuration[index].RequireReservation}
                        </div>}
                  </div>
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.ranking`} className="form-label">
                    classement
                  </label>
                  <TextField fullWidth id={`configuration.${index}.ranking`} name={`configuration.${index}.ranking`} label={`Configuration ranking ${index + 1}`} value={formik.values.configuration[index].ranking} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.configuration?.[index]?.ranking && Boolean(formik.errors.configuration?.[index]?.ranking)} helperText={formik.touched.configuration?.[index]?.ranking && formik.errors.configuration?.[index]?.ranking} />
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.useImage`}>
                    useImage
                  </label>
                  <div>
                    <Switch id={`configuration.${index}.useImage`} checked={formik.values.configuration[index].useImage} onChange={formik.handleChange} />
                    {formik.touched.configuration?.[index]?.useImage && formik.errors.configuration?.[index]?.useImage && <div>{formik.errors.configuration[index].useImage}</div>}
                  </div>
                </div>
                <div className="mb-3 text-center">
                  <label htmlFor={`configuration.${index}.imageUrl`}>
                    Image URL
                  </label>
                  {/* <FormikImageUpload name={`configuration.${index}.imageUrl`} /> */}
                  <ImageUpload style={{
                img: {
                  height: '300px',
                  width: '444px'
                }
              }} label="Select image" folder="city" avatar />
                </div>
                <button type="button" style={{
              margin: '12px auto 4px auto',
              display: 'block'
            }} className="btn btn-danger" onClick={() => handleRemoveConfig(index)}>
                  Remove
                </button>
              </div>)}
            <button type="button" style={{
            margin: '12px auto 4px auto',
            display: 'block'
          }} className="btn btn-primary" onClick={() => formik.setFieldValue('configuration', [...formik.values.configuration, {
            field: '',
            value: '',
            agent: '',
            enable: false,
            RequireReservation: false,
            useImage: false,
            imageUrl: '',
            ranking: ''
          }])}>
              Add
            </button>
          </Box>
          <DialogActions>
            <Button onClick={onClose} color="secondary">
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}>
              {formik.isSubmitting ? 'Adding...' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>;
};
export default AddOpenAIConfigDialog;
