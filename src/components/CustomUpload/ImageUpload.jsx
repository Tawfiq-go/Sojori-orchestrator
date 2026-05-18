/**
 * Stub ImageUpload orchestrator — upload via parent (pas de redux UploadSlice legacy).
 */
import React, { useRef, useState } from 'react';
import { Box, Button } from '@mui/material';

export default function ImageUpload({
  label,
  avatar,
  defaultImage,
  folder: _folder,
  inputProps,
  style,
  onUploadMedia,
}) {
  const fileInput = useRef(null);
  const [preview, setPreview] = useState(defaultImage || '');

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    onUploadMedia?.(file);
  };

  return (
    <Box className="fileinput text-center">
      <input
        type="file"
        accept={inputProps?.accept || 'image/*'}
        ref={fileInput}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      {preview ? (
        <Box
          component="img"
          src={preview}
          alt=""
          sx={{
            maxWidth: style?.img?.maxWidth ?? 120,
            maxHeight: style?.img?.maxHeight ?? 120,
            borderRadius: avatar ? '50%' : 1,
            mb: 1,
          }}
        />
      ) : null}
      <Button size="small" onClick={() => fileInput.current?.click()}>
        {label || (avatar ? 'Add Photo' : 'Select image')}
      </Button>
    </Box>
  );
}
