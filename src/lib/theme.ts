import { useColorScheme } from 'react-native';

export const light = {
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  ink: '#0B1B33',
  muted: '#62708A',
  line: '#E1E6EF',
  brand: '#1F6BFF',
  brandSoft: '#E6EEFF',
  accent: '#FF8A1F',
  accentSoft: '#FFF0E0',
  good: '#12A15B',
  goodSoft: '#E0F6EB',
  danger: '#E5484D',
  navy: '#0B1B33',
};

export const dark: typeof light = {
  bg: '#08111F',
  surface: '#101C30',
  ink: '#EAF0FA',
  muted: '#93A1BA',
  line: '#1D2B44',
  brand: '#5B97FF',
  brandSoft: '#14264A',
  accent: '#FFA13F',
  accentSoft: '#33220F',
  good: '#3DD08A',
  goodSoft: '#0F2E20',
  danger: '#FF7075',
  navy: '#0B1B33',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { s: 10, m: 16, l: 24, pill: 999 };
