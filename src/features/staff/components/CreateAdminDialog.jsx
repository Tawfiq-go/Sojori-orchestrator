import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, IconButton, FormControl, InputLabel, Select, MenuItem, InputAdornment, Chip } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { User, Lock, Mail, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { CreateStaff } from '../services/serverApi.task';
const validationSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
  subType: Yup.array().min(1, 'At least one Sub Type is required').required('Sub Type is required')
});
const CreateAdminDialog = ({
  open,
  onClose,
  onAdminCreated
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const subTypeOptions = ['Admin'];
  const handleTogglePassword = () => {
    setShowPassword(prev => !prev);
  };
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    try {
      const transformedValues = {
        username: values.username,
        email: values.email,
        password: values.password,
        role: 'admin',
        subType: values.subType
      };
      const response = await CreateStaff(transformedValues);
      if (response.data) {
        const formattedAdmin = {
          ...response.data.user,
          email_addresses: [{
            email_address: values.email
          }],
          public_metadata: {
            role: 'admin',
            subType: values.subType
          }
        };
        onAdminCreated(formattedAdmin);
        onClose();
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      toast.error(error.response?.data?.error && error.response?.data?.error.length && error.response?.data?.error[0]?.message || error.response?.data?.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{
    className: 'rounded-lg'
  }}>
      <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
        <Typography variant="h6" className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          Create Administrator
        </Typography>
        <IconButton onClick={onClose} className="text-white">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>
      <DialogContent className="pt-6">
        <Formik initialValues={{
        username: '',
        email: '',
        password: '',
        subType: []
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          values,
          setFieldValue
        }) => <Form className="space-y-4">
              <Box className="flex flex-col gap-3 mt-3">
                <Box>
                  <Field as={TextField} fullWidth name="username" label="Username" variant="outlined" slotProps={{
                input: {
                  startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                }
              }} />
                  <ErrorMessage name="username" component={Typography} className="text-red-500 !text-xs" />
                </Box>
                <Box className="w-full">
                  <Field as={TextField} fullWidth name="email" label="Email" variant="outlined" type="email" slotProps={{
                input: {
                  startAdornment: <Mail className="w-4 h-4 mr-2 text-gray-500" />
                }
              }} />
                  <ErrorMessage name="email" component={Typography} className="text-red-500 !text-xs" />
                </Box>
                <Box className="w-full">
                  <Field as={TextField} fullWidth name="password" label="Password" variant="outlined" type={showPassword ? 'text' : 'password'} slotProps={{
                input: {
                  startAdornment: <Lock className="w-4 h-4 mr-2 text-gray-500" />,
                  endAdornment: <InputAdornment position="end">
                          <IconButton aria-label="toggle password visibility" onClick={handleTogglePassword} edge="end" className="focus:outline-none" size="small">
                            {showPassword ? <EyeOff className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-colors" /> : <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-colors" />}
                          </IconButton>
                        </InputAdornment>
                }
              }} />
                  <ErrorMessage name="password" component={Typography} className="text-red-500 !text-xs" />
                </Box>
                <FormControl fullWidth>
                  <InputLabel id="subType-label">Sub Types</InputLabel>
                  <Field as={Select} labelId="subType-label" id="subType" name="subType" label="Sub Types" multiple value={values.subType} onChange={event => {
                setFieldValue('subType', event.target.value);
              }} renderValue={selected => <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5
              }}>
                        {selected.map(value => <Chip key={value} label={value} />)}
                      </Box>}>
                    {subTypeOptions.map(type => <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>)}
                  </Field>
                  <ErrorMessage name="subType" component={Typography} className="text-red-500 !text-xs" />
                </FormControl>
              </Box>

              <DialogActions className="pt-4">
                <Button className="!text-red-500" onClick={onClose} variant="outlined" color="error" startIcon={<X className="w-4 h-4" />}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="text-white !bg-medium-aquamarine !hover:bg-medium-aquamarine/90" variant="contained" startIcon={<User className="w-4 h-4" />}>
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default CreateAdminDialog;
