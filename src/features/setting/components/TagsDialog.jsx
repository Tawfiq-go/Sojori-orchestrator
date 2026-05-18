// import React from 'react';
// import { Formik, Form, Field, ErrorMessage } from 'formik';
// import * as Yup from 'yup';
// import { createTag, updateTag } from '../services/serverApi.adminConfig';
// import { toast } from 'react-toastify';
// import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';


// const TagDialog = ({ showDialog, onClose, tag, onTagChange }) => {
//     const initialValues = {
//         name: tag ? tag.name : '',
//     };

//     const validationSchema = Yup.object().shape({
//         name: Yup.string().required('Name is required'),
//     });

//     const handleSubmit = async (values, { setSubmitting }) => {
//         setSubmitting(true);
//         try {
//             let response;
//             if (tag) {
//                 response = await updateTag(tag._id, { name: values.name });
//                 toast.success('Tag updated successfully');
//             } else {
//                 response = await createTag({ name: values.name });
//                 toast.success('Tag created successfully');
//             }
//             onTagChange(response.tag);
//             onClose(); 
//         } catch (error) {
//             toast.error(error.message);
//         }
//         setSubmitting(false);
//     };
    

//     return (
//         <Dialog open={showDialog} onClose={onClose} maxWidth="sm" fullWidth>    
//             <DialogTitle className='bg-medium-aquamarine text-white'>
//                 {tag && tag._id ? 'Update Tag' : 'Create Tag'}
//             </DialogTitle>
//             <DialogContent>
//                 <Formik
//                     initialValues={initialValues}
//                     validationSchema={validationSchema}
//                     onSubmit={handleSubmit}
//                     enableReinitialize
//                 >
//                     {({ isSubmitting }) => (
//                         <Form>
//                             <div className="px-4 pt-4">
//                                 <Field
//                                     name="name"
//                                     className="border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
//                                     placeholder="Name"
//                                 />
//                                 <ErrorMessage name="name" component="div" className="text-red-500 text-xs italic" />
//                             </div>
//                             <DialogActions>
//                                 <Button onClick={onClose} color="secondary" disabled={isSubmitting}>
//                                     Cancel
//                                 </Button>
//                                 <Button type="submit" variant="contained" className="!bg-medium-aquamarine text-white" disabled={isSubmitting}> 
//                                     {isSubmitting ? 'Submitting...' : tag && tag._id ? 'Update' : 'Create'}
//                                 </Button>
//                             </DialogActions>
//                         </Form>
//                     )}
//                 </Formik>
//             </DialogContent>
//         </Dialog>
//     );
// };

// export default TagDialog;
