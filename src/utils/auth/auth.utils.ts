// Shim pour typage TypeScript
// Les vraies fonctions sont dans ../auth.utils.jsx
import { getToken as getTokenJSX, getRefreshToken as getRefreshTokenJSX } from '../auth.utils.jsx';

export const getToken = getTokenJSX;
export const getRefreshToken = getRefreshTokenJSX;
