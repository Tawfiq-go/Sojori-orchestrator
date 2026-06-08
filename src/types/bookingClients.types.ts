export type BookingClientAuthProvider = 'email' | 'google' | 'apple' | 'facebook' | 'other';

export type BookingClientEnvironmentFilter = 'production' | 'development' | 'all';

export interface BookingClientRecord {
  _id: string;
  clerkId: string;
  clerkEnvironment?: 'production' | 'development';
  first_name?: string;
  last_name?: string;
  username?: string | null;
  email_addresses?: Array<{ email_address?: string }>;
  phone_numbers?: Array<{ phone_number?: string }>;
  primaryPhone?: string;
  phoneCountryCode?: string;
  authProvider?: BookingClientAuthProvider | string;
  banned?: boolean;
  deleted?: boolean;
  public_metadata?: Record<string, unknown>;
  ownerIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingClientsListResponse {
  success: boolean;
  total: number;
  data: BookingClientRecord[];
}

export type BookingClientStatusFilter = 'active' | 'banned' | 'deleted' | 'all';
