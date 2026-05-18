import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; // Added for translations
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, IconButton, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateCancellationPolicy } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
const validationSchema = Yup.object().shape({
  cancellationDescription: Yup.object().test('at-least-one-description', 'At least one description is required', obj => Object.keys(obj).length > 0),
  daysBeforCheckin: Yup.number().required('Days before check-in is required').min(0, 'Must be 0 or greater')
});
const CancellationPolicyModal = ({
  open,
  onClose,
  setPolicy,
  policy,
  policyId,
  languages
}) => {
  const {
    t
  } = useTranslation('common'); // Added for translations
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await updateCancellationPolicy(policyId, values);
      if (response && response.data && response.data.data) {
        setPolicy(response.data.data);
        setSubmitting(false);
        onClose();
        toast.success(t('Cancellation policy updated successfully'));
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      setErrorMessage(error.message || t('An error occurred while processing your request.'));
      setSubmitting(false);
      toast.error(t('Error updating cancellation policy'));
    } finally {
      setIsLoading(false);
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{policy ? t('Update Cancellation Policy') : t('Create Cancellation Policy')}</DialogTitle>
            <DialogContent>
                {errorMessage && <Typography color="error">{errorMessage}</Typography>}
                <Formik initialValues={policy || {
        cancellationDescription: {},
        daysBeforCheckin: 3
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
                    {({
          values,
          errors,
          setFieldValue
        }) => <Form className="mt-2">
                            <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
                                <Typography variant="h6">{t('Cancellation Description')}</Typography>
                                <FieldArray name="cancellationDescription">
                                    {({
                push,
                remove
              }) => <>
                                            {Object.entries(values.cancellationDescription).map(([langId, value]) => <Box key={langId} sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                                                    <TextField fullWidth multiline rows={4} label={`${t('Description')} (${languages.find(lang => lang._id === langId)?.name || t('Unknown')})`} value={value} onChange={e => setFieldValue(`cancellationDescription.${langId}`, e.target.value)} error={Boolean(errors.cancellationDescription?.[langId])} helperText={errors.cancellationDescription?.[langId]} />
                                                    <IconButton onClick={() => {
                    const newDescription = {
                      ...values.cancellationDescription
                    };
                    delete newDescription[langId];
                    setFieldValue('cancellationDescription', newDescription);
                  }}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Box>)}
                                            <FormControl fullWidth>
                                                <InputLabel>{t('Add Language')}</InputLabel>
                                                <Select value="" onChange={e => {
                    const langId = e.target.value;
                    if (!values.cancellationDescription[langId]) {
                      setFieldValue(`cancellationDescription.${langId}`, "");
                    }
                  }}>
                                                    {languages.map(lang => <MenuItem key={lang._id} value={lang._id} disabled={lang._id in values.cancellationDescription}>
                                                            {lang.name}
                                                        </MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </>}
                                </FieldArray>

                                <TextField fullWidth label={t('Days Before Check-in')} type="number" name="daysBeforCheckin" value={values.daysBeforCheckin} onChange={e => setFieldValue('daysBeforCheckin', parseInt(e.target.value))} error={Boolean(errors.daysBeforCheckin)} helperText={errors.daysBeforCheckin} />
                            </Box>
                            <DialogActions>
                                <Button onClick={onClose} className="!text-gray-500" disabled={isLoading}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" color="primary" className="!bg-medium-aquamarine !text-white" disabled={isLoading}>
                                    {policy ? t('Update') : t('Create')}
                                </Button>
                            </DialogActions>
                        </Form>}
                </Formik>
            </DialogContent>
        </Dialog>;
};
export default CancellationPolicyModal;
