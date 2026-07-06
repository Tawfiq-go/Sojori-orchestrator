import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Checkbox, ListItemText, IconButton, Box } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { updateStaff } from '../services/serverApi.task';
import { User, X, Globe, MapPinned, Phone, MessageSquare, Languages, Type } from 'lucide-react';
import ListingSelector from './ListingSelector';
import { toast } from 'react-toastify';
const validationSchema = Yup.object().shape({
  subType: Yup.array().min(1, 'At least one task must be selected').required('Tasks are required'),
  callPhone: Yup.string().required('Call Phone is required'),
  whatsappPhone: Yup.string().required('WhatsApp Phone is required')
  // listingIds: Yup.array(),
  // language: Yup.string().required('Language is required'),
  // countryIds: Yup.array()
  //   .min(1, 'At least one country must be selected')
  //   .required('Countries are required'),
  // cityIds: Yup.array()
  //   .min(1, 'At least one city must be selected')
  //   .required('Cities are required'),
});
const ModifyStaff = ({
  open,
  handleClose,
  staff,
  onStaffUpdate,
  cities,
  countries,
  listings,
  taskTypes,
  languages
}) => {
  const handleSubmit = async (values, {
    setSubmitting,
    setErrors
  }) => {
    try {
      const transformedValues = {
        ...values
        // listingIds: values.listingIds.includes('All')
        //   ? ['All']
        //   : values.listingIds,
        // countryIds: values.countryIds.includes('All')
        //   ? ['All']
        //   : values.countryIds,
        // cityIds: values.cityIds.includes('All') ? ['All'] : values.cityIds,
      };
      const response = await updateStaff(staff.clerkId, {
        role: 'admin',
        username: staff?.username || '',
        ...transformedValues
      });
      if (response.data && response.data.success) {
        const updatedStaff = {
          ...staff,
          ...response.data.user,
          public_metadata: {
            ...response.data.user.publicMetadata,
            ...transformedValues
          }
        };
        onStaffUpdate(updatedStaff);
        toast.success('Staff updated successfully');
        handleClose();
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach(err => {
          serverErrors[err.path[0]] = err.message;
        });
        setErrors(serverErrors);
        toast.error(serverErrors[Object.keys(serverErrors)[0]]);
      } else {
        toast.error('Error updating staff');
      }
    } finally {
      setSubmitting(false);
    }
  };
  return <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
        <Typography variant="h6" className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          Update Staff
        </Typography>
        <IconButton onClick={handleClose} className="text-white">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="pt-6">
        <Formik initialValues={{
        subType: staff?.public_metadata?.subType || [],
        callPhone: staff?.public_metadata?.callPhone || '',
        whatsappPhone: staff?.public_metadata?.whatsappPhone || ''
        // listingIds: staff?.public_metadata?.listingIds || [],
        // countryIds: staff?.public_metadata?.countryIds || [],
        // cityIds: staff?.public_metadata?.cityIds || [],
        // language: staff?.public_metadata?.language || '',
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          values
        }) => <Form className="space-y-4">
              <Box className="flex flex-col gap-4 mt-4">
                <Box className="flex gap-2">
                  <Box className="w-full">
                    <Field as={TextField} fullWidth name="callPhone" label="Call Phone" variant="outlined" slotProps={{
                  input: {
                    startAdornment: <Phone className="w-4 h-4 mr-2 text-gray-500" />
                  }
                }} />
                    <ErrorMessage name="callPhone" component={Typography} className="text-red-500 !text-xs" />
                  </Box>
                  <Box className="w-full">
                    <Field as={TextField} fullWidth name="whatsappPhone" label="WhatsApp Phone" variant="outlined" slotProps={{
                  input: {
                    startAdornment: <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                  }
                }} />
                    <ErrorMessage name="whatsappPhone" component={Typography} className="text-red-500 !text-xs" />
                  </Box>
                </Box>
                <Box className="flex gap-2">
                  <FormControl fullWidth>
                    <InputLabel id="subType-label">Task Types</InputLabel>
                    <Select labelId="subType-label" multiple value={values.subType} onChange={e => setFieldValue('subType', e.target.value)} label="Task Types" renderValue={selected => selected.join(', ')} startAdornment={<Box component="span" sx={{
                  mr: 1
                }}>
                          <Type className="w-4 h-4 text-gray-500" />
                        </Box>}>
                      {taskTypes.map(taskType => <MenuItem key={taskType._id} value={taskType.task} sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 16px'
                  }}>
                          <Box sx={{
                      width: '100%'
                    }}>
                            <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                              <Checkbox checked={values.subType.includes(taskType.task)} sx={{
                          padding: '4px'
                        }} />
                              <Typography variant="body1">
                                {taskType.task}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>)}
                    </Select>
                    <ErrorMessage name="subType" component={Typography} className="text-red-500 !text-xs mt-1" />
                  </FormControl>
                </Box>
              </Box>

              <DialogActions>
                <Button className="!text-red-500" onClick={handleClose} variant="outlined" color="error" startIcon={<X className="w-4 h-4" />}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="text-white !bg-medium-aquamarine !hover:bg-medium-aquamarine/90" variant="contained" startIcon={<User className="w-4 h-4" />}>
                  {isSubmitting ? 'Updating...' : 'Update Staff'}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default ModifyStaff;
