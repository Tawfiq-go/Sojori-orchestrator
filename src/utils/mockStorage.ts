export const isBrowser = () => typeof window !== 'undefined';

export const readStorage = <T,>(key: string, fallback: T): T => {
  if (!isBrowser()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeStorage = <T,>(key: string, value: T): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const removeStorage = (key: string): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(key);
};
