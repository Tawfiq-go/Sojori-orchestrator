/**
 * 🎨 Communications Hub - Design System Theme
 * Ported from legacy sojori-dashboard
 */

export const COLORS = {
  // Sojori Brand
  brand: {
    primary: '#FF6B35',
    primaryHover: '#E55A2B',
    primaryLight: '#FFE8DC',
  },

  // Platform Colors
  platforms: {
    airbnb: { primary: '#FF385C', light: '#FFE8EC' },
    booking: { primary: '#003580', light: '#E3F2FD' },
    whatsapp: { primary: '#25D366', light: '#E8F5E9' },
    sojori: { primary: '#FF6B35', light: '#FFE8DC' },
  },

  // Semantic Colors
  semantic: {
    success: '#4CAF50',
    successLight: '#E8F5E9',
    warning: '#FF9800',
    error: '#F44336',
  },

  // Thread Status
  threadStatus: {
    unreplied: { color: '#F44336', bg: '#FFEBEE' },
    replied: { color: '#4CAF50', bg: '#E8F5E9' },
  },

  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F7F7F7',
    tertiary: '#FAFAFA',
    hover: '#F5F5F5',
  },

  // Text
  text: {
    primary: '#212121',
    secondary: '#616161',
    tertiary: '#9E9E9E',
    inverse: '#FFFFFF',
  },

  // Borders
  border: {
    light: '#F0F0F0',
    medium: '#E0E0E0',
  },

  // Grays
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
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
  admin: COLORS.brand.primary, // Orange
  staff: '#3B82F6', // Blue
  manager: '#10B981', // Green
};
