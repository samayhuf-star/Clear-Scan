import { useColorScheme } from 'react-native';

export const light = {
  bg: '#EDF7F5',
  surface: '#FFFFFF',
  ink: '#062A2A',
  muted: '#547773',
  line: '#D2E8E4',
  brand: '#0E8F7E',
  brandSoft: '#DDF4F0',
  accent: '#FFA13F',
  accentSoft: '#FFF0DC',
  good: '#1FAF73',
  goodSoft: '#DDF6EA',
  danger: '#E5484D',
  navy: '#062A2A',
};

export const dark: typeof light = {
  bg: '#061817',
  surface: '#0E2624',
  ink: '#FFFFFF',
  muted: '#96B2AC',
  line: '#1B3A37',
  brand: '#2FC4AE',
  brandSoft: '#0F2E2A',
  accent: '#FFA13F',
  accentSoft: '#33220F',
  good: '#3DD08A',
  goodSoft: '#0F2E20',
  danger: '#FF7075',
  navy: '#062A2A',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { s: 10, m: 16, l: 24, pill: 999 };
