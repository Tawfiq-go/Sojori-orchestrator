import React from 'react';
import { Formik, Field, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import ImageUpload from 'components/CustomUpload/FormikImageUpload';
import { Dialog, DialogTitle, DialogContent, Box, DialogActions, Button, Switch, TextField, FormControlLabel, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { updateOpenAiConfig } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import { makeStyles } from '@mui/styles';
import { catNames } from '../mock';
const useStyles = makeStyles({
  dialogContent: {
    padding: '24px'
  },
  formControl: {
    marginBottom: '16px'
  },
  textArea: {
    width: '100%',
    resize: 'both',
    minHeight: '170px',
    height: 'auto',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '16px',
    fontFamily: 'inherit'
  },
  button: {
    marginTop: '16px'
  },
  imageUpload: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '16px'
  },
  imagePreview: {
    width: '100px',
    height: '100px',
    marginLeft: '16px',
    border: '1px solid #ccc'
  },
  addButton: {
    backgroundColor: '#3f51b5',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#303f9f'
    }
  },
  removeButton: {
    backgroundColor: '#f50057',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#c51162'
    }
  },
  errorText: {
    color: 'red',
    marginTop: '4px'
  }
});
const initialValues = {
  configuration: [{
    field: '',
    value: '',
    catName: '',
    agent: '',
    enable: false,
    RequireReservation: false,
    useImage: false,
    imageUrl: '',
    ranking: ''
  }]
};
const validationSchema = Yup.object({
  configuration: Yup.array().of(Yup.object().shape({
    field: Yup.string().required('Required'),
    value: Yup.string().required('Required'),
    agent: Yup.string().oneOf(['Never', 'Always', 'depends'], 'Invalid Agent').required('Required'),
    enable: Yup.boolean(),
    RequireReservation: Yup.boolean(),
    useImage: Yup.boolean(),
    imageUrl: Yup.string().url('Invalid URL'),
    ranking: Yup.number().typeError('Must be a number')
  }))
});
const FormComponent = ({
  open,
  onClose,
  addAiConfig,
  openAiConfigItem
}) => {
  const classes = useStyles();
  const updateConfigration = async values => {
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
    } catch (error) {
      toast.error('Error during addition');
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configuration Form</DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={values => {
        updateConfigration(values);
      }}>
          {({
          values,
          setFieldValue,
          errors,
          touched
        }) => <Form>
              <FieldArray name="configuration">
                {({
              remove,
              push
            }) => <>
                    {values.configuration.map((config, index) => <Box key={index} mb={3}>
                        <TextField fullWidth label="Field" name={`configuration[${index}].field`} value={config.field} onChange={e => setFieldValue(`configuration[${index}].field`, e.target.value)} className={classes.formControl} error={!!errors.configuration?.[index]?.field && touched.configuration?.[index]?.field} helperText={errors.configuration?.[index]?.field && touched.configuration?.[index]?.field ? errors.configuration[index].field : ''} />
                        <FormControl fullWidth className={classes.formControl} error={!!errors.configuration?.[index]?.agent && touched.configuration?.[index]?.agent}>
                          <InputLabel>catName</InputLabel>
                          <Select name={`configuration[${index}].catName`} value={config.catName} onChange={e => setFieldValue(`configuration[${index}].catName`, e.target.value)}>
                            {catNames.map(item => <MenuItem value={item} key={item}>
                                {item}
                              </MenuItem>)}
                          </Select>
                          {errors.configuration?.[index]?.catName && touched.configuration?.[index]?.catName ? <div className={classes.errorText}>
                              {errors.configuration[index].catName}
                            </div> : null}
                        </FormControl>
                        <FormControl fullWidth className={classes.formControl} error={!!errors.configuration?.[index]?.value && touched.configuration?.[index]?.value}>
                          <InputLabel shrink htmlFor={`configuration[${index}].value`}>
                            Value
                          </InputLabel>
                          <textarea id={`configuration[${index}].value`} name={`configuration[${index}].value`} value={config.value} onChange={e => setFieldValue(`configuration[${index}].value`, e.target.value)} className={classes.textArea} rows={4} />
                          {errors.configuration?.[index]?.value && touched.configuration?.[index]?.value && <div className={classes.errorText}>
                                {errors.configuration[index].value}
                              </div>}
                        </FormControl>
                        <FormControl fullWidth className={classes.formControl} error={!!errors.configuration?.[index]?.agent && touched.configuration?.[index]?.agent}>
                          <InputLabel>Agent</InputLabel>
                          <Select name={`configuration[${index}].agent`} value={config.agent} onChange={e => setFieldValue(`configuration[${index}].agent`, e.target.value)}>
                            <MenuItem value="Never">Never</MenuItem>
                            <MenuItem value="Always">Always</MenuItem>
                            <MenuItem value="depends">Depends</MenuItem>
                          </Select>
                          {errors.configuration?.[index]?.agent && touched.configuration?.[index]?.agent ? <div className={classes.errorText}>
                              {errors.configuration[index].agent}
                            </div> : null}
                        </FormControl>
                        <FormControlLabel control={<Switch checked={config.enable} onChange={e => setFieldValue(`configuration[${index}].enable`, e.target.checked)} color="primary" />} label="Enable" className={classes.formControl} />
                        <FormControlLabel control={<Switch checked={config.RequireReservation} onChange={e => setFieldValue(`configuration[${index}].RequireReservation`, e.target.checked)} color="primary" />} label="Require Reservation" className={classes.formControl} />
                        <FormControlLabel control={<Switch checked={config.useImage} onChange={e => setFieldValue(`configuration[${index}].useImage`, e.target.checked)} color="primary" />} label="Use Image" className={classes.formControl} />
                        <div className={classes.imageUpload}>
                          <ImageUpload fieldName={`configuration[${index}].imageUrl`} setFieldValue={setFieldValue} />
                          {config.imageUrl && <img src={config.imageUrl} alt="Uploaded" className={classes.imagePreview} />}
                        </div>
                        <TextField fullWidth label="classement" name={`configuration[${index}].ranking`} type="number" value={config.ranking} onChange={e => setFieldValue(`configuration[${index}].ranking`, e.target.value)} className={classes.formControl} error={!!errors.configuration?.[index]?.ranking && touched.configuration?.[index]?.ranking} helperText={errors.configuration?.[index]?.ranking && touched.configuration?.[index]?.ranking ? errors.configuration[index].ranking : ''} />
                        <Button type="button" variant="contained" onClick={() => remove(index)} className={`${classes.button} ${classes.removeButton}`}>
                          Remove
                        </Button>
                      </Box>)}
                    <Button type="button" variant="contained" onClick={() => push({
                field: '',
                value: '',
                agent: '',
                enable: false,
                RequireReservation: false,
                useImage: false,
                imageUrl: '',
                ranking: ''
              })} className={`${classes.button} ${classes.addButton}`}>
                      Add Configuration
                    </Button>
                  </>}
              </FieldArray>
              <DialogActions>
                <Button onClick={onClose} color="primary">
                  Cancel
                </Button>
                <Button type="submit" color="primary">
                  Submit
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default FormComponent;
