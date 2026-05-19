"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeName = "cinematic" | "sand";

const THEMES: ThemeName[] = ["cinematic", "sand"];
const STORAGE_KEY = "tradeAnalyticsTheme";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (next: ThemeName) => void;
  cycleTheme: () => void;
  themes: ThemeName[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(name: ThemeName) {
  try {
    if (name === "cinematic") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", name);
    }
  } catch {
    // SSR — no-op
  }
}

export function ThemeProvider({ children, defaultTheme = "cinematic" }: { children: ReactNode; defaultTheme?: ThemeName }) {
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "cinematic" || saved === "sand") {
        setThemeState(saved);
        applyTheme(saved);
      } else {
        applyTheme(defaultTheme);
      }
    } catch {
      // storage unavailable
    }
  }, [defaultTheme]);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const cycleTheme = useCallback(() => {
    const idx = THEMES.indexOf(theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, cycleTheme, themes: THEMES }),
    [theme, setTheme, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "cinematic",
      setTheme: () => {},
      cycleTheme: () => {},
      themes: THEMES
    };
  }
  return ctx;
}
