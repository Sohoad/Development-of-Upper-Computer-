import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { theme as antdTheme } from 'antd';

interface ThemeContextValue {
  themeMode: 'dark' | 'light';
  toggleTheme: () => void;
  antdAlgorithm: typeof antdTheme.darkAlgorithm;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('themeMode');
    return saved === 'light' ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  const antdAlgorithm = useMemo(
    () => (themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm),
    [themeMode],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ themeMode, toggleTheme, antdAlgorithm }),
    [themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}