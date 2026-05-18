import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { createChannel, updateChannel, deleteChannel } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmationDialog from './ConfirmationDialog';
const ChannelDialog = ({
  showDialog,
  onClose,
  channel,
  onChannelChange
}) => {
  const {
    t
  } = useTranslation('common');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState(null);
  const initialValues = {
    name: channel ? channel.name : ''
  };
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(t('Name is required'))
  });
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    setSubmitting(true);
    try {
      let response;
      if (channel) {
        response = await updateChannel(channel._id, {
          name: values.name
        });
        const newChannel = response.channelManager;
        onChannelChange(newChannel, false);
        toast.success(t('Channel updated successfully'));
      } else {
        response = await createChannel({
          name: values.name
        });
        const newChannel = response.channelManager;
        onChannelChange(newChannel, false);
        toast.success(t('Channel created successfully'));
      }
      onClose();
    } catch (error) {
      toast.error(error.message);
    }
    setSubmitting(false);
  };
  const handleDeleteChannel = channel => {
    setChannelToDelete(channel);
    setShowConfirmation(true);
  };
  const confirmDeleteChannel = async () => {
    try {
      await deleteChannel(channelToDelete._id);
      onChannelChange(channelToDelete, true);
      setShowConfirmation(false);
      toast.success(t('Channel deleted successfully!'));
      onClose();
    } catch (error) {
      toast.error(t('Error deleting channel'));
    }
  };
  return <>
            <Dialog open={showDialog} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle className='text-white bg-medium-aquamarine'>
                    {channel && channel._id ? t('Update Channel') : t('Create Channel')}
                </DialogTitle>
                <DialogContent>
                <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
                    {({
            isSubmitting
          }) => <Form>
                            <div className="px-4 pt-4">
                                <Field name="name" className="w-full px-3 py-2 leading-tight text-gray-700 border rounded focus:outline-none focus:shadow-outline" placeholder={t('Name')} />
                                <ErrorMessage name="name" component="div" className="text-xs italic text-red-500" />
                            </div>
                            <DialogActions>
                                <div className="flex justify-between w-full px-4">
                                    <div>
                                        {channel && channel._id && <Button onClick={() => handleDeleteChannel(channel)} color="secondary" startIcon={<DeleteIcon />} className="!bg-red-500 text-white">
                                            </Button>}
                                    </div>
                                    <div>
                                        <Button onClick={onClose} color="secondary">
                                            {t('Cancel')}
                                        </Button>
                                        <Button type="submit" variant="contained" className="!bg-medium-aquamarine text-white" disabled={isSubmitting}>
                                            {isSubmitting ? t('Loading...') : channel && channel._id ? t('Update') : t('Create')}
                                        </Button>
                                    </div>
                                </div>
                            </DialogActions>
                        </Form>}
                </Formik>
                </DialogContent>
            </Dialog>
            <ConfirmationDialog open={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={confirmDeleteChannel} />
        </>;
};
export default ChannelDialog;
