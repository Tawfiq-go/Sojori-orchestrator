import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { updateBlogsMapping, getblogs } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
const AddCityMappingDialog = ({
  open,
  onClose,
  setBlogs,
  blogs,
  func
}) => {
  const {
    t
  } = useTranslation('common');
  const [blogsMapping, setBlogsMapping] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const validationSchema = Yup.object().shape({
    blogId: Yup.string().required(t('blogId is required'))
  });
  const fetchBlogsata = async () => {
    try {
      const data = await getblogs();
      setBlogsMapping(data.data);
    } catch (error) {}
  };
  useEffect(() => {
    fetchBlogsata();
  }, []);
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    const newMapping = blogs.map(blog => blog.blog._id);
    const formData = {
      blogsMapping: [...newMapping, values?.blogId]
    };
    updateBlogsMapping(formData).then(data => {
      func();
      setSubmitting(false);
      onClose();
      toast.success(t("Blog added successfully"));
    }).catch(error => {
      setErrorMessage(error.message);
    });
  };

  // Helper function to get the first available title
  const getFirstTitle = titleObj => {
    if (!titleObj || typeof titleObj !== 'object') return 'Untitled';
    const firstKey = Object.keys(titleObj)[0];
    return titleObj[firstKey] || 'Untitled';
  };
  return <Dialog PaperProps={{
    style: {
      width: 500,
      minHeight: '270px'
    }
  }} open={open} onClose={onClose}>
      <DialogTitle sx={{
      padding: '30px',
      textAlign: 'center'
    }}>{t('Add Blog')}</DialogTitle>
      <DialogContent>
        {errorMessage && <h5 className="text-center text-danger">{errorMessage}</h5>}
        <Formik initialValues={{
        blogId: ''
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          isValid,
          dirty
        }) => <Form encType="multipart/form-data">
              <div className="mb-3 text-center">
                <label htmlFor="blogId" className="form-label">{t('Blog')}</label>
                {blogsMapping && blogsMapping?.length > 0 && <Autocomplete disablePortal id="blogId" options={blogsMapping} getOptionLabel={option => `${option.cityName} - ${getFirstTitle(option.title)}`} filterOptions={(options, {
              inputValue
            }) => {
              const idsToFilter = blogs.map(item => item?.blog?._id);
              return options.filter(blog => !idsToFilter.includes(blog?._id));
            }} onChange={(event, value) => {
              setFieldValue('blogId', value ? value._id : '');
            }} renderInput={params => <TextField {...params} label={t('Blog')} />} />}
                <ErrorMessage name="blogId" component="div" className="text-danger" />
              </div>
              <DialogActions>
                <Button onClick={onClose} color="secondary">
                  {t('Cancel')}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting || !isValid || !dirty}>
                  {t('Add')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default AddCityMappingDialog;
