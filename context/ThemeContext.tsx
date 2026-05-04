/**
 * Theme toggle context (logic from backend/src/context/ThemeContext.tsx).
 * Palettes inlined here so we do not add a `theme/` UI folder to the frontend tree.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeColors = {
  background: string;
  card: string;
  surface: string;
  primary: string;
  primaryDark: string;
  accent: string;
  text: string;
  textMuted: string;
  inputBg: string;
  success: string;
  danger: string;
  warning: string;
  border: string;
  purple: string;
};

export const DARK_COLORS: ThemeColors = {
  background: '#0D1117',
  card: '#161C2C',
  surface: '#1C2537',
  primary: '#00C9B0',
  primaryDark: '#009B89',
  accent: '#FF8A3D',
  text: '#E8EDF5',
  textMuted: '#7A8BA8',
  inputBg: '#0F1620',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  border: '#2A3548',
  purple: '#A78BFA',
};

export const LIGHT_COLORS: ThemeColors = {
  background: '#EAF7EE',
  card: '#FFFFFF',
  surface: '#F4FAFA',
  primary: '#00A7A7',
  primaryDark: '#007a7a',
  accent: '#FF8A3D',
  text: '#2E2E2E',
  textMuted: '#888888',
  inputBg: '#F4FAFA',
  success: '#2e7d32',
  danger: '#c62828',
  warning: '#b45309',
  border: '#B2DFDB',
  purple: '#7C3AED',
};

export type ThemeMode = 'light' | 'dark';

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'freshloop_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: DARK_COLORS,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          setMode(stored);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
