'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeType, themes, DashboardTheme, defaultTheme } from '@/lib/dashboard-themes';

interface DashboardThemeContextType {
  theme: DashboardTheme;
  themeType: ThemeType;
  setTheme: (themeType: ThemeType) => void;
}

const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined);

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [themeType, setThemeType] = useState<ThemeType>(defaultTheme);
  const theme = themes[themeType];

  const setTheme = (newThemeType: ThemeType) => {
    setThemeType(newThemeType);
  };

  return (
    <DashboardThemeContext.Provider value={{ theme, themeType, setTheme }}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);
  if (context === undefined) {
    throw new Error('useDashboardTheme must be used within a DashboardThemeProvider');
  }
  return context;
}
