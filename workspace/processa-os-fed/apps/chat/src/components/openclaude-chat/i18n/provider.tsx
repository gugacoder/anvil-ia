import React, { createContext, useContext, useMemo } from "react";
import { enUS } from "./locales/en-US.js";
import { ptBR } from "./locales/pt-BR.js";
import { esES } from "./locales/es-ES.js";
import type { LocaleInfo, TranslationKeys, CustomMessages, CustomLocaleInfo } from "./types.js";

// ── Built-in registry ──

const builtInLocaleMap: Record<string, TranslationKeys> = {
  "en-US": enUS,
  "pt-BR": ptBR,
  "es-ES": esES,
};

/** The 3 locales that ship with the library. */
export const builtInLocales: LocaleInfo[] = [
  { slug: "en-US", name: "English", flag: "🇺🇸" },
  { slug: "pt-BR", name: "Português Brasileiro", flag: "🇧🇷" },
  { slug: "es-ES", name: "Español", flag: "🇪🇸" },
];

/** @deprecated Use `builtInLocales` — this alias exists for backward compat. */
export const supportedLocales = builtInLocales;

/** Default locale when none is provided. */
export const defaultLocale = "en-US";

// ── Locale resolver ──

/**
 * Normalizes locale strings like "pt_br", "pt-br", "PT-BR", "pt" to "xx-YY".
 * Accepts custom locales — if the input has a valid format (xx-YY), returns it as-is
 * even if it's not a built-in locale.
 */
export function resolveLocale(input: string | undefined): string {
  if (!input) return defaultLocale;
  // Normalize separator to hyphen
  const raw = input.replace(/_/g, "-");
  const normalized = raw.toLowerCase();
  // Try exact match against built-in locales
  for (const locale of builtInLocales) {
    if (locale.slug.toLowerCase() === normalized) return locale.slug;
  }
  // Try language-only match against built-in (e.g. "pt" → "pt-BR")
  const lang = normalized.split("-")[0];
  for (const locale of builtInLocales) {
    if (locale.slug.toLowerCase().startsWith(lang + "-")) return locale.slug;
  }
  // For custom locales: if it looks like a valid locale slug, normalize casing and pass through
  const parts = raw.split("-");
  if (parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2) {
    return parts[0].toLowerCase() + "-" + parts[1].toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].toLowerCase();
  }
  return defaultLocale;
}

// ── Context ──

interface LocaleContextValue {
  locale: string;
  t: (key: keyof TranslationKeys) => string;
  supportedLocales: LocaleInfo[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  locale?: string;
  /** Consumer-provided translations keyed by locale slug. */
  messages?: CustomMessages;
  /** Consumer-provided metadata for custom locales (shown in locale selector). */
  locales?: CustomLocaleInfo;
  children: React.ReactNode;
}

export function LocaleProvider({
  locale = defaultLocale,
  messages,
  locales: customLocaleInfo,
  children,
}: LocaleProviderProps) {
  const value = useMemo<LocaleContextValue>(() => {
    const builtIn = builtInLocaleMap[locale] as TranslationKeys | undefined;
    const custom = messages?.[locale] as Record<string, string> | undefined;

    // t() fallback: custom → builtIn → en-US → key
    const t = (key: keyof TranslationKeys): string => {
      return (
        custom?.[key as string]
        ?? builtIn?.[key]
        ?? enUS[key as keyof typeof enUS]
        ?? (key as string)
      );
    };

    // Build dynamic supportedLocales: built-in + custom locales with metadata
    const allLocales = [...builtInLocales];
    if (messages && customLocaleInfo) {
      for (const slug of Object.keys(messages)) {
        const isBuiltIn = builtInLocaleMap[slug] != null;
        const meta = customLocaleInfo[slug];
        if (!isBuiltIn && meta) {
          allLocales.push({ slug, name: meta.name, flag: meta.flag });
        }
      }
    }

    return { locale, t, supportedLocales: allLocales };
  }, [locale, messages, customLocaleInfo]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Fallback: if no provider, return en-US so components still work
    return {
      locale: defaultLocale,
      t: (key) => enUS[key as keyof typeof enUS] ?? (key as string),
      supportedLocales: builtInLocales,
    };
  }
  return ctx;
}
