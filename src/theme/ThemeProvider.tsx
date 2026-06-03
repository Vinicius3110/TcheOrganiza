import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, Colors } from './colors';

export type ThemeScheme = 'light' | 'dark';

interface Theme {
  colors: Colors;
  isDark: boolean;
  scheme: ThemeScheme;
}

const ThemeContext = createContext<Theme>({
  colors: darkColors,
  isDark: true,
  scheme: 'dark',
});

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Force a specific theme, overriding system preference. Used by settings toggle. */
  forceScheme?: ThemeScheme;
}

export function ThemeProvider({ children, forceScheme }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  // Dark mode is the default. User can force a scheme via settings.
  const scheme: ThemeScheme = forceScheme ?? (systemScheme === 'light' ? 'light' : 'dark');
  const isDark = scheme === 'dark';

  const theme = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      scheme,
    }),
    [isDark, scheme]
  );

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
