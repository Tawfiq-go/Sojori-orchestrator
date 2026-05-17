import type { ChannelType } from '../../types/unifiedInbox.types';
import { T } from './_tokens';

export interface OtaPlatformTheme {
  label: string;
  primary: string;
  bgTint: string;
  borderTint: string;
  textAccent: string;
  avatarGradient: string;
  sendGradient: string;
  sendShadow: string;
  focusBorder: string;
  focusRing: string;
  headerIcon: string;
}

const AIRBNB_THEME: OtaPlatformTheme = {
  label: 'Airbnb',
  primary: T.airbnb,
  bgTint: T.airbnbBg,
  borderTint: 'rgba(255,90,95,0.30)',
  textAccent: '#c0353a',
  avatarGradient: 'linear-gradient(135deg,#ff8a8e,#FF5A5F)',
  sendGradient: 'linear-gradient(135deg,#ff8a8e,#FF5A5F)',
  sendShadow: '0 2px 10px rgba(255,90,95,0.40)',
  focusBorder: T.airbnb,
  focusRing: 'rgba(255,90,95,0.15)',
  headerIcon: '🏠',
};

const BOOKING_THEME: OtaPlatformTheme = {
  label: 'Booking.com',
  primary: T.booking,
  bgTint: T.bookingBg,
  borderTint: 'rgba(0,53,128,0.30)',
  textAccent: '#002a5c',
  avatarGradient: 'linear-gradient(135deg,#4a7eb8,#003580)',
  sendGradient: 'linear-gradient(135deg,#4a7eb8,#003580)',
  sendShadow: '0 2px 10px rgba(0,53,128,0.40)',
  focusBorder: T.booking,
  focusRing: 'rgba(0,53,128,0.15)',
  headerIcon: '🏨',
};

export function isOtaChannelType(channel?: string): boolean {
  return channel === 'ab' || channel === 'bk' || channel === 'vrbo';
}

export function isBookingPlatform(channel?: string, platformName?: string): boolean {
  const ch = (channel || '').toLowerCase();
  const label = (platformName || '').toLowerCase();
  return ch === 'bk' || label.includes('booking') || label === 'bk';
}

export function getOtaTheme(channel?: ChannelType | string, platformName?: string): OtaPlatformTheme {
  if (isBookingPlatform(channel, platformName)) return BOOKING_THEME;
  return AIRBNB_THEME;
}
