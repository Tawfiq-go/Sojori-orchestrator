/**
 * 🎨 Communications Hub - Design System Theme
 * Aligné Brand Kit Sojori v1.0 (or #E6B022 — plus d'orange legacy)
 */
import { dashboardTokens, sojoriBrand } from './sojoriBrandTokens';

export const COLORS = {
  brand: {
    primary: dashboardTokens.primary,
    primaryHover: dashboardTokens.primaryDeep,
    primaryLight: dashboardTokens.primaryTint,
  },

  platforms: {
    airbnb: { primary: '#FF385C', light: '#FFE8EC' },
    booking: { primary: '#003580', light: '#E3F2FD' },
    whatsapp: { primary: '#25D366', light: '#E8F5E9' },
    sojori: { primary: sojoriBrand.gold, light: dashboardTokens.primaryTint },
  },

  semantic: {
    success: dashboardTokens.success,
    successLight: dashboardTokens.successTint,
    warning: dashboardTokens.warning,
    error: dashboardTokens.error,
  },

  threadStatus: {
    unreplied: { color: dashboardTokens.error, bg: dashboardTokens.errorTint },
    replied: { color: dashboardTokens.success, bg: dashboardTokens.successTint },
  },

  background: {
    primary: dashboardTokens.bg1,
    secondary: dashboardTokens.bg0,
    tertiary: dashboardTokens.bg2,
    hover: dashboardTokens.bg3,
  },

  text: {
    primary: dashboardTokens.text,
    secondary: dashboardTokens.text2,
    tertiary: dashboardTokens.text3,
    inverse: '#FFFFFF',
  },

  border: {
    light: dashboardTokens.border,
    medium: dashboardTokens.borderStrong,
  },

  gray: {
    300: dashboardTokens.bg3,
    500: dashboardTokens.text3,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const COMPONENT_SIZES = {
  layout: {
    sidebarWidth: '360px',
    tasksPanelWidth: '360px',
  },
};

export const ROLE_COLORS = {
  admin: COLORS.brand.primary,
  staff: '#3B82F6',
  manager: sojoriBrand.success,
};
