import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button, CircularProgress } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { uploadImageToAPI } from '../../redux/slices/UploadSlice';
const ImageUpload = ({
  fieldName,
  setFieldValue,
  folder
}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const handleImageUpload = async event => {
    const file = event.currentTarget.files[0];
    if (file) {
      setLoading(true);
      try {
        const resultAction = await dispatch(uploadImageToAPI({
          file,
          folder: folder
        }));
        if (uploadImageToAPI.fulfilled.match(resultAction)) {
          const imageUrl = resultAction.payload.url;
          setFieldValue(fieldName, imageUrl);
        } else {}
      } catch (error) {} finally {
        setLoading(false);
      }
    }
  };
  return <div>
            <input accept="image/* video/* pdf/*" style={{
      display: 'none'
    }} id={`file-upload-${fieldName}`} type="file" onChange={handleImageUpload} />
            <label htmlFor={`file-upload-${fieldName}`}>
                <Button color="primary" component="span" startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />} disabled={loading} className="flex gap-2 items-center !text-gray-600 p-2">
                    {loading ? 'Uploading...' : 'Upload FIle'}
                </Button>
            </label>
        </div>;
};
export default ImageUpload;
