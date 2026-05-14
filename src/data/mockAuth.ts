export type MockUserRole = 'admin' | 'owner' | 'staff';

export interface MockUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: MockUserRole;
  phone: string;
  company: string;
  avatar: string;
  termsAccepted: boolean;
  newsletter: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  termsAccepted: boolean;
  newsletter: boolean;
}

export interface MockSession {
  token: string;
  refreshToken: string;
  user: MockUser;
}

export const MOCK_USERS_STORAGE_KEY = 'sojori_mock_users';
export const MOCK_USER_STORAGE_KEY = 'sojori_mock_user';
export const MOCK_RESET_EMAIL_STORAGE_KEY = 'sojori_mock_reset_email';

export const mockUsers: MockUser[] = [
  {
    id: 'mock-user-1',
    email: 'admin@sojori.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'Sojori',
    role: 'admin',
    phone: '+33 6 12 34 56 78',
    company: 'Sojori Demo',
    avatar: 'https://i.pravatar.cc/150?img=1',
    termsAccepted: true,
    newsletter: true,
  },
  {
    id: 'mock-user-2',
    email: 'owner@riviera-collection.com',
    password: 'owner123',
    firstName: 'Claire',
    lastName: 'Martin',
    role: 'owner',
    phone: '+33 6 21 45 89 10',
    company: 'Riviera Collection',
    avatar: 'https://i.pravatar.cc/150?img=5',
    termsAccepted: true,
    newsletter: false,
  },
  {
    id: 'mock-user-3',
    email: 'ops@atlas-retreats.com',
    password: 'ops123',
    firstName: 'Yasmine',
    lastName: 'El Idrissi',
    role: 'staff',
    phone: '+212 6 61 22 11 09',
    company: 'Atlas Retreats',
    avatar: 'https://i.pravatar.cc/150?img=9',
    termsAccepted: true,
    newsletter: true,
  },
  {
    id: 'mock-user-4',
    email: 'finance@belvedere-group.com',
    password: 'finance123',
    firstName: 'Nicolas',
    lastName: 'Durand',
    role: 'owner',
    phone: '+33 6 41 72 63 18',
    company: 'Belvedere Group',
    avatar: 'https://i.pravatar.cc/150?img=12',
    termsAccepted: true,
    newsletter: true,
  },
  {
    id: 'mock-user-5',
    email: 'guestops@darsojori.com',
    password: 'guestops123',
    firstName: 'Fatima',
    lastName: 'Benali',
    role: 'staff',
    phone: '+212 6 77 20 39 01',
    company: 'Dar Sojori',
    avatar: 'https://i.pravatar.cc/150?img=20',
    termsAccepted: true,
    newsletter: false,
  },
  {
    id: 'mock-user-6',
    email: 'reports@mediterranee-stays.com',
    password: 'reports123',
    firstName: 'Lucas',
    lastName: 'Perez',
    role: 'admin',
    phone: '+34 6 10 32 98 44',
    company: 'Mediterranee Stays',
    avatar: 'https://i.pravatar.cc/150?img=28',
    termsAccepted: true,
    newsletter: true,
  },
];

const isBrowser = () => typeof window !== 'undefined';

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getStoredUsers = (): MockUser[] => {
  if (!isBrowser()) {
    return mockUsers;
  }

  const stored = safeParse<MockUser[]>(
    window.localStorage.getItem(MOCK_USERS_STORAGE_KEY),
    []
  );

  if (stored.length > 0) {
    return stored;
  }

  window.localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(mockUsers));
  return mockUsers;
};

export const saveStoredUsers = (users: MockUser[]): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
};

export const getPersistedUser = (): MockUser | null => {
  if (!isBrowser()) {
    return null;
  }

  return safeParse<MockUser | null>(
    window.localStorage.getItem(MOCK_USER_STORAGE_KEY),
    null
  );
};

export const persistUser = (user: MockUser): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearPersistedUser = (): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(MOCK_USER_STORAGE_KEY);
};

export const getResetEmail = (): string => {
  if (!isBrowser()) {
    return '';
  }

  return window.localStorage.getItem(MOCK_RESET_EMAIL_STORAGE_KEY) || '';
};

export const persistResetEmail = (email: string): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(MOCK_RESET_EMAIL_STORAGE_KEY, email);
};

export const clearResetEmail = (): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(MOCK_RESET_EMAIL_STORAGE_KEY);
};

export const findUserByEmail = (email: string): MockUser | undefined =>
  getStoredUsers().find((user) => user.email.toLowerCase() === email.trim().toLowerCase());

export const buildMockUserFromEmail = (
  email: string,
  password: string
): MockUser => {
  const localPart = email.split('@')[0] || 'demo';
  const [firstToken = 'Demo', secondToken = 'User'] = localPart
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1));

  return {
    id: `mock-user-${Date.now()}`,
    email: email.trim().toLowerCase(),
    password,
    firstName: firstToken,
    lastName: secondToken,
    role: 'owner',
    phone: '+33 6 00 00 00 00',
    company: 'Sojori Sandbox',
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
    termsAccepted: true,
    newsletter: false,
  };
};

export const createMockTokens = (user: MockUser) => ({
  token: `mock-token-${user.id}`,
  refreshToken: `mock-refresh-${user.id}`,
});
