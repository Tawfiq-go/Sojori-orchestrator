import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import { generateRandomString, logListingMedia } from '../../utils/upload/helpers';
import { postFormDataAsMultipart } from '../../utils/upload/postFormData';

interface UploadState {
  iconUrl: string;
  multipleUrls: any[];
  error: any;
  loading: boolean;
  newUpload: boolean;
}

const initialState: UploadState = {
  iconUrl: '',
  multipleUrls: [],
  error: '',
  loading: false,
  newUpload: false,
};

interface UploadPayload {
  file: File;
  folder: string;
}

interface UploadMultiplePayload {
  files: File[];
  folder: string;
}

// Upload single image
export const uploadImageToAPI = createAsyncThunk(
  'image/upload',
  async (payload: UploadPayload, thunkAPI) => {
    const { rejectWithValue } = thunkAPI;
    let rid = `upl-${Date.now()}`;

    try {
      rid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : rid;
      const formData = new FormData();
      formData.append('media', payload.file);
      formData.append('type', payload.folder);
      formData.append('name', generateRandomString(15));
      formData.append('client_rid', rid);

      logListingMedia('upload.single.start', {
        rid,
        url: MICROSERVICE_BASE_URL.UPLOAD_IMAGE,
        folder: payload.folder,
        fileName: payload.file?.name,
        size: payload.file?.size,
        type: payload.file?.type,
      });

      const response = await postFormDataAsMultipart(MICROSERVICE_BASE_URL.UPLOAD_IMAGE, formData, {
        rid,
      });

      logListingMedia('upload.single.ok', {
        rid,
        message: response.data?.message,
        urlTail: typeof response.data?.url === 'string' ? response.data.url.slice(-96) : response.data?.url,
        urlFull: response.data?.url,
      });

      return response.data;
    } catch (error: any) {
      logListingMedia('upload.single.err', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Upload multiple images
export const uploadMultipleImagesToAPI = createAsyncThunk(
  'image/uploadMultiple',
  async (payload: UploadMultiplePayload, thunkAPI) => {
    const { rejectWithValue } = thunkAPI;
    let rid = `mup-${Date.now()}`;

    try {
      rid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : rid;
      const formData = new FormData();
      payload.files.forEach((file) => {
        formData.append('media', file);
      });
      formData.append('type', payload.folder);
      formData.append('name', generateRandomString(15));
      formData.append('client_rid', rid);

      logListingMedia('upload.multiple.start', {
        rid,
        url: MICROSERVICE_BASE_URL.UPLOAD_IMAGE_MULTIPLE,
        folder: payload.folder,
        count: payload.files?.length,
        files: (payload.files || []).map((f, i) => ({
          i,
          name: f?.name,
          size: f?.size,
          type: f?.type,
        })),
      });

      const response = await postFormDataAsMultipart(
        MICROSERVICE_BASE_URL.UPLOAD_IMAGE_MULTIPLE,
        formData,
        { rid }
      );

      logListingMedia('upload.multiple.ok', {
        rid,
        message: response.data?.message,
        returned: Array.isArray(response.data?.files)
          ? response.data.files.map((f: any, i: number) => ({
              i,
              fileName: f.fileName,
              urlTail: typeof f.url === 'string' ? f.url.slice(-80) : f.url,
            }))
          : response.data?.files,
        uploadResultFiles: Array.isArray(response.data?.files)
          ? response.data.files.map((f: any, i: number) => ({
              i,
              clientName: payload.files?.[i]?.name ?? null,
              fileName: f.fileName,
              url: f.url ?? '',
            }))
          : [],
      });

      return response.data;
    } catch (error: any) {
      logListingMedia('upload.multiple.err', {
        status: error.response?.status,
        data: error.response?.data,
        errors: error.response?.data?.errors,
        message: error.message,
      });
      return rejectWithValue(error.response?.data || { message: error.message || 'Upload failed' });
    }
  }
);

// Slice
const imageSlice = createSlice({
  name: 'image',
  initialState,
  reducers: {
    uploadImageSuccessAction: (state, action: PayloadAction<string>) => {
      state.iconUrl = action.payload;
      state.loading = false;
      state.newUpload = true;
    },
    uploadImageFailAction: (state, action: PayloadAction<any>) => {
      state.error = action.payload;
      state.loading = false;
    },
    uploadImageResetAction: (state) => {
      state.iconUrl = '';
      state.error = '';
      state.loading = false;
      state.newUpload = false;
    },
    defaultImagesAction: (state, action: PayloadAction<any>) => {
      // Handle setting default images if needed
    },
    uploadMultipleImagesReset: (state) => {
      state.multipleUrls = [];
      state.error = '';
      state.loading = false;
      state.newUpload = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadImageToAPI.pending, (state) => {
        state.loading = true;
        state.error = '';
        state.iconUrl = '';
        state.newUpload = false;
      })
      .addCase(uploadImageToAPI.fulfilled, (state, action) => {
        state.loading = false;
        state.iconUrl = action.payload;
        state.newUpload = true;
      })
      .addCase(uploadImageToAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(uploadMultipleImagesToAPI.pending, (state) => {
        state.loading = true;
        state.error = '';
        state.multipleUrls = [];
        state.newUpload = false;
        state.iconUrl = '';
      })
      .addCase(uploadMultipleImagesToAPI.fulfilled, (state, action) => {
        state.loading = false;
        state.multipleUrls = action.payload;
        state.newUpload = true;
      })
      .addCase(uploadMultipleImagesToAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        logListingMedia('upload.multiple.rejectedRedux', { payload: action.payload });
      });
  },
});

// Export actions and reducer
export const {
  uploadImageSuccessAction,
  uploadImageFailAction,
  uploadImageResetAction,
  defaultImagesAction,
  uploadMultipleImagesReset,
} = imageSlice.actions;
export default imageSlice.reducer;
