import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { useDispatch, useSelector } from 'react-redux';
import { uploadImageResetAction, uploadImageToAPI } from '../../redux/slices/UploadSlice';
import * as yup from 'yup';
import { useFormik } from 'formik';

const validationSchema = yup.object({
  file: yup.mixed().required('File is required'),
});

const GuestImageUpload = ({ folder, defaultImage, onSubmit, style, label }) => {
  const dispatch = useDispatch();
  const upload = useSelector((state) => state.uploadData);
  const { iconUrl, error, loading, newUpload } = upload;

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInput = useRef(null);

  const formik = useFormik({
    initialValues: {
      file: null,
    },
    validationSchema,
    onSubmit: () => {
      if (file) {
        dispatch(uploadImageToAPI({ file, folder }));
      }
    },
  });

  useEffect(() => {
    dispatch(uploadImageResetAction());
  }, [dispatch]);

  useEffect(() => {
    if (iconUrl && newUpload) {
      onSubmit(iconUrl); 
    }
  }, [iconUrl, newUpload, onSubmit]);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleImageChange = (e) => {
    e.preventDefault();
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      formik.setFieldValue('file', selectedFile);
    }
  };

  const handleClick = () => {
    fileInput.current.click();
  };

  const handleRemove = () => {
    setFile(null);
    formik.setFieldValue('file', null);
    dispatch(uploadImageResetAction());
  };

  const handleUpload = () => {
    formik.handleSubmit();
  };

  return (
    <div className="fileinput text-center flex flex-col items-center my-4">
      <input
        type="file"
        onChange={handleImageChange}
        ref={fileInput}
        style={{ display: 'none' }}
      />
      <div className="thumbnail">
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="w-80 h-40" />
        ) : (
          <div style={style?.img ? style.img : {}}>
            {defaultImage}
          </div>
        )}
      </div>
      <div>
        {file === null ? (
          <Button onClick={handleClick}>
            {label || 'Select image'}
          </Button>
        ) : (
          <>
            <Box display="flex" justifyContent="center">
              <Button
                onClick={handleClick}
                variant="contained"
                sx={{ borderRadius: '12px', minWidth: 'auto', margin: '5px 0 0 1px', color: 'white !important' }}
              >
                <EditIcon />
              </Button>
              <Box mx={0.5}>
                <Button
                  onClick={handleRemove}
                  variant="contained"
                  sx={{ borderRadius: '12px', minWidth: 'auto', margin: '5px 0 0 1px', color: 'white !important' }}
                >
                  <CloseIcon />
                </Button>
              </Box>
              <Button
                onClick={handleUpload}
                variant="contained"
                disabled={loading}
                sx={{ borderRadius: '12px', minWidth: 'auto', color: 'white !important', margin: '5px 0 0 1px' }}
              >
                {loading ? <CircularProgress size={24} /> : <CheckIcon />}
              </Button>
            </Box>
          </>
        )}
        {error && <Typography variant="body1" style={{ color: '#ca0b00' }}>{error}</Typography>}
        {iconUrl && newUpload && <Typography variant="body1" style={{ color: '#4BB543' }}>Image has been uploaded</Typography>}
      </div>
    </div>
  );
};

GuestImageUpload.propTypes = {
  folder: PropTypes.string,
  defaultImage: PropTypes.node,
  onSubmit: PropTypes.func,
  style: PropTypes.object,
  label: PropTypes.string,
};

export default GuestImageUpload;
