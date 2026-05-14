import Cookies from 'js-cookie';

const COOKIE_CONFIG = {
  secure: import.meta.env.PROD,
  sameSite: 'Lax' as const,
  path: '/',
  expires: 365 * 10
};

export const setCookie = (name: string, value: string) => {
  Cookies.set(name, value, COOKIE_CONFIG);
};

export const getCookie = (name: string): string | undefined => {
  return Cookies.get(name);
};

export const removeCookie = (name: string) => {
  Cookies.remove(name, { path: '/' });
};
