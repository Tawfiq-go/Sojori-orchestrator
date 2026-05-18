import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, DialogActions, Button, Switch, TextField } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createSlide, getcities } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import Autocomplete from '@mui/material/Autocomplete';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector, useDispatch } from 'react-redux';
const validationSchema = Yup.object({
  // imageUrl: Yup.string().required('Image is required'),
  title: Yup.string().required('Title Required'),
  description: Yup.string().required('Description Required'),
  enabled: Yup.boolean().required('Enabled is required'),
  cityId: Yup.string().required('City ID is required')
});
const initialValues = {
  imageUrl: '',
  title: '',
  description: '',
  enabled: true,
  cityId: ''
};
const AddOneSlideDialog = ({
  open,
  onClose,
  slidesItems,
  setSlidesItems,
  addSlide
}) => {
  const upload = useSelector(state => state.uploadData);
  const {
    iconUrl
  } = upload;
  const [image, setImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cities, setCities] = useState([]);
  useEffect(() => {
    if (iconUrl) {
      formik.setFieldValue('imageUrl', iconUrl?.url);
    }
  }, [iconUrl]);
  const citiesItems = async () => {
    try {
      const data = await getcities();
      setCities(data.data.cities);
    } catch (error) {}
  };
  useEffect(() => {
    citiesItems();
  }, []);
  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: (values, {
      resetForm
    }) => {
      setIsLoading(true);
      setSlidesItems(prevState => ({
        ...prevState,
        slides: [...prevState[0].slides, values]
      }));
      // const updatedSlides = [...slidesItems[0].slides, values]; 
      // const updatedObject = {
      //   ...slidesItems,
      //   slides: updatedSlides
      // };
      // setSlidesItems([updatedObject]);

      // const dataSlide = updatedObject;
      // addSlide(dataSlide)
      setIsLoading(false);
      resetForm();
      onClose();
    }
  });
  return <Dialog PaperProps={{
    style: {
      width: 500
    }
  }} open={open} onClose={onClose}>
      <DialogTitle sx={{
      padding: '30px',
      textAlign: 'center'
    }}>Add one slide</DialogTitle>
      <DialogContent>
        <form onSubmit={formik.handleSubmit}>
          <Box>
            <div className="mb-3 text-center">
              <label className="form-label">Title</label>
              <input className='form-control' type="text" name="title" value={formik.values.title} onChange={formik.handleChange} onBlur={formik.handleBlur} />
              {formik.touched.title && formik.errors.title ? <div className="text-danger">{formik.errors.title}</div> : null}
            </div>
            <div className="mb-3 text-center">
              <label htmlFor="description" className="form-label">Description</label>
              <textarea className='form-control' type="text" name="description" value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur} />
              {formik.touched.description && formik.errors.description ? <div className="text-danger">{formik.errors.description}</div> : null}
            </div>
            <div className="mb-3 text-center">
              <label htmlFor="cityId" className="form-label">City</label>
              <Autocomplete disablePortal id="cityId" options={cities} getOptionLabel={option => option.name} onChange={(event, value) => {
              if (value) {
                formik.setFieldValue('cityId', value._id);
              } else {
                formik.setFieldValue('cityId', '');
              }
            }} renderInput={params => <TextField {...params} label="City" />} />
              {formik.touched.cityId && formik.errors.cityId ? <div className="text-danger">{formik.errors.cityId}</div> : null}
            </div>
            <ImageUpload style={{
            img: {
              height: '300px',
              width: '444px'
            }
          }} label="Select image" folder='slide' avatar />
            {formik.touched.imageUrl && formik.errors.imageUrl ? <div className="text-danger">{formik.errors.imageUrl}</div> : null}
            <div className="mb-3 text-center">
              <label htmlFor="enabled" className="form-label">Main Screen</label>
              <Switch id="enabled" checked={formik.values.enabled} onChange={event => {
              formik.setFieldValue('enabled', event.target.checked);
            }} />
              {formik.touched.enabled && formik.errors.enabled ? <div className="text-danger">{formik.errors.enabled}</div> : null}
            </div>
          </Box>
          <DialogActions>
            <Button onClick={onClose} color="secondary">Cancel</Button>
            <Button type="submit" color="primary">{isLoading ? 'Adding...' : 'Add'}</Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>;
};
export default AddOneSlideDialog;
