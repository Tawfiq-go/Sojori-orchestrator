/** Dashboard password rules — aligned with srv-user validatePasswordStrength. */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_WEAK = new Set([
  'password',
  'password1',
  'password123',
  'sojori123',
  '12345678',
  '123456789',
  'qwerty123',
]);

export type PasswordStrengthResult = {
  ok: boolean;
  message?: string;
};

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const pwd = String(password || '');

  if (pwd.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
    };
  }
  if (pwd.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.` };
  }
  if (!/[a-z]/.test(pwd)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins une minuscule.' };
  }
  if (!/[A-Z]/.test(pwd)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins une majuscule.' };
  }
  if (!/\d/.test(pwd)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins un chiffre.' };
  }
  if (!/[^A-Za-z0-9]/.test(pwd)) {
    return {
      ok: false,
      message: 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%…).',
    };
  }
  if (COMMON_WEAK.has(pwd.toLowerCase())) {
    return { ok: false, message: 'Ce mot de passe est trop courant. Choisissez-en un plus unique.' };
  }

  return { ok: true };
}

export function isPasswordStrongEnough(password: string): boolean {
  return validatePasswordStrength(password).ok;
}

export function passwordStrengthError(password: string): string | null {
  const result = validatePasswordStrength(password);
  return result.ok ? null : result.message || 'Mot de passe trop faible.';
}

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
    test: (pwd) => pwd.length >= PASSWORD_MIN_LENGTH && pwd.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'lower', label: 'Une minuscule', test: (pwd) => /[a-z]/.test(pwd) },
  { id: 'upper', label: 'Une majuscule', test: (pwd) => /[A-Z]/.test(pwd) },
  { id: 'digit', label: 'Un chiffre', test: (pwd) => /\d/.test(pwd) },
  { id: 'special', label: 'Un caractère spécial', test: (pwd) => /[^A-Za-z0-9]/.test(pwd) },
  {
    id: 'common',
    label: 'Pas un mot de passe courant',
    test: (pwd) => !COMMON_WEAK.has(pwd.toLowerCase()),
  },
];
