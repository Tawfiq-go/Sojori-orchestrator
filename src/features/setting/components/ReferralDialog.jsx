import React from 'react'; import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { createReferral } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

const ReferralDialog = ({ showDialog, onClose, onReferralChange }) => {
    const { t } = useTranslation('common'); const initialValues = {
        referralCode: 'SO-',
    };
    const validationSchema = Yup.object().shape({
        referralCode: Yup.string()
            .required(t('Referral code is required'))
            .min(5, t('Minimum 5 characters'))
            .matches(/^SO-/, t('Must start with SO-')),
    });

    const handleSubmit = async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
            const response = await createReferral({
                referralCode: values.referralCode
            });
            onReferralChange(response.data);
            toast.success(t('Referral code created successfully'));
            onClose();
        } catch (error) {
            const errorMessage = error.response?.data?.errors?.[0]?.message || t('Error creating referral code');
            toast.error(errorMessage);
        }
        setSubmitting(false);
    };

    return (
        <Dialog open={showDialog} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle className='text-white bg-medium-aquamarine'>
                {t('Create Referral Code')}
            </DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <div className="px-4 pt-4">
                                <Field
                                    name="referralCode"
                                    className="w-full px-3 py-2 leading-tight text-gray-700 border rounded focus:outline-none focus:shadow-outline"
                                    placeholder={t('SO-xxxxx')}
                                />
                                <ErrorMessage 
                                    name="referralCode" 
                                    component="div" 
                                    className="mt-1 text-xs italic text-red-500" 
                                />
                            </div>
                            <DialogActions>
                                <Button onClick={onClose} color="secondary">
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="!bg-medium-aquamarine text-white"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? t('Creating...') : t('Create')}
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
};

export default ReferralDialog;