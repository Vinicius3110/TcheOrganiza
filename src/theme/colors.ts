export const darkColors = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceElevated: '#1C2333',
  primary: '#6366F1',
  primaryHover: '#5558E6',
  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  border: '#30363D',
  divider: '#21262D',
} as const;

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F6F8FA',
  surfaceElevated: '#FFFFFF',
  primary: '#6366F1',
  primaryHover: '#5558E6',
  success: '#16A34A',
  successBg: 'rgba(22, 163, 74, 0.10)',
  danger: '#DC2626',
  dangerBg: 'rgba(220, 38, 38, 0.10)',
  warning: '#D97706',
  textPrimary: '#1F2328',
  textSecondary: '#656D76',
  textTertiary: '#8B949E',
  border: '#D0D7DE',
  divider: '#EAECEF',
} as const;

export type Colors = typeof darkColors;
