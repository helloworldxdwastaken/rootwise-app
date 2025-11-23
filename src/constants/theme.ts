// Rootwise brand colors from web app
export const colors = {
  // Primary brand colors
  primary: '#174D3A',      // Deep green (Rootwise main)
  primaryLight: '#A6C7A3', // Light green
  accent: '#F4C977',       // Warm amber
  
  // Background
  background: '#fdf8f3',   // Warm cream
  surface: '#ffffff',
  
  // Text
  text: '#222222',
  textSecondary: '#666666',
  textLight: '#999999',
  
  // Status colors
  success: '#34d399',      // Emerald
  error: '#f87171',        // Red
  warning: '#fbbf24',      // Amber
  info: '#38bdf8',         // Sky blue
  
  // Gradients (for AI chat)
  gradientStart: '#10b981', // Emerald-400
  gradientEnd: '#059669',   // Emerald-600
  
  // Glassmorphism
  glass: 'rgba(255, 255, 255, 0.8)',
  glassLight: 'rgba(255, 255, 255, 0.4)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  
  // Shadows
  shadow: 'rgba(15, 40, 34, 0.08)',
  shadowDark: 'rgba(15, 40, 34, 0.15)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
};

export type Theme = typeof theme;

