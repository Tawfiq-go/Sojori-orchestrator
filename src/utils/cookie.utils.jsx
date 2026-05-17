import Cookies from 'js-cookie';

const isProduction =
  (typeof import.meta !== 'undefined' && import.meta.env?.PROD) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

const COOKIE_CONFIG = {
  secure: isProduction,
  sameSite: 'Lax',
  path: '/',
  expires: 365 * 10,
};

export const setCookie = (name, value) => {
  Cookies.set(name, value, COOKIE_CONFIG);
};

export const getCookie = (name) => {
  return Cookies.get(name);
};

export const removeCookie = (name) => {
  Cookies.remove(name, { path: '/' });
};
