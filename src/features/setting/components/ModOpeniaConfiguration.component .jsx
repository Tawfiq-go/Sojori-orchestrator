import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  FormControlLabel,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { updateOpenAiConfig } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import ImageUpload from 'components/CustomUpload/FormikImageUpload';
import { makeStyles } from '@mui/styles';
import { catNames } from '../mock';

const useStyles = makeStyles({
  dialogContent: {
    padding: '24px',
  },
  formControl: {
    marginBottom: '16px',
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
    fontFamily: 'inherit',
  },
  button: {
    marginTop: '16px',
  },
  imageUpload: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '16px',
  },
  imagePreview: {
    width: '100px',
    height: '100px',
    marginLeft: '16px',
    border: '1px solid #ccc',
  },
  addButton: {
    backgroundColor: '#3f51b5',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#303f9f',
    },
  },
  removeButton: {
    backgroundColor: '#f50057',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#c51162',
    },
  },
  errorText: {
    color: 'red',
    marginTop: '4px',
  },
});

const validationSchema = Yup.object({
  field: Yup.string().required('Field is Required'),
  value: Yup.string().required('Value is Required'),
  agent: Yup.string()
    .oneOf(['Never', 'Always', 'depends'], 'Invalid Agent')
    .required('Agent is Required'),
  enable: Yup.boolean(),
  RequireReservation: Yup.boolean(),
  useImage: Yup.boolean(),
  imageUrl: Yup.string().url('Invalid URL'),
  ranking: Yup.number().typeError('Must be a number'),
});

const ModOpeniaConfiguration = ({
  open,
  onClose,
  openAiConfigItem,
  setOpenAiConfigItem,
  dataOpenAi,
  openAiIndex,
}) => {
  const classes = useStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formik = useFormik({
    initialValues: {
      field: '',
      catName: '',
      value: '',
      agent: 'Never',
      enable: false,
      RequireReservation: false,
      useImage: false,
      imageUrl: '',
      ranking: '',
    },
    validationSchema: validationSchema,
    onSubmit: (values, { resetForm }) => {
      setIsLoading(true);
      const dataNew = { ...dataOpenAi, ...values };
      const dataItems = openAiConfigItem;
      dataItems.configuration[openAiIndex] = dataNew;
      updateOpenAiConfig(openAiConfigItem?._id, dataItems)
        .then((data) => {
          setOpenAiConfigItem(data.data.openAiConfig);
          resetForm();
          onClose();
          toast.success('Modified Successfully');
        })
        .catch((error) => {
          setErrorMessage(error.message); // Assuming error.message contains error text
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  useEffect(() => {
    if (dataOpenAi) {
      formik.setValues({
        field: dataOpenAi.field || '',
        catName: dataOpenAi.catName || '',
        value: dataOpenAi.value || '',
        agent: dataOpenAi.agent || 'Never',
        enable: dataOpenAi.enable || false,
        RequireReservation: dataOpenAi.RequireReservation || false,
        useImage: dataOpenAi.useImage || false,
        imageUrl: dataOpenAi.imageUrl || '',
        ranking: dataOpenAi.ranking || '',
      });
    }
  }, [dataOpenAi]);

  return (
    <Dialog
      PaperProps={{ style: { width: 500 } }}
      open={open}
      onClose={onClose}
    >
      <DialogTitle sx={{ padding: '30px', textAlign: 'center' }}>
        Modify Configuration
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth
            label="Field"
            name="field"
            value={formik.values.field}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={classes.formControl}
            error={!!formik.errors.field && formik.touched.field}
            helperText={formik.touched.field && formik.errors.field}
          />
          <FormControl
            fullWidth
            className={classes.formControl}
            error={!!formik.errors.catName && formik.touched.catName}
          >
            <InputLabel>catName</InputLabel>
            <Select
              name="catName"
              value={formik.values.catName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            >
              {catNames.map((item) => (
                <MenuItem value={item} key={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
            {formik.touched.catName && formik.errors.catName ? (
              <div className={classes.errorText}>{formik.errors.catName}</div>
            ) : null}
          </FormControl>
          <FormControl
            fullWidth
            className={classes.formControl}
            error={!!formik.errors.value && formik.touched.value}
          >
            <InputLabel shrink htmlFor="value">
              Value
            </InputLabel>
            <textarea
              id="value"
              name="value"
              value={formik.values.value}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={classes.textArea}
            />
            {formik.touched.value && formik.errors.value && (
              <div className={classes.errorText}>{formik.errors.value}</div>
            )}
          </FormControl>
          <FormControl
            fullWidth
            className={classes.formControl}
            error={!!formik.errors.agent && formik.touched.agent}
          >
            <InputLabel>Agent</InputLabel>
            <Select
              name="agent"
              value={formik.values.agent}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            >
              <MenuItem value="Never">Never</MenuItem>
              <MenuItem value="Always">Always</MenuItem>
              <MenuItem value="depends">Depends</MenuItem>
            </Select>
            {formik.touched.agent && formik.errors.agent ? (
              <div className={classes.errorText}>{formik.errors.agent}</div>
            ) : null}
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={formik.values.enable}
                onChange={(event) =>
                  formik.setFieldValue('enable', event.target.checked)
                }
              />
            }
            label="Enable"
            className={classes.formControl}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formik.values.RequireReservation}
                onChange={(event) =>
                  formik.setFieldValue(
                    'RequireReservation',
                    event.target.checked,
                  )
                }
              />
            }
            label="Require Reservation"
            className={classes.formControl}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formik.values.useImage}
                onChange={(event) =>
                  formik.setFieldValue('useImage', event.target.checked)
                }
              />
            }
            label="Use Image"
            className={classes.formControl}
          />
          <div className={classes.imageUpload}>
            <ImageUpload
              fieldName="imageUrl"
              setFieldValue={formik.setFieldValue}
            />
            {formik.values.imageUrl && (
              <img
                src={formik.values.imageUrl}
                alt="Uploaded"
                className={classes.imagePreview}
              />
            )}
          </div>
          <TextField
            fullWidth
            label="classement"
            name="ranking"
            type="number"
            value={formik.values.ranking}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={classes.formControl}
            error={!!formik.errors.ranking && formik.touched.ranking}
            helperText={formik.touched.ranking && formik.errors.ranking}
          />
          <DialogActions>
            <Button onClick={onClose} color="secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              disabled={formik.isSubmitting}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModOpeniaConfiguration;
