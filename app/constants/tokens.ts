/**
 * EPANO Design System – Liquid Glass Tokens
 * Single source of truth for all visual constants.
 * Import from here, never hardcode colors or spacing.
 */

export const colors = {
  // Primary palette
  primary: '#1A9E8F',
  primaryLight: '#2CC4B3',
  primaryGlass: 'rgba(26, 158, 143, 0.12)',

  // Accent / CTA
  accent: '#E8734A',
  accentLight: '#FF9470',

  // Status
  decided: '#1A9E8F',
  voting: '#E8A94A',
  open: '#E8A94A',
  empty: '#C4C0BA',

  // Backgrounds
  bg: '#F0EDE8',
  bgWarm: '#E8E4DE',

  // Glass surfaces
  glass: 'rgba(255, 255, 255, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.7)',
  glassHover: 'rgba(255, 255, 255, 0.7)',
  glassElevated: 'rgba(255, 255, 255, 0.75)',
  glassNav: 'rgba(255, 255, 255, 0.7)',

  // Text
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  error: '#E85C4A',
  success: '#1A9E8F',
  shadow: 'rgba(0, 0, 0, 0.06)',
  shadowMd: 'rgba(0, 0, 0, 0.1)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 16,   // horizontal screen padding
  card: 16,     // card internal padding
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 20,
  full: 9999,
} as const;

export const typography = {
  heading: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  body: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const glass = {
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  elevated: {
    backgroundColor: colors.glassElevated,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  nav: {
    backgroundColor: colors.glassNav,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    borderTopWidth: 1,
  },
  accent: {
    backgroundColor: colors.primaryGlass,
    borderColor: 'rgba(26, 158, 143, 0.2)',
    borderWidth: 1,
    borderRadius: radius.xl,
  },
} as const;

export const animation = {
  fast: 200,
  normal: 300,
  slow: 400,
  easing: [0.4, 0, 0.2, 1] as const,
} as const;
