"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type Dictionary } from "./dictionaries/en";
import { tr } from "./dictionaries/tr";

export type LocaleCode = "en" | "tr";

const dictionaries: Record<LocaleCode, Dictionary> = {
  en,
  tr
};

const LOCALES: LocaleCode[] = ["en", "tr"];
const STORAGE_KEY = "tradeAnalyticsLocale";

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
  toggleLocale: () => void;
  locales: LocaleCode[];
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, defaultLocale = "en" }: { children: ReactNode; defaultLocale?: LocaleCode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(defaultLocale);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "tr") {
        setLocaleState(saved);
        return;
      }
      if (typeof navigator !== "undefined") {
        const browserLang = navigator.language?.slice(0, 2).toLowerCase();
        if (browserLang === "tr") setLocaleState("tr");
      }
    } catch {
      // ignore (SSR or storage unavailable)
    }
  }, []);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      // ignore
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "tr" : "en");
  }, [locale, setLocale]);

  useEffect(() => {
    try {
      document.documentElement.lang = locale;
    } catch {
      // ignore
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      locales: LOCALES,
      dict: dictionaries[locale]
    }),
    [locale, setLocale, toggleLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fail-safe: return EN dictionary when used outside provider (e.g. SSR fallback)
    return {
      locale: "en",
      setLocale: () => {},
      toggleLocale: () => {},
      locales: LOCALES,
      dict: en
    };
  }
  return ctx;
}

/** Convenience: `const t = useT(); t.connect.title` */
export function useT(): Dictionary {
  return useI18n().dict;
}
