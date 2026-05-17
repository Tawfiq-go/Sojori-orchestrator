import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type LegacyAuthUser = Record<string, unknown> & {
  _id?: string;
  id?: string;
  role?: string;
  ownerId?: string;
  email?: string;
};

type AuthState = {
  user: LegacyAuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null as LegacyAuthUser | null,
    token: null as string | null,
    refreshToken: null as string | null,
    isAuthenticated: false,
    loading: false,
    error: null as string | null,
  } satisfies AuthState,
  reducers: {
    setLegacyAuthUser(state, action: PayloadAction<LegacyAuthUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
});

export const { setLegacyAuthUser } = authSlice.actions;

const store = configureStore({
  reducer: { auth: authSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export default store;
