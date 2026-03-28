import {Dimensions} from 'react-native';

const {width, height} = Dimensions.get('window');

// Warm, human, soft-medical palette — NOT clinical blue/white
// Inspired by cozy home environments to reduce institutional anxiety
export const Colors = {
  // Primary: deep warm indigo — calm, trustworthy, NOT sterile
  primary: '#3B4DB8',
  primaryLight: '#6B7FE0',
  primaryDark: '#252F7A',
  primaryGlow: 'rgba(59, 77, 184, 0.25)',

  // Accent: warm amber — warmth, presence, life
  accent: '#E8A84C',
  accentLight: '#F5C97A',
  accentDark: '#B87C20',

  // Safety red — clear but not panic-inducing
  danger: '#C94040',
  dangerLight: '#F07070',
  dangerGlow: 'rgba(201, 64, 64, 0.3)',

  // Safety orange for caregiver
  caregiver: '#D4722A',
  caregiverLight: '#F09050',
  caregiverGlow: 'rgba(212, 114, 42, 0.3)',

  // Success green
  success: '#3A9E6F',
  successLight: '#60C090',

  // Neutrals — warm-tinted grays (not cool/clinical)
  bg: '#0E0F1A',           // near-black with warm blue tint
  surface: '#181A2E',      // card surface
  surfaceLight: '#222440', // elevated surface
  border: '#2E3154',
  borderLight: '#404470',

  // Text
  textPrimary: '#F0F1FF',
  textSecondary: '#9DA0C8',
  textMuted: '#5A5D80',

  // Agent bubble
  agentBubble: 'rgba(20, 22, 48, 0.92)',
  agentBorder: 'rgba(107, 127, 224, 0.4)',

  // Recording
  recording: '#C94040',
  recordingGlow: 'rgba(201, 64, 64, 0.5)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Fonts = {
  // Display: heavy, legible at large sizes — important for low vision
  display: 'Georgia', // Warm, humanist serif — familiar, trustworthy
  displayBold: 'Georgia-Bold',

  // Body: clear, rounded — high legibility
  body: 'System',
  bodyBold: 'System',

  // Mono: status info
  mono: 'Courier New',
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
  xxxl: 48,
  display: 64,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radii = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

export const Screen = {
  width,
  height,
};

export const Shadows = {
  primary: {
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  accent: {
    shadowColor: Colors.accent,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  danger: {
    shadowColor: Colors.danger,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  caregiver: {
    shadowColor: Colors.caregiver,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
};
