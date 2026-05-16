/**
 * Premium Design System for AI Service Marketplace
 */

import { Platform } from 'react-native';

// HSL color helpers
const hsl = (h: number, s: number, l: number, a: number = 1) => 
  `hsla(${h}, ${s}%, ${l}%, ${a})`;

const PALETTE = {
  primary: { h: 185, s: 100, l: 50 },   // Neon Cyan (#00F3FF)
  accent: { h: 185, s: 100, l: 50 },    // Unified Cyan accent
  background: { h: 0, s: 0, l: 0 },     // Pure Black
  surface: { h: 0, s: 0, l: 5 },       // Very Deep Surface
  success: { h: 142, s: 71, l: 45 },
  warning: { h: 38, s: 92, l: 50 },
  error: { h: 0, s: 84, l: 60 },
  neutral: { h: 0, s: 0, l: 40 },
};

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: hsl(PALETTE.primary.h, PALETTE.primary.s, PALETTE.primary.l),
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: hsl(PALETTE.primary.h, PALETTE.primary.s, PALETTE.primary.l),
    surface: '#F4F4F5',
    border: '#E4E4E7',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    tint: '#00F3FF',
    icon: 'rgba(255, 255, 255, 0.4)',
    tabIconDefault: 'rgba(255, 255, 255, 0.4)',
    tabIconSelected: '#00F3FF',
    surface: '#0A0A0A',
    border: 'rgba(255, 255, 255, 0.05)',
    accent: '#00F3FF',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  fonts: {
    primary: 'Outfit_400Regular',
    bold: 'Outfit_700Bold',
    medium: 'Outfit_500Medium',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Outfit_400Regular',
    mono: 'Courier New',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
